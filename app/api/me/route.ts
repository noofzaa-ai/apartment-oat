import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";

function subscriptionIsActive(sub: {
  status: string;
  trialEndsAt: Date | null;
  currentPeriodEnd: Date | null;
} | null): boolean {
  if (!sub) return false;
  const now = Date.now();
  if (sub.status === "TRIAL") {
    return !!sub.trialEndsAt && sub.trialEndsAt.getTime() > now;
  }
  if (sub.status === "ACTIVE") {
    return sub.currentPeriodEnd == null || sub.currentPeriodEnd.getTime() > now;
  }
  return false;
}

// GET /api/me — read-only session check. ยืนยันว่า apt_session cookie
// round-trip ได้จริงหลัง OIDC callback. ไม่เปิดเผยฟิลด์ sensitive (ไม่มี token/hash).
// รวมทั้ง isOwner (มี active subscription) และ isTenant (มี tenant membership with roomId).
export async function GET() {
  const session = await getSession();

  if (!session.userId) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  const [user, subscription, tenantMembership] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, displayName: true, email: true },
    }),
    prisma.subscription.findUnique({
      where: { userId: session.userId },
      select: { status: true, trialEndsAt: true, currentPeriodEnd: true },
    }),
    prisma.membership.findFirst({
      where: { userId: session.userId, role: "TENANT", roomId: { not: null } },
      select: { roomId: true },
    }),
  ]);

  if (!user) {
    // session อ้าง user ที่ไม่มีอยู่แล้ว — treat as unauthenticated
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  const isOwner = subscriptionIsActive(subscription);
  const isTenant = !!tenantMembership?.roomId;

  return NextResponse.json({
    authenticated: true,
    user: {
      ...user,
      isOwner,
      isTenant,
    },
  });
}
