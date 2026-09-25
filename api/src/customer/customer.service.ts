import { Injectable } from "@nestjs/common";
import type { Locale } from "@readyyet/db";
import { PrismaService } from "../database/prisma.service";
import { StorageService } from "../storage/storage.service";
import { NotFoundError, ValidationError } from "../common/errors/app-error";
import { isBigIntId, parseBigIntId } from "../common/parse-bigint-id";
import { ListCustomersQueryDto } from "./dto/list-customers.query.dto";
import { UpdateCustomerDto } from "./dto/update-customer.dto";

const DEFAULT_LIST_TAKE = 20;

@Injectable()
export class CustomerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async list(locationId: string, query: ListCustomersQueryDto) {
    const take = query.take ?? DEFAULT_LIST_TAKE;
    const after = query.cursor ? await this.cursorPosition(locationId, query.cursor) : undefined;
    const customers = await this.prisma.customer.findMany({
      where: {
        locationId,
        deletedAt: null,
        ...(query.q && { fullName: { contains: query.q, mode: "insensitive" } }),
        ...(after && {
          OR: [{ fullName: { gt: after.fullName } }, { fullName: after.fullName, id: { gt: after.id } }],
        }),
      },
      orderBy: [{ fullName: "asc" }, { id: "asc" }],
      // One extra row says whether there's a next page.
      take: take + 1,
    });

    const page = customers.slice(0, take);
    const last = page[page.length - 1];
    return {
      items: page.map((customer) => this.serialize(customer)),
      nextCursor: customers.length > take ? last.id.toString() : null,
    };
  }

  async findOne(locationId: string, customerId: string) {
    return this.serialize(await this.loadActive(locationId, customerId));
  }

  async update(locationId: string, customerId: string, dto: UpdateCustomerDto) {
    const customer = await this.loadActive(locationId, customerId);

    const updated = await this.prisma.customer.update({
      where: { id: customer.id },
      data: {
        ...(dto.fullName !== undefined && { fullName: dto.fullName }),
        // A different address hasn't failed yet, whatever the old one did.
        ...(dto.email !== undefined &&
          dto.email !== customer.email && { email: dto.email, emailBouncedAt: null, emailComplainedAt: null }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.locale !== undefined && { locale: dto.locale }),
      },
    });

    return this.serialize(updated);
  }

  async remove(locationId: string, customerId: string) {
    const customer = await this.loadActive(locationId, customerId);
    // Erasure, not a plain soft-delete flag: redact PII, not just mark
    // it gone, a Ticket referencing this customer can't be deleted
    // (onDelete: Restrict) so the row itself has to survive.
    // See docs/architecture/data-model.md#gdpr-erasure.
    // Their Tickets' photos can show them too: a face, a number plate.
    const photos = await this.prisma.ticketPhoto.findMany({
      where: { ticket: { customerId: customer.id } },
      select: { objectKey: true },
    });
    await this.prisma.$transaction([
      this.prisma.customer.update({
        where: { id: customer.id },
        data: { deletedAt: new Date(), fullName: "[deleted]", email: null, phone: null },
      }),
      this.prisma.ticketPhoto.deleteMany({ where: { ticket: { customerId: customer.id } } }),
      // Their own words (ADR 0039).
      this.prisma.ticketFeedback.deleteMany({ where: { ticket: { customerId: customer.id } } }),
    ]);
    await this.storage.delete(photos.map((photo) => photo.objectKey));
  }

  // Keyset pagination on (fullName, id), like tickets on (createdAt, id), see
  // docs/architecture/data-model.md#pagination. The cursor is only the last
  // customer's id, the name is looked up here: a cursor carrying it would
  // put a customer's name in every URL, which the logs and Railway's proxy
  // record as is.
  private async cursorPosition(locationId: string, cursor: string) {
    const customer = isBigIntId(cursor)
      ? await this.prisma.customer.findFirst({
          where: { id: BigInt(cursor), locationId },
          select: { id: true, fullName: true },
        })
      : null;
    if (!customer) {
      throw new ValidationError("Invalid cursor");
    }
    return customer;
  }

  private async loadActive(locationId: string, customerId: string) {
    const id = parseBigIntId(customerId, "Customer");
    const customer = await this.prisma.customer.findFirst({ where: { id, locationId, deletedAt: null } });
    if (!customer) {
      throw new NotFoundError("Customer not found");
    }
    return customer;
  }

  private serialize(customer: {
    id: bigint;
    fullName: string;
    email: string | null;
    phone: string | null;
    locale: Locale | null;
    emailBouncedAt: Date | null;
    emailComplainedAt: Date | null;
    createdAt: Date;
  }) {
    return {
      id: customer.id.toString(),
      fullName: customer.fullName,
      email: customer.email,
      phone: customer.phone,
      locale: customer.locale,
      emailBouncedAt: customer.emailBouncedAt,
      emailComplainedAt: customer.emailComplainedAt,
      createdAt: customer.createdAt,
    };
  }
}
