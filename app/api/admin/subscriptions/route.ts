import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/admin/subscriptions
 * List subscriptions with filters and pagination
 */
export async function GET(req: NextRequest) {
  try {
    await requirePlatformAdmin();

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "25");
    
    // Filters
    const planCode = searchParams.get("plan");
    const status = searchParams.get("status");
    const billingCycle = searchParams.get("billingCycle");
    const expiringDays = searchParams.get("expiringDays");

    const offset = (page - 1) * limit;

    // Build where clause
    const where: any = {};

    if (planCode) {
      where.planCode = planCode;
    }

    if (status) {
      where.status = status;
    }

    if (billingCycle) {
      where.billingCycle = billingCycle;
    }

    // Handle expiring filter
    if (expiringDays) {
      const days = parseInt(expiringDays);
      const now = new Date();
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + days);

      where.currentPeriodEnd = {
        gte: now,
        lte: futureDate,
      };
      where.status = { in: ["TRIAL", "ACTIVE"] };
    }

    const [subscriptions, total] = await Promise.all([
      prisma.subscription.findMany({
        where,
        select: {
          id: true,
          planCode: true,
          status: true,
          billingCycle: true,
          currentPeriodStart: true,
          currentPeriodEnd: true,
          trialEndsAt: true,
          User: {
            select: {
              id: true,
              displayName: true,
              email: true,
              Apartment: {
                select: {
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
            },
          },
        },
        orderBy: { id: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.subscription.count({ where }),
    ]);

    // Format response with calculated fields
    const formattedSubscriptions = subscriptions.map((sub) => {
      // Calculate room count
      const roomCount = sub.User.Apartment.reduce(
        (sum, apt) => sum + apt.Room.length,
        0
      );

      // Calculate MRR
      let mrr = 0;
      if (sub.status === "ACTIVE") {
        const roomPrice = sub.Plan.pricePerRoom * roomCount;
        mrr = sub.billingCycle === "MONTHLY" ? roomPrice : roomPrice / 12;
      }

      // Calculate days left
      let daysLeft = null;
      if (sub.currentPeriodEnd) {
        const now = new Date();
        const periodEnd = new Date(sub.currentPeriodEnd);
        daysLeft = Math.ceil(
          (periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );
      }

      return {
        id: sub.id,
        user: {
          id: sub.User.id,
          displayName: sub.User.displayName,
          email: sub.User.email,
        },
        plan: {
          code: sub.Plan.code,
          name: sub.Plan.displayName,
          pricePerRoom: sub.Plan.pricePerRoom,
        },
        status: sub.status,
        billingCycle: sub.billingCycle,
        roomCount,
        mrr,
        currentPeriodStart: sub.currentPeriodStart,
        currentPeriodEnd: sub.currentPeriodEnd,
        daysLeft,
        trialEndsAt: sub.trialEndsAt,
      };
    });

    return NextResponse.json({
      subscriptions: formattedSubscriptions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    if (error instanceof NextResponse) {
      return error;
    }
    console.error("GET /api/admin/subscriptions error:", error);
    return NextResponse.json(
      { error: "internal_server_error" },
      { status: 500 }
    );
  }
}
