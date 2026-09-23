import { Injectable } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";
import { UpdateMeDto } from "./dto/update-me.dto";

@Injectable()
export class MeService {
  constructor(private readonly prisma: PrismaService) {}

  async getMemberships(userId: string) {
    return this.prisma.membership.findMany({
      where: { userId, location: { deletedAt: null } },
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

  async update(userId: string, dto: UpdateMeDto) {
    const user = await this.prisma.user.update({ where: { id: userId }, data: { locale: dto.locale } });
    return { id: user.id, email: user.email, name: user.name, locale: user.locale };
  }
}
