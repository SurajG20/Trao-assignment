import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { MongoMemoryServer } from "mongodb-memory-server";
import { createApp } from "../src/app.js";
import { connectDb, disconnectDb } from "../src/db.js";
import { User } from "../src/models/user.js";
import { KitRecord } from "../src/models/kit.js";

const app = createApp();

async function waitUntil(
  agent: ReturnType<typeof request.agent>,
  id: string,
  status: string,
) {
  for (let i = 0; i < 80; i += 1) {
    const res = await agent.get(`/api/kits/${id}`);
    if (res.body.kit?.status === status) return res.body.kit;
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error(`kit did not reach ${status}`);
}

describe("HTTP APIs", () => {
  let mongo: MongoMemoryServer;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    await connectDb(mongo.getUri());
  });

  afterAll(async () => {
    await disconnectDb();
    await mongo.stop();
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await KitRecord.deleteMany({});
  });

  it("reports health without a session", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it("registers, logs in, and reads the current user", async () => {
    const agent = request.agent(app);
    const registered = await agent.post("/api/auth/register").send({
      email: "ada@example.com",
      password: "password12",
    });
    expect(registered.status).toBe(201);
    expect(registered.body.user.email).toBe("ada@example.com");

    const me = await agent.get("/api/auth/me");
    expect(me.status).toBe(200);
    expect(me.body.user.email).toBe("ada@example.com");
  });

  it("rejects a short password and a duplicate email", async () => {
    const agent = request.agent(app);
    const short = await agent.post("/api/auth/register").send({
      email: "ada@example.com",
      password: "short",
    });
    expect(short.status).toBe(400);
    expect(short.body.error.code).toBe("INVALID_INPUT");

    await agent.post("/api/auth/register").send({
      email: "ada@example.com",
      password: "password12",
    });
    const dup = await request(app).post("/api/auth/register").send({
      email: "ada@example.com",
      password: "password12",
    });
    expect(dup.status).toBe(409);
    expect(dup.body.error.code).toBe("EMAIL_TAKEN");
  });

  it("rejects invalid credentials and expired cookies", async () => {
    await request(app).post("/api/auth/register").send({
      email: "ada@example.com",
      password: "password12",
    });
    const bad = await request(app).post("/api/auth/login").send({
      email: "ada@example.com",
      password: "wrong-password",
    });
    expect(bad.status).toBe(401);
    expect(bad.body.error.code).toBe("INVALID_CREDENTIALS");

    const me = await request(app)
      .get("/api/auth/me")
      .set("Cookie", "session=not-a-jwt");
    expect(me.status).toBe(401);
    expect(me.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("clears the session on logout", async () => {
    const agent = request.agent(app);
    await agent.post("/api/auth/register").send({
      email: "ada@example.com",
      password: "password12",
    });
    await agent.post("/api/auth/logout");
    const me = await agent.get("/api/auth/me");
    expect(me.status).toBe(401);
  });

  it("creates a kit, lists it, and reuses a duplicate posting", async () => {
    const agent = request.agent(app);
    await agent.post("/api/auth/register").send({
      email: "ada@example.com",
      password: "password12",
    });
    const payload = {
      jd: "Senior Backend Engineer\n\nBuild APIs.",
      company_url: "https://example.com",
      days: 5,
    };
    const created = await agent.post("/api/kits").send(payload);
    expect(created.status).toBe(202);
    const ready = await waitUntil(agent, created.body.kit.id, "ready");
    expect(ready.kit.schedule.days_available).toBe(5);
    expect(ready.kit.schedule.days).toHaveLength(5);

    const again = await agent.post("/api/kits").send(payload);
    expect(again.status).toBe(202);
    expect(again.body.kit.id).toBe(created.body.kit.id);

    const list = await agent.get("/api/kits");
    expect(list.body.kits).toHaveLength(1);
  });

  it("does not let one user read another user's kit", async () => {
    const ada = request.agent(app);
    await ada.post("/api/auth/register").send({
      email: "ada@example.com",
      password: "password12",
    });
    const created = await ada.post("/api/kits").send({
      jd: "Role",
      company_url: "https://example.com",
      days: 1,
    });

    const bob = request.agent(app);
    await bob.post("/api/auth/register").send({
      email: "bob@example.com",
      password: "password12",
    });
    const peek = await bob.get(`/api/kits/${created.body.kit.id}`);
    expect(peek.status).toBe(404);
    expect(peek.body.error.code).toBe("NOT_FOUND");
  });

  it("returns structured errors for invalid URLs and missing sessions", async () => {
    const unauth = await request(app).post("/api/kits").send({
      jd: "Role",
      company_url: "https://example.com",
      days: 3,
    });
    expect(unauth.status).toBe(401);
    expect(unauth.body.error.code).toBe("UNAUTHENTICATED");

    const agent = request.agent(app);
    await agent.post("/api/auth/register").send({
      email: "ada@example.com",
      password: "password12",
    });
    const badUrl = await agent.post("/api/kits").send({
      jd: "Role",
      company_url: "not-a-url",
      days: 3,
    });
    expect(badUrl.status).toBe(400);
    expect(badUrl.body.error.code).toBe("INVALID_INPUT");
  });

  it("regenerates a schedule without dropping a hand-edited question", async () => {
    const agent = request.agent(app);
    await agent.post("/api/auth/register").send({
      email: "ada@example.com",
      password: "password12",
    });
    const created = await agent.post("/api/kits").send({
      jd: "Engineer\nRequirements:\n- React",
      company_url: "https://example.com",
      days: 3,
    });
    const ready = await waitUntil(agent, created.body.kit.id, "ready");
    const patched = await agent.patch(`/api/kits/${ready.id}`).send({
      kit: {
        questions: [
          {
            id: "q-hand",
            requirement_ids: [],
            category: "technical",
            prompt: "What would you change about our API?",
            answer_outline: "Talk about versioning.",
            difficulty: 2,
          },
        ],
      },
    });
    expect(patched.body.kit.itemState["q-hand"]).toBe("pinned");

    const regen = await agent
      .post(`/api/kits/${ready.id}/regenerate`)
      .send({ section: "schedule" });
    expect(regen.status).toBe(200);
    expect(regen.body.kit.kit.questions.some((q: { id: string }) => q.id === "q-hand")).toBe(
      true,
    );
    expect(regen.body.kit.kit.schedule.days).toHaveLength(3);
  });

  it("deletes only the owner's kit", async () => {
    const ada = request.agent(app);
    await ada.post("/api/auth/register").send({
      email: "ada@example.com",
      password: "password12",
    });
    const created = await ada.post("/api/kits").send({
      jd: "Role to delete",
      company_url: "https://example.com",
      days: 2,
    });
    const id = created.body.kit.id;

    const bob = request.agent(app);
    await bob.post("/api/auth/register").send({
      email: "bob@example.com",
      password: "password12",
    });
    const blocked = await bob.delete(`/api/kits/${id}`);
    expect(blocked.status).toBe(404);

    const removed = await ada.delete(`/api/kits/${id}`);
    expect(removed.status).toBe(200);
    expect(removed.body.ok).toBe(true);

    const missing = await ada.get(`/api/kits/${id}`);
    expect(missing.status).toBe(404);

    const list = await ada.get("/api/kits");
    expect(list.body.kits.some((k: { id: string }) => k.id === id)).toBe(false);
  });
});
