import { Injectable, Logger } from "@nestjs/common";
import * as Sentry from "@sentry/nestjs";
import { Cron } from "@nestjs/schedule";
import { CronMonitor } from "../common/decorators/cron-monitor.decorator";
import { PrismaService } from "../database/prisma.service";
import { trackingLinkExpiredWhere } from "../tracking/tracking-link";
import { StorageService } from "./storage.service";

const BATCH_SIZE = 500;

// An upload writes its object before its row: a younger object without a
// row may be an upload still in progress.
const ORPHAN_MIN_AGE_MS = 24 * 60 * 60 * 1000;

// Orphans come from the odd failed delete, a few a night at most. Far more
// means the database isn't the one the bucket belongs to (a restore, a wrong
// DATABASE_URL), and images have no backup: nothing is deleted then.
const MAX_ORPHANS = 50;
const MAX_ORPHAN_SHARE = 0.1;
const MIN_ORPHANS_FOR_SHARE = 5;

// ADR 0026's deletions that no request triggers.
@Injectable()
export class ImageSweepService {
  private readonly logger = new Logger(ImageSweepService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  // A Ticket's photos go with its tracking link, 30 days after it ended.
  @Cron("0 0 * * * *", { name: "ticket-photo-expiry" })
  @CronMonitor("ticket-photo-expiry", {
    schedule: { type: "crontab", value: "0 * * * *" },
    checkinMargin: 5,
    maxRuntime: 30,
  })
  async deleteExpiredPhotos() {
    for (;;) {
      const photos = await this.prisma.ticketPhoto.findMany({
        where: { ticket: trackingLinkExpiredWhere() },
        select: { id: true, objectKey: true },
        take: BATCH_SIZE,
      });
      if (photos.length === 0) {
        return;
      }
      await this.prisma.ticketPhoto.deleteMany({ where: { id: { in: photos.map((photo) => photo.id) } } });
      await this.storage.delete(photos.map((photo) => photo.objectKey));
    }
  }

  // Objects left behind when deleting one failed after its row was gone,
  // or when an upload stopped between writing the object and its row.
  @Cron("0 0 3 * * *", { name: "orphan-images" })
  @CronMonitor("orphan-images", {
    schedule: { type: "crontab", value: "0 3 * * *" },
    checkinMargin: 15,
    maxRuntime: 60,
  })
  async deleteOrphans() {
    const cutoff = Date.now() - ORPHAN_MIN_AGE_MS;
    let objects = 0;
    let batch: string[] = [];
    const orphans: string[] = [];
    for await (const object of this.storage.list()) {
      objects++;
      if (object.lastModified.getTime() < cutoff) {
        batch.push(object.key);
      }
      if (batch.length === BATCH_SIZE) {
        orphans.push(...(await this.unreferenced(batch)));
        batch = [];
      }
    }
    orphans.push(...(await this.unreferenced(batch)));

    const tooMany =
      orphans.length > MAX_ORPHANS ||
      (orphans.length > MIN_ORPHANS_FOR_SHARE && orphans.length > objects * MAX_ORPHAN_SHARE);
    if (tooMany) {
      this.logger.error(`Kept ${orphans.length} of ${objects} images no row points at, too many to be orphans`);
      Sentry.captureMessage("The orphan image sweep found too many to delete", "error");
      return;
    }
    this.logger.log(`Deleting ${orphans.length} orphan images of ${objects}`);
    for (let i = 0; i < orphans.length; i += BATCH_SIZE) {
      await this.storage.delete(orphans.slice(i, i + BATCH_SIZE));
    }
  }

  private async unreferenced(keys: string[]) {
    if (keys.length === 0) {
      return [];
    }
    const [photos, logos, banners, avatars] = await Promise.all([
      this.prisma.ticketPhoto.findMany({ where: { objectKey: { in: keys } }, select: { objectKey: true } }),
      this.prisma.business.findMany({ where: { logoKey: { in: keys } }, select: { logoKey: true } }),
      this.prisma.business.findMany({ where: { bannerKey: { in: keys } }, select: { bannerKey: true } }),
      this.prisma.user.findMany({ where: { image: { in: keys } }, select: { image: true } }),
    ]);
    const referenced = new Set([
      ...photos.map((photo) => photo.objectKey),
      ...logos.map((business) => business.logoKey),
      ...banners.map((business) => business.bannerKey),
      ...avatars.map((user) => user.image),
    ]);
    return keys.filter((key) => !referenced.has(key));
  }
}
