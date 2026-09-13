import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, unauthorized } from "@/lib/auth";

export async function GET() {
  if (!(await requireAdmin())) return unauthorized();

  const locations = await prisma.location.findMany({
    include: {
      _count: { select: { rooms: true } },
    },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(locations);
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return unauthorized();

  const body = await req.json();
  const { name, address } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: "ชื่อหอพักจำเป็น" }, { status: 400 });
  }

  const location = await prisma.location.create({
    data: { name: name.trim(), address: address?.trim() || null },
    include: { _count: { select: { rooms: true } } },
  });

  return NextResponse.json(location, { status: 201 });
}
