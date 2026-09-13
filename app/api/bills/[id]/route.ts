import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, unauthorized } from "@/lib/auth";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) return unauthorized();
  const { id } = await params;
  const body = await req.json();
  const { paymentStatus } = body;

  if (!["PAID", "UNPAID"].includes(paymentStatus)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const bill = await prisma.bill.update({
    where: { id: Number(id) },
    data: {
      paymentStatus,
      paidAt: paymentStatus === "PAID" ? new Date() : null,
    },
    include: {
      lineItems: true,
      room: {
        include: {
          options: true,
          location: { select: { name: true } },
        },
      },
    },
  });

  return NextResponse.json(bill);
}
