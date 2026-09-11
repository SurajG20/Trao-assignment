import crypto from "node:crypto";
import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env, isProduction } from "../config/env.js";
import { User } from "../models/user.js";
import { appError } from "../errors.js";

export const SESSION_COOKIE = "session";

export type AuthPayload = { sub: string };

export function signSession(userId: string) {
  return jwt.sign({ sub: userId } satisfies AuthPayload, env.sessionSecret, {
    expiresIn: "7d",
  });
}

function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: isProduction ? ("none" as const) : ("lax" as const),
    secure: isProduction,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/",
  };
}

export function setSessionCookie(res: Response, token: string) {
  res.cookie(SESSION_COOKIE, token, sessionCookieOptions());
}

export function clearSessionCookie(res: Response) {
  res.clearCookie(SESSION_COOKIE, sessionCookieOptions());
}

export async function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  const token = req.cookies?.[SESSION_COOKIE];
  if (!token) {
    next(appError(401, "UNAUTHENTICATED", "Sign in required"));
    return;
  }
  try {
    const payload = jwt.verify(token, env.sessionSecret) as AuthPayload;
    const user = await User.findById(payload.sub);
    if (!user) {
      next(appError(401, "UNAUTHENTICATED", "Session is no longer valid"));
      return;
    }
    req.userId = user._id.toString();
    next();
  } catch {
    next(appError(401, "UNAUTHENTICATED", "Session expired or invalid"));
  }
}

export function inputHash(jd: string, companyUrl: string, days: number) {
  return crypto
    .createHash("sha256")
    .update(`${jd.trim()}\n${companyUrl.trim()}\n${days}`)
    .digest("hex");
}
