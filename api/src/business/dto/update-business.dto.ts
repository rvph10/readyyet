import { IsNotEmpty, IsString } from "class-validator";

export class UpdateBusinessDto {
  @IsString()
  @IsNotEmpty()
  name!: string;
}
