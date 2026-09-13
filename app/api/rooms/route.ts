import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, unauthorized } from "@/lib/auth";

export async function GET(req: NextRequest) {
  if (!(await requireAdmin())) return unauthorized();
  const { searchParams } = new URL(req.url);
  const locationId = searchParams.get("locationId");

  const rooms = await prisma.room.findMany({
    where: locationId ? { locationId: Number(locationId) } : undefined,
    include: {
      options: { orderBy: { id: "asc" } },
      location: { select: { name: true } },
    },
    orderBy: { roomNumber: "asc" },
  });
  return NextResponse.json(rooms);
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return unauthorized();
  const body = await req.json();
  const { locationId, roomNumber, roomType, baseRent, waterRate, electricRate, options = [] } = body;

  if (!locationId || !roomNumber?.trim() || baseRent == null || waterRate == null || electricRate == null) {
    return NextResponse.json({ error: "ข้อมูลไม่ครบถ้วน" }, { status: 400 });
  }

  // Check uniqueness
  const exists = await prisma.room.findUnique({
    where: { locationId_roomNumber: { locationId: Number(locationId), roomNumber: roomNumber.trim() } },
  });
  if (exists) {
    return NextResponse.json({ error: "เลขห้องซ้ำในหอพักนี้" }, { status: 400 });
  }

  const room = await prisma.room.create({
    data: {
      locationId: Number(locationId),
      roomNumber: roomNumber.trim(),
      roomType: roomType?.trim() || null,
      baseRent: Number(baseRent),
      waterRate: Number(waterRate),
      electricRate: Number(electricRate),
      options: {
        create: options
          .filter((o: { name: string; price: number }) => o.name?.trim())
          .map((o: { name: string; price: number }) => ({
            name: o.name.trim(),
            price: Number(o.price) || 0,
          })),
      },
    },
    include: {
      options: true,
      location: { select: { name: true } },
    },
  });

  return NextResponse.json(room, { status: 201 });
}
