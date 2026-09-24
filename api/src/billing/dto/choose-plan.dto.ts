import { ApiProperty } from "@nestjs/swagger";
import { BillingInterval, Plan } from "@readyyet/db";
import { IsEnum } from "class-validator";

export class ChoosePlanDto {
  @ApiProperty({ enum: Plan })
  @IsEnum(Plan)
  plan!: Plan;

  @ApiProperty({ enum: BillingInterval })
  @IsEnum(BillingInterval)
  interval!: BillingInterval;
}
