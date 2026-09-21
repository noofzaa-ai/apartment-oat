import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId, getTenantMembership } from "@/lib/auth";

export const runtime = "nodejs";

function previousPeriod(period: string) {
  const [y, m] = period.split("-").map(Number);
  const prevDate = new Date(y, m - 2, 1);
  return `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`;
}
function roomForUi(room: any) { return { ...room, location: room.Apartment }; }

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const membership = await getTenantMembership(userId);
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, displayName: true, email: true } });
  const tenant = { id: userId, name: user?.displayName ?? user?.email ?? "ผู้เช่า", email: user?.email ?? "" };
  if (!membership?.roomId || !membership.Room) return NextResponse.json([]);

  const bills = await prisma.bill.findMany({
    where: { roomId: membership.roomId },
    orderBy: { period: "desc" },
    include: { lineItems: true },
  });
  const billsWithMeters = await Promise.all(bills.map(async (bill) => {
    const prevPeriod = previousPeriod(bill.period);
    const [currReading, prevReading] = await Promise.all([
      prisma.meterReading.findUnique({ where: { roomId_period: { roomId: membership.roomId!, period: bill.period } } }),
      prisma.meterReading.findUnique({ where: { roomId_period: { roomId: membership.roomId!, period: prevPeriod } } }),
    ]);
    return { ...bill, currReading, prevReading };
  }));

  return NextResponse.json({ tenant, room: roomForUi(membership.Room), bills: billsWithMeters });
}
