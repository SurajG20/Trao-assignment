"use client";

import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { FlipFlashcard } from "@/components/Flashcard";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Flashcard, KitPayload } from "@/lib/types";

export function FlashcardsTab({
  kit,
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
    <section className="mt-6 space-y-4">
      {kit.flashcards.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">No flashcards yet.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {kit.flashcards.map((card) => {
            const isEditing = editing === card.id;
            return (
              <article key={card.id} className="relative">
                {isEditing ? (
                  <div className="panel flex h-64 flex-col gap-2 p-4 sm:h-72">
                    <div className="grid min-h-0 flex-1 gap-1">
                      <Label htmlFor={`${card.id}-front`} className="text-xs">
                        Question
                      </Label>
                      <Textarea
                        id={`${card.id}-front`}
                        className="min-h-0 flex-1 resize-none border-0 bg-secondary/50 font-display shadow-none focus-visible:ring-1"
                        value={card.front}
                        onChange={(e) => patchCard(card.id, { front: e.target.value })}
                      />
                    </div>
                    <div className="grid min-h-0 flex-1 gap-1">
                      <Label htmlFor={`${card.id}-back`} className="text-xs">
                        Answer
                      </Label>
                      <Textarea
                        id={`${card.id}-back`}
                        className="min-h-0 flex-1 resize-none border-0 bg-secondary/50 shadow-none focus-visible:ring-1"
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
                    className="size-7 bg-card/90"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditing(isEditing ? null : card.id);
                    }}
                  >
                    <Pencil className="size-3.5" />
                    <span className="sr-only">Edit</span>
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="secondary"
                    className="size-7 bg-card/90"
                    onClick={(e) => {
                      e.stopPropagation();
                      onChange({
                        ...kit,
                        flashcards: kit.flashcards.filter((c) => c.id !== card.id),
                      });
                    }}
                  >
                    <Trash2 className="size-3.5" />
                    <span className="sr-only">Delete</span>
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <Button
        type="button"
        variant="outline"
        className="w-full border-dashed sm:w-auto"
        onClick={() => {
          const id = `f-user-${Date.now()}`;
          onChange({
            ...kit,
            flashcards: [
              ...kit.flashcards,
              {
                id,
                front: "What is your experience with …?",
                back: "Concise answer here.",
                requirement_ids: [],
              },
            ],
          });
          setEditing(id);
        }}
      >
        <Plus className="size-4" />
        Add flashcard
      </Button>
    </section>
  );
}
