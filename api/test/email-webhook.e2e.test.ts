// Must run before AppModule is imported: auth.ts constructs a PrismaClient
// at module-evaluation time, so DATABASE_URL has to already be set.
import "dotenv/config";
import { INestApplication } from "@nestjs/common";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { randomUUID } from "node:crypto";
import { Webhook } from "standardwebhooks";
import { EmailService } from "../src/email/email.service";
import { PrismaService } from "../src/database/prisma.service";
import { createTestApp } from "./support/create-test-app";

// standardwebhooks requires whsec_<base64>, matching the shape Resend's
// dashboard actually issues, a non-base64 fake string fails to decode
// before signature checking is even reached.
const WEBHOOK_SECRET = `whsec_${Buffer.from("test-secret-only-used-in-this-suite").toString("base64")}`;

// Resend's SDK verifies with the standardwebhooks library internally
// (see api/src/email/email-webhook.controller.ts), so signing a payload
// with that same library here produces a request the real verify() call
// accepts, no mocking of the SDK itself needed.
function signPayload(payload: string) {
  const wh = new Webhook(WEBHOOK_SECRET);
  const id = `msg_${randomUUID()}`;
  const timestamp = new Date();
  const signature = wh.sign(id, timestamp, payload);
  return {
    "svix-id": id,
    "svix-timestamp": Math.floor(timestamp.getTime() / 1000).toString(),
    "svix-signature": signature,
  };
}

describe("POST /webhooks/resend", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let previousSecret: string | undefined;

  beforeAll(async () => {
    previousSecret = process.env.RESEND_WEBHOOK_SECRET;
    process.env.RESEND_WEBHOOK_SECRET = WEBHOOK_SECRET;
    app = await createTestApp();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    process.env.RESEND_WEBHOOK_SECRET = previousSecret;
    await app.close();
  });

  it("rejects a request with an invalid signature", async () => {
    const payload = JSON.stringify({ type: "email.delivered", data: { email_id: "does-not-matter" } });

    const response = await request(app.getHttpServer())
      .post("/webhooks/resend")
      .set("svix-id", "msg_bad")
      .set("svix-timestamp", Math.floor(Date.now() / 1000).toString())
      .set("svix-signature", "v1,not-a-real-signature")
      .set("Content-Type", "application/json")
      .send(payload);

    expect(response.status).toBe(400);
  });

  it("updates the matching EmailLog to DELIVERED on a validly-signed email.delivered event", async () => {
    const email = app.get(EmailService);
    const log = await email.send({
      to: "delivered@resend.dev",
      subject: "readyyet webhook test",
      type: "test",
      html: "<p>Webhook update check.</p>",
    });
    expect(log.resendId).toBeTruthy();

    const payload = JSON.stringify({
      type: "email.delivered",
      created_at: new Date().toISOString(),
      data: {
        email_id: log.resendId,
        created_at: new Date().toISOString(),
        from: "delivered+test@resend.dev",
        to: [log.to],
        subject: log.subject,
      },
    });

    const response = await request(app.getHttpServer())
      .post("/webhooks/resend")
      .set(signPayload(payload))
      .set("Content-Type", "application/json")
      .send(payload);

    expect(response.status).toBe(200);

    const updated = await prisma.emailLog.findUniqueOrThrow({ where: { id: log.id } });
    expect(updated.status).toBe("DELIVERED");
    expect(updated.deliveredAt).not.toBeNull();
  });

  describe("what an event says about the address", () => {
    const stamp = Date.now();
    let locationId: string;

    function send(type: string, to: string, extra: object = {}) {
      const payload = JSON.stringify({
        type,
        created_at: new Date().toISOString(),
        data: {
          email_id: randomUUID(),
          created_at: new Date().toISOString(),
          from: "hello@readyyet.test",
          to: [to],
          subject: "Votre réparation est prête",
          ...extra,
        },
      });
      return request(app.getHttpServer())
        .post("/webhooks/resend")
        .set(signPayload(payload))
        .set("Content-Type", "application/json")
        .send(payload);
    }

    async function customerWith(email: string) {
      return prisma.customer.create({ data: { locationId, fullName: "Chloé Dubois", email } });
    }

    function reload(id: bigint) {
      return prisma.customer.findUniqueOrThrow({ where: { id } });
    }

    beforeAll(async () => {
      const owner = await prisma.user.create({
        data: { id: randomUUID(), email: `delivered+webhook-owner-${stamp}@resend.dev`, name: "Owner" },
      });
      const garage = await prisma.businessType.findUniqueOrThrow({ where: { code: "GARAGE" } });
      const business = await prisma.business.create({
        data: {
          ownerId: owner.id,
          name: "Webhook Test",
          locations: {
            create: {
              name: "Shop",
              businessTypeId: garage.id,
              contactPhone: "+32470123456",
              contactEmail: "shop@webhook.test",
              locale: "FR",
              timeZone: "Europe/Brussels",
            },
          },
        },
        include: { locations: true },
      });
      locationId = business.locations[0].id;
    });

    it("flags every customer with that address on a permanent bounce, whatever its case", async () => {
      const address = `chloe-${stamp}@gmial.test`;
      const first = await customerWith(address);
      const second = await customerWith(address.toUpperCase());
      const other = await customerWith(`someone-else-${stamp}@example.test`);

      const response = await send("email.bounced", address, {
        bounce: { type: "Permanent", subType: "General", message: "Mailbox does not exist" },
      });

      expect(response.status).toBe(200);
      expect((await reload(first.id)).emailBouncedAt).not.toBeNull();
      expect((await reload(second.id)).emailBouncedAt).not.toBeNull();
      expect((await reload(other.id)).emailBouncedAt).toBeNull();
    });

    it("ignores a temporary bounce", async () => {
      const customer = await customerWith(`full-mailbox-${stamp}@example.test`);

      await send("email.bounced", customer.email!, {
        bounce: { type: "Transient", subType: "MailboxFull", message: "Mailbox full" },
      });

      expect((await reload(customer.id)).emailBouncedAt).toBeNull();
    });

    it("flags an address Resend suppressed, like a bounce", async () => {
      const customer = await customerWith(`suppressed-${stamp}@example.test`);

      await send("email.suppressed", customer.email!, {
        suppressed: { type: "Bounce", message: "Address previously bounced" },
      });

      expect((await reload(customer.id)).emailBouncedAt).not.toBeNull();
    });

    it("flags a spam report separately", async () => {
      const customer = await customerWith(`complained-${stamp}@example.test`);

      await send("email.complained", customer.email!);

      const flagged = await reload(customer.id);
      expect(flagged.emailComplainedAt).not.toBeNull();
      expect(flagged.emailBouncedAt).toBeNull();
    });
  });
});
