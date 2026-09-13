import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { generateBillPdf } from "@/lib/pdf";

async function requireAdmin() {
  const session = await getSession();
  if (!session.userId || session.role !== "admin") return null;
  return session;
}

// GET /api/admin/bills/[id]/pdf — download any bill as PDF (admin only)
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const billId = Number(id);

  const bill = await prisma.bill.findUnique({
    where: { id: billId },
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
