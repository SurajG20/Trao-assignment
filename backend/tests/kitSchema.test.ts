import { describe, expect, it } from "vitest";
import { kitSchema, validateKit } from "../src/schemas/kit.js";
import { thinKitFromInput } from "../src/pipeline/thinKit.js";

describe("kit structure", () => {
  it("accepts a valid Appendix A kit and extra fields", () => {
    const kit = thinKitFromInput({
      jd: "Engineer",
      company_url: "https://example.com",
      days: 2,
    });
    expect(kitSchema.parse({ ...kit, extra: true }).extra).toBe(true);
    expect(validateKit(kit).schedule.days).toHaveLength(2);
  });

  it("rejects missing required fields and unknown schedule question ids", () => {
    expect(() => kitSchema.parse({})).toThrow();
    const kit = thinKitFromInput({
      jd: "Engineer",
      company_url: "https://example.com",
      days: 1,
    });
    kit.schedule.days[0].question_ids = ["missing"];
    expect(() => validateKit(kit)).toThrow(/unknown question/);
  });
});
