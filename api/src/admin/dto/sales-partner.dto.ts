import { IsEmail } from "class-validator";

export class MarkSalesPartnerDto {
  @IsEmail()
  email!: string;
}

export class SalesPartnerDto {
  id!: string;
  name!: string;
  email!: string;
  // Null for a former sales partner, listed while still owed.
  salesPartnerSince!: Date | null;
  referralCode!: string;
  // In cents (ADR 0040).
  pendingAmount!: number;
  owedAmount!: number;
}
