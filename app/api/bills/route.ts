import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId, isAuthResponse } from "@/lib/auth";

export const runtime = "nodejs";

function mapBill(bill: any) {
  return { ...bill, room: { ...bill.room, location: bill.room.Apartment } };
}

function previousPeriod(period: string) {
  const [year, month] = period.split("-").map(Number);
  const prevDate = new Date(year, month - 2, 1);
  return `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`;
}

export async function GET(req: NextRequest) {
  const userId = await requireUserId();
  if (isAuthResponse(userId)) return userId;
  const locationId = req.nextUrl.searchParams.get("locationId");
  const period = req.nextUrl.searchParams.get("period");
  if (!period) return NextResponse.json({ error: "period required" }, { status: 400 });
  const bills = await prisma.bill.findMany({
    where: {
      period,
      room: {
        Apartment: { ownerUserId: userId },
        ...(locationId ? { apartmentId: Number(locationId) } : {}),
      },
    },
    include: {
      room: { include: { options: true, Apartment: { select: { id: true, name: true } } } },
      lineItems: true,
    },
    orderBy: { room: { roomNumber: "asc" } },
  });
  return NextResponse.json(bills.map(mapBill));
}

export async function POST(req: NextRequest) {
  const userId = await requireUserId();
  if (isAuthResponse(userId)) return userId;
  const { locationId, period } = await req.json();
  if (!period) return NextResponse.json({ error: "period required" }, { status: 400 });
  const prevPeriod = previousPeriod(period);

  const rooms = await prisma.room.findMany({
    where: {
      Apartment: { ownerUserId: userId },
      ...(locationId ? { apartmentId: Number(locationId) } : {}),
    },
    include: { options: true },
    orderBy: { roomNumber: "asc" },
  });

  const results: unknown[] = [];
  const errors: unknown[] = [];

  for (const room of rooms) {
    const currReading = await prisma.meterReading.findUnique({ where: { roomId_period: { roomId: room.id, period } } });
    if (!currReading) {
      errors.push({ roomId: room.id, roomNumber: room.roomNumber, error: "ยังไม่มีข้อมูลมิเตอร์เดือนนี้" });
      continue;
    }
    const prevReading = await prisma.meterReading.findUnique({ where: { roomId_period: { roomId: room.id, period: prevPeriod } } });
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

    const existing = await prisma.bill.findUnique({ where: { roomId_period: { roomId: room.id, period } } });
    await prisma.billLineItem.deleteMany({ where: { billId: existing?.id ?? -1 } });

    const bill = await prisma.bill.upsert({
      where: { roomId_period: { roomId: room.id, period } },
      create: {
        roomId: room.id, period, baseRent: room.baseRent, waterUnits: Math.max(0, waterUnits), waterCost,
        electricUnits: Math.max(0, electricUnits), electricCost, optionsCost, total, paymentStatus: "UNPAID",
        lineItems: { create: lineItems },
      },
      update: {
        baseRent: room.baseRent, waterUnits: Math.max(0, waterUnits), waterCost,
        electricUnits: Math.max(0, electricUnits), electricCost, optionsCost, total,
        lineItems: { create: lineItems },
      },
      include: { lineItems: true, room: { include: { Apartment: { select: { id: true, name: true } } } } },
    });

    results.push({ bill: mapBill(bill), noPrevReading: !prevReading });
  }

  return NextResponse.json({ results, errors });
}
