import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import type { SessionData } from "@/lib/session";

const sessionOptions = {
  cookieName: "apt_session",
  password:
    process.env.SESSION_PASSWORD ??
    "dev-session-password-must-be-at-least-32-chars-long",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax" as const,
  },
};

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const res = NextResponse.next();

  // Read session using the req/res overload
  const session = await getIronSession<SessionData>(req, res, sessionOptions);
  const role = session.role;

  // Protect /admin/* except /admin/login
  if (pathname.startsWith("/admin") && !pathname.startsWith("/admin/login")) {
    if (role !== "admin") {
      return NextResponse.redirect(new URL("/admin/login", req.url));
    }
  }

  // Protect /tenant/* except /tenant/login
  if (pathname.startsWith("/tenant") && !pathname.startsWith("/tenant/login")) {
    if (role !== "tenant") {
      return NextResponse.redirect(new URL("/tenant/login", req.url));
    }
  }

  return res;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
