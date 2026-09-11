"use client";

import { FormEvent, useState } from "react";
import { Loader2 } from "lucide-react";
import { ApiError, api } from "@/lib/api";
import type { KitRecord } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";

type BatchRow = { jd: string; company_url: string; days?: number };

export function CreateKitDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (kits: KitRecord[]) => void;
}) {
  const [jd, setJd] = useState("");
  const [companyUrl, setCompanyUrl] = useState("");
  const [days, setDays] = useState(5);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function createOne(body: { jd: string; company_url: string; days: number }) {
    const res = await api.createKit(body);
    return res.kit;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const kit = await createOne({ jd, company_url: companyUrl, days });
      onOpenChange(false);
      setJd("");
      setCompanyUrl("");
      setDays(5);
      onCreated([kit]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create kit");
    } finally {
      setPending(false);
    }
  }

  async function onBatchFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    try {
      const parsed = JSON.parse(await file.text()) as BatchRow[] | { cases: BatchRow[] };
      const rows = Array.isArray(parsed) ? parsed : parsed.cases;
      if (!Array.isArray(rows) || rows.length === 0) {
        throw new Error("File must be a JSON array of { jd, company_url, days }");
      }
      setPending(true);
      const created: KitRecord[] = [];
      for (const row of rows) {
        created.push(
          await createOne({
            jd: row.jd,
            company_url: row.company_url,
            days: row.days ?? days,
          }),
        );
      }
      onOpenChange(false);
      onCreated(created);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read batch file");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader className="shrink-0 pr-8">
          <DialogTitle className="font-display text-2xl">Create a kit</DialogTitle>
          <DialogDescription>
            Paste the posting. We crawl the company site; we do not fetch job boards.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col gap-4">
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="grid gap-2">
              <Label htmlFor="jd">Job description</Label>
              <Textarea
                id="jd"
                required
                className="h-40 max-h-40 min-h-40 resize-none overflow-y-auto"
                value={jd}
                onChange={(e) => setJd(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="company-url">Company website</Label>
              <Input
                id="company-url"
                type="url"
                required
                placeholder="https://"
                value={companyUrl}
                onChange={(e) => setCompanyUrl(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="days">Days until interview</Label>
              <Input
                id="days"
                className="w-32"
                type="number"
                min={1}
                max={60}
                required
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
              />
            </div>
            <div className="border-t border-border pt-4 text-sm">
              <p className="font-medium">Or upload several roles</p>
              <p className="mt-1 text-muted-foreground">
                JSON array of objects with jd, company_url, and optional days.
              </p>
              <Input
                className="mt-2"
                type="file"
                accept="application/json,.json"
                onChange={(e) => void onBatchFile(e.target.files?.[0])}
              />
            </div>
          </div>
          <DialogFooter className="shrink-0 border-t border-border pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="animate-spin" />}
              {pending ? "Starting…" : "Generate kit"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
