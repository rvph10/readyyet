import { Readable } from "node:stream";
import { Injectable } from "@nestjs/common";
import { Locale, Prisma } from "@readyyet/db";
import { ZipFile } from "yazl";
import { PrismaService } from "../database/prisma.service";
import { StorageService } from "../storage/storage.service";

type Cell = string | number | null | undefined;

// Excel opens a CSV on a double click with the list separator of the
// computer's region: a semicolon in French, a comma in English.
const SEPARATORS: Record<Locale, string> = { FR: ";", EN: "," };

// A spreadsheet runs a cell starting with one of these as a formula, and
// Customers' names and messages are typed by anyone (OWASP CSV injection).
const FORMULA_START = /^[=+\-@\t\r]/;

function cell(value: Cell, separator: string) {
  if (value === null || value === undefined) {
    return "";
  }
  let text = String(value);
  if (FORMULA_START.test(text)) {
    text = `'${text}`;
  }
  return /[\n\r"]/.test(text) || text.includes(separator) ? `"${text.replaceAll('"', '""')}"` : text;
}

// With a byte order mark, or Excel reads UTF-8 as its regional code page.
function csv(header: string[], rows: Cell[][], separator: string) {
  const lines = [header, ...rows].map((row) => row.map((value) => cell(value, separator)).join(separator));
  return Buffer.from(`\uFEFF${lines.join("\r\n")}\r\n`, "utf8");
}

const iso = (date: Date | null) => date?.toISOString() ?? null;
const day = (date: Date | null) => date?.toISOString().slice(0, 10) ?? null;

// Everything a Location holds, for the Owner to keep or take elsewhere
// (ADR 0129, Data Act art. 25 and 30).
@Injectable()
export class LocationExportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async zip(locationId: string): Promise<{ stream: Readable; filename: string }> {
    const location = await this.prisma.location.findUniqueOrThrow({
      where: { id: locationId },
      include: {
        business: { select: { name: true } },
        businessType: { select: { code: true } },
        memberships: { include: { user: { select: { name: true, email: true } } }, orderBy: { createdAt: "asc" } },
      },
    });
    // One snapshot, so every Ticket's customer_id is in customers.csv even
    // when a Ticket is created during the export.
    const [customers, tickets, workflows, labels] = await this.prisma.$transaction(
      (tx) =>
        Promise.all([
          tx.customer.findMany({ where: { locationId }, orderBy: { id: "asc" } }),
          tx.ticket.findMany({
            where: { locationId },
            orderBy: { id: "asc" },
            include: {
              currentStatus: { select: { code: true } },
              creator: { select: { name: true } },
              statusEvents: {
                orderBy: { createdAt: "asc" },
                include: { status: { select: { code: true } }, changer: { select: { name: true } } },
              },
              feedback: { include: { handler: { select: { name: true } } } },
              photos: { orderBy: { createdAt: "asc" }, include: { uploader: { select: { name: true } } } },
            },
          }),
          tx.workflow.findMany({
            // The one it runs too, its Business type's while it has none of its own.
            where: {
              OR: [
                { locationId },
                { tickets: { some: { locationId } } },
                { businessTypeId: location.businessTypeId, isActive: true },
              ],
            },
            orderBy: { id: "asc" },
            include: { steps: { orderBy: { position: "asc" }, include: { status: { select: { code: true } } } } },
          }),
          tx.statusTranslation.findMany({
            where: { locale: location.locale },
            include: { status: { select: { code: true } } },
          }),
        ]),
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
    const label = new Map(labels.map((translation) => [translation.status.code, translation.label]));
    const separator = SEPARATORS[location.locale];
    const photoFile = (ticketId: bigint, photo: { id: bigint; objectKey: string }) =>
      `photos/${ticketId}/${photo.id}${photo.objectKey.slice(photo.objectKey.lastIndexOf("."))}`;

    const zip = new ZipFile();
    const add = (name: string, content: Buffer) => zip.addBuffer(content, name);

    add(
      "customers.csv",
      csv(
        ["id", "name", "email", "phone", "language", "created_at", "erased_at"],
        customers.map((customer) => [
          customer.id.toString(),
          customer.fullName,
          customer.email,
          customer.phone,
          customer.locale,
          iso(customer.createdAt),
          iso(customer.deletedAt),
        ]),
        separator,
      ),
    );
    add(
      "tickets.csv",
      csv(
        [
          "id",
          "customer_id",
          "title",
          "description",
          "status",
          "status_label",
          "workflow_id",
          "tracking_code",
          "estimated_ready_date",
          "collected_at",
          "created_by",
          "created_at",
        ],
        tickets.map((ticket) => [
          ticket.id.toString(),
          ticket.customerId.toString(),
          ticket.title,
          ticket.description,
          ticket.currentStatus.code,
          label.get(ticket.currentStatus.code),
          ticket.workflowId.toString(),
          ticket.trackingCode,
          day(ticket.estimatedReadyDate),
          iso(ticket.customerCollectedAt),
          ticket.creator.name,
          iso(ticket.createdAt),
        ]),
        separator,
      ),
    );
    add(
      "status_history.csv",
      csv(
        ["ticket_id", "status", "status_label", "changed_by", "changed_at"],
        tickets.flatMap((ticket) =>
          ticket.statusEvents.map((event) => [
            ticket.id.toString(),
            event.status.code,
            label.get(event.status.code),
            event.changer.name,
            iso(event.createdAt),
          ]),
        ),
        separator,
      ),
    );
    add(
      "feedback.csv",
      csv(
        ["ticket_id", "stars", "tags", "message", "reply", "replied_at", "handled_by", "handled_at", "created_at"],
        tickets.flatMap(({ id, feedback }) =>
          feedback
            ? [
                [
                  id.toString(),
                  feedback.stars,
                  feedback.tags.join(", "),
                  feedback.message,
                  feedback.reply,
                  iso(feedback.repliedAt),
                  feedback.handler?.name,
                  iso(feedback.handledAt),
                  iso(feedback.createdAt),
                ],
              ]
            : [],
        ),
        separator,
      ),
    );
    add(
      "photos.csv",
      csv(
        ["ticket_id", "file", "added_by", "added_at"],
        tickets.flatMap((ticket) =>
          ticket.photos.map((photo) => [
            ticket.id.toString(),
            photoFile(ticket.id, photo),
            photo.uploader.name,
            iso(photo.createdAt),
          ]),
        ),
        separator,
      ),
    );
    add(
      "team.csv",
      csv(
        ["name", "email", "role", "member_since"],
        location.memberships.map((membership) => [
          membership.user.name,
          membership.user.email,
          membership.role,
          iso(membership.createdAt),
        ]),
        separator,
      ),
    );

    const json = {
      format: "readyyet-location-export",
      version: 1,
      exportedAt: new Date().toISOString(),
      business: { name: location.business.name },
      location: {
        id: location.id,
        name: location.name,
        businessType: location.businessType.code,
        businessTypeDetail: location.businessTypeDetail,
        contactPhone: location.contactPhone,
        contactEmail: location.contactEmail,
        language: location.locale,
        address: {
          streetAddress: location.streetAddress,
          postalCode: location.postalCode,
          addressLocality: location.addressLocality,
          addressCountry: location.addressCountry,
        },
        timeZone: location.timeZone,
        openingHours: location.openingHours,
        turnaroundDays: location.turnaroundDays,
        googleReviewUrl: location.googleReviewUrl,
        createdAt: iso(location.createdAt),
      },
      team: location.memberships.map((membership) => ({
        name: membership.user.name,
        email: membership.user.email,
        role: membership.role,
        memberSince: iso(membership.createdAt),
      })),
      workflows: workflows.map((workflow) => ({
        id: workflow.id.toString(),
        name: workflow.name,
        custom: workflow.locationId === locationId,
        active: workflow.isActive,
        steps: workflow.steps.map(({ status }) => ({ status: status.code, label: label.get(status.code) })),
      })),
      customers: customers.map((customer) => ({
        id: customer.id.toString(),
        name: customer.fullName,
        email: customer.email,
        phone: customer.phone,
        language: customer.locale,
        createdAt: iso(customer.createdAt),
        erasedAt: iso(customer.deletedAt),
      })),
      tickets: tickets.map((ticket) => ({
        id: ticket.id.toString(),
        customerId: ticket.customerId.toString(),
        title: ticket.title,
        description: ticket.description,
        status: ticket.currentStatus.code,
        workflowId: ticket.workflowId.toString(),
        trackingCode: ticket.trackingCode,
        estimatedReadyDate: day(ticket.estimatedReadyDate),
        collectedAt: iso(ticket.customerCollectedAt),
        createdBy: ticket.creator.name,
        createdAt: iso(ticket.createdAt),
        history: ticket.statusEvents.map((event) => ({
          status: event.status.code,
          changedBy: event.changer.name,
          changedAt: iso(event.createdAt),
        })),
        feedback: ticket.feedback && {
          stars: ticket.feedback.stars,
          tags: ticket.feedback.tags,
          message: ticket.feedback.message,
          googleClickedAt: iso(ticket.feedback.googleClickedAt),
          reply: ticket.feedback.reply,
          repliedAt: iso(ticket.feedback.repliedAt),
          handledBy: ticket.feedback.handler?.name ?? null,
          handledAt: iso(ticket.feedback.handledAt),
          createdAt: iso(ticket.feedback.createdAt),
        },
        photos: ticket.photos.map((photo) => ({
          file: photoFile(ticket.id, photo),
          addedBy: photo.uploader.name,
          addedAt: iso(photo.createdAt),
        })),
      })),
    };
    add("readyyet.json", Buffer.from(JSON.stringify(json, null, 2), "utf8"));

    const output = zip.outputStream as Readable;
    // A photo that fails to load ends the download, not the API: yazl
    // reports it on the ZipFile, and nothing would listen there otherwise.
    zip.on("error", (error: Error) => output.destroy(error));
    // A download stopped halfway lets go of the photo being read.
    let reading: Readable | undefined;
    output.on("close", () => reading?.destroy());

    // Fetched one at a time as the archive is written, not all held open.
    for (const ticket of tickets) {
      for (const photo of ticket.photos) {
        // Already compressed, a second pass only costs time.
        zip.addReadStreamLazy(photoFile(ticket.id, photo), { compress: false }, (done) => {
          this.storage.stream(photo.objectKey).then(
            (object) => {
              // Deleted since the query: an empty file rather than a broken archive.
              reading = object?.body ?? Readable.from([]);
              reading.on("error", (error) => output.destroy(error));
              done(null, reading);
            },
            (error: unknown) => done(error, Readable.from([])),
          );
        });
      }
    }
    zip.end();
    // Which Location and which day, on its own clock: an Owner of several
    // gets files that say whose they are.
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: location.timeZone }).format(new Date());
    const slug = location.name
      .normalize("NFKD")
      .replace(/[^A-Za-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase();
    return { stream: output, filename: `readyyet-${slug ? `${slug}-` : ""}${today}.zip` };
  }
}
