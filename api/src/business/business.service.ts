import { Injectable } from "@nestjs/common";
import { Role } from "@readyyet/db";
import { isUUID } from "class-validator";
import { PrismaService } from "../database/prisma.service";
import { BillingService } from "../billing/billing.service";
import { trialSubscription, UNPAID_SUBSCRIPTION } from "../billing/plans";
import { EmailService } from "../email/email.service";
import { buildNewOwnerEmail, buildPreviousOwnerEmail } from "../notification/staff-email/staff-email";
import { ConflictError, NotFoundError, UnauthorizedError, ValidationError } from "../common/errors/app-error";
import { locationSelect, toLocationResponse } from "../location/location-select";
import { CreateBusinessDto, CreateLocationDto } from "./dto/create-business.dto";
import { TransferOwnershipDto } from "./dto/transfer-ownership.dto";
import { UpdateBusinessDto } from "./dto/update-business.dto";

// Every Business this service returns goes to a client, the Stripe id
// is ours alone.
const omitStripe = { stripeCustomerId: true } as const;

@Injectable()
export class BusinessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
    private readonly billing: BillingService,
  ) {}

  async create(ownerId: string, dto: CreateBusinessDto) {
    const business = await this.prisma.business.create({
      data: {
        ownerId,
        name: dto.name,
        locations: {
          create: {
            ...(await this.buildLocationWithOwnerMembership(dto.location, ownerId)),
            subscription: { create: trialSubscription() },
          },
        },
      },
      include: { locations: locationSelect },
      omit: omitStripe,
    });
    return { ...business, locations: business.locations.map(toLocationResponse) };
  }

  // Owner only, like every Business-wide action (ADR 0002). Members see
  // their Business's name through /me.
  async findOne(businessId: string, userId: string) {
    await this.loadOwned(businessId, userId, "Only the business owner can view it");
    return this.prisma.business.findUniqueOrThrow({
      where: { id: businessId },
      omit: omitStripe,
      include: {
        locations: {
          where: { deletedAt: null },
          orderBy: { createdAt: "asc" },
          select: { id: true, name: true, createdAt: true },
        },
      },
    });
  }

  async update(businessId: string, userId: string, dto: UpdateBusinessDto) {
    await this.loadOwned(businessId, userId, "Only the business owner can rename it");
    return this.prisma.business.update({ where: { id: businessId }, data: { name: dto.name }, omit: omitStripe });
  }

  async addLocation(businessId: string, userId: string, dto: CreateLocationDto) {
    await this.loadOwned(businessId, userId, "Only the business owner can add a location");

    const location = await this.prisma.location.create({
      data: {
        businessId,
        ...(await this.buildLocationWithOwnerMembership(dto, userId)),
        subscription: { create: UNPAID_SUBSCRIPTION },
      },
      ...locationSelect,
    });
    return toLocationResponse(location);
  }

  async billingPortal(businessId: string, userId: string) {
    return this.billing.portal(
      await this.loadOwned(businessId, userId, "Only the business owner can manage its billing"),
    );
  }

  // ADR 0017: to an Admin of one of its Locations, who becomes OWNER on
  // every Location while the previous owner stays on as ADMIN.
  async transferOwnership(businessId: string, userId: string, dto: TransferOwnershipDto) {
    await this.loadOwned(businessId, userId, "Only the business owner can transfer it");
    if (dto.userId === userId) {
      throw new ConflictError("You already own this business");
    }
    const isAdmin = await this.prisma.membership.count({
      where: { userId: dto.userId, role: Role.ADMIN, location: { businessId, deletedAt: null } },
    });
    if (!isAdmin) {
      throw new ValidationError("The new owner must be an admin at one of this business's locations");
    }

    const business = await this.prisma.$transaction(async (tx) => {
      // Conditional on the owner the request started from, so two
      // concurrent transfers can't both apply.
      const { count } = await tx.business.updateMany({
        where: { id: businessId, ownerId: userId },
        data: { ownerId: dto.userId },
      });
      if (count === 0) {
        throw new ConflictError("This business's owner has just changed");
      }

      // Demoted first: a Location can only have one OWNER membership
      // (membership_one_owner_per_location).
      await tx.membership.updateMany({
        where: { userId, role: Role.OWNER, location: { businessId } },
        data: { role: Role.ADMIN },
      });
      const locations = await tx.location.findMany({ where: { businessId }, select: { id: true } });
      for (const { id: locationId } of locations) {
        await tx.membership.upsert({
          where: { userId_locationId: { userId: dto.userId, locationId } },
          create: { userId: dto.userId, locationId, role: Role.OWNER },
          update: { role: Role.OWNER },
        });
      }

      return tx.business.findUniqueOrThrow({ where: { id: businessId }, omit: omitStripe });
    });

    // After the commit, never inside it: an email can't be taken back.
    await this.billing.ownerChanged(businessId);
    await this.sendTransferEmails(business.name, userId, dto.userId);
    return business;
  }

  // Both people, each in their own language (ADR 0018). The previous
  // owner's copy is how a hijacked account's real owner would find out.
  private async sendTransferEmails(businessName: string, previousOwnerId: string, newOwnerId: string) {
    const [previousOwner, newOwner] = await Promise.all([
      this.prisma.user.findUniqueOrThrow({ where: { id: previousOwnerId } }),
      this.prisma.user.findUniqueOrThrow({ where: { id: newOwnerId } }),
    ]);
    const params = {
      business: businessName,
      previousOwner: previousOwner.name,
      newOwner: newOwner.name,
      newOwnerEmail: newOwner.email,
    };

    const toNewOwner = buildNewOwnerEmail({
      ...params,
      locale: newOwner.locale,
      appUrl: process.env.WEB_URL as string,
    });
    await this.email.send({ to: newOwner.email, ...toNewOwner, type: "ownership_received" });
    const toPreviousOwner = buildPreviousOwnerEmail({ ...params, locale: previousOwner.locale });
    await this.email.send({
      to: previousOwner.email,
      ...toPreviousOwner,
      type: "ownership_transferred",
      // "Reply if this wasn't you" has to reach someone.
      replyTo: process.env.SUPPORT_EMAIL,
    });
  }

  private async loadOwned(businessId: string, userId: string, forbidden: string) {
    // Business.id is a Postgres uuid column, a non-UUID value would
    // otherwise surface as a raw DB error, not a clean 404 (same
    // reasoning as LocationMembershipGuard's own isUUID check).
    if (!isUUID(businessId)) {
      throw new NotFoundError("Business not found");
    }
    const business = await this.prisma.business.findUnique({ where: { id: businessId } });
    if (!business) {
      throw new NotFoundError("Business not found");
    }
    // No Membership covers business-wide authority (ADR 0002), only the
    // business's own owner can act on it as a whole.
    if (business.ownerId !== userId) {
      throw new UnauthorizedError(forbidden);
    }
    return business;
  }

  private async buildLocationWithOwnerMembership(dto: CreateLocationDto, ownerId: string) {
    const businessType = await this.prisma.businessType.findUnique({ where: { code: dto.businessTypeCode } });
    if (!businessType) {
      throw new NotFoundError(`Unknown business type "${dto.businessTypeCode}"`);
    }

    return {
      name: dto.name,
      businessTypeId: businessType.id,
      contactPhone: dto.contactPhone,
      contactEmail: dto.contactEmail,
      locale: dto.locale,
      memberships: { create: { userId: ownerId, role: Role.OWNER } },
    };
  }
}
