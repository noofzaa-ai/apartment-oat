import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, unauthorized } from "@/lib/auth";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) return unauthorized();
  const { id } = await params;
  const body = await req.json();
  const { name, address } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: "ชื่อหอพักจำเป็น" }, { status: 400 });
  }

  const location = await prisma.location.update({
    where: { id: Number(id) },
    data: { name: name.trim(), address: address?.trim() || null },
    include: { _count: { select: { rooms: true } } },
  });

  return NextResponse.json(location);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) return unauthorized();
  const { id } = await params;

  await prisma.location.delete({ where: { id: Number(id) } });
  return NextResponse.json({ ok: true });
}
