import { ApiProperty } from "@nestjs/swagger";
import { Role } from "@readyyet/db";

export class MembershipDto {
  id!: string;
  userId!: string;
  locationId!: string;
  @ApiProperty({ enum: Role })
  role!: Role;
  createdAt!: Date;
}

export class MemberUserDto {
  id!: string;
  email!: string;
  name!: string;
  avatarUrl!: string | null;
}

export class MemberDto extends MembershipDto {
  user!: MemberUserDto;
}
