/*
  Warnings:

  - You are about to drop the column `roomQuota` on the `Subscription` table. All the data in the column will be lost.
  - Added the required column `planCode` to the `Subscription` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "Plan" (
    "code" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "pricePerRoom" REAL NOT NULL,
    "tierSize" INTEGER NOT NULL DEFAULT 25,
    "maxRooms" INTEGER,
    "features" TEXT NOT NULL DEFAULT '[]',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- Seed Plans
INSERT INTO "Plan" ("code", "name", "displayName", "pricePerRoom", "tierSize", "maxRooms", "features", "isActive", "sortOrder", "createdAt", "updatedAt") VALUES
('TRIAL', 'trial', 'Trial', 0.0, 25, 10, '[]', 1, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('STARTER', 'starter', 'Starter', 5.0, 25, NULL, '[]', 1, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('STANDARD', 'standard', 'Standard', 8.0, 25, NULL, '["room_preset","bulk_create","export_csv","dashboard","email_notify","multi_user:2"]', 1, 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('PRO', 'pro', 'Pro', 12.0, 25, NULL, '["room_preset","bulk_create","export_csv","dashboard","email_notify","multi_user:unlimited","custom_branding","line_notify","payment_gateway","api_access","priority_support","advanced_reports"]', 1, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Subscription" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "planCode" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'TRIAL',
    "billingCycle" TEXT NOT NULL DEFAULT 'MONTHLY',
    "trialEndsAt" DATETIME,
    "currentPeriodStart" DATETIME,
    "currentPeriodEnd" DATETIME,
    "roomQuotaSnapshot" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Subscription_planCode_fkey" FOREIGN KEY ("planCode") REFERENCES "Plan" ("code") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Subscription" ("createdAt", "currentPeriodEnd", "id", "status", "trialEndsAt", "updatedAt", "userId") SELECT "createdAt", "currentPeriodEnd", "id", "status", "trialEndsAt", "updatedAt", "userId" FROM "Subscription";
DROP TABLE "Subscription";
ALTER TABLE "new_Subscription" RENAME TO "Subscription";
CREATE UNIQUE INDEX "Subscription_userId_key" ON "Subscription"("userId");
CREATE INDEX "Subscription_planCode_idx" ON "Subscription"("planCode");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
