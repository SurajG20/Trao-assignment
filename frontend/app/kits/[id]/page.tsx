"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Shell } from "@/components/Shell";
import { GenerationProgress } from "@/components/GenerationProgress";
import { BriefTab } from "@/components/kit/BriefTab";
import { CoverageBanner } from "@/components/kit/CoverageBanner";
import { FlashcardsTab } from "@/components/kit/FlashcardsTab";
import { RoleTab } from "@/components/kit/RoleTab";
import { ScheduleTab } from "@/components/kit/ScheduleTab";
import { Button } from "@/components/ui/button";
import { exportKitPdf } from "@/lib/exportKitPdf";
import { ApiError, api } from "@/lib/api";
import type { KitPayload, KitRecord, Question, QuestionCategory } from "@/lib/types";
import { cn } from "@/lib/utils";

const CATEGORIES: QuestionCategory[] = [
  "technical",
  "behavioural",
  "system-design",
  "company-fit",
];

const TABS = [
  ["brief", "Company brief"],
  ["role", "Role"],
  ["questions", "Questions"],
  ["cards", "Flashcards"],
  ["schedule", "Schedule"],
] as const;

export default function KitDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [record, setRecord] = useState<KitRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<(typeof TABS)[number][0]>("brief");
  const [regenBusy, setRegenBusy] = useState<string | null>(null);
  const [highlightQuestion, setHighlightQuestion] = useState<string | null>(null);
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

  useEffect(() => {
    if (!highlightQuestion || tab !== "questions") return;
    const el = document.getElementById(`question-${highlightQuestion}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [highlightQuestion, tab]);

  return (
    <Shell email={email}>
      <p className="text-sm text-muted-foreground">
        <Link className="underline-offset-4 hover:underline" href="/kits">
          Kits
        </Link>
        <span aria-hidden className="mx-2 text-border">
          /
        </span>
        {kit?.role.title || "Generating"}
      </p>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-semibold tracking-tight">
            {kit?.role.title || "Interview kit"}
          </h1>
          {kit?.source.company && (
            <p className="mt-1 text-muted-foreground">{kit.source.company}</p>
          )}
        </div>
        {kit && (
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => exportKitPdf(kit)}>
              Export PDF
            </Button>
            <Button asChild>
              <Link href={`/kits/${id}/practice`}>Practice flashcards</Link>
            </Button>
          </div>
        )}
      </div>

      {error && (
        <p role="alert" className="mt-4 border border-destructive/50 bg-card px-3 py-2 text-sm">
          {error}
        </p>
      )}

      {record && <GenerationProgress record={record} />}

      {!record && !error && <p className="mt-8 text-muted-foreground">Loading kit…</p>}

      {kit && (
        <>
          <div
            className="mt-10 flex flex-wrap gap-x-6 gap-y-2 border-b border-border"
            role="tablist"
            aria-label="Kit sections"
          >
            {TABS.map(([key, label]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={tab === key}
                className={cn(
                  "-mb-px border-b-2 pb-2 text-sm",
                  tab === key
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
                onClick={() => setTab(key)}
              >
                {label}
              </button>
            ))}
          </div>

          <CoverageBanner kit={kit} />

          {tab === "brief" && (
            <BriefTab
              kit={kit}
              busy={regenBusy === "company_brief"}
              onChange={queueSave}
              onRegen={() => regen("company_brief")}
            />
          )}

          {tab === "role" && (
            <RoleTab
              kit={kit}
              onChange={queueSave}
              onJumpToQuestions={(questionId) => {
                setHighlightQuestion(questionId);
                setTab("questions");
              }}
            />
          )}

          {tab === "questions" && (
            <QuestionsPanel
              kit={kit}
              itemState={record?.itemState ?? {}}
              regenBusy={regenBusy}
              highlightId={highlightQuestion}
              onRegen={regen}
              onChange={queueSave}
            />
          )}

          {tab === "cards" && (
            <FlashcardsTab kit={kit} kitId={id} onChange={queueSave} />
          )}

          {tab === "schedule" && (
            <ScheduleTab
              kit={kit}
              busy={regenBusy === "schedule"}
              onRegen={() => regen("schedule")}
            />
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
    <Button type="button" variant="outline" size="sm" disabled={busy} onClick={onClick}>
      {busy ? "Regenerating…" : label}
    </Button>
  );
}

function Field({
  label,
  value,
  onChange,
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <label className={cn("block text-sm font-medium", className)}>
      {label}
      <textarea
        className="mt-1 min-h-24 w-full rounded-md border border-input bg-card px-3 py-2 text-sm font-normal leading-relaxed"
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
  highlightId,
  onRegen,
  onChange,
}: {
  kit: KitPayload;
  itemState: Record<string, string>;
  regenBusy: string | null;
  highlightId?: string | null;
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
    <section className="mt-8 space-y-12">
      {CATEGORIES.map((category) => (
        <div key={category}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-2xl font-medium capitalize">
              {category.replace("-", " ")}
            </h2>
            <RegenBar
              busy={regenBusy === category}
              onClick={() => onRegen(category)}
              label={`Regenerate ${category}`}
            />
          </div>
          {grouped[category].length === 0 && (
            <p className="text-sm text-muted-foreground">No questions in this category yet.</p>
          )}
          <ul className="space-y-8">
            {grouped[category].map((q) => (
              <li
                key={q.id}
                id={`question-${q.id}`}
                className={cn(
                  "border-t border-border pt-4",
                  highlightId === q.id && "bg-mark/20 -mx-2 px-2",
                )}
              >
                <div className="mb-3 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                  <span>{q.id}</span>
                  <span>{itemState[q.id] || "generated"}</span>
                  <label>
                    Category
                    <select
                      className="ml-1 rounded-md border border-input bg-card px-1 py-0.5"
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
                    className="text-destructive hover:underline"
                    onClick={() =>
                      onChange({ ...kit, questions: kit.questions.filter((x) => x.id !== q.id) })
                    }
                  >
                    Delete
                  </button>
                </div>
                <div className="grid gap-4 lg:grid-cols-2">
                  <Field
                    label="They ask"
                    value={q.prompt}
                    className="font-display"
                    onChange={(prompt) => updateQuestion(q.id, { prompt })}
                  />
                  <Field
                    label="You answer"
                    value={q.answer_outline}
                    onChange={(answer_outline) => updateQuestion(q.id, { answer_outline })}
                  />
                </div>
              </li>
            ))}
          </ul>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-4"
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
          </Button>
        </div>
      ))}
    </section>
  );
}
