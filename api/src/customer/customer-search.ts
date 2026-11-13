import { PrismaService } from "../database/prisma.service";
import { escapeLike } from "../common/like-pattern";

// Prisma's contains can't call unaccent, and a counter types "Lea" for Léa: a
// Customer not found here is entered again, as a second record. Scoped to one
// Location, so a scan is fine and no index is needed.
export async function customerIdsNamed(prisma: PrismaService, locationId: string, q: string) {
  const pattern = `%${escapeLike(q)}%`;
  const customers = await prisma.$queryRaw<{ id: bigint }[]>`
    SELECT id FROM customer
    WHERE location_id = ${locationId}::uuid
      AND deleted_at IS NULL
      AND unaccent(full_name) ILIKE unaccent(${pattern})`;
  return customers.map(({ id }) => id);
}

// For finding one Customer: by their name, or the email or phone they give at
// the counter. An erased Customer's fields are placeholders, not searchable.
export async function customerIdsMatching(prisma: PrismaService, locationId: string, q: string) {
  const pattern = `%${escapeLike(q)}%`;
  const digits = phoneDigits(q);
  const phonePattern = digits && `%${digits}%`;
  const customers = await prisma.$queryRaw<{ id: bigint }[]>`
    SELECT id FROM customer
    WHERE location_id = ${locationId}::uuid
      AND deleted_at IS NULL
      AND (
        unaccent(full_name) ILIKE unaccent(${pattern})
        OR email ILIKE ${pattern}
        OR phone LIKE ${phonePattern}
      )`;
  return customers.map(({ id }) => id);
}

// Phones are stored international, +32470123456, while the number in front of
// staff reads 0470 12 34 56. Null when the search isn't a number.
export function phoneDigits(q: string) {
  if (!/^[+\d\s()./-]+$/.test(q)) {
    return null;
  }
  return q.replace(/\D/g, "").replace(/^0+/, "") || null;
}
