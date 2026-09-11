import robotsParser from "robots-parser";
import { fetchPage, failureFromFetch } from "./fetchPage.js";

const cache = new Map<string, ReturnType<typeof robotsParser> | null>();

export async function loadRobots(origin: string) {
  if (cache.has(origin)) return cache.get(origin) ?? null;
  try {
    const page = await fetchPage(new URL("/robots.txt", origin).href);
    if (page.status >= 400) {
      cache.set(origin, null);
      return null;
    }
    const robots = robotsParser(page.finalUrl, page.html);
    cache.set(origin, robots);
    return robots;
  } catch (err) {
    failureFromFetch(origin, err);
    cache.set(origin, null);
    return null;
  }
}

export async function isAllowedByRobots(url: string) {
  const origin = new URL(url).origin;
  const robots = await loadRobots(origin);
  if (!robots) return true;
  return robots.isAllowed(url, "TraoPrepBot") !== false;
}

export function clearRobotsCache() {
  cache.clear();
}
