import pLimit from "p-limit";
import { assertFetchableUrl } from "./urlSafety.js";
import { fetchPage, failureFromFetch, type FetchedPage, type SourceFailure } from "./fetchPage.js";
import { isAllowedByRobots } from "./robots.js";
import { uniqueRanked } from "./rank.js";

const limit = pLimit(2);

export type ResearchBundle = {
  home: FetchedPage | null;
  pages: FetchedPage[];
  failures: SourceFailure[];
  discussion: { query: string; snippets: string[]; urls: string[] };
};

async function safeFetch(url: string, failures: SourceFailure[]) {
  try {
    await assertFetchableUrl(url);
    const allowed = await isAllowedByRobots(url);
    if (!allowed) {
      failures.push({
        url,
        code: "ROBOTS_DISALLOWED",
        message: "robots.txt disallows this path",
      });
      return null;
    }
    const page = await fetchPage(url);
    if (page.status >= 400) {
      failures.push({
        url,
        code: page.status === 404 ? "NOT_FOUND" : "HTTP_ERROR",
        message: `Company page returned ${page.status}`,
      });
      return null;
    }
    if (page.text.trim().length < 80 && !page.meta.description) {
      failures.push({
        url,
        code: "THIN_PAGE",
        message: "Page had almost no readable content after cleaning",
      });
    }
    return page;
  } catch (err) {
    const mapped = failureFromFetch(url, err);
    if (typeof err === "object" && err && "code" in err) {
      mapped.code = String((err as { code: string }).code);
      mapped.message =
        "message" in err ? String((err as { message: string }).message) : mapped.message;
    }
    failures.push(mapped);
    return null;
  }
}

export async function researchCompany(companyUrl: string): Promise<ResearchBundle> {
  const failures: SourceFailure[] = [];
  const pages: FetchedPage[] = [];
  const home = await safeFetch(companyUrl, failures);

  const seedLinks = home?.links ?? [];
  const ranked = uniqueRanked(seedLinks, companyUrl, 8);
  const fetched = await Promise.all(
    ranked.map((item) =>
      limit(async () => {
        await new Promise((r) => setTimeout(r, 150));
        return safeFetch(item.url, failures);
      }),
    ),
  );
  for (const page of fetched) {
    if (page) pages.push(page);
  }

  const companyName = (() => {
    try {
      return new URL(companyUrl).hostname.replace(/^www\./, "");
    } catch {
      return companyUrl;
    }
  })();

  const discussion = await searchPublicDiscussion(companyName, failures);

  return { home, pages, failures, discussion };
}

export async function searchPublicDiscussion(
  companyName: string,
  failures: SourceFailure[],
) {
  const query = `${companyName} interview process`;
  const empty = { query, snippets: [] as string[], urls: [] as string[] };
  if (
    companyName.includes("localhost") ||
    companyName.startsWith("127.") ||
    companyName === "0.0.0.0" ||
    companyName.startsWith("[::1]")
  ) {
    return empty;
  }
  const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  try {
    const page = await fetchPage(searchUrl);
    const urls = page.links
      .map((link) => link.href)
      .filter((href) => href.startsWith("http") && !href.includes("duckduckgo.com"))
      .slice(0, 5);
    const snippets = page.text ? [page.text.slice(0, 2000)] : [];
    if (urls.length === 0 && snippets[0] && snippets[0].length < 80) {
      failures.push({
        url: searchUrl,
        code: "NO_DISCUSSION",
        message: "No public interview discussion found",
      });
      return empty;
    }
    return { query, snippets, urls };
  } catch (err) {
    failures.push(failureFromFetch(searchUrl, err));
    return empty;
  }
}
