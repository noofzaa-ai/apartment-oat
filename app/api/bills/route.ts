import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, unauthorized } from "@/lib/auth";

export async function GET(req: NextRequest) {
  if (!(await requireAdmin())) return unauthorized();
  const { searchParams } = new URL(req.url);
  const locationId = searchParams.get("locationId");
  const period = searchParams.get("period");

  if (!period) {
    return NextResponse.json({ error: "period required" }, { status: 400 });
  }

  const bills = await prisma.bill.findMany({
    where: {
      period,
      room: locationId ? { locationId: Number(locationId) } : undefined,
    },
    include: {
      room: {
        include: {
          options: true,
          location: { select: { id: true, name: true } },
        },
      },
      lineItems: true,
    },
    orderBy: { room: { roomNumber: "asc" } },
  });

  return NextResponse.json(bills);
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return unauthorized();
  // Generate/refresh bills for a period + location
  const body = await req.json();
  const { locationId, period } = body;

  if (!period) {
    return NextResponse.json({ error: "period required" }, { status: 400 });
  }

  const [year, month] = period.split("-").map(Number);
  const prevDate = new Date(year, month - 2, 1);
  const prevPeriod = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`;

  // Get rooms
  const rooms = await prisma.room.findMany({
    where: locationId ? { locationId: Number(locationId) } : undefined,
    include: { options: true },
    orderBy: { roomNumber: "asc" },
  });

  const results = [];
  const errors = [];

  for (const room of rooms) {
    const currReading = await prisma.meterReading.findUnique({
      where: { roomId_period: { roomId: room.id, period } },
    });

    if (!currReading) {
      errors.push({ roomId: room.id, roomNumber: room.roomNumber, error: "ยังไม่มีข้อมูลมิเตอร์เดือนนี้" });
      continue;
    }

    const prevReading = await prisma.meterReading.findUnique({
      where: { roomId_period: { roomId: room.id, period: prevPeriod } },
    });

    const waterUnits = prevReading ? currReading.waterReading - prevReading.waterReading : 0;
    const electricUnits = prevReading ? currReading.electricReading - prevReading.electricReading : 0;
    const waterCost = Math.max(0, waterUnits) * room.waterRate;
    const electricCost = Math.max(0, electricUnits) * room.electricRate;
    const optionsCost = room.options.reduce((s, o) => s + o.price, 0);
    const total = room.baseRent + waterCost + electricCost + optionsCost;

    const lineItems = [
      { label: "ค่าเช่า", amount: room.baseRent },
      { label: `ค่าน้ำ (${Math.max(0, waterUnits)} หน่วย × ${room.waterRate} บาท)`, amount: waterCost },
      { label: `ค่าไฟ (${Math.max(0, electricUnits)} หน่วย × ${room.electricRate} บาท)`, amount: electricCost },
      ...room.options.map((o) => ({ label: o.name, amount: o.price })),
    ];

    // Upsert bill (preserve paymentStatus if exists)
    const existing = await prisma.bill.findUnique({
      where: { roomId_period: { roomId: room.id, period } },
    });

    await prisma.billLineItem.deleteMany({
      where: { billId: existing?.id ?? -1 },
    });

    const bill = await prisma.bill.upsert({
      where: { roomId_period: { roomId: room.id, period } },
      create: {
        roomId: room.id,
        period,
        baseRent: room.baseRent,
        waterUnits: Math.max(0, waterUnits),
        waterCost,
        electricUnits: Math.max(0, electricUnits),
        electricCost,
        optionsCost,
        total,
        paymentStatus: "UNPAID",
        lineItems: { create: lineItems },
      },
      update: {
        baseRent: room.baseRent,
        waterUnits: Math.max(0, waterUnits),
        waterCost,
        electricUnits: Math.max(0, electricUnits),
        electricCost,
        optionsCost,
        total,
        lineItems: { create: lineItems },
      },
      include: { lineItems: true, room: { include: { location: { select: { name: true } } } } },
    });

    results.push({ bill, noPrevReading: !prevReading });
  }

  return NextResponse.json({ results, errors });
}
