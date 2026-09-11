import type { KitProgress, KitRecord, KitStatus } from "@/lib/types";

export const GENERATION_STEPS = [
  { id: "extract", label: "Extract JD" },
  { id: "retrieve", label: "Crawl company" },
  { id: "brief", label: "Write brief" },
  { id: "questions:technical", label: "Technical questions" },
  { id: "questions:behavioural", label: "Behavioural questions" },
  { id: "questions:system-design", label: "System design questions" },
  { id: "questions:company-fit", label: "Company-fit questions" },
  { id: "coverage", label: "Coverage pass" },
  { id: "flashcards", label: "Flashcards" },
  { id: "schedule", label: "Study schedule" },
] as const;

export function kitRoleTitle(kit: KitRecord) {
  return kit.kit?.role.title || kit.input.jd.split("\n")[0]?.trim() || "Untitled role";
}

export function companyHost(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function relativeTime(iso?: string) {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(diff)) return "—";
  const mins = Math.floor(Math.max(0, diff) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function formatElapsed(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function progressPercent(progress: KitProgress | undefined, status?: KitStatus) {
  if (status === "ready") return 100;
  const value = progress?.percent;
  if (typeof value === "number") return Math.min(99, Math.max(0, value));
  const index = progress?.index ?? 0;
  const total = progress?.total ?? GENERATION_STEPS.length;
  if (!total) return 0;
  return Math.min(99, Math.round((index / total) * 100));
}

export function currentStepIndex(progress: KitProgress | undefined, status?: KitStatus) {
  if (status === "ready" || progress?.step === "done") return GENERATION_STEPS.length + 1;
  if (typeof progress?.index === "number" && progress.index > 0) return progress.index;
  const step = progress?.step;
  if (!step || step === "queued" || step === "start" || step === "failed") return 0;
  if (step === "questions") {
    const category = progress?.meta?.question_category;
    const id = category ? `questions:${category}` : "questions:technical";
    return GENERATION_STEPS.findIndex((row) => row.id === id) + 1;
  }
  if (step === "llm") return 2;
  return GENERATION_STEPS.findIndex((row) => row.id === step) + 1;
}

export function parameterLine(progress: KitProgress | undefined) {
  const step = progress?.step;
  const meta = progress?.meta;
  if (step === "retrieve" && meta?.pages_fetched != null) {
    return `Fetching company site · ${meta.pages_fetched} page${meta.pages_fetched === 1 ? "" : "s"}`;
  }
  if (step === "questions" && meta?.question_category) {
    return `Generating ${meta.question_category.replace("-", " ")} questions`;
  }
  if (step === "extract" && meta?.requirements_found != null) {
    return `Extracting JD · ${meta.requirements_found} requirement${meta.requirements_found === 1 ? "" : "s"}`;
  }
  return progress?.message || "Working";
}

export function statusBadgeVariant(status: KitStatus) {
  if (status === "failed") return "destructive" as const;
  if (status === "ready") return "secondary" as const;
  if (status === "running") return "default" as const;
  return "outline" as const;
}
