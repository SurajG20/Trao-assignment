import { z } from "zod";
import type { Kit } from "../schemas/kit.js";
import { completeJson, wrapUntrusted } from "../llm/openrouter.js";

const briefSchema = z.object({
  summary: z.string().default(""),
  what_they_do: z.string().default(""),
});

export async function generateCompanyBrief(
  pages: { url: string; text: string }[],
): Promise<Kit["company_brief"]> {
  const sources = pages.map((p) => p.url);
  if (pages.length === 0) {
    return {
      summary: "No company pages could be retrieved. This brief is intentionally empty rather than guessed.",
      what_they_do: "",
      sources,
    };
  }
  try {
    const parsed = await completeJson(
      "Write a short company brief using only the retrieved pages. If the pages do not say what the company does, say so. Do not invent products, culture, or funding.",
      wrapUntrusted(
        "PAGES",
        pages.map((p) => `${p.url}\n${p.text.slice(0, 4000)}`).join("\n\n"),
      ),
      (value) => briefSchema.parse(value),
    );
    return { ...parsed, sources };
  } catch {
    return {
      summary: pages[0]?.text.slice(0, 400) ?? "",
      what_they_do: "",
      sources,
    };
  }
}
