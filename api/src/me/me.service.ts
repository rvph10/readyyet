import { Injectable } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";

@Injectable()
export class MeService {
  constructor(private readonly prisma: PrismaService) {}

  async getMemberships(userId: string) {
    return this.prisma.membership.findMany({
      where: { userId },
      select: {
        role: true,
        location: {
          select: {
            id: true,
            name: true,
            business: { select: { id: true, name: true } },
          },
        },
      },
    });
  }
}
