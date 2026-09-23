import { Injectable } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";
import { NotFoundError } from "../common/errors/app-error";
import { parseBigIntId } from "../common/parse-bigint-id";
import { ListCustomersQueryDto } from "./dto/list-customers.query.dto";
import { UpdateCustomerDto } from "./dto/update-customer.dto";

const DEFAULT_LIST_TAKE = 20;

@Injectable()
export class CustomerService {
  constructor(private readonly prisma: PrismaService) {}

  async list(locationId: string, query: ListCustomersQueryDto) {
    const customers = await this.prisma.customer.findMany({
      where: {
        locationId,
        deletedAt: null,
        ...(query.q && { fullName: { contains: query.q, mode: "insensitive" } }),
      },
      orderBy: { fullName: "asc" },
      take: query.take ?? DEFAULT_LIST_TAKE,
      skip: query.skip ?? 0,
    });

    return customers.map((customer) => this.serialize(customer));
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
        ...(dto.email !== undefined && { email: dto.email }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
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
    await this.prisma.customer.update({
      where: { id: customer.id },
      data: { deletedAt: new Date(), fullName: "[deleted]", email: null, phone: null },
    });
  }

  private async loadActive(locationId: string, customerId: string) {
    const id = parseBigIntId(customerId, "Customer");
    const customer = await this.prisma.customer.findFirst({ where: { id, locationId, deletedAt: null } });
    if (!customer) {
      throw new NotFoundError("Customer not found");
    }
    return customer;
  }

  private serialize(customer: { id: bigint; fullName: string; email: string | null; phone: string | null; createdAt: Date }) {
    return {
      id: customer.id.toString(),
      fullName: customer.fullName,
      email: customer.email,
      phone: customer.phone,
      createdAt: customer.createdAt,
    };
  }
}
