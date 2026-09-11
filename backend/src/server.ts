import { createApp } from "./app.js";
import { connectDb } from "./db.js";
import { env } from "./config/env.js";

async function main() {
  await connectDb();
  const app = createApp();
  app.listen(env.port, () => {
    console.log(`API listening on ${env.port}`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
