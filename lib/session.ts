import { getIronSession, IronSession } from "iron-session";
import { cookies } from "next/headers";

// Local product session (iron-session) — ออกหลัง OIDC callback สำเร็จ.
// เก็บเฉพาะ userId; role/สิทธิ์ (subscription + membership) คำนวณจาก DB ตอน request
// ไม่ฝังใน cookie เพื่อไม่ให้สิทธิ์ค้างเมื่อ subscription/membership เปลี่ยน.
export type SessionData = {
  userId?: number;
};

const DEV_FALLBACK = "dev-session-password-must-be-at-least-32-chars-long";

function resolveSessionPassword(): string {
  const pw = process.env.SESSION_PASSWORD;
  if (!pw || pw.length < 32) {
    // fail-fast ใน production — ห้ามใช้ค่า dev fallback ที่รู้กันทั่วไป
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "SESSION_PASSWORD ต้องตั้งค่า (>=32 ตัวอักษร) ใน production — ห้ามใช้ค่า default",
      );
    }
    return DEV_FALLBACK;
  }
  return pw;
}

export function getSessionOptions() {
  // resolve password lazily (per request) — ไม่เรียกตอน module load
  // เพื่อให้ `next build` (ที่ import โมดูลนี้) ไม่ throw ตอน build
  // แต่คงพฤติกรรม fail-fast ตอน request จริงใน production
  return {
    cookieName: "apt_session",
    password: resolveSessionPassword(),
    cookieOptions: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: "lax" as const,
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    },
  };
}

export async function getSession(): Promise<IronSession<SessionData>> {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, getSessionOptions());
}
