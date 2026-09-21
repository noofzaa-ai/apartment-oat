import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOwnerOfApartment, isAuthResponse } from "@/lib/auth";
import { requireFeature, isFeatureGateResponse } from "@/lib/feature-gate";
import { checkRoomQuota, quotaExceededResponse, QuotaExceededError } from "@/lib/quota";

export const runtime = "nodejs";

const BULK_LIMIT = 100;

type PresetOptionInput = { name?: string; price?: number };

type BulkResult = {
  created: { roomNumber: string; roomId: number }[];
  failed: { roomNumber: string; reason: string }[];
};

// POST /api/admin/rooms/bulk
export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    apartmentId,
    presetId,
    roomNumbers,
    roomNumberRange,
    // manual fields (used when no presetId)
    roomType,
    baseRent,
    waterRate,
    electricRate,
    options = [],
  } = body;

  if (!apartmentId) {
    return NextResponse.json({ error: "apartmentId required" }, { status: 400 });
  }

  // Auth: verify owner of apartment
  const userId = await requireOwnerOfApartment(Number(apartmentId));
  if (isAuthResponse(userId)) return userId;

  // Feature gate: bulk_create required
  const featureCheck = await requireFeature("bulk_create");
  if (isFeatureGateResponse(featureCheck)) return featureCheck;

  // Resolve list of room numbers
  let roomList: string[] = [];

  if (roomNumbers != null) {
    if (!Array.isArray(roomNumbers)) {
      return NextResponse.json({ error: "roomNumbers must be an array" }, { status: 400 });
    }
    roomList = roomNumbers.map((n: unknown) => String(n).trim()).filter(Boolean);
  } else if (roomNumberRange != null) {
    const { start, end } = roomNumberRange;
    if (typeof start !== "number" || typeof end !== "number" || start > end) {
      return NextResponse.json(
        { error: "roomNumberRange must have numeric start <= end" },
        { status: 400 },
      );
    }
    for (let i = start; i <= end; i++) {
      roomList.push(String(i));
    }
  } else {
    return NextResponse.json(
      { error: "roomNumbers or roomNumberRange required" },
      { status: 400 },
    );
  }

  if (roomList.length === 0) {
    return NextResponse.json({ error: "no room numbers provided" }, { status: 400 });
  }

  if (roomList.length > BULK_LIMIT) {
    return NextResponse.json(
      { error: `bulk limit is ${BULK_LIMIT} rooms per request` },
      { status: 400 },
    );
  }

  // Quota check: verify user can create this many rooms
  try {
    await checkRoomQuota(userId, roomList.length);
  } catch (error) {
    if (error instanceof QuotaExceededError) {
      return quotaExceededResponse(error);
    }
    throw error;
  }

  // Resolve fields: preset takes priority
  let resolvedRoomType: string | null = null;
  let resolvedBaseRent: number;
  let resolvedWaterRate: number;
  let resolvedElectricRate: number;
  let resolvedOptions: { name: string; price: number }[] = [];

  if (presetId != null) {
    // Validate preset belongs to this apartment
    const preset = await prisma.roomPreset.findUnique({
      where: { id: Number(presetId) },
      include: { RoomPresetOption: true },
    });

    if (!preset) {
      return NextResponse.json({ error: "preset not found" }, { status: 404 });
    }

    if (preset.apartmentId !== Number(apartmentId)) {
      return NextResponse.json(
        { error: "preset does not belong to this apartment" },
        { status: 403 },
      );
    }

    resolvedRoomType = preset.roomType;
    resolvedBaseRent = preset.baseRent;
    resolvedWaterRate = preset.waterRate;
    resolvedElectricRate = preset.electricRate;
    resolvedOptions = preset.RoomPresetOption
      .filter((o) => o.name?.trim())
      .map((o) => ({ name: o.name.trim(), price: o.price }));
  } else {
    // Manual fields required
    if (baseRent == null || waterRate == null || electricRate == null) {
      return NextResponse.json(
        {
          error:
            "baseRent, waterRate, electricRate required when presetId is not provided",
        },
        { status: 400 },
      );
    }
    resolvedRoomType = roomType?.trim() || null;
    resolvedBaseRent = Number(baseRent);
    resolvedWaterRate = Number(waterRate);
    resolvedElectricRate = Number(electricRate);
    resolvedOptions = (options as PresetOptionInput[])
      .filter((o) => o.name?.trim())
      .map((o) => ({ name: o.name!.trim(), price: Number(o.price) || 0 }));
  }

  const result: BulkResult = { created: [], failed: [] };

  for (const roomNumber of roomList) {
    // Check uniqueness
    const duplicate = await prisma.room.findUnique({
      where: {
        apartmentId_roomNumber: {
          apartmentId: Number(apartmentId),
          roomNumber,
        },
      },
    });

    if (duplicate) {
      result.failed.push({ roomNumber, reason: "duplicate" });
      continue;
    }

    const room = await prisma.room.create({
      data: {
        apartmentId: Number(apartmentId),
        roomNumber,
        roomType: resolvedRoomType,
        baseRent: resolvedBaseRent,
        waterRate: resolvedWaterRate,
        electricRate: resolvedElectricRate,
        options: {
          create: resolvedOptions,
        },
      },
    });

    result.created.push({ roomNumber, roomId: room.id });
  }

  const status = result.created.length === 0 ? 422 : 207;
  return NextResponse.json(result, { status });
}
