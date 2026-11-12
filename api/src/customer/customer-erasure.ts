import { Prisma } from "@readyyet/db";
import { ERASED_CUSTOMER_NAME, ERASED_TICKET_TITLE } from "@readyyet/shared";
import { PrismaService } from "../database/prisma.service";

const ERASED_EMAIL_ADDRESS = "erased@deleted.invalid";

// Erasure, not a plain soft-delete flag: a Ticket references its Customer
// (onDelete: Restrict), so the rows stay and what's personal in them goes.
// See docs/architecture/data-model.md#gdpr-erasure. The writes go in the
// caller's transaction, the photos' objects are the caller's to delete after.
// `customers` must still match them once erased: the Customers go last.
export function customerErasure(prisma: PrismaService, customers: Prisma.CustomerWhereInput) {
  const theirTickets = { ticket: { customer: customers } };
  return [
    // Staff describe the item in their own words, which can name its owner.
    prisma.ticket.updateMany({
      where: { customer: customers },
      data: { title: ERASED_TICKET_TITLE, description: null },
    }),
    // A photo can show them too: a face, a number plate.
    prisma.ticketPhoto.deleteMany({ where: theirTickets }),
    // Their own words (ADR 0039).
    prisma.ticketFeedback.deleteMany({ where: theirTickets }),
    // What was sent about them: their address, their name, the staff copy of
    // their feedback. Through the Ticket, the same address at another
    // Location is another Customer.
    prisma.emailLog.updateMany({
      where: theirTickets,
      data: {
        to: ERASED_EMAIL_ADDRESS,
        subject: ERASED_CUSTOMER_NAME,
        html: null,
        text: null,
        lastError: null,
        lastEvent: Prisma.DbNull,
        // The calendar event names where and when (ADR 0127).
        attachments: Prisma.DbNull,
        gaveUpAt: new Date(),
      },
    }),
    prisma.customer.updateMany({
      where: customers,
      data: { deletedAt: new Date(), fullName: ERASED_CUSTOMER_NAME, email: null, phone: null },
    }),
  ];
}

export async function photoKeysOfCustomers(prisma: PrismaService, customerIds: bigint[]) {
  const photos = await prisma.ticketPhoto.findMany({
    where: { ticket: { customerId: { in: customerIds } } },
    select: { objectKey: true },
  });
  return photos.map((photo) => photo.objectKey);
}
