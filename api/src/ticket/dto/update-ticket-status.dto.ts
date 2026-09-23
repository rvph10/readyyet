import { IsNotEmpty, IsString } from "class-validator";

export class UpdateTicketStatusDto {
  @IsString()
  @IsNotEmpty()
  statusCode!: string;
}
