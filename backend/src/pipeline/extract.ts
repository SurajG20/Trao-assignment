import { z } from "zod";
import {
  requirementKindSchema,
  requirementPrioritySchema,
  type Requirement,
} from "../schemas/kit.js";
import { completeJson, wrapUntrusted } from "../llm/openrouter.js";

const extractedSchema = z.object({
  title: z.string().default(""),
  seniority: z.string().default(""),
  location: z.string().default(""),
  responsibilities: z.array(z.string()).default([]),
  requirements: z
    .array(
      z.object({
        text: z.string(),
        kind: requirementKindSchema,
        priority: requirementPrioritySchema,
      }),
    )
    .default([]),
});

export type ExtractedRole = z.infer<typeof extractedSchema> & {
  requirements: Requirement[];
};

function looksLikeBonus(line: string) {
  return /bonus|nice to have|plus|preferred|optional/i.test(line);
}

function looksLikeRequired(line: string) {
  return /required|must|minimum|you have|we need|qualifications/i.test(line);
}

export function heuristicExtract(jd: string): Omit<ExtractedRole, "requirements"> & {
  requirements: Omit<Requirement, "id">[];
} {
  const lines = jd
    .split(/\n+/)
    .map((l) => l.replace(/^[-*•\d.)\s]+/, "").trim())
    .filter(Boolean);
  const title = lines[0] ?? "";
  const requirements: Omit<Requirement, "id">[] = [];
  let mode: "must" | "nice" | null = null;
  for (const line of lines.slice(1)) {
    if (/^requirements|^qualifications|^what you/i.test(line)) {
      mode = "must";
      continue;
    }
    if (/nice to have|bonus|preferred/i.test(line) && line.length < 80) {
      mode = "nice";
      continue;
    }
    if (line.length < 12 || line.length > 240) continue;
    if (mode || looksLikeRequired(line) || looksLikeBonus(line)) {
      requirements.push({
        text: line,
        kind: /mentor|communicat|lead|collaborat|stakeholder/i.test(line)
          ? "behavioural"
          : "technical",
        priority: mode === "nice" || looksLikeBonus(line) ? "nice" : "must",
      });
    }
  }
  return {
    title,
    seniority: /senior|staff|principal|lead/i.test(jd)
      ? "senior"
      : /junior|intern|graduate/i.test(jd)
        ? "junior"
        : "",
    location: "",
    responsibilities: [],
    requirements,
  };
}

function withIds(
  extracted: Omit<ExtractedRole, "requirements"> & {
    requirements: Omit<Requirement, "id">[];
  },
): ExtractedRole {
  return {
    ...extracted,
    requirements: extracted.requirements.map((req, i) => ({
      ...req,
      id: `r${i + 1}`,
    })),
  };
}

export async function extractRole(jd: string): Promise<ExtractedRole> {
  const fallback = withIds(heuristicExtract(jd));
  try {
    const parsed = await completeJson(
      "Extract only facts present in the job description. Do not invent skills, years, or tools that are not written. Mark a requirement must if the posting says required/must, and nice if it says bonus/preferred/nice to have. kind is technical, behavioural, or domain.",
      wrapUntrusted("JOB_DESCRIPTION", jd),
      (value) => extractedSchema.parse(value),
    );
    if (parsed.requirements.length === 0) return fallback;
    return withIds(parsed);
  } catch {
    return fallback;
  }
}
