import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/admin/users/[id]/notes
 * List admin notes for a user
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePlatformAdmin();

    const { id } = await params;
    const userId = parseInt(id);
    if (isNaN(userId)) {
      return NextResponse.json({ error: "invalid_user_id" }, { status: 400 });
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: "user_not_found" }, { status: 404 });
    }

    // Fetch notes
    const notes = await prisma.adminNote.findMany({
      where: {
        targetType: "USER",
        targetId: userId,
      },
      include: {
        admin: {
          select: {
            id: true,
            displayName: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      notes: notes.map((note) => ({
        id: note.id,
        note: note.note,
        createdAt: note.createdAt,
        admin: {
          id: note.admin.id,
          displayName: note.admin.displayName,
          email: note.admin.email,
        },
      })),
    });
  } catch (error) {
    if (error instanceof NextResponse) {
      return error;
    }
    console.error("GET /api/admin/users/[id]/notes error:", error);
    return NextResponse.json(
      { error: "internal_server_error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/users/[id]/notes
 * Create an admin note for a user
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminUser = await requirePlatformAdmin();

    const { id } = await params;
    const userId = parseInt(id);
    if (isNaN(userId)) {
      return NextResponse.json({ error: "invalid_user_id" }, { status: 400 });
    }

    const body = await req.json();
    const { note } = body;

    if (!note || typeof note !== "string" || note.trim().length === 0) {
      return NextResponse.json(
        { error: "note_field_required" },
        { status: 400 }
      );
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: "user_not_found" }, { status: 404 });
    }

    // Create note
    const adminNote = await prisma.adminNote.create({
      data: {
        targetType: "USER",
        targetId: userId,
        adminUserId: adminUser.userId,
        note: note.trim(),
      },
      include: {
        admin: {
          select: {
            id: true,
            displayName: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        id: adminNote.id,
        note: adminNote.note,
        createdAt: adminNote.createdAt,
        admin: {
          id: adminNote.admin.id,
          displayName: adminNote.admin.displayName,
          email: adminNote.admin.email,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof NextResponse) {
      return error;
    }
    console.error("POST /api/admin/users/[id]/notes error:", error);
    return NextResponse.json(
      { error: "internal_server_error" },
      { status: 500 }
    );
  }
}
