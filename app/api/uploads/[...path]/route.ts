import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import path from "path";
import fs from "fs/promises";

export const runtime = "nodejs";

const UPLOADS_DIR = path.join(process.cwd(), "uploads");

export async function GET(_req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { path: pathSegments } = await params;
  const relativePath = pathSegments.join("/");
  const resolvedPath = path.resolve(UPLOADS_DIR, relativePath);
  if (!resolvedPath.startsWith(UPLOADS_DIR)) return NextResponse.json({ error: "Invalid path" }, { status: 400 });

  // uploads/{roomId}/{filename} — authorize by room membership
  const roomIdSeg = pathSegments[0];
  const roomId = Number(roomIdSeg);
  if (!Number.isFinite(roomId)) return NextResponse.json({ error: "Invalid path" }, { status: 400 });

  const [isTenant, isOwner] = await Promise.all([
    prisma.membership.findFirst({ where: { userId, role: "TENANT", roomId }, select: { id: true } }),
    prisma.room.findFirst({ where: { id: roomId, Apartment: { ownerUserId: userId } }, select: { id: true } }),
  ]);
  if (!isTenant && !isOwner) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const fileBuffer = await fs.readFile(resolvedPath);
    const ext = path.extname(relativePath).toLowerCase();
    const contentType =
      ext === ".pdf" ? "application/pdf" :
      ext === ".png" ? "image/png" :
      ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" :
      ext === ".webp" ? "image/webp" :
      ext === ".gif" ? "image/gif" :
      "application/octet-stream";
    return new NextResponse(fileBuffer as unknown as BodyInit, {
      status: 200,
      headers: { "Content-Type": contentType, "Content-Length": String(fileBuffer.length), "Cache-Control": "private, no-cache" },
    });
  } catch {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}
