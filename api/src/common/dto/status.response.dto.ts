import { ApiProperty } from "@nestjs/swagger";
import { Locale } from "@readyyet/db";

export class TranslationDto {
  @ApiProperty({ enum: Locale })
  locale!: Locale;
  label!: string;
}

export class PublicStatusDto {
  code!: string;
  translations!: TranslationDto[];
}

export class StatusDto extends PublicStatusDto {
  id!: number;
}
