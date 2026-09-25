import "dotenv/config";
import { beforeEach, describe, expect, it } from "vitest";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/client/index.js";
import { seedFixtures } from "./fixtures.js";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

beforeEach(async () => {
  await db.$executeRawUnsafe(`
    TRUNCATE TABLE
      business_type_translation, status_translation, membership, invitation,
      customer, ticket_status_event, ticket, workflow_step, workflow,
      subscription, location, business, business_type, status,
      session, account, verification, "user"
    RESTART IDENTITY CASCADE
  `);
});

describe("workflow scope (business type template XOR location custom)", () => {
  it("rejects a workflow with both business_type_id and location_id set", async () => {
    const f = await seedFixtures(db);
    await expect(
      db.workflow.create({
        data: {
          businessTypeId: f.businessType.id,
          locationId: f.locationA.id,
          name: "Invalid",
        },
      }),
    ).rejects.toThrow();
  });

  it("rejects a workflow with neither business_type_id nor location_id set", async () => {
    await seedFixtures(db);
    await expect(db.workflow.create({ data: { name: "Invalid" } })).rejects.toThrow();
  });
});

describe("one active workflow per scope", () => {
  it("rejects a second active default workflow for the same business type", async () => {
    const f = await seedFixtures(db);
    await expect(
      db.workflow.create({
        data: { businessTypeId: f.businessType.id, name: "Second default" },
      }),
    ).rejects.toThrow();
  });

  it("rejects a second active custom workflow for the same location", async () => {
    const f = await seedFixtures(db);
    await db.workflow.create({
      data: { locationId: f.locationA.id, name: "First custom" },
    });
    await expect(
      db.workflow.create({
        data: { locationId: f.locationA.id, name: "Second custom" },
      }),
    ).rejects.toThrow();
  });
});

describe("one pending invitation per email per location", () => {
  it("rejects a second pending invite to the same email at the same location", async () => {
    const f = await seedFixtures(db);
    await db.invitation.create({
      data: {
        locationId: f.locationA.id,
        email: "employee@example.com",
        role: "EMPLOYEE",
        invitedBy: f.user.id,
        expiresAt: new Date(Date.now() + 86_400_000),
      },
    });
    await expect(
      db.invitation.create({
        data: {
          locationId: f.locationA.id,
          email: "employee@example.com",
          role: "EMPLOYEE",
          invitedBy: f.user.id,
          expiresAt: new Date(Date.now() + 86_400_000),
        },
      }),
    ).rejects.toThrow();
  });
});

describe("tenant-scoped ticket references", () => {
  it("rejects a ticket whose customer belongs to a different location", async () => {
    const f = await seedFixtures(db);
    await expect(
      db.ticket.create({
        data: {
          locationId: f.locationA.id,
          customerId: f.customerB.id, // customer B belongs to location B
          workflowId: f.defaultWorkflow.id,
          currentStatusId: f.status.id,
          trackingCode: "code-1",
          title: "Cross-location ticket",
          createdBy: f.user.id,
        },
      }),
    ).rejects.toThrow();
  });

  it("rejects a ticket whose current status is not in its workflow", async () => {
    const f = await seedFixtures(db);
    await expect(
      db.ticket.create({
        data: {
          locationId: f.locationA.id,
          customerId: f.customerA.id,
          workflowId: f.defaultWorkflow.id,
          currentStatusId: f.otherStatus.id, // not a step of defaultWorkflow
          trackingCode: "code-2",
          title: "Invalid status ticket",
          createdBy: f.user.id,
        },
      }),
    ).rejects.toThrow();
  });

  it("accepts a ticket whose customer and status are valid for its location and workflow", async () => {
    const f = await seedFixtures(db);
    await expect(
      db.ticket.create({
        data: {
          locationId: f.locationA.id,
          customerId: f.customerA.id,
          workflowId: f.defaultWorkflow.id,
          currentStatusId: f.status.id,
          trackingCode: "code-3",
          title: "Valid ticket",
          createdBy: f.user.id,
        },
      }),
    ).resolves.toBeDefined();
  });

  it("rejects a status event whose status is not in the ticket's workflow", async () => {
    const f = await seedFixtures(db);
    const ticket = await db.ticket.create({
      data: {
        locationId: f.locationA.id,
        customerId: f.customerA.id,
        workflowId: f.defaultWorkflow.id,
        currentStatusId: f.status.id,
        trackingCode: "code-4",
        title: "Valid ticket",
        createdBy: f.user.id,
      },
    });
    await expect(
      db.ticketStatusEvent.create({
        data: {
          ticketId: ticket.id,
          workflowId: f.defaultWorkflow.id,
          statusId: f.otherStatus.id, // not a step of defaultWorkflow
          changedBy: f.user.id,
        },
      }),
    ).rejects.toThrow();
  });

  it("rejects a status event whose workflow_id doesn't match its ticket's workflow, even if that workflow/status pair is individually valid", async () => {
    const f = await seedFixtures(db);
    const ticket = await db.ticket.create({
      data: {
        locationId: f.locationA.id,
        customerId: f.customerA.id,
        workflowId: f.defaultWorkflow.id,
        currentStatusId: f.status.id,
        trackingCode: "code-5",
        title: "Valid ticket",
        createdBy: f.user.id,
      },
    });
    // A second, unrelated workflow that also has f.status as a real step,
    // so (otherWorkflow.id, f.status.id) is a valid pair in workflow_step,
    // it's just not this ticket's workflow.
    const otherWorkflow = await db.workflow.create({
      data: {
        locationId: f.locationB.id,
        name: "Unrelated custom workflow",
        steps: { create: [{ position: 1, statusId: f.status.id }] },
      },
    });
    await expect(
      db.ticketStatusEvent.create({
        data: {
          ticketId: ticket.id,
          workflowId: otherWorkflow.id,
          statusId: f.status.id,
          changedBy: f.user.id,
        },
      }),
    ).rejects.toThrow();
  });
});

describe("one owner membership per location", () => {
  it("rejects a second OWNER membership at the same location", async () => {
    const f = await seedFixtures(db);
    const secondUser = await db.user.create({
      data: { id: "user_2", email: "second-owner@example.com", name: "Second Owner" },
    });
    await db.membership.create({
      data: { userId: f.user.id, locationId: f.locationA.id, role: "OWNER" },
    });
    await expect(
      db.membership.create({
        data: {
          userId: secondUser.id,
          locationId: f.locationA.id,
          role: "OWNER",
        },
      }),
    ).rejects.toThrow();
  });
});

describe("a location's address, all four fields or none", () => {
  it("rejects an address missing its postal code", async () => {
    const f = await seedFixtures(db);
    await expect(
      db.location.update({
        where: { id: f.locationA.id },
        data: { streetAddress: "Rue Neuve 12", addressLocality: "Bruxelles", addressCountry: "BE" },
      }),
    ).rejects.toThrow(/location_address_complete/);
  });

  it("accepts a complete address", async () => {
    const f = await seedFixtures(db);
    await db.location.update({
      where: { id: f.locationA.id },
      data: { streetAddress: "Rue Neuve 12", postalCode: "1000", addressLocality: "Bruxelles", addressCountry: "BE" },
    });
  });
});
