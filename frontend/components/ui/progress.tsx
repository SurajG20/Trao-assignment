import * as React from "react";
import { cn } from "@/lib/utils";

function Progress({
  className,
  value = 0,
  ...props
}: React.ComponentProps<"div"> & { value?: number | null }) {
  const percent = Math.min(100, Math.max(0, value ?? 0));
  return (
    <div
      data-slot="progress"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(percent)}
      className={cn(
        "bg-secondary relative h-1.5 w-full overflow-hidden",
        className,
      )}
      {...props}
    >
      <div
        className="bg-primary h-full w-full flex-1 transition-all"
        style={{ transform: `translateX(-${100 - percent}%)` }}
      />
    </div>
  );
}

export { Progress };
