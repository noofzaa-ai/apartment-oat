import { NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

/**
 * GET /api/admin/dashboard/stats
 * Returns overview metrics for admin dashboard.
 * Protected: PLATFORM_ADMIN or SUPER_ADMIN only.
 */
export async function GET() {
  try {
    await requirePlatformAdmin();
  } catch (err) {
    return err as NextResponse;
  }

  try {
    // Calculate metrics in parallel
    const [
      totalUsers,
      activeSubscriptions,
      trialUsers,
      totalApartments,
      totalRooms,
      subscriptions,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.subscription.count({
        where: { status: "ACTIVE" },
      }),
      prisma.subscription.count({
        where: { status: "TRIAL" },
      }),
      prisma.apartment.count(),
      prisma.room.count(),
      prisma.subscription.findMany({
        where: { status: "ACTIVE" },
        include: { Plan: true },
      }),
    ]);

    // Calculate MRR (Monthly Recurring Revenue)
    // For MONTHLY billing: use pricePerRoom * roomQuotaSnapshot
    // For YEARLY billing: divide by 12
    let mrr = 0;
    for (const sub of subscriptions) {
      const roomCount = sub.roomQuotaSnapshot ?? 0;
      const pricePerRoom = sub.Plan.pricePerRoom;
      const revenue = roomCount * pricePerRoom;
      
      if (sub.billingCycle === "MONTHLY") {
        mrr += revenue;
      } else if (sub.billingCycle === "YEARLY") {
        mrr += revenue / 12;
      }
    }

    return NextResponse.json({
      totalUsers,
      activeSubscriptions,
      trialUsers,
      totalApartments,
      totalRooms,
      mrr: Math.round(mrr * 100) / 100, // Round to 2 decimal places
    });
  } catch (err) {
    console.error("Failed to fetch admin dashboard stats:", err);
    return NextResponse.json(
      { error: "internal_server_error" },
      { status: 500 }
    );
  }
}
