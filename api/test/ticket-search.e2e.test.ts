// Must run before AppModule is imported: auth.ts constructs a PrismaClient
// at module-evaluation time, so DATABASE_URL has to already be set.
import "dotenv/config";
import { INestApplication } from "@nestjs/common";
import { Role } from "@readyyet/db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { PrismaService } from "../src/database/prisma.service";
import { createTestApp } from "./support/create-test-app";
import { signInViaOtp } from "./support/sign-in-via-otp";

type ListResponse = { items: { id: string; title: string }[]; nextCursor: string | null };

describe("Ticket search and filters", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let ownerCookie: string;
  let employeeCookie: string;
  let employeeId: string;
  let locationId: string;
  const ids: Record<string, string> = {};

  async function createTicket(cookie: string, body: object) {
    const response = await request(app.getHttpServer())
      .post(`/locations/${locationId}/tickets`)
      .set("Cookie", cookie)
      .send(body);
    return response.body as { id: string; trackingCode: string; customer: { id: string } };
  }

  async function setStatus(ticketId: string, statusCode: string) {
    await request(app.getHttpServer())
      .patch(`/locations/${locationId}/tickets/${ticketId}/status`)
      .set("Cookie", ownerCookie)
      .send({ statusCode });
  }

  async function list(query: Record<string, string | string[]> = {}) {
    const response = await request(app.getHttpServer())
      .get(`/locations/${locationId}/tickets`)
      .query(query)
      .set("Cookie", ownerCookie);
    return response;
  }

  async function titles(query: Record<string, string | string[]>) {
    const response = await list(query);
    expect(response.status).toBe(200);
    return (response.body as ListResponse).items.map((item) => item.title).sort();
  }

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);

    const stamp = Date.now();
    ownerCookie = await signInViaOtp(app, prisma, `search-owner-${stamp}@readyyet.test`);
    employeeCookie = await signInViaOtp(app, prisma, `search-employee-${stamp}@readyyet.test`);

    const created = await request(app.getHttpServer())
      .post("/businesses")
      .set("Cookie", ownerCookie)
      .send({
        name: "Search Test Garage",
        location: {
          name: "Search Shop",
          businessTypeCode: "GARAGE",
          contactPhone: "+12125550111",
          contactEmail: "shop@searchtest.test",
          locale: "EN",
        },
      });
    locationId = created.body.locations[0].id;

    const employee = await prisma.user.findUniqueOrThrow({
      where: { email: `search-employee-${stamp}@readyyet.test` },
    });
    employeeId = employee.id;
    await prisma.membership.create({ data: { userId: employeeId, locationId, role: Role.EMPLOYEE } });

    const brakes = await createTicket(ownerCookie, {
      title: "Brake pads",
      description: "Front axle, squeaking",
      customer: { fullName: "Alice Martin", email: "alice@example.test", phone: "+33611111111" },
    });
    ids.brakes = brakes.id;
    const oil = await createTicket(employeeCookie, {
      title: "Oil change",
      description: "Use 5W30",
      customerId: brakes.customer.id,
    });
    ids.oil = oil.id;
    const tires = await createTicket(ownerCookie, {
      title: "Tire rotation 100% free",
      customer: { fullName: "Bruno Petit", email: "bruno@example.test" },
    });
    ids.tires = tires.id;
    const erased = await createTicket(ownerCookie, {
      title: "Windshield",
      customer: { fullName: "Zoe Erased", email: "zoe@example.test" },
    });
    ids.erased = erased.id;
    await request(app.getHttpServer())
      .delete(`/locations/${locationId}/customers/${erased.customer.id}`)
      .set("Cookie", ownerCookie);

    await setStatus(ids.oil, "DIAGNOSING");
    await setStatus(ids.tires, "COMPLETED");
    await setStatus(ids.erased, "CANCELLED");
  });

  afterAll(async () => {
    await app.close();
  });

  it("searches title, description, tracking code and customer fields, ignoring case", async () => {
    expect(await titles({ q: "BRAKE" })).toEqual(["Brake pads"]);
    expect(await titles({ q: "5w30" })).toEqual(["Oil change"]);
    expect(await titles({ q: "alice martin" })).toEqual(["Brake pads", "Oil change"]);
    expect(await titles({ q: "bruno@example" })).toEqual(["Tire rotation 100% free"]);
    expect(await titles({ q: "33611" })).toEqual(["Brake pads", "Oil change"]);

    const { trackingCode } = await prisma.ticket.findUniqueOrThrow({ where: { id: BigInt(ids.tires) } });
    expect(await titles({ q: trackingCode })).toEqual(["Tire rotation 100% free"]);
  });

  it("treats % and _ in the search as plain characters", async () => {
    expect(await titles({ q: "100%" })).toEqual(["Tire rotation 100% free"]);
    expect(await titles({ q: "%" })).toEqual(["Tire rotation 100% free"]);
    // Not a bare "_": tracking codes are base64url and can contain one.
    // Unescaped, the _ here would match the space in "Brake pads".
    expect(await titles({ q: "Brake_pads" })).toEqual([]);
  });

  it("does not match an erased customer's placeholder data", async () => {
    expect(await titles({ q: "Zoe" })).toEqual([]);
    expect(await titles({ q: "deleted" })).toEqual([]);
  });

  it("filters by one or more statuses, repeated or comma-separated", async () => {
    expect(await titles({ status: "DIAGNOSING" })).toEqual(["Oil change"]);
    expect(await titles({ status: ["RECEIVED", "COMPLETED"] })).toEqual(["Brake pads", "Tire rotation 100% free"]);
    expect(await titles({ status: "RECEIVED,COMPLETED" })).toEqual(["Brake pads", "Tire rotation 100% free"]);
  });

  it("filters open vs ended tickets", async () => {
    expect(await titles({ state: "open" })).toEqual(["Brake pads", "Oil change"]);
    expect(await titles({ state: "ended" })).toEqual(["Tire rotation 100% free", "Windshield"]);
  });

  it("filters by who created the ticket and by customer", async () => {
    expect(await titles({ createdBy: employeeId })).toEqual(["Oil change"]);

    const brakes = await prisma.ticket.findUniqueOrThrow({ where: { id: BigInt(ids.brakes) } });
    expect(await titles({ customerId: brakes.customerId.toString() })).toEqual(["Brake pads", "Oil change"]);
  });

  it("filters by creation date range, inclusive", async () => {
    await prisma.ticket.update({
      where: { id: BigInt(ids.brakes) },
      data: { createdAt: new Date("2026-01-10T12:00:00Z") },
    });

    expect(await titles({ createdFrom: "2026-01-10T12:00:00Z", createdTo: "2026-01-10T12:00:00Z" })).toEqual([
      "Brake pads",
    ]);
    expect(await titles({ createdTo: "2026-01-31T00:00:00Z" })).toEqual(["Brake pads"]);
    expect(await titles({ createdFrom: "2026-02-01T00:00:00Z" })).toEqual([
      "Oil change",
      "Tire rotation 100% free",
      "Windshield",
    ]);
  });

  it("combines search and filters", async () => {
    expect(await titles({ q: "alice", state: "open", createdBy: employeeId })).toEqual(["Oil change"]);
    expect(await titles({ q: "alice", status: "COMPLETED" })).toEqual([]);
  });

  it("pages through every ticket with the cursor, newest first, without duplicates", async () => {
    const seen: string[] = [];
    let cursor: string | null = null;
    do {
      const response = await list({ take: "1", ...(cursor ? { cursor } : {}) });
      const body = response.body as ListResponse;
      expect(body.items).toHaveLength(1);
      seen.push(body.items[0].id);
      cursor = body.nextCursor;
    } while (cursor);

    const all = (await list()).body as ListResponse;
    expect(seen).toEqual(all.items.map((item) => item.id));
    expect(seen).toHaveLength(4);
  });

  it("rejects an invalid cursor or filter value", async () => {
    const invalidQueries: Record<string, string>[] = [
      { cursor: "garbage" },
      { state: "closed" },
      { createdFrom: "yesterday" },
      { customerId: "abc" },
    ];
    for (const query of invalidQueries) {
      const response = await list(query);
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    }
  });
});
