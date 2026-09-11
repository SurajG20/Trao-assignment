import { z } from "zod";
import type { Flashcard, Question, Requirement } from "../schemas/kit.js";
import { completeJson, wrapUntrusted } from "../llm/openrouter.js";
import { FLASHCARD_SYSTEM } from "./prompts.js";

const cardsSchema = z.object({
  flashcards: z
    .array(
      z.object({
        front: z.string(),
        back: z.string(),
        requirement_ids: z.array(z.string()).default([]),
      }),
    )
    .default([]),
});

export async function generateFlashcards(
  requirements: Requirement[],
  questions: Question[],
): Promise<Flashcard[]> {
  const musts = requirements.filter((r) => r.priority === "must");
  if (musts.length === 0 && questions.length === 0) return [];
  try {
    const parsed = await completeJson(
      FLASHCARD_SYSTEM,
      wrapUntrusted(
        "MATERIAL",
        JSON.stringify({
          requirements: musts.length ? musts : requirements,
          questions: questions.map((q) => ({
            id: q.id,
            prompt: q.prompt,
            requirement_ids: q.requirement_ids,
          })),
        }),
      ),
      (value) => cardsSchema.parse(value),
    );
    const valid = new Set(requirements.map((r) => r.id));
    return parsed.flashcards.map((card, i) => ({
      id: `f${i + 1}`,
      front: card.front,
      back: card.back,
      requirement_ids: card.requirement_ids.filter((id) => valid.has(id)),
    }));
  } catch (err) {
    console.warn("generateFlashcards LLM failed; using requirement cues", err);
    return (musts.length ? musts : requirements).map((req, i) => ({
      id: `f${i + 1}`,
      front: req.text,
      back: `Be ready to discuss: ${req.text}`,
      requirement_ids: [req.id],
    }));
  }
}
