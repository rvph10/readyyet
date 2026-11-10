import { Injectable } from "@nestjs/common";
import { Prisma, type Locale } from "@readyyet/db";
import { PrismaService } from "../database/prisma.service";
import { StorageService } from "../storage/storage.service";
import { NotFoundError } from "../common/errors/app-error";
import { parseBigIntId } from "../common/parse-bigint-id";
import { customerErasure, photoKeysOfCustomers } from "./customer-erasure";
import { customerIdsMatching } from "./customer-search";
import { ListCustomersQueryDto } from "./dto/list-customers.query.dto";
import { UpdateCustomerDto } from "./dto/update-customer.dto";

const DEFAULT_LIST_TAKE = 20;

function customerOrder({ sort, dir = "asc" }: ListCustomersQueryDto): Prisma.CustomerOrderByWithRelationInput[] {
  const orders = {
    name: { fullName: dir },
    email: { email: { sort: dir, nulls: "last" } },
    phone: { phone: { sort: dir, nulls: "last" } },
    since: { createdAt: dir },
  } satisfies Record<NonNullable<ListCustomersQueryDto["sort"]>, Prisma.CustomerOrderByWithRelationInput>;
  return [sort ? orders[sort] : { fullName: "asc" }, { id: "asc" }];
}

@Injectable()
export class CustomerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async list(locationId: string, query: ListCustomersQueryDto) {
    const take = query.take ?? DEFAULT_LIST_TAKE;
    const where = {
      locationId,
      deletedAt: null,
      ...(query.q && { id: { in: await customerIdsMatching(this.prisma, locationId, query.q) } }),
    };
    const [customers, total] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        orderBy: customerOrder(query),
        skip: ((query.page ?? 1) - 1) * take,
        take,
      }),
      this.prisma.customer.count({ where }),
    ]);

    return { items: customers.map((customer) => this.serialize(customer)), total };
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
    const photoKeys = await photoKeysOfCustomers(this.prisma, [customer.id]);
    await this.prisma.$transaction(customerErasure(this.prisma, [customer.id]));
    await this.storage.delete(photoKeys);
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
