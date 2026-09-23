import { Role } from "@readyyet/db";
import { IsIn } from "class-validator";

export class UpdateMembershipRoleDto {
  // Not the full Role enum: promoting someone to OWNER is an ownership
  // transfer, not a role change, out of scope, and blocked by the DB's
  // own membership_one_owner_per_location unique index anyway.
  @IsIn([Role.ADMIN, Role.EMPLOYEE])
  role!: typeof Role.ADMIN | typeof Role.EMPLOYEE;
}
