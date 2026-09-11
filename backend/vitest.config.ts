import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 120_000,
    setupFiles: ["tests/setup-env.ts"],
    include: ["tests/**/*.test.ts", "src/**/*.test.ts"],
  },
});
