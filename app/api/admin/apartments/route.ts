import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/admin/apartments
 * List all apartments with pagination and filters
 */
export async function GET(req: NextRequest) {
  try {
    await requirePlatformAdmin();

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "25");
    const search = searchParams.get("search") || "";
    
    // Filters
    const planCode = searchParams.get("planCode");
    const subscriptionStatus = searchParams.get("subscriptionStatus");

    const offset = (page - 1) * limit;

    // Build where clause
    const where: any = {};

    // Search by apartment name or owner email/displayName
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { User: { email: { contains: search } } },
        { User: { displayName: { contains: search } } },
      ];
    }

    // Filter by subscription status or plan code through owner's subscription
    if (subscriptionStatus || planCode) {
      where.User = {
        ...(where.User || {}),
        Subscription: {},
      };
      if (subscriptionStatus) {
        where.User.Subscription.status = subscriptionStatus;
      }
      if (planCode) {
        where.User.Subscription.planCode = planCode;
      }
    }

    const [apartments, total] = await Promise.all([
      prisma.apartment.findMany({
        where,
        select: {
          id: true,
          name: true,
          address: true,
          createdAt: true,
          User: {
            select: {
              id: true,
              displayName: true,
              email: true,
              Subscription: {
                select: {
                  planCode: true,
                  status: true,
                  Plan: {
                    select: {
                      displayName: true,
                    },
                  },
                },
              },
            },
          },
          Room: {
            select: {
              id: true,
              Membership: {
                select: {
                  id: true,
                },
              },
            },
          },
        },
        orderBy: { id: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.apartment.count({ where }),
    ]);

    // Format response
    const formattedApartments = apartments.map((apt) => {
      const roomCount = apt.Room.length;
      const occupiedRoomCount = apt.Room.filter(
        (room) => room.Membership !== null
      ).length;

      return {
        id: apt.id,
        name: apt.name,
        address: apt.address,
        createdAt: apt.createdAt,
        owner: {
          id: apt.User.id,
          displayName: apt.User.displayName,
          email: apt.User.email,
        },
        subscription: apt.User.Subscription
          ? {
              planCode: apt.User.Subscription.planCode,
              planName: apt.User.Subscription.Plan.displayName,
              status: apt.User.Subscription.status,
            }
          : null,
        roomCount,
        occupiedRoomCount,
      };
    });

    return NextResponse.json({
      apartments: formattedApartments,
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
    console.error("GET /api/admin/apartments error:", error);
    return NextResponse.json(
      { error: "internal_server_error" },
      { status: 500 }
    );
  }
}
