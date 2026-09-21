import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOwnerOfApartment, isAuthResponse } from "@/lib/auth";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const apartmentId = Number(id);
  const auth = await requireOwnerOfApartment(apartmentId);
  if (isAuthResponse(auth)) return auth;
  const { name, address } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "ชื่อหอพักจำเป็น" }, { status: 400 });
  const apartment = await prisma.apartment.update({
    where: { id: apartmentId },
    data: { name: name.trim(), address: address?.trim() || null },
    include: { _count: { select: { Room: true } } },
  });
  return NextResponse.json(apartment);
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const apartmentId = Number(id);
  const auth = await requireOwnerOfApartment(apartmentId);
  if (isAuthResponse(auth)) return auth;
  await prisma.apartment.delete({ where: { id: apartmentId } });
  return NextResponse.json({ ok: true });
}
