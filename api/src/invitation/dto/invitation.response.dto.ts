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

export class InvitationBusinessDto {
  id!: string;
  name!: string;
}

export class InvitationLocationDto {
  id!: string;
  name!: string;
  business!: InvitationBusinessDto;
}

// What the invited User sees before accepting (ADR 0047), not the email
// address, which they already know.
export class ReceivedInvitationDto {
  id!: string;
  @ApiProperty({ enum: [Role.ADMIN, Role.EMPLOYEE] })
  role!: Exclude<Role, "OWNER">;
  // EXPIRED as soon as expiresAt has passed, even before an accept records it.
  @ApiProperty({ enum: InvitationStatus })
  status!: InvitationStatus;
  invitedBy!: InviterDto;
  location!: InvitationLocationDto;
  expiresAt!: Date;
}
