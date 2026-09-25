import { IsEmail } from "class-validator";

export class MarkSalesPartnerDto {
  @IsEmail()
  email!: string;
}

export class SalesPartnerDto {
  id!: string;
  name!: string;
  email!: string;
  salesPartnerSince!: Date;
  referralCode!: string;
  // In cents (ADR 0040).
  pendingAmount!: number;
  owedAmount!: number;
}
