import type { PrismaClient } from "../generated/client/index.js";

/**
 * Minimal fixture data shared by the schema invariant tests: one user,
 * one business type with a default workflow, two locations (so
 * cross-location tests have something to violate), and one customer per
 * location.
 */
export async function seedFixtures(db: PrismaClient) {
  const user = await db.user.create({
    data: { id: "user_1", email: "owner@example.com" },
  });

  const status = await db.status.create({
    data: { code: "RECEIVED" },
  });
  const otherStatus = await db.status.create({
    data: { code: "DONE" },
  });

  const businessType = await db.businessType.create({
    data: { code: "GARAGE" },
  });

  const defaultWorkflow = await db.workflow.create({
    data: {
      businessTypeId: businessType.id,
      name: "Default garage workflow",
      steps: {
        create: [{ position: 1, statusId: status.id }],
      },
    },
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
    },
  });
  const locationB = await db.location.create({
    data: {
      businessId: business.id,
      businessTypeId: businessType.id,
      name: "Location B",
      contactPhone: "+10000000001",
      contactEmail: "b@example.com",
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
