import { Injectable } from "@nestjs/common";
import { ConflictError, ReauthenticationRequiredError } from "../common/errors/app-error";
import { PrismaService } from "../database/prisma.service";
import { EmailService } from "../email/email.service";
import { buildAccountDeletedEmail } from "../notification/staff-email/staff-email";
import { UpdateMeDto } from "./dto/update-me.dto";

// Deleting an account is refused past this long after signing in, so an
// unlocked shop computer isn't enough to wipe someone's account.
const RECENT_SIGN_IN_MS = 10 * 60 * 1000;

@Injectable()
export class MeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
  ) {}

  async getMemberships(userId: string) {
    return this.prisma.membership.findMany({
      where: { userId, location: { deletedAt: null } },
      select: {
        role: true,
        location: {
          select: {
            id: true,
            name: true,
            business: { select: { id: true, name: true } },
          },
        },
      },
    });
  }

  async update(userId: string, dto: UpdateMeDto) {
    const user = await this.prisma.user.update({ where: { id: userId }, data: { locale: dto.locale } });
    return { id: user.id, email: user.email, name: user.name, locale: user.locale };
  }

  // ADR 0018: anonymised, not deleted, tickets and invitations keep
  // pointing at this row. Only what identifies the person goes.
  async remove(userId: string, signedInAt: Date) {
    if (Date.now() - signedInAt.getTime() > RECENT_SIGN_IN_MS) {
      throw new ReauthenticationRequiredError("Sign in again to delete your account");
    }
    const ownsLiveBusiness = await this.prisma.business.count({
      where: { ownerId: userId, locations: { some: { deletedAt: null } } },
    });
    if (ownsLiveBusiness) {
      throw new ConflictError("Transfer your business or delete its locations before deleting your account");
    }

    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: {
          name: "Former member",
          // The reserved .invalid domain can never receive mail, and the
          // id keeps it unique. The address is free for a new account.
          email: `deleted-${userId}@deleted.invalid`,
          image: null,
          emailVerified: false,
          deletedAt: new Date(),
        },
      }),
      this.prisma.session.deleteMany({ where: { userId } }),
      this.prisma.account.deleteMany({ where: { userId } }),
      this.prisma.membership.deleteMany({ where: { userId } }),
      // A code already sent to the address would otherwise still sign in,
      // into a brand new account, fine, but not what was asked.
      this.prisma.verification.deleteMany({ where: { identifier: `sign-in-otp-${user.email}` } }),
    ]);

    // After the commit, to the address the account had.
    const { subject, react } = buildAccountDeletedEmail({ locale: user.locale, email: user.email });
    await this.email.send({
      to: user.email,
      subject,
      react,
      type: "account_deleted",
      replyTo: process.env.SUPPORT_EMAIL,
    });
  }
}
