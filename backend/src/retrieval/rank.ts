import type { PageLink } from "./fetchPage.js";

const HIRING_TOKENS = [
  "career",
  "careers",
  "job",
  "jobs",
  "hiring",
  "handbook",
  "interview",
  "recruit",
  "join",
  "people",
  "talent",
];

const ABOUT_TOKENS = [
  "about",
  "company",
  "mission",
  "values",
  "culture",
  "engineering",
  "team",
  "who-we-are",
  "story",
  "product",
  "platform",
  "what-we-do",
];

export function rankLink(url: string, anchorText = ""): number {
  const hay = `${url} ${anchorText}`.toLowerCase();
  let score = 0;
  for (const token of HIRING_TOKENS) {
    if (hasToken(hay, token)) score += 5;
  }
  for (const token of ABOUT_TOKENS) {
    if (hasToken(hay, token)) score += 3;
  }
  if (hasToken(hay, "blog")) score += 1;
  if (hasToken(hay, "privacy") || hasToken(hay, "cookie") || hasToken(hay, "login")) {
    score -= 4;
  }
  return score;
}

function hasToken(hay: string, token: string) {
  return new RegExp(`(^|[^a-z0-9])${token}([^a-z0-9]|$)`, "i").test(hay);
}

export function sameOrigin(candidate: string, base: string) {
  try {
    return new URL(candidate).origin === new URL(base).origin;
  } catch {
    return false;
  }
}

function looksLikeAboutPath(url: string) {
  return /\/(about|company|product|platform|mission|what-we-do)(\/|$)/i.test(url);
}

export function uniqueRanked(links: PageLink[], baseUrl: string, limit = 8) {
  const seen = new Set<string>();
  const scored = [];
  for (const link of links) {
    if (!sameOrigin(link.href, baseUrl)) continue;
    const normalized = stripHash(link.href);
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    const score = rankLink(normalized, link.anchor);
    if (score <= 0 && !looksLikeAboutPath(normalized)) continue;
    scored.push({ url: normalized, score: Math.max(score, looksLikeAboutPath(normalized) ? 2 : 0) });
  }
  return scored.sort((a, b) => b.score - a.score).slice(0, limit);
}

function stripHash(url: string) {
  const u = new URL(url);
  u.hash = "";
  return u.href;
}
