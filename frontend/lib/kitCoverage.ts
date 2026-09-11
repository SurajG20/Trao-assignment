import type { KitPayload, Question, Requirement } from "@/lib/types";

export function mustHaveCoverage(kit: KitPayload) {
  const musts = kit.role.requirements.filter((r) => r.priority === "must");
  const coveredIds = new Set(kit.questions.flatMap((q) => q.requirement_ids));
  const covered = musts.filter((r) => coveredIds.has(r.id)).length;
  return { covered, total: musts.length, musts, coveredIds };
}

export function questionsForRequirement(kit: KitPayload, requirementId: string): Question[] {
  return kit.questions.filter((q) => q.requirement_ids.includes(requirementId));
}

export function requirementHasGap(kit: KitPayload, req: Requirement) {
  return questionsForRequirement(kit, req.id).length === 0;
}

export function isMustHaveGap(kit: KitPayload, req: Requirement) {
  return req.priority === "must" && requirementHasGap(kit, req);
}
