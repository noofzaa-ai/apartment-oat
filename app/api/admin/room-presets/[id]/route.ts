import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOwnerOfApartment, isAuthResponse } from "@/lib/auth";
import { requireFeature, isFeatureGateResponse } from "@/lib/feature-gate";

export const runtime = "nodejs";

type PresetOptionInput = { name?: string; price?: number };

// PATCH /api/admin/room-presets/[id]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const presetId = Number(id);
  const body = await req.json();
  const { name, roomType, baseRent, waterRate, electricRate, options } = body;

  const preset = await prisma.roomPreset.findUnique({
    where: { id: presetId },
  });

  if (!preset) {
    return NextResponse.json({ error: "Preset not found" }, { status: 404 });
  }

  const auth = await requireOwnerOfApartment(preset.apartmentId);
  if (isAuthResponse(auth)) return auth;

  // Feature gate: room_preset required
  const featureCheck = await requireFeature("room_preset");
  if (isFeatureGateResponse(featureCheck)) return featureCheck;

  const updated = await prisma.roomPreset.update({
    where: { id: presetId },
    data: {
      ...(name !== undefined && { name: name.trim() }),
      ...(roomType !== undefined && { roomType: roomType?.trim() || null }),
      ...(baseRent !== undefined && { baseRent: Number(baseRent) }),
      ...(waterRate !== undefined && { waterRate: Number(waterRate) }),
      ...(electricRate !== undefined && { electricRate: Number(electricRate) }),
      ...(options !== undefined && {
        RoomPresetOption: {
          deleteMany: {},
          create: (options as PresetOptionInput[])
            .filter((o) => o.name?.trim())
            .map((o) => ({ name: o.name!.trim(), price: Number(o.price) || 0 })),
        },
      }),
    },
    include: { RoomPresetOption: true },
  });

  return NextResponse.json(updated);
}

// DELETE /api/admin/room-presets/[id]
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const presetId = Number(id);

  const preset = await prisma.roomPreset.findUnique({
    where: { id: presetId },
  });

  if (!preset) {
    return NextResponse.json({ error: "Preset not found" }, { status: 404 });
  }

  const auth = await requireOwnerOfApartment(preset.apartmentId);
  if (isAuthResponse(auth)) return auth;

  // Feature gate: room_preset required
  const featureCheck = await requireFeature("room_preset");
  if (isFeatureGateResponse(featureCheck)) return featureCheck;

  await prisma.roomPreset.delete({ where: { id: presetId } });

  return NextResponse.json({ success: true });
}
