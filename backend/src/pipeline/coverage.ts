import type { Question, Requirement } from "../schemas/kit.js";

export function uncoveredRequirementIds(
  requirements: Requirement[],
  questions: Question[],
) {
  const covered = new Set(questions.flatMap((q) => q.requirement_ids));
  return requirements.filter((r) => !covered.has(r.id)).map((r) => r.id);
}

export function uncoveredMustHaveIds(
  requirements: Requirement[],
  questions: Question[],
) {
  const uncovered = new Set(uncoveredRequirementIds(requirements, questions));
  return requirements
    .filter((r) => r.priority === "must" && uncovered.has(r.id))
    .map((r) => r.id);
}
