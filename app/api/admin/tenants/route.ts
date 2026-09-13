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

// GET /api/admin/tenants — list all tenants with room info
export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenants = await prisma.tenant.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      room: {
        include: { location: { select: { id: true, name: true } } },
      },
    },
  });

  // Also get latest bill status per tenant
  const tenantsWithBill = await Promise.all(
    tenants.map(async (t) => {
      let latestBillStatus: string | null = null;
      if (t.roomId) {
        const bill = await prisma.bill.findFirst({
          where: { roomId: t.roomId },
          orderBy: { period: "desc" },
          select: { paymentStatus: true },
        });
        latestBillStatus = bill?.paymentStatus ?? null;
      }
      return { ...t, latestBillStatus };
    })
  );

  return NextResponse.json(tenantsWithBill);
}

// POST /api/admin/tenants — create tenant + auto-generate PIN
export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { name, email, phone, roomId, moveInDate, deposit, isActive } = body;

  if (!name || !email) {
    return NextResponse.json({ error: "ชื่อและอีเมลจำเป็น" }, { status: 400 });
  }

  // Check email uniqueness
  const existing = await prisma.tenant.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "อีเมลนี้มีอยู่ในระบบแล้ว" }, { status: 409 });
  }

  // Check room is not occupied (if specified)
  if (roomId) {
    const occupied = await prisma.tenant.findUnique({ where: { roomId: Number(roomId) } });
    if (occupied) {
      return NextResponse.json({ error: "ห้องนี้มีผู้เช่าอยู่แล้ว" }, { status: 409 });
    }
  }

  const pin = generatePin();
  const pinHash = await bcrypt.hash(pin, 10);

  const tenant = await prisma.tenant.create({
    data: {
      name,
      email,
      phone: phone || null,
      pinHash,
      roomId: roomId ? Number(roomId) : null,
      moveInDate: moveInDate ? new Date(moveInDate) : null,
      deposit: deposit ? Number(deposit) : null,
      isActive: isActive !== undefined ? Boolean(isActive) : true,
    },
    include: {
      room: { include: { location: { select: { id: true, name: true } } } },
    },
  });

  // Return the plain PIN once — it cannot be recovered after this
  return NextResponse.json({ tenant, pin }, { status: 201 });
}
