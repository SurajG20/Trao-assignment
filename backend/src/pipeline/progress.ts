export const PIPELINE_TOTAL = 10;

export type ProgressMeta = {
  pages_fetched?: number;
  question_category?: string;
  requirements_found?: number;
};

export type ProgressExtra = {
  index: number;
  total: number;
  percent?: number;
  meta?: ProgressMeta;
};

export type ProgressPayload = {
  step: string;
  message: string;
  index: number;
  total: number;
  percent: number;
  meta: ProgressMeta;
};

export type ProgressFn = (
  step: string,
  message: string,
  extra?: ProgressExtra,
) => Promise<void> | void;

export function pipelineProgress(
  step: string,
  message: string,
  index: number,
  meta: ProgressMeta = {},
): ProgressPayload {
  const total = PIPELINE_TOTAL;
  const percent =
    step === "done" ? 100 : Math.min(99, Math.max(0, Math.round((index / total) * 100)));
  return { step, message, index, total, percent, meta };
}
