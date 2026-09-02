import "dotenv/config";
import { readFile } from "node:fs/promises";
import pg from "pg";

async function main() {
  if (process.env.VERCEL !== "1") return;

  const connectionString =
    process.env.POSTGRES_PRISMA_URL ??
    process.env.POSTGRES_URL_NON_POOLING ??
    process.env.POSTGRES_URL ??
    process.env.DATABASE_URL;
  if (!connectionString) throw new Error("Production database connection is not configured");

  const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    await client.query("SELECT pg_advisory_lock($1)", [817_202_609]);
    const existing = await client.query(
      `SELECT to_regclass('public."RestockSubscription"') IS NOT NULL AS exists`
    );
    if (!existing.rows[0]?.exists) {
      const sql = await readFile(
        new URL("../prisma/migrations/20260902010000_restock_notifications/migration.sql", import.meta.url),
        "utf8"
      );
      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    }
  } finally {
    await client.query("SELECT pg_advisory_unlock($1)", [817_202_609]).catch(() => undefined);
    await client.end();
  }
}

main().catch((error) => {
  console.error("Restock migration failed", error);
  process.exit(1);
});
