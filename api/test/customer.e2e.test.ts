// Must run before AppModule is imported: auth.ts constructs a PrismaClient
// at module-evaluation time, so DATABASE_URL has to already be set.
import "dotenv/config";
import { INestApplication } from "@nestjs/common";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { createTestApp } from "./support/create-test-app";

async function signUp(app: INestApplication, email: string) {
  const response = await request(app.getHttpServer())
    .post("/api/auth/sign-up/email")
    .send({ email, password: "correct-horse-battery", name: "Test User" });
  return response.headers["set-cookie"][0] as string;
}

async function createTicketWithCustomer(app: INestApplication, cookie: string, locationId: string, fullName: string) {
  const response = await request(app.getHttpServer())
    .post(`/locations/${locationId}/tickets`)
    .set("Cookie", cookie)
    .send({ title: "Job", customer: { fullName } });
  return response.body.customer.id as string;
}

describe("Customers", () => {
  let app: INestApplication;
  let ownerCookie: string;
  let otherCookie: string;
  let locationId: string;
  let aliceId: string;
  let bobId: string;

  beforeAll(async () => {
    app = await createTestApp();

    const stamp = Date.now();
    ownerCookie = await signUp(app, `customer-owner-${stamp}@readyyet.test`);
    otherCookie = await signUp(app, `customer-other-${stamp}@readyyet.test`);

    const created = await request(app.getHttpServer())
      .post("/businesses")
      .set("Cookie", ownerCookie)
      .send({
        name: "Customer Test Garage",
        location: {
          name: "Main Shop",
          businessTypeCode: "GARAGE",
          contactPhone: "+12125550123",
          contactEmail: "shop@customertest.test",
        },
      });
    locationId = created.body.locations[0].id;

    aliceId = await createTicketWithCustomer(app, ownerCookie, locationId, "Alice Wonder");
    bobId = await createTicketWithCustomer(app, ownerCookie, locationId, "Bob Builder");
  });

  afterAll(async () => {
    await app.close();
  });

  it("finds a customer by partial name match", async () => {
    const response = await request(app.getHttpServer())
      .get(`/locations/${locationId}/customers`)
      .query({ q: "wonder" })
      .set("Cookie", ownerCookie);

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0].id).toBe(aliceId);
  });

  it("gets a customer's full detail", async () => {
    const response = await request(app.getHttpServer())
      .get(`/locations/${locationId}/customers/${bobId}`)
      .set("Cookie", ownerCookie);

    expect(response.status).toBe(200);
    expect(response.body.fullName).toBe("Bob Builder");
  });

  it("updates a customer's contact info", async () => {
    const patched = await request(app.getHttpServer())
      .patch(`/locations/${locationId}/customers/${bobId}`)
      .set("Cookie", ownerCookie)
      .send({ email: "bob@example.test" });

    expect(patched.status).toBe(200);
    expect(patched.body.email).toBe("bob@example.test");

    const refetched = await request(app.getHttpServer())
      .get(`/locations/${locationId}/customers/${bobId}`)
      .set("Cookie", ownerCookie);
    expect(refetched.body.email).toBe("bob@example.test");
  });

  it("soft-deletes a customer, removing it from get and list", async () => {
    const customerId = await createTicketWithCustomer(app, ownerCookie, locationId, "Carol Deleteme");

    const deleted = await request(app.getHttpServer())
      .delete(`/locations/${locationId}/customers/${customerId}`)
      .set("Cookie", ownerCookie);
    expect(deleted.status).toBe(204);

    const get = await request(app.getHttpServer())
      .get(`/locations/${locationId}/customers/${customerId}`)
      .set("Cookie", ownerCookie);
    expect(get.status).toBe(404);

    const list = await request(app.getHttpServer())
      .get(`/locations/${locationId}/customers`)
      .query({ q: "Deleteme" })
      .set("Cookie", ownerCookie);
    expect(list.body).toHaveLength(0);
  });

  it("rejects a signed-in user with no membership at that location", async () => {
    const response = await request(app.getHttpServer())
      .get(`/locations/${locationId}/customers`)
      .set("Cookie", otherCookie);

    expect(response.status).toBe(403);
  });

  it("returns 404, not a raw DB error, for a malformed customer id", async () => {
    const response = await request(app.getHttpServer())
      .get(`/locations/${locationId}/customers/not-a-number`)
      .set("Cookie", ownerCookie);

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("NOT_FOUND");
  });
});
