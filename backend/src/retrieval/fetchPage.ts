import * as cheerio from "cheerio";

export const MAX_BYTES = 1_500_000;
const FETCH_TIMEOUT_MS = 12_000;

export type FetchedPage = {
  url: string;
  finalUrl: string;
  status: number;
  contentType: string;
  html: string;
  text: string;
  links: string[];
};

export type SourceFailure = {
  url: string;
  code: string;
  message: string;
};

function allowedType(contentType: string) {
  const type = contentType.split(";")[0]?.trim().toLowerCase() ?? "";
  return (
    type === "" ||
    type.startsWith("text/") ||
    type.includes("html") ||
    type.includes("xml") ||
    type === "application/json"
  );
}

export function cleanHtml(html: string, baseUrl: string) {
  const $ = cheerio.load(html);
  $("script, style, noscript, svg, iframe").remove();
  const text = $("body").text().replace(/\s+/g, " ").trim();
  const links: string[] = [];
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    if (!href) return;
    try {
      links.push(new URL(href, baseUrl).href);
    } catch {
      // skip malformed
    }
  });
  return { text, links };
}

export async function fetchPage(url: string): Promise<FetchedPage> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent": "TraoPrepBot/1.0 (+https://github.com/SurajG20/Trao-assignment)",
        Accept: "text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.1",
      },
    });
    const contentType = res.headers.get("content-type") ?? "";
    if (!allowedType(contentType)) {
      throw Object.assign(new Error("Unexpected content type"), {
        code: "UNSUPPORTED_CONTENT",
      });
    }
    const length = Number(res.headers.get("content-length") ?? 0);
    if (length > MAX_BYTES) {
      throw Object.assign(new Error("Response too large"), { code: "TOO_LARGE" });
    }
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.byteLength > MAX_BYTES) {
      throw Object.assign(new Error("Response too large"), { code: "TOO_LARGE" });
    }
    const html = buf.toString("utf8");
    const finalUrl = res.url || url;
    const { text, links } = cleanHtml(html, finalUrl);
    return {
      url,
      finalUrl,
      status: res.status,
      contentType,
      html,
      text,
      links,
    };
  } finally {
    clearTimeout(timer);
  }
}

export function failureFromFetch(url: string, err: unknown): SourceFailure {
  if (err instanceof Error && err.name === "AbortError") {
    return { url, code: "TIMEOUT", message: "Timed out fetching page" };
  }
  const code =
    typeof err === "object" && err && "code" in err
      ? String((err as { code: string }).code)
      : "FETCH_FAILED";
  const message = err instanceof Error ? err.message : "Failed to fetch page";
  return { url, code, message };
}
