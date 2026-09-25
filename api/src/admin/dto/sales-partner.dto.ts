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
}
