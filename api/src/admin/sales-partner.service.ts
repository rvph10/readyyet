import { Injectable } from "@nestjs/common";
import { generateReferralCode } from "../business/referral-code";
import { ConflictError, NotFoundError } from "../common/errors/app-error";
import { PrismaService } from "../database/prisma.service";
import { SalesPartnerDto } from "./dto/sales-partner.dto";

const salesPartnerSelect = { id: true, name: true, email: true, salesPartnerSince: true, referralCode: true } as const;

@Injectable()
export class SalesPartnerService {
  constructor(private readonly prisma: PrismaService) {}

  async list(): Promise<SalesPartnerDto[]> {
    return (await this.prisma.user.findMany({
      where: { salesPartnerSince: { not: null } },
      orderBy: { salesPartnerSince: "asc" },
      select: salesPartnerSelect,
    })) as SalesPartnerDto[];
  }

  async mark(email: string): Promise<SalesPartnerDto> {
    const user = await this.prisma.user.findFirst({ where: { email: { equals: email, mode: "insensitive" } } });
    if (!user || user.deletedAt) {
      throw new NotFoundError("No account uses this email");
    }
    // Conditional, so marking twice at once can't give out two codes.
    const { count } = await this.prisma.user.updateMany({
      where: { id: user.id, salesPartnerSince: null },
      // Someone marked again keeps the link they already shared (ADR 0040).
      data: { salesPartnerSince: new Date(), referralCode: user.referralCode ?? generateReferralCode() },
    });
    if (count === 0) {
      throw new ConflictError("This user is already a sales partner");
    }
    return (await this.prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      select: salesPartnerSelect,
    })) as SalesPartnerDto;
  }

  // Commissions already recorded stay, invoices paid from now on earn
  // nothing (ADR 0040).
  async remove(userId: string) {
    const { count } = await this.prisma.user.updateMany({
      where: { id: userId, salesPartnerSince: { not: null } },
      data: { salesPartnerSince: null },
    });
    if (count === 0) {
      throw new NotFoundError("Sales partner not found");
    }
  }
}
