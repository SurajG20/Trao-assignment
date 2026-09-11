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
  const fetchedAt = kit.source.researched_at
    ? new Date(kit.source.researched_at).toLocaleString()
    : null;

  function patchBrief(patch: Partial<KitPayload["company_brief"]>) {
    onChange({ ...kit, company_brief: { ...kit.company_brief, ...patch } });
  }

  return (
    <section className="mt-8 space-y-6">
      <Button type="button" variant="outline" size="sm" disabled={busy} onClick={onRegen}>
        {busy ? "Regenerating…" : "Regenerate brief"}
      </Button>
      <p className="max-w-[60ch] text-sm text-muted-foreground">
        Regenerating the brief does not change questions, flashcards, or schedule edits.
      </p>
      <div className="grid gap-2">
        <Label htmlFor="brief-summary">Summary</Label>
        <Textarea
          id="brief-summary"
          className="min-h-28 font-display text-base leading-relaxed"
          value={kit.company_brief.summary}
          onChange={(e) => patchBrief({ summary: e.target.value })}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="brief-what">What they do</Label>
        <Textarea
          id="brief-what"
          className="min-h-24 leading-relaxed"
          placeholder="Product and customers from the crawl — add it here if the pages were thin."
          value={kit.company_brief.what_they_do}
          onChange={(e) => patchBrief({ what_they_do: e.target.value })}
        />
        {!kit.company_brief.what_they_do.trim() && (
          <p className="bg-mark/40 px-2 py-1 text-sm">
            Empty after crawl. Fill it in, or regenerate the brief once pages actually describe the
            business.
          </p>
        )}
      </div>
      <div>
        <h2 className="font-display text-xl font-medium">Sources</h2>
        {urls.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No pages were used.</p>
        ) : (
          <ul className="mt-2 space-y-1 text-sm">
            {urls.map((src) => (
              <li key={src} className="flex flex-wrap items-baseline gap-2">
                <a className="underline underline-offset-4" href={src} target="_blank" rel="noreferrer">
                  {src}
                </a>
                {fetchedAt && (
                  <span className="text-xs text-muted-foreground">fetched {fetchedAt}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
