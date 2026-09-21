import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId, isAuthResponse } from "@/lib/auth";
import { getRoomCount, BillingCycle } from "@/lib/pricing";

export const runtime = "nodejs";

// POST /api/subscription/upgrade
export async function POST(req: NextRequest) {
  const userId = await requireUserId();
  if (isAuthResponse(userId)) return userId;

  const body = await req.json();
  const { planCode, billingCycle = "MONTHLY" } = body;

  if (!planCode) {
    return NextResponse.json({ error: "planCode required" }, { status: 400 });
  }

  if (billingCycle !== "MONTHLY" && billingCycle !== "YEARLY") {
    return NextResponse.json(
      { error: "billingCycle must be MONTHLY or YEARLY" },
      { status: 400 }
    );
  }

  // Validate plan exists
  const plan = await prisma.plan.findUnique({ where: { code: planCode } });
  if (!plan || !plan.isActive) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  // Check room count doesn't exceed new plan's limit
  const roomCount = await getRoomCount(userId);
  if (plan.maxRooms !== null && roomCount > plan.maxRooms) {
    return NextResponse.json(
      {
        error: "room_count_exceeds_plan_limit",
        message: `คุณมี ${roomCount} ห้อง แต่แผน ${plan.displayName} จำกัดเพียง ${plan.maxRooms} ห้อง`,
        currentRoomCount: roomCount,
        planLimit: plan.maxRooms,
      },
      { status: 403 }
    );
  }

  const now = new Date();
  const currentPeriodStart = now;
  const currentPeriodEnd = new Date(
    billingCycle === "YEARLY"
      ? now.getTime() + 365 * 24 * 60 * 60 * 1000
      : now.getTime() + 30 * 24 * 60 * 60 * 1000
  );

  // Upsert subscription
  const subscription = await prisma.subscription.upsert({
    where: { userId },
    create: {
      userId,
      planCode,
      status: "ACTIVE",
      billingCycle: billingCycle as BillingCycle,
      currentPeriodStart,
      currentPeriodEnd,
      roomQuotaSnapshot: plan.maxRooms,
    },
    update: {
      planCode,
      status: "ACTIVE",
      billingCycle: billingCycle as BillingCycle,
      currentPeriodStart,
      currentPeriodEnd,
      roomQuotaSnapshot: plan.maxRooms,
      trialEndsAt: null, // Clear trial when upgrading
    },
    include: { Plan: true },
  });

  return NextResponse.json({
    success: true,
    subscription: {
      id: subscription.id,
      planCode: subscription.planCode,
      status: subscription.status,
      billingCycle: subscription.billingCycle,
      currentPeriodStart: subscription.currentPeriodStart,
      currentPeriodEnd: subscription.currentPeriodEnd,
      plan: {
        code: subscription.Plan.code,
        displayName: subscription.Plan.displayName,
      },
    },
  });
}
