import type { KitPayload } from "@/lib/types";
import { mustHaveCoverage } from "@/lib/kitCoverage";

export function CoverageBanner({ kit }: { kit: KitPayload }) {
  const { covered, total } = mustHaveCoverage(kit);
  if (total === 0 || covered === total) return null;

  const gaps = total - covered;

  return (
    <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
      <span className="font-medium">{gaps} must-have gap{gaps === 1 ? "" : "s"}</span>
      <span className="text-amber-900/80"> — add or regenerate questions on the Role tab.</span>
    </div>
  );
}
