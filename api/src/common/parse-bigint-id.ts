import { buildMessage, ValidateBy, type ValidationOptions } from "class-validator";
import { NotFoundError } from "./errors/app-error";

// Postgres bigint's maximum: a larger id would reach Prisma and fail there
// as a 500 instead of being rejected here.
const MAX_BIGINT_ID = 9223372036854775807n;

export function isBigIntId(value: string): boolean {
  return /^\d{1,19}$/.test(value) && BigInt(value) <= MAX_BIGINT_ID;
}

// Route params arrive as strings; a value that can't be an id should 404
// (the resource doesn't exist), not reach Prisma and surface a raw DB error.
export function parseBigIntId(value: string, resourceName: string): bigint {
  if (!isBigIntId(value)) {
    throw new NotFoundError(`${resourceName} not found`);
  }
  return BigInt(value);
}

// The same check for an id sent in a body or query string.
export function IsBigIntId(options?: ValidationOptions) {
  return ValidateBy(
    {
      name: "isBigIntId",
      validator: {
        validate: (value) => typeof value === "string" && isBigIntId(value),
        defaultMessage: buildMessage((eachPrefix) => `${eachPrefix}$property must be a numeric id`),
      },
    },
    options,
  );
}
