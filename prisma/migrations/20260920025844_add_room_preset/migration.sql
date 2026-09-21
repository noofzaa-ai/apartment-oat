-- CreateTable
CREATE TABLE "RoomPreset" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "apartmentId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "roomType" TEXT,
    "baseRent" REAL NOT NULL,
    "waterRate" REAL NOT NULL,
    "electricRate" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RoomPreset_apartmentId_fkey" FOREIGN KEY ("apartmentId") REFERENCES "Apartment" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RoomPresetOption" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "presetId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "price" REAL NOT NULL,
    CONSTRAINT "RoomPresetOption_presetId_fkey" FOREIGN KEY ("presetId") REFERENCES "RoomPreset" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "RoomPreset_apartmentId_idx" ON "RoomPreset"("apartmentId");
