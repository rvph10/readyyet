import { Injectable, Logger } from "@nestjs/common";
import { InvitationStatus, Prisma } from "@readyyet/db";
import type { Invitation, User } from "@readyyet/db";
import { isUUID } from "class-validator";
import { BillingService } from "../billing/billing.service";
import { ConflictError, NotFoundError, UnauthorizedError } from "../common/errors/app-error";
import { PrismaService } from "../database/prisma.service";
import { EmailService } from "../email/email.service";
import { assertCanManage, roleAt } from "../membership/team-rules";
import {
  buildInvitationEmail,
  buildJoinedTeamEmail,
  buildMemberJoinedEmail,
} from "../notification/staff-email/staff-email";
import { publicImageUrl } from "../storage/image";
import { CreateInvitationDto } from "./dto/create-invitation.dto";

// Who sent it, for the dashboard, rather than a bare user id.
const INVITATION_INCLUDE = { include: { inviter: { select: { id: true, name: true } } } } as const;

// What an invitee is shown of the invitation, before accepting it.
const DETAILS_INCLUDE = {
  include: {
    inviter: { select: { id: true, name: true } },
    location: {
      select: { id: true, name: true, deletedAt: true, business: { select: { id: true, name: true, logoKey: true } } },
    },
  },
} as const;

type InvitationDetails = Prisma.InvitationGetPayload<typeof DETAILS_INCLUDE>;

const DAY_MS = 24 * 60 * 60 * 1000;
const INVITATION_TTL_MS = 7 * DAY_MS;

@Injectable()
export class InvitationService {
  private readonly logger = new Logger(InvitationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
    private readonly billing: BillingService,
  ) {}

  async create(locationId: string, inviterId: string, dto: CreateInvitationDto) {
    assertCanManage(await roleAt(this.prisma, inviterId, locationId), dto.role);
    await this.billing.assertRoomForMember(locationId);

    const existingUser = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existingUser) {
      const existingMembership = await this.prisma.membership.findUnique({
        where: { userId_locationId: { userId: existingUser.id, locationId } },
      });
      if (existingMembership) {
        throw new ConflictError("This person is already a member of this location");
      }
    }

    // Expiry is otherwise only recorded on accept, and a stale PENDING row
    // would keep the one-pending-per-email index from allowing this one.
    await this.prisma.invitation.updateMany({
      where: {
        locationId,
        email: { equals: dto.email, mode: "insensitive" },
        status: InvitationStatus.PENDING,
        expiresAt: { lt: new Date() },
      },
      data: { status: InvitationStatus.EXPIRED },
    });

    let invitation: Invitation & { inviter: { id: string; name: string } };
    try {
      invitation = await this.prisma.invitation.create({
        data: {
          locationId,
          email: dto.email,
          role: dto.role,
          invitedBy: inviterId,
          expiresAt: new Date(Date.now() + INVITATION_TTL_MS),
        },
        ...INVITATION_INCLUDE,
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        throw new ConflictError("An invitation is already pending for this email at this location");
      }
      throw err;
    }

    this.sendInviteEmail(invitation).catch((err) => {
      this.logger.error(`Failed to send invitation email for ${invitation.id}`, err instanceof Error ? err.stack : err);
    });

    return serialize(invitation);
  }

  async list(locationId: string) {
    const invitations = await this.prisma.invitation.findMany({
      where: { locationId },
      orderBy: { createdAt: "desc" },
      ...INVITATION_INCLUDE,
    });
    return invitations.map(serialize);
  }

  async revoke(locationId: string, actorId: string, invitationId: string) {
    const invitation = await this.loadInLocation(locationId, invitationId);
    assertCanManage(await roleAt(this.prisma, actorId, locationId), invitation.role);
    if (invitation.status !== InvitationStatus.PENDING) {
      throw new ConflictError("Only a pending invitation can be revoked");
    }

    const revoked = await this.prisma.invitation.update({
      where: { id: invitationId },
      data: { status: InvitationStatus.REVOKED },
      ...INVITATION_INCLUDE,
    });
    return serialize(revoked);
  }

  // Sends the same link again and gives it a fresh 7 days (ADR 0017).
  async resend(locationId: string, actorId: string, invitationId: string) {
    const invitation = await this.loadInLocation(locationId, invitationId);
    assertCanManage(await roleAt(this.prisma, actorId, locationId), invitation.role);
    if (invitation.status !== InvitationStatus.PENDING || invitation.expiresAt < new Date()) {
      throw new ConflictError("Only a pending invitation can be resent, send a new one instead");
    }
    // Already counted in the member limit, only the freeze applies.
    await this.billing.assertNotFrozen(locationId);

    const updated = await this.prisma.invitation.update({
      where: { id: invitation.id },
      data: { expiresAt: new Date(Date.now() + INVITATION_TTL_MS) },
      ...INVITATION_INCLUDE,
    });
    this.sendInviteEmail(updated).catch((err) => {
      this.logger.error(`Failed to resend invitation email for ${updated.id}`, err instanceof Error ? err.stack : err);
    });
    return serialize(updated);
  }

  // Public: the page an invitation link opens shows it before sign-in.
  async preview(invitationId: string) {
    return toPreview(await this.loadDetails(invitationId));
  }

  async findForInvitee(invitationId: string, user: User) {
    const invitation = await this.loadForInvitee(invitationId, user);
    // Only someone who can still join sees who works there: a revoked invitee
    // or a removed employee keeps the link, not the team.
    if (invitation.status !== InvitationStatus.PENDING || invitation.expiresAt < new Date()) {
      return { ...toPreview(invitation), team: [] };
    }
    const memberships = await this.prisma.membership.findMany({
      where: { locationId: invitation.locationId },
      orderBy: { createdAt: "asc" },
      select: { user: { select: { id: true, name: true, image: true } } },
    });
    return {
      ...toPreview(invitation),
      team: memberships.map(({ user: { image, ...member } }) => ({ ...member, avatarUrl: publicImageUrl(image) })),
    };
  }

  // No one is told (ADR 0051): the Location's list of invitations shows it.
  async decline(invitationId: string, user: User) {
    const invitation = await this.loadForInvitee(invitationId, user);
    if (invitation.status !== InvitationStatus.PENDING || invitation.expiresAt < new Date()) {
      throw new ConflictError("This invitation is no longer pending");
    }
    const declined = await this.prisma.invitation.updateMany({
      where: { id: invitationId, status: InvitationStatus.PENDING },
      data: { status: InvitationStatus.DECLINED },
    });
    // Lost the race to an accept, a revoke or another decline.
    if (declined.count === 0) {
      throw new ConflictError("This invitation is no longer pending");
    }
  }

  async accept(invitationId: string, user: User) {
    const invitation = await this.loadForInvitee(invitationId, user);

    if (invitation.status === InvitationStatus.PENDING && invitation.expiresAt < new Date()) {
      await this.prisma.invitation.update({ where: { id: invitationId }, data: { status: InvitationStatus.EXPIRED } });
      throw new ConflictError("This invitation has expired");
    }
    if (invitation.status !== InvitationStatus.PENDING) {
      throw new ConflictError("This invitation is no longer pending");
    }

    const membership = await this.prisma.$transaction(async (tx) => {
      const accepted = await tx.invitation.updateMany({
        where: { id: invitationId, status: InvitationStatus.PENDING },
        data: { status: InvitationStatus.ACCEPTED, acceptedAt: new Date() },
      });
      // Lost the race to a concurrent accept of the same invitation.
      if (accepted.count === 0) {
        throw new ConflictError("This invitation is no longer pending");
      }

      try {
        // Membership.id is a BigInt, never returned raw before this,
        // Express's JSON serializer throws on it (same class of bug as
        // Ticket/Customer/Workflow ids).
        const membership = await tx.membership.create({
          data: { userId: user.id, locationId: invitation.locationId, role: invitation.role },
        });
        return { ...membership, id: membership.id.toString() };
      } catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
          throw new ConflictError("You are already a member of this location");
        }
        throw err;
      }
    });
    // Not awaited: joining shouldn't wait on two sends, which EmailService
    // records and retries on its own.
    this.sendJoinedEmails(invitation.id, user).catch((err) => {
      this.logger.error(
        `Failed to email about invitation ${invitation.id} being accepted`,
        err instanceof Error ? err.stack : err,
      );
    });
    return membership;
  }

  // ADR 0127: a welcome to the new member, and word to whoever invited them,
  // each in their own language.
  private async sendJoinedEmails(invitationId: string, member: User) {
    const { location, inviter, role } = await this.prisma.invitation.findUniqueOrThrow({
      where: { id: invitationId },
      include: { location: { include: { business: true } }, inviter: true },
    });
    const params = {
      member: member.name,
      memberEmail: member.email,
      location: location.name,
      business: location.business.name,
      role,
    };
    const locationUrl = `${process.env.WEB_URL}/locations/${location.id}`;
    await this.email.send({
      to: member.email,
      ...buildJoinedTeamEmail({ ...params, locale: member.locale, locationUrl }),
      type: "joined_team",
      dedupeKey: `joined_team:${invitationId}`,
    });
    if (!inviter.deletedAt) {
      await this.email.send({
        to: inviter.email,
        ...buildMemberJoinedEmail({ ...params, locale: inviter.locale, teamUrl: `${locationUrl}/team` }),
        type: "member_joined",
        dedupeKey: `member_joined:${invitationId}`,
      });
    }
  }

  private async loadDetails(invitationId: string) {
    if (!isUUID(invitationId)) {
      throw new NotFoundError("Invitation not found");
    }
    const invitation = await this.prisma.invitation.findUnique({ where: { id: invitationId }, ...DETAILS_INCLUDE });
    if (!invitation || invitation.location.deletedAt) {
      throw new NotFoundError("Invitation not found");
    }
    return invitation;
  }

  // Only the User it was sent to may read it in full, accept or decline it.
  private async loadForInvitee(invitationId: string, user: User) {
    const invitation = await this.loadDetails(invitationId);
    if (invitation.email.toLowerCase() !== user.email.toLowerCase()) {
      throw new UnauthorizedError("This invitation was not sent to your account's email address");
    }
    return invitation;
  }

  private async loadInLocation(locationId: string, invitationId: string) {
    // Invitation.id is a Postgres uuid column, a non-UUID value would
    // otherwise surface as a raw DB error, not a clean 404 (same reasoning
    // as LocationMembershipGuard's own isUUID check).
    if (!isUUID(invitationId)) {
      throw new NotFoundError("Invitation not found");
    }
    const invitation = await this.prisma.invitation.findFirst({ where: { id: invitationId, locationId } });
    if (!invitation) {
      throw new NotFoundError("Invitation not found");
    }
    return invitation;
  }

  private async sendInviteEmail(invitation: Invitation) {
    const { location, inviter } = await this.prisma.invitation.findUniqueOrThrow({
      where: { id: invitation.id },
      include: { location: { include: { business: true } }, inviter: true },
    });
    // The invitee's own language when they already have an account, the
    // Location's otherwise (ADR 0018).
    const invitee = await this.prisma.user.findFirst({
      where: { email: { equals: invitation.email, mode: "insensitive" } },
    });
    const { subject, react } = buildInvitationEmail({
      locale: invitee?.locale ?? location.locale,
      inviter: inviter.name,
      location: location.name,
      business: location.business.name,
      role: invitation.role,
      email: invitation.email,
      expiresInDays: Math.round((invitation.expiresAt.getTime() - Date.now()) / DAY_MS),
      acceptUrl: `${process.env.WEB_URL}/invitations/${invitation.id}`,
    });
    await this.email.send({
      to: invitation.email,
      subject,
      react,
      type: "invitation",
      invitationId: invitation.id,
      fromName: `${location.name} via ReadyYet`,
      // A question about the invitation goes to whoever sent it, or to the
      // shop once they deleted their account (ADR 0018).
      replyTo: inviter.deletedAt ? location.contactEmail : inviter.email,
    });
  }
}

function toPreview({ inviter, location, ...invitation }: InvitationDetails) {
  const lapsed = invitation.status === InvitationStatus.PENDING && invitation.expiresAt < new Date();
  const { logoKey, ...business } = location.business;
  return {
    id: invitation.id,
    email: invitation.email,
    role: invitation.role,
    status: lapsed ? InvitationStatus.EXPIRED : invitation.status,
    invitedBy: inviter,
    location: { id: location.id, name: location.name, business: { ...business, logoUrl: publicImageUrl(logoKey) } },
    expiresAt: invitation.expiresAt,
    createdAt: invitation.createdAt,
  };
}

function serialize({ inviter, ...invitation }: Invitation & { inviter: { id: string; name: string } }) {
  return { ...invitation, invitedBy: inviter };
}
