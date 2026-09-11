import { readFile, writeFile } from "node:fs/promises";
import { runPipeline } from "./pipeline/run.js";

type Case = {
  id: string;
  jd: string;
  company_url: string;
  days: number;
};

function argValue(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  if (index === -1) return undefined;
  return process.argv[index + 1];
}

async function main() {
  const input = argValue("--input");
  const output = argValue("--output");
  if (!input || !output) {
    console.error(
      "Usage: npm run evaluate -- --input <cases.json> --output <kits.json>",
    );
    process.exit(1);
  }

  const cases = JSON.parse(await readFile(input, "utf8")) as Case[];
  const kits: {
    id: string;
    status: "ok" | "failed";
    kit: unknown;
    error: { code: string; message: string } | null;
  }[] = [];

  for (const item of cases) {
    try {
      const { kit } = await runPipeline({
        jd: item.jd,
        company_url: item.company_url,
        days: item.days,
      });
      kits.push({ id: item.id, status: "ok", kit, error: null });
    } catch (err) {
      const code =
        typeof err === "object" && err && "code" in err
          ? String((err as { code: string }).code)
          : "GENERATION_FAILED";
      kits.push({
        id: item.id,
        status: "failed",
        kit: null,
        error: {
          code,
          message: err instanceof Error ? err.message : "Could not produce a kit",
        },
      });
    }
  }

  await writeFile(
    output,
    JSON.stringify(
      {
        version: "1.0",
        generated_at: new Date().toISOString(),
        kits,
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
