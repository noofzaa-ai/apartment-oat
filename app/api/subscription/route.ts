import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  requireUserId,
  hasActiveSubscription,
  startTrialSubscription,
  isAuthResponse,
} from "@/lib/auth";
import { getRoomCount, hasFeature } from "@/lib/pricing";

export const runtime = "nodejs";

// GET: Current subscription with full plan details, room count, and features
export async function GET() {
  const userId = await requireUserId();
  if (isAuthResponse(userId)) return userId;

  const sub = await prisma.subscription.findUnique({
    where: { userId },
    include: { Plan: true },
  });

  if (!sub) {
    return NextResponse.json({
      active: false,
      status: null,
      plan: null,
      roomCount: 0,
      roomLimit: null,
      features: [],
      billingCycle: null,
      trialEndsAt: null,
      currentPeriodStart: null,
      currentPeriodEnd: null,
    });
  }

  const roomCount = await getRoomCount(userId);
  const active = await hasActiveSubscription(userId);

  // Parse features from JSON string
  let features: string[] = [];
  try {
    features = JSON.parse(sub.Plan.features);
  } catch {
    features = [];
  }

  return NextResponse.json({
    active,
    status: sub.status,
    plan: {
      code: sub.Plan.code,
      name: sub.Plan.name,
      displayName: sub.Plan.displayName,
      pricePerRoom: sub.Plan.pricePerRoom,
      tierSize: sub.Plan.tierSize,
      maxRooms: sub.Plan.maxRooms,
    },
    roomCount,
    roomLimit: sub.Plan.maxRooms,
    features,
    billingCycle: sub.billingCycle,
    trialEndsAt: sub.trialEndsAt,
    currentPeriodStart: sub.currentPeriodStart,
    currentPeriodEnd: sub.currentPeriodEnd,
  });
}

// POST: Start trial (existing functionality preserved)
export async function POST() {
  const userId = await requireUserId();
  if (isAuthResponse(userId)) return userId;

  const existing = await prisma.subscription.findUnique({ where: { userId } });
  if (existing) {
    return NextResponse.json({
      active: await hasActiveSubscription(userId),
      status: existing.status,
      trialEndsAt: existing.trialEndsAt,
      currentPeriodEnd: existing.currentPeriodEnd,
    });
  }

  const sub = await startTrialSubscription(userId);
  return NextResponse.json(
    {
      active: await hasActiveSubscription(userId),
      status: sub.status,
      trialEndsAt: sub.trialEndsAt,
      currentPeriodEnd: sub.currentPeriodEnd,
    },
    { status: 201 },
  );
}
