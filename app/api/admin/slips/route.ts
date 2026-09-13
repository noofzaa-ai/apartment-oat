import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

async function requireAdmin() {
  const session = await getSession();
  if (!session.userId || session.role !== "admin") return null;
  return session;
}

// GET /api/admin/slips — list all bills with paymentStatus=SUBMITTED
export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const bills = await prisma.bill.findMany({
    where: { paymentStatus: "SUBMITTED" },
    orderBy: { paymentSubmittedAt: "asc" },
    include: {
      room: {
        include: {
          location: { select: { id: true, name: true } },
          tenant: { select: { id: true, name: true, email: true } },
        },
      },
    },
  });

  return NextResponse.json(bills);
}
