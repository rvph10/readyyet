import { Injectable } from "@nestjs/common";
import { Role } from "@readyyet/db";
import { ConflictError, NotFoundError } from "../common/errors/app-error";
import { parseBigIntId } from "../common/parse-bigint-id";
import { PrismaService } from "../database/prisma.service";
import { UpdateMembershipRoleDto } from "./dto/update-membership-role.dto";
import { assertCanManage, roleAt } from "./team-rules";

@Injectable()
export class MembershipService {
  constructor(private readonly prisma: PrismaService) {}

  async list(locationId: string) {
    const memberships = await this.prisma.membership.findMany({
      where: { locationId },
      include: { user: { select: { id: true, email: true, name: true } } },
      orderBy: { createdAt: "asc" },
    });
    return memberships.map((membership) => ({ ...membership, id: membership.id.toString() }));
  }

  async updateRole(locationId: string, actorId: string, membershipId: string, dto: UpdateMembershipRoleDto) {
    const membership = await this.loadInLocation(locationId, membershipId);
    if (membership.role === Role.OWNER) {
      throw new ConflictError("The owner's membership can't be changed here");
    }
    assertCanManage(await roleAt(this.prisma, actorId, locationId), membership.role, dto.role);

    const updated = await this.prisma.membership.update({
      where: { id: membership.id },
      data: { role: dto.role },
      include: { user: { select: { id: true, email: true, name: true } } },
    });
    return { ...updated, id: updated.id.toString() };
  }

  async remove(locationId: string, actorId: string, membershipId: string) {
    const membership = await this.loadInLocation(locationId, membershipId);
    if (membership.role === Role.OWNER) {
      throw new ConflictError("The owner's membership can't be removed");
    }
    assertCanManage(await roleAt(this.prisma, actorId, locationId), membership.role);

    await this.prisma.membership.delete({ where: { id: membership.id } });
  }

  private async loadInLocation(locationId: string, membershipId: string) {
    const id = parseBigIntId(membershipId, "Membership");
    const membership = await this.prisma.membership.findFirst({ where: { id, locationId } });
    if (!membership) {
      throw new NotFoundError("Membership not found");
    }
    return membership;
  }
}
