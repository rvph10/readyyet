import { PrismaPg } from "@prisma/adapter-pg";

// pg waits forever by default: for a free connection, for Postgres to
// answer, and for a transaction its client never ends. One stuck query
// would then hold its connection and its locks until a redeploy.
export function pgAdapter() {
  return new PrismaPg({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 10_000,
    // The slowest queries, the retention deletes and an export's batches,
    // take well under a second at today's size.
    statement_timeout: 30_000,
    // As long as the longest transaction, an export's (location-export.ts).
    idle_in_transaction_session_timeout: 60_000,
  });
}
