CREATE TYPE "RestockNotificationType" AS ENUM ('ONE_TIME', 'ONGOING');
CREATE TYPE "RestockSubscriptionStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'UNSUBSCRIBED');
CREATE TYPE "RestockDeliveryStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

CREATE TABLE "RestockSubscription" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "allInventory" BOOLEAN NOT NULL DEFAULT false,
  "notificationType" "RestockNotificationType" NOT NULL,
  "status" "RestockSubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
  "manageTokenHash" TEXT NOT NULL,
  "lastNotificationAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RestockSubscription_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RestockSubscriptionProduct" (
  "id" TEXT NOT NULL,
  "subscriptionId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "completedAt" TIMESTAMP(3),
  "lastNotifiedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RestockSubscriptionProduct_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RestockEvent" (
  "id" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RestockEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RestockDelivery" (
  "id" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "subscriptionId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "status" "RestockDeliveryStatus" NOT NULL DEFAULT 'PENDING',
  "providerId" TEXT,
  "sentAt" TIMESTAMP(3),
  "error" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RestockDelivery_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RestockSubscription_manageTokenHash_key" ON "RestockSubscription"("manageTokenHash");
CREATE INDEX "RestockSubscription_email_status_idx" ON "RestockSubscription"("email", "status");
CREATE INDEX "RestockSubscription_status_allInventory_notificationType_idx" ON "RestockSubscription"("status", "allInventory", "notificationType");
CREATE UNIQUE INDEX "RestockSubscriptionProduct_subscriptionId_productId_key" ON "RestockSubscriptionProduct"("subscriptionId", "productId");
CREATE INDEX "RestockSubscriptionProduct_productId_active_idx" ON "RestockSubscriptionProduct"("productId", "active");
CREATE INDEX "RestockEvent_productId_occurredAt_idx" ON "RestockEvent"("productId", "occurredAt");
CREATE UNIQUE INDEX "RestockDelivery_eventId_subscriptionId_key" ON "RestockDelivery"("eventId", "subscriptionId");
CREATE INDEX "RestockDelivery_subscriptionId_status_idx" ON "RestockDelivery"("subscriptionId", "status");
CREATE INDEX "RestockDelivery_productId_status_idx" ON "RestockDelivery"("productId", "status");

ALTER TABLE "RestockSubscriptionProduct" ADD CONSTRAINT "RestockSubscriptionProduct_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "RestockSubscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RestockSubscriptionProduct" ADD CONSTRAINT "RestockSubscriptionProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RestockEvent" ADD CONSTRAINT "RestockEvent_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RestockDelivery" ADD CONSTRAINT "RestockDelivery_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "RestockEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RestockDelivery" ADD CONSTRAINT "RestockDelivery_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "RestockSubscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RestockSubscription" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RestockSubscriptionProduct" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RestockEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RestockDelivery" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "RestockSubscription", "RestockSubscriptionProduct", "RestockEvent", "RestockDelivery" FROM anon, authenticated;
