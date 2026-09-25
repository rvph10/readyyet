import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { ArrayMaxSize, ArrayNotEmpty, IsArray, IsIn, IsInt, IsOptional, IsString, Max, Min } from "class-validator";
import { COMMISSION_STATES, type CommissionState } from "../../billing/commission";
import { IsBigIntId } from "../../common/parse-bigint-id";

export class ListCommissionsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  take?: number;

  // Opaque, the nextCursor of the previous page.
  @IsOptional()
  @IsBigIntId()
  cursor?: string;
}

export class AdminListCommissionsQueryDto extends ListCommissionsQueryDto {
  @ApiProperty({ enum: COMMISSION_STATES, required: false })
  @IsOptional()
  @IsIn(COMMISSION_STATES)
  state?: CommissionState;

  @IsOptional()
  @IsString()
  salesPartnerId?: string;
}

export class MarkCommissionsPaidDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(500)
  @IsBigIntId({ each: true })
  commissionIds!: string[];
}

export class CommissionBusinessDto {
  name!: string;
}

export class CommissionDto {
  id!: string;
  business!: CommissionBusinessDto;
  invoicePaidAt!: Date;
  // In cents.
  amount!: number;
  // Pending for 14 days after the invoice was paid, then owed (ADR 0040).
  @ApiProperty({ enum: COMMISSION_STATES })
  state!: CommissionState;
  paidAt!: Date | null;
}

export class CommissionPageDto {
  items!: CommissionDto[];
  // Pass as ?cursor= for the next page, null on the last one.
  nextCursor!: string | null;
}

export class CommissionSalesPartnerDto {
  id!: string;
  name!: string;
  email!: string;
}

export class AdminCommissionBusinessDto {
  id!: string;
  name!: string;
}

export class AdminCommissionDto {
  id!: string;
  salesPartner!: CommissionSalesPartnerDto;
  business!: AdminCommissionBusinessDto;
  stripeInvoiceId!: string;
  invoicePaidAt!: Date;
  amount!: number;
  @ApiProperty({ enum: COMMISSION_STATES })
  state!: CommissionState;
  paidAt!: Date | null;
}

export class AdminCommissionPageDto {
  items!: AdminCommissionDto[];
  nextCursor!: string | null;
}

export class ReferredBusinessDto {
  name!: string;
  // Where its first paid period started, null until it pays.
  paidFrom!: Date | null;
  // Invoices for periods after this earn nothing.
  commissionsEndAt!: Date | null;
}

export class MonthlyTotalDto {
  // YYYY-MM, the UTC month the invoices were paid in.
  month!: string;
  amount!: number;
}

export class SalesPartnerOverviewDto {
  referralCode!: string;
  // False once the platform admin removed the status, what's owed stays.
  salesPartner!: boolean;
  businesses!: ReferredBusinessDto[];
  // In cents, voided commissions left out.
  monthlyTotals!: MonthlyTotalDto[];
  pendingAmount!: number;
  owedAmount!: number;
  paidAmount!: number;
}
