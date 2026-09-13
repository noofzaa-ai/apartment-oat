import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { generateBillPdf } from "@/lib/pdf";

// GET /api/tenant/bills/[id]/pdf — download bill as PDF (tenant, own room only)
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session.userId || session.role !== "tenant") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: session.userId },
    select: { roomId: true },
  });

  if (!tenant?.roomId) {
    return NextResponse.json({ error: "ไม่พบห้อง" }, { status: 404 });
  }

  const { id } = await params;
  const billId = Number(id);

  const bill = await prisma.bill.findFirst({
    where: { id: billId, roomId: tenant.roomId },
    include: {
      lineItems: true,
      room: {
        include: {
          location: { select: { name: true } },
        },
      },
    },
  });

  if (!bill) {
    return NextResponse.json({ error: "ไม่พบบิล" }, { status: 404 });
  }

  const pdfBuffer = await generateBillPdf({
    locationName: bill.room.location.name,
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
