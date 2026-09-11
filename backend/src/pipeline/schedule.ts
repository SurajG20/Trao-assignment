import type { Kit, Question, Requirement } from "../schemas/kit.js";

function coversMust(question: Question, requirements: Requirement[]) {
  const must = new Set(
    requirements.filter((r) => r.priority === "must").map((r) => r.id),
  );
  return question.requirement_ids.some((id) => must.has(id));
}

function questionPriority(question: Question, requirements: Requirement[]) {
  const mustScore = coversMust(question, requirements) ? 10 : 0;
  return mustScore + question.difficulty;
}

export function allocateSchedule(
  questions: Question[],
  requirements: Requirement[],
  daysRequested: number,
): Kit["schedule"] {
  const daysAvailable = Math.min(60, Math.max(1, Math.trunc(daysRequested) || 1));
  const ordered = [...questions].sort(
    (a, b) => questionPriority(b, requirements) - questionPriority(a, requirements),
  );

  const buckets: string[][] = Array.from({ length: daysAvailable }, () => []);
  if (ordered.length === 0) {
    return {
      days_available: daysAvailable,
      days: buckets.map((_, i) => ({
        day: i + 1,
        focus: i === 0 ? "Read the job description" : "Review notes",
        question_ids: [],
        minutes: 20,
      })),
    };
  }

  ordered.forEach((q, index) => {
    const dayIndex =
      daysAvailable === 1
        ? 0
        : Math.min(daysAvailable - 1, Math.floor((index / ordered.length) * daysAvailable));
    buckets[dayIndex].push(q.id);
  });

  const mustIds = requirements.filter((r) => r.priority === "must").map((r) => r.id);
  const scheduledQuestions = new Set(buckets.flat());
  for (const mustId of mustIds) {
    const covering = questions.find((q) => q.requirement_ids.includes(mustId));
    if (covering && !scheduledQuestions.has(covering.id)) {
      buckets[0].push(covering.id);
      scheduledQuestions.add(covering.id);
    }
  }

  for (let i = 0; i < buckets.length; i += 1) {
    if (buckets[i].length === 0) {
      const source = buckets.find((b) => b.length > 0) ?? [];
      buckets[i] = source.slice(0, Math.max(1, Math.ceil(source.length / 3)));
    }
  }

  const byId = new Map(questions.map((q) => [q.id, q]));
  return {
    days_available: daysAvailable,
    days: buckets.map((ids, i) => {
      const unique = [...new Set(ids)];
      const cats = unique.map((id) => byId.get(id)?.category).filter(Boolean);
      const focus = cats[0]
        ? `Focus on ${cats[0]} questions`
        : "Review";
      return {
        day: i + 1,
        focus,
        question_ids: unique,
        minutes: Math.min(180, Math.max(20, unique.length * 20)),
      };
    }),
  };
}
