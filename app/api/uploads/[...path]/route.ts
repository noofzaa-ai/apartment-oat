import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import path from "path";
import fs from "fs/promises";

const UPLOADS_DIR = path.join(process.cwd(), "uploads");

// GET /api/uploads/[...path] — serves uploaded files with auth check
// Tenants can only access their own room's files; admins can access all
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const session = await getSession();
  if (!session.userId || !session.role) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { path: pathSegments } = await params;
  const relativePath = pathSegments.join("/");

  // Prevent path traversal
  const resolvedPath = path.resolve(UPLOADS_DIR, relativePath);
  if (!resolvedPath.startsWith(UPLOADS_DIR)) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  // Security: file name encodes roomId as first segment: uploads/{roomId}/{filename}
  // Tenant can only access files in their own room folder
  if (session.role === "tenant") {
    const tenant = await prisma.tenant.findUnique({
      where: { id: session.userId },
      select: { roomId: true },
    });
    if (!tenant?.roomId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const expectedPrefix = path.join(UPLOADS_DIR, String(tenant.roomId));
    if (!resolvedPath.startsWith(expectedPrefix)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }
  // Admins can access any file (role === "admin" passes through)

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

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(fileBuffer.length),
        "Cache-Control": "private, no-cache",
      },
    });
  } catch {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}
