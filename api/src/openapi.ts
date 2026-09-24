import { HttpStatus, INestApplication } from "@nestjs/common";
import { DocumentBuilder, OpenAPIObject, SwaggerModule } from "@nestjs/swagger";
import { ApiErrorResponseDto } from "./common/dto/error.response.dto";

export function createOpenApiDocument(app: INestApplication): OpenAPIObject {
  const config = new DocumentBuilder()
    .setTitle("ReadyYet API")
    .setDescription(
      "Better Auth's own routes (/api/auth/*) aren't included here, they're raw middleware, not Nest controllers. See ADR 0008/0011.",
    )
    .setVersion("0.0.0")
    .addCookieAuth("better-auth.session_token")
    // body-parser answers these before any route runs, for any method.
    .addGlobalResponse({
      status: HttpStatus.PAYLOAD_TOO_LARGE,
      description: "VALIDATION_ERROR: the request body is over the size limit",
      type: ApiErrorResponseDto,
    })
    .addGlobalResponse({
      status: HttpStatus.UNSUPPORTED_MEDIA_TYPE,
      description: "VALIDATION_ERROR: the request body's charset or encoding isn't supported",
      type: ApiErrorResponseDto,
    })
    .addGlobalResponse({
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      description: "INTERNAL_ERROR: something went wrong on our side, the message is always generic",
      type: ApiErrorResponseDto,
    })
    .build();
  return SwaggerModule.createDocument(app, config);
}
