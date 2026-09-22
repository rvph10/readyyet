import { Type } from "class-transformer";
import { IsEmail, IsNotEmpty, IsPhoneNumber, IsString, ValidateNested } from "class-validator";

export class CreateLocationDto {
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
  @IsNotEmpty()
  name!: string;

  @ValidateNested()
  @Type(() => CreateLocationDto)
  location!: CreateLocationDto;
}
