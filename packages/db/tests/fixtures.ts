import type { PrismaClient } from "../generated/client/index.js";
import { seedCatalogue } from "../prisma/catalogue.js";

/**
 * Seeds the real status/business-type/default-workflow catalogue (same
 * code path as prisma/seed.ts, so these tests also cover the seed logic
 * itself), then layers minimal ticket-level fixtures on top: one user,
 * two locations under one GARAGE business (so cross-location tests have
 * something to violate), and one customer per location.
 */
export async function seedFixtures(db: PrismaClient) {
  await seedCatalogue(db);

  const user = await db.user.create({
    data: { id: "user_1", email: "owner@example.com", name: "Test Owner" },
  });

  const businessType = await db.businessType.findUniqueOrThrow({
    where: { code: "GARAGE" },
  });
  const status = await db.status.findUniqueOrThrow({ where: { code: "RECEIVED" } });
  // CLEANING belongs to PRESSING's default workflow, not GARAGE's, so it's
  // guaranteed not to be a step of `defaultWorkflow` below.
  const otherStatus = await db.status.findUniqueOrThrow({ where: { code: "CLEANING" } });
  const defaultWorkflow = await db.workflow.findFirstOrThrow({
    where: { businessTypeId: businessType.id, locationId: null, isActive: true },
  });

  const business = await db.business.create({
    data: { ownerId: user.id, name: "Test Business" },
  });

  const locationA = await db.location.create({
    data: {
      businessId: business.id,
      businessTypeId: businessType.id,
      name: "Location A",
      contactPhone: "+10000000000",
      contactEmail: "a@example.com",
      locale: "EN",
      timeZone: "Europe/Brussels",
    },
  });
  const locationB = await db.location.create({
    data: {
      businessId: business.id,
      businessTypeId: businessType.id,
      name: "Location B",
      contactPhone: "+10000000001",
      contactEmail: "b@example.com",
      locale: "EN",
      timeZone: "Europe/Brussels",
    },
  });

  const customerA = await db.customer.create({
    data: { locationId: locationA.id, fullName: "Customer A" },
  });
  const customerB = await db.customer.create({
    data: { locationId: locationB.id, fullName: "Customer B" },
  });

  return {
    user,
    status,
    otherStatus,
    businessType,
    defaultWorkflow,
    business,
    locationA,
    locationB,
    customerA,
    customerB,
  };
}
