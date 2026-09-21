// Helpers สำหรับ OIDC login flow — แยก logic ออกจาก route handler (thin handler).
import { createHash, randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit-log";

export const TXN_COOKIE = "apt_oidc_txn";
export const TXN_TTL_MS = 10 * 60 * 1000; // 10 นาที (ตาม spec)

/** hash state เพื่อเก็บใน DB (ไม่เก็บค่าดิบ). */
export function hashState(state: string): string {
  return createHash("sha256").update(state).digest("base64url");
}

/**
 * validate return_to ต้องเป็น internal path เท่านั้น (กัน open redirect).
 * อนุญาตเฉพาะ path ที่ขึ้นต้นด้วย "/" และไม่ใช่ protocol-relative "//".
 */
export function safeReturnTo(returnTo: string | null | undefined): string {
  if (!returnTo) return "/";
  if (!returnTo.startsWith("/")) return "/";
  if (returnTo.startsWith("//")) return "/"; // protocol-relative
  if (returnTo.includes("\\")) return "/";
  return returnTo;
}

/** สร้าง transaction id ใหม่ (opaque, ผูกใน cookie). */
export function newTxnId(): string {
  return randomUUID();
}

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

/**
 * Resolve post-login destination by subscription state.
 *
 * Product routing rule (2026-09):
 *   • Active owner subscription  → /app/locations
 *   • No subscription (new user) → /get-started (onboarding)
 *   • Tenant with room           → /tenant/dashboard
 *   • Everything else            → /tenant/dashboard
 *
 * Explicit return_to paths are honoured only when they do not violate the
 * caller's role boundary:
 *   • /app/* paths require an active subscription; non-owner return_to
 *     targeting /app/* is silently overridden to the default destination.
 *   • All other internal paths (/tenant/*, /account/*, etc.) are always safe
 *     to honour regardless of subscription status.
 */
export async function resolvePostLoginPath(
  userId: number,
  requestedReturnTo: string | null | undefined,
): Promise<string> {
  const [subscription, tenantMembership] = await Promise.all([
    prisma.subscription.findUnique({
      where: { userId },
      select: { status: true, trialEndsAt: true, currentPeriodEnd: true },
    }),
    prisma.membership.findFirst({
      where: { userId, role: "TENANT", roomId: { not: null } },
      select: { roomId: true },
    }),
  ]);

  const isOwner = subscriptionIsActive(subscription);
  const isTenant = !!tenantMembership?.roomId;

  const returnTo = safeReturnTo(requestedReturnTo);
  if (returnTo !== "/") {
    // Block /app/* return paths for non-owners — would be caught by the
    // authorization guard anyway, but we resolve it here to avoid an extra
    // round-trip redirect after login.
    const ownerPathRequested = returnTo.startsWith("/app/");
    if (!ownerPathRequested || isOwner) {
      return returnTo;
    }
  }

  // New user with no subscription → onboarding
  if (!subscription && !isTenant) {
    return "/get-started";
  }

  return isOwner ? "/app/locations" : "/tenant/dashboard";
}

/**
 * upsert local user จาก verified OIDC claims ผ่าน (issuer, subject).
 * ห้าม map ด้วย email. คืน userId.
 */
export async function provisionUserFromClaims(claims: {
  iss: string;
  sub: string;
  email?: string;
  emailVerified?: boolean;
  name?: string;
  picture?: string;
}): Promise<number> {
  const existing = await prisma.externalIdentity.findUnique({
    where: { issuer_subject: { issuer: claims.iss, subject: claims.sub } },
    select: { userId: true },
  });

  if (existing) {
    // Check if user should be auto-promoted to PLATFORM_ADMIN
    const adminEmails = process.env.PLATFORM_ADMIN_EMAILS?.split(',').map(e => e.trim().toLowerCase()) ?? [];
    const shouldPromote = claims.email && adminEmails.includes(claims.email.toLowerCase());

    // update profile snapshot ที่อนุญาต — ไม่แตะ local authorization
    // + update lastLoginAt on every login
    // + auto-promote to PLATFORM_ADMIN if email matches
    await prisma.user.update({
      where: { id: existing.userId },
      data: {
        displayName: claims.name ?? undefined,
        email: claims.email ?? undefined,
        emailVerified: claims.emailVerified ?? undefined,
        avatarUrl: claims.picture ?? undefined,
        lastLoginAt: new Date(),
        ...(shouldPromote ? { role: "PLATFORM_ADMIN" } : {}),
      },
    });

    // Audit log: user login
    await createAuditLog({
      category: "USER",
      action: "login",
      userId: existing.userId,
      details: { email: claims.email, promoted: shouldPromote },
    });

    // Audit log: admin promotion if applicable
    if (shouldPromote) {
      await createAuditLog({
        category: "ADMIN",
        action: "auto_promote_admin",
        userId: existing.userId,
        targetType: "USER",
        targetId: existing.userId,
        details: { email: claims.email, role: "PLATFORM_ADMIN" },
      });
    }

    return existing.userId;
  }

  // ผู้ใช้ใหม่ — สร้าง User + ExternalIdentity ใน transaction เดียว
  // Check if user should be auto-promoted to PLATFORM_ADMIN
  const adminEmails = process.env.PLATFORM_ADMIN_EMAILS?.split(',').map(e => e.trim().toLowerCase()) ?? [];
  const shouldPromote = claims.email && adminEmails.includes(claims.email.toLowerCase());

  const user = await prisma.user.create({
    data: {
      displayName: claims.name ?? null,
      email: claims.email ?? null,
      emailVerified: claims.emailVerified ?? false,
      avatarUrl: claims.picture ?? null,
      role: shouldPromote ? "PLATFORM_ADMIN" : "USER",
      lastLoginAt: new Date(),
      updatedAt: new Date(),
      ExternalIdentity: {
        create: {
          provider: "daiyooo-account",
          issuer: claims.iss,
          subject: claims.sub,
        },
      },
    },
    select: { id: true },
  });

  // Audit log: new user signup
  await createAuditLog({
    category: "USER",
    action: "signup",
    userId: user.id,
    details: { email: claims.email, promoted: shouldPromote },
  });

  // Audit log: admin promotion if applicable
  if (shouldPromote) {
    await createAuditLog({
      category: "ADMIN",
      action: "auto_promote_admin",
      userId: user.id,
      targetType: "USER",
      targetId: user.id,
      details: { email: claims.email, role: "PLATFORM_ADMIN" },
    });
  }

  return user.id;
}

/** ลบ transaction ที่หมดอายุ (housekeeping เบาๆ เรียกตอน login). */
export async function pruneExpiredTransactions(): Promise<void> {
  await prisma.oidcTransaction.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
}
