import { ApiProperty } from "@nestjs/swagger";
import { InvitationStatus, Role } from "@readyyet/db";

export class InviterDto {
  id!: string;
  name!: string;
}

export class InvitationDto {
  id!: string;
  locationId!: string;
  email!: string;
  // An invitation never makes someone the Owner (ADR 0017).
  @ApiProperty({ enum: [Role.ADMIN, Role.EMPLOYEE] })
  role!: Exclude<Role, "OWNER">;
  @ApiProperty({ enum: InvitationStatus })
  status!: InvitationStatus;
  invitedBy!: InviterDto;
  expiresAt!: Date;
  acceptedAt!: Date | null;
  createdAt!: Date;
}
