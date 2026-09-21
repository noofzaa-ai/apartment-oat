import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId, getTenantMembership } from "@/lib/auth";
import path from "path";
import fs from "fs/promises";

export const runtime = "nodejs";

const UPLOADS_DIR = path.join(process.cwd(), "uploads");
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"];

export async function POST(req: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const membership = await getTenantMembership(userId);
  if (!membership?.roomId) return NextResponse.json({ error: "ไม่พบข้อมูลห้องพัก" }, { status: 400 });

  const formData = await req.formData();
  const billId = Number(formData.get("billId"));
  const note = formData.get("note")?.toString().trim() ?? "";
  const file = formData.get("slip");

  if (!Number.isFinite(billId)) return NextResponse.json({ error: "กรุณาเลือกบิล" }, { status: 400 });
  if (!file || !(file instanceof File)) return NextResponse.json({ error: "กรุณาอัปโหลดสลิป" }, { status: 400 });
  if (!ALLOWED_MIME.includes(file.type)) return NextResponse.json({ error: "ไฟล์ต้องเป็น รูปภาพ (JPEG/PNG/WebP/GIF) หรือ PDF เท่านั้น" }, { status: 400 });
  if (file.size > MAX_FILE_SIZE) return NextResponse.json({ error: "ไฟล์ต้องมีขนาดไม่เกิน 10 MB" }, { status: 400 });

  const bill = await prisma.bill.findFirst({ where: { id: billId, roomId: membership.roomId } });
  if (!bill) return NextResponse.json({ error: "ไม่พบบิล หรือไม่ใช่บิลของห้องคุณ" }, { status: 404 });
  if (bill.paymentStatus === "PAID") return NextResponse.json({ error: "บิลนี้ชำระแล้ว" }, { status: 409 });

  const roomDir = path.join(UPLOADS_DIR, String(membership.roomId));
  await fs.mkdir(roomDir, { recursive: true });
  const ext = path.extname(file.name) || (file.type === "application/pdf" ? ".pdf" : ".jpg");
  const safeName = `${Date.now()}-slip${ext.toLowerCase()}`;
  await fs.writeFile(path.join(roomDir, safeName), Buffer.from(await file.arrayBuffer()));
  const slipUrl = `/api/uploads/${membership.roomId}/${safeName}`;

  const updated = await prisma.bill.update({
    where: { id: billId },
    data: { paymentStatus: "SUBMITTED", paymentSlipUrl: slipUrl, paymentSubmittedAt: new Date(), paymentNote: note || null, paymentRejectionReason: null },
  });
  return NextResponse.json({ ok: true, bill: updated });
}
