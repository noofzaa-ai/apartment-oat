import { NextRequest, NextResponse } from "next/server";
import * as client from "openid-client";
import { getIronSession } from "iron-session";
import { prisma } from "@/lib/prisma";
import { getOidcConfig, getOidcClientConfig } from "@/lib/oidc";
import { getSession, getSessionOptions, SessionData } from "@/lib/session";
import { publicBaseUrl } from "@/lib/base-url";
import {
  TXN_COOKIE,
  hashState,
  provisionUserFromClaims,
  resolvePostLoginPath,
} from "@/lib/oidc-flow";

export const runtime = "nodejs";

function audit(event: string, data: Record<string, unknown> = {}) {
  console.info(JSON.stringify({ scope: "oidc", event, ts: new Date().toISOString(), ...data }));
}

function fail(status: number, code: string) {
  // generic error — ไม่ reflect provider error/claims ให้ผู้ใช้ และไม่ leak รายละเอียด
  const res = NextResponse.json({ error: code }, { status });
  res.cookies.delete(TXN_COOKIE);
  return res;
}

// GET /auth/callback?code&state&iss — ตรวจ callback + exchange + verify id_token
export async function GET(req: NextRequest) {
  let cfg;
  try {
    cfg = getOidcConfig();
  } catch {
    return NextResponse.json({ error: "ระบบเข้าสู่ระบบยังไม่พร้อมใช้งาน" }, { status: 503 });
  }

  const url = req.nextUrl;
  const state = url.searchParams.get("state");
  const providerError = url.searchParams.get("error");
  audit("callback.received", {
    hasCode: Boolean(url.searchParams.get("code")),
    hasState: Boolean(state),
    hasIss: Boolean(url.searchParams.get("iss")),
    hasError: Boolean(providerError),
    hasTxnCookie: Boolean(req.cookies.get(TXN_COOKIE)?.value),
  });

  if (!state) {
    audit("callback.fail", { reason: "missing_state" });
    return fail(400, "invalid_request");
  }

  const stateHash = hashState(state);
  const txnId = req.cookies.get(TXN_COOKIE)?.value;
  const txn = (txnId
    ? await prisma.oidcTransaction.findFirst({ where: { id: txnId, stateHash } })
    : null) ?? await prisma.oidcTransaction.findUnique({ where: { stateHash } });
  audit("callback.txn_lookup", {
    hasTxnCookie: Boolean(txnId),
    txnFound: Boolean(txn),
    txnUsed: txn?.used,
    txnExpired: txn ? txn.expiresAt.getTime() < Date.now() : null,
    txnReturnTo: txn?.returnTo,
  });
  if (!txn) {
    // Callback URLs are easy to reload/revisit after a successful one-time code
    // exchange. If the Product session already exists, treat the stale callback
    // as idempotent and land the user in the dashboard instead of showing a
    // confusing invalid_transaction JSON page.
    const session = await getSession();
    audit("callback.txn_missing", { hasSession: Boolean(session.userId) });
    if (session.userId) {
      const res = NextResponse.redirect(new URL("/app/locations", publicBaseUrl()).href);
      res.cookies.delete(TXN_COOKIE);
      return res;
    }
    audit("callback.fail", { reason: "invalid_transaction" });
    return fail(400, "invalid_transaction");
  }

  // หมดอายุ / ถูกใช้แล้ว (replay) → ปฏิเสธ + ล้าง
  const expired = txn.expiresAt.getTime() < Date.now();
  if (txn.used || expired) {
    audit("callback.fail", { reason: expired ? "transaction_expired" : "transaction_already_used" });
    await prisma.oidcTransaction.delete({ where: { id: txn.id } }).catch(() => {});
    return fail(400, "transaction_expired");
  }

  if (providerError) {
    audit("callback.fail", { reason: "provider_error", providerError });
    await prisma.oidcTransaction.delete({ where: { id: txn.id } }).catch(() => {});
    return fail(401, "login_cancelled");
  }

  const marked = await prisma.oidcTransaction.updateMany({
    where: { id: txn.id, stateHash, used: false },
    data: { used: true },
  });
  audit("callback.txn_marked", { markedCount: marked.count });
  if (marked.count !== 1) {
    audit("callback.fail", { reason: "transaction_replay" });
    return fail(400, "transaction_replay");
  }

  try {
    const configuration = await getOidcClientConfig();

    // openid-client v6 ต้องการ native URL (NextURL ไม่ extend URL → โดน instanceof guard ปฏิเสธ).
    // อีกทั้งอยู่หลัง Cloudflare: origin ที่เห็นภายในเป็น http://...:3000 ซึ่งไม่ตรง redirect_uri ที่ลงทะเบียน.
    // สร้าง native URL จาก redirect_uri ที่ config ไว้ (origin+path ตรง provider) แล้ว copy query เดิม (code/state/iss).
    const currentUrl = new URL(cfg.redirectUri);
    url.searchParams.forEach((v, k) => currentUrl.searchParams.set(k, v));

    // exchange code — openid-client จัดการ verify signature(EdDSA)/iss/aud/exp/nonce/PKCE ให้
    audit("callback.exchange_start", { redirectUri: cfg.redirectUri });
    const tokens = await client.authorizationCodeGrant(configuration, currentUrl, {
      expectedState: state,
      expectedNonce: txn.nonce,
      pkceCodeVerifier: txn.codeVerifier,
    });
    audit("callback.exchange_ok", { hasAccessToken: Boolean(tokens.access_token) });

    const claims = tokens.claims();
    if (!claims || typeof claims.sub !== "string" || claims.sub.length === 0) {
      audit("callback.fail", { reason: "invalid_id_token" });
      return fail(401, "invalid_id_token");
    }
    // ตรวจ issuer ซ้ำอีกชั้น (byte-for-byte) นอกเหนือจากที่ lib ตรวจ
    if (claims.iss !== cfg.issuer) {
      audit("callback.fail", { reason: "issuer_mismatch" });
      return fail(401, "issuer_mismatch");
    }

    // Fetch userinfo เพื่อดึง email/profile ที่อาจไม่อยู่ใน ID token
    // (Daiyooo Account / Better Auth อาจคืน email ผ่าน userinfo endpoint เท่านั้น)
    let userInfoEmail: string | undefined;
    let userInfoEmailVerified: boolean | undefined;
    let userInfoName: string | undefined;
    let userInfoPicture: string | undefined;
    if (tokens.access_token) {
      try {
        const userInfo = await client.fetchUserInfo(configuration, tokens.access_token, claims.sub);
        userInfoEmail = typeof userInfo.email === "string" ? userInfo.email : undefined;
        userInfoEmailVerified = userInfo.email_verified === true;
        userInfoName = typeof userInfo.name === "string" ? userInfo.name : undefined;
        userInfoPicture = typeof userInfo.picture === "string" ? userInfo.picture : undefined;
        audit("callback.userinfo_ok", { hasEmail: Boolean(userInfoEmail), emailVerified: userInfoEmailVerified === true });
      } catch (err) {
        audit("callback.userinfo_failed", { message: err instanceof Error ? err.message : "unknown" });
        // userinfo เป็น best-effort — ล้มเหลวยังใช้ claims จาก ID token ได้
      }
    }

    // provision local user ผ่าน (iss, sub) — ไม่ map ด้วย email
    // ให้ความสำคัญ userinfo ก่อน แล้วตามด้วย ID token claims (fallback)
    const userId = await provisionUserFromClaims({
      iss: claims.iss,
      sub: claims.sub,
      email: userInfoEmail ?? (typeof claims.email === "string" ? claims.email : undefined),
      emailVerified: userInfoEmailVerified ?? (claims.email_verified === true),
      name: userInfoName ?? (typeof claims.name === "string" ? claims.name : undefined),
      picture: userInfoPicture ?? (typeof claims.picture === "string" ? claims.picture : undefined),
    });
    audit("callback.user_provisioned", { userId });

    await prisma.oidcTransaction.delete({ where: { id: txn.id } }).catch(() => {});

    const returnTo = await resolvePostLoginPath(userId, txn.returnTo);
    audit("callback.post_login_path", { userId, returnTo, requestedReturnTo: txn.returnTo });

    const res = NextResponse.redirect(new URL(returnTo, publicBaseUrl()).href);
    res.cookies.delete(TXN_COOKIE);
    const session = await getIronSession<SessionData>(req, res, getSessionOptions());
    session.userId = userId;
    await session.save();
    audit("callback.session_saved", { userId, redirectTo: returnTo });
    return res;
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    audit("callback.fail", { reason: "authentication_failed", message });
    console.error("oidc callback error:", message);
    await prisma.oidcTransaction.delete({ where: { id: txn.id } }).catch(() => {});
    return fail(401, "authentication_failed");
  }
}
