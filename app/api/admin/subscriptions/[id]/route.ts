import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/admin/subscriptions/[id]
 * Get subscription detail
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePlatformAdmin();

    const { id } = await params;
    const subscriptionId = parseInt(id);
    if (isNaN(subscriptionId)) {
      return NextResponse.json(
        { error: "invalid_subscription_id" },
        { status: 400 }
      );
    }

    const subscription = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
      select: {
        id: true,
        planCode: true,
        status: true,
        billingCycle: true,
        currentPeriodStart: true,
        currentPeriodEnd: true,
        trialEndsAt: true,
        roomQuotaSnapshot: true,
        createdAt: true,
        updatedAt: true,
        User: {
          select: {
            id: true,
            displayName: true,
            email: true,
            emailVerified: true,
            avatarUrl: true,
            role: true,
            status: true,
            createdAt: true,
            lastLoginAt: true,
            Apartment: {
              select: {
                id: true,
                name: true,
                address: true,
                createdAt: true,
                Room: {
                  select: {
                    id: true,
                  },
                },
              },
            },
          },
        },
        Plan: {
          select: {
            code: true,
            name: true,
            displayName: true,
            pricePerRoom: true,
            tierSize: true,
            maxRooms: true,
            features: true,
          },
        },
      },
    });

    if (!subscription) {
      return NextResponse.json(
        { error: "subscription_not_found" },
        { status: 404 }
      );
    }

    // Calculate room count (current usage)
    const roomCount = subscription.User.Apartment.reduce(
      (sum, apt) => sum + apt.Room.length,
      0
    );

    // Format response
    const response = {
      id: subscription.id,
      user: {
        id: subscription.User.id,
        displayName: subscription.User.displayName,
        email: subscription.User.email,
        emailVerified: subscription.User.emailVerified,
        avatarUrl: subscription.User.avatarUrl,
        role: subscription.User.role,
        status: subscription.User.status,
        createdAt: subscription.User.createdAt,
        lastLoginAt: subscription.User.lastLoginAt,
        apartments: subscription.User.Apartment.map((apt) => ({
          id: apt.id,
          name: apt.name,
          address: apt.address,
          roomCount: apt.Room.length,
          createdAt: apt.createdAt,
        })),
      },
      plan: {
        code: subscription.Plan.code,
        name: subscription.Plan.name,
        displayName: subscription.Plan.displayName,
        pricePerRoom: subscription.Plan.pricePerRoom,
        tierSize: subscription.Plan.tierSize,
        maxRooms: subscription.Plan.maxRooms,
        features: JSON.parse(subscription.Plan.features),
      },
      status: subscription.status,
      billingCycle: subscription.billingCycle,
      currentPeriodStart: subscription.currentPeriodStart,
      currentPeriodEnd: subscription.currentPeriodEnd,
      trialEndsAt: subscription.trialEndsAt,
      roomQuotaSnapshot: subscription.roomQuotaSnapshot,
      roomCount,
      createdAt: subscription.createdAt,
      updatedAt: subscription.updatedAt,
    };

    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof NextResponse) {
      return error;
    }
    console.error("GET /api/admin/subscriptions/[id] error:", error);
    return NextResponse.json(
      { error: "internal_server_error" },
      { status: 500 }
    );
  }
}
