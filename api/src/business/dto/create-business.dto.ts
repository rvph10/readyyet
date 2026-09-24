import { Type } from "class-transformer";
import { Locale } from "@readyyet/db";
import {
  IsDefined,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsPhoneNumber,
  IsString,
  MaxLength,
  ValidateNested,
} from "class-validator";
import { NAME_MAX_LENGTH } from "../../common/text-limits";

export class CreateLocationDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(NAME_MAX_LENGTH)
  name!: string;

  @IsString()
  @IsNotEmpty()
  businessTypeCode!: string;

  @IsPhoneNumber()
  contactPhone!: string;

  @IsEmail()
  contactEmail!: string;

  @IsEnum(Locale)
  locale!: Locale;
}

export class CreateBusinessDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(NAME_MAX_LENGTH)
  name!: string;

  @IsDefined()
  @IsObject()
  @ValidateNested()
  @Type(() => CreateLocationDto)
  location!: CreateLocationDto;
}
