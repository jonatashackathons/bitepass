-- CreateEnums
CREATE TYPE "OrderStatus" AS ENUM ('PROPOSED', 'AUTHORIZING', 'AUTHORIZED', 'CAPTURING', 'CAPTURED', 'COLLECTED', 'VOIDING', 'VOIDED', 'CANCELLED_FEE_CAPTURED', 'EXPIRED', 'CAPTURE_FAILED', 'REFUNDED');
CREATE TYPE "FulfillmentStage" AS ENUM ('GRACE_HOLD', 'KITCHEN_FIRED', 'READY', 'HANDED_OFF', 'QUARANTINED');
CREATE TYPE "StationKind" AS ENUM ('HIGH_TOP_BAY', 'SMART_CUBBY');
CREATE TYPE "StationHealth" AS ENUM ('AVAILABLE', 'QUARANTINED', 'MAINTENANCE');

CREATE SEQUENCE IF NOT EXISTS order_display_seq START 1091;

CREATE TABLE "Merchant" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "paypalMerchantId" TEXT,
    "paymentsReceivable" BOOLEAN NOT NULL DEFAULT true,
    "primaryEmailConfirmed" BOOLEAN NOT NULL DEFAULT true,
    "taxRateBps" INTEGER NOT NULL DEFAULT 800,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "geofenceRadiusM" INTEGER NOT NULL DEFAULT 50,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Merchant_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Merchant_slug_key" ON "Merchant"("slug");

CREATE TABLE "MenuItem" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "basePriceCents" INTEGER NOT NULL,
    "prepTimeMinutes" INTEGER NOT NULL,
    "dietaryTags" TEXT[],
    "allergens" TEXT[],
    "calories" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "imageUrl" TEXT,
    "quickTweaksJson" JSONB,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "MenuItem_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "MenuItem_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "MenuItem_merchantId_isAvailable_idx" ON "MenuItem"("merchantId", "isAvailable");

CREATE TABLE "Station" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "kind" "StationKind" NOT NULL,
    "priorityOrder" INTEGER NOT NULL,
    "health" "StationHealth" NOT NULL DEFAULT 'AVAILABLE',
    CONSTRAINT "Station_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Station_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "Station_merchantId_code_key" ON "Station"("merchantId", "code");
CREATE INDEX "Station_merchantId_health_kind_priorityOrder_idx" ON "Station"("merchantId", "health", "kind", "priorityOrder");

CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "displayCode" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "menuItemId" TEXT NOT NULL,
    "stationId" TEXT,
    "stationCode" TEXT NOT NULL,
    "selectedTweak" TEXT,
    "selectedTweakId" TEXT,
    "baseAmountCents" INTEGER NOT NULL,
    "tweakAmountCents" INTEGER NOT NULL DEFAULT 0,
    "taxAmountCents" INTEGER NOT NULL,
    "tipAmountCents" INTEGER NOT NULL,
    "fastPassFeeCents" INTEGER NOT NULL DEFAULT 0,
    "platformFeeCents" INTEGER NOT NULL DEFAULT 0,
    "totalAmountCents" INTEGER NOT NULL,
    "restockingFeeCents" INTEGER,
    "status" "OrderStatus" NOT NULL DEFAULT 'PROPOSED',
    "fulfillmentStage" "FulfillmentStage" NOT NULL DEFAULT 'GRACE_HOLD',
    "paypalOrderId" TEXT,
    "paypalAuthId" TEXT,
    "paypalCaptureId" TEXT,
    "paypalRefundId" TEXT,
    "offlineQrToken" TEXT,
    "etaMinutes" INTEGER NOT NULL DEFAULT 5,
    "authExpiresAt" TIMESTAMP(3),
    "graceExpiresAt" TIMESTAMP(3),
    "kitchenFiredAt" TIMESTAMP(3),
    "readyAt" TIMESTAMP(3),
    "capturedAt" TIMESTAMP(3),
    "collectedAt" TIMESTAMP(3),
    "voidedAt" TIMESTAMP(3),
    "refundedAt" TIMESTAMP(3),
    "isSimulated" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "authorizedAt" TIMESTAMP(3),
    CONSTRAINT "Order_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Order_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Order_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "MenuItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Order_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "Order_displayCode_key" ON "Order"("displayCode");
CREATE UNIQUE INDEX "Order_paypalOrderId_key" ON "Order"("paypalOrderId");
CREATE UNIQUE INDEX "Order_paypalAuthId_key" ON "Order"("paypalAuthId");
CREATE UNIQUE INDEX "Order_paypalCaptureId_key" ON "Order"("paypalCaptureId");
CREATE UNIQUE INDEX "Order_paypalRefundId_key" ON "Order"("paypalRefundId");
CREATE INDEX "Order_merchantId_status_createdAt_idx" ON "Order"("merchantId", "status", "createdAt" DESC);
CREATE INDEX "Order_userId_status_idx" ON "Order"("userId", "status");
CREATE INDEX "Order_status_authExpiresAt_idx" ON "Order"("status", "authExpiresAt");

-- Hard database invariant preventing bay/cubby double-booking across concurrent checkouts
CREATE UNIQUE INDEX "idx_station_one_active_order"
ON "Order" ("stationId")
WHERE "stationId" IS NOT NULL
  AND "status" IN ('AUTHORIZING', 'AUTHORIZED', 'CAPTURING', 'CAPTURED', 'CAPTURE_FAILED')
  AND "fulfillmentStage" != 'HANDED_OFF';

CREATE TABLE "EscrowLedgerEvent" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "fromStatus" "OrderStatus",
    "toStatus" "OrderStatus" NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "paypalRequestId" TEXT NOT NULL,
    "paypalReferenceId" TEXT,
    "actorType" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EscrowLedgerEvent_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "EscrowLedgerEvent_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "EscrowLedgerEvent_orderId_createdAt_idx" ON "EscrowLedgerEvent"("orderId", "createdAt");

CREATE TABLE "IdempotencyKey" (
    "key" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "responseCode" INTEGER,
    "responseBody" JSONB,
    "lockedUntil" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "IdempotencyKey_pkey" PRIMARY KEY ("key")
);

CREATE INDEX "IdempotencyKey_expiresAt_idx" ON "IdempotencyKey"("expiresAt");

