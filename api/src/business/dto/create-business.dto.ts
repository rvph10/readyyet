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
  ValidateNested,
} from "class-validator";

export class CreateLocationDto {
  @IsString()
  @IsNotEmpty()
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
  name!: string;

  @IsDefined()
  @IsObject()
  @ValidateNested()
  @Type(() => CreateLocationDto)
  location!: CreateLocationDto;
}
