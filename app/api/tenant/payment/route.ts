import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import path from "path";
import fs from "fs/promises";

const UPLOADS_DIR = path.join(process.cwd(), "uploads");
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"];

// POST /api/tenant/payment — submit payment slip for a bill
// Security: bill.roomId must match session tenant's roomId
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.userId || session.role !== "tenant") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: session.userId },
    select: { id: true, roomId: true },
  });

  if (!tenant?.roomId) {
    return NextResponse.json({ error: "ไม่พบข้อมูลห้องพัก" }, { status: 400 });
  }

  const formData = await req.formData();
  const billId = formData.get("billId");
  const note = formData.get("note")?.toString().trim() ?? "";
  const file = formData.get("slip");

  if (!billId) {
    return NextResponse.json({ error: "กรุณาเลือกบิล" }, { status: 400 });
  }
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "กรุณาอัปโหลดสลิป" }, { status: 400 });
  }

  // Validate file type
  if (!ALLOWED_MIME.includes(file.type)) {
    return NextResponse.json({ error: "ไฟล์ต้องเป็น รูปภาพ (JPEG/PNG/WebP/GIF) หรือ PDF เท่านั้น" }, { status: 400 });
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "ไฟล์ต้องมีขนาดไม่เกิน 10 MB" }, { status: 400 });
  }

  const billIdNum = Number(billId);
  if (isNaN(billIdNum)) {
    return NextResponse.json({ error: "billId ไม่ถูกต้อง" }, { status: 400 });
  }

  // Verify bill belongs to this tenant's room
  const bill = await prisma.bill.findFirst({
    where: { id: billIdNum, roomId: tenant.roomId },
  });

  if (!bill) {
    return NextResponse.json({ error: "ไม่พบบิล หรือไม่ใช่บิลของห้องคุณ" }, { status: 404 });
  }

  if (bill.paymentStatus === "PAID") {
    return NextResponse.json({ error: "บิลนี้ชำระแล้ว" }, { status: 409 });
  }

  // Save file to uploads/{roomId}/{timestamp}-{originalName}
  const roomDir = path.join(UPLOADS_DIR, String(tenant.roomId));
  await fs.mkdir(roomDir, { recursive: true });

  const ext = path.extname(file.name) || (file.type === "application/pdf" ? ".pdf" : ".jpg");
  const safeName = `${Date.now()}-slip${ext}`;
  const filePath = path.join(roomDir, safeName);

  const arrayBuffer = await file.arrayBuffer();
  await fs.writeFile(filePath, Buffer.from(arrayBuffer));

  // URL accessible via /api/uploads/{roomId}/{filename}
  const slipUrl = `/api/uploads/${tenant.roomId}/${safeName}`;

  const updated = await prisma.bill.update({
    where: { id: billIdNum },
    data: {
      paymentStatus: "SUBMITTED",
      paymentSlipUrl: slipUrl,
      paymentSubmittedAt: new Date(),
      paymentNote: note || null,
      paymentRejectionReason: null, // clear any previous rejection
    },
  });

  return NextResponse.json({ ok: true, bill: updated });
}
