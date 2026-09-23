import { Role } from "@readyyet/db";
import { UnauthorizedError } from "../common/errors/app-error";
import { PrismaService } from "../database/prisma.service";

// ADR 0017: an Admin manages Employees only, the Admin role itself is the
// Owner's to give, change or take away. roles are every role the action
// touches, e.g. a member's current role and the one they'd get.
export function assertCanManage(actorRole: Role, ...roles: string[]) {
  if (actorRole === Role.ADMIN && roles.some((role) => role !== Role.EMPLOYEE)) {
    throw new UnauthorizedError("Only the owner can manage admins");
  }
}

// For a User the location guard already let in, so the Membership exists.
export async function roleAt(prisma: PrismaService, userId: string, locationId: string) {
  const membership = await prisma.membership.findUniqueOrThrow({
    where: { userId_locationId: { userId, locationId } },
  });
  return membership.role;
}
