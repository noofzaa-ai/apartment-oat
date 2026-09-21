import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/admin/users
 * List users with filters and pagination
 */
export async function GET(req: NextRequest) {
  try {
    await requirePlatformAdmin();

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "25");
    const search = searchParams.get("search") || "";
    
    // Filters
    const subscriptionStatus = searchParams.get("subscriptionStatus");
    const planCode = searchParams.get("planCode");
    const role = searchParams.get("role");
    const status = searchParams.get("status");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");

    const offset = (page - 1) * limit;

    // Build where clause
    const where: any = {};

    // Search by id, email, or displayName
    if (search) {
      const searchInt = parseInt(search);
      if (!isNaN(searchInt)) {
        where.id = searchInt;
      } else {
        where.OR = [
          { email: { contains: search } },
          { displayName: { contains: search } },
        ];
      }
    }

    // Filter by role
    if (role) {
      where.role = role;
    }

    // Filter by status
    if (status) {
      where.status = status;
    }

    // Date range filter
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    // Subscription filters
    if (subscriptionStatus || planCode) {
      where.Subscription = {};
      if (subscriptionStatus) where.Subscription.status = subscriptionStatus;
      if (planCode) where.Subscription.planCode = planCode;
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          displayName: true,
          email: true,
          role: true,
          status: true,
          createdAt: true,
          lastLoginAt: true,
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
          Apartment: {
            select: {
              id: true,
              Room: {
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
      prisma.user.count({ where }),
    ]);

    // Format response
    const formattedUsers = users.map((user) => {
      const apartmentCount = user.Apartment.length;
      const roomCount = user.Apartment.reduce(
        (sum, apt) => sum + apt.Room.length,
        0
      );

      return {
        id: user.id,
        displayName: user.displayName,
        email: user.email,
        role: user.role,
        status: user.status,
        subscription: user.Subscription
          ? {
              planCode: user.Subscription.planCode,
              planName: user.Subscription.Plan.displayName,
              status: user.Subscription.status,
            }
          : null,
        apartmentCount,
        roomCount,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
      };
    });

    return NextResponse.json({
      users: formattedUsers,
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
    console.error("GET /api/admin/users error:", error);
    return NextResponse.json(
      { error: "internal_server_error" },
      { status: 500 }
    );
  }
}
