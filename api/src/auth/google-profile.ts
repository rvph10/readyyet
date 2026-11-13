import { Logger } from "@nestjs/common";
import type { PrismaClient } from "@readyyet/db";
import { MAX_UPLOAD_BYTES, processImage } from "../storage/image";
import type { StorageService } from "../storage/storage.service";

const logger = new Logger("GoogleProfile");

// ADR 0153: when a Google account joins a User, its name and picture fill
// what the User doesn't have yet, never what they set themselves. The token
// came straight from Google's token endpoint, so its claims are read as is.
export async function fillFromGoogle(
  prisma: PrismaClient,
  storage: StorageService,
  account: { providerId: string; userId: string; idToken?: string | null },
) {
  if (account.providerId !== "google" || !account.idToken) {
    return;
  }
  const profile = JSON.parse(Buffer.from(account.idToken.split(".")[1], "base64url").toString()) as {
    name?: string;
    picture?: string;
  };
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: account.userId },
    select: { name: true, image: true },
  });
  const name = user.name ? undefined : profile.name?.trim() || undefined;
  const image = user.image ? undefined : await googleAvatar(storage, profile.picture);
  if (name || image) {
    await prisma.user.update({ where: { id: account.userId }, data: { name, image } });
  }
}

// Stored like an uploaded avatar (ADR 0026). A picture that can't be had
// leaves the User without one rather than failing their sign-in.
async function googleAvatar(storage: StorageService, picture: string | undefined) {
  if (!picture || !new URL(picture).hostname.endsWith(".googleusercontent.com")) {
    return undefined;
  }
  try {
    // Google's link asks for 96 px, too small for a 256 px avatar.
    const response = await fetch(picture.replace(/=s\d+-c$/, "=s256-c"), { signal: AbortSignal.timeout(5_000) });
    const body = Buffer.from(await response.arrayBuffer());
    if (!response.ok || body.length > MAX_UPLOAD_BYTES) {
      return undefined;
    }
    const image = await processImage(body, "avatar");
    await storage.put(image.key, image.body, image.contentType);
    return image.key;
  } catch (error) {
    logger.warn(`Google picture not kept: ${(error as Error).message}`);
    return undefined;
  }
}
