import { applyDecorators, HttpStatus, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiBody, ApiConsumes } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { ApiError, ApiErrors } from "../common/decorators/api-errors.decorator";
import { MAX_UPLOAD_BYTES } from "./image";

// A route taking one picture as the multipart "file" field (ADR 0026).
// Held in memory: at 15 MB at most, sharp reads it from there.
export function ImageUpload() {
  return applyDecorators(
    UseInterceptors(FileInterceptor("file", { limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 } })),
    // The heaviest requests the API takes, the default 60 a minute would
    // let one client push about 900 MB a minute into the bucket.
    Throttle({ default: { limit: 5, ttl: 60_000 } }),
    ApiConsumes("multipart/form-data"),
    ApiBody({
      schema: {
        type: "object",
        required: ["file"],
        properties: { file: { type: "string", format: "binary", description: "JPEG, PNG or WebP, 15 MB at most" } },
      },
    }),
    ApiErrors(HttpStatus.BAD_REQUEST),
    ApiError(HttpStatus.PAYLOAD_TOO_LARGE, "VALIDATION_ERROR: the file is over 15 MB"),
  );
}
