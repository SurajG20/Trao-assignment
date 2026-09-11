"use client";

import { cn } from "@/lib/utils";

export function FlipFlashcard({
  front,
  back,
  flipped,
  onFlip,
  size = "md",
  className,
  padForActions = false,
}: {
  front: string;
  back: string;
  flipped: boolean;
  onFlip: () => void;
  size?: "md" | "lg";
  className?: string;
  padForActions?: boolean;
}) {
  return (
    <div
      className={cn(
        "flip-scene w-full",
        size === "lg" ? "h-80 sm:h-[28rem]" : "h-56",
        className,
      )}
    >
      <button
        type="button"
        className="flip-card relative h-full w-full text-left"
        data-flipped={flipped}
        onClick={onFlip}
        aria-pressed={flipped}
        aria-label={flipped ? "Show the question" : "Show your answer"}
      >
        <div
          className={cn(
            "flip-face overflow-y-auto rounded-lg bg-primary text-primary-foreground",
            padForActions && "pr-16",
          )}
        >
          <div className="flex h-full flex-col justify-between p-5">
            <p className="font-display text-sm italic text-primary-foreground/70">They ask</p>
            <p
              className={cn(
                "font-display font-medium leading-snug",
                size === "lg" ? "text-2xl sm:text-3xl" : "text-lg",
              )}
            >
              {front || "Empty prompt"}
            </p>
            <p className="text-sm text-primary-foreground/70">Flip for your outline</p>
          </div>
        </div>
        <div
          className={cn(
            "flip-face flip-face-back overflow-y-auto rounded-lg bg-card text-card-foreground ring-1 ring-border",
            padForActions && "pr-16",
          )}
        >
          <div className="flex h-full flex-col justify-between p-5">
            <p className="font-display text-sm italic text-muted-foreground">You answer</p>
            <p
              className={cn(
                "leading-relaxed",
                size === "lg" ? "text-base sm:text-lg" : "text-sm",
              )}
            >
              {back || "Empty answer"}
            </p>
            <p className="text-sm text-muted-foreground">Flip back to the question</p>
          </div>
        </div>
      </button>
    </div>
  );
}
