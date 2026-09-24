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

    const email = `delivered+me-test-${Date.now()}@resend.dev`;
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
          timeZone: "Europe/Brussels",
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

// ADR 0018.
describe("A user's language", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const stamp = Date.now();

  // Signs in like the web app would, from a browser with that language.
  async function signUp(label: string, acceptLanguage?: string, body: object = {}) {
    const email = `delivered+me-locale-${stamp}-${label}@resend.dev`;
    await request(app.getHttpServer())
      .post("/api/auth/email-otp/send-verification-otp")
      .send({ email, type: "sign-in" });
    const verification = await prisma.verification.findFirstOrThrow({
      where: { identifier: `sign-in-otp-${email}` },
      orderBy: { createdAt: "desc" },
    });
    const signIn = request(app.getHttpServer()).post("/api/auth/sign-in/email-otp");
    if (acceptLanguage) {
      signIn.set("Accept-Language", acceptLanguage);
    }
    const response = await signIn.send({ email, otp: verification.value.split(":")[0], name: "Locale Test", ...body });
    return response.headers["set-cookie"][0];
  }

  function me(cookie: string) {
    return request(app.getHttpServer()).get("/me").set("Cookie", cookie);
  }

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  it("starts in the language of the browser that created the account", async () => {
    expect((await me(await signUp("fr", "fr-BE,fr;q=0.9,en;q=0.8"))).body.locale).toBe("FR");
    expect((await me(await signUp("none"))).body.locale).toBe("EN");
  });

  it("can't be set by the sign-in request itself", async () => {
    const cookie = await signUp("forced", "en-US", { locale: "FR" });

    expect((await me(cookie)).body.locale).toBe("EN");
  });

  it("can be changed by the user", async () => {
    const cookie = await signUp("changed", "en-US");

    const updated = await request(app.getHttpServer()).patch("/me").set("Cookie", cookie).send({ locale: "FR" });
    expect(updated.status).toBe(200);
    expect(updated.body.locale).toBe("FR");
    expect((await me(cookie)).body.locale).toBe("FR");

    const invalid = await request(app.getHttpServer()).patch("/me").set("Cookie", cookie).send({ locale: "DE" });
    expect(invalid.status).toBe(400);
  });
});
