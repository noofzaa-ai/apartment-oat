import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId, getTenantMembership } from "@/lib/auth";

export const runtime = "nodejs";

function roomForUi(room: any) { return { ...room, location: room.Apartment }; }

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const membership = await getTenantMembership(userId);
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, displayName: true, email: true } });
  const tenant = { id: userId, name: user?.displayName ?? user?.email ?? "ผู้เช่า", email: user?.email ?? "" };
  if (!membership?.roomId || !membership.Room) return NextResponse.json({ tenant, room: null, latestBill: null });
  const latestBill = await prisma.bill.findFirst({
    where: { roomId: membership.roomId },
    orderBy: { period: "desc" },
    include: { lineItems: true },
  });
  return NextResponse.json({ tenant, room: roomForUi(membership.Room), latestBill });
}
