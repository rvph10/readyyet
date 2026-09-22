// Must run before AppModule is imported: auth.ts constructs a PrismaClient
// at module-evaluation time, so DATABASE_URL has to already be set.
import "dotenv/config";
import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { AppModule } from "../src/app.module";

async function signUp(app: INestApplication, email: string) {
  const response = await request(app.getHttpServer())
    .post("/api/auth/sign-up/email")
    .send({ email, password: "correct-horse-battery", name: "Test User" });
  return response.headers["set-cookie"][0] as string;
}

describe("GET /locations/:locationId", () => {
  let app: INestApplication;
  let ownerCookie: string;
  let otherCookie: string;
  let locationId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();

    const stamp = Date.now();
    ownerCookie = await signUp(app, `location-owner-${stamp}@readyyet.test`);
    otherCookie = await signUp(app, `location-other-${stamp}@readyyet.test`);

    const created = await request(app.getHttpServer())
      .post("/businesses")
      .set("Cookie", ownerCookie)
      .send({
        name: "Jane's Pressing",
        location: {
          name: "Main Street",
          businessTypeCode: "PRESSING",
          contactPhone: "+12125550199",
          contactEmail: "main@janespressing.test",
        },
      });
    locationId = created.body.locations[0].id;
  });

  afterAll(async () => {
    await app.close();
  });

  it("lets the owner read their own location", async () => {
    const response = await request(app.getHttpServer())
      .get(`/locations/${locationId}`)
      .set("Cookie", ownerCookie);

    expect(response.status).toBe(200);
    expect(response.body.id).toBe(locationId);
  });

  it("rejects a signed-in user with no membership at that location", async () => {
    const response = await request(app.getHttpServer())
      .get(`/locations/${locationId}`)
      .set("Cookie", otherCookie);

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("UNAUTHORIZED");
  });

  it("returns 404 for an unknown location", async () => {
    const response = await request(app.getHttpServer())
      .get("/locations/00000000-0000-0000-0000-000000000000")
      .set("Cookie", ownerCookie);

    expect(response.status).toBe(404);
  });
});
