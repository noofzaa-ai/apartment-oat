import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, unauthorized } from "@/lib/auth";

export async function GET(req: NextRequest) {
  if (!(await requireAdmin())) return unauthorized();
  const { searchParams } = new URL(req.url);
  const locationId = searchParams.get("locationId");
  const period = searchParams.get("period"); // YYYY-MM

  if (!period) {
    return NextResponse.json({ error: "period required" }, { status: 400 });
  }

  // Compute previous period
  const [year, month] = period.split("-").map(Number);
  const prevDate = new Date(year, month - 2, 1);
  const prevPeriod = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`;

  // Get rooms for this location
  const rooms = await prisma.room.findMany({
    where: locationId ? { locationId: Number(locationId) } : undefined,
    include: {
      options: true,
      location: { select: { name: true } },
    },
    orderBy: { roomNumber: "asc" },
  });

  // Get current readings
  const currentReadings = await prisma.meterReading.findMany({
    where: {
      roomId: { in: rooms.map((r) => r.id) },
      period,
    },
  });

  // Get previous readings
  const prevReadings = await prisma.meterReading.findMany({
    where: {
      roomId: { in: rooms.map((r) => r.id) },
      period: prevPeriod,
    },
  });

  const currentMap = new Map(currentReadings.map((r) => [r.roomId, r]));
  const prevMap = new Map(prevReadings.map((r) => [r.roomId, r]));

  const result = rooms.map((room) => ({
    room,
    current: currentMap.get(room.id) || null,
    previous: prevMap.get(room.id) || null,
    prevPeriod,
  }));

  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return unauthorized();
  const body = await req.json();
  const { period, readings } = body;
  // readings: [{ roomId, waterReading, electricReading }]

  if (!period || !Array.isArray(readings)) {
    return NextResponse.json({ error: "ข้อมูลไม่ครบถ้วน" }, { status: 400 });
  }

  const saved = [];
  for (const r of readings) {
    if (r.waterReading == null || r.electricReading == null) continue;
    const result = await prisma.meterReading.upsert({
      where: { roomId_period: { roomId: Number(r.roomId), period } },
      create: {
        roomId: Number(r.roomId),
        period,
        waterReading: Number(r.waterReading),
        electricReading: Number(r.electricReading),
      },
      update: {
        waterReading: Number(r.waterReading),
        electricReading: Number(r.electricReading),
      },
    });
    saved.push(result);
  }

  return NextResponse.json({ saved: saved.length });
}
