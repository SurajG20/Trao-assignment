import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 120_000,
    setupFiles: ["tests/setup-env.ts"],
    include: ["tests/**/*.test.ts"],
    env: {
      NODE_ENV: "test",
      GROQ_API_KEY: "",
    },
  },
});
