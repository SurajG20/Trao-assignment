"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, Pencil, Trash2 } from "lucide-react";
import { Shell } from "@/components/Shell";
import { GenerationProgress } from "@/components/GenerationProgress";
import { BriefTab } from "@/components/kit/BriefTab";
import { CoverageBanner } from "@/components/kit/CoverageBanner";
import { FlashcardsTab } from "@/components/kit/FlashcardsTab";
import { RoleTab } from "@/components/kit/RoleTab";
import { ScheduleTab } from "@/components/kit/ScheduleTab";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { exportKitPdf } from "@/lib/exportKitPdf";
import { ApiError, api } from "@/lib/api";
import type { KitPayload, KitRecord, Question, QuestionCategory } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

const CATEGORIES: QuestionCategory[] = [
  "technical",
  "behavioural",
  "system-design",
  "company-fit",
];

const TABS = [
  ["brief", "Brief"],
  ["role", "Role"],
  ["questions", "Questions"],
  ["cards", "Flashcards"],
  ["schedule", "Schedule"],
] as const;

const CATEGORY_LABELS: Record<QuestionCategory, string> = {
  technical: "Technical",
  behavioural: "Behavioural",
  "system-design": "System design",
  "company-fit": "Company fit",
};

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
      <Link
        href="/kits"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        ← Kits
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            {kit?.role.title || "Interview kit"}
          </h1>
          {kit?.source.company && (
            <p className="mt-1 text-muted-foreground">{kit.source.company}</p>
          )}
        </div>
        {kit && (
          <div className="flex shrink-0 gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => exportKitPdf(kit)}>
              Export PDF
            </Button>
            {kit.flashcards.length > 0 && (
              <Button asChild size="sm">
                <Link href={`/kits/${id}/practice`}>Practice</Link>
              </Button>
            )}
          </div>
        )}
      </div>

      {error && (
        <p role="alert" className="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm">
          {error}
        </p>
      )}

      {record && <GenerationProgress record={record} />}

      {!record && !error && <KitDetailSkeletonContent />}

      {record && !kit && !error && record.status !== "failed" && (
        <KitTabSkeletonContent />
      )}

      {kit && (
        <>
          <div className="kit-tab-scroll mt-8 -mx-4 overflow-x-auto border-b border-border px-4 sm:mx-0 sm:px-0">
            <div
              className="flex min-w-max gap-6 sm:min-w-0 sm:gap-8"
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
                    "shrink-0 border-b-2 pb-3 text-sm font-medium transition-colors",
                    tab === key
                      ? "-mb-px border-primary text-foreground"
                      : "-mb-px border-transparent text-muted-foreground hover:text-foreground",
                  )}
                  onClick={() => setTab(key)}
                >
                  {label}
                </button>
              ))}
            </div>
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
              regenBusy={regenBusy}
              highlightId={highlightQuestion}
              onRegen={regen}
              onChange={queueSave}
            />
          )}

          {tab === "cards" && <FlashcardsTab kit={kit} kitId={id} onChange={queueSave} />}

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

function KitDetailSkeletonContent() {
  const tabs = ["Brief", "Role", "Questions", "Flashcards", "Schedule"];

  return (
    <div className="mt-4 space-y-8" aria-busy="true" aria-label="Loading kit">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-10 w-3/4 max-w-md" />
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-20" />
        </div>
      </div>
      <div className="flex gap-6 border-b border-border pb-3 sm:gap-8">
        {tabs.map((tab) => (
          <Skeleton key={tab} className="h-4 w-16" />
        ))}
      </div>
      <KitTabSkeletonContent />
    </div>
  );
}

function KitTabSkeletonContent() {
  return (
    <div className="mt-6 space-y-4" aria-hidden>
      <div className="flex justify-end">
        <Skeleton className="h-8 w-24" />
      </div>
      <div className="panel space-y-4 p-5 sm:p-6">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-20 w-full" />
      </div>
    </div>
  );
}

function QuestionItem({
  index,
  question,
  highlighted,
  onUpdate,
  onMove,
  onDelete,
}: {
  index: number;
  question: Question;
  highlighted: boolean;
  onUpdate: (patch: Partial<Question>) => void;
  onDelete: () => void;
  onMove: (dir: -1 | 1) => void;
}) {
  const [revealed, setRevealed] = useState(false);
  const [editing, setEditing] = useState(!question.prompt.trim());
  const hasAnswer = Boolean(question.answer_outline.trim());

  function closeEdit() {
    setEditing(false);
    setRevealed(false);
  }

  return (
    <li
      id={`question-${question.id}`}
      className={cn("panel p-4 sm:p-5", highlighted && "ring-2 ring-primary/30")}
    >
      {editing ? (
        <div className="space-y-3">
          <div className="grid gap-1.5">
            <Label className="text-xs text-muted-foreground">Question</Label>
            <Textarea
              className="min-h-20 resize-none border-0 bg-secondary/50 leading-relaxed shadow-none focus-visible:ring-1"
              value={question.prompt}
              onChange={(e) => onUpdate({ prompt: e.target.value })}
            />
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs text-muted-foreground">Answer outline</Label>
            <Textarea
              className="min-h-24 resize-none border-0 bg-secondary/50 leading-relaxed shadow-none focus-visible:ring-1"
              value={question.answer_outline}
              onChange={(e) => onUpdate({ answer_outline: e.target.value })}
            />
          </div>
          <Button type="button" size="sm" variant="secondary" onClick={closeEdit}>
            Done
          </Button>
        </div>
      ) : (
        <>
          <div className="flex gap-3">
            <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-medium text-muted-foreground">
              {index + 1}
            </span>
            <p className="min-w-0 flex-1 font-sans text-base leading-relaxed text-foreground sm:text-[1.05rem]">
              {question.prompt || "Empty question"}
            </p>
          </div>

          {hasAnswer && (
            <div className="mt-4 pl-9">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setRevealed((prev) => !prev)}
              >
                {revealed ? "Hide answer" : "View answer"}
              </Button>
              {revealed && (
                <div className="mt-3 rounded-md border border-border bg-secondary/30 px-4 py-3">
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                    {question.answer_outline}
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="mt-4 flex justify-end gap-0.5 border-t border-border pt-3">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7 text-muted-foreground"
              onClick={() => setEditing(true)}
            >
              <Pencil className="size-3.5" />
              <span className="sr-only">Edit</span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7 text-muted-foreground"
              onClick={() => onMove(-1)}
            >
              <ChevronUp className="size-4" />
              <span className="sr-only">Move up</span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7 text-muted-foreground"
              onClick={() => onMove(1)}
            >
              <ChevronDown className="size-4" />
              <span className="sr-only">Move down</span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7 text-muted-foreground hover:text-destructive"
              onClick={onDelete}
            >
              <Trash2 className="size-4" />
              <span className="sr-only">Delete</span>
            </Button>
          </div>
        </>
      )}
    </li>
  );
}

function QuestionsPanel({
  kit,
  regenBusy,
  highlightId,
  onRegen,
  onChange,
}: {
  kit: KitPayload;
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
    <section className="mt-6 space-y-6">
      {CATEGORIES.map((category) => (
        <div key={category}>
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="font-display text-lg font-medium">{CATEGORY_LABELS[category]}</h2>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={regenBusy === category}
              onClick={() => onRegen(category)}
            >
              {regenBusy === category ? "Regenerating…" : "Regenerate"}
            </Button>
          </div>

          {grouped[category].length === 0 ? (
            <p className="text-sm text-muted-foreground">No questions yet.</p>
          ) : (
            <ul className="space-y-3">
              {grouped[category].map((q, i) => (
                <QuestionItem
                  key={q.id}
                  index={i}
                  question={q}
                  highlighted={highlightId === q.id}
                  onUpdate={(patch) => updateQuestion(q.id, patch)}
                  onMove={(dir) => move(q.id, dir)}
                  onDelete={() =>
                    onChange({ ...kit, questions: kit.questions.filter((x) => x.id !== q.id) })
                  }
                />
              ))}
            </ul>
          )}

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() =>
              onChange({
                ...kit,
                questions: [
                  ...kit.questions,
                  {
                    id: `q-user-${Date.now()}`,
                    requirement_ids: [],
                    category,
                    prompt: "",
                    answer_outline: "",
                    difficulty: 2,
                  },
                ],
              })
            }
          >
            Add question
          </Button>
        </div>
      ))}
    </section>
  );
}
