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
];

export function rankLink(url: string, anchorText = ""): number {
  const hay = `${url} ${anchorText}`.toLowerCase();
  let score = 0;
  for (const token of HIRING_TOKENS) {
    if (hay.includes(token)) score += 5;
  }
  for (const token of ABOUT_TOKENS) {
    if (hay.includes(token)) score += 3;
  }
  if (hay.includes("blog")) score += 1;
  if (hay.includes("privacy") || hay.includes("cookie") || hay.includes("login")) {
    score -= 4;
  }
  return score;
}

export function sameOrigin(candidate: string, base: string) {
  try {
    return new URL(candidate).origin === new URL(base).origin;
  } catch {
    return false;
  }
}

export function uniqueRanked(links: string[], baseUrl: string, limit = 8) {
  const seen = new Set<string>();
  const scored = [];
  for (const link of links) {
    if (!sameOrigin(link, baseUrl)) continue;
    const normalized = stripHash(link);
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    const score = rankLink(normalized);
    if (score <= 0) continue;
    scored.push({ url: normalized, score });
  }
  return scored.sort((a, b) => b.score - a.score).slice(0, limit);
}

function stripHash(url: string) {
  const u = new URL(url);
  u.hash = "";
  return u.href;
}
