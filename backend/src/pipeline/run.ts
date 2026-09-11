import type { Kit, Question } from "../schemas/kit.js";
import { validateKit } from "../schemas/kit.js";
import { researchCompany } from "../retrieval/research.js";
import { assertFetchableUrl } from "../retrieval/urlSafety.js";
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

export type { PipelineInput } from "./thinKit.js";
export type PipelineResult = {
  kit: Kit;
  provenance: { failures: { url: string; code: string; message: string }[] };
};
export type ProgressFn = (step: string, message: string) => Promise<void> | void;

const CATEGORIES = [
  "technical",
  "behavioural",
  "system-design",
  "company-fit",
] as const;

export async function runPipeline(
  input: PipelineInput,
  onProgress: ProgressFn = () => undefined,
): Promise<PipelineResult> {
  const days = Math.min(60, Math.max(1, input.days));
  const hasKey = Boolean(process.env.OPENROUTER_API_KEY || env.openRouterApiKey);

  await onProgress("extract", "Extracting requirements from the job description");
  const extracted = await extractRole(input.jd);

  let homeText = "";
  let hiringNotes = "";
  const pagesUsed: string[] = [];
  const pageDocs: { url: string; text: string }[] = [];
  const failures: { url: string; code: string; message: string }[] = [];

  await onProgress("retrieve", "Fetching the company site");
  try {
    await assertFetchableUrl(input.company_url);
    const research = await researchCompany(input.company_url);
    failures.push(...research.failures);
    if (research.home) {
      homeText = research.home.text;
      pagesUsed.push(research.home.finalUrl);
      pageDocs.push({ url: research.home.finalUrl, text: research.home.text });
    }
    for (const page of research.pages) {
      pagesUsed.push(page.finalUrl);
      pageDocs.push({ url: page.finalUrl, text: page.text });
      hiringNotes += `\n${page.finalUrl}\n${page.text.slice(0, 3000)}`;
    }
    if (research.discussion.snippets.length) {
      hiringNotes += `\nPublic discussion:\n${research.discussion.snippets[0]}`;
    }
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

  if (!hasKey) {
    await onProgress("llm", "OPENROUTER_API_KEY missing; returning a description-only draft");
    const draft = thinKitFromInput({ ...input, days });
    draft.role.title = extracted.title || draft.role.title;
    draft.role.seniority = extracted.seniority;
    draft.role.responsibilities = extracted.responsibilities;
    draft.role.requirements = extracted.requirements;
    draft.source.pages_used = pagesUsed;
    draft.source.role = extracted.title;
    draft.source.location = extracted.location;
    draft.coverage = {
      uncovered_requirement_ids: extracted.requirements.map((r) => r.id),
      passes: 0,
    };
    return { kit: validateKit(draft), provenance: { failures } };
  }

  await onProgress("brief", "Writing the company brief from retrieved pages");
  const company_brief = await generateCompanyBrief(pageDocs);
  if (!homeText && pageDocs.length === 0) {
    company_brief.summary =
      "The company site could not be retrieved. This brief is empty rather than fabricated.";
  }

  let questions: Question[] = [];
  let nextId = 1;
  const hiringHint = hiringNotes.slice(0, 8000);

  for (const category of CATEGORIES) {
    await onProgress("questions", `Generating ${category} questions`);
    const slice = extracted.requirements.filter((req) => {
      if (category === "behavioural") return req.kind === "behavioural";
      if (category === "technical") return req.kind === "technical" || req.kind === "domain";
      return true;
    });
    try {
      const generated = await generateQuestionsForCategory({
        category,
        requirements: slice.length ? slice : extracted.requirements,
        jd: input.jd,
        hiringNotes: hiringHint,
        existing: questions,
        nextId,
      });
      questions.push(...generated.questions);
      nextId = generated.nextId;
    } catch {
      // skip this category; coverage pass may fill gaps
    }
  }

  let passes = 1;
  let uncoveredMust = uncoveredMustHaveIds(extracted.requirements, questions);
  while (uncoveredMust.length && passes < 2) {
    await onProgress("coverage", "Filling uncovered must-have requirements");
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
    } catch {
      break;
    }
    passes += 1;
    uncoveredMust = uncoveredMustHaveIds(extracted.requirements, questions);
  }

  await onProgress("flashcards", "Creating flashcards");
  const flashcards = await generateFlashcards(extracted.requirements, questions);

  await onProgress("schedule", "Allocating the study schedule");
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
