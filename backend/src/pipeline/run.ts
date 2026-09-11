import type { Kit, Question, Requirement } from "../schemas/kit.js";
import { validateKit } from "../schemas/kit.js";
import { researchCompany } from "../retrieval/research.js";
import { assertFetchableUrl } from "../retrieval/urlSafety.js";
import { pageCorpus, type FetchedPage } from "../retrieval/fetchPage.js";
import { extractRole } from "./extract.js";
import { generateCompanyBrief } from "./brief.js";
import {
  generateGapQuestions,
  generateQuestionsForCategory,
} from "./questions.js";
import { generateFlashcards } from "./flashcards.js";
import { uncoveredMustHaveIds, uncoveredRequirementIds } from "./coverage.js";
import { allocateSchedule } from "./schedule.js";
import { thinKitFromInput, type PipelineInput } from "./thinKit.js";
import { env } from "../config/env.js";
import {
  PIPELINE_TOTAL,
  pipelineProgress,
  type ProgressFn,
  type ProgressMeta,
} from "./progress.js";

export type { PipelineInput } from "./thinKit.js";
export type { ProgressFn } from "./progress.js";
export type PipelineResult = {
  kit: Kit;
  provenance: { failures: { url: string; code: string; message: string }[] };
};

const CATEGORIES = [
  "technical",
  "behavioural",
  "system-design",
  "company-fit",
] as const;

function isHiringPage(page: FetchedPage) {
  const hay = `${page.finalUrl} ${page.text}`.toLowerCase();
  return /career|hiring|interview|handbook|job/.test(hay);
}

function isAboutPage(page: FetchedPage) {
  const hay = `${page.finalUrl} ${page.text}`.toLowerCase();
  return /about|mission|product|platform|what we do|company/.test(hay);
}

function requirementsForCategory(
  category: (typeof CATEGORIES)[number],
  requirements: Requirement[],
  seniority: string,
  hiringNotes: string,
) {
  if (category === "behavioural") {
    return requirements.filter((r) => r.kind === "behavioural");
  }
  if (category === "technical") {
    return requirements.filter((r) => r.kind === "technical" || r.kind === "domain");
  }
  if (category === "system-design") {
    const senior = /senior|staff|principal|lead/i.test(seniority);
    const design = /system design|architecture|take-home|design round/i.test(hiringNotes);
    if (!senior && !design) return [];
    return requirements.filter((r) => r.kind === "technical" || r.kind === "domain");
  }
  return requirements;
}

export async function runPipeline(
  input: PipelineInput,
  onProgress: ProgressFn = () => undefined,
): Promise<PipelineResult> {
  const days = Math.min(60, Math.max(1, input.days));
  const hasKey = Boolean(process.env.OPENROUTER_API_KEY || env.openRouterApiKey);
  let meta: ProgressMeta = {};

  const report: ProgressFn = (step, message, extra) => {
    const payload = pipelineProgress(step, message, extra?.index ?? 0, extra?.meta ?? meta);
    return onProgress(payload.step, payload.message, {
      index: payload.index,
      total: payload.total,
      percent: payload.percent,
      meta: payload.meta,
    });
  };

  await report("extract", "Extracting requirements from the job description", { index: 1, total: PIPELINE_TOTAL });
  const extracted = await extractRole(input.jd);
  meta = { ...meta, requirements_found: extracted.requirements.length };
  await report("extract", "Extracting requirements from the job description", {
    index: 1,
    total: PIPELINE_TOTAL,
    meta,
  });

  if (!hasKey) {
    await report("llm", "OPENROUTER_API_KEY missing; returning a description-only draft", {
      index: 2,
      total: PIPELINE_TOTAL,
      meta,
    });
    const draft = thinKitFromInput({ ...input, days });
    draft.role.title = extracted.title || draft.role.title;
    draft.role.seniority = extracted.seniority;
    draft.role.responsibilities = extracted.responsibilities;
    draft.role.requirements = extracted.requirements;
    draft.source.role = extracted.title;
    draft.source.location = extracted.location;
    draft.coverage = {
      uncovered_requirement_ids: extracted.requirements.map((r) => r.id),
      passes: 0,
    };
    return { kit: validateKit(draft), provenance: { failures: [] } };
  }

  let homeText = "";
  let hiringNotes = "";
  const pagesUsed: string[] = [];
  const pageDocs: { url: string; text: string; meta?: FetchedPage["meta"] }[] = [];
  const failures: { url: string; code: string; message: string }[] = [];

  await report("retrieve", "Fetching the company site", { index: 2, total: PIPELINE_TOTAL, meta });
  try {
    await assertFetchableUrl(input.company_url);
    const research = await researchCompany(input.company_url);
    failures.push(...research.failures);
    const allPages = [research.home, ...research.pages].filter(Boolean) as FetchedPage[];
    for (const page of allPages) {
      pagesUsed.push(page.finalUrl);
      const entry = {
        url: page.finalUrl,
        text: pageCorpus(page, 4000),
        meta: page.meta,
      };
      if (page === research.home || isAboutPage(page)) {
        pageDocs.push(entry);
        if (page === research.home) homeText = page.text;
      }
      if (isHiringPage(page)) {
        hiringNotes += `\n${page.finalUrl}\n${pageCorpus(page, 3000)}`;
      }
    }
    if (pageDocs.length === 0 && research.home) {
      pageDocs.push({
        url: research.home.finalUrl,
        text: pageCorpus(research.home, 4000),
        meta: research.home.meta,
      });
      homeText = research.home.text;
    }
    if (research.discussion.snippets.length) {
      hiringNotes += `\nPublic discussion:\n${research.discussion.snippets[0]}`;
    }
    meta = { ...meta, pages_fetched: pagesUsed.length };
    await report("retrieve", "Fetching the company site", { index: 2, total: PIPELINE_TOTAL, meta });
  } catch (err) {
    failures.push({
      url: input.company_url,
      code:
        typeof err === "object" && err && "code" in err
          ? String((err as { code: string }).code)
          : "COMPANY_UNREACHABLE",
      message: err instanceof Error ? err.message : "Company site unreachable",
    });
  }

  await report("brief", "Writing the company brief from retrieved pages", {
    index: 3,
    total: PIPELINE_TOTAL,
    meta,
  });
  const company_brief = await generateCompanyBrief(pageDocs);
  if (!homeText && pageDocs.length === 0) {
    company_brief.summary =
      "The company site could not be retrieved. This brief is empty rather than fabricated.";
  }

  let questions: Question[] = [];
  let nextId = 1;
  const hiringHint = hiringNotes.slice(0, 8000);

  const questionIndex: Record<(typeof CATEGORIES)[number], number> = {
    technical: 4,
    behavioural: 5,
    "system-design": 6,
    "company-fit": 7,
  };

  for (const category of CATEGORIES) {
    meta = { ...meta, question_category: category };
    await report("questions", `Generating ${category} questions`, {
      index: questionIndex[category],
      total: PIPELINE_TOTAL,
      meta,
    });
    const slice = requirementsForCategory(
      category,
      extracted.requirements,
      extracted.seniority,
      hiringHint,
    );
    try {
      const generated = await generateQuestionsForCategory({
        category,
        requirements: slice,
        jd: input.jd,
        hiringNotes: category === "company-fit" || category === "system-design" ? hiringHint : "",
        existing: questions,
        nextId,
      });
      questions.push(...generated.questions);
      nextId = generated.nextId;
    } catch (err) {
      failures.push({
        url: `llm:${category}`,
        code: "LLM_CATEGORY_FAILED",
        message: err instanceof Error ? err.message : `Failed to generate ${category} questions`,
      });
    }
    await new Promise((r) => setTimeout(r, 600));
  }

  let passes = 1;
  let uncoveredMust = uncoveredMustHaveIds(extracted.requirements, questions);
  await report("coverage", "Filling uncovered must-have requirements", {
    index: 8,
    total: PIPELINE_TOTAL,
    meta,
  });
  while (uncoveredMust.length && passes < 2) {
    const gaps = extracted.requirements.filter((r) => uncoveredMust.includes(r.id));
    try {
      const generated = await generateGapQuestions(
        gaps,
        input.jd,
        questions,
        nextId,
      );
      questions.push(...generated.questions);
      nextId = generated.nextId;
    } catch (err) {
      failures.push({
        url: "llm:coverage",
        code: "LLM_CATEGORY_FAILED",
        message: err instanceof Error ? err.message : "Coverage pass failed",
      });
      break;
    }
    passes += 1;
    uncoveredMust = uncoveredMustHaveIds(extracted.requirements, questions);
  }

  await report("flashcards", "Creating flashcards", { index: 9, total: PIPELINE_TOTAL, meta });
  const flashcards = await generateFlashcards(extracted.requirements, questions);

  await report("schedule", "Allocating the study schedule", {
    index: 10,
    total: PIPELINE_TOTAL,
    meta,
  });
  const schedule = allocateSchedule(questions, extracted.requirements, days);

  const kit: Kit = {
    source: {
      company: (() => {
        try {
          return new URL(input.company_url).hostname.replace(/^www\./, "");
        } catch {
          return "";
        }
      })(),
      company_url: input.company_url,
      role: extracted.title,
      location: extracted.location,
      jd_chars: input.jd.length,
      researched_at: new Date().toISOString(),
      pages_used: pagesUsed,
    },
    company_brief,
    role: {
      title: extracted.title,
      seniority: extracted.seniority,
      responsibilities: extracted.responsibilities,
      requirements: extracted.requirements,
    },
    questions,
    flashcards,
    schedule,
    coverage: {
      uncovered_requirement_ids: uncoveredRequirementIds(
        extracted.requirements,
        questions,
      ),
      passes,
    },
  };
  return { kit: validateKit(kit), provenance: { failures } };
}
