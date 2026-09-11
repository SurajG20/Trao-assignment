import { afterEach, describe, expect, it, vi } from "vitest";
import { completeJson } from "../src/llm/groq.js";

describe("Groq JSON client", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("retries after 429 then parses JSON", async () => {
    process.env.GROQ_API_KEY = "test-key";
    let calls = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        calls += 1;
        if (calls === 1) {
          return new Response("slow down", {
            status: 429,
            headers: { "retry-after": "0" },
          });
        }
        return Response.json({
          choices: [{ message: { content: '{"ok":true}' } }],
        });
      }),
    );

    const result = await completeJson("sys", "user", (v) => v as { ok: boolean });
    expect(result.ok).toBe(true);
    expect(calls).toBe(2);
  });
});
