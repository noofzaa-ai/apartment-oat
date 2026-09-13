import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

async function requireAdmin() {
  const session = await getSession();
  if (!session.userId || session.role !== "admin") return null;
  return session;
}

function generatePin(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// PATCH /api/admin/tenants/[id] — update tenant info
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const tenantId = Number(id);
  const body = await req.json();
  const { name, email, phone, roomId, moveInDate, deposit, isActive } = body;

  const existing = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!existing) {
    return NextResponse.json({ error: "ไม่พบผู้เช่า" }, { status: 404 });
  }

  // Check email uniqueness (excluding self)
  if (email && email !== existing.email) {
    const dup = await prisma.tenant.findUnique({ where: { email } });
    if (dup) return NextResponse.json({ error: "อีเมลนี้มีอยู่ในระบบแล้ว" }, { status: 409 });
  }

  // Check room occupation (excluding self)
  if (roomId && Number(roomId) !== existing.roomId) {
    const occupied = await prisma.tenant.findUnique({ where: { roomId: Number(roomId) } });
    if (occupied) return NextResponse.json({ error: "ห้องนี้มีผู้เช่าอยู่แล้ว" }, { status: 409 });
  }

  const updated = await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      ...(name !== undefined && { name }),
      ...(email !== undefined && { email }),
      ...(phone !== undefined && { phone: phone || null }),
      ...(roomId !== undefined && { roomId: roomId ? Number(roomId) : null }),
      ...(moveInDate !== undefined && { moveInDate: moveInDate ? new Date(moveInDate) : null }),
      ...(deposit !== undefined && { deposit: deposit !== null ? Number(deposit) : null }),
      ...(isActive !== undefined && { isActive: Boolean(isActive) }),
    },
    include: {
      room: { include: { location: { select: { id: true, name: true } } } },
    },
  });

  return NextResponse.json(updated);
}

// POST /api/admin/tenants/[id]/reset-pin — generate a new PIN
// Defined in a separate action within the same [id] handler via ?action=reset-pin
// Actually we'll handle it via DELETE and a separate sub-route pattern.
// For clarity, we use a query param approach: PATCH with { action: "reset-pin" }

// DELETE /api/admin/tenants/[id] — delete tenant
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const tenantId = Number(id);

  const existing = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!existing) {
    return NextResponse.json({ error: "ไม่พบผู้เช่า" }, { status: 404 });
  }

  await prisma.tenant.delete({ where: { id: tenantId } });
  return NextResponse.json({ ok: true });
}

// POST /api/admin/tenants/[id] — reset PIN (returns new plain PIN once)
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  if (body.action !== "reset-pin") {
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  const tenantId = Number(id);
  const existing = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!existing) {
    return NextResponse.json({ error: "ไม่พบผู้เช่า" }, { status: 404 });
  }

  const pin = generatePin();
  const pinHash = await bcrypt.hash(pin, 10);

  await prisma.tenant.update({
    where: { id: tenantId },
    data: { pinHash },
  });

  return NextResponse.json({ pin });
}
