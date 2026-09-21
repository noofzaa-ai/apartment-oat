import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId, isAuthResponse } from "@/lib/auth";
import { generateBillPdf } from "@/lib/pdf";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const userId = await requireUserId();
  if (isAuthResponse(userId)) return userId;
  const { id } = await params;
  const billId = Number(id);

  const bill = await prisma.bill.findFirst({
    where: { id: billId, room: { Apartment: { ownerUserId: userId } } },
    include: { lineItems: true, room: { include: { Apartment: { select: { name: true } } } } },
  });
  if (!bill) return NextResponse.json({ error: "ไม่พบบิล" }, { status: 404 });

  const pdfBuffer = await generateBillPdf({
    locationName: bill.room.Apartment.name,
    roomNumber: bill.room.roomNumber,
    roomType: bill.room.roomType,
    period: bill.period,
    baseRent: bill.baseRent,
    waterUnits: bill.waterUnits,
    waterCost: bill.waterCost,
    waterRate: bill.room.waterRate,
    electricUnits: bill.electricUnits,
    electricCost: bill.electricCost,
    electricRate: bill.room.electricRate,
    optionsCost: bill.optionsCost,
    total: bill.total,
    paymentStatus: bill.paymentStatus,
    paidAt: bill.paidAt,
    lineItems: bill.lineItems,
  });

  const filename = `bill-${bill.room.roomNumber}-${bill.period}.pdf`;
  return new NextResponse(pdfBuffer as unknown as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(pdfBuffer.length),
    },
  });
}
