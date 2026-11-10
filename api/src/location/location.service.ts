import { Injectable } from "@nestjs/common";
import { ThrottlerException } from "@nestjs/throttler";
import { InvitationStatus } from "@readyyet/db";
import { BillingService } from "../billing/billing.service";
import { PrismaService } from "../database/prisma.service";
import { hasPro } from "../billing/plans";
import { NotFoundError, PlanRequiredError } from "../common/errors/app-error";
import { StorageService } from "../storage/storage.service";
import { UpdateLocationDto } from "./dto/update-location.dto";
import { searchGooglePlaces } from "./google-places";
import { toAddressColumns, toOpeningHoursJson } from "./location-info";
import { locationSelect, toLocationResponse } from "./location-select";

// Where ReadyYet sells, for a shop with no address yet.
const DEFAULT_REGION = "BE";
// Google bills each search (ADR 0126): plenty to find one shop, few enough
// that a Location can't run up the bill.
const GOOGLE_SEARCHES_A_DAY = 30;

@Injectable()
export class LocationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly billing: BillingService,
    private readonly storage: StorageService,
  ) {}

  // In memory: the API runs as one instance, and a restart only resets it.
  private readonly googleSearches = new Map<string, { day: string; count: number }>();

  async findById(locationId: string) {
    const location = await this.prisma.location.findUnique({ where: { id: locationId }, ...locationSelect });
    if (!location) {
      throw new NotFoundError("Location not found");
    }
    return toLocationResponse(location);
  }

  // In the shop's language, and its country when it has an address: a name
  // is often shared by shops in several countries.
  async findOnGoogle(locationId: string, query: string) {
    const { locale, addressCountry, subscription } = await this.prisma.location.findUniqueOrThrow({
      where: { id: locationId },
      select: { locale: true, addressCountry: true, subscription: true },
    });
    // What it finds is for the review link, which needs Pro.
    if (!subscription || !hasPro(subscription)) {
      throw new PlanRequiredError("Review requests");
    }
    const day = new Date().toISOString().slice(0, 10);
    const used = this.googleSearches.get(locationId);
    const count = used?.day === day ? used.count : 0;
    if (count >= GOOGLE_SEARCHES_A_DAY) {
      throw new ThrottlerException();
    }
    this.googleSearches.set(locationId, { day, count: count + 1 });

    const places = await searchGooglePlaces(query, {
      languageCode: locale.toLowerCase(),
      regionCode: addressCountry ?? DEFAULT_REGION,
    });
    return { places };
  }

  async update(locationId: string, dto: UpdateLocationDto) {
    if (dto.googleReviewUrl || dto.feedbackEmails) {
      const subscription = await this.prisma.subscription.findUniqueOrThrow({ where: { locationId } });
      if (!hasPro(subscription)) {
        throw new PlanRequiredError("Review requests");
      }
    }
    const location = await this.prisma.location.update({
      where: { id: locationId },
      ...locationSelect,
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.contactPhone !== undefined && { contactPhone: dto.contactPhone }),
        ...(dto.contactEmail !== undefined && { contactEmail: dto.contactEmail }),
        ...(dto.locale !== undefined && { locale: dto.locale }),
        ...(dto.timeZone !== undefined && { timeZone: dto.timeZone }),
        ...(dto.address !== undefined && toAddressColumns(dto.address)),
        ...(dto.openingHours !== undefined && { openingHours: toOpeningHoursJson(dto.openingHours) }),
        ...(dto.turnaroundDays !== undefined && { turnaroundDays: dto.turnaroundDays }),
        ...(dto.googleReviewUrl !== undefined && { googleReviewUrl: dto.googleReviewUrl }),
        ...(dto.feedbackEmails !== undefined && { feedbackEmails: dto.feedbackEmails }),
      },
    });
    return toLocationResponse(location);
  }

  // A soft delete, final in v1 (ADR 0017): tickets are permanent records.
  // The guard, tracking page and customer emails all treat a deleted
  // Location as gone, this only clears what would otherwise linger.
  async remove(locationId: string) {
    // Stripe first: a Location deleted while still billed would be worse
    // than one still there after its subscription ended, deleting it again
    // finishes the job.
    await this.billing.cancelNow(locationId);
    // Its photos go at once, its tracking links stop answering now (ADR 0026).
    // The logo stays, it's the Business's (ADR 0051).
    const photos = await this.prisma.ticketPhoto.findMany({
      where: { ticket: { locationId } },
      select: { objectKey: true },
    });
    await this.prisma.$transaction([
      this.prisma.location.update({ where: { id: locationId }, data: { deletedAt: new Date() } }),
      this.prisma.ticketPhoto.deleteMany({ where: { ticket: { locationId } } }),
      this.prisma.invitation.updateMany({
        where: { locationId, status: InvitationStatus.PENDING },
        data: { status: InvitationStatus.REVOKED },
      }),
      this.prisma.pendingStatusNotification.deleteMany({ where: { statusEvent: { ticket: { locationId } } } }),
    ]);
    await this.storage.delete(photos.map((photo) => photo.objectKey));
  }
}
