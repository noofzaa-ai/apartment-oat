import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId, isAuthResponse } from "@/lib/auth";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Ctx) {
  const userId = await requireUserId();
  if (isAuthResponse(userId)) return userId;
  const { id } = await params;
  const { action, reason } = await req.json();
  const bill = await prisma.bill.findFirst({ where: { id: Number(id), room: { Apartment: { ownerUserId: userId } } } });
  if (!bill) return NextResponse.json({ error: "ไม่พบบิล" }, { status: 404 });
  if (action === "approve") {
    const updated = await prisma.bill.update({ where: { id: bill.id }, data: { paymentStatus: "PAID", paidAt: new Date(), paymentRejectionReason: null } });
    return NextResponse.json(updated);
  }
  if (action === "reject") {
    if (!reason?.trim()) return NextResponse.json({ error: "กรุณาระบุเหตุผล" }, { status: 400 });
    const updated = await prisma.bill.update({ where: { id: bill.id }, data: { paymentStatus: "UNPAID", paymentRejectionReason: reason.trim() } });
    return NextResponse.json(updated);
  }
  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  return POST(req, ctx);
}
