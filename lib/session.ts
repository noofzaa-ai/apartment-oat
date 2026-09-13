import { getIronSession, IronSession } from "iron-session";
import { cookies } from "next/headers";

export type SessionData = {
  userId?: number;
  role?: "admin" | "tenant";
};

const sessionOptions = {
  cookieName: "apt_session",
  password:
    process.env.SESSION_PASSWORD ??
    "dev-session-password-must-be-at-least-32-chars-long",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax" as const,
    maxAge: 60 * 60 * 24 * 7, // 7 days
  },
};

export async function getSession(): Promise<IronSession<SessionData>> {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}
