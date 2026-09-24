import { ApiProperty } from "@nestjs/swagger";
import { ApiErrorResponse, ErrorCode } from "@readyyet/shared";

export class ValidationIssueDto {
  property!: string;
  // Rule name to message. Absent when only a nested property failed.
  @ApiProperty({ type: "object", additionalProperties: { type: "string" } })
  constraints?: Record<string, string>;
}

export class ApiErrorDto {
  @ApiProperty({ enum: ErrorCode })
  code!: ErrorCode;
  message!: string;
  // Only on a request that failed input validation.
  details?: ValidationIssueDto[];
  requestId?: string;
}

export class ApiErrorResponseDto implements ApiErrorResponse {
  error!: ApiErrorDto;
}
