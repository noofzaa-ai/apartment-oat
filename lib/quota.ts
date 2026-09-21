import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRoomCount } from "@/lib/pricing";

export class QuotaExceededError extends Error {
  constructor(
    public current: number,
    public limit: number,
    public planCode: string
  ) {
    super(`Room quota exceeded: ${current}/${limit} for plan ${planCode}`);
    this.name = "QuotaExceededError";
  }
}

/**
 * Check if user can create additional rooms within their plan's quota.
 * Throws QuotaExceededError if quota would be exceeded.
 */
export async function checkRoomQuota(
  userId: number,
  additionalRooms: number = 1
): Promise<void> {
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
    include: { Plan: true },
  });

  if (!subscription) {
    throw new Error("No subscription found for user");
  }

  const plan = subscription.Plan;
  
  // If plan has no room limit (null), allow unlimited
  if (plan.maxRooms === null) {
    return;
  }

  const currentRoomCount = await getRoomCount(userId);
  const newTotal = currentRoomCount + additionalRooms;

  if (newTotal > plan.maxRooms) {
    throw new QuotaExceededError(currentRoomCount, plan.maxRooms, plan.code);
  }
}

/**
 * Convert QuotaExceededError to NextResponse.
 */
export function quotaExceededResponse(error: QuotaExceededError): NextResponse {
  return NextResponse.json(
    {
      error: "room_quota_exceeded",
      current: error.current,
      limit: error.limit,
      planCode: error.planCode,
      message: `ห้องเกินโควต้า: ใช้ไป ${error.current} ห้อง จาก ${error.limit} ห้องที่อนุญาต`,
    },
    { status: 403 }
  );
}
