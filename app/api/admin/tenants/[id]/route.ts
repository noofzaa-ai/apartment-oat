import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId, isAuthResponse } from "@/lib/auth";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ id: string }> };

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const userId = await requireUserId();
  if (isAuthResponse(userId)) return userId;
  const { id } = await params;
  const membership = await prisma.membership.findFirst({ where: { id: Number(id), role: "TENANT", Apartment: { ownerUserId: userId } } });
  if (!membership) return NextResponse.json({ error: "ไม่พบผู้เช่า" }, { status: 404 });
  await prisma.membership.delete({ where: { id: membership.id } });
  return NextResponse.json({ ok: true });
}

export async function PATCH() {
  return NextResponse.json({ error: "ใช้ invite link แทนการแก้ข้อมูลผู้เช่า" }, { status: 410 });
}
