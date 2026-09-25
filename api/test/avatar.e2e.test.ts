// Must run before AppModule is imported: auth.ts constructs a PrismaClient
// at module-evaluation time, so DATABASE_URL has to already be set.
import "dotenv/config";
import { INestApplication } from "@nestjs/common";
import sharp from "sharp";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaService } from "../src/database/prisma.service";
import { createTestApp } from "./support/create-test-app";
import { imageFile } from "./support/images";
import { signInViaOtp } from "./support/sign-in-via-otp";

// ADR 0026: an avatar is uploaded, stored as a 256px WebP square, and
// served publicly from the API like a logo.
describe("User avatar", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let cookie: string;
  let email: string;
  let ipCounter = 0;

  // Uploads are limited to 5 a minute per client, each one is its own here.
  function upload(file: Buffer) {
    return request(app.getHttpServer())
      .put("/me/avatar")
      .set("Cookie", cookie)
      .set("X-Real-IP", `192.0.2.${++ipCounter}`)
      .attach("file", file, "me.jpg");
  }

  function imagePath(url: string) {
    return new URL(url).pathname;
  }

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    email = `delivered+avatar-${Date.now()}@resend.dev`;
    cookie = await signInViaOtp(app, prisma, email);
  });

  afterAll(async () => {
    await app.close();
  });

  it("stores an uploaded avatar as a 256px WebP square, served publicly", async () => {
    const response = await upload(await imageFile("jpeg", 1200, 800));

    expect(response.status).toBe(200);
    expect(response.body.avatarUrl).toMatch(
      new RegExp(`^${process.env.BETTER_AUTH_URL}/images/avatars/[0-9a-f-]{36}\\.webp$`),
    );
    const image = await request(app.getHttpServer()).get(imagePath(response.body.avatarUrl)).buffer(true);
    expect(image.headers["content-type"]).toBe("image/webp");
    expect(await sharp(image.body as Buffer).metadata()).toMatchObject({ format: "webp", width: 256, height: 256 });

    const me = await request(app.getHttpServer()).get("/me").set("Cookie", cookie);
    expect(me.body.avatarUrl).toBe(response.body.avatarUrl);
  });

  it("shows the avatar in the team list", async () => {
    const { body: uploaded } = await upload(await imageFile("png"));
    const created = await request(app.getHttpServer())
      .post("/businesses")
      .set("Cookie", cookie)
      .send({
        name: "Avatar Test",
        location: {
          name: "Atelier",
          businessTypeCode: "GARAGE",
          timeZone: "Europe/Brussels",
          contactPhone: "+32470123456",
          contactEmail: "atelier@avatar.test",
          locale: "FR",
        },
      });

    const members = await request(app.getHttpServer())
      .get(`/locations/${created.body.locations[0].id}/memberships`)
      .set("Cookie", cookie);

    expect(members.body[0].user.avatarUrl).toBe(uploaded.avatarUrl);
  });

  it("deletes the previous avatar when a new one is uploaded", async () => {
    const first = await upload(await imageFile("png"));
    const second = await upload(await imageFile("webp"));

    expect(second.body.avatarUrl).not.toBe(first.body.avatarUrl);
    expect((await request(app.getHttpServer()).get(imagePath(first.body.avatarUrl))).status).toBe(404);
  });

  it("refuses a file that isn't an image", async () => {
    const response = await upload(Buffer.from("GIF89a, or so it claims"));

    expect(response.status).toBe(400);
  });

  it("can't be set through Better Auth's own update route, which still changes the name", async () => {
    const { body: uploaded } = await upload(await imageFile("png"));

    const response = await request(app.getHttpServer())
      .post("/api/auth/update-user")
      .set("Cookie", cookie)
      .send({ name: "Chloé", image: "tickets/0b7c7a9e-3f2a-4d7e-9a53-1c2d3e4f5a6b.webp" });

    expect(response.status).toBe(200);
    const user = await prisma.user.findUniqueOrThrow({ where: { email } });
    expect(user.name).toBe("Chloé");
    expect(user.image).toBe(new URL(uploaded.avatarUrl).pathname.replace("/images/", ""));
  });

  it("removes the avatar, and its object with it", async () => {
    const { body: uploaded } = await upload(await imageFile("png"));

    const response = await request(app.getHttpServer()).delete("/me/avatar").set("Cookie", cookie);

    expect(response.status).toBe(200);
    expect(response.body.avatarUrl).toBeNull();
    expect((await request(app.getHttpServer()).get(imagePath(uploaded.avatarUrl))).status).toBe(404);
  });
});
