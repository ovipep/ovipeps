import { db } from "@/lib/db";

export const BULK_ORDER_STATUSES = [
  "PENDING_DECISION",
  "PURCHASED",
  "OPTED_OUT",
] as const;

export type BulkOrderStatus = (typeof BULK_ORDER_STATUSES)[number];

export interface BulkOrderItem {
  productId: string;
  productName: string;
  productSlug: string;
  kits: number;
  units: number;
}

let schemaPromise: Promise<void> | null = null;

/**
 * The production app historically deploys without running Prisma migrations.
 * Keep this idempotent bootstrap so the feature is usable immediately while
 * retaining the Prisma model as the source of truth.
 */
export function ensureBulkOrderSchema() {
  if (!schemaPromise) {
    schemaPromise = (async () => {
      await db.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "BulkOrderRequest" (
          "id" TEXT PRIMARY KEY,
          "firstName" TEXT NOT NULL,
          "lastName" TEXT NOT NULL,
          "email" TEXT NOT NULL,
          "items" JSONB NOT NULL,
          "additionalContext" TEXT,
          "status" TEXT NOT NULL DEFAULT 'PENDING_DECISION',
          "adminDecision" TEXT,
          "discountedPricing" TEXT,
          "eta" TEXT,
          "paymentConfirmed" BOOLEAN NOT NULL DEFAULT FALSE,
          "paymentConfirmedAt" TIMESTAMP(3),
          "customerDecisionSentAt" TIMESTAMP(3),
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await db.$executeRawUnsafe(
        `CREATE INDEX IF NOT EXISTS "BulkOrderRequest_status_createdAt_idx" ON "BulkOrderRequest"("status", "createdAt")`
      );
      await db.$executeRawUnsafe(
        `CREATE INDEX IF NOT EXISTS "BulkOrderRequest_email_idx" ON "BulkOrderRequest"("email")`
      );
    })().catch((error) => {
      schemaPromise = null;
      throw error;
    });
  }
  return schemaPromise;
}

export function isBulkOrderStatus(value: unknown): value is BulkOrderStatus {
  return typeof value === "string" && BULK_ORDER_STATUSES.includes(value as BulkOrderStatus);
}

export function parseBulkOrderItems(value: unknown): BulkOrderItem[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is BulkOrderItem => {
    if (!item || typeof item !== "object") return false;
    const candidate = item as Partial<BulkOrderItem>;
    return (
      typeof candidate.productId === "string" &&
      typeof candidate.productName === "string" &&
      typeof candidate.productSlug === "string" &&
      Number.isInteger(candidate.kits) &&
      Number(candidate.kits) > 0 &&
      Number(candidate.units) === Number(candidate.kits) * 10
    );
  });
}

export function formatBulkOrderStatus(status: string) {
  if (status === "PURCHASED") return "Purchased";
  if (status === "OPTED_OUT") return "Opted Out";
  return "Pending Decision";
}
