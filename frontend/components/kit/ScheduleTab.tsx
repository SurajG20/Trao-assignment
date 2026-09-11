"use client";

import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { KitPayload, Question } from "@/lib/types";
import { cn } from "@/lib/utils";

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
  const maxMinutes = Math.max(...days.map((d) => d.minutes), 1);

  const byCategory = useMemo(() => {
    const counts = new Map<string, number>();
    for (const day of days) {
      for (const q of questionsForDay(kit, day.question_ids)) {
        counts.set(q.category, (counts.get(q.category) ?? 0) + 1);
      }
    }
    return counts;
  }, [days, kit]);

  return (
    <section className="mt-8 space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-medium">Study plan</h2>
          <p className="mt-1 max-w-[60ch] text-sm text-muted-foreground">
            {days.length} day{days.length === 1 ? "" : "s"}, {totalMinutes} minutes total
            {totalQuestions > 0 ? `, ${totalQuestions} questions scheduled` : ""}.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" disabled={busy} onClick={onRegen}>
          {busy ? "Regenerating…" : "Rebuild schedule"}
        </Button>
      </div>

      {byCategory.size > 0 && (
        <div className="flex flex-wrap gap-2">
          {[...byCategory.entries()].map(([category, count]) => (
            <Badge key={category} variant="secondary">
              {category.replace("-", " ")}: {count}
            </Badge>
          ))}
        </div>
      )}

      {days.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No schedule yet. Rebuild once questions are generated.
        </p>
      ) : (
        <ol className="space-y-0 border-y border-border">
          {days.map((day, index) => {
            const scheduled = questionsForDay(kit, day.question_ids);
            const missing = day.question_ids.filter(
              (id) => !kit.questions.some((q) => q.id === id),
            );
            const width = Math.max(8, Math.round((day.minutes / maxMinutes) * 100));

            return (
              <li
                key={day.day}
                className={cn(
                  "grid gap-4 border-b border-border py-6 last:border-b-0 sm:grid-cols-[5.5rem_1fr]",
                )}
              >
                <div>
                  <p className="font-display text-2xl font-medium">Day {day.day}</p>
                  <p className="mt-1 text-sm tabular-nums text-muted-foreground">
                    {day.minutes} min
                  </p>
                  <div className="mt-3 h-1.5 w-full bg-secondary">
                    <div className="h-full bg-primary" style={{ width: `${width}%` }} />
                  </div>
                </div>

                <div className="min-w-0">
                  <p className="font-medium leading-relaxed">{day.focus}</p>

                  {scheduled.length > 0 ? (
                    <ul className="mt-4 space-y-3">
                      {scheduled.map((q) => (
                        <li key={q.id} className="text-sm">
                          <div className="flex flex-wrap items-baseline gap-2">
                            <span className="font-mono text-xs text-muted-foreground">{q.id}</span>
                            <Badge variant="outline" className="text-[10px]">
                              {q.category.replace("-", " ")}
                            </Badge>
                          </div>
                          <p className="mt-1 leading-relaxed">{q.prompt}</p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-3 text-sm text-muted-foreground">
                      {day.focus.toLowerCase().includes("read") ||
                      day.focus.toLowerCase().includes("review")
                        ? "Reading and review — no practice questions assigned for this day."
                        : "No questions linked to this day yet."}
                    </p>
                  )}

                  {missing.length > 0 && (
                    <p className="mt-3 text-sm text-muted-foreground">
                      {missing.length} scheduled question
                      {missing.length === 1 ? "" : "s"} no longer in the kit: {missing.join(", ")}
                    </p>
                  )}

                  {index < days.length - 1 && (
                    <p className="mt-4 text-xs text-muted-foreground">
                      Next: Day {days[index + 1].day} — {days[index + 1].focus}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
