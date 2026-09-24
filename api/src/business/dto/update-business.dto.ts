import { IsNotEmpty, IsString, MaxLength } from "class-validator";
import { NAME_MAX_LENGTH } from "../../common/text-limits";

export class UpdateBusinessDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(NAME_MAX_LENGTH)
  name!: string;
}
