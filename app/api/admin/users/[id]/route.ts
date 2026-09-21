import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin, requireSuperAdmin } from "@/lib/admin-auth";
import { createAuditLog } from "@/lib/audit-log";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/admin/users/[id]
 * Get user detail with full information
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePlatformAdmin();

    const { id } = await params;
    const userId = parseInt(id);
    if (isNaN(userId)) {
      return NextResponse.json({ error: "invalid_user_id" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        ExternalIdentity: {
          select: {
            provider: true,
            issuer: true,
            subject: true,
          },
        },
        Subscription: {
          include: {
            Plan: true,
          },
        },
        Apartment: {
          include: {
            Room: {
              select: {
                id: true,
              },
            },
          },
        },
        Membership: {
          include: {
            Apartment: {
              select: {
                id: true,
                name: true,
              },
            },
            Room: {
              select: {
                id: true,
                roomNumber: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "user_not_found" }, { status: 404 });
    }

    // Format apartments with room counts
    const apartments = user.Apartment.map((apt) => ({
      id: apt.id,
      name: apt.name,
      address: apt.address,
      roomCount: apt.Room.length,
      createdAt: apt.createdAt,
    }));

    // Format memberships
    const memberships = user.Membership.map((mem) => ({
      apartmentId: mem.apartmentId,
      apartmentName: mem.Apartment.name,
      role: mem.role,
      roomId: mem.roomId,
      roomNumber: mem.Room?.roomNumber,
      createdAt: mem.createdAt,
    }));

    return NextResponse.json({
      id: user.id,
      displayName: user.displayName,
      email: user.email,
      emailVerified: user.emailVerified,
      avatarUrl: user.avatarUrl,
      role: user.role,
      status: user.status,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      externalIdentity: user.ExternalIdentity[0] || null,
      subscription: user.Subscription
        ? {
            id: user.Subscription.id,
            planCode: user.Subscription.planCode,
            planName: user.Subscription.Plan.displayName,
            status: user.Subscription.status,
            billingCycle: user.Subscription.billingCycle,
            trialEndsAt: user.Subscription.trialEndsAt,
            currentPeriodStart: user.Subscription.currentPeriodStart,
            currentPeriodEnd: user.Subscription.currentPeriodEnd,
            roomQuotaSnapshot: user.Subscription.roomQuotaSnapshot,
          }
        : null,
      apartments,
      memberships,
    });
  } catch (error) {
    if (error instanceof NextResponse) {
      return error;
    }
    console.error("GET /api/admin/users/[id] error:", error);
    return NextResponse.json(
      { error: "internal_server_error" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/users/[id]
 * Update user role or status
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = parseInt(id);
    if (isNaN(userId)) {
      return NextResponse.json({ error: "invalid_user_id" }, { status: 400 });
    }

    const body = await req.json();
    const { role, status } = body;

    // Validate at least one field is provided
    if (!role && !status) {
      return NextResponse.json(
        { error: "no_update_fields" },
        { status: 400 }
      );
    }

    // Check permissions: role update requires SUPER_ADMIN
    let adminUser;
    if (role) {
      adminUser = await requireSuperAdmin();
    } else {
      adminUser = await requirePlatformAdmin();
    }

    // Validate role value
    if (role && !["USER", "PLATFORM_ADMIN", "SUPER_ADMIN"].includes(role)) {
      return NextResponse.json({ error: "invalid_role" }, { status: 400 });
    }

    // Validate status value
    if (status && !["ACTIVE", "SUSPENDED"].includes(status)) {
      return NextResponse.json({ error: "invalid_status" }, { status: 400 });
    }

    // Check if user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "user_not_found" }, { status: 404 });
    }

    // Build update data
    const updateData: any = {};
    if (role) updateData.role = role;
    if (status) updateData.status = status;

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    // Create audit logs
    const ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || undefined;
    const userAgent = req.headers.get("user-agent") || undefined;

    if (role) {
      await createAuditLog({
        category: "USER",
        action: "update_user_role",
        userId: adminUser.userId,
        targetType: "USER",
        targetId: userId,
        ipAddress,
        userAgent,
        details: {
          oldRole: targetUser.role,
          newRole: role,
        },
      });
    }

    if (status) {
      await createAuditLog({
        category: "USER",
        action: "update_user_status",
        userId: adminUser.userId,
        targetType: "USER",
        targetId: userId,
        ipAddress,
        userAgent,
        details: {
          oldStatus: targetUser.status,
          newStatus: status,
        },
      });
    }

    return NextResponse.json({
      id: updatedUser.id,
      displayName: updatedUser.displayName,
      email: updatedUser.email,
      role: updatedUser.role,
      status: updatedUser.status,
      updatedAt: updatedUser.updatedAt,
    });
  } catch (error) {
    if (error instanceof NextResponse) {
      return error;
    }
    console.error("PATCH /api/admin/users/[id] error:", error);
    return NextResponse.json(
      { error: "internal_server_error" },
      { status: 500 }
    );
  }
}
