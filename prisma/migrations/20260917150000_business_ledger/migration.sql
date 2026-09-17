CREATE TABLE IF NOT EXISTS "LedgerEntry" (
  "id" TEXT NOT NULL, "transactionAt" TIMESTAMP(3) NOT NULL,
  "entryType" TEXT NOT NULL, "category" TEXT NOT NULL,
  "description" TEXT NOT NULL, "amount" DOUBLE PRECISION NOT NULL,
  "taxAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "shippingAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "paymentMethod" TEXT, "reference" TEXT, "notes" TEXT, "createdBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LedgerEntry_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "LedgerEntry_transactionAt_idx" ON "LedgerEntry"("transactionAt");
CREATE INDEX IF NOT EXISTS "LedgerEntry_entryType_transactionAt_idx" ON "LedgerEntry"("entryType", "transactionAt");
