import { SetMetadata } from "@nestjs/common";
import type { Role } from "@readyyet/db";

export const LOCATION_ROLES_KEY = "LOCATION_ROLES";

// Distinct from @thallesp/nestjs-better-auth's own @Roles(), which reads
// Better Auth's organization plugin (not used here, see ADR 0008). This
// reads our own Membership table instead, via LocationMembershipGuard.
export const LocationRoles = (...roles: Role[]) => SetMetadata(LOCATION_ROLES_KEY, roles);
