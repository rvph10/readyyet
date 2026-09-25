import { Injectable } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { CronMonitor } from "../common/decorators/cron-monitor.decorator";
import { PrismaService } from "../database/prisma.service";
import { trackingLinkExpiredWhere } from "../tracking/tracking-link";
import { StorageService } from "./storage.service";

const BATCH_SIZE = 500;

// An upload writes its object before its row: a younger object without a
// row may be an upload still in progress.
const ORPHAN_MIN_AGE_MS = 24 * 60 * 60 * 1000;

// ADR 0026's deletions that no request triggers.
@Injectable()
export class ImageSweepService {
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
    let batch: string[] = [];
    for await (const object of this.storage.list()) {
      if (object.lastModified.getTime() < cutoff) {
        batch.push(object.key);
      }
      if (batch.length === BATCH_SIZE) {
        await this.deleteUnreferenced(batch);
        batch = [];
      }
    }
    await this.deleteUnreferenced(batch);
  }

  private async deleteUnreferenced(keys: string[]) {
    if (keys.length === 0) {
      return;
    }
    const [photos, logos, avatars] = await Promise.all([
      this.prisma.ticketPhoto.findMany({ where: { objectKey: { in: keys } }, select: { objectKey: true } }),
      this.prisma.location.findMany({ where: { logoKey: { in: keys } }, select: { logoKey: true } }),
      this.prisma.user.findMany({ where: { image: { in: keys } }, select: { image: true } }),
    ]);
    const referenced = new Set([
      ...photos.map((photo) => photo.objectKey),
      ...logos.map((location) => location.logoKey),
      ...avatars.map((user) => user.image),
    ]);
    await this.storage.delete(keys.filter((key) => !referenced.has(key)));
  }
}
