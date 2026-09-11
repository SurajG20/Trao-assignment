"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Check } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import {
  currentStepIndex,
  formatElapsed,
  GENERATION_STEPS,
  parameterLine,
  progressPercent,
} from "@/lib/kitDisplay";
import type { KitRecord } from "@/lib/types";
import { cn } from "@/lib/utils";

export function GenerationProgress({
  record,
  compact = false,
}: {
  record: KitRecord;
  compact?: boolean;
}) {
  const generating = record.status === "queued" || record.status === "running";
  const failed = record.status === "failed";
  const percent = progressPercent(record.progress, record.status);
  const active = currentStepIndex(record.progress, record.status);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!generating) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [generating]);

  const started = record.createdAt ? new Date(record.createdAt).getTime() : now;
  const elapsed = formatElapsed(now - started);
  const current = parameterLine(record.progress);

  if (compact) {
    if (!generating) return null;
    return (
      <div className="flex min-w-24 items-center gap-2" aria-live="polite">
        <Progress value={percent} className="h-1.5 w-16" />
        <span className="text-xs tabular-nums text-muted-foreground">{percent}%</span>
      </div>
    );
  }

  if (failed) {
    return (
      <Alert variant="destructive" className="mt-8">
        <AlertCircle />
        <AlertTitle>Generation failed</AlertTitle>
        <AlertDescription>
          {record.error?.code ? `${record.error.code}: ` : ""}
          {record.error?.message || "Unknown error"}
        </AlertDescription>
      </Alert>
    );
  }

  if (!generating) return null;

  return (
    <div className="sheet mt-8 p-6" aria-live="polite">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-display text-xl font-medium">{current}</p>
          <p className="mt-1 text-sm tabular-nums text-muted-foreground">Elapsed {elapsed}</p>
        </div>
        <p className="text-sm tabular-nums text-muted-foreground">{percent}%</p>
      </div>
      <Progress value={percent} className="mt-4" />
      <ol className="mt-5 grid gap-1 sm:grid-cols-2">
        {GENERATION_STEPS.map((step, i) => {
          const index = i + 1;
          const done = active > index;
          const currentRow = active === index;
          return (
            <li
              key={step.id}
              className={cn(
                "flex items-center gap-2 px-1 py-1.5 text-sm",
                currentRow && "text-foreground",
                !currentRow && !done && "text-muted-foreground",
              )}
            >
              <span
                className={cn(
                  "flex size-5 items-center justify-center rounded-full text-[11px]",
                  done && "bg-pine text-white",
                  currentRow && "bg-mark text-foreground",
                  !done && !currentRow && "bg-secondary",
                )}
              >
                {done ? <Check className="size-3" /> : index}
              </span>
              {step.label}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
