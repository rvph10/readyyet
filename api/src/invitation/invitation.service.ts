import { Injectable, Logger } from "@nestjs/common";
import { InvitationStatus, Prisma } from "@readyyet/db";
import type { Invitation, User } from "@readyyet/db";
import { isUUID } from "class-validator";
import { ConflictError, NotFoundError, UnauthorizedError } from "../common/errors/app-error";
import { PrismaService } from "../database/prisma.service";
import { EmailService } from "../email/email.service";
import { assertCanManage, roleAt } from "../membership/team-rules";
import { CreateInvitationDto } from "./dto/create-invitation.dto";

const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

@Injectable()
export class InvitationService {
  private readonly logger = new Logger(InvitationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
  ) {}

  async create(locationId: string, inviterId: string, dto: CreateInvitationDto) {
    assertCanManage(await roleAt(this.prisma, inviterId, locationId), dto.role);

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

    let invitation: Invitation;
    try {
      invitation = await this.prisma.invitation.create({
        data: {
          locationId,
          email: dto.email,
          role: dto.role,
          invitedBy: inviterId,
          expiresAt: new Date(Date.now() + INVITATION_TTL_MS),
        },
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

    return invitation;
  }

  async list(locationId: string) {
    return this.prisma.invitation.findMany({ where: { locationId }, orderBy: { createdAt: "desc" } });
  }

  async revoke(locationId: string, actorId: string, invitationId: string) {
    const invitation = await this.loadInLocation(locationId, invitationId);
    assertCanManage(await roleAt(this.prisma, actorId, locationId), invitation.role);
    if (invitation.status !== InvitationStatus.PENDING) {
      throw new ConflictError("Only a pending invitation can be revoked");
    }

    return this.prisma.invitation.update({
      where: { id: invitationId },
      data: { status: InvitationStatus.REVOKED },
    });
  }

  // Sends the same link again and gives it a fresh 7 days (ADR 0017).
  async resend(locationId: string, actorId: string, invitationId: string) {
    const invitation = await this.loadInLocation(locationId, invitationId);
    assertCanManage(await roleAt(this.prisma, actorId, locationId), invitation.role);
    if (invitation.status !== InvitationStatus.PENDING || invitation.expiresAt < new Date()) {
      throw new ConflictError("Only a pending invitation can be resent, send a new one instead");
    }

    const updated = await this.prisma.invitation.update({
      where: { id: invitation.id },
      data: { expiresAt: new Date(Date.now() + INVITATION_TTL_MS) },
    });
    this.sendInviteEmail(updated).catch((err) => {
      this.logger.error(`Failed to resend invitation email for ${updated.id}`, err instanceof Error ? err.stack : err);
    });
    return updated;
  }

  async accept(invitationId: string, user: User) {
    if (!isUUID(invitationId)) {
      throw new NotFoundError("Invitation not found");
    }
    const invitation = await this.prisma.invitation.findUnique({ where: { id: invitationId } });
    if (!invitation) {
      throw new NotFoundError("Invitation not found");
    }
    if (invitation.email.toLowerCase() !== user.email.toLowerCase()) {
      throw new UnauthorizedError("This invitation was not sent to your account's email address");
    }

    if (invitation.status === InvitationStatus.PENDING && invitation.expiresAt < new Date()) {
      await this.prisma.invitation.update({ where: { id: invitationId }, data: { status: InvitationStatus.EXPIRED } });
      throw new ConflictError("This invitation has expired");
    }
    if (invitation.status !== InvitationStatus.PENDING) {
      throw new ConflictError("This invitation is no longer pending");
    }

    return this.prisma.$transaction(async (tx) => {
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
    const link = `${process.env.WEB_URL}/invitations/${invitation.id}`;
    await this.email.send({
      to: invitation.email,
      subject: "You've been invited to join a team on ReadyYet",
      type: "invitation",
      html: `<p>You've been invited to join a location on ReadyYet as ${invitation.role}.</p><p><a href="${link}">Accept the invitation</a></p>`,
      text: `You've been invited to join a location on ReadyYet as ${invitation.role}. Accept it here: ${link}`,
    });
  }
}
