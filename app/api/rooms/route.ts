import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId, requireOwnerOfApartment, isAuthResponse } from "@/lib/auth";
import { checkRoomQuota, quotaExceededResponse, QuotaExceededError } from "@/lib/quota";

export const runtime = "nodejs";

type RoomOptionInput = { name?: string; price?: number };

function mapRoom(room: any) {
  return { ...room, locationId: room.apartmentId, location: room.Apartment };
}

export async function GET(req: NextRequest) {
  const userId = await requireUserId();
  if (isAuthResponse(userId)) return userId;
  const locationId = req.nextUrl.searchParams.get("locationId");
  const where = locationId
    ? { apartmentId: Number(locationId), Apartment: { ownerUserId: userId } }
    : { Apartment: { ownerUserId: userId } };
  const rooms = await prisma.room.findMany({
    where,
    include: { options: { orderBy: { id: "asc" } }, Apartment: { select: { id: true, name: true } } },
    orderBy: { roomNumber: "asc" },
  });
  return NextResponse.json(rooms.map(mapRoom));
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { locationId, roomNumber, roomType, baseRent, waterRate, electricRate, options = [] } = body;
  if (!locationId || !roomNumber?.trim() || baseRent == null || waterRate == null || electricRate == null) {
    return NextResponse.json({ error: "ข้อมูลไม่ครบถ้วน" }, { status: 400 });
  }
  const userId = await requireOwnerOfApartment(Number(locationId));
  if (isAuthResponse(userId)) return userId;

  // Quota check: verify user can create 1 room
  try {
    await checkRoomQuota(userId, 1);
  } catch (error) {
    if (error instanceof QuotaExceededError) {
      return quotaExceededResponse(error);
    }
    throw error;
  }

  const exists = await prisma.room.findUnique({
    where: { apartmentId_roomNumber: { apartmentId: Number(locationId), roomNumber: roomNumber.trim() } },
  });
  if (exists) return NextResponse.json({ error: "เลขห้องซ้ำในหอพักนี้" }, { status: 400 });
  const room = await prisma.room.create({
    data: {
      apartmentId: Number(locationId), roomNumber: roomNumber.trim(), roomType: roomType?.trim() || null,
      baseRent: Number(baseRent), waterRate: Number(waterRate), electricRate: Number(electricRate),
      options: { create: (options as RoomOptionInput[]).filter((o) => o.name?.trim()).map((o) => ({ name: o.name!.trim(), price: Number(o.price) || 0 })) },
    },
    include: { options: true, Apartment: { select: { id: true, name: true } } },
  });
  return NextResponse.json(mapRoom(room), { status: 201 });
}
