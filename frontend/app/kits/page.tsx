"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Shell } from "@/components/Shell";
import { CreateKitDialog } from "@/components/CreateKitDialog";
import { GenerationProgress } from "@/components/GenerationProgress";
import { ApiError, api } from "@/lib/api";
import type { KitRecord } from "@/lib/types";
import {
  companyHost,
  kitRoleTitle,
  relativeTime,
  statusBadgeVariant,
} from "@/lib/kitDisplay";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

export default function KitsPage() {
  return (
    <Suspense>
      <KitsHome />
    </Suspense>
  );
}

function KitsPageSkeletonContent() {
  return (
    <ul className="mt-8 space-y-3" aria-busy="true" aria-label="Loading kits">
      {Array.from({ length: 3 }).map((_, i) => (
        <li key={i} className="panel p-5">
          <Skeleton className="h-6 w-2/3 max-w-sm" />
          <Skeleton className="mt-2 h-4 w-48" />
          <Skeleton className="mt-3 h-5 w-16" />
        </li>
      ))}
    </ul>
  );
}

function KitsHome() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [kits, setKits] = useState<KitRecord[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<KitRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (searchParams.get("new") !== "1") return;
    setDialogOpen(true);
    router.replace("/kits");
  }, [searchParams, router]);

  useEffect(() => {
    api
      .me()
      .then((res) => {
        setEmail(res.user.email);
        return api.kits();
      })
      .then((res) => setKits(res.kits))
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) router.replace("/login");
        else setError(err instanceof Error ? err.message : "Could not load kits");
      });
  }, [router]);

  const inFlight = Boolean(
    kits?.some((kit) => kit.status === "queued" || kit.status === "running"),
  );

  useEffect(() => {
    if (!inFlight) return;
    const t = setInterval(() => {
      void api
        .kits()
        .then((res) => setKits(res.kits))
        .catch((err) => setError(err instanceof Error ? err.message : "Could not load kits"));
    }, 2000);
    return () => clearInterval(t);
  }, [inFlight]);

  function onCreated(created: KitRecord[]) {
    setKits((prev) => {
      const rest = (prev ?? []).filter((kit) => !created.some((row) => row.id === kit.id));
      return [...created, ...rest];
    });
    if (created[0]) router.push(`/kits/${created[0].id}`);
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    setError(null);
    try {
      await api.deleteKit(pendingDelete.id);
      setKits((prev) => (prev ?? []).filter((kit) => kit.id !== pendingDelete.id));
      setPendingDelete(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete kit");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Shell email={email}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            Your kits
          </h1>
        </div>
        <Button type="button" onClick={() => setDialogOpen(true)}>
          New kit
        </Button>
      </div>

      {error && (
        <p role="alert" className="mt-6 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm">
          {error}
        </p>
      )}

      {kits === null && !error && <KitsPageSkeletonContent />}

      {kits && kits.length === 0 && (
        <div className="mt-16 text-center">
          <p className="text-muted-foreground">Paste a job description to create your first kit.</p>
          <Button className="mt-4" type="button" onClick={() => setDialogOpen(true)}>
            Create kit
          </Button>
        </div>
      )}

      {kits && kits.length > 0 && (
        <ul className="mt-8 space-y-3">
          {kits.map((kit) => (
            <li key={kit.id} className="panel flex items-center gap-2 p-5">
              <Link
                href={`/kits/${kit.id}`}
                className="min-w-0 flex-1 transition-colors hover:opacity-80"
              >
                <p className="font-display text-xl font-medium tracking-tight">
                  {kitRoleTitle(kit)}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {companyHost(kit.input.company_url)} · {kit.input.days} days ·{" "}
                  {relativeTime(kit.createdAt)}
                </p>
                <div className="mt-2 flex items-center gap-3">
                  <Badge variant={statusBadgeVariant(kit.status)}>{kit.status}</Badge>
                  <GenerationProgress record={kit} compact />
                </div>
              </Link>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => setPendingDelete(kit)}
              >
                <Trash2 className="size-4" />
                <span className="sr-only">Delete</span>
              </Button>
            </li>
          ))}
        </ul>
      )}

      <CreateKitDialog open={dialogOpen} onOpenChange={setDialogOpen} onCreated={onCreated} />
      <Dialog open={Boolean(pendingDelete)} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Delete kit?</DialogTitle>
            <DialogDescription>
              {pendingDelete ? `${kitRoleTitle(pendingDelete)} will be permanently removed.` : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setPendingDelete(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleting}
              onClick={() => void confirmDelete()}
            >
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Shell>
  );
}
