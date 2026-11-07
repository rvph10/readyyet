import { Injectable } from "@nestjs/common";
import { Prisma, Role } from "@readyyet/db";
import { ConflictError, NotFoundError } from "../common/errors/app-error";
import { parseBigIntId } from "../common/parse-bigint-id";
import { PrismaService } from "../database/prisma.service";
import { publicImageUrl } from "../storage/image";
import { UpdateMembershipRoleDto } from "./dto/update-membership-role.dto";
import { assertCanManage, roleAt } from "./team-rules";

const MEMBER_INCLUDE = { user: { select: { id: true, email: true, name: true, image: true } } } as const;

function toMember({
  user: { image, ...user },
  ...membership
}: Prisma.MembershipGetPayload<{ include: typeof MEMBER_INCLUDE }>) {
  return { ...membership, id: membership.id.toString(), user: { ...user, avatarUrl: publicImageUrl(image) } };
}

@Injectable()
export class MembershipService {
  constructor(private readonly prisma: PrismaService) {}

  async list(locationId: string) {
    const memberships = await this.prisma.membership.findMany({
      where: { locationId },
      include: MEMBER_INCLUDE,
      orderBy: { createdAt: "asc" },
    });
    return memberships.map(toMember);
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
      include: MEMBER_INCLUDE,
    });
    return toMember(updated);
  }

  async remove(locationId: string, actorId: string, membershipId: string) {
    const membership = await this.loadInLocation(locationId, membershipId);
    if (membership.role === Role.OWNER) {
      throw new ConflictError("The owner's membership can't be removed");
    }
    assertCanManage(await roleAt(this.prisma, actorId, locationId), membership.role);

    await this.prisma.membership.delete({ where: { id: membership.id } });
  }

  async leave(locationId: string, userId: string) {
    if ((await roleAt(this.prisma, userId, locationId)) === Role.OWNER) {
      throw new ConflictError("The owner can't leave, transfer ownership of the business first");
    }
    await this.prisma.membership.delete({ where: { userId_locationId: { userId, locationId } } });
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
