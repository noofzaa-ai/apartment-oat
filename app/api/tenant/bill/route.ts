import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

// GET /api/tenant/bill — returns the latest bill for the session tenant's room
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
          options: true,
        },
      },
    },
  });

  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  if (!tenant.roomId || !tenant.room) {
    return NextResponse.json({ tenant: { id: tenant.id, name: tenant.name }, room: null, latestBill: null });
  }

  // Always filter by the session-derived roomId — never trust client input
  const latestBill = await prisma.bill.findFirst({
    where: { roomId: tenant.roomId },
    orderBy: { period: "desc" },
    include: { lineItems: true },
  });

  return NextResponse.json({
    tenant: { id: tenant.id, name: tenant.name, email: tenant.email },
    room: tenant.room,
    latestBill,
  });
}
