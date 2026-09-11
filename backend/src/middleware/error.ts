import type { ErrorRequestHandler, Request, Response, NextFunction } from "express";
import { isAppError } from "./errors.js";

export function notFound(_req: Request, res: Response) {
  res.status(404).json({
    error: { code: "NOT_FOUND", message: "Route not found" },
  });
}

export const errorHandler: ErrorRequestHandler = (
  err,
  _req,
  res,
  _next: NextFunction,
) => {
  if (isAppError(err)) {
    res.status(err.status).json({
      error: { code: err.code, message: err.message },
    });
    return;
  }
  console.error(err);
  res.status(500).json({
    error: { code: "INTERNAL", message: "Unexpected server error" },
  });
};
