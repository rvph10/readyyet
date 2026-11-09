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

// Rules from docs/decisions/0016-ticket-status-change-rules.md. The GARAGE
// default workflow is RECEIVED, DIAGNOSING, REPAIRING, READY, then the
// ended statuses.
describe("Ticket status change rules", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let ownerCookie: string;
  let adminCookie: string;
  let employeeCookie: string;
  let locationId: string;

  async function createTicket() {
    const response = await request(app.getHttpServer())
      .post(`/locations/${locationId}/tickets`)
      .set("Cookie", ownerCookie)
      .send({ title: "Gearbox", customer: { fullName: "Rules Customer" } });
    return response.body.id as string;
  }

  function setStatus(ticketId: string, statusCode: string, cookie = ownerCookie) {
    return request(app.getHttpServer())
      .patch(`/locations/${locationId}/tickets/${ticketId}/status`)
      .set("Cookie", cookie)
      .send({ statusCode });
  }

  function undo(ticketId: string, cookie = ownerCookie) {
    return request(app.getHttpServer())
      .post(`/locations/${locationId}/tickets/${ticketId}/status/undo`)
      .set("Cookie", cookie);
  }

  async function history(ticketId: string) {
    const response = await request(app.getHttpServer())
      .get(`/locations/${locationId}/tickets/${ticketId}`)
      .set("Cookie", ownerCookie);
    return (response.body.statusEvents as { status: { code: string } }[]).map((event) => event.status.code);
  }

  async function signInMember(email: string, role: Role) {
    const cookie = await signInViaOtp(app, prisma, email);
    const user = await prisma.user.findUniqueOrThrow({ where: { email } });
    await prisma.membership.create({ data: { userId: user.id, locationId, role } });
    return cookie;
  }

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);

    const stamp = Date.now();
    ownerCookie = await signInViaOtp(app, prisma, `delivered+rules-owner-${stamp}@resend.dev`);
    const created = await request(app.getHttpServer())
      .post("/businesses")
      .set("Cookie", ownerCookie)
      .send({
        name: "Rules Test Garage",
        location: {
          name: "Rules Shop",
          businessTypeCode: "GARAGE",
          timeZone: "Europe/Brussels",
          contactPhone: "+12125550133",
          contactEmail: "shop@rulestest.test",
          locale: "EN",
        },
      });
    locationId = created.body.locations[0].id;

    adminCookie = await signInMember(`delivered+rules-admin-${stamp}@resend.dev`, Role.ADMIN);
    employeeCookie = await signInMember(`delivered+rules-employee-${stamp}@resend.dev`, Role.EMPLOYEE);
  });

  afterAll(async () => {
    await app.close();
  });

  describe("changes", () => {
    it("moves an open ticket forwards and backwards, keeping the full history", async () => {
      const ticketId = await createTicket();

      for (const status of ["REPAIRING", "DIAGNOSING", "READY", "REPAIRING"]) {
        const response = await setStatus(ticketId, status, employeeCookie);
        expect(response.status).toBe(200);
        expect(response.body.currentStatus.code).toBe(status);
      }
      expect(await history(ticketId)).toEqual(["RECEIVED", "REPAIRING", "DIAGNOSING", "READY", "REPAIRING"]);
    });

    it("rejects a change to the status the ticket is already at", async () => {
      const ticketId = await createTicket();
      await setStatus(ticketId, "DIAGNOSING");

      const response = await setStatus(ticketId, "DIAGNOSING");

      expect(response.status).toBe(409);
      expect(await history(ticketId)).toEqual(["RECEIVED", "DIAGNOSING"]);
    });

    it("never moves a ticket back to RECEIVED", async () => {
      const ticketId = await createTicket();
      await setStatus(ticketId, "DIAGNOSING");

      const response = await setStatus(ticketId, "RECEIVED");

      expect(response.status).toBe(400);
    });

    it("only completes a ticket that is READY", async () => {
      const ticketId = await createTicket();
      await setStatus(ticketId, "REPAIRING");

      expect((await setStatus(ticketId, "COMPLETED")).status).toBe(409);
      await setStatus(ticketId, "READY");
      expect((await setStatus(ticketId, "COMPLETED", employeeCookie)).status).toBe(200);
    });

    it.each(["CANCELLED", "REJECTED"])("allows %s from any open status", async (ended) => {
      for (const from of [null, "DIAGNOSING", "READY"]) {
        const ticketId = await createTicket();
        if (from) {
          await setStatus(ticketId, from);
        }
        expect((await setStatus(ticketId, ended, employeeCookie)).status).toBe(200);
      }
    });

    it("keeps an ended ticket final for employees, an admin or owner can reopen it", async () => {
      const ticketId = await createTicket();
      await setStatus(ticketId, "CANCELLED");

      expect((await setStatus(ticketId, "DIAGNOSING", employeeCookie)).status).toBe(403);
      expect((await setStatus(ticketId, "REJECTED", employeeCookie)).status).toBe(403);

      expect((await setStatus(ticketId, "DIAGNOSING", adminCookie)).status).toBe(200);
      await setStatus(ticketId, "REJECTED", adminCookie);
      expect((await setStatus(ticketId, "REPAIRING", ownerCookie)).status).toBe(200);
      expect(await history(ticketId)).toEqual(["RECEIVED", "CANCELLED", "DIAGNOSING", "REJECTED", "REPAIRING"]);
    });

    it("refuses a change when the status moved after the request read it", async () => {
      const ticketId = await createTicket();
      const repairing = await prisma.status.findUniqueOrThrow({ where: { code: "REPAIRING" } });

      // Holds a row lock on the ticket while changing its status, so the
      // request below reads the old status, then waits on the lock in
      // its conditional update and finds the status already moved.
      let lockTaken!: () => void;
      let commit!: () => void;
      const locked = new Promise<void>((resolve) => (lockTaken = resolve));
      const committed = new Promise<void>((resolve) => (commit = resolve));
      const racingChange = prisma.$transaction(async (tx) => {
        await tx.ticket.update({ where: { id: BigInt(ticketId) }, data: { currentStatusId: repairing.id } });
        lockTaken();
        await committed;
      });
      await locked;

      const response = setStatus(ticketId, "DIAGNOSING").then((result) => result);
      await new Promise((resolve) => setTimeout(resolve, 300));
      commit();
      await racingChange;

      expect((await response).status).toBe(409);
      expect(await history(ticketId)).toEqual(["RECEIVED"]);
    });
  });

  describe("undo", () => {
    it("reverts the latest change as if it never happened", async () => {
      const ticketId = await createTicket();
      await setStatus(ticketId, "DIAGNOSING", employeeCookie);
      await setStatus(ticketId, "READY", employeeCookie);

      const response = await undo(ticketId, employeeCookie);

      expect(response.status).toBe(200);
      expect(response.body.currentStatus.code).toBe("DIAGNOSING");
      expect(await history(ticketId)).toEqual(["RECEIVED", "DIAGNOSING"]);
    });

    it("can step back through several recent changes", async () => {
      const ticketId = await createTicket();
      await setStatus(ticketId, "DIAGNOSING");
      await setStatus(ticketId, "REPAIRING");

      await undo(ticketId);
      const response = await undo(ticketId);

      expect(response.body.currentStatus.code).toBe("RECEIVED");
      expect(await history(ticketId)).toEqual(["RECEIVED"]);
    });

    it("has nothing to undo on a new ticket", async () => {
      const ticketId = await createTicket();

      expect((await undo(ticketId)).status).toBe(409);
    });

    it("only lets the author undo their change", async () => {
      const ticketId = await createTicket();
      await setStatus(ticketId, "DIAGNOSING", employeeCookie);

      expect((await undo(ticketId, adminCookie)).status).toBe(403);
      expect(await history(ticketId)).toEqual(["RECEIVED", "DIAGNOSING"]);
    });

    it("refuses once the change is older than 2 minutes", async () => {
      const ticketId = await createTicket();
      await setStatus(ticketId, "DIAGNOSING");
      // The whole history, so it stays in order.
      await prisma.$executeRaw`
        UPDATE ticket_status_event SET created_at = created_at - interval '121 seconds'
        WHERE ticket_id = ${BigInt(ticketId)}`;

      expect((await undo(ticketId)).status).toBe(409);
      expect(await history(ticketId)).toEqual(["RECEIVED", "DIAGNOSING"]);
    });
  });
});
