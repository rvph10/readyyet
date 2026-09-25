import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { ValidationError } from "../src/common/errors/app-error";
import { processImage } from "../src/storage/image";

function solid(width: number, height: number) {
  return sharp({ create: { width, height, channels: 3, background: "#c0392b" } });
}

// A phone photo: sideways pixels with an EXIF orientation, and a GPS position.
function phonePhoto() {
  return solid(3000, 2000)
    .jpeg()
    .withMetadata({ orientation: 6 })
    .withExif({ IFD3: { GPSLatitudeRef: "N", GPSLatitude: "50/1 51/1 0/1" } })
    .toBuffer();
}

describe("processImage", () => {
  it("shrinks a Ticket photo to 1600px WebP, upright, with no metadata left", async () => {
    const input = await phonePhoto();
    expect((await sharp(input).metadata()).exif).toBeDefined();

    const { key, body, contentType } = await processImage(input, "ticketPhoto");

    const output = await sharp(body).metadata();
    expect(output).toMatchObject({ format: "webp", width: 1067, height: 1600 });
    expect(output.exif).toBeUndefined();
    expect(output.orientation).toBeUndefined();
    expect(contentType).toBe("image/webp");
    expect(key).toMatch(/^tickets\/[0-9a-f-]{36}\.webp$/);
  });

  it("never enlarges a small photo", async () => {
    const { body } = await processImage(await solid(400, 300).png().toBuffer(), "ticketPhoto");

    expect(await sharp(body).metadata()).toMatchObject({ width: 400, height: 300 });
  });

  it("crops an avatar to a 256px square", async () => {
    const { key, body } = await processImage(await solid(900, 500).webp().toBuffer(), "avatar");

    expect(await sharp(body).metadata()).toMatchObject({ format: "webp", width: 256, height: 256 });
    expect(key).toMatch(/^avatars\/.+\.webp$/);
  });

  it("fits a logo in 512px as PNG, keeping its shape", async () => {
    const { key, body, contentType } = await processImage(await solid(2048, 1024).jpeg().toBuffer(), "logo");

    expect(await sharp(body).metadata()).toMatchObject({ format: "png", width: 512, height: 256 });
    expect(contentType).toBe("image/png");
    expect(key).toMatch(/^logos\/.+\.png$/);
  });

  it("gives every upload of the same image a new key", async () => {
    const input = await solid(10, 10).png().toBuffer();

    const [first, second] = await Promise.all([processImage(input, "logo"), processImage(input, "logo")]);

    expect(first.key).not.toBe(second.key);
  });

  it.each([
    ["text", () => Promise.resolve(Buffer.from("not an image at all"))],
    ["a GIF", () => solid(10, 10).gif().toBuffer()],
  ])("refuses %s", async (_, make) => {
    await expect(processImage(await make(), "ticketPhoto")).rejects.toThrow(ValidationError);
  });

  it("refuses an image over 50 million pixels, however small the file", async () => {
    const input = await solid(8000, 7000).png().toBuffer();

    await expect(processImage(input, "ticketPhoto")).rejects.toThrow("too many pixels");
  });

  it("refuses a truncated file", async () => {
    const input = await phonePhoto();

    await expect(processImage(input.subarray(0, input.length / 2), "ticketPhoto")).rejects.toThrow(ValidationError);
  });
});
