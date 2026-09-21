import { NextRequest, NextResponse } from "next/server";
import { getOidcConfig } from "@/lib/oidc";
import { beginOidcLogin } from "@/lib/oidc-login";
import { TXN_COOKIE, TXN_TTL_MS, safeReturnTo } from "@/lib/oidc-flow";

export const runtime = "nodejs";

function audit(event: string, data: Record<string, unknown> = {}) {
  console.info(JSON.stringify({ scope: "oidc", event, ts: new Date().toISOString(), ...data }));
}

// GET /auth/login?return_to=/… — เริ่ม OIDC Authorization Code + PKCE S256
export async function GET(req: NextRequest) {
  try {
    getOidcConfig();
  } catch {
    // config ไม่ครบ → fail closed (ไม่ leak รายละเอียด)
    return NextResponse.json({ error: "ระบบเข้าสู่ระบบยังไม่พร้อมใช้งาน" }, { status: 503 });
  }

  const returnTo = safeReturnTo(req.nextUrl.searchParams.get("return_to"));
  audit("login.start", { returnTo, hasExistingTxnCookie: Boolean(req.cookies.get(TXN_COOKIE)?.value) });

  try {
    const { authUrl, txnId } = await beginOidcLogin(returnTo);
    audit("login.transaction_created", { returnTo, txnIdPrefix: txnId.slice(0, 8), authHost: authUrl.host });

    const res = NextResponse.redirect(authUrl.href);
    // ผูก transaction กับ browser ผ่าน httpOnly cookie (ไม่เก็บ state/nonce/verifier ใน cookie)
    res.cookies.set(TXN_COOKIE, txnId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: TXN_TTL_MS / 1000,
    });
    return res;
  } catch (err) {
    console.error("oidc login error:", err instanceof Error ? err.message : "unknown");
    return NextResponse.json({ error: "เริ่มการเข้าสู่ระบบไม่สำเร็จ" }, { status: 502 });
  }
}
