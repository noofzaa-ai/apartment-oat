import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId, isAuthResponse } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET() {
  const userId = await requireUserId();
  if (isAuthResponse(userId)) return userId;
  const bills = await prisma.bill.findMany({
    where: { paymentStatus: "SUBMITTED", room: { Apartment: { ownerUserId: userId } } },
    include: {
      room: {
        include: {
          Apartment: { select: { id: true, name: true } },
          Membership: { include: { User: { select: { id: true, displayName: true, email: true } } } },
        },
      },
    },
    orderBy: { paymentSubmittedAt: "asc" },
  });
  return NextResponse.json(bills.map((b) => ({
    ...b,
    room: {
      ...b.room,
      location: b.room.Apartment,
      tenant: b.room.Membership ? { id: b.room.Membership.User.id, name: b.room.Membership.User.displayName ?? b.room.Membership.User.email ?? "ผู้เช่า", email: b.room.Membership.User.email ?? "" } : null,
    },
  })));
}
