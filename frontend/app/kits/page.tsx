"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
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

export default function KitsPage() {
  return (
    <Suspense>
      <KitsHome />
    </Suspense>
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

  function openDialog() {
    setDialogOpen(true);
  }

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
          <h1 className="font-display text-4xl font-semibold tracking-tight">Your kits</h1>
          <p className="mt-2 max-w-[48ch] text-muted-foreground">
            Each kit is generated from a job description and a company site.
          </p>
        </div>
        <Button type="button" onClick={openDialog}>
          New kit
        </Button>
      </div>
      {error && (
        <p role="alert" className="mt-6 border border-destructive/50 bg-card px-3 py-2 text-sm">
          {error}
        </p>
      )}
      {kits === null && !error && <p className="mt-10 text-muted-foreground">Loading kits…</p>}
      {kits && kits.length === 0 && (
        <div className="mt-12 max-w-lg">
          <p className="font-display text-2xl font-medium">No kits yet.</p>
          <p className="mt-2 text-muted-foreground">
            Paste a job description to generate the first one.
          </p>
          <Button className="mt-6" type="button" onClick={openDialog}>
            Create your first kit
          </Button>
        </div>
      )}
      {kits && kits.length > 0 && (
        <ul className="mt-10 divide-y divide-border border-y border-border">
          {kits.map((kit) => (
            <li key={kit.id} className="group">
              <div className="flex flex-wrap items-start justify-between gap-4 py-5">
                <Link href={`/kits/${kit.id}`} className="min-w-0 flex-1">
                  <p className="font-display text-2xl font-medium tracking-tight group-hover:underline">
                    {kitRoleTitle(kit)}
                  </p>
                  <p className="mt-1 flex flex-wrap gap-x-4 text-sm text-muted-foreground">
                    <span>{companyHost(kit.input.company_url)}</span>
                    <span>
                      {kit.input.days} day{kit.input.days === 1 ? "" : "s"} to go
                    </span>
                    <span>{relativeTime(kit.createdAt)}</span>
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <Badge variant={statusBadgeVariant(kit.status)}>{kit.status}</Badge>
                    <GenerationProgress record={kit} compact />
                  </div>
                </Link>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/kits/${kit.id}`}>Open</Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    type="button"
                    onClick={() => setPendingDelete(kit)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      <CreateKitDialog open={dialogOpen} onOpenChange={setDialogOpen} onCreated={onCreated} />
      <Dialog open={Boolean(pendingDelete)} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">Delete this kit?</DialogTitle>
            <DialogDescription>
              {pendingDelete
                ? `${kitRoleTitle(pendingDelete)} will be removed. You can generate it again from the same posting later.`
                : ""}
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
              {deleting ? "Deleting…" : "Delete kit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Shell>
  );
}
