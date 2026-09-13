import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rl = checkRateLimit(`tenant-login:${ip}`);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "พยายามเข้าสู่ระบบบ่อยเกินไป กรุณารอสักครู่" },
      { status: 429, headers: { "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)) } },
    );
  }

  const { email, pin } = await req.json();

  if (!email || !pin) {
    return NextResponse.json({ error: "กรุณากรอกข้อมูลให้ครบ" }, { status: 400 });
  }

  const tenant = await prisma.tenant.findUnique({ where: { email } });
  if (!tenant || !tenant.isActive) {
    return NextResponse.json({ error: "อีเมลหรือ PIN ไม่ถูกต้อง" }, { status: 401 });
  }

  const valid = await bcrypt.compare(pin, tenant.pinHash);
  if (!valid) {
    return NextResponse.json({ error: "อีเมลหรือ PIN ไม่ถูกต้อง" }, { status: 401 });
  }

  const session = await getSession();
  session.userId = tenant.id;
  session.role = "tenant";
  await session.save();

  return NextResponse.json({ ok: true });
}
