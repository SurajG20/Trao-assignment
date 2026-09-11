"use client";

import { useState } from "react";
import Link from "next/link";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { FlipFlashcard } from "@/components/Flashcard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Flashcard, KitPayload } from "@/lib/types";

export function FlashcardsTab({
  kit,
  kitId,
  onChange,
}: {
  kit: KitPayload;
  kitId: string;
  onChange: (kit: KitPayload) => void;
}) {
  const [flipped, setFlipped] = useState<Record<string, boolean>>({});
  const [editing, setEditing] = useState<string | null>(null);

  function patchCard(id: string, patch: Partial<Flashcard>) {
    onChange({
      ...kit,
      flashcards: kit.flashcards.map((card) =>
        card.id === id ? { ...card, ...patch } : card,
      ),
    });
  }

  return (
    <section className="mt-8 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {kit.flashcards.length} card{kit.flashcards.length === 1 ? "" : "s"}. Click a card to
          flip it.
        </p>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/kits/${kitId}/practice`}>Practice</Link>
        </Button>
      </div>

      {kit.flashcards.length === 0 && (
        <p className="py-10 text-muted-foreground">
          No flashcards yet. Add one, or regenerate the kit.
        </p>
      )}

      <div className="grid gap-6 sm:grid-cols-2">
        {kit.flashcards.map((card) => {
          const isEditing = editing === card.id;
          return (
            <article key={card.id} className="space-y-2">
              <div className="relative">
                {isEditing ? (
                  <div className="flex h-56 flex-col gap-2 rounded-lg bg-card p-4 ring-1 ring-border">
                    <div className="grid min-h-0 flex-1 gap-1">
                      <Label htmlFor={`${card.id}-front`} className="text-xs">
                        They ask
                      </Label>
                      <Textarea
                        id={`${card.id}-front`}
                        className="min-h-0 flex-1 font-display"
                        value={card.front}
                        onChange={(e) => patchCard(card.id, { front: e.target.value })}
                      />
                    </div>
                    <div className="grid min-h-0 flex-1 gap-1">
                      <Label htmlFor={`${card.id}-back`} className="text-xs">
                        You answer
                      </Label>
                      <Textarea
                        id={`${card.id}-back`}
                        className="min-h-0 flex-1"
                        value={card.back}
                        onChange={(e) => patchCard(card.id, { back: e.target.value })}
                      />
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => setEditing(null)}
                    >
                      Done
                    </Button>
                  </div>
                ) : (
                  <FlipFlashcard
                    front={card.front}
                    back={card.back}
                    flipped={Boolean(flipped[card.id])}
                    padForActions
                    onFlip={() =>
                      setFlipped((prev) => ({ ...prev, [card.id]: !prev[card.id] }))
                    }
                  />
                )}
                <div className="absolute top-2 right-2 z-10 flex gap-1">
                  <Button
                    type="button"
                    size="icon"
                    variant="secondary"
                    className="size-8"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditing(isEditing ? null : card.id);
                    }}
                  >
                    <Pencil />
                    <span className="sr-only">Edit card</span>
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="secondary"
                    className="size-8"
                    onClick={(e) => {
                      e.stopPropagation();
                      onChange({
                        ...kit,
                        flashcards: kit.flashcards.filter((c) => c.id !== card.id),
                      });
                    }}
                  >
                    <Trash2 />
                    <span className="sr-only">Delete card</span>
                  </Button>
                </div>
              </div>
              {card.requirement_ids.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {card.requirement_ids.map((reqId) => (
                    <Badge key={reqId} variant="outline" className="text-[10px]">
                      {reqId}
                    </Badge>
                  ))}
                </div>
              )}
            </article>
          );
        })}
        <button
          type="button"
          className="flex h-56 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border text-sm text-muted-foreground hover:border-foreground hover:text-foreground"
          onClick={() => {
            const id = `f-user-${Date.now()}`;
            onChange({
              ...kit,
              flashcards: [
                ...kit.flashcards,
                { id, front: "New prompt", back: "Answer", requirement_ids: [] },
              ],
            });
            setEditing(id);
          }}
        >
          <Plus className="size-5" />
          Add flashcard
        </button>
      </div>
    </section>
  );
}
