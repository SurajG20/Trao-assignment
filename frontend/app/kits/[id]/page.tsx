"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Shell } from "@/components/Shell";
import { ApiError, api } from "@/lib/api";
import type { KitPayload, KitRecord, Question, QuestionCategory } from "@/lib/types";

const CATEGORIES: QuestionCategory[] = [
  "technical",
  "behavioural",
  "system-design",
  "company-fit",
];

export default function KitDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [record, setRecord] = useState<KitRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"brief" | "role" | "questions" | "cards" | "schedule">("brief");
  const [regenBusy, setRegenBusy] = useState<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = useCallback(async () => {
    const res = await api.kit(id);
    setRecord(res.kit);
    return res.kit;
  }, [id]);

  useEffect(() => {
    api
      .me()
      .then((res) => {
        setEmail(res.user.email);
        return refresh();
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) router.replace("/login");
        else setError(err instanceof Error ? err.message : "Could not load kit");
      });
  }, [refresh, router]);

  useEffect(() => {
    if (!record || (record.status !== "queued" && record.status !== "running")) return;
    const t = setInterval(() => {
      void refresh().catch((err) => setError(err instanceof Error ? err.message : "Poll failed"));
    }, 1000);
    return () => clearInterval(t);
  }, [record?.status, refresh, record]);

  function queueSave(next: KitPayload) {
    if (!record) return;
    setRecord({ ...record, kit: next });
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      void api.patchKit(id, { kit: next }).catch((err) => {
        setError(err instanceof Error ? err.message : "Save failed");
      });
    }, 450);
  }

  async function regen(section: string) {
    setRegenBusy(section);
    setError(null);
    try {
      const res = await api.regenerate(id, section);
      setRecord(res.kit);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Regenerate failed");
    } finally {
      setRegenBusy(null);
    }
  }

  const kit = record?.kit;
  const generating = record?.status === "queued" || record?.status === "running";

  return (
    <Shell email={email}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-zinc-500">
            <Link className="hover:underline" href="/kits">
              Kits
            </Link>
            <span aria-hidden> / </span>
            {kit?.role.title || "Generating"}
          </p>
          <h1 className="mt-1 text-2xl font-semibold">{kit?.role.title || "Interview kit"}</h1>
        </div>
        {kit && (
          <Link
            href={`/kits/${id}/practice`}
            className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm hover:border-zinc-500"
          >
            Practice flashcards
          </Link>
        )}
      </div>

      {error && (
        <p role="alert" className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm">
          {error}
        </p>
      )}

      {generating && (
        <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3" aria-live="polite">
          <p className="font-medium">Generating kit…</p>
          <p className="mt-1 text-sm text-amber-900">
            {record?.progress?.message || record?.progress?.step || "Working"}
          </p>
        </div>
      )}

      {record?.status === "failed" && (
        <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3" role="alert">
          <p className="font-medium">Generation failed</p>
          <p className="mt-1 text-sm">{record.error?.message || "Unknown error"}</p>
        </div>
      )}

      {!record && !error && <p className="mt-8 text-zinc-500">Loading kit…</p>}

      {kit && (
        <>
          <div className="mt-6 flex flex-wrap gap-2" role="tablist" aria-label="Kit sections">
            {(
              [
                ["brief", "Company brief"],
                ["role", "Role"],
                ["questions", "Questions"],
                ["cards", "Flashcards"],
                ["schedule", "Schedule"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={tab === key}
                className={`rounded-full px-3 py-1.5 text-sm ${
                  tab === key ? "bg-zinc-900 text-white" : "bg-white text-zinc-700 ring-1 ring-zinc-300"
                }`}
                onClick={() => setTab(key)}
              >
                {label}
              </button>
            ))}
          </div>

          {tab === "brief" && (
            <section className="mt-6 space-y-4">
              <RegenBar
                busy={regenBusy === "company_brief"}
                onClick={() => regen("company_brief")}
                label="Regenerate brief"
              />
              <Field
                label="Summary"
                value={kit.company_brief.summary}
                onChange={(summary) =>
                  queueSave({ ...kit, company_brief: { ...kit.company_brief, summary } })
                }
              />
              <Field
                label="What they do"
                value={kit.company_brief.what_they_do}
                onChange={(what_they_do) =>
                  queueSave({ ...kit, company_brief: { ...kit.company_brief, what_they_do } })
                }
              />
              <ul className="text-sm text-zinc-600">
                {kit.company_brief.sources.map((src) => (
                  <li key={src}>
                    <a className="underline" href={src} target="_blank" rel="noreferrer">
                      {src}
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {tab === "role" && (
            <section className="mt-6 space-y-4">
              <p className="text-sm text-zinc-600">
                {kit.role.seniority && <span>Seniority: {kit.role.seniority}. </span>}
                Coverage passes: {kit.coverage.passes}. Uncovered:{" "}
                {kit.coverage.uncovered_requirement_ids.join(", ") || "none"}.
              </p>
              <ul className="space-y-2">
                {kit.role.requirements.map((req) => (
                  <li key={req.id} className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm">
                    <span className="font-mono text-xs text-zinc-500">{req.id}</span>{" "}
                    <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs">{req.priority}</span>{" "}
                    <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs">{req.kind}</span>
                    <p className="mt-1">{req.text}</p>
                  </li>
                ))}
                {kit.role.requirements.length === 0 && (
                  <li className="text-sm text-zinc-500">No requirements extracted — the posting was too thin to invent any.</li>
                )}
              </ul>
            </section>
          )}

          {tab === "questions" && (
            <QuestionsPanel
              kit={kit}
              itemState={record?.itemState ?? {}}
              regenBusy={regenBusy}
              onRegen={regen}
              onChange={queueSave}
            />
          )}

          {tab === "cards" && (
            <section className="mt-6 space-y-3">
              {kit.flashcards.map((card, index) => (
                <article key={card.id} className="rounded-md border border-zinc-200 bg-white p-3">
                  <Field
                    label="Front"
                    value={card.front}
                    onChange={(front) => {
                      const flashcards = kit.flashcards.slice();
                      flashcards[index] = { ...card, front };
                      queueSave({ ...kit, flashcards });
                    }}
                  />
                  <div className="mt-2">
                    <Field
                      label="Back"
                      value={card.back}
                      onChange={(back) => {
                        const flashcards = kit.flashcards.slice();
                        flashcards[index] = { ...card, back };
                        queueSave({ ...kit, flashcards });
                      }}
                    />
                  </div>
                  <button
                    type="button"
                    className="mt-2 text-sm text-red-700 hover:underline"
                    onClick={() =>
                      queueSave({
                        ...kit,
                        flashcards: kit.flashcards.filter((c) => c.id !== card.id),
                      })
                    }
                  >
                    Delete card
                  </button>
                </article>
              ))}
              <button
                type="button"
                className="rounded-md border border-zinc-300 px-3 py-2 text-sm"
                onClick={() =>
                  queueSave({
                    ...kit,
                    flashcards: [
                      ...kit.flashcards,
                      {
                        id: `f-user-${Date.now()}`,
                        front: "New prompt",
                        back: "Answer",
                        requirement_ids: [],
                      },
                    ],
                  })
                }
              >
                Add flashcard
              </button>
            </section>
          )}

          {tab === "schedule" && (
            <section className="mt-6 space-y-4">
              <RegenBar
                busy={regenBusy === "schedule"}
                onClick={() => regen("schedule")}
                label="Rebuild schedule"
              />
              <ol className="space-y-3">
                {kit.schedule.days.map((day) => (
                  <li key={day.day} className="rounded-md border border-zinc-200 bg-white px-3 py-2">
                    <p className="font-medium">
                      Day {day.day} · {day.minutes} min
                    </p>
                    <p className="text-sm text-zinc-600">{day.focus}</p>
                    <p className="mt-1 font-mono text-xs text-zinc-500">
                      {day.question_ids.join(", ") || "No questions"}
                    </p>
                  </li>
                ))}
              </ol>
            </section>
          )}
        </>
      )}
    </Shell>
  );
}

function RegenBar({
  busy,
  onClick,
  label,
}: {
  busy: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      disabled={busy}
      onClick={onClick}
      className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm disabled:opacity-50"
    >
      {busy ? "Regenerating…" : label}
    </button>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block text-sm font-medium">
      {label}
      <textarea
        className="mt-1 min-h-24 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-normal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

function QuestionsPanel({
  kit,
  itemState,
  regenBusy,
  onRegen,
  onChange,
}: {
  kit: KitPayload;
  itemState: Record<string, string>;
  regenBusy: string | null;
  onRegen: (section: string) => void;
  onChange: (kit: KitPayload) => void;
}) {
  const grouped = useMemo(() => {
    const map = Object.fromEntries(CATEGORIES.map((c) => [c, [] as Question[]])) as Record<
      QuestionCategory,
      Question[]
    >;
    for (const q of kit.questions) map[q.category].push(q);
    return map;
  }, [kit.questions]);

  function updateQuestion(id: string, patch: Partial<Question>) {
    onChange({
      ...kit,
      questions: kit.questions.map((q) => (q.id === id ? { ...q, ...patch } : q)),
    });
  }

  function move(id: string, dir: -1 | 1) {
    const questions = kit.questions.slice();
    const index = questions.findIndex((q) => q.id === id);
    const next = index + dir;
    if (index < 0 || next < 0 || next >= questions.length) return;
    [questions[index], questions[next]] = [questions[next], questions[index]];
    onChange({ ...kit, questions });
  }

  return (
    <section className="mt-6 space-y-8">
      {CATEGORIES.map((category) => (
        <div key={category}>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-medium capitalize">{category.replace("-", " ")}</h2>
            <RegenBar
              busy={regenBusy === category}
              onClick={() => onRegen(category)}
              label={`Regenerate ${category}`}
            />
          </div>
          {grouped[category].length === 0 && (
            <p className="text-sm text-zinc-500">No questions in this category yet.</p>
          )}
          <ul className="space-y-3">
            {grouped[category].map((q) => (
              <li key={q.id} className="rounded-md border border-zinc-200 bg-white p-3">
                <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                  <span className="font-mono">{q.id}</span>
                  <span>{itemState[q.id] || "generated"}</span>
                  <label>
                    Category
                    <select
                      className="ml-1 rounded border border-zinc-300 bg-white px-1 py-0.5"
                      value={q.category}
                      onChange={(e) =>
                        updateQuestion(q.id, { category: e.target.value as QuestionCategory })
                      }
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button type="button" className="hover:underline" onClick={() => move(q.id, -1)}>
                    Up
                  </button>
                  <button type="button" className="hover:underline" onClick={() => move(q.id, 1)}>
                    Down
                  </button>
                  <button
                    type="button"
                    className="text-red-700 hover:underline"
                    onClick={() =>
                      onChange({ ...kit, questions: kit.questions.filter((x) => x.id !== q.id) })
                    }
                  >
                    Delete
                  </button>
                </div>
                <Field
                  label="Prompt"
                  value={q.prompt}
                  onChange={(prompt) => updateQuestion(q.id, { prompt })}
                />
                <div className="mt-2">
                  <Field
                    label="Answer outline"
                    value={q.answer_outline}
                    onChange={(answer_outline) => updateQuestion(q.id, { answer_outline })}
                  />
                </div>
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="mt-2 rounded-md border border-zinc-300 px-3 py-1.5 text-sm"
            onClick={() =>
              onChange({
                ...kit,
                questions: [
                  ...kit.questions,
                  {
                    id: `q-user-${Date.now()}`,
                    requirement_ids: [],
                    category,
                    prompt: "New question",
                    answer_outline: "",
                    difficulty: 2,
                  },
                ],
              })
            }
          >
            Add {category} question
          </button>
        </div>
      ))}
    </section>
  );
}
