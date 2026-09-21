import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ code: string }> };

export async function POST(_req: NextRequest, { params }: Ctx) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { code } = await params;
  const invite = await prisma.inviteCode.findUnique({ where: { code } });
  if (!invite) return NextResponse.json({ error: "ไม่พบรหัสเชิญนี้" }, { status: 404 });
  if (invite.usedAt) return NextResponse.json({ error: "รหัสเชิญนี้ถูกใช้ไปแล้ว" }, { status: 409 });
  if (invite.expiresAt.getTime() < Date.now()) return NextResponse.json({ error: "รหัสเชิญหมดอายุแล้ว" }, { status: 410 });

  const room = await prisma.room.findUnique({ where: { id: invite.roomId }, select: { id: true, apartmentId: true, Membership: true } });
  if (!room) return NextResponse.json({ error: "ไม่พบห้อง" }, { status: 404 });
  if (room.Membership) return NextResponse.json({ error: "ห้องนี้มีผู้เช่าอยู่แล้ว" }, { status: 409 });

  const existingMembership = await prisma.membership.findUnique({
    where: { userId_apartmentId: { userId, apartmentId: room.apartmentId } },
  });
  if (existingMembership) {
    return NextResponse.json({ error: "คุณมีสิทธิ์ในหอพักนี้อยู่แล้ว" }, { status: 409 });
  }

  await prisma.$transaction([
    prisma.membership.create({
      data: { userId, apartmentId: room.apartmentId, role: "TENANT", roomId: room.id },
    }),
    prisma.inviteCode.update({
      where: { code },
      data: { usedByUserId: userId, usedAt: new Date() },
    }),
  ]);

  return NextResponse.json({ ok: true, redirectTo: "/tenant/dashboard" });
}
