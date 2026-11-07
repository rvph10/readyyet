import { Injectable } from "@nestjs/common";
import type { Prisma } from "@readyyet/db";
import { commissionState, commissionStateWhere, commissionWindowEnd } from "../billing/commission";
import { ConflictError, UnauthorizedError } from "../common/errors/app-error";
import { PrismaService } from "../database/prisma.service";
import {
  AdminCommissionDto,
  AdminCommissionPageDto,
  AdminListCommissionsQueryDto,
  CommissionPageDto,
  ListCommissionsQueryDto,
  SalesPartnerOverviewDto,
} from "./dto/commission.dto";

const DEFAULT_LIST_TAKE = 20;

const commissionSelect = {
  id: true,
  invoicePaidAt: true,
  amount: true,
  voidedAt: true,
  paidAt: true,
} as const;

const adminCommissionSelect = {
  ...commissionSelect,
  stripeInvoiceId: true,
  salesPartner: { select: { id: true, name: true, email: true } },
  business: { select: { id: true, name: true } },
} as const;

type AdminCommissionRow = Prisma.CommissionGetPayload<{ select: typeof adminCommissionSelect }>;

function toAdminCommission({ voidedAt, ...row }: AdminCommissionRow, now: Date): AdminCommissionDto {
  return { ...row, id: row.id.toString(), state: commissionState({ ...row, voidedAt }, now) };
}

@Injectable()
export class CommissionService {
  constructor(private readonly prisma: PrismaService) {}

  // The sales partner's page (ADR 0032).
  async overview(userId: string): Promise<SalesPartnerOverviewDto> {
    const user = await this.loadSalesPartner(userId);
    const [businesses, commissions] = await Promise.all([
      this.prisma.business.findMany({
        where: { referredBySalesPartnerId: userId },
        orderBy: { createdAt: "asc" },
        select: { name: true, paidFrom: true },
      }),
      this.prisma.commission.findMany({
        where: { salesPartnerId: userId, voidedAt: null },
        orderBy: { invoicePaidAt: "desc" },
        select: commissionSelect,
      }),
    ]);

    const now = new Date();
    const totals = { PENDING: 0, OWED: 0, PAID: 0, VOIDED: 0 };
    const months = new Map<string, number>();
    for (const commission of commissions) {
      totals[commissionState(commission, now)] += commission.amount;
      const month = commission.invoicePaidAt.toISOString().slice(0, 7);
      months.set(month, (months.get(month) ?? 0) + commission.amount);
    }
    return {
      referralCode: user.referralCode!,
      salesPartner: user.salesPartnerSince !== null,
      businesses: businesses.map(({ name, paidFrom }) => ({
        name,
        paidFrom,
        commissionsEndAt: paidFrom && commissionWindowEnd(paidFrom),
      })),
      monthlyTotals: [...months].map(([month, amount]) => ({ month, amount })),
      pendingAmount: totals.PENDING,
      owedAmount: totals.OWED,
      paidAmount: totals.PAID,
    };
  }

  // Only the Business's name, its sales partner sees nothing else of it.
  async listForSalesPartner(userId: string, query: ListCommissionsQueryDto): Promise<CommissionPageDto> {
    await this.loadSalesPartner(userId);
    const { items, nextCursor } = await this.page({ salesPartnerId: userId }, query);
    const now = new Date();
    return {
      items: items.map((row) => {
        const { id, business, invoicePaidAt, amount, state, paidAt } = toAdminCommission(row, now);
        return { id, business: { name: business.name }, invoicePaidAt, amount, state, paidAt };
      }),
      nextCursor,
    };
  }

  async listForAdmin(query: AdminListCommissionsQueryDto): Promise<AdminCommissionPageDto> {
    const where = {
      ...(query.salesPartnerId && { salesPartnerId: query.salesPartnerId }),
      ...(query.state && commissionStateWhere(query.state)),
    };
    const { items, nextCursor } = await this.page(where, query);
    const now = new Date();
    return { items: items.map((row) => toAdminCommission(row, now)), nextCursor };
  }

  // Only commissions owed right now, all or none: one that was voided or
  // paid since the list was loaded refuses the whole request.
  async markPaid(commissionIds: string[]): Promise<AdminCommissionDto[]> {
    const ids = [...new Set(commissionIds)].map((id) => BigInt(id));
    const rows = await this.prisma.$transaction(async (tx) => {
      const { count } = await tx.commission.updateMany({
        where: { id: { in: ids }, ...commissionStateWhere("OWED") },
        data: { paidAt: new Date() },
      });
      if (count !== ids.length) {
        throw new ConflictError("Only owed commissions can be marked paid, reload the list and try again");
      }
      return tx.commission.findMany({
        where: { id: { in: ids } },
        orderBy: { id: "desc" },
        select: adminCommissionSelect,
      });
    });
    const now = new Date();
    return rows.map((row) => toAdminCommission(row, now));
  }

  // Pending and owed amounts per sales partner, for the admin's list.
  async totalsBySalesPartner(salesPartnerIds: string[]) {
    const now = new Date();
    const [pending, owed] = await Promise.all(
      (["PENDING", "OWED"] as const).map((state) =>
        this.prisma.commission.groupBy({
          by: ["salesPartnerId"],
          where: { salesPartnerId: { in: salesPartnerIds }, ...commissionStateWhere(state, now) },
          _sum: { amount: true },
        }),
      ),
    );
    const sum = (rows: typeof pending, id: string) => rows.find((row) => row.salesPartnerId === id)?._sum.amount ?? 0;
    return new Map(salesPartnerIds.map((id) => [id, { pendingAmount: sum(pending, id), owedAmount: sum(owed, id) }]));
  }

  // Anyone ever marked, a code is only given then. Someone whose status was
  // removed still sees what they're owed.
  private async loadSalesPartner(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (!user.referralCode) {
      throw new UnauthorizedError("Only a sales partner has this page");
    }
    return user;
  }

  // Newest first, by id: commissions are recorded as their invoices are paid.
  private async page(where: Prisma.CommissionWhereInput, query: ListCommissionsQueryDto) {
    const take = query.take ?? DEFAULT_LIST_TAKE;
    const rows = await this.prisma.commission.findMany({
      where: { ...where, ...(query.cursor && { id: { lt: BigInt(query.cursor) } }) },
      orderBy: { id: "desc" },
      // One extra row says whether there's a next page.
      take: take + 1,
      select: adminCommissionSelect,
    });
    const items = rows.slice(0, take);
    return { items, nextCursor: rows.length > take ? items[items.length - 1].id.toString() : null };
  }
}
