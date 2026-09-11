import type { Kit, Question } from "../schemas/kit.js";
import type { ItemOrigin } from "../models/kit.js";
import { validateKit } from "../schemas/kit.js";
import { generateCompanyBrief } from "./brief.js";
import { generateQuestionsForCategory } from "./questions.js";
import { allocateSchedule } from "./schedule.js";
import { uncoveredRequirementIds } from "./coverage.js";
import { researchCompany } from "../retrieval/research.js";
import type { PipelineInput } from "./thinKit.js";

export type RegenSection =
  | "company_brief"
  | "schedule"
  | "technical"
  | "behavioural"
  | "system-design"
  | "company-fit";

function nextQuestionId(questions: Question[]) {
  const nums = questions.map((q) => Number(q.id.replace(/^q/, ""))).filter((n) => !Number.isNaN(n));
  return (nums.length ? Math.max(...nums) : 0) + 1;
}

function isProtected(id: string, itemState: Record<string, ItemOrigin>) {
  return itemState[id] === "edited" || itemState[id] === "pinned";
}

export async function regenerateSection(args: {
  kit: Kit;
  itemState: Record<string, ItemOrigin>;
  section: RegenSection;
  input: PipelineInput;
}): Promise<{ kit: Kit; itemState: Record<string, ItemOrigin> }> {
  const itemState = { ...args.itemState };
  let kit = args.kit;

  if (args.section === "schedule") {
    kit = validateKit({
      ...kit,
      schedule: allocateSchedule(
        kit.questions,
        kit.role.requirements,
        kit.schedule.days_available,
      ),
    });
    return { kit, itemState };
  }

  if (args.section === "company_brief") {
    const research = await researchCompany(args.input.company_url).catch(() => null);
    const pages = research
      ? [research.home, ...research.pages]
          .filter(Boolean)
          .map((p) => ({ url: p!.finalUrl, text: p!.text }))
      : [];
    kit = validateKit({
      ...kit,
      company_brief: await generateCompanyBrief(pages),
    });
    return { kit, itemState };
  }

  const kept = kit.questions.filter(
    (q) => q.category !== args.section || isProtected(q.id, itemState),
  );
  const generated = await generateQuestionsForCategory({
    category: args.section,
    requirements: kit.role.requirements,
    jd: args.input.jd,
    hiringNotes: kit.company_brief.summary,
    existing: kept,
    nextId: nextQuestionId(kit.questions),
  });
  for (const q of generated.questions) itemState[q.id] = "generated";
  const questions = [...kept, ...generated.questions];
  kit = validateKit({
    ...kit,
    questions,
    schedule: allocateSchedule(
      questions,
      kit.role.requirements,
      kit.schedule.days_available,
    ),
    coverage: {
      uncovered_requirement_ids: uncoveredRequirementIds(
        kit.role.requirements,
        questions,
      ),
      passes: kit.coverage.passes,
    },
  });
  return { kit, itemState };
}
