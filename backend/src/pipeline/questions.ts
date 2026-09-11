import { z } from "zod";
import {
  questionCategorySchema,
  type Question,
  type Requirement,
} from "../schemas/kit.js";
import { completeJson, wrapUntrusted } from "../llm/groq.js";
import { questionsSystem } from "./prompts.js";

const questionsSchema = z.object({
  questions: z
    .array(
      z.object({
        requirement_ids: z.array(z.string()).default([]),
        prompt: z.string(),
        answer_outline: z.string().default(""),
        difficulty: z.number().int().min(1).max(3).default(2),
      }),
    )
    .default([]),
});

export async function generateQuestionsForCategory(args: {
  category: Question["category"];
  requirements: Requirement[];
  jd: string;
  hiringNotes: string;
  existing: Question[];
  nextId: number;
}): Promise<{ questions: Question[]; nextId: number }> {
  if (args.requirements.length === 0 && args.category !== "company-fit") {
    return { questions: [], nextId: args.nextId };
  }
  const parsed = await completeJson(
    questionsSystem(args.category),
    [
      wrapUntrusted("REQUIREMENTS", JSON.stringify(args.requirements)),
      wrapUntrusted("JOB_DESCRIPTION", args.jd.slice(0, 8000)),
      wrapUntrusted("HIRING_AND_COMPANY_NOTES", args.hiringNotes || "None found."),
      wrapUntrusted(
        "EXISTING_QUESTIONS",
        JSON.stringify(args.existing.map((q) => q.prompt)),
      ),
    ].join("\n\n"),
    (value) => questionsSchema.parse(value),
  );

  const validIds = new Set(args.requirements.map((r) => r.id));
  const questions: Question[] = [];
  let nextId = args.nextId;
  for (const q of parsed.questions.slice(0, 4)) {
    if (!q.prompt.trim()) continue;
    const requirement_ids = q.requirement_ids.filter((id) => validIds.has(id));
    questions.push({
      id: `q${nextId}`,
      requirement_ids,
      category: questionCategorySchema.parse(args.category),
      prompt: q.prompt,
      answer_outline: q.answer_outline,
      difficulty: q.difficulty,
    });
    nextId += 1;
  }
  return { questions, nextId };
}

export async function generateGapQuestions(
  gaps: Requirement[],
  jd: string,
  existing: Question[],
  nextId: number,
) {
  const byKind = new Map<Question["category"], Requirement[]>();
  for (const req of gaps) {
    const category: Question["category"] =
      req.kind === "behavioural" ? "behavioural" : "technical";
    byKind.set(category, [...(byKind.get(category) ?? []), req]);
  }
  const questions: Question[] = [];
  let id = nextId;
  for (const [category, requirements] of byKind) {
    const generated = await generateQuestionsForCategory({
      category,
      requirements,
      jd,
      hiringNotes: "",
      existing: [...existing, ...questions],
      nextId: id,
    });
    questions.push(...generated.questions);
    id = generated.nextId;
  }
  return { questions, nextId: id };
}
