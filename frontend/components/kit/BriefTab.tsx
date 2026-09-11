"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { KitPayload } from "@/lib/types";

export function BriefTab({
  kit,
  busy,
  onChange,
  onRegen,
}: {
  kit: KitPayload;
  busy: boolean;
  onChange: (kit: KitPayload) => void;
  onRegen: () => void;
}) {
  const urls = [...new Set([...kit.company_brief.sources, ...kit.source.pages_used])];

  function patchBrief(patch: Partial<KitPayload["company_brief"]>) {
    onChange({ ...kit, company_brief: { ...kit.company_brief, ...patch } });
  }

  return (
    <section className="mt-6 space-y-4">
      <div className="flex justify-end">
        <Button type="button" variant="outline" size="sm" disabled={busy} onClick={onRegen}>
          {busy ? "Regenerating…" : "Regenerate"}
        </Button>
      </div>

      <div className="panel space-y-5 p-5 sm:p-6">
        <div className="grid gap-2">
          <Label htmlFor="brief-summary">Summary</Label>
          <Textarea
            id="brief-summary"
            className="min-h-28 resize-none border-0 bg-secondary/50 font-display text-base leading-relaxed shadow-none focus-visible:ring-1"
            value={kit.company_brief.summary}
            onChange={(e) => patchBrief({ summary: e.target.value })}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="brief-what">What they do</Label>
          <Textarea
            id="brief-what"
            className="min-h-24 resize-none border-0 bg-secondary/50 leading-relaxed shadow-none focus-visible:ring-1"
            placeholder="Products, customers, and services."
            value={kit.company_brief.what_they_do}
            onChange={(e) => patchBrief({ what_they_do: e.target.value })}
          />
        </div>
      </div>

      {urls.length > 0 && (
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {urls.map((src) => (
            <li key={src}>
              <a
                className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                href={src}
                target="_blank"
                rel="noreferrer"
              >
                {(() => {
                  try {
                    return new URL(src).hostname;
                  } catch {
                    return src;
                  }
                })()}
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
