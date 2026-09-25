import { ApiProperty } from "@nestjs/swagger";
import { BillingInterval, Plan } from "@readyyet/db";
import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";

export class ChoosePlanDto {
  @ApiProperty({ enum: Plan })
  @IsEnum(Plan)
  plan!: Plan;

  @ApiProperty({ enum: BillingInterval })
  @IsEnum(BillingInterval)
  interval!: BillingInterval;
}

export class CheckoutDto extends ChoosePlanDto {
  // A campaign's Stripe promotion code, it replaces the referral discount
  // (ADR 0040).
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  promotionCode?: string;
}
