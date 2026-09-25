import { Injectable } from "@nestjs/common";
import { generateReferralCode } from "../business/referral-code";
import { ConflictError, NotFoundError } from "../common/errors/app-error";
import { PrismaService } from "../database/prisma.service";
import { CommissionService } from "./commission.service";
import { SalesPartnerDto } from "./dto/sales-partner.dto";

const salesPartnerSelect = { id: true, name: true, email: true, salesPartnerSince: true, referralCode: true } as const;

@Injectable()
export class SalesPartnerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly commissions: CommissionService,
  ) {}

  async list(): Promise<SalesPartnerDto[]> {
    return this.withTotals(
      await this.prisma.user.findMany({
        where: { salesPartnerSince: { not: null } },
        orderBy: { salesPartnerSince: "asc" },
        select: salesPartnerSelect,
      }),
    );
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
    const [salesPartner] = await this.withTotals([
      await this.prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: salesPartnerSelect }),
    ]);
    return salesPartner;
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

  private async withTotals(
    users: { id: string; name: string; email: string; salesPartnerSince: Date | null; referralCode: string | null }[],
  ): Promise<SalesPartnerDto[]> {
    const totals = await this.commissions.totalsBySalesPartner(users.map((user) => user.id));
    // Both set on every sales partner, the query only returns those.
    return users.map((user) => ({
      ...user,
      salesPartnerSince: user.salesPartnerSince!,
      referralCode: user.referralCode!,
      ...totals.get(user.id)!,
    }));
  }
}
