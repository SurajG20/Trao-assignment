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

function origins(name: string, fallback: string): string[] {
  const raw = process.env[name] ?? fallback;
  return raw
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 4000),
  mongodbUri: required("MONGODB_URI", "mongodb://127.0.0.1:27017/trao_kits"),
  sessionSecret: required("SESSION_SECRET", "dev-only-session-secret"),
  groqApiKey: process.env.GROQ_API_KEY ?? "",
  groqModel: process.env.GROQ_MODEL ?? "openai/gpt-oss-20b",
  allowPrivateUrls: bool("ALLOW_PRIVATE_URLS", true),
  corsOrigins: origins(
    "CORS_ORIGINS",
    "http://localhost:3000,https://trao-assignment-ruby.vercel.app",
  ),
};

// Render does not always set NODE_ENV=production; RENDER=true is always present there.
export const isProduction =
  env.nodeEnv === "production" || process.env.RENDER === "true";
