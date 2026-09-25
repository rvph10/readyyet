import sharp from "sharp";

// A real image to upload, as a phone or a design tool would send it.
export function imageFile(format: "jpeg" | "png" | "webp", width = 800, height = 600): Promise<Buffer> {
  return sharp({ create: { width, height, channels: 3, background: "#2e86c1" } })
    .toFormat(format)
    .toBuffer();
}
