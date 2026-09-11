"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { FlipFlashcard } from "@/components/Flashcard";
import { Shell } from "@/components/Shell";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ApiError, api } from "@/lib/api";
import type { Flashcard, KitRecord } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";

const RATINGS = [
  { n: 1, label: "Guessing" },
  { n: 2, label: "Shaky" },
  { n: 3, label: "Okay" },
  { n: 4, label: "Solid" },
  { n: 5, label: "Ready" },
] as const;

export default function PracticePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [record, setRecord] = useState<KitRecord | null>(null);
  const [order, setOrder] = useState<string[]>([]);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .me()
      .then((res) => {
        setEmail(res.user.email);
        return api.kit(id);
      })
      .then((res) => {
        setRecord(res.kit);
        const cards = res.kit.kit?.flashcards ?? [];
        const latest = new Map<string, number>();
        for (const entry of res.kit.practice ?? []) {
          if (entry.flashcardId && entry.confidence != null) {
            latest.set(entry.flashcardId, entry.confidence);
          }
        }
        const sorted = [...cards].sort((a, b) => {
          const ac = latest.has(a.id);
          const bc = latest.has(b.id);
          if (ac !== bc) return ac ? 1 : -1;
          return (latest.get(a.id) ?? 0) - (latest.get(b.id) ?? 0);
        });
        setOrder(sorted.map((c) => c.id));
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) router.replace("/login");
        else setError(err instanceof Error ? err.message : "Could not load practice");
      });
  }, [id, router]);

  const cardsById = useMemo(() => {
    const map = new Map<string, Flashcard>();
    for (const card of record?.kit?.flashcards ?? []) map.set(card.id, card);
    return map;
  }, [record]);

  const current = cardsById.get(order[index] ?? "");
  const covered = new Set(
    (record?.practice ?? []).map((p) => p.flashcardId).filter(Boolean),
  );

  async function rate(confidence: number) {
    if (!current) return;
    try {
      const res = await api.practice(id, current.id, confidence);
      setOrder(res.next);
      setIndex(0);
      setRevealed(false);
      setRecord((prev) =>
        prev
          ? {
              ...prev,
              practice: [
                ...prev.practice,
                {
                  flashcardId: current.id,
                  confidence,
                  seenAt: new Date().toISOString(),
                },
              ],
            }
          : prev,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save rating");
    }
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setRevealed((prev) => !prev);
      }
      if (revealed && e.key >= "1" && e.key <= "5") void rate(Number(e.key));
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [revealed, current]);

  const loading = record === null && !error;
  const total = record?.kit?.flashcards.length ?? 0;
  const coveredCount = covered.size;
  const percent = total ? Math.round((coveredCount / total) * 100) : 0;

  if (loading) {
    return (
      <Shell email={email}>
        <Skeleton className="h-4 w-16" />
        <div className="mt-4 flex items-end justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-9 w-32" />
            <Skeleton className="h-4 w-28" />
          </div>
          <Skeleton className="h-4 w-10" />
        </div>
        <Skeleton className="mt-3 h-1 w-full" />
        <div className="mx-auto mt-10 max-w-xl" aria-busy="true" aria-label="Loading practice">
          <Skeleton className="h-80 w-full rounded-lg" />
          <Skeleton className="mx-auto mt-6 h-4 w-48" />
        </div>
      </Shell>
    );
  }

  return (
    <Shell email={email}>
      <Link
        href={`/kits/${id}`}
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        ← Back
      </Link>

      <div className="mt-4 flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">Practice</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {coveredCount} of {total} reviewed
          </p>
        </div>
        <span className="text-sm tabular-nums text-muted-foreground">{percent}%</span>
      </div>
      <Progress value={percent} className="mt-3 h-1" />

      {error && (
        <p role="alert" className="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm">
          {error}
        </p>
      )}

      {total === 0 && record && (
        <p className="mt-12 text-center text-muted-foreground">No flashcards in this kit.</p>
      )}

      {current && (
        <div className="mx-auto mt-10 max-w-xl">
          <FlipFlashcard
            front={current.front}
            back={current.back}
            flipped={revealed}
            onFlip={() => setRevealed((prev) => !prev)}
            size="lg"
          />
          <div className="mt-6">
            {revealed ? (
              <div>
                <p className="mb-3 text-center text-sm text-muted-foreground">How well did you know it?</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {RATINGS.map(({ n, label }) => (
                    <Button
                      key={n}
                      type="button"
                      variant={n <= 2 ? "outline" : n === 3 ? "secondary" : "default"}
                      size="sm"
                      onClick={() => void rate(n)}
                    >
                      {n}
                    </Button>
                  ))}
                </div>
                <p className="mt-2 text-center text-xs text-muted-foreground">
                  {RATINGS.map((r) => r.label).join(" · ")}
                </p>
              </div>
            ) : (
              <p className="text-center text-sm text-muted-foreground">
                Tap the card or press Space to reveal
              </p>
            )}
          </div>
        </div>
      )}

      {!current && total > 0 && (
        <p className="mt-12 text-center text-muted-foreground">Session complete.</p>
      )}
    </Shell>
  );
}
