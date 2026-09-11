"use client";

import { Button } from "@/components/ui/button";
import type { KitPayload, Question } from "@/lib/types";

function questionsForDay(kit: KitPayload, ids: string[]): Question[] {
  const map = new Map(kit.questions.map((q) => [q.id, q]));
  return ids.map((id) => map.get(id)).filter((q): q is Question => Boolean(q));
}

export function ScheduleTab({
  kit,
  busy,
  onRegen,
}: {
  kit: KitPayload;
  busy: boolean;
  onRegen: () => void;
}) {
  const days = kit.schedule.days;
  const totalMinutes = days.reduce((sum, day) => sum + day.minutes, 0);
  const totalQuestions = days.reduce((sum, day) => sum + day.question_ids.length, 0);

  return (
    <section className="mt-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {days.length} day{days.length === 1 ? "" : "s"} · {totalMinutes} min
          {totalQuestions > 0 ? ` · ${totalQuestions} questions` : ""}
        </p>
        <Button type="button" variant="outline" size="sm" disabled={busy} onClick={onRegen}>
          {busy ? "Rebuilding…" : "Rebuild"}
        </Button>
      </div>

      {days.length === 0 ? (
        <p className="text-sm text-muted-foreground">No schedule yet.</p>
      ) : (
        <ol className="space-y-3">
          {days.map((day) => {
            const scheduled = questionsForDay(kit, day.question_ids);

            return (
              <li key={day.day} className="panel p-5 sm:p-6">
                <div className="flex items-baseline justify-between gap-4">
                  <div>
                    <p className="font-display text-lg font-medium">Day {day.day}</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">{day.focus}</p>
                  </div>
                  <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
                    {day.minutes} min
                  </span>
                </div>

                {scheduled.length > 0 && (
                  <ul className="mt-4 space-y-2.5 border-t border-border pt-4">
                    {scheduled.map((q) => (
                      <li key={q.id} className="text-sm leading-relaxed">
                        {q.prompt}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
