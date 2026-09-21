import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import type { SessionData } from "@/lib/session";
import { publicBaseUrl } from "@/lib/base-url";
import { prisma } from "@/lib/prisma";

const sessionOptions = {
  cookieName: "apt_session",
  password:
    process.env.SESSION_PASSWORD ??
    "dev-session-password-must-be-at-least-32-chars-long",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
  },
};

function subscriptionIsActive(sub: {
  status: string;
  trialEndsAt: Date | null;
  currentPeriodEnd: Date | null;
} | null): boolean {
  if (!sub) return false;
  const now = Date.now();
  if (sub.status === "TRIAL") {
    return !!sub.trialEndsAt && sub.trialEndsAt.getTime() > now;
  }
  if (sub.status === "ACTIVE") {
    return sub.currentPeriodEnd == null || sub.currentPeriodEnd.getTime() > now;
  }
  return false;
}

async function getRouteAuthorization(userId: number): Promise<{
  exists: boolean;
  isOwner: boolean;
  isTenant: boolean;
  hasSubscription: boolean;
}> {
  const [user, subscription, tenantMembership] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    }),
    prisma.subscription.findUnique({
      where: { userId },
      select: { status: true, trialEndsAt: true, currentPeriodEnd: true },
    }),
    prisma.membership.findFirst({
      where: { userId, role: "TENANT", roomId: { not: null } },
      select: { roomId: true },
    }),
  ]);

  return {
    exists: !!user,
    isOwner: subscriptionIsActive(subscription),
    isTenant: !!tenantMembership?.roomId,
    hasSubscription: !!subscription,
  };
}

function redirectToNeutralLogin() {
  return NextResponse.redirect(new URL("/login", publicBaseUrl()));
}

function audit(event: string, data: Record<string, unknown> = {}) {
  console.info(JSON.stringify({ scope: "auth-proxy", event, ts: new Date().toISOString(), ...data }));
}

export async function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const res = NextResponse.next();

  // Read session using the req/res overload
  const session = await getIronSession<SessionData>(req, res, sessionOptions);

  // Redirect unauthenticated users away from protected areas.
  const isPublicTenantInvite =
    pathname.startsWith("/tenant/invite/") && !pathname.endsWith("/claim");
  // /tenant/invite/*/claim = needs auth only, not role check (user is claiming a tenant invite)
  const isTenantInviteClaim =
    pathname.startsWith("/tenant/invite/") && pathname.endsWith("/claim");
  const isTenantRoute =
    pathname.startsWith("/tenant") &&
    !pathname.startsWith("/tenant/login") &&
    !isPublicTenantInvite &&
    !isTenantInviteClaim;
  const isOwnerRoute = pathname.startsWith("/app");
  const isGetStartedRoute = pathname === "/get-started";
  const isProtected = isOwnerRoute || isTenantRoute || isGetStartedRoute;

  if (isProtected && !session.userId) {
    audit("proxy.unauthenticated", { pathname, redirectTo: "/auth/login" });
    const login = new URL("/auth/login", publicBaseUrl());
    login.searchParams.set("return_to", pathname + (search || ""));
    return NextResponse.redirect(login);
  }

  if (isProtected && session.userId) {
    const auth = await getRouteAuthorization(session.userId);
    audit("proxy.auth_check", { pathname, userId: session.userId, isOwner: auth.isOwner, isTenant: auth.isTenant, exists: auth.exists, hasSubscription: auth.hasSubscription });

    if (!auth.exists) {
      audit("proxy.redirect", { reason: "user_not_found", pathname });
      const login = new URL("/auth/login", publicBaseUrl());
      login.searchParams.set("return_to", pathname + (search || ""));
      return NextResponse.redirect(login);
    }

    // Redirect new users without subscription to onboarding (except if they're tenants)
    if (isOwnerRoute && !auth.hasSubscription && !auth.isTenant) {
      audit("proxy.redirect", { reason: "no_subscription_onboarding", pathname });
      return NextResponse.redirect(new URL("/get-started", publicBaseUrl()));
    }

    if (isOwnerRoute && !auth.isOwner) {
      audit("proxy.redirect", { reason: "not_owner", pathname });
      return redirectToNeutralLogin();
    }

    if (isTenantRoute && !auth.isTenant) {
      // /tenant/dashboard is also the post-login landing page for authenticated
      // users who do not yet have a room/tenant role. The page and API render a
      // no-room state, so allow it to avoid a post-login redirect back to /login.
      if (pathname === "/tenant/dashboard") {
        return res;
      }
      audit("proxy.redirect", { reason: "not_tenant", pathname });
      return redirectToNeutralLogin();
    }

    // Allow access to /get-started for authenticated users (handled above)
    if (isGetStartedRoute) {
      return res;
    }
  }

  return res;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
