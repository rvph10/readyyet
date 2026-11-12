// Must run before AppModule is imported: auth.ts constructs a PrismaClient
// at module-evaluation time, so DATABASE_URL has to already be set.
import "dotenv/config";
import { INestApplication } from "@nestjs/common";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { PrismaService } from "../src/database/prisma.service";
import { createTestApp } from "./support/create-test-app";
import { signInViaOtp } from "./support/sign-in-via-otp";
import { TERMS_VERSION } from "@readyyet/shared";

describe("An Owner who deleted their last Location", () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  it("still finds their Business through /me", async () => {
    const email = `delivered+no-locations-${Date.now()}@resend.dev`;
    const cookie = await signInViaOtp(app, prisma, email);
    const server = app.getHttpServer();
    const created = await request(server)
      .post("/businesses")
      .set("Cookie", cookie)
      .send({
        termsVersion: TERMS_VERSION,
        name: "Emptied Co",
        location: {
          name: "Only shop",
          businessTypeCode: "GARAGE",
          contactPhone: "+32470123456",
          contactEmail: email,
          locale: "EN",
          timeZone: "Europe/Brussels",
        },
      });
    expect(created.status).toBe(201);

    await request(server).delete(`/locations/${created.body.locations[0].id}`).set("Cookie", cookie).expect(204);

    const me = await request(server).get("/me").set("Cookie", cookie).expect(200);
    expect(me.body.memberships).toEqual([]);
    expect(me.body.ownedBusinessIds).toEqual([created.body.id]);
  });
});
