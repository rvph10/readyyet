import { ApiProperty } from "@nestjs/swagger";
import { Locale, Role } from "@readyyet/db";

export class MeDto {
  id!: string;
  email!: string;
  name!: string;
  @ApiProperty({ enum: Locale })
  locale!: Locale;
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
