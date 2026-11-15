import { Injectable, OnApplicationShutdown, OnModuleInit } from "@nestjs/common";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@readyyet/db";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnApplicationShutdown {
  constructor() {
    super({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
  }

  async onModuleInit() {
    await this.$connect();
  }

  // After the HTTP server has closed, not on module destroy, which Nest runs
  // first: a request still draining on deploy would lose its database.
  async onApplicationShutdown() {
    await this.$disconnect();
  }
}
