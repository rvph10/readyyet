// Must run before AppModule is imported: auth.ts constructs a PrismaClient
// at module-evaluation time, so DATABASE_URL has to already be set.
import "dotenv/config";
import { INestApplication } from "@nestjs/common";
import { Role } from "@readyyet/db";
import { TERMS_VERSION } from "@readyyet/shared";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { fromBufferPromise } from "yauzl";
import { trialSubscription } from "../src/billing/plans";
import { PrismaService } from "../src/database/prisma.service";
import { createTestApp } from "./support/create-test-app";
import { imageFile } from "./support/images";
import { signInViaOtp } from "./support/sign-in-via-otp";

// ADR 0129: everything a Location holds, for its Owner to take elsewhere.
describe("Exporting a Location", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let ownerCookie: string;
  const cookies: Record<string, string> = {};
  const userIds: Record<string, string> = {};
  const stamp = Date.now();
  const address = (label: string) => `delivered+location-export-${stamp}-${label}@resend.dev`;

  async function createLocation(locale: "FR" | "EN") {
    const created = await request(app.getHttpServer())
      .post("/businesses")
      .set("Cookie", ownerCookie)
      .send({
        termsVersion: TERMS_VERSION,
        name: "Export",
        location: {
          name: "Atelier Export",
          businessTypeCode: "GARAGE",
          timeZone: "Europe/Brussels",
          contactPhone: "+32470123456",
          contactEmail: "atelier@export.test",
          locale,
        },
      });
    const locationId = created.body.locations[0].id as string;
    // Only an Owner's first Business gets a trial, and this one has many.
    await prisma.subscription.update({ where: { locationId }, data: trialSubscription() });
    return locationId;
  }

  async function createTicket(locationId: string, fullName: string, title = "Portière") {
    const response = await request(app.getHttpServer())
      .post(`/locations/${locationId}/tickets`)
      .set("Cookie", ownerCookie)
      .send({ title, description: "Rayure", customer: { fullName, phone: "+32470111111" } });
    expect(response.status).toBe(201);
    return response.body as { id: string; customer: { id: string } };
  }

  async function download(locationId: string, cookie = ownerCookie) {
    return request(app.getHttpServer())
      .get(`/locations/${locationId}/export`)
      .set("Cookie", cookie)
      .buffer(true)
      .parse((response, done) => {
        const chunks: Buffer[] = [];
        response.on("data", (chunk: Buffer) => chunks.push(chunk));
        response.on("end", () => done(null, Buffer.concat(chunks)));
      });
  }

  async function unzip(archive: Buffer) {
    const zip = await fromBufferPromise(archive);
    const files = new Map<string, Buffer>();
    for await (const entry of zip.eachEntry()) {
      const chunks: Buffer[] = [];
      for await (const chunk of await zip.openReadStreamPromise(entry)) {
        chunks.push(chunk as Buffer);
      }
      files.set(entry.fileName, Buffer.concat(chunks));
    }
    return files;
  }

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    for (const label of ["owner", "admin", "employee"]) {
      cookies[label] = await signInViaOtp(app, prisma, address(label));
      userIds[label] = (await prisma.user.findUniqueOrThrow({ where: { email: address(label) } })).id;
    }
    ownerCookie = cookies.owner;
  });

  afterAll(async () => {
    await app.close();
  });

  it("gives the Owner the Customers, Tickets, history, feedback, team and photos", async () => {
    const locationId = await createLocation("FR");
    const ticket = await createTicket(locationId, "Chloé Dubois");
    await request(app.getHttpServer())
      .patch(`/locations/${locationId}/tickets/${ticket.id}/status`)
      .set("Cookie", ownerCookie)
      .send({ statusCode: "READY" })
      .expect(200);
    await prisma.ticketFeedback.create({
      data: { ticketId: BigInt(ticket.id), stars: 5, tags: ["fast", "friendly"], message: "Parfait; merci" },
    });
    const photo = await imageFile("jpeg");
    const uploaded = await request(app.getHttpServer())
      .post(`/locations/${locationId}/tickets/${ticket.id}/photos`)
      .set("Cookie", ownerCookie)
      .set("X-Real-IP", "198.18.1.1")
      .attach("file", photo, "photo.jpg");
    expect(uploaded.status).toBe(201);

    const response = await download(locationId);

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toBe("application/zip");
    expect(response.headers["content-disposition"]).toMatch(
      /^attachment; filename="readyyet-atelier-export-\d{4}-\d{2}-\d{2}\.zip"$/,
    );
    const files = await unzip(response.body as Buffer);
    expect([...files.keys()].filter((name) => !name.startsWith("photos/"))).toEqual([
      "customers.csv",
      "tickets.csv",
      "status_history.csv",
      "feedback.csv",
      "photos.csv",
      "team.csv",
      "readyyet.json",
    ]);

    // A French Excel splits on semicolons, and needs the byte order mark.
    const customers = files.get("customers.csv")!.toString("utf8");
    expect(customers.startsWith("\uFEFFid;name;email;phone;language;created_at;erased_at\r\n")).toBe(true);
    expect(customers).toContain(`${ticket.customer.id};Chloé Dubois;;'+32470111111;`);
    expect(files.get("tickets.csv")!.toString("utf8")).toContain(";Portière;Rayure;READY;");
    expect(files.get("status_history.csv")!.toString("utf8").split("\r\n")).toHaveLength(4);
    expect(files.get("feedback.csv")!.toString("utf8")).toContain(`${ticket.id};5;fast, friendly;"Parfait; merci";`);

    const json = JSON.parse(files.get("readyyet.json")!.toString("utf8"));
    expect(json.location).toMatchObject({ name: "Atelier Export", businessType: "GARAGE", language: "FR" });
    expect(json.team).toEqual([expect.objectContaining({ email: address("owner"), role: "OWNER" })]);
    expect(json.workflows[0].steps.map(({ status }: { status: string }) => status)).toContain("READY");
    const [exported] = json.tickets;
    expect(exported.history.map(({ status }: { status: string }) => status)).toEqual(["RECEIVED", "READY"]);
    expect(exported.feedback).toMatchObject({ stars: 5, message: "Parfait; merci" });
    expect(exported.photos).toHaveLength(1);
    expect(files.get(exported.photos[0].file)!.length).toBeGreaterThan(0);
  });

  it("stops a spreadsheet running what anyone typed as a formula, and uses commas in English", async () => {
    const locationId = await createLocation("EN");
    await createTicket(locationId, '=HYPERLINK("http://evil.test")', "Brake, pads");

    const files = await unzip((await download(locationId)).body as Buffer);

    expect(files.get("customers.csv")!.toString("utf8")).toContain(`,"'=HYPERLINK(""http://evil.test"")",`);
    expect(files.get("tickets.csv")!.toString("utf8")).toContain(',"Brake, pads",Rayure,RECEIVED,');
  });

  it("is the Owner's alone", async () => {
    const locationId = await createLocation("FR");
    await prisma.membership.createMany({
      data: [
        { userId: userIds.admin, locationId, role: Role.ADMIN },
        { userId: userIds.employee, locationId, role: Role.EMPLOYEE },
      ],
    });

    expect((await download(locationId, cookies.admin)).status).toBe(403);
    expect((await download(locationId, cookies.employee)).status).toBe(403);
  });

  it("holds a Location to five exports an hour, from wherever they're asked", async () => {
    const locationId = await createLocation("FR");
    const exportFrom = (ip: string) =>
      request(app.getHttpServer())
        .get(`/locations/${locationId}/export`)
        .set("Cookie", ownerCookie)
        .set("X-Real-IP", ip)
        .buffer(true)
        .parse((response, done) => {
          response.on("data", () => undefined);
          response.on("end", () => done(null, null));
        });

    for (let n = 1; n <= 5; n++) {
      expect((await exportFrom(`198.18.7.${n}`)).status).toBe(200);
    }
    expect((await exportFrom("198.18.7.99")).status).toBe(429);
    expect((await download(await createLocation("FR"))).status).toBe(200);
  });
});
