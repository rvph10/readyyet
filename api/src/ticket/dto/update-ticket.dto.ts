import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class UpdateTicketDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;
}
