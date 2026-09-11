import { z } from "zod";
import bcrypt from "bcryptjs";
import { Router } from "express";
import { User } from "../models/user.js";
import { appError } from "../errors.js";
import {
  requireAuth,
  setSessionCookie,
  clearSessionCookie,
  signSession,
} from "../middleware/auth.js";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(200),
});

export const authRouter = Router();

authRouter.post("/register", async (req, res, next) => {
  try {
    const body = credentialsSchema.parse(req.body);
    const passwordHash = await bcrypt.hash(body.password, 10);
    const user = await User.create({
      email: body.email,
      passwordHash,
    });
    setSessionCookie(res, signSession(user._id.toString()));
    res.status(201).json({ user: { id: user._id, email: user.email } });
  } catch (err) {
    if (err instanceof z.ZodError) {
      next(appError(400, "INVALID_INPUT", err.issues[0]?.message ?? "Invalid input"));
      return;
    }
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code?: number }).code === 11000
    ) {
      next(appError(409, "EMAIL_TAKEN", "An account with that email already exists"));
      return;
    }
    next(err);
  }
});

authRouter.post("/login", async (req, res, next) => {
  try {
    const body = credentialsSchema.parse(req.body);
    const user = await User.findOne({ email: body.email.toLowerCase() });
    if (!user || !(await bcrypt.compare(body.password, user.passwordHash))) {
      next(appError(401, "INVALID_CREDENTIALS", "Email or password is incorrect"));
      return;
    }
    setSessionCookie(res, signSession(user._id.toString()));
    res.json({ user: { id: user._id, email: user.email } });
  } catch (err) {
    if (err instanceof z.ZodError) {
      next(appError(400, "INVALID_INPUT", err.issues[0]?.message ?? "Invalid input"));
      return;
    }
    next(err);
  }
});

authRouter.post("/logout", (req, res) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});

authRouter.get("/me", requireAuth, async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      next(appError(401, "UNAUTHENTICATED", "Session is no longer valid"));
      return;
    }
    res.json({ user: { id: user._id, email: user.email } });
  } catch (err) {
    next(err);
  }
});
