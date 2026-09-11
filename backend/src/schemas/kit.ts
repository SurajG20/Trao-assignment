import { z } from "zod";

export const requirementKindSchema = z.enum([
  "technical",
  "behavioural",
  "domain",
]);

export const requirementPrioritySchema = z.enum(["must", "nice"]);

export const questionCategorySchema = z.enum([
  "technical",
  "behavioural",
  "system-design",
  "company-fit",
]);

export const requirementSchema = z.object({
  id: z.string().min(1),
  text: z.string(),
  kind: requirementKindSchema,
  priority: requirementPrioritySchema,
});

export const questionSchema = z.object({
  id: z.string().min(1),
  requirement_ids: z.array(z.string()),
  category: questionCategorySchema,
  prompt: z.string(),
  answer_outline: z.string(),
  difficulty: z.number().int().min(1).max(3),
});

export const flashcardSchema = z.object({
  id: z.string().min(1),
  front: z.string(),
  back: z.string(),
  requirement_ids: z.array(z.string()),
});

export const scheduleDaySchema = z.object({
  day: z.number().int().min(1),
  focus: z.string(),
  question_ids: z.array(z.string()),
  minutes: z.number().int(),
});

export const kitSchema = z
  .object({
    source: z.object({
      company: z.string(),
      company_url: z.string(),
      role: z.string(),
      location: z.string(),
      jd_chars: z.number().int().nonnegative(),
      researched_at: z.string(),
      pages_used: z.array(z.string()),
    }),
    company_brief: z.object({
      summary: z.string(),
      what_they_do: z.string(),
      sources: z.array(z.string()),
    }),
    role: z.object({
      title: z.string(),
      seniority: z.string(),
      responsibilities: z.array(z.string()),
      requirements: z.array(requirementSchema),
    }),
    questions: z.array(questionSchema),
    flashcards: z.array(flashcardSchema),
    schedule: z.object({
      days_available: z.number().int().min(1),
      days: z.array(scheduleDaySchema),
    }),
    coverage: z.object({
      uncovered_requirement_ids: z.array(z.string()),
      passes: z.number().int().min(0),
    }),
  })
  .passthrough();

export type Kit = z.infer<typeof kitSchema>;
export type Requirement = z.infer<typeof requirementSchema>;
export type Question = z.infer<typeof questionSchema>;
export type Flashcard = z.infer<typeof flashcardSchema>;

export function validateKit(value: unknown): Kit {
  const kit = kitSchema.parse(value);
  const questionIds = new Set(kit.questions.map((q) => q.id));
  for (const day of kit.schedule.days) {
    for (const id of day.question_ids) {
      if (!questionIds.has(id)) {
        throw new Error(`Schedule references unknown question ${id}`);
      }
    }
  }
  if (kit.schedule.days.length !== kit.schedule.days_available) {
    throw new Error("Schedule day count must equal days_available");
  }
  return kit;
}
