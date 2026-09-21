import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { requireUserId, requireOwnerOfApartment, isAuthResponse } from "@/lib/auth";
import { publicBaseUrl } from "@/lib/base-url";

export const runtime = "nodejs";

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function generateCode() {
  return randomBytes(6).toString("base64url");
}

export async function GET(req: NextRequest) {
  const userId = await requireUserId();
  if (isAuthResponse(userId)) return userId;
  const apartmentId = req.nextUrl.searchParams.get("apartmentId");
  if (!apartmentId) return NextResponse.json({ error: "apartmentId required" }, { status: 400 });
  const auth = await requireOwnerOfApartment(Number(apartmentId));
  if (isAuthResponse(auth)) return auth;

  const invites = await prisma.inviteCode.findMany({
    where: { apartmentId: Number(apartmentId) },
    include: { Room: { select: { id: true, roomNumber: true } }, User_InviteCode_usedByUserIdToUser: { select: { id: true, displayName: true, email: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(invites.map((inv) => ({
    id: inv.id,
    code: inv.code,
    url: new URL(`/tenant/invite/${inv.code}`, publicBaseUrl()).href,
    roomId: inv.roomId,
    room: inv.Room,
    expiresAt: inv.expiresAt,
    usedAt: inv.usedAt,
    usedBy: inv.User_InviteCode_usedByUserIdToUser,
    createdAt: inv.createdAt,
    status: inv.usedAt ? "USED" : inv.expiresAt.getTime() < Date.now() ? "EXPIRED" : "ACTIVE",
  })));
}

export async function POST(req: NextRequest) {
  const userId = await requireUserId();
  if (isAuthResponse(userId)) return userId;
  const { roomId } = await req.json();
  if (!roomId) return NextResponse.json({ error: "roomId required" }, { status: 400 });

  const room = await prisma.room.findUnique({ where: { id: Number(roomId) }, select: { id: true, apartmentId: true, Membership: true } });
  if (!room) return NextResponse.json({ error: "ไม่พบห้อง" }, { status: 404 });
  const auth = await requireOwnerOfApartment(room.apartmentId);
  if (isAuthResponse(auth)) return auth;
  if (room.Membership) return NextResponse.json({ error: "ห้องนี้มีผู้เช่าอยู่แล้ว" }, { status: 409 });

  const code = generateCode();
  const invite = await prisma.inviteCode.create({
    data: {
      code,
      apartmentId: room.apartmentId,
      roomId: room.id,
      expiresAt: new Date(Date.now() + INVITE_TTL_MS),
      createdByUserId: userId,
    },
  });

  return NextResponse.json({
    id: invite.id,
    code: invite.code,
    url: new URL(`/tenant/invite/${invite.code}`, publicBaseUrl()).href,
    expiresAt: invite.expiresAt,
  }, { status: 201 });
}
