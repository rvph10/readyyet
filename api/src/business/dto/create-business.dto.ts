import { Type } from "class-transformer";
import { IsDefined, IsEmail, IsNotEmpty, IsObject, IsPhoneNumber, IsString, ValidateNested } from "class-validator";

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
