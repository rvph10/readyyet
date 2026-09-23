// Must run before AppModule is imported: auth.ts constructs a PrismaClient
// at module-evaluation time, so DATABASE_URL has to already be set.
import "dotenv/config";
import { INestApplication } from "@nestjs/common";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { pinoHttpOptions } from "../src/common/logging/pino-http-options";
import { PrismaService } from "../src/database/prisma.service";
import { createTestApp } from "./support/create-test-app";
import { signInViaOtp } from "./support/sign-in-via-otp";

const DAY_MS = 24 * 60 * 60 * 1000;
const PRIVATE_KEYS = new Set(["id", "customer", "customerId", "changedBy", "createdBy", "description", "deletedAt"]);

function collectKeys(value: unknown, keys = new Set<string>()): Set<string> {
  if (Array.isArray(value)) {
    value.forEach((item) => collectKeys(item, keys));
  } else if (value && typeof value === "object") {
    for (const [key, nested] of Object.entries(value)) {
      keys.add(key);
      collectKeys(nested, keys);
    }
  }
  return keys;
}

describe("Public tracking", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let ownerCookie: string;
  let ownerEmail: string;
  let locationId: string;

  async function createTicket(title: string) {
    const response = await request(app.getHttpServer())
      .post(`/locations/${locationId}/tickets`)
      .set("Cookie", ownerCookie)
      .send({
        title,
        description: "Internal note: quoted 300 EUR",
        customer: { fullName: "Carla Private", email: "delivered+carla@resend.dev", phone: "+33600000000" },
      });
    return response.body as { id: string; trackingCode: string };
  }

  async function setStatus(ticketId: string, statusCode: string) {
    await request(app.getHttpServer())
      .patch(`/locations/${locationId}/tickets/${ticketId}/status`)
      .set("Cookie", ownerCookie)
      .send({ statusCode });
  }

  // Shifts the whole history back, so it stays in order and the latest
  // event (the one that set the current status) ends up ageMs old.
  async function ageHistory(ticketId: string, ageMs: number) {
    await prisma.$executeRaw`
      UPDATE ticket_status_event
      SET created_at = created_at - ${ageMs} * interval '1 millisecond'
      WHERE ticket_id = ${BigInt(ticketId)}`;
  }

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);

    ownerEmail = `delivered+tracking-owner-${Date.now()}@resend.dev`;
    ownerCookie = await signInViaOtp(app, prisma, ownerEmail);

    const created = await request(app.getHttpServer())
      .post("/businesses")
      .set("Cookie", ownerCookie)
      .send({
        name: "Tracking Test Garage",
        location: {
          name: "Tracking Shop",
          businessTypeCode: "GARAGE",
          contactPhone: "+12125550199",
          contactEmail: "shop@trackingtest.test",
          locale: "FR",
        },
      });
    locationId = created.body.locations[0].id;
  });

  afterAll(async () => {
    await app.close();
  });

  it("shows a ticket's public view without a session", async () => {
    const ticket = await createTicket("Brake pads");
    await setStatus(ticket.id, "DIAGNOSING");

    const response = await request(app.getHttpServer()).get(`/tracking/${ticket.trackingCode}`);

    expect(response.status).toBe(200);
    expect(response.headers["cache-control"]).toBe("no-store");
    expect(response.body.trackingCode).toBe(ticket.trackingCode);
    expect(response.body.title).toBe("Brake pads");
    expect(response.body.location).toEqual({
      name: "Tracking Shop",
      contactPhone: "+12125550199",
      contactEmail: "shop@trackingtest.test",
      logoUrl: null,
    });
    expect(response.body.currentStatus.code).toBe("DIAGNOSING");
    expect(response.body.currentStatus.translations).toContainEqual({ locale: "EN", label: expect.any(String) });
    expect(response.body.statusHistory.map((event: { status: { code: string } }) => event.status.code)).toEqual([
      "RECEIVED",
      "DIAGNOSING",
    ]);
    const stepCodes = response.body.steps.map((step: { status: { code: string } }) => step.status.code);
    expect(stepCodes[0]).toBe("RECEIVED");
    expect(stepCodes).toEqual(expect.arrayContaining(["DIAGNOSING", "READY", "COMPLETED", "CANCELLED", "REJECTED"]));
  });

  it("exposes no ids, customer data, staff identity, or description", async () => {
    const ticket = await createTicket("Clutch");
    await setStatus(ticket.id, "DIAGNOSING");

    const response = await request(app.getHttpServer()).get(`/tracking/${ticket.trackingCode}`);

    const leakedKeys = [...collectKeys(response.body)].filter((key) => PRIVATE_KEYS.has(key));
    expect(leakedKeys).toEqual([]);
    const raw = JSON.stringify(response.body);
    for (const secret of ["Carla Private", "delivered+carla@resend.dev", "+33600000000", ownerEmail, "Internal note"]) {
      expect(raw).not.toContain(secret);
    }
  });

  it("returns 404 for an unknown code", async () => {
    const response = await request(app.getHttpServer()).get("/tracking/doesnotexist");

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("NOT_FOUND");
  });

  it("keeps working for 30 days after the ticket ends", async () => {
    const ticket = await createTicket("Exhaust");
    await setStatus(ticket.id, "READY");
    await setStatus(ticket.id, "COMPLETED");
    await ageHistory(ticket.id, 29 * DAY_MS);

    const response = await request(app.getHttpServer()).get(`/tracking/${ticket.trackingCode}`);

    expect(response.status).toBe(200);
  });

  it.each(["COMPLETED", "CANCELLED", "REJECTED"])("expires 30 days after the ticket reaches %s", async (status) => {
    const ticket = await createTicket(`Ended ${status}`);
    // COMPLETED is only reachable from READY (ADR 0016).
    await setStatus(ticket.id, "READY");
    await setStatus(ticket.id, status);
    await ageHistory(ticket.id, 31 * DAY_MS);

    const response = await request(app.getHttpServer()).get(`/tracking/${ticket.trackingCode}`);

    expect(response.status).toBe(404);
  });

  it("does not expire a ticket that is still open, however old", async () => {
    const ticket = await createTicket("Long repair");
    await setStatus(ticket.id, "READY");
    await ageHistory(ticket.id, 90 * DAY_MS);

    const response = await request(app.getHttpServer()).get(`/tracking/${ticket.trackingCode}`);

    expect(response.status).toBe(200);
  });

  it("returns 404 once the ticket's location is deleted", async () => {
    const ticket = await createTicket("Deleted shop");
    await prisma.location.update({ where: { id: locationId }, data: { deletedAt: new Date() } });

    try {
      const response = await request(app.getHttpServer()).get(`/tracking/${ticket.trackingCode}`);
      expect(response.status).toBe(404);
    } finally {
      await prisma.location.update({ where: { id: locationId }, data: { deletedAt: null } });
    }
  });

  it("masks the tracking code in request logs", () => {
    const serializeReq = pinoHttpOptions().serializers!.req as (req: { url: string }) => { url: string };

    expect(serializeReq({ url: "/tracking/AbC-123_xyz0?utm=mail" }).url).toBe("/tracking/[redacted]?utm=mail");
    expect(serializeReq({ url: "/locations/abc/tickets" }).url).toBe("/locations/abc/tickets");
  });
});

// Own app instance: the throttler's in-memory counter is per app, and the
// tests above already spent part of this IP's budget for the route.
describe("Public tracking rate limit", () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it("allows 30 requests per minute, then answers 429", async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 31; i++) {
      const response = await request(app.getHttpServer()).get("/tracking/doesnotexist");
      statuses.push(response.status);
    }

    expect(statuses.slice(0, 30).every((status) => status === 404)).toBe(true);
    expect(statuses[30]).toBe(429);
  });
});
