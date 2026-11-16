// Must run before AppModule is imported: auth.ts constructs a PrismaClient
// at module-evaluation time, so DATABASE_URL has to already be set.
import "dotenv/config";
import { describe, expect, it, vi } from "vitest";
import request from "supertest";
import { PrismaService } from "../src/database/prisma.service";
import { createTestApp } from "./support/create-test-app";

describe("Shutting down", () => {
  // A deploy sends SIGTERM and leaves the old container time to drain
  // (.railway/railway.ts): a request still running must keep its database.
  it("lets a request in progress finish its queries before disconnecting", async () => {
    const app = await createTestApp();
    await app.listen(0);
    const prisma = app.get(PrismaService);
    const findStatuses = prisma.status.findMany.bind(prisma.status);
    let reached!: () => void;
    const inRequest = new Promise<void>((resolve) => (reached = resolve));
    vi.spyOn(prisma.status, "findMany").mockImplementation((async (...args: Parameters<typeof findStatuses>) => {
      await prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT 1`;
        reached();
        // Long enough for app.close() to have run everything before the HTTP
        // server's close.
        await new Promise((resolve) => setTimeout(resolve, 300));
        await tx.$queryRaw`SELECT 1`;
      });
      return findStatuses(...args);
    }) as typeof findStatuses);

    // then() sends it now rather than when awaited.
    const status = request(app.getHttpServer())
      .get("/catalogue/statuses")
      .then((response) => response.status);
    await inRequest;
    const closed = app.close();

    expect(await status).toBe(200);
    await closed;
  });
});
