export type KitStatus = "queued" | "running" | "ready" | "failed";
export type ItemOrigin = "generated" | "edited" | "pinned";
export type QuestionCategory =
  | "technical"
  | "behavioural"
  | "system-design"
  | "company-fit";

export type Requirement = {
  id: string;
  text: string;
  kind: "technical" | "behavioural" | "domain";
  priority: "must" | "nice";
};

export type Question = {
  id: string;
  requirement_ids: string[];
  category: QuestionCategory;
  prompt: string;
  answer_outline: string;
  difficulty: number;
};

export type Flashcard = {
  id: string;
  front: string;
  back: string;
  requirement_ids: string[];
};

export type KitPayload = {
  source: {
    company: string;
    company_url: string;
    role: string;
    location: string;
    jd_chars: number;
    researched_at: string;
    pages_used: string[];
  };
  company_brief: { summary: string; what_they_do: string; sources: string[] };
  role: {
    title: string;
    seniority: string;
    responsibilities: string[];
    requirements: Requirement[];
  };
  questions: Question[];
  flashcards: Flashcard[];
  schedule: {
    days_available: number;
    days: { day: number; focus: string; question_ids: string[]; minutes: number }[];
  };
  coverage: { uncovered_requirement_ids: string[]; passes: number };
};

export type KitProgress = {
  step?: string;
  message?: string;
  index?: number;
  total?: number;
  percent?: number;
  meta?: {
    pages_fetched?: number;
    question_category?: string;
    requirements_found?: number;
  };
};

export type KitRecord = {
  id: string;
  status: KitStatus;
  progress: KitProgress;
  input: { jd: string; company_url: string; days: number };
  kit: KitPayload | null;
  itemState: Record<string, ItemOrigin>;
  provenance?: unknown;
  error: { code: string; message: string } | null;
  practice: { flashcardId?: string; confidence?: number; seenAt?: string }[];
  createdAt?: string;
  updatedAt?: string;
};
