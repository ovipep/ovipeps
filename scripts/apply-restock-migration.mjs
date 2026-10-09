import "dotenv/config";
import { readFile } from "node:fs/promises";
import pg from "pg";

async function main() {
  // Preview builds must never mutate the production database. Vercel sets
  // VERCEL_ENV=production only for the deployment promoted to the live site.
  if (process.env.VERCEL !== "1" || process.env.VERCEL_ENV !== "production") return;

  const connectionString =
    process.env.POSTGRES_PRISMA_URL ??
    process.env.POSTGRES_URL_NON_POOLING ??
    process.env.POSTGRES_URL ??
    process.env.DATABASE_URL;
  if (!connectionString) throw new Error("Production database connection is not configured");

  const connectionUrl = new URL(connectionString);
  connectionUrl.searchParams.delete("sslmode");
  connectionUrl.searchParams.delete("uselibpqcompat");
  const client = new pg.Client({ connectionString: connectionUrl.toString(), ssl: { rejectUnauthorized: false } });
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

    const classroom = await client.query(
      `SELECT to_regclass('public."ClassroomDocument"') IS NOT NULL AS exists`
    );
    if (!classroom.rows[0]?.exists) {
      const sql = await readFile(
        new URL("../prisma/migrations/20260907010000_classroom_documents/migration.sql", import.meta.url),
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
    // Additive change: existing accounts remain unset until the affiliate saves
    // their preferred address. Never assume the login email is the payout email.
    const payoutEmailSql = await readFile(
      new URL("../prisma/migrations/20261009000500_affiliate_payout_email/migration.sql", import.meta.url),
      "utf8"
    );
    await client.query(payoutEmailSql);
    const payoutEmailColumn = await client.query(
      `SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'AffiliateAccount' AND column_name = 'payoutEmail'`
    );
    if (payoutEmailColumn.rowCount !== 1) throw new Error("Affiliate payout email column verification failed");
    console.log("Affiliate payout email column verified");
  } finally {
    await client.query("SELECT pg_advisory_unlock($1)", [817_202_609]).catch(() => undefined);
    await client.end();
  }
}

main().catch((error) => {
  console.error("Restock migration failed", error);
  process.exit(1);
});
