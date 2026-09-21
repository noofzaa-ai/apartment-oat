import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId, isAuthResponse } from "@/lib/auth";

export const runtime = "nodejs";

function previousPeriod(period: string) {
  const [year, month] = period.split("-").map(Number);
  const prevDate = new Date(year, month - 2, 1);
  return `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`;
}
function mapRoom(room: any) { return { ...room, locationId: room.apartmentId, location: room.Apartment }; }

export async function GET(req: NextRequest) {
  const userId = await requireUserId();
  if (isAuthResponse(userId)) return userId;
  const locationId = req.nextUrl.searchParams.get("locationId");
  const period = req.nextUrl.searchParams.get("period");
  if (!period) return NextResponse.json({ error: "period required" }, { status: 400 });
  const prevPeriod = previousPeriod(period);
  const rooms = await prisma.room.findMany({
    where: locationId ? { apartmentId: Number(locationId), Apartment: { ownerUserId: userId } } : { Apartment: { ownerUserId: userId } },
    include: { options: true, Apartment: { select: { id: true, name: true } } },
    orderBy: { roomNumber: "asc" },
  });
  const roomIds = rooms.map((r) => r.id);
  const [currentReadings, prevReadings] = await Promise.all([
    prisma.meterReading.findMany({ where: { roomId: { in: roomIds }, period } }),
    prisma.meterReading.findMany({ where: { roomId: { in: roomIds }, period: prevPeriod } }),
  ]);
  const currentMap = new Map(currentReadings.map((r) => [r.roomId, r]));
  const prevMap = new Map(prevReadings.map((r) => [r.roomId, r]));
  return NextResponse.json(rooms.map((room) => ({ room: mapRoom(room), current: currentMap.get(room.id) || null, previous: prevMap.get(room.id) || null, prevPeriod })));
}

export async function POST(req: NextRequest) {
  const userId = await requireUserId();
  if (isAuthResponse(userId)) return userId;
  const { period, readings } = await req.json();
  if (!period || !Array.isArray(readings)) return NextResponse.json({ error: "ข้อมูลไม่ครบถ้วน" }, { status: 400 });
  const roomIds = readings.map((r: { roomId: number }) => Number(r.roomId)).filter(Number.isFinite);
  const rooms = await prisma.room.findMany({ where: { id: { in: roomIds }, Apartment: { ownerUserId: userId } }, select: { id: true } });
  const allowed = new Set(rooms.map((r) => r.id));
  let saved = 0;
  for (const r of readings as { roomId: number; waterReading: number; electricReading: number }[]) {
    const roomId = Number(r.roomId);
    if (!allowed.has(roomId) || r.waterReading == null || r.electricReading == null) continue;
    await prisma.meterReading.upsert({
      where: { roomId_period: { roomId, period } },
      create: { roomId, period, waterReading: Number(r.waterReading), electricReading: Number(r.electricReading) },
      update: { waterReading: Number(r.waterReading), electricReading: Number(r.electricReading) },
    });
    saved++;
  }
  return NextResponse.json({ saved });
}
