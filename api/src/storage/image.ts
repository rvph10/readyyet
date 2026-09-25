import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { ValidationError } from "../common/errors/app-error";

// ADR 0026. Enforced by the upload routes, before anything is decoded.
export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

// A 48 MP phone photo is about 49 million pixels. A compressed file can
// still decode to far more than it weighs, this bounds the memory one
// upload can take.
const MAX_INPUT_PIXELS = 50_000_000;

const ACCEPTED_FORMATS = new Set(["jpeg", "png", "webp"]);

export type ImageKind = "ticketPhoto" | "avatar" | "logo";

// Logos are PNG because some email clients don't display WebP.
const OUTPUT = {
  ticketPhoto: { prefix: "tickets", extension: "webp", contentType: "image/webp" },
  avatar: { prefix: "avatars", extension: "webp", contentType: "image/webp" },
  logo: { prefix: "logos", extension: "png", contentType: "image/png" },
} as const;

// Only logos and avatars are served publicly (GET /images/...), photos
// only ever through presigned URLs.
export const PUBLIC_PREFIXES: readonly string[] = [OUTPUT.avatar.prefix, OUTPUT.logo.prefix];

export interface ProcessedImage {
  key: string;
  body: Buffer;
  contentType: string;
}

// Decoding and re-encoding checks the real content, whatever the declared
// type, and writes no metadata, the GPS position a phone adds included.
// Every upload gets a new key, so a replaced picture gets a new URL.
export async function processImage(input: Buffer, kind: ImageKind): Promise<ProcessedImage> {
  // sharp's own pixel limit fails metadata() the same way a file that
  // isn't an image does, so the count is checked below instead, from the
  // header, before anything is decoded.
  const image = sharp(input, { limitInputPixels: false });
  const metadata = await image.metadata().catch(() => null);
  if (!metadata || !ACCEPTED_FORMATS.has(metadata.format)) {
    throw new ValidationError("Upload a JPEG, PNG or WebP image");
  }
  if (metadata.width * metadata.height > MAX_INPUT_PIXELS) {
    throw new ValidationError("This image has too many pixels, 50 million at most");
  }

  // rotate() with no angle applies the EXIF orientation, which would
  // otherwise be lost with the rest of the metadata.
  const oriented = image.rotate();
  const resized =
    kind === "ticketPhoto"
      ? oriented.resize(1600, 1600, { fit: "inside", withoutEnlargement: true }).webp()
      : kind === "avatar"
        ? oriented.resize(256, 256, { fit: "cover" }).webp()
        : oriented.resize(512, 512, { fit: "inside", withoutEnlargement: true }).png();
  const body = await resized.toBuffer().catch(() => {
    throw new ValidationError("This image is damaged and can't be read");
  });

  const { prefix, extension, contentType } = OUTPUT[kind];
  return { key: `${prefix}/${randomUUID()}.${extension}`, body, contentType };
}

// Served by ImageController with a one-year cache: emails are read days
// later, longer than a presigned URL lives (ADR 0026). BETTER_AUTH_URL is
// the API's own public URL.
export function publicImageUrl(key: string | null): string | null {
  return key && `${process.env.BETTER_AUTH_URL}/images/${key}`;
}
