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
  const tall = size === "lg";

  return (
    <div
      className={cn(
        "flip-scene w-full",
        tall ? "h-80 sm:h-96" : "h-64 sm:h-72",
        className,
      )}
    >
      <button
        type="button"
        className="flip-card relative block h-full w-full appearance-none border-0 bg-transparent p-0 text-left"
        data-flipped={flipped}
        onClick={onFlip}
        aria-pressed={flipped}
        aria-label={flipped ? "Hide answer" : "Reveal answer"}
      >
        {/* Question side */}
        <div
          className={cn(
            "flip-face flip-face-front overflow-hidden rounded-lg border border-primary/20 bg-primary shadow-sm",
            padForActions && "pr-12",
          )}
        >
          <div className="flex h-full flex-col p-5 sm:p-6">
            <p className="text-xs font-medium uppercase tracking-wide text-white/70">Question</p>
            <div className="mt-3 min-h-0 flex-1 overflow-y-auto">
              <p
                className={cn(
                  "font-sans font-medium leading-relaxed text-white",
                  tall ? "text-lg sm:text-xl" : "text-base sm:text-lg",
                )}
              >
                {front || "No question"}
              </p>
            </div>
            {!flipped && (
              <p className="mt-3 shrink-0 text-xs text-white/60">Tap to reveal answer</p>
            )}
          </div>
        </div>

        {/* Answer side */}
        <div
          className={cn(
            "flip-face flip-face-back overflow-hidden rounded-lg border border-border bg-card shadow-sm",
            padForActions && "pr-12",
          )}
        >
          <div className="flex h-full flex-col p-5 sm:p-6">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Answer
            </p>
            <div className="mt-3 min-h-0 flex-1 overflow-y-auto">
              <p
                className={cn(
                  "whitespace-pre-wrap font-sans leading-relaxed text-card-foreground",
                  tall ? "text-base sm:text-lg" : "text-sm sm:text-base",
                )}
              >
                {back || "No answer"}
              </p>
            </div>
          </div>
        </div>
      </button>
    </div>
  );
}
