import { Type } from "class-transformer";
import { Locale } from "@readyyet/db";
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsPhoneNumber,
  IsString,
  MaxLength,
  ValidateNested,
} from "class-validator";
import { DESCRIPTION_MAX_LENGTH, NAME_MAX_LENGTH, TITLE_MAX_LENGTH } from "../../common/text-limits";
import { IsBigIntId } from "../../common/parse-bigint-id";

export class CreateCustomerDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(NAME_MAX_LENGTH)
  fullName!: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsPhoneNumber()
  phone?: string;

  // Unset means the Location's own locale applies (ADR 0015).
  @IsOptional()
  @IsEnum(Locale)
  locale?: Locale;
}

export class CreateTicketDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(TITLE_MAX_LENGTH)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(DESCRIPTION_MAX_LENGTH)
  description?: string;

  // BigInt id sent as a string; service rejects when both this and
  // `customer` are present, or when neither is.
  @IsOptional()
  @IsBigIntId()
  customerId?: string;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => CreateCustomerDto)
  customer?: CreateCustomerDto;
}
