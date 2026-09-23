import { Locale } from "@readyyet/db";
import { IsEnum } from "class-validator";

export class UpdateMeDto {
  @IsEnum(Locale)
  locale!: Locale;
}
