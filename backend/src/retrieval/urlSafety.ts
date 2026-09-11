import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { appError } from "../errors.js";
import { env, isProduction } from "../config/env.js";

const BLOCKED_HOSTS = new Set(["localhost", "metadata.google.internal"]);

function isPrivateIp(ip: string): boolean {
  if (ip === "::1" || ip.startsWith("fe80:") || ip.startsWith("fc") || ip.startsWith("fd")) {
    return true;
  }
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) return false;
  const [a, b] = parts;
  return (
    a === 10 ||
    a === 127 ||
    a === 0 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168)
  );
}

export async function assertFetchableUrl(raw: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw appError(400, "INVALID_URL", "Company URL is not valid");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw appError(400, "INVALID_URL", "Only http and https URLs can be fetched");
  }
  const allowPrivate = env.allowPrivateUrls || !isProduction;
  const hostname = url.hostname.toLowerCase();
  if (!allowPrivate && BLOCKED_HOSTS.has(hostname)) {
    throw appError(400, "PRIVATE_URL", "Private or loopback addresses are not allowed");
  }
  const ip = isIP(hostname) ? hostname : (await lookup(hostname)).address;
  if (isPrivateIp(ip) && !allowPrivate) {
    throw appError(400, "PRIVATE_URL", "Private or loopback addresses are not allowed");
  }
  return url;
}
