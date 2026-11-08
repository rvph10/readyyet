import { IsBoolean } from "class-validator";

export class UpdateSetupGuideDto {
  @IsBoolean()
  hidden!: boolean;
}
