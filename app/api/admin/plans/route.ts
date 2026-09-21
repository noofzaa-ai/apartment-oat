import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";

export const runtime = "nodejs";

// GET /api/admin/plans
export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const plans = await prisma.plan.findMany({
    where: { isActive: true },
    select: {
      code: true,
      name: true,
      displayName: true,
      pricePerRoom: true,
      tierSize: true,
      maxRooms: true,
      features: true,
    },
    orderBy: { sortOrder: "asc" },
  });

  return NextResponse.json(plans);
}
