// Must run before AppModule is imported: auth.ts constructs a PrismaClient
// at module-evaluation time, so DATABASE_URL has to already be set.
import "dotenv/config";
import { INestApplication } from "@nestjs/common";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { PrismaService } from "../src/database/prisma.service";
import { createTestApp } from "./support/create-test-app";
import { signInViaOtp } from "./support/sign-in-via-otp";

describe("GET /me", () => {
  let app: INestApplication;
  let cookie: string;

  beforeAll(async () => {
    app = await createTestApp();

    const email = `me-test-${Date.now()}@readyyet.test`;
    cookie = await signInViaOtp(app, app.get(PrismaService), email);
  });

  afterAll(async () => {
    await app.close();
  });

  it("reports no memberships right after signing in for the first time", async () => {
    const response = await request(app.getHttpServer()).get("/me").set("Cookie", cookie);

    expect(response.status).toBe(200);
    expect(response.body.memberships).toEqual([]);
  });

  it("reports the owner membership after creating a business", async () => {
    await request(app.getHttpServer())
      .post("/businesses")
      .set("Cookie", cookie)
      .send({
        name: "Me Test Garage",
        location: {
          name: "Shop",
          businessTypeCode: "GARAGE",
          contactPhone: "+12125550123",
          contactEmail: "shop@metest.test",
          locale: "EN",
        },
      });

    const response = await request(app.getHttpServer()).get("/me").set("Cookie", cookie);

    expect(response.status).toBe(200);
    expect(response.body.memberships).toHaveLength(1);
    expect(response.body.memberships[0].role).toBe("OWNER");
    expect(response.body.memberships[0].location.name).toBe("Shop");
    expect(response.body.memberships[0].location.business.name).toBe("Me Test Garage");
  });

  it("rejects the request without a session", async () => {
    const response = await request(app.getHttpServer()).get("/me");

    expect(response.status).toBe(401);
  });
});
