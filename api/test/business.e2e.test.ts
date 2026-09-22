// Must run before AppModule is imported: auth.ts constructs a PrismaClient
// at module-evaluation time, so DATABASE_URL has to already be set.
import "dotenv/config";
import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { AppModule } from "../src/app.module";

describe("POST /businesses", () => {
  let app: INestApplication;
  let sessionCookie: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();

    const email = `business-test-${Date.now()}@readyyet.test`;
    const signUp = await request(app.getHttpServer())
      .post("/api/auth/sign-up/email")
      .send({ email, password: "correct-horse-battery", name: "Business Owner" });
    sessionCookie = signUp.headers["set-cookie"][0];
  });

  afterAll(async () => {
    await app.close();
  });

  const validPayload = {
    name: "Joe's Garage",
    location: {
      name: "Downtown",
      businessTypeCode: "GARAGE",
      contactPhone: "+12125550123",
      contactEmail: "downtown@joesgarage.test",
    },
  };

  it("creates a business with its first location and an owner membership", async () => {
    const response = await request(app.getHttpServer())
      .post("/businesses")
      .set("Cookie", sessionCookie)
      .send(validPayload);

    expect(response.status).toBe(201);
    expect(response.body.name).toBe("Joe's Garage");
    expect(response.body.locations).toHaveLength(1);
    expect(response.body.locations[0].name).toBe("Downtown");
  });

  it("rejects an unknown business type code", async () => {
    const response = await request(app.getHttpServer())
      .post("/businesses")
      .set("Cookie", sessionCookie)
      .send({ ...validPayload, location: { ...validPayload.location, businessTypeCode: "NOT_REAL" } });

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("NOT_FOUND");
  });

  it("rejects a malformed request", async () => {
    const response = await request(app.getHttpServer())
      .post("/businesses")
      .set("Cookie", sessionCookie)
      .send({ ...validPayload, location: { ...validPayload.location, contactEmail: "not-an-email" } });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects the request without a session", async () => {
    const response = await request(app.getHttpServer()).post("/businesses").send(validPayload);

    expect(response.status).toBe(401);
  });
});
