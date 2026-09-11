function argValue(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  if (index === -1) return undefined;
  return process.argv[index + 1];
}

async function main() {
  const input = argValue("--input");
  const output = argValue("--output");
  if (!input || !output) {
    console.error("Usage: npm run evaluate -- --input <cases.json> --output <kits.json>");
    process.exit(1);
  }
  console.error("Evaluate pipeline is not wired yet.");
  process.exit(1);
}

main();
