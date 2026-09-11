import { describe, expect, it } from "vitest";
import {
  uncoveredMustHaveIds,
  uncoveredRequirementIds,
} from "../src/pipeline/coverage.js";
import type { Question, Requirement } from "../src/schemas/kit.js";

const requirements: Requirement[] = [
  { id: "r1", text: "React", kind: "technical", priority: "must" },
  { id: "r2", text: "GraphQL", kind: "technical", priority: "nice" },
];

describe("coverage", () => {
  it("finds requirements with no questions", () => {
    const questions: Question[] = [
      {
        id: "q1",
        requirement_ids: ["r1"],
        category: "technical",
        prompt: "x",
        answer_outline: "",
        difficulty: 2,
      },
    ];
    expect(uncoveredRequirementIds(requirements, questions)).toEqual(["r2"]);
    expect(uncoveredMustHaveIds(requirements, questions)).toEqual([]);
  });

  it("treats a second-pass question as closing a must-have gap", () => {
    const afterPass: Question[] = [
      {
        id: "q2",
        requirement_ids: ["r1"],
        category: "technical",
        prompt: "react hooks",
        answer_outline: "",
        difficulty: 2,
      },
    ];
    expect(uncoveredMustHaveIds(requirements, afterPass)).toEqual([]);
  });
});
