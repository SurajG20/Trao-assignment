import mongoose from "mongoose";
import type { Kit } from "../schemas/kit.js";

export type KitStatus = "queued" | "running" | "ready" | "failed";
export type ItemOrigin = "generated" | "edited" | "pinned";

const kitRecordSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    inputHash: { type: String, required: true },
    status: {
      type: String,
      enum: ["queued", "running", "ready", "failed"],
      default: "queued",
    },
    progress: {
      step: { type: String, default: "queued" },
      message: { type: String, default: "Waiting to start" },
      index: { type: Number, default: 0 },
      total: { type: Number, default: 10 },
      percent: { type: Number, default: 0 },
      meta: { type: mongoose.Schema.Types.Mixed, default: {} },
    },
    input: {
      jd: { type: String, required: true },
      company_url: { type: String, required: true },
      days: { type: Number, required: true },
    },
    kit: { type: mongoose.Schema.Types.Mixed, default: null },
    itemState: { type: mongoose.Schema.Types.Mixed, default: {} },
    provenance: { type: mongoose.Schema.Types.Mixed, default: {} },
    error: {
      code: String,
      message: String,
    },
    practice: [
      {
        flashcardId: String,
        confidence: Number,
        seenAt: Date,
      },
    ],
  },
  { timestamps: true },
);

kitRecordSchema.index({ userId: 1, inputHash: 1 }, { unique: true });

export type KitRecordDoc = mongoose.InferSchemaType<typeof kitRecordSchema> & {
  _id: mongoose.Types.ObjectId;
  kit: Kit | null;
  itemState: Record<string, ItemOrigin>;
};

export const KitRecord = mongoose.model("Kit", kitRecordSchema);
