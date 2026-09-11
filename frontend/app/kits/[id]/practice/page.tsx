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

  const total = record?.kit?.flashcards.length ?? 0;
  const coveredCount = covered.size;
  const percent = total ? Math.round((coveredCount / total) * 100) : 0;

  return (
    <Shell email={email}>
      <p className="text-sm text-muted-foreground">
        <Link className="underline-offset-4 hover:underline" href={`/kits/${id}`}>
          Back to kit
        </Link>
      </p>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl font-semibold tracking-tight">Practice</h1>
          <p className="mt-2 max-w-[48ch] text-sm text-muted-foreground">
            Covered {coveredCount} of {total}. Space flips; 1–5 rates after the answer.
          </p>
        </div>
        <p className="text-sm tabular-nums text-muted-foreground">{percent}%</p>
      </div>
      <Progress value={percent} className="mt-4" />

      {error && (
        <p role="alert" className="mt-4 border border-destructive/50 bg-card px-3 py-2 text-sm">
          {error}
        </p>
      )}
      {total === 0 && (
        <p className="mt-8 text-muted-foreground">This kit has no flashcards yet.</p>
      )}
      {current && (
        <div className="mx-auto mt-10 max-w-2xl">
          <FlipFlashcard
            front={current.front}
            back={current.back}
            flipped={revealed}
            onFlip={() => setRevealed((prev) => !prev)}
            size="lg"
          />
          <div className="mt-8">
            {revealed ? (
              <div>
                <p className="mb-3 text-sm text-muted-foreground">How confident are you?</p>
                <div className="flex flex-wrap gap-2">
                  {RATINGS.map(({ n, label }) => (
                    <Button
                      key={n}
                      type="button"
                      variant={n <= 2 ? "outline" : n === 3 ? "secondary" : "default"}
                      onClick={() => void rate(n)}
                    >
                      {n} {label}
                    </Button>
                  ))}
                </div>
              </div>
            ) : (
              <Button type="button" onClick={() => setRevealed(true)}>
                Reveal answer
              </Button>
            )}
          </div>
        </div>
      )}
      {!current && total > 0 && (
        <p className="mt-8 text-muted-foreground">No cards left in this session.</p>
      )}
    </Shell>
  );
}
