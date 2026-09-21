import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId, isAuthResponse } from "@/lib/auth";

export const runtime = "nodejs";

// POST /api/subscription/cancel
export async function POST() {
  const userId = await requireUserId();
  if (isAuthResponse(userId)) return userId;

  const subscription = await prisma.subscription.findUnique({
    where: { userId },
    include: { Plan: true },
  });

  if (!subscription) {
    return NextResponse.json(
      { error: "No subscription found" },
      { status: 404 }
    );
  }

  if (subscription.status === "CANCELED") {
    return NextResponse.json({
      success: true,
      message: "Subscription already canceled",
      subscription: {
        status: subscription.status,
        currentPeriodEnd: subscription.currentPeriodEnd,
      },
    });
  }

  // Set status to CANCELED but keep access until currentPeriodEnd
  const updated = await prisma.subscription.update({
    where: { userId },
    data: { status: "CANCELED" },
    include: { Plan: true },
  });

  return NextResponse.json({
    success: true,
    message: `การยกเลิกสำเร็จ คุณยังสามารถใช้งานได้จนถึง ${updated.currentPeriodEnd?.toISOString() || "สิ้นสุดรอบบิล"}`,
    subscription: {
      status: updated.status,
      currentPeriodEnd: updated.currentPeriodEnd,
      plan: {
        code: updated.Plan.code,
        displayName: updated.Plan.displayName,
      },
    },
  });
}
