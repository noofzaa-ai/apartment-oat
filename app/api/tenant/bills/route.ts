import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

// GET /api/tenant/bills — returns all bills for the session tenant's room
// Security: roomId is sourced from session.userId → tenant.roomId, never from client
export async function GET() {
  const session = await getSession();
  if (!session.userId || session.role !== "tenant") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: session.userId },
    include: {
      room: {
        include: {
          location: { select: { id: true, name: true } },
        },
      },
    },
  });

  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  if (!tenant.roomId || !tenant.room) {
    return NextResponse.json({ tenant: { id: tenant.id, name: tenant.name }, room: null, bills: [] });
  }

  // Filter strictly by session-derived roomId
  const bills = await prisma.bill.findMany({
    where: { roomId: tenant.roomId },
    orderBy: { period: "desc" },
    include: { lineItems: true },
  });

  // For each bill, find the meter readings for that period and the previous period
  const billsWithMeters = await Promise.all(
    bills.map(async (bill) => {
      const [y, m] = bill.period.split("-").map(Number);
      const prevDate = new Date(y, m - 2, 1);
      const prevPeriod = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`;

      const [currReading, prevReading] = await Promise.all([
        prisma.meterReading.findUnique({
          where: { roomId_period: { roomId: tenant.roomId!, period: bill.period } },
        }),
        prisma.meterReading.findUnique({
          where: { roomId_period: { roomId: tenant.roomId!, period: prevPeriod } },
        }),
      ]);

      return { ...bill, currReading, prevReading };
    })
  );

  return NextResponse.json({
    tenant: { id: tenant.id, name: tenant.name },
    room: tenant.room,
    bills: billsWithMeters,
  });
}
