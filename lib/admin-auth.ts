import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

/**
 * Check if user has PLATFORM_ADMIN or SUPER_ADMIN role.
 * Returns user object if authorized, throws NextResponse for early return if not.
 */
export async function requirePlatformAdmin(): Promise<{
  userId: number;
  role: string;
}> {
  const session = await getSession();
  if (!session.userId) {
    throw NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, role: true, status: true },
  });

  if (!user) {
    throw NextResponse.json({ error: "user_not_found" }, { status: 401 });
  }

  if (user.status !== "ACTIVE") {
    throw NextResponse.json({ error: "account_suspended" }, { status: 403 });
  }

  if (user.role !== "PLATFORM_ADMIN" && user.role !== "SUPER_ADMIN") {
    throw NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  return { userId: user.id, role: user.role };
}

/**
 * Check if user has SUPER_ADMIN role only.
 * Returns user object if authorized, throws NextResponse for early return if not.
 */
export async function requireSuperAdmin(): Promise<{
  userId: number;
  role: string;
}> {
  const session = await getSession();
  if (!session.userId) {
    throw NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, role: true, status: true },
  });

  if (!user) {
    throw NextResponse.json({ error: "user_not_found" }, { status: 401 });
  }

  if (user.status !== "ACTIVE") {
    throw NextResponse.json({ error: "account_suspended" }, { status: 403 });
  }

  if (user.role !== "SUPER_ADMIN") {
    throw NextResponse.json({ error: "forbidden_super_admin_only" }, { status: 403 });
  }

  return { userId: user.id, role: user.role };
}
