import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { sendPinEmail } from "@/lib/email";

async function requireAdmin() {
  const session = await getSession();
  if (!session.userId || session.role !== "admin") return null;
  return session;
}

function generatePin(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// POST /api/admin/tenants/[id]/send-pin
// Body: { pin?: string } — if pin provided, send it; otherwise generate new one
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const tenantId = Number(id);
  const body = await req.json().catch(() => ({}));

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: {
      room: { include: { location: { select: { name: true } } } },
    },
  });

  if (!tenant) {
    return NextResponse.json({ error: "ไม่พบผู้เช่า" }, { status: 404 });
  }

  // If caller already has the current PIN (from reset-pin response), they'll pass it
  // Otherwise generate a fresh one and update the hash
  let pin: string;
  if (body.pin && /^\d{6}$/.test(body.pin)) {
    pin = body.pin;
    // Don't update hash — pin was already set by previous reset-pin call
  } else {
    pin = generatePin();
    const pinHash = await bcrypt.hash(pin, 10);
    await prisma.tenant.update({ where: { id: tenantId }, data: { pinHash } });
  }

  const result = await sendPinEmail({
    to: tenant.email,
    tenantName: tenant.name,
    pin,
    roomNumber: tenant.room?.roomNumber,
    locationName: tenant.room?.location.name,
  });

  return NextResponse.json({
    ok: true,
    sent: result.sent,
    devLog: result.devLog ?? false,
    ...(body.pin ? {} : { pin }), // return new pin if generated fresh
  });
}
