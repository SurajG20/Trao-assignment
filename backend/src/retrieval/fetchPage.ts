import * as cheerio from "cheerio";

export const MAX_BYTES = 1_500_000;
const FETCH_TIMEOUT_MS = 12_000;

export type PageLink = { href: string; anchor: string };

export type PageMeta = {
  title: string;
  description: string;
  jsonLd: string;
};

export type FetchedPage = {
  url: string;
  finalUrl: string;
  status: number;
  contentType: string;
  html: string;
  text: string;
  links: PageLink[];
  meta: PageMeta;
};

export type SourceFailure = {
  url: string;
  code: string;
  message: string;
};

const BROWSER_UA =
  "Mozilla/5.0 (compatible; TraoPrep/1.0; +https://github.com/SurajG20/Trao-assignment) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";

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

function jsonLdDescription(raw: string): string {
  try {
    const parsed = JSON.parse(raw) as unknown;
    const nodes = Array.isArray(parsed)
      ? parsed
      : parsed && typeof parsed === "object" && "@graph" in parsed
        ? (parsed as { "@graph": unknown[] })["@graph"]
        : [parsed];
    const bits: string[] = [];
    for (const node of nodes) {
      if (!node || typeof node !== "object") continue;
      const rec = node as Record<string, unknown>;
      const type = String(rec["@type"] ?? "");
      if (!/Organization|WebSite|Corporation/i.test(type)) continue;
      if (typeof rec.name === "string") bits.push(rec.name);
      if (typeof rec.description === "string") bits.push(rec.description);
    }
    return bits.join(". ");
  } catch {
    return "";
  }
}

export function cleanHtml(html: string, baseUrl: string) {
  const $ = cheerio.load(html);
  $("script:not([type='application/ld+json']), style, noscript, svg, iframe").remove();
  $("nav, header, footer, aside, form, [role='navigation'], [role='banner'], [role='contentinfo']").remove();

  const jsonLdChunks: string[] = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    const raw = $(el).text();
    const extracted = jsonLdDescription(raw);
    if (extracted) jsonLdChunks.push(extracted);
  });

  const title =
    $('meta[property="og:title"]').attr("content")?.trim() ||
    $("title").first().text().trim() ||
    "";
  const description =
    $('meta[name="description"]').attr("content")?.trim() ||
    $('meta[property="og:description"]').attr("content")?.trim() ||
    jsonLdChunks[0] ||
    "";

  const main = $("main, article, [role='main']").first();
  const source = main.length ? main : $("body");
  const text = source.text().replace(/\s+/g, " ").trim();

  const links: PageLink[] = [];
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    if (!href) return;
    try {
      links.push({
        href: new URL(href, baseUrl).href,
        anchor: $(el).text().replace(/\s+/g, " ").trim(),
      });
    } catch {
      // skip malformed
    }
  });

  return {
    text,
    links,
    meta: {
      title,
      description,
      jsonLd: jsonLdChunks.join(" "),
    },
  };
}

export function pageCorpus(page: Pick<FetchedPage, "text" | "meta">, max = 4000) {
  const parts = [page.meta.title, page.meta.description, page.meta.jsonLd, page.text]
    .filter(Boolean)
    .join("\n");
  return parts.slice(0, max);
}

export async function fetchPage(url: string): Promise<FetchedPage> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent": BROWSER_UA,
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
    const { text, links, meta } = cleanHtml(html, finalUrl);
    return {
      url,
      finalUrl,
      status: res.status,
      contentType,
      html,
      text,
      links,
      meta,
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
