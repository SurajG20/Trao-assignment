"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Shell } from "@/components/Shell";
import { ApiError, api } from "@/lib/api";

type BatchRow = { jd: string; company_url: string; days?: number };

export default function NewKitPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [jd, setJd] = useState("");
  const [companyUrl, setCompanyUrl] = useState("");
  const [days, setDays] = useState(5);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [batchNote, setBatchNote] = useState<string | null>(null);

  useEffect(() => {
    api
      .me()
      .then((res) => setEmail(res.user.email))
      .catch(() => router.replace("/login"));
  }, [router]);

  async function createOne(body: { jd: string; company_url: string; days: number }) {
    const res = await api.createKit(body);
    return res.kit.id;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const id = await createOne({ jd, company_url: companyUrl, days });
      router.push(`/kits/${id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create kit");
    } finally {
      setPending(false);
    }
  }

  async function onBatchFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    setBatchNote(null);
    try {
      const parsed = JSON.parse(await file.text()) as BatchRow[] | { cases: BatchRow[] };
      const rows = Array.isArray(parsed) ? parsed : parsed.cases;
      if (!Array.isArray(rows) || rows.length === 0) {
        throw new Error("File must be a JSON array of { jd, company_url, days }");
      }
      setPending(true);
      const ids: string[] = [];
      for (const row of rows) {
        const id = await createOne({
          jd: row.jd,
          company_url: row.company_url,
          days: row.days ?? days,
        });
        ids.push(id);
      }
      setBatchNote(`Started ${ids.length} kits.`);
      router.push(`/kits/${ids[0]}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read batch file");
    } finally {
      setPending(false);
    }
  }

  return (
    <Shell email={email}>
      <h1 className="text-2xl font-semibold">Create a kit</h1>
      <p className="mt-1 text-sm text-zinc-600">
        Paste the posting. We crawl the company site; we do not fetch job boards.
      </p>
      <form onSubmit={onSubmit} className="mt-8 space-y-5">
        {error && (
          <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm">
            {error}
          </p>
        )}
        {batchNote && <p className="text-sm text-teal-800">{batchNote}</p>}
        <label className="block text-sm font-medium">
          Job description
          <textarea
            className="mt-1 min-h-48 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 font-mono text-sm"
            required
            value={jd}
            onChange={(e) => setJd(e.target.value)}
          />
        </label>
        <label className="block text-sm font-medium">
          Company website
          <input
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2"
            type="url"
            required
            placeholder="https://"
            value={companyUrl}
            onChange={(e) => setCompanyUrl(e.target.value)}
          />
        </label>
        <label className="block text-sm font-medium">
          Days until interview
          <input
            className="mt-1 w-32 rounded-md border border-zinc-300 bg-white px-3 py-2"
            type="number"
            min={1}
            max={60}
            required
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
          />
        </label>
        <div className="rounded-md border border-zinc-200 bg-white px-3 py-3 text-sm">
          <p className="font-medium">Or upload several roles</p>
          <p className="mt-1 text-zinc-600">JSON array of objects with jd, company_url, and optional days.</p>
          <input
            className="mt-2 block w-full text-sm"
            type="file"
            accept="application/json,.json"
            onChange={(e) => void onBatchFile(e.target.files?.[0])}
          />
        </div>
        <button
          className="rounded-md bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
          disabled={pending}
          type="submit"
        >
          {pending ? "Starting…" : "Generate kit"}
        </button>
      </form>
    </Shell>
  );
}
