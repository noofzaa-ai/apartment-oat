import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export function forbidden() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export async function getCurrentUserId(): Promise<number | null> {
  const session = await getSession();
  return session.userId ?? null;
}

// สร้าง TRIAL 30 วันให้ user — เฉพาะเมื่อยังไม่มี subscription เดิม (idempotent).
// เรียกได้จาก endpoint ที่ผู้ใช้กด "เริ่มทดลองใช้" อย่างชัดเจนเท่านั้น
// ห้ามเรียกจาก require* guard ใด ๆ (เดิม ensureSubscription auto-trial ทำให้ทุกคนได้สิทธิ์สร้างหอเงียบ ๆ).
export async function startTrialSubscription(userId: number) {
  const existing = await prisma.subscription.findUnique({ where: { userId } });
  if (existing) return existing;
  const trialEndsAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  return prisma.subscription.create({
    data: { userId, planCode: "TRIAL", status: "TRIAL", trialEndsAt },
  });
}

// true iff มี subscription ที่ยัง active:
//  - TRIAL: trialEndsAt ยังไม่หมดอายุ
//  - ACTIVE: currentPeriodEnd == null (ไม่จำกัด) หรือยังไม่หมดอายุ
// EXPIRED หรือไม่มี subscription => false
export async function hasActiveSubscription(userId: number): Promise<boolean> {
  const sub = await prisma.subscription.findUnique({ where: { userId } });
  if (!sub) return false;
  const now = Date.now();
  if (sub.status === "TRIAL") {
    return !!sub.trialEndsAt && sub.trialEndsAt.getTime() > now;
  }
  if (sub.status === "ACTIVE") {
    return sub.currentPeriodEnd == null || sub.currentPeriodEnd.getTime() > now;
  }
  return false;
}

export async function requireUserId(): Promise<number | NextResponse> {
  const userId = await getCurrentUserId();
  if (!userId) return unauthorized();
  return userId;
}

// Gate สำหรับการ "สร้างหอ" — ต้องมีแพ็กเกจที่ใช้งานอยู่
export async function requireActiveSubscription(): Promise<number | NextResponse> {
  const userId = await getCurrentUserId();
  if (!userId) return unauthorized();
  if (!(await hasActiveSubscription(userId))) {
    return NextResponse.json(
      { error: "ต้องมีแพ็กเกจที่ใช้งานอยู่ก่อนจึงจะสร้างหอได้", code: "subscription_required" },
      { status: 403 },
    );
  }
  return userId;
}

// Backward-compat alias: แปลว่า "ต้อง login" เท่านั้น (ไม่ auto-create subscription).
// ownership ของ resource ถูกบังคับใน handler แต่ละตัวอยู่แล้ว (ownerUserId / requireOwnerOfApartment).
export async function requireApartmentAdmin(): Promise<number | NextResponse> {
  return requireUserId();
}

export async function requireOwnerOfApartment(apartmentId: number): Promise<number | NextResponse> {
  const userId = await getCurrentUserId();
  if (!userId) return unauthorized();
  const apt = await prisma.apartment.findFirst({
    where: {
      id: apartmentId,
      OR: [
        { ownerUserId: userId },
        { Membership: { some: { userId, role: "OWNER" } } },
      ],
    },
    select: { id: true },
  });
  if (!apt) return forbidden();
  return userId;
}

export async function requireTenantOfRoom(roomId: number): Promise<number | NextResponse> {
  const userId = await getCurrentUserId();
  if (!userId) return unauthorized();
  const membership = await prisma.membership.findFirst({
    where: { userId, role: "TENANT", roomId },
    select: { id: true },
  });
  if (!membership) return forbidden();
  return userId;
}

export function isAuthResponse(value: number | NextResponse): value is NextResponse {
  return typeof value !== "number";
}

export async function getTenantMembership(userId: number) {
  return prisma.membership.findFirst({
    where: { userId, role: "TENANT", roomId: { not: null } },
    include: {
      User: true,
      Room: {
        include: {
          options: true,
          Apartment: { select: { id: true, name: true, address: true } },
        },
      },
      Apartment: { select: { id: true, name: true, address: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}
