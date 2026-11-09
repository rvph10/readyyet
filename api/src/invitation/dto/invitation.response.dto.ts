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
  // Shown for every Location of the Business (ADR 0051).
  logoUrl!: string | null;
}

export class InvitationLocationDto {
  id!: string;
  name!: string;
  business!: InvitationBusinessDto;
}

// Enough for a signed-out visitor to know who invites them, to what, and
// which address to sign in with (ADR 0051). The link holding the id went
// to that address, so it tells its holder nothing they couldn't read there.
export class InvitationPreviewDto {
  id!: string;
  email!: string;
  @ApiProperty({ enum: [Role.ADMIN, Role.EMPLOYEE] })
  role!: Exclude<Role, "OWNER">;
  // EXPIRED as soon as expiresAt has passed, even before an accept records it.
  @ApiProperty({ enum: InvitationStatus })
  status!: InvitationStatus;
  invitedBy!: InviterDto;
  location!: InvitationLocationDto;
  expiresAt!: Date;
  createdAt!: Date;
}

export class TeamMemberDto {
  id!: string;
  name!: string;
  avatarUrl!: string | null;
}

// What the invited User sees once signed in with its address: the preview,
// and the team they'd join (ADR 0051).
export class ReceivedInvitationDto extends InvitationPreviewDto {
  team!: TeamMemberDto[];
}
