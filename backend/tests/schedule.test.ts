import { describe, expect, it } from "vitest";
import { allocateSchedule } from "../src/pipeline/schedule.js";
import type { Question, Requirement } from "../src/schemas/kit.js";

const requirements: Requirement[] = [
  { id: "r1", text: "React", kind: "technical", priority: "must" },
  { id: "r2", text: "Mentoring", kind: "behavioural", priority: "must" },
  { id: "r3", text: "Go", kind: "technical", priority: "nice" },
];

const questions: Question[] = [
  {
    id: "q1",
    requirement_ids: ["r1"],
    category: "technical",
    prompt: "React",
    answer_outline: "",
    difficulty: 3,
  },
  {
    id: "q2",
    requirement_ids: ["r2"],
    category: "behavioural",
    prompt: "Mentor",
    answer_outline: "",
    difficulty: 2,
  },
  {
    id: "q3",
    requirement_ids: ["r3"],
    category: "technical",
    prompt: "Go",
    answer_outline: "",
    difficulty: 1,
  },
];

describe("schedule allocation", () => {
  it("uses exactly the requested number of days", () => {
    expect(allocateSchedule(questions, requirements, 5).days).toHaveLength(5);
    expect(allocateSchedule(questions, requirements, 1).days_available).toBe(1);
    expect(allocateSchedule(questions, requirements, 60).days).toHaveLength(60);
  });

  it("keeps minutes as integers and schedules every must-have", () => {
    const schedule = allocateSchedule(questions, requirements, 5);
    const scheduled = new Set(schedule.days.flatMap((d) => d.question_ids));
    expect(scheduled.has("q1")).toBe(true);
    expect(scheduled.has("q2")).toBe(true);
    for (const day of schedule.days) {
      expect(Number.isInteger(day.minutes)).toBe(true);
    }
  });

  it("puts higher-difficulty must-have work on earlier days", () => {
    const schedule = allocateSchedule(questions, requirements, 3);
    const first = schedule.days[0]?.question_ids ?? [];
    expect(first[0]).toBe("q1");
  });
});
