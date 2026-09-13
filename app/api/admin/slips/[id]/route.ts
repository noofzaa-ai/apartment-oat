import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

async function requireAdmin() {
  const session = await getSession();
  if (!session.userId || session.role !== "admin") return null;
  return session;
}

// POST /api/admin/slips/[id] — approve or reject a submitted slip
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const billId = Number(id);
  const body = await req.json();
  const { action, reason } = body;

  if (action !== "approve" && action !== "reject") {
    return NextResponse.json({ error: "action must be 'approve' or 'reject'" }, { status: 400 });
  }

  const bill = await prisma.bill.findUnique({ where: { id: billId } });
  if (!bill) {
    return NextResponse.json({ error: "ไม่พบบิล" }, { status: 404 });
  }
  if (bill.paymentStatus !== "SUBMITTED") {
    return NextResponse.json({ error: "บิลนี้ไม่ได้อยู่ในสถานะรอยืนยัน" }, { status: 409 });
  }

  if (action === "approve") {
    const updated = await prisma.bill.update({
      where: { id: billId },
      data: {
        paymentStatus: "PAID",
        paidAt: new Date(),
        paymentRejectionReason: null,
      },
    });
    return NextResponse.json({ ok: true, bill: updated });
  } else {
    // reject → back to UNPAID, keep slipUrl for reference but clear submission time
    if (!reason?.trim()) {
      return NextResponse.json({ error: "กรุณาระบุเหตุผลการปฏิเสธ" }, { status: 400 });
    }
    const updated = await prisma.bill.update({
      where: { id: billId },
      data: {
        paymentStatus: "UNPAID",
        paymentSlipUrl: null,
        paymentSubmittedAt: null,
        paymentRejectionReason: reason.trim(),
      },
    });
    return NextResponse.json({ ok: true, bill: updated });
  }
}
