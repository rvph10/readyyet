import { ApiProperty } from "@nestjs/swagger";
import { Locale } from "@readyyet/db";

export class CustomerDto {
  id!: string;
  fullName!: string;
  email!: string | null;
  phone!: string | null;
  // null means the Location's own locale applies (ADR 0015).
  @ApiProperty({ enum: Locale, nullable: true })
  locale!: Locale | null;
  emailBouncedAt!: Date | null;
  emailComplainedAt!: Date | null;
  createdAt!: Date;
}
