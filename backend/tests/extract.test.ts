import { describe, expect, it } from "vitest";
import { heuristicExtract } from "../src/pipeline/extract.js";

describe("requirement extraction", () => {
  it("marks required vs bonus lines and does not invent tools", () => {
    const jd = `Senior Backend Engineer

Requirements:
- 5+ years with Node.js
- Mentoring junior engineers

Nice to have:
- Experience with Kafka
`;
    const extracted = heuristicExtract(jd);
    expect(extracted.title).toContain("Senior Backend Engineer");
    expect(extracted.seniority).toBe("senior");
    const texts = extracted.requirements.map((r) => r.text);
    expect(texts.some((t) => t.includes("Node.js"))).toBe(true);
    expect(texts.some((t) => t.includes("Mentoring"))).toBe(true);
    expect(texts.some((t) => t.includes("Kafka"))).toBe(true);
    expect(texts.join(" ")).not.toMatch(/Python|Go |Rust/i);
    const node = extracted.requirements.find((r) => r.text.includes("Node.js"));
    const kafka = extracted.requirements.find((r) => r.text.includes("Kafka"));
    expect(node?.priority).toBe("must");
    expect(kafka?.priority).toBe("nice");
    expect(extracted.requirements.find((r) => r.text.includes("Mentoring"))?.kind).toBe(
      "behavioural",
    );
  });
});
