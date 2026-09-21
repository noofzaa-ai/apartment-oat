import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId, getTenantMembership } from "@/lib/auth";
import { generateBillPdf } from "@/lib/pdf";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const membership = await getTenantMembership(userId);
  if (!membership?.roomId) return NextResponse.json({ error: "ไม่พบห้อง" }, { status: 404 });
  const { id } = await params;
  const bill = await prisma.bill.findFirst({
    where: { id: Number(id), roomId: membership.roomId },
    include: { lineItems: true, room: { include: { Apartment: { select: { name: true } } } } },
  });
  if (!bill) return NextResponse.json({ error: "ไม่พบบิล" }, { status: 404 });
  const pdfBuffer = await generateBillPdf({
    locationName: bill.room.Apartment.name, roomNumber: bill.room.roomNumber, roomType: bill.room.roomType,
    period: bill.period, baseRent: bill.baseRent, waterUnits: bill.waterUnits, waterCost: bill.waterCost, waterRate: bill.room.waterRate,
    electricUnits: bill.electricUnits, electricCost: bill.electricCost, electricRate: bill.room.electricRate,
    optionsCost: bill.optionsCost, total: bill.total, paymentStatus: bill.paymentStatus, paidAt: bill.paidAt, lineItems: bill.lineItems,
  });
  return new NextResponse(pdfBuffer as unknown as BodyInit, {
    status: 200,
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="bill-${bill.room.roomNumber}-${bill.period}.pdf"`, "Content-Length": String(pdfBuffer.length) },
  });
}
