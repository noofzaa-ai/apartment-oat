import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PrismaBetterSqlite3 } = require("@prisma/adapter-better-sqlite3");

// Use DATABASE_URL env var or fallback to development path
const databaseUrl = process.env.DATABASE_URL || "file:./prisma/dev.db";
const adapter = new PrismaBetterSqlite3({ url: databaseUrl });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding database...");

  // --- Idempotent reset ---
  await prisma.billLineItem.deleteMany();
  await prisma.bill.deleteMany();
  await prisma.meterReading.deleteMany();
  await prisma.roomOption.deleteMany();
  await prisma.tenant.deleteMany();
  await prisma.room.deleteMany();
  await prisma.location.deleteMany();
  await prisma.admin.deleteMany();

  // --- Admin account ---
  const adminPasswordHash = await bcrypt.hash("admin1234", 10);
  await prisma.admin.create({
    data: { username: "admin", passwordHash: adminPasswordHash },
  });

  // --- Locations ---
  const loc1 = await prisma.location.create({
    data: {
      name: "หอพักสุขใจ",
      address: "123 ถนนสุขุมวิท แขวงคลองเตย เขตคลองเตย กรุงเทพฯ 10110",
    },
  });

  const loc2 = await prisma.location.create({
    data: {
      name: "อพาร์ทเมนต์ริมคลอง",
      address: "456 ถนนลาดพร้าว แขวงลาดพร้าว เขตลาดพร้าว กรุงเทพฯ 10230",
    },
  });

  // --- Rooms for loc1 ---
  const room101 = await prisma.room.create({
    data: {
      locationId: loc1.id,
      roomNumber: "101",
      roomType: "ห้องเดี่ยว",
      baseRent: 3000,
      waterRate: 18,
      electricRate: 7,
      options: {
        create: [
          { name: "ที่จอดรถ", price: 500 },
          { name: "Wi-Fi", price: 200 },
        ],
      },
    },
  });

  const room102 = await prisma.room.create({
    data: {
      locationId: loc1.id,
      roomNumber: "102",
      roomType: "ห้องคู่",
      baseRent: 4500,
      waterRate: 18,
      electricRate: 7,
      options: {
        create: [{ name: "แอร์", price: 800 }],
      },
    },
  });

  const room103 = await prisma.room.create({
    data: {
      locationId: loc1.id,
      roomNumber: "103",
      roomType: "ห้องเดี่ยว",
      baseRent: 3000,
      waterRate: 18,
      electricRate: 7,
    },
  });

  // --- Rooms for loc2 ---
  const room201 = await prisma.room.create({
    data: {
      locationId: loc2.id,
      roomNumber: "201",
      roomType: "ห้องสตูดิโอ",
      baseRent: 5000,
      waterRate: 20,
      electricRate: 8,
      options: {
        create: [
          { name: "ที่จอดรถ", price: 600 },
          { name: "แอร์", price: 800 },
        ],
      },
    },
  });

  // --- Tenants (linked to rooms) ---
  const pin101Hash = await bcrypt.hash("123456", 10);
  await prisma.tenant.create({
    data: {
      name: "สมชาย ใจดี",
      email: "somchai@example.com",
      phone: "081-234-5678",
      pinHash: pin101Hash,
      roomId: room101.id,
      moveInDate: new Date("2025-01-01"),
      deposit: 6000,
      isActive: true,
    },
  });

  const pin102Hash = await bcrypt.hash("654321", 10);
  await prisma.tenant.create({
    data: {
      name: "มาลี รักสวย",
      email: "malee@example.com",
      phone: "089-876-5432",
      pinHash: pin102Hash,
      roomId: room102.id,
      moveInDate: new Date("2025-03-01"),
      deposit: 9000,
      isActive: true,
    },
  });

  // --- Meter readings for May 2025 (previous month) ---
  const prevPeriod = "2025-05";
  await prisma.meterReading.createMany({
    data: [
      { roomId: room101.id, period: prevPeriod, waterReading: 450, electricReading: 890 },
      { roomId: room102.id, period: prevPeriod, waterReading: 678, electricReading: 1045 },
      { roomId: room103.id, period: prevPeriod, waterReading: 345, electricReading: 567 },
      { roomId: room201.id, period: prevPeriod, waterReading: 120, electricReading: 430 },
    ],
  });

  // --- Meter readings for June 2025 (current month) ---
  const currPeriod = "2025-06";
  const readings = [
    { roomId: room101.id, period: currPeriod, waterReading: 463, electricReading: 948 },
    { roomId: room102.id, period: currPeriod, waterReading: 697, electricReading: 1120 },
    { roomId: room103.id, period: currPeriod, waterReading: 358, electricReading: 599 },
    { roomId: room201.id, period: currPeriod, waterReading: 135, electricReading: 478 },
  ];
  await prisma.meterReading.createMany({ data: readings });

  // --- Generate bills for June 2025 ---
  const roomsForBilling = [
    { room: room101, curr: readings[0], prev: { waterReading: 450, electricReading: 890 } },
    { room: room102, curr: readings[1], prev: { waterReading: 678, electricReading: 1045 } },
    { room: room103, curr: readings[2], prev: { waterReading: 345, electricReading: 567 } },
    { room: room201, curr: readings[3], prev: { waterReading: 120, electricReading: 430 } },
  ];

  for (const { room, curr, prev } of roomsForBilling) {
    const waterUnits = curr.waterReading - prev.waterReading;
    const electricUnits = curr.electricReading - prev.electricReading;
    const waterCost = waterUnits * room.waterRate;
    const electricCost = electricUnits * room.electricRate;

    const roomWithOptions = await prisma.room.findUnique({
      where: { id: room.id },
      include: { options: true },
    });
    const optionsCost = roomWithOptions?.options.reduce((s, o) => s + o.price, 0) ?? 0;
    const total = room.baseRent + waterCost + electricCost + optionsCost;

    const lineItems = [
      { label: "ค่าเช่า", amount: room.baseRent },
      { label: `ค่าน้ำ (${waterUnits} หน่วย × ${room.waterRate} บาท)`, amount: waterCost },
      { label: `ค่าไฟ (${electricUnits} หน่วย × ${room.electricRate} บาท)`, amount: electricCost },
      ...(roomWithOptions?.options.map((o) => ({ label: o.name, amount: o.price })) ?? []),
    ];

    await prisma.bill.create({
      data: {
        roomId: room.id,
        period: currPeriod,
        baseRent: room.baseRent,
        waterUnits,
        waterCost,
        electricUnits,
        electricCost,
        optionsCost,
        total,
        paymentStatus: "UNPAID",
        lineItems: { create: lineItems },
      },
    });
  }

  // Mark room101 bill as paid
  await prisma.bill.update({
    where: { roomId_period: { roomId: room101.id, period: currPeriod } },
    data: { paymentStatus: "PAID", paidAt: new Date() },
  });

  console.log("Seeding complete!");
  console.log(`  Admin: username=admin / password=admin1234`);
  console.log(`  Tenant 1: email=somchai@example.com / PIN=123456 (ห้อง 101)`);
  console.log(`  Tenant 2: email=malee@example.com / PIN=654321 (ห้อง 102)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
