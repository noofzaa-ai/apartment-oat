import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, unauthorized } from "@/lib/auth";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) return unauthorized();
  const { id } = await params;
  const body = await req.json();
  const { roomType, baseRent, waterRate, electricRate, options = [] } = body;

  if (baseRent == null || waterRate == null || electricRate == null) {
    return NextResponse.json({ error: "ข้อมูลไม่ครบถ้วน" }, { status: 400 });
  }

  // Delete existing options and recreate
  await prisma.roomOption.deleteMany({ where: { roomId: Number(id) } });

  const room = await prisma.room.update({
    where: { id: Number(id) },
    data: {
      roomType: roomType?.trim() || null,
      baseRent: Number(baseRent),
      waterRate: Number(waterRate),
      electricRate: Number(electricRate),
      options: {
        create: options
          .filter((o: { name: string; price: number }) => o.name?.trim())
          .map((o: { name: string; price: number }) => ({
            name: o.name.trim(),
            price: Number(o.price) || 0,
          })),
      },
    },
    include: {
      options: true,
      location: { select: { name: true } },
    },
  });

  return NextResponse.json(room);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) return unauthorized();
  const { id } = await params;

  await prisma.room.delete({ where: { id: Number(id) } });
  return NextResponse.json({ ok: true });
}
