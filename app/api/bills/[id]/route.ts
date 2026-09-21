import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId, isAuthResponse } from "@/lib/auth";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ id: string }> };

function mapBill(bill: any) { return { ...bill, room: { ...bill.room, location: bill.room.Apartment } }; }

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const userId = await requireUserId();
  if (isAuthResponse(userId)) return userId;
  const { id } = await params;
  const { paymentStatus } = await req.json();
  if (!["PAID", "UNPAID"].includes(paymentStatus)) return NextResponse.json({ error: "Invalid status" }, { status: 400 });

  const existing = await prisma.bill.findFirst({
    where: { id: Number(id), room: { Apartment: { ownerUserId: userId } } },
  });
  if (!existing) return NextResponse.json({ error: "ไม่พบบิล" }, { status: 404 });

  const bill = await prisma.bill.update({
    where: { id: Number(id) },
    data: { paymentStatus, paidAt: paymentStatus === "PAID" ? new Date() : null },
    include: { lineItems: true, room: { include: { options: true, Apartment: { select: { id: true, name: true } } } } },
  });
  return NextResponse.json(mapBill(bill));
}
