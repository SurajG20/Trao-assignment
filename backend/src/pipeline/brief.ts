import { z } from "zod";
import type { Kit } from "../schemas/kit.js";
import { completeJson, wrapUntrusted } from "../llm/groq.js";
import { BRIEF_SYSTEM } from "./prompts.js";

const briefSchema = z.object({
  summary: z.string().default(""),
  what_they_do: z.string().default(""),
});

export type BriefPage = {
  url: string;
  text: string;
  meta?: { title?: string; description?: string; jsonLd?: string };
};

function fillWhatTheyDo(parsed: { summary: string; what_they_do: string }) {
  const summary = parsed.summary.trim();
  const what = parsed.what_they_do.trim();
  if (what) return { summary, what_they_do: what };
  if (!summary) return { summary, what_they_do: "" };
  const sentences = summary.split(/(?<=[.!?])\s+/).filter(Boolean);
  return {
    summary,
    what_they_do: sentences[0] ?? summary,
  };
}

function honestEmpty(sources: string[]): Kit["company_brief"] {
  return {
    summary:
      "The retrieved pages do not describe what this company does. This brief is empty rather than guessed.",
    what_they_do: "",
    sources,
  };
}

export async function generateCompanyBrief(
  pages: BriefPage[],
): Promise<Kit["company_brief"]> {
  const sources = pages.map((p) => p.url);
  if (pages.length === 0) {
    return {
      summary:
        "No company pages could be retrieved. This brief is intentionally empty rather than guessed.",
      what_they_do: "",
      sources,
    };
  }
  const metaDescription = pages.map((p) => p.meta?.description).find(Boolean) ?? "";
  try {
    const parsed = await completeJson(
      BRIEF_SYSTEM,
      wrapUntrusted(
        "PAGES",
        pages
          .map((p) => {
            const head = [p.meta?.title, p.meta?.description, p.meta?.jsonLd]
              .filter(Boolean)
              .join("\n");
            return `${p.url}\n${head}\n${p.text.slice(0, 4000)}`;
          })
          .join("\n\n"),
      ),
      (value) => briefSchema.parse(value),
    );
    if (!parsed.summary.trim() && !parsed.what_they_do.trim()) {
      if (metaDescription) {
        return { summary: metaDescription, what_they_do: metaDescription, sources };
      }
      return honestEmpty(sources);
    }
    return { ...fillWhatTheyDo(parsed), sources };
  } catch (err) {
    console.warn("generateCompanyBrief LLM failed", err);
    if (metaDescription) {
      return { summary: metaDescription, what_they_do: "", sources };
    }
    return honestEmpty(sources);
  }
}
