// Must run before AppModule is imported: auth.ts constructs a PrismaClient
// at module-evaluation time, so DATABASE_URL has to already be set.
import "dotenv/config";
import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { AppModule } from "../src/app.module";

describe("Better Auth", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  const email = `auth-test-${Date.now()}@readyyet.test`;
  const password = "correct-horse-battery";

  it("signs up a new user and returns a session cookie", async () => {
    const response = await request(app.getHttpServer())
      .post("/api/auth/sign-up/email")
      .send({ email, password, name: "Auth Test" });

    expect(response.status).toBe(200);
    expect(response.body.user.email).toBe(email);
    expect(response.headers["set-cookie"]?.[0]).toMatch(/better-auth\.session_token=/);
  });

  it("rejects signing up the same email twice", async () => {
    const response = await request(app.getHttpServer())
      .post("/api/auth/sign-up/email")
      .send({ email, password, name: "Auth Test" });

    expect(response.status).toBe(422);
  });

  it("logs in with correct credentials and resolves the session", async () => {
    const signIn = await request(app.getHttpServer())
      .post("/api/auth/sign-in/email")
      .send({ email, password });

    expect(signIn.status).toBe(200);
    const cookie = signIn.headers["set-cookie"][0];

    const session = await request(app.getHttpServer()).get("/api/auth/get-session").set("Cookie", cookie);

    expect(session.status).toBe(200);
    expect(session.body.user.email).toBe(email);
  });

  it("rejects login with the wrong password", async () => {
    const response = await request(app.getHttpServer())
      .post("/api/auth/sign-in/email")
      .send({ email, password: "wrong-password" });

    expect(response.status).toBe(401);
  });

  it("resolves no session without a cookie", async () => {
    const response = await request(app.getHttpServer()).get("/api/auth/get-session");

    expect(response.status).toBe(200);
    expect(response.body).toBeNull();
  });
});
