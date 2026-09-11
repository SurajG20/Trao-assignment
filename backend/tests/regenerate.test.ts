import { describe, expect, it, vi } from "vitest";

vi.mock("../src/pipeline/questions.js", () => ({
  generateQuestionsForCategory: async ({
    nextId,
    category,
  }: {
    nextId: number;
    category: "technical";
  }) => ({
    questions: [
      {
        id: `q${nextId}`,
        requirement_ids: ["r1"],
        category,
        prompt: "fresh generated question",
        answer_outline: "",
        difficulty: 2,
      },
    ],
    nextId: nextId + 1,
  }),
}));

import { regenerateSection } from "../src/pipeline/regenerate.js";
import type { Kit } from "../src/schemas/kit.js";

const kit: Kit = {
  source: {
    company: "acme",
    company_url: "https://example.com",
    role: "Engineer",
    location: "",
    jd_chars: 10,
    researched_at: "2026-01-01T00:00:00Z",
    pages_used: [],
  },
  company_brief: { summary: "s", what_they_do: "", sources: [] },
  role: {
    title: "Engineer",
    seniority: "",
    responsibilities: [],
    requirements: [{ id: "r1", text: "React", kind: "technical", priority: "must" }],
  },
  questions: [
    {
      id: "q1",
      requirement_ids: ["r1"],
      category: "technical",
      prompt: "user edited this",
      answer_outline: "mine",
      difficulty: 2,
    },
    {
      id: "q2",
      requirement_ids: ["r1"],
      category: "technical",
      prompt: "generated original",
      answer_outline: "",
      difficulty: 1,
    },
  ],
  flashcards: [],
  schedule: {
    days_available: 1,
    days: [{ day: 1, focus: "x", question_ids: ["q1", "q2"], minutes: 40 }],
  },
  coverage: { uncovered_requirement_ids: [], passes: 1 },
};

describe("section regenerate", () => {
  it("keeps edited questions and replaces only generated ones", async () => {
    const result = await regenerateSection({
      kit,
      itemState: { q1: "edited", q2: "generated" },
      section: "technical",
      input: { jd: "Engineer", company_url: "https://example.com", days: 1 },
    });
    const prompts = result.kit.questions.map((q) => q.prompt);
    expect(prompts).toContain("user edited this");
    expect(prompts).not.toContain("generated original");
    expect(prompts).toContain("fresh generated question");
    expect(result.itemState.q1).toBe("edited");
  });
});
