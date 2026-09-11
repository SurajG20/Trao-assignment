"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Shell } from "@/components/Shell";
import { ApiError, api } from "@/lib/api";
import type { Flashcard, KitRecord } from "@/lib/types";

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
        setRevealed(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const total = record?.kit?.flashcards.length ?? 0;

  return (
    <Shell email={email}>
      <p className="text-sm text-zinc-500">
        <Link className="hover:underline" href={`/kits/${id}`}>
          Back to kit
        </Link>
      </p>
      <h1 className="mt-2 text-2xl font-semibold">Practice</h1>
      <p className="mt-1 text-sm text-zinc-600">
        Covered {covered.size} of {total}. Next cards are least confident first. Enter reveals; 1–5 rates.
      </p>
      {error && (
        <p role="alert" className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm">
          {error}
        </p>
      )}
      {total === 0 && <p className="mt-8 text-zinc-500">This kit has no flashcards yet.</p>}
      {current && (
        <div
          className="mt-8 rounded-xl border border-zinc-200 bg-white p-6"
          tabIndex={0}
          onKeyDown={(e) => {
            if (revealed && e.key >= "1" && e.key <= "5") void rate(Number(e.key));
          }}
        >
          <p className="text-xs uppercase tracking-wide text-zinc-500">Front</p>
          <p className="mt-2 text-lg">{current.front}</p>
          {revealed ? (
            <>
              <p className="mt-6 text-xs uppercase tracking-wide text-zinc-500">Back</p>
              <p className="mt-2">{current.back}</p>
              <div className="mt-6 flex flex-wrap gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    className="rounded-md border border-zinc-300 px-3 py-2 text-sm hover:border-zinc-900"
                    onClick={() => void rate(n)}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-zinc-500">1 = not at all confident, 5 = ready</p>
            </>
          ) : (
            <button
              type="button"
              className="mt-6 rounded-md bg-zinc-900 px-4 py-2 text-sm text-white"
              onClick={() => setRevealed(true)}
            >
              Reveal answer
            </button>
          )}
        </div>
      )}
      {!current && total > 0 && <p className="mt-8 text-zinc-500">No cards left in this session.</p>}
    </Shell>
  );
}
