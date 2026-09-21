import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOwnerOfApartment, isAuthResponse } from "@/lib/auth";
import { requireFeature, isFeatureGateResponse } from "@/lib/feature-gate";

export const runtime = "nodejs";

type PresetOptionInput = { name?: string; price?: number };

// GET /api/admin/room-presets?apartmentId=<id>
export async function GET(req: NextRequest) {
  const apartmentIdParam = req.nextUrl.searchParams.get("apartmentId");
  if (!apartmentIdParam) {
    return NextResponse.json({ error: "apartmentId required" }, { status: 400 });
  }
  const apartmentId = Number(apartmentIdParam);
  const auth = await requireOwnerOfApartment(apartmentId);
  if (isAuthResponse(auth)) return auth;

  // Feature gate: room_preset required
  const featureCheck = await requireFeature("room_preset");
  if (isFeatureGateResponse(featureCheck)) return featureCheck;

  const presets = await prisma.roomPreset.findMany({
    where: { apartmentId },
    include: { RoomPresetOption: { orderBy: { id: "asc" } } },
    orderBy: { id: "asc" },
  });
  return NextResponse.json(presets);
}

// POST /api/admin/room-presets
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { apartmentId, name, roomType, baseRent, waterRate, electricRate, options = [] } = body;

  if (!apartmentId || !name?.trim() || baseRent == null || waterRate == null || electricRate == null) {
    return NextResponse.json({ error: "ข้อมูลไม่ครบถ้วน" }, { status: 400 });
  }

  const auth = await requireOwnerOfApartment(Number(apartmentId));
  if (isAuthResponse(auth)) return auth;

  // Feature gate: room_preset required
  const featureCheck = await requireFeature("room_preset");
  if (isFeatureGateResponse(featureCheck)) return featureCheck;

  const preset = await prisma.roomPreset.create({
    data: {
      apartmentId: Number(apartmentId),
      name: name.trim(),
      roomType: roomType?.trim() || null,
      baseRent: Number(baseRent),
      waterRate: Number(waterRate),
      electricRate: Number(electricRate),
      RoomPresetOption: {
        create: (options as PresetOptionInput[])
          .filter((o) => o.name?.trim())
          .map((o) => ({ name: o.name!.trim(), price: Number(o.price) || 0 })),
      },
    },
    include: { RoomPresetOption: true },
  });

  return NextResponse.json(preset, { status: 201 });
}
