import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/admin-auth";
import { createAuditLog } from "@/lib/audit-log";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/admin/subscriptions/[id]/cancel
 * Cancel subscription (keep access until period end)
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requirePlatformAdmin();

    const { id } = await params;
    const subscriptionId = parseInt(id);
    if (isNaN(subscriptionId)) {
      return NextResponse.json(
        { error: "invalid_subscription_id" },
        { status: 400 }
      );
    }

    // Find subscription
    const subscription = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
      select: {
        id: true,
        status: true,
        userId: true,
        currentPeriodEnd: true,
      },
    });

    if (!subscription) {
      return NextResponse.json(
        { error: "subscription_not_found" },
        { status: 404 }
      );
    }

    if (subscription.status === "CANCELED") {
      return NextResponse.json(
        { error: "subscription_already_canceled" },
        { status: 400 }
      );
    }

    // Update subscription to CANCELED status
    // Keep currentPeriodEnd so user has access until period ends
    const updatedSubscription = await prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        status: "CANCELED",
      },
      select: {
        id: true,
        planCode: true,
        status: true,
        billingCycle: true,
        trialEndsAt: true,
        currentPeriodStart: true,
        currentPeriodEnd: true,
        roomQuotaSnapshot: true,
        User: {
          select: {
            id: true,
            displayName: true,
            email: true,
          },
        },
        Plan: {
          select: {
            code: true,
            displayName: true,
            pricePerRoom: true,
          },
        },
      },
    });

    // Create audit log
    await createAuditLog({
      category: "ADMIN",
      action: "cancel_subscription",
      userId: admin.userId,
      targetType: "SUBSCRIPTION",
      targetId: subscriptionId,
      ipAddress: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || undefined,
      userAgent: req.headers.get("user-agent") || undefined,
      details: {
        targetUserId: subscription.userId,
        periodEnd: subscription.currentPeriodEnd?.toISOString(),
      },
    });

    return NextResponse.json({
      id: updatedSubscription.id,
      user: {
        id: updatedSubscription.User.id,
        displayName: updatedSubscription.User.displayName,
        email: updatedSubscription.User.email,
      },
      plan: {
        code: updatedSubscription.Plan.code,
        name: updatedSubscription.Plan.displayName,
        pricePerRoom: updatedSubscription.Plan.pricePerRoom,
      },
      status: updatedSubscription.status,
      billingCycle: updatedSubscription.billingCycle,
      trialEndsAt: updatedSubscription.trialEndsAt,
      currentPeriodStart: updatedSubscription.currentPeriodStart,
      currentPeriodEnd: updatedSubscription.currentPeriodEnd,
      roomQuotaSnapshot: updatedSubscription.roomQuotaSnapshot,
    });
  } catch (error) {
    if (error instanceof NextResponse) {
      return error;
    }
    console.error("POST /api/admin/subscriptions/[id]/cancel error:", error);
    return NextResponse.json(
      { error: "internal_server_error" },
      { status: 500 }
    );
  }
}
