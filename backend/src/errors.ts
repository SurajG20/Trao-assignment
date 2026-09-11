export type AppError = {
  status: number;
  code: string;
  message: string;
};

export function appError(
  status: number,
  code: string,
  message: string,
): AppError {
  return { status, code, message };
}

export function isAppError(value: unknown): value is AppError {
  return (
    typeof value === "object" &&
    value !== null &&
    "status" in value &&
    "code" in value &&
    "message" in value
  );
}
