import { createServer } from "node:http";
import { afterAll, describe, expect, it } from "vitest";
import { rankLink, uniqueRanked } from "../src/retrieval/rank.js";
import { cleanHtml } from "../src/retrieval/fetchPage.js";
import { researchCompany } from "../src/retrieval/research.js";
import { clearRobotsCache } from "../src/retrieval/robots.js";

describe("link ranking", () => {
  it("prefers hiring and handbook paths over login", () => {
    expect(rankLink("https://ex.com/handbook/hiring")).toBeGreaterThan(
      rankLink("https://ex.com/login"),
    );
    expect(rankLink("https://ex.com/about-us")).toBeGreaterThan(0);
  });

  it("ranks same-origin links using anchor text after cleaning", () => {
    const { links } = cleanHtml(
      `<html><body>
        <a href="/careers">Jobs</a>
        <a href="https://other.com/jobs">ext</a>
        <a href="/privacy">Privacy</a>
      </body></html>`,
      "http://127.0.0.1:9/",
    );
    const ranked = uniqueRanked(links, "http://127.0.0.1:9/", 5);
    expect(ranked[0]?.url).toContain("/careers");
  });
});

describe("html cleaning", () => {
  it("keeps main copy and drops nav careers noise", () => {
    const { text, meta } = cleanHtml(
      `<html>
        <head>
          <meta name="description" content="Analytics for product teams." />
          <script type="application/ld+json">{"@type":"Organization","name":"Acme","description":"We make analytics for product teams"}</script>
        </head>
        <body>
          <nav><a href="/careers">Careers</a><a href="/login">Login</a></nav>
          <main><p>We make analytics for product teams.</p></main>
          <footer>Copyright</footer>
        </body>
      </html>`,
      "https://acme.test/",
    );
    expect(text).toContain("We make analytics for product teams");
    expect(text.toLowerCase()).not.toContain("login");
    expect(meta.description).toContain("Analytics for product teams");
  });
});

describe("local crawl", () => {
  const pages: Record<string, string> = {
    "/acme/": `<html><body><h1>Acme</h1><p>We make widgets.</p>
      <a href="/acme/weird-hiring-path">How we hire</a>
      <a href="/acme/about">About</a></body></html>`,
    "/acme/weird-hiring-path": `<html><body>Take-home then system design.</body></html>`,
    "/acme/about": `<html><body>About Acme the widget company.</body></html>`,
    "/robots.txt": "User-agent: *\nAllow: /\n",
  };

  const server = createServer((req, res) => {
    const html = pages[req.url ?? ""];
    if (!html) {
      res.statusCode = 404;
      res.end("missing");
      return;
    }
    res.setHeader("content-type", "text/html");
    res.end(html);
  });

  let base = "";

  const listen = new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address();
      if (addr && typeof addr === "object") {
        base = `http://127.0.0.1:${addr.port}`;
      }
      resolve();
    });
  });

  afterAll(() => {
    server.close();
    clearRobotsCache();
  });

  it("crawls relative hiring links instead of guessing /careers", async () => {
    await listen;
    const bundle = await researchCompany(`${base}/acme/`);
    const used = [bundle.home, ...bundle.pages].map((p) => p?.finalUrl ?? "");
    expect(used.some((u) => u.includes("weird-hiring-path"))).toBe(true);
    expect(bundle.home?.text).toContain("widgets");
  });
});
