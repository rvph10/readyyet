import { Injectable, Logger } from "@nestjs/common";
import { Role, type Prisma } from "@readyyet/db";
import { OTHER_BUSINESS_TYPE, TERMS_VERSION } from "@readyyet/shared";
import { isUUID } from "class-validator";
import { PrismaService } from "../database/prisma.service";
import { BillingService } from "../billing/billing.service";
import { TRIAL_DAYS, trialSubscription, UNPAID_SUBSCRIPTION } from "../billing/plans";
import { EmailService } from "../email/email.service";
import {
  buildNewOwnerEmail,
  buildPreviousOwnerEmail,
  buildWelcomeEmail,
} from "../notification/staff-email/staff-email";
import { ConflictError, NotFoundError, UnauthorizedError, ValidationError } from "../common/errors/app-error";
import { toAddressColumns, toOpeningHoursJson } from "../location/location-info";
import { locationSelect, toLocationResponse } from "../location/location-select";
import { processImage, publicImageUrl } from "../storage/image";
import { StorageService } from "../storage/storage.service";
import { CreateBusinessDto, CreateLocationDto } from "./dto/create-business.dto";
import { generateReferralCode } from "./referral-code";
import { TransferOwnershipDto } from "./dto/transfer-ownership.dto";
import { UpdateBusinessDto } from "./dto/update-business.dto";

// Every Business this service returns goes to its Owner. The rest of the
// row, Stripe's id and who referred it, is only for billing.
const businessSelect = {
  id: true,
  name: true,
  ownerId: true,
  referralCode: true,
  logoKey: true,
  bannerKey: true,
  createdAt: true,
  updatedAt: true,
} as const;

type ImageColumn = "logoKey" | "bannerKey";

function toBusinessResponse<T extends Prisma.BusinessGetPayload<{ select: typeof businessSelect }>>({
  logoKey,
  bannerKey,
  ...business
}: T) {
  return { ...business, logoUrl: publicImageUrl(logoKey), bannerUrl: publicImageUrl(bannerKey) };
}

@Injectable()
export class BusinessService {
  private readonly logger = new Logger(BusinessService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
    private readonly billing: BillingService,
    private readonly storage: StorageService,
  ) {}

  async create(ownerId: string, dto: CreateBusinessDto) {
    // A trial per Owner, not per Business, or a new one every two weeks is
    // free forever (ADR 0082).
    const firstBusiness = (await this.prisma.business.count({ where: { ownerId } })) === 0;
    const business = await this.prisma.business.create({
      data: {
        ownerId,
        name: dto.name,
        referralCode: generateReferralCode(),
        ...(await this.findReferrer(dto.referralCode, ownerId)),
        // Creating it is accepting the terms shown above the button (ADR 0130).
        termsAcceptances: { create: { userId: ownerId, version: dto.termsVersion } },
        locations: {
          create: {
            ...(await this.buildLocationWithOwnerMembership(dto.location, ownerId)),
            subscription: { create: firstBusiness ? trialSubscription() : UNPAID_SUBSCRIPTION },
          },
        },
      },
      select: { ...businessSelect, locations: locationSelect },
    });
    if (firstBusiness) {
      // Not awaited, like every staff email sent along a request.
      this.sendWelcomeEmail(ownerId, business.locations[0].id).catch((err) => {
        this.logger.error(`Failed to email a welcome to ${ownerId}`, err instanceof Error ? err.stack : err);
      });
    }
    return { ...toBusinessResponse(business), locations: business.locations.map(toLocationResponse) };
  }

  // An Owner from before the terms, or from before a version they must
  // accept again (ADR 0130). Accepting twice changes nothing.
  async acceptTerms(businessId: string, userId: string, version: string) {
    await this.prisma.termsAcceptance.upsert({
      where: { businessId_version: { businessId, version } },
      create: { businessId, userId, version },
      update: {},
    });
  }

  // ADR 0127: once, with an Owner's first shop and its trial.
  private async sendWelcomeEmail(ownerId: string, locationId: string) {
    const [owner, location] = await Promise.all([
      this.prisma.user.findUniqueOrThrow({ where: { id: ownerId } }),
      this.prisma.location.findUniqueOrThrow({
        where: { id: locationId },
        select: { name: true, timeZone: true, subscription: { select: { trialEndsAt: true } } },
      }),
    ]);
    const trialEndsOn = new Intl.DateTimeFormat(owner.locale === "FR" ? "fr-BE" : "en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: location.timeZone,
    }).format(location.subscription!.trialEndsAt!);
    await this.email.send({
      to: owner.email,
      ...buildWelcomeEmail({
        locale: owner.locale,
        location: location.name,
        trialDays: TRIAL_DAYS,
        trialEndsOn,
        appUrl: `${process.env.WEB_URL}/locations/${locationId}`,
      }),
      type: "welcome",
      dedupeKey: `welcome:${ownerId}`,
      // "Reply to this email" has to reach someone.
      replyTo: process.env.SUPPORT_EMAIL,
    });
  }

  // Owner only, like every Business-wide action (ADR 0002). Members see
  // their Business's name through /me.
  async findOne(businessId: string, userId: string) {
    await this.loadOwned(businessId, userId, "Only the business owner can view it");
    const business = await this.prisma.business.findUniqueOrThrow({
      where: { id: businessId },
      select: {
        ...businessSelect,
        locations: {
          where: { deletedAt: null },
          orderBy: { createdAt: "asc" },
          select: { id: true, name: true, createdAt: true },
        },
        termsAcceptances: { where: { version: TERMS_VERSION }, select: { id: true }, take: 1 },
      },
    });
    const { termsAcceptances, ...rest } = business;
    return { ...toBusinessResponse(rest), termsAccepted: termsAcceptances.length > 0 };
  }

  async update(businessId: string, userId: string, dto: UpdateBusinessDto) {
    await this.loadOwned(businessId, userId, "Only the business owner can rename it");
    return toBusinessResponse(
      await this.prisma.business.update({
        where: { id: businessId },
        data: { name: dto.name },
        select: businessSelect,
      }),
    );
  }

  // Shown for every Location of the Business, so it's the Owner's to set
  // (ADR 0051).
  setLogo(businessId: string, file: Buffer) {
    return this.storeImage(businessId, "logoKey", file, "logo");
  }

  async removeLogo(businessId: string, userId: string) {
    await this.loadOwned(businessId, userId, "Only the business owner can change its logo");
    return this.replaceImage(businessId, "logoKey", null);
  }

  setBanner(businessId: string, file: Buffer) {
    return this.storeImage(businessId, "bannerKey", file, "banner");
  }

  async removeBanner(businessId: string, userId: string) {
    await this.loadOwned(businessId, userId, "Only the business owner can change its banner");
    return this.replaceImage(businessId, "bannerKey", null);
  }

  private async storeImage(businessId: string, column: ImageColumn, file: Buffer, kind: "logo" | "banner") {
    const image = await processImage(file, kind);
    await this.storage.put(image.key, image.body, image.contentType);
    try {
      return await this.replaceImage(businessId, column, image.key);
    } catch (error) {
      await this.storage.delete([image.key]);
      throw error;
    }
  }

  // The row first, the previous object after (ADR 0026).
  private async replaceImage(businessId: string, column: ImageColumn, key: string | null) {
    const images = await this.prisma.business.findUniqueOrThrow({
      where: { id: businessId },
      select: { logoKey: true, bannerKey: true },
    });
    const previous = images[column];
    const business = await this.prisma.business.update({
      where: { id: businessId },
      data: { [column]: key },
      select: businessSelect,
    });
    if (previous) {
      await this.storage.delete([previous]);
    }
    return toBusinessResponse(business);
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

      return tx.business.findUniqueOrThrow({ where: { id: businessId }, select: businessSelect });
    });

    // After the commit, never inside it: an email can't be taken back.
    await this.sendTransferEmails(business.name, userId, dto.userId);
    // The transfer has happened, a Stripe outage mustn't report it as failed:
    // the caller is no longer the Owner and couldn't retry it.
    await this.billing.ownerChanged(businessId).catch((err) => {
      this.logger.error(
        `Failed to move the Stripe customer's email for business ${businessId}`,
        err instanceof Error ? err.stack : err,
      );
    });
    return toBusinessResponse(business);
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

  // A code that matches nobody, or the caller's own, is ignored rather than
  // refused: the link can be weeks old (ADR 0040). So is a former sales
  // partner's, they no longer earn from new Businesses.
  private async findReferrer(code: string | undefined, userId: string) {
    if (!code) {
      return {};
    }
    const sponsor = await this.prisma.business.findUnique({ where: { referralCode: code } });
    if (sponsor) {
      return sponsor.ownerId === userId ? {} : { referredByBusinessId: sponsor.id };
    }
    const salesPartner = await this.prisma.user.findUnique({ where: { referralCode: code } });
    if (salesPartner?.salesPartnerSince && salesPartner.id !== userId) {
      return { referredBySalesPartnerId: salesPartner.id };
    }
    return {};
  }

  async loadOwned(businessId: string, userId: string, forbidden: string) {
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
    if (dto.businessTypeDetail !== undefined && businessType.code !== OTHER_BUSINESS_TYPE) {
      throw new ValidationError("A business type detail is only for OTHER", [
        { property: "location.businessTypeDetail", constraints: { onlyForOther: "only with OTHER" } },
      ]);
    }

    return {
      name: dto.name,
      businessTypeId: businessType.id,
      businessTypeDetail: dto.businessTypeDetail,
      contactPhone: dto.contactPhone,
      contactEmail: dto.contactEmail,
      locale: dto.locale,
      timeZone: dto.timeZone,
      ...toAddressColumns(dto.address ?? null),
      openingHours: toOpeningHoursJson(dto.openingHours ?? []),
      memberships: { create: { userId: ownerId, role: Role.OWNER } },
    };
  }
}
