import { Badge } from "@/components/ui/badge";
import type { KitPayload } from "@/lib/types";
import { mustHaveCoverage, questionsForRequirement } from "@/lib/kitCoverage";

export { mustHaveCoverage, questionsForRequirement };

export function CoverageBanner({ kit }: { kit: KitPayload }) {
  const { covered, total } = mustHaveCoverage(kit);
  const complete = total === 0 || covered === total;
  const gaps = total - covered;

  return (
    <div
      className={`mt-6 flex flex-wrap items-center justify-between gap-3 px-0 py-3 text-sm ${
        complete ? "border-b border-border" : "border-b-4 border-mark"
      }`}
    >
      <div>
        <p className="font-medium">
          {total === 0
            ? "No must-have requirements extracted"
            : `${covered} of ${total} must-haves covered`}
        </p>
        {!complete && gaps > 0 && (
          <p className="mt-0.5 text-muted-foreground">
            Add or regenerate questions for uncovered must-haves on the Role tab.
          </p>
        )}
      </div>
      <Badge variant={complete ? "secondary" : "outline"}>
        {complete ? "Coverage complete" : `${gaps} gap${gaps === 1 ? "" : "s"}`}
      </Badge>
    </div>
  );
}
