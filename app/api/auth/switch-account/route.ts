import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { getSessionOptions, SessionData } from "@/lib/session";

export const runtime = "nodejs";

// GET /api/auth/switch-account — clears local session and redirects to login.
//
// Daiyooo Account supports prompt=select_account for forcing the Google account
// chooser. If DAIYOOO_OIDC_PROMPT=select_account is set, the normal /auth/login
// flow will show the account chooser. If not set, users must manually visit
// account.daiyooo.com to switch their Google account.
//
// This route clears the local Apartment-Oat session and redirects to /login with
// account_switch=manual flag for UI context. There is no central Account endpoint
// for RP-initiated logout or account switching in the current Better Auth setup.
export async function GET(req: NextRequest) {
  const host = req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") ?? req.nextUrl.protocol.replace(":", "");
  const origin = host ? `${proto}://${host}` : req.nextUrl.origin;
  const target = new URL("/login", origin);
  target.searchParams.set("account_switch", "manual");

  const res = NextResponse.redirect(target);
  const session = await getIronSession<SessionData>(req, res, getSessionOptions());
  session.destroy();

  return res;
}
