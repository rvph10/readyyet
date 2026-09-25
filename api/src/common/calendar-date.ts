import { applyDecorators } from "@nestjs/common";
import { ApiPropertyOptional } from "@nestjs/swagger";
import type { CalendarDate } from "@readyyet/shared";
import { buildMessage, ValidateBy } from "class-validator";

// A Postgres DATE comes back from Prisma as midnight UTC, and a date-only
// ISO string parses to midnight UTC, so the two convert without any zone.
export function toCalendarDate(date: Date | null): CalendarDate | null {
  return date && date.toISOString().slice(0, 10);
}

export function fromCalendarDate(date: CalendarDate): Date {
  return new Date(date);
}

// "YYYY-MM-DD" and a day that exists: new Date("2026-02-30") rolls over to
// March instead of failing.
function isCalendarDate(value: unknown): value is CalendarDate {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && toCalendarDate(new Date(value)) === value;
}

// An optional date field in a request body, null clears it.
export function IsOptionalCalendarDate() {
  return applyDecorators(
    ApiPropertyOptional({ type: String, format: "date", nullable: true }),
    ValidateBy({
      name: "isCalendarDate",
      validator: {
        validate: (value) => value === undefined || value === null || isCalendarDate(value),
        defaultMessage: buildMessage((eachPrefix) => `${eachPrefix}$property must be a date as YYYY-MM-DD`),
      },
    }),
  );
}
