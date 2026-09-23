import { NotFoundError } from "./errors/app-error";

// Route params arrive as strings; a non-numeric id should 404 (the
// resource doesn't exist), not reach Prisma and surface a raw DB error.
export function parseBigIntId(value: string, resourceName: string): bigint {
  if (!/^\d+$/.test(value)) {
    throw new NotFoundError(`${resourceName} not found`);
  }
  return BigInt(value);
}
