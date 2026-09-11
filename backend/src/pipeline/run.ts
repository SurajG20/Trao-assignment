import type { Kit } from "../schemas/kit.js";
import { validateKit } from "../schemas/kit.js";

export type PipelineInput = {
  jd: string;
  company_url: string;
  days: number;
};

export type ProgressFn = (step: string, message: string) => Promise<void> | void;

function firstLine(jd: string) {
  return jd.split("\n").map((l) => l.trim()).find(Boolean) ?? "";
}

export function thinKitFromInput(input: PipelineInput): Kit {
  const days = Math.min(60, Math.max(1, input.days));
  let host = "";
  try {
    host = new URL(input.company_url).hostname;
  } catch {
    host = "";
  }
  const title = firstLine(input.jd) || "Unknown role";
  const kit: Kit = {
    source: {
      company: host.replace(/^www\./, ""),
      company_url: input.company_url,
      role: title,
      location: "",
      jd_chars: input.jd.length,
      researched_at: new Date().toISOString(),
      pages_used: [],
    },
    company_brief: {
      summary:
        "No company research has run yet. This draft is built only from the pasted job description.",
      what_they_do: "",
      sources: [],
    },
    role: {
      title,
      seniority: "",
      responsibilities: [],
      requirements: [],
    },
    questions: [],
    flashcards: [],
    schedule: {
      days_available: days,
      days: Array.from({ length: days }, (_, i) => ({
        day: i + 1,
        focus: i === 0 ? "Read the job description" : "Review notes",
        question_ids: [],
        minutes: 30,
      })),
    },
    coverage: { uncovered_requirement_ids: [], passes: 0 },
  };
  return validateKit(kit);
}

export async function runPipeline(
  input: PipelineInput,
  onProgress: ProgressFn = () => undefined,
): Promise<Kit> {
  await onProgress("extract", "Building a draft from the job description");
  return thinKitFromInput(input);
}
