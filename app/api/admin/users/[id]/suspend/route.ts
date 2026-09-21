import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/admin-auth";
import { createAuditLog } from "@/lib/audit-log";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/admin/users/[id]/suspend
 * Toggle user suspension status
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminUser = await requirePlatformAdmin();

    const { id } = await params;
    const userId = parseInt(id);
    if (isNaN(userId)) {
      return NextResponse.json({ error: "invalid_user_id" }, { status: 400 });
    }

    const body = await req.json();
    const { suspend } = body;

    if (typeof suspend !== "boolean") {
      return NextResponse.json(
        { error: "suspend_field_required" },
        { status: 400 }
      );
    }

    // Check if user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "user_not_found" }, { status: 404 });
    }

    // Determine new status
    const newStatus = suspend ? "SUSPENDED" : "ACTIVE";

    // Update user status
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { status: newStatus },
    });

    // Create audit log
    const ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || undefined;
    const userAgent = req.headers.get("user-agent") || undefined;

    await createAuditLog({
      category: "USER",
      action: suspend ? "suspend_user" : "unsuspend_user",
      userId: adminUser.userId,
      targetType: "USER",
      targetId: userId,
      ipAddress,
      userAgent,
      details: {
        previousStatus: targetUser.status,
        newStatus,
      },
    });

    return NextResponse.json({
      id: updatedUser.id,
      displayName: updatedUser.displayName,
      email: updatedUser.email,
      status: updatedUser.status,
      updatedAt: updatedUser.updatedAt,
    });
  } catch (error) {
    if (error instanceof NextResponse) {
      return error;
    }
    console.error("POST /api/admin/users/[id]/suspend error:", error);
    return NextResponse.json(
      { error: "internal_server_error" },
      { status: 500 }
    );
  }
}
