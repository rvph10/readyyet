import { Controller, Get, Header, HttpStatus, Param, Res, StreamableFile } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { SkipThrottle } from "@nestjs/throttler";
import { AllowAnonymous } from "@thallesp/nestjs-better-auth";
import type { Response } from "express";
import { ApiErrors } from "../common/decorators/api-errors.decorator";
import { NotFoundError } from "../common/errors/app-error";
import { PUBLIC_PREFIXES } from "./image";
import { StorageService } from "./storage.service";

// Only a key processImage() could have made, never a path the bucket
// might read another way.
const FILE_NAME = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(webp|png)$/;

@ApiTags("Images")
@AllowAnonymous()
// A page can show a whole team's avatars at once, and a webmail's image
// proxy fetches for all its users from a few addresses. The cache header
// keeps repeats away.
@SkipThrottle()
@Controller("images")
export class ImageController {
  constructor(private readonly storage: StorageService) {}

  @Get(":prefix/:file")
  // Never stale: a new picture always gets a new key.
  @Header("Cache-Control", "public, max-age=31536000, immutable")
  // helmet's same-origin default would stop the web app and webmail from
  // showing it, both are on other origins.
  @Header("Cross-Origin-Resource-Policy", "cross-origin")
  @ApiOperation({ summary: "A Location's logo or a User's avatar, public (ADR 0026)" })
  @ApiOkResponse({
    description: "A PNG logo or a WebP avatar",
    content: {
      "image/png": { schema: { type: "string", format: "binary" } },
      "image/webp": { schema: { type: "string", format: "binary" } },
    },
  })
  @ApiErrors(HttpStatus.NOT_FOUND)
  async find(
    @Param("prefix") prefix: string,
    @Param("file") file: string,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    const object =
      PUBLIC_PREFIXES.includes(prefix) && FILE_NAME.test(file) ? await this.storage.stream(`${prefix}/${file}`) : null;
    if (!object) {
      // An error must not be cached for a year like the image would be.
      response.setHeader("Cache-Control", "no-store");
      throw new NotFoundError("Image not found");
    }
    return new StreamableFile(object.body, { type: object.contentType });
  }
}
