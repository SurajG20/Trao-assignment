"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Shell } from "@/components/Shell";
import { ApiError, api } from "@/lib/api";
import type { KitRecord } from "@/lib/types";

export default function KitsPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [kits, setKits] = useState<KitRecord[] | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <Shell email={email}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Your kits</h1>
          <p className="mt-1 text-sm text-zinc-600">Each kit is generated from a job description and a company site.</p>
        </div>
        <Link
          href="/kits/new"
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
        >
          New kit
        </Link>
      </div>
      {error && (
        <p role="alert" className="mt-6 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm">
          {error}
        </p>
      )}
      {kits === null && !error && <p className="mt-10 text-zinc-500">Loading kits…</p>}
      {kits && kits.length === 0 && (
        <p className="mt-10 rounded-lg border border-dashed border-zinc-300 bg-white px-4 py-10 text-center text-zinc-600">
          No kits yet. Paste a job description to generate the first one.
        </p>
      )}
      {kits && kits.length > 0 && (
        <ul className="mt-8 space-y-3">
          {kits.map((kit) => (
            <li key={kit.id}>
              <Link
                href={`/kits/${kit.id}`}
                className="block rounded-lg border border-zinc-200 bg-white px-4 py-3 hover:border-zinc-400"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">
                    {kit.kit?.role.title || kit.input.jd.split("\n")[0] || "Untitled role"}
                  </span>
                  <StatusBadge status={kit.status} />
                </div>
                <p className="mt-1 truncate text-sm text-zinc-500">{kit.input.company_url}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Shell>
  );
}

function StatusBadge({ status }: { status: KitRecord["status"] }) {
  const styles: Record<KitRecord["status"], string> = {
    queued: "bg-zinc-100 text-zinc-700",
    running: "bg-amber-50 text-amber-800",
    ready: "bg-teal-50 text-teal-800",
    failed: "bg-red-50 text-red-800",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${styles[status]}`}>{status}</span>
  );
}
