CREATE TABLE IF NOT EXISTS "LedgerEntry" (
  "id" TEXT NOT NULL, "transactionAt" TIMESTAMP(3) NOT NULL,
  "entryType" TEXT NOT NULL, "category" TEXT NOT NULL,
  "description" TEXT NOT NULL, "amount" DOUBLE PRECISION NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'CAD',
  "foreignAmount" DOUBLE PRECISION,
  "fxRate" DOUBLE PRECISION,
  "fxRateDate" TIMESTAMP(3),
  "fxRateSource" TEXT,
  "taxAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "shippingAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "paymentMethod" TEXT, "reference" TEXT, "notes" TEXT, "createdBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LedgerEntry_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "LedgerEntry" ADD COLUMN IF NOT EXISTS "currency" TEXT NOT NULL DEFAULT 'CAD';
ALTER TABLE "LedgerEntry" ADD COLUMN IF NOT EXISTS "foreignAmount" DOUBLE PRECISION;
ALTER TABLE "LedgerEntry" ADD COLUMN IF NOT EXISTS "fxRate" DOUBLE PRECISION;
ALTER TABLE "LedgerEntry" ADD COLUMN IF NOT EXISTS "fxRateDate" TIMESTAMP(3);
ALTER TABLE "LedgerEntry" ADD COLUMN IF NOT EXISTS "fxRateSource" TEXT;
CREATE INDEX IF NOT EXISTS "LedgerEntry_transactionAt_idx" ON "LedgerEntry"("transactionAt");
CREATE INDEX IF NOT EXISTS "LedgerEntry_entryType_transactionAt_idx" ON "LedgerEntry"("entryType", "transactionAt");

-- Ledger records are server-only. RLS provides a second layer of protection if
-- the public Supabase Data API is enabled for the public schema.
ALTER TABLE "LedgerEntry" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "LedgerEntry" FROM anon, authenticated;
