import "dotenv/config";
import { afterAll, describe, expect, it } from "vitest";
import { PrismaService } from "../src/database/prisma.service";

describe("The database connection", () => {
  const prisma = new PrismaService();

  afterAll(() => prisma.$disconnect());

  it("can't wait forever on a query or a forgotten transaction", async () => {
    const [settings] = await prisma.$queryRaw<{ statement: string; idle: string }[]>`
      SELECT current_setting('statement_timeout') AS statement,
             current_setting('idle_in_transaction_session_timeout') AS idle`;
    expect(settings).toEqual({ statement: "30s", idle: "1min" });
  });
});
