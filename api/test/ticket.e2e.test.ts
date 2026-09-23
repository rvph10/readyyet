// Must run before AppModule is imported: auth.ts constructs a PrismaClient
// at module-evaluation time, so DATABASE_URL has to already be set.
import "dotenv/config";
import { INestApplication } from "@nestjs/common";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { PrismaService } from "../src/database/prisma.service";
import { createTestApp } from "./support/create-test-app";
import { signInViaOtp } from "./support/sign-in-via-otp";

describe("Tickets", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let ownerCookie: string;
  let otherCookie: string;
  let locationId: string;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);

    const stamp = Date.now();
    ownerCookie = await signInViaOtp(app, prisma, `ticket-owner-${stamp}@readyyet.test`);
    otherCookie = await signInViaOtp(app, prisma, `ticket-other-${stamp}@readyyet.test`);

    const created = await request(app.getHttpServer())
      .post("/businesses")
      .set("Cookie", ownerCookie)
      .send({
        name: "Ticket Test Garage",
        location: {
          name: "Main Shop",
          businessTypeCode: "GARAGE",
          contactPhone: "+12125550123",
          contactEmail: "shop@tickettest.test",
        },
      });
    locationId = created.body.locations[0].id;
  });

  afterAll(async () => {
    await app.close();
  });

  it("creates a ticket with an inline customer, starting at RECEIVED", async () => {
    const response = await request(app.getHttpServer())
      .post(`/locations/${locationId}/tickets`)
      .set("Cookie", ownerCookie)
      .send({
        title: "Brake inspection",
        customer: { fullName: "Alice Driver", email: "alice@example.test" },
      });

    expect(response.status).toBe(201);
    expect(response.body.trackingCode).toMatch(/^[\w-]{12}$/);
    expect(response.body.currentStatus.code).toBe("RECEIVED");
    expect(response.body.customer.fullName).toBe("Alice Driver");
  });

  it("creates a second ticket reusing the first ticket's customerId", async () => {
    const first = await request(app.getHttpServer())
      .post(`/locations/${locationId}/tickets`)
      .set("Cookie", ownerCookie)
      .send({ title: "Oil change", customer: { fullName: "Bob Returner" } });
    const customerId = first.body.customer.id;

    const second = await request(app.getHttpServer())
      .post(`/locations/${locationId}/tickets`)
      .set("Cookie", ownerCookie)
      .send({ title: "Tire rotation", customerId });

    expect(second.status).toBe(201);
    expect(second.body.customer.id).toBe(customerId);
    expect(second.body.customer.fullName).toBe("Bob Returner");
  });

  it("rejects a request with both customer and customerId", async () => {
    const response = await request(app.getHttpServer())
      .post(`/locations/${locationId}/tickets`)
      .set("Cookie", ownerCookie)
      .send({ title: "Invalid", customer: { fullName: "X" }, customerId: "1" });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects a request with neither customer nor customerId", async () => {
    const response = await request(app.getHttpServer())
      .post(`/locations/${locationId}/tickets`)
      .set("Cookie", ownerCookie)
      .send({ title: "Invalid" });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects an unknown customerId", async () => {
    const response = await request(app.getHttpServer())
      .post(`/locations/${locationId}/tickets`)
      .set("Cookie", ownerCookie)
      .send({ title: "Invalid", customerId: "999999999" });

    expect(response.status).toBe(404);
  });

  it("lists tickets for the location, newest first", async () => {
    const response = await request(app.getHttpServer())
      .get(`/locations/${locationId}/tickets`)
      .set("Cookie", ownerCookie);

    expect(response.status).toBe(200);
    expect(response.body.items.length).toBeGreaterThanOrEqual(3);
    const createdAts = response.body.items.map((t: { createdAt: string }) => new Date(t.createdAt).getTime());
    expect(createdAts).toEqual([...createdAts].sort((a, b) => b - a));
  });

  it("gets a ticket's detail with its status timeline", async () => {
    const created = await request(app.getHttpServer())
      .post(`/locations/${locationId}/tickets`)
      .set("Cookie", ownerCookie)
      .send({ title: "Detail check", customer: { fullName: "Carol Detail" } });

    const response = await request(app.getHttpServer())
      .get(`/locations/${locationId}/tickets/${created.body.id}`)
      .set("Cookie", ownerCookie);

    expect(response.status).toBe(200);
    expect(response.body.statusEvents).toHaveLength(1);
    expect(response.body.statusEvents[0].status.code).toBe("RECEIVED");
  });

  it("updates a ticket's title and description", async () => {
    const created = await request(app.getHttpServer())
      .post(`/locations/${locationId}/tickets`)
      .set("Cookie", ownerCookie)
      .send({ title: "Initial title", customer: { fullName: "Grace Edit" } });

    const patched = await request(app.getHttpServer())
      .patch(`/locations/${locationId}/tickets/${created.body.id}`)
      .set("Cookie", ownerCookie)
      .send({ title: "Brake pads worn", description: "Front pads at 2mm, needs replacement" });

    expect(patched.status).toBe(200);
    expect(patched.body.title).toBe("Brake pads worn");
    expect(patched.body.description).toBe("Front pads at 2mm, needs replacement");

    const detail = await request(app.getHttpServer())
      .get(`/locations/${locationId}/tickets/${created.body.id}`)
      .set("Cookie", ownerCookie);
    expect(detail.body.title).toBe("Brake pads worn");
  });

  it("rejects a non-member updating a ticket", async () => {
    const created = await request(app.getHttpServer())
      .post(`/locations/${locationId}/tickets`)
      .set("Cookie", ownerCookie)
      .send({ title: "Should not edit", customer: { fullName: "Henry Block" } });

    const response = await request(app.getHttpServer())
      .patch(`/locations/${locationId}/tickets/${created.body.id}`)
      .set("Cookie", otherCookie)
      .send({ title: "Hacked" });

    expect(response.status).toBe(403);
  });

  it("moves a ticket to a real step of its workflow", async () => {
    const created = await request(app.getHttpServer())
      .post(`/locations/${locationId}/tickets`)
      .set("Cookie", ownerCookie)
      .send({ title: "Status change", customer: { fullName: "Dave Status" } });

    const patched = await request(app.getHttpServer())
      .patch(`/locations/${locationId}/tickets/${created.body.id}/status`)
      .set("Cookie", ownerCookie)
      .send({ statusCode: "DIAGNOSING" });

    expect(patched.status).toBe(200);
    expect(patched.body.currentStatus.code).toBe("DIAGNOSING");

    const detail = await request(app.getHttpServer())
      .get(`/locations/${locationId}/tickets/${created.body.id}`)
      .set("Cookie", ownerCookie);

    expect(detail.body.statusEvents).toHaveLength(2);
  });

  it("rejects a status code that isn't a step of this ticket's workflow", async () => {
    const created = await request(app.getHttpServer())
      .post(`/locations/${locationId}/tickets`)
      .set("Cookie", ownerCookie)
      .send({ title: "Bad status", customer: { fullName: "Eve Bad" } });

    const response = await request(app.getHttpServer())
      .patch(`/locations/${locationId}/tickets/${created.body.id}/status`)
      .set("Cookie", ownerCookie)
      .send({ statusCode: "STAIN_TREATMENT" });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects a signed-in user with no membership at that location", async () => {
    const create = await request(app.getHttpServer())
      .post(`/locations/${locationId}/tickets`)
      .set("Cookie", otherCookie)
      .send({ title: "Should fail", customer: { fullName: "Frank Fail" } });
    expect(create.status).toBe(403);

    const list = await request(app.getHttpServer()).get(`/locations/${locationId}/tickets`).set("Cookie", otherCookie);
    expect(list.status).toBe(403);
  });

  it("returns 404, not a raw DB error, for a malformed ticket id", async () => {
    const response = await request(app.getHttpServer())
      .get(`/locations/${locationId}/tickets/not-a-number`)
      .set("Cookie", ownerCookie);

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("NOT_FOUND");
  });
});
