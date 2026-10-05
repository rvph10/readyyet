import { IsNotEmpty, IsString, MaxLength } from "class-validator";
import { NAME_MAX_LENGTH } from "@readyyet/shared";

export class UpdateBusinessDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(NAME_MAX_LENGTH)
  name!: string;
}
