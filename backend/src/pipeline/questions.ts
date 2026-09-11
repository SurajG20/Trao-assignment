import { z } from "zod";
import {
  questionCategorySchema,
  type Question,
  type Requirement,
} from "../schemas/kit.js";
import { completeJson, wrapUntrusted } from "../llm/openrouter.js";

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
    `Generate likely interview questions for the ${args.category} category only. Each question must reference requirement ids that it actually tests. Do not invent requirements. Use hiring process notes when they affect the round type. difficulty is 1, 2, or 3.`,
    [
      wrapUntrusted("REQUIREMENTS", JSON.stringify(args.requirements)),
      wrapUntrusted("JOB_DESCRIPTION", args.jd),
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
  for (const q of parsed.questions) {
    const requirement_ids = q.requirement_ids.filter((id) => validIds.has(id));
    if (requirement_ids.length === 0 && args.requirements.length > 0) {
      requirement_ids.push(args.requirements[0].id);
    }
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
