import sharp from "sharp";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@readyyet/db";
import { fillFromGoogle } from "../src/auth/google-profile";
import type { StorageService } from "../src/storage/storage.service";

const PICTURE = "https://lh3.googleusercontent.com/a/abc=s96-c";

function idToken(claims: Record<string, string>) {
  return `header.${Buffer.from(JSON.stringify(claims)).toString("base64url")}.signature`;
}

function setup(user: { name: string; image: string | null }) {
  const update = vi.fn();
  const prisma = { user: { findUniqueOrThrow: vi.fn().mockResolvedValue(user), update } };
  const put = vi.fn();
  return {
    update,
    put,
    fill: (account: { providerId: string; idToken?: string }) =>
      fillFromGoogle(prisma as unknown as PrismaClient, { put } as unknown as StorageService, {
        userId: "u1",
        ...account,
      }),
  };
}

describe("Filling a User from their Google profile", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("gives a User without a name or avatar Google's name and a larger copy of its picture", async () => {
    const png = await sharp({ create: { width: 256, height: 256, channels: 3, background: "#888" } })
      .png()
      .toBuffer();
    const fetch = vi.fn().mockResolvedValue(new Response(new Uint8Array(png)));
    vi.stubGlobal("fetch", fetch);
    const { fill, update, put } = setup({ name: "", image: null });

    await fill({ providerId: "google", idToken: idToken({ name: " Ana Peeters ", picture: PICTURE }) });

    expect(fetch.mock.calls[0][0]).toBe("https://lh3.googleusercontent.com/a/abc=s256-c");
    const [key, , contentType] = put.mock.calls[0] as [string, Buffer, string];
    expect(contentType).toBe("image/webp");
    expect(update).toHaveBeenCalledWith({ where: { id: "u1" }, data: { name: "Ana Peeters", image: key } });
  });

  it("keeps the name and avatar a User already has", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    const { fill, update } = setup({ name: "Ana", image: "avatars/mine.webp" });

    await fill({ providerId: "google", idToken: idToken({ name: "Someone Else", picture: PICTURE }) });

    expect(fetch).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it("still fills the name when the picture can't be had, and fetches nothing outside Google", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response("nope", { status: 404 }));
    vi.stubGlobal("fetch", fetch);
    const google = setup({ name: "", image: null });
    await google.fill({ providerId: "google", idToken: idToken({ name: "Ana", picture: PICTURE }) });
    expect(google.update).toHaveBeenCalledWith({ where: { id: "u1" }, data: { name: "Ana", image: undefined } });

    const elsewhere = setup({ name: "Ana", image: null });
    await elsewhere.fill({ providerId: "google", idToken: idToken({ picture: "https://evil.example/a.png" }) });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(elsewhere.update).not.toHaveBeenCalled();
  });

  it("does nothing for an account that isn't Google's", async () => {
    const { fill, update } = setup({ name: "", image: null });
    await fill({ providerId: "credential" });
    expect(update).not.toHaveBeenCalled();
  });
});
