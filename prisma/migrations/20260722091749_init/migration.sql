-- CreateTable
CREATE TABLE "Location" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Room" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "locationId" INTEGER NOT NULL,
    "roomNumber" TEXT NOT NULL,
    "roomType" TEXT,
    "baseRent" REAL NOT NULL,
    "waterRate" REAL NOT NULL,
    "electricRate" REAL NOT NULL,
    CONSTRAINT "Room_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RoomOption" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "roomId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "price" REAL NOT NULL,
    CONSTRAINT "RoomOption_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MeterReading" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "roomId" INTEGER NOT NULL,
    "period" TEXT NOT NULL,
    "waterReading" REAL NOT NULL,
    "electricReading" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MeterReading_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Bill" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "roomId" INTEGER NOT NULL,
    "period" TEXT NOT NULL,
    "baseRent" REAL NOT NULL,
    "waterUnits" REAL NOT NULL,
    "waterCost" REAL NOT NULL,
    "electricUnits" REAL NOT NULL,
    "electricCost" REAL NOT NULL,
    "optionsCost" REAL NOT NULL,
    "total" REAL NOT NULL,
    "paymentStatus" TEXT NOT NULL DEFAULT 'UNPAID',
    "paidAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Bill_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BillLineItem" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "billId" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    CONSTRAINT "BillLineItem_billId_fkey" FOREIGN KEY ("billId") REFERENCES "Bill" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Room_locationId_roomNumber_key" ON "Room"("locationId", "roomNumber");

-- CreateIndex
CREATE UNIQUE INDEX "MeterReading_roomId_period_key" ON "MeterReading"("roomId", "period");

-- CreateIndex
CREATE UNIQUE INDEX "Bill_roomId_period_key" ON "Bill"("roomId", "period");
