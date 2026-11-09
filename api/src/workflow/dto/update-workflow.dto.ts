import { ArrayMaxSize, ArrayUnique, IsArray, IsString } from "class-validator";

export class UpdateWorkflowDto {
  // Operational Statuses only, in order: the system ones are placed by the
  // server (ADR 0035). 26 is the whole operational catalogue.
  @IsArray()
  @ArrayMaxSize(26)
  @ArrayUnique()
  @IsString({ each: true })
  statusCodes!: string[];
}
