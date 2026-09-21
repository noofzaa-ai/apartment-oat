import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/admin-auth";
import { createAuditLog } from "@/lib/audit-log";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/admin/subscriptions/[id]/extend-trial
 * Extend trial period by adding days
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

    const body = await req.json();
    const { days } = body;

    if (!days || typeof days !== "number" || days <= 0 || !Number.isInteger(days)) {
      return NextResponse.json(
        { error: "invalid_days_must_be_positive_integer" },
        { status: 400 }
      );
    }

    // Find subscription
    const subscription = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
      select: {
        id: true,
        status: true,
        trialEndsAt: true,
        userId: true,
      },
    });

    if (!subscription) {
      return NextResponse.json(
        { error: "subscription_not_found" },
        { status: 404 }
      );
    }

    if (subscription.status !== "TRIAL") {
      return NextResponse.json(
        { error: "subscription_not_in_trial" },
        { status: 400 }
      );
    }

    if (!subscription.trialEndsAt) {
      return NextResponse.json(
        { error: "trial_end_date_not_set" },
        { status: 400 }
      );
    }

    // Calculate new trial end date
    const oldDate = new Date(subscription.trialEndsAt);
    const newDate = new Date(oldDate);
    newDate.setDate(newDate.getDate() + days);

    // Update subscription
    const updatedSubscription = await prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        trialEndsAt: newDate,
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
      action: "extend_trial",
      userId: admin.userId,
      targetType: "SUBSCRIPTION",
      targetId: subscriptionId,
      ipAddress: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || undefined,
      userAgent: req.headers.get("user-agent") || undefined,
      details: {
        days,
        oldDate: oldDate.toISOString(),
        newDate: newDate.toISOString(),
        targetUserId: subscription.userId,
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
    console.error("POST /api/admin/subscriptions/[id]/extend-trial error:", error);
    return NextResponse.json(
      { error: "internal_server_error" },
      { status: 500 }
    );
  }
}
