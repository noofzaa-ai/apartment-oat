import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId, requireActiveSubscription, isAuthResponse } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET() {
  const userId = await requireUserId();
  if (isAuthResponse(userId)) return userId;
  const apartments = await prisma.apartment.findMany({
    where: { ownerUserId: userId },
    include: { _count: { select: { Room: true } } },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(apartments);
}

export async function POST(req: NextRequest) {
  // GATE: สร้างหอได้เฉพาะผู้มีแพ็กเกจที่ใช้งานอยู่ (TRIAL ยังไม่หมด / ACTIVE)
  const userId = await requireActiveSubscription();
  if (isAuthResponse(userId)) return userId;
  const { name, address } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "ชื่อหอพักจำเป็น" }, { status: 400 });
  const apartment = await prisma.apartment.create({
    data: {
      ownerUserId: userId,
      name: name.trim(),
      address: address?.trim() || null,
      Membership: { create: { userId, role: "OWNER" } },
    },
    include: { _count: { select: { Room: true } } },
  });
  return NextResponse.json(apartment, { status: 201 });
}
