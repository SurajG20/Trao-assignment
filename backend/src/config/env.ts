import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const here = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(here, "../../../.env") });
dotenv.config({ path: path.resolve(here, "../../.env") });

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined || value === "") {
    throw new Error(`Missing environment variable ${name}`);
  }
  return value;
}

function bool(name: string, fallback: boolean): boolean {
  const raw = process.env[name];
  if (raw === undefined) return fallback;
  return raw === "true" || raw === "1";
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 4000),
  mongodbUri: required("MONGODB_URI", "mongodb://127.0.0.1:27017/trao_kits"),
  sessionSecret: required("SESSION_SECRET", "dev-only-session-secret"),
  openRouterApiKey: process.env.OPENROUTER_API_KEY ?? "",
  openRouterModel:
    process.env.OPENROUTER_MODEL ?? "meta-llama/llama-3.3-70b-instruct:free",
  openRouterReferer:
    process.env.OPENROUTER_HTTP_REFERER ?? "http://localhost:4000",
  allowPrivateUrls: bool("ALLOW_PRIVATE_URLS", true),
};

export const isProduction = env.nodeEnv === "production";
