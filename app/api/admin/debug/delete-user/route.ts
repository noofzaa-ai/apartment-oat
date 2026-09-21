import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/admin-auth";

export const runtime = "nodejs";

// TEMPORARY DEBUG ENDPOINT - DELETE AFTER USE
export async function POST(req: NextRequest) {
  try {
    await requireSuperAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { email } = await req.json();

  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "Email required" }, { status: 400 });
  }

  const user = await prisma.user.findFirst({
    where: { email },
    include: {
      Subscription: true,
      Apartment: true,
      Membership: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found", email }, { status: 404 });
  }

  const info = {
    id: user.id,
    email: user.email,
    role: user.role,
    subscription: user.Subscription?.status || "none",
    apartments: user.Apartment.length,
    memberships: user.Membership.length,
  };

  // Delete user (cascade will handle related records)
  await prisma.user.delete({
    where: { id: user.id },
  });

  return NextResponse.json({
    message: "User deleted successfully",
    deletedUser: info,
  });
}
