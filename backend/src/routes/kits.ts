import { z } from "zod";
import { Router } from "express";
import mongoose from "mongoose";
import { KitRecord } from "../models/kit.js";
import { appError } from "../errors.js";
import { inputHash, requireAuth } from "../middleware/auth.js";
import { runPipeline } from "../pipeline/run.js";
import { kitSchema } from "../schemas/kit.js";

const createSchema = z.object({
  jd: z.string().min(1).max(80_000),
  company_url: z.string().url(),
  days: z.number().int().min(1).max(60),
});

const practiceSchema = z.object({
  flashcardId: z.string().min(1),
  confidence: z.number().int().min(1).max(5),
});

const generating = new Set<string>();

function publicKit(doc: InstanceType<typeof KitRecord>) {
  return {
    id: doc._id,
    status: doc.status,
    progress: doc.progress,
    input: doc.input,
    kit: doc.kit,
    itemState: doc.itemState,
    provenance: doc.provenance,
    error: doc.error?.code ? doc.error : null,
    practice: doc.practice,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

async function generateKit(id: string) {
  if (generating.has(id)) return;
  generating.add(id);
  try {
    const record = await KitRecord.findById(id);
    if (!record) return;
    record.status = "running";
    record.progress = { step: "start", message: "Generation started" };
    record.error = undefined;
    await record.save();

    const { kit, provenance } = await runPipeline(record.input, async (step, message) => {
      await KitRecord.findByIdAndUpdate(id, { progress: { step, message } });
    });

    const itemState: Record<string, "generated"> = {};
    for (const q of kit.questions) itemState[q.id] = "generated";
    for (const f of kit.flashcards) itemState[f.id] = "generated";

    await KitRecord.findByIdAndUpdate(id, {
      status: "ready",
      kit,
      itemState,
      provenance,
      progress: { step: "done", message: "Kit ready" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Generation failed";
    await KitRecord.findByIdAndUpdate(id, {
      status: "failed",
      error: { code: "GENERATION_FAILED", message },
      progress: { step: "failed", message },
    });
  } finally {
    generating.delete(id);
  }
}

export const kitsRouter = Router();
kitsRouter.use(requireAuth);

kitsRouter.post("/", async (req, res, next) => {
  try {
    const body = createSchema.parse(req.body);
    const hash = inputHash(body.jd, body.company_url, body.days);
    const existing = await KitRecord.findOne({
      userId: req.userId,
      inputHash: hash,
    });
    if (existing) {
      if (existing.status === "failed") {
        existing.status = "queued";
        existing.progress = { step: "queued", message: "Retrying" };
        await existing.save();
        void generateKit(existing._id.toString());
      }
      res.status(202).json({ kit: publicKit(existing) });
      return;
    }
    const created = await KitRecord.create({
      userId: req.userId,
      inputHash: hash,
      status: "queued",
      input: body,
    });
    void generateKit(created._id.toString());
    res.status(202).json({ kit: publicKit(created) });
  } catch (err) {
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code?: number }).code === 11000
    ) {
      const hash = inputHash(
        String(req.body?.jd ?? ""),
        String(req.body?.company_url ?? ""),
        Number(req.body?.days),
      );
      const existing = await KitRecord.findOne({
        userId: req.userId,
        inputHash: hash,
      });
      if (existing) {
        res.status(202).json({ kit: publicKit(existing) });
        return;
      }
    }
    if (err instanceof z.ZodError) {
      next(appError(400, "INVALID_INPUT", err.issues[0]?.message ?? "Invalid input"));
      return;
    }
    next(err);
  }
});

kitsRouter.get("/", async (req, res, next) => {
  try {
    const kits = await KitRecord.find({ userId: req.userId }).sort({
      createdAt: -1,
    });
    res.json({ kits: kits.map(publicKit) });
  } catch (err) {
    next(err);
  }
});

kitsRouter.get("/:id/events", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      next(appError(400, "INVALID_INPUT", "Invalid kit id"));
      return;
    }
    const kit = await KitRecord.findOne({
      _id: req.params.id,
      userId: req.userId,
    });
    if (!kit) {
      next(appError(404, "NOT_FOUND", "Kit not found"));
      return;
    }
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    const send = async () => {
      const latest = await KitRecord.findById(kit._id);
      if (!latest) return false;
      res.write(`data: ${JSON.stringify(publicKit(latest))}\n\n`);
      return latest.status === "ready" || latest.status === "failed";
    };
    if (await send()) {
      res.end();
      return;
    }
    const timer = setInterval(async () => {
      if (await send()) {
        clearInterval(timer);
        res.end();
      }
    }, 400);
    req.on("close", () => clearInterval(timer));
  } catch (err) {
    next(err);
  }
});

kitsRouter.get("/:id", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      next(appError(400, "INVALID_INPUT", "Invalid kit id"));
      return;
    }
    const kit = await KitRecord.findOne({
      _id: req.params.id,
      userId: req.userId,
    });
    if (!kit) {
      next(appError(404, "NOT_FOUND", "Kit not found"));
      return;
    }
    res.json({ kit: publicKit(kit) });
  } catch (err) {
    next(err);
  }
});

kitsRouter.patch("/:id", async (req, res, next) => {
  try {
    const kit = await KitRecord.findOne({
      _id: req.params.id,
      userId: req.userId,
    });
    if (!kit || !kit.kit) {
      next(appError(404, "NOT_FOUND", "Kit not found"));
      return;
    }
    const patch = z
      .object({
        kit: kitSchema.partial(),
        itemState: z.record(z.enum(["generated", "edited", "pinned"])).optional(),
      })
      .parse(req.body);
    if (patch.kit) {
      kit.kit = { ...kit.kit, ...patch.kit };
    }
    if (patch.itemState) {
      kit.itemState = { ...kit.itemState, ...patch.itemState };
    }
    await kit.save();
    res.json({ kit: publicKit(kit) });
  } catch (err) {
    if (err instanceof z.ZodError) {
      next(appError(400, "INVALID_INPUT", err.issues[0]?.message ?? "Invalid input"));
      return;
    }
    next(err);
  }
});

kitsRouter.post("/:id/practice", async (req, res, next) => {
  try {
    const body = practiceSchema.parse(req.body);
    const kit = await KitRecord.findOne({
      _id: req.params.id,
      userId: req.userId,
    });
    if (!kit) {
      next(appError(404, "NOT_FOUND", "Kit not found"));
      return;
    }
    kit.practice.push({
      flashcardId: body.flashcardId,
      confidence: body.confidence,
      seenAt: new Date(),
    });
    await kit.save();
    const latestByCard = new Map<string, { confidence: number; seenAt: Date }>();
    for (const entry of kit.practice) {
      if (!entry.flashcardId) continue;
      latestByCard.set(entry.flashcardId, {
        confidence: entry.confidence ?? 3,
        seenAt: entry.seenAt ?? new Date(),
      });
    }
    const cards = (kit.kit?.flashcards ?? []).map((card) => {
      const seen = latestByCard.get(card.id);
      return {
        id: card.id,
        covered: Boolean(seen),
        confidence: seen?.confidence ?? null,
      };
    });
    const nextOrder = [...cards].sort((a, b) => {
      if (a.covered !== b.covered) return a.covered ? 1 : -1;
      return (a.confidence ?? 0) - (b.confidence ?? 0);
    });
    res.json({ practice: cards, next: nextOrder.map((c) => c.id) });
  } catch (err) {
    if (err instanceof z.ZodError) {
      next(appError(400, "INVALID_INPUT", err.issues[0]?.message ?? "Invalid input"));
      return;
    }
    next(err);
  }
});
