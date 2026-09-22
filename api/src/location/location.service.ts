import { Injectable } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";
import { NotFoundError } from "../common/errors/app-error";

@Injectable()
export class LocationService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(locationId: string) {
    const location = await this.prisma.location.findUnique({ where: { id: locationId } });
    if (!location) {
      throw new NotFoundError("Location not found");
    }
    return location;
  }
}
