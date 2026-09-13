// Shared auth helpers for API route handlers.
// All admin API endpoints must call requireAdmin() at the top of each handler.

import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";

/** Returns the session if the caller is an authenticated admin, null otherwise. */
export async function requireAdmin() {
  const session = await getSession();
  if (!session.userId || session.role !== "admin") return null;
  return session;
}

/** Shorthand: return a 401 response for unauthorized calls. */
export function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
