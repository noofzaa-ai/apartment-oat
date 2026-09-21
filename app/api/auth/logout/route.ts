import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { getSessionOptions, SessionData } from "@/lib/session";
import { publicBaseUrl } from "@/lib/base-url";

export const runtime = "nodejs";

// GET /api/auth/logout — local logout.
// เป็น top-level navigation (ไม่ใช่ fetch) เพื่อให้ browser เดิน redirect chain.
//
// Route นี้ทำสองอย่าง:
//   1) ล้าง local apt_session ของ Product
//   2) Redirect ไป account.daiyooo.com/logout เพื่อล้าง Account session ด้วย
//
// หมายเหตุ: Better Auth provider ปัจจุบัน reject prompt=select_account ดังนั้นถ้าต้องการให้
// login รอบถัดไปเลือกเมลใหม่ ต้องล้าง Account session ตอน logout แทนการส่ง prompt ตอน login.
export async function GET(req: NextRequest) {
  const accountLogout = new URL("https://account.daiyooo.com/logout");
  accountLogout.searchParams.set("callbackURL", new URL("/", publicBaseUrl()).href);
  const res = NextResponse.redirect(accountLogout.href);

  // ล้าง apt_session: destroy บน req/res overload เขียน Set-Cookie ที่หมดอายุลงบน response ที่ return
  const session = await getIronSession<SessionData>(req, res, getSessionOptions());
  session.destroy();

  return res;
}
