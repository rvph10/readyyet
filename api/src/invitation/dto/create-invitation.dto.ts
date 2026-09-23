import { InvitationRole } from "@readyyet/db";
import { IsEmail, IsEnum } from "class-validator";

export class CreateInvitationDto {
  @IsEmail()
  email!: string;

  @IsEnum(InvitationRole)
  role!: InvitationRole;
}
