import { ApiProperty } from "@nestjs/swagger";
import { Locale, Role } from "@readyyet/db";

export class MeDto {
  id!: string;
  email!: string;
  name!: string;
  @ApiProperty({ enum: Locale })
  locale!: Locale;
  // Uploaded with PUT /me/avatar. Safe to cache for good, a new avatar
  // gets a new URL.
  avatarUrl!: string | null;
}

export class MyBusinessDto {
  id!: string;
  name!: string;
}

export class MyLocationDto {
  id!: string;
  name!: string;
  business!: MyBusinessDto;
}

export class MyMembershipDto {
  @ApiProperty({ enum: Role })
  role!: Role;
  location!: MyLocationDto;
}

export class MeWithMembershipsDto extends MeDto {
  memberships!: MyMembershipDto[];
}
