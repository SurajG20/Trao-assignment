import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import { authRouter } from "./routes/auth.js";
import { kitsRouter } from "./routes/kits.js";
import { errorHandler, notFound } from "./middleware/error.js";

export function createApp() {
  const app = express();
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json({ limit: "2mb" }));
  app.use(cookieParser());

  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });
  app.use("/api/auth", authRouter);
  app.use("/api/kits", kitsRouter);
  app.use(notFound);
  app.use(errorHandler);

  return app;
}
