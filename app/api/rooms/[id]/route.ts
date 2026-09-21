import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOwnerOfApartment, isAuthResponse } from "@/lib/auth";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ id: string }> };
type RoomOptionInput = { name?: string; price?: number };

function mapRoom(room: any) { return { ...room, locationId: room.apartmentId, location: room.Apartment }; }

async function loadRoomForOwner(roomId: number) {
  return prisma.room.findUnique({ where: { id: roomId }, select: { apartmentId: true } });
}

export async function PUT(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const roomId = Number(id);
  const existing = await loadRoomForOwner(roomId);
  if (!existing) return NextResponse.json({ error: "ไม่พบห้อง" }, { status: 404 });
  const auth = await requireOwnerOfApartment(existing.apartmentId);
  if (isAuthResponse(auth)) return auth;
  const { roomType, baseRent, waterRate, electricRate, options = [] } = await req.json();
  if (baseRent == null || waterRate == null || electricRate == null) return NextResponse.json({ error: "ข้อมูลไม่ครบถ้วน" }, { status: 400 });
  await prisma.roomOption.deleteMany({ where: { roomId } });
  const room = await prisma.room.update({
    where: { id: roomId },
    data: {
      roomType: roomType?.trim() || null, baseRent: Number(baseRent), waterRate: Number(waterRate), electricRate: Number(electricRate),
      options: { create: (options as RoomOptionInput[]).filter((o) => o.name?.trim()).map((o) => ({ name: o.name!.trim(), price: Number(o.price) || 0 })) },
    },
    include: { options: true, Apartment: { select: { id: true, name: true } } },
  });
  return NextResponse.json(mapRoom(room));
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const roomId = Number(id);
  const existing = await loadRoomForOwner(roomId);
  if (!existing) return NextResponse.json({ error: "ไม่พบห้อง" }, { status: 404 });
  const auth = await requireOwnerOfApartment(existing.apartmentId);
  if (isAuthResponse(auth)) return auth;
  await prisma.room.delete({ where: { id: roomId } });
  return NextResponse.json({ ok: true });
}
