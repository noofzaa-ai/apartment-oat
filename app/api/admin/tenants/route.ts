import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId, isAuthResponse } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET() {
  const userId = await requireUserId();
  if (isAuthResponse(userId)) return userId;
  const memberships = await prisma.membership.findMany({
    where: { role: "TENANT", Apartment: { ownerUserId: userId } },
    include: {
      User: { select: { id: true, displayName: true, email: true } },
      Room: { include: { Apartment: { select: { id: true, name: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  const result = await Promise.all(memberships.map(async (m) => {
    const latestBill = m.roomId ? await prisma.bill.findFirst({ where: { roomId: m.roomId }, orderBy: { period: "desc" }, select: { paymentStatus: true } }) : null;
    return {
      id: m.id,
      name: m.User.displayName ?? m.User.email ?? "ผู้เช่า",
      email: m.User.email ?? "",
      roomId: m.roomId,
      createdAt: m.createdAt,
      room: m.Room ? { ...m.Room, location: m.Room.Apartment } : null,
      latestBillStatus: latestBill?.paymentStatus ?? null,
    };
  }));

  return NextResponse.json(result);
}
