import mongoose from "mongoose";
import { env } from "./config/env.js";

export async function connectDb(uri = env.mongodbUri) {
  if (mongoose.connection.readyState === 1) return;
  await mongoose.connect(uri);
}

export async function disconnectDb() {
  if (mongoose.connection.readyState === 0) return;
  await mongoose.disconnect();
}
