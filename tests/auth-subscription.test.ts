import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ── Mocks ──────────────────────────────────────────────────────────────
// vi.mock is hoisted to the top of the file, so the mock fns must be created
// via vi.hoisted() to exist before the factory runs.
const { findUnique, create, getSession } = vi.hoisted(() => ({
  findUnique: vi.fn(),
  create: vi.fn(),
  getSession: vi.fn(),
}));

// Mock the prisma singleton so importing lib/auth.ts does NOT pull in
// better-sqlite3 / real DB. Only the subscription methods used by auth are needed.
vi.mock("@/lib/prisma", () => ({
  prisma: {
    subscription: { findUnique, create },
    // apartment/membership present for completeness (not exercised here)
    apartment: { findFirst: vi.fn() },
    membership: { findFirst: vi.fn() },
  },
}));

// Mock session so getCurrentUserId() is controllable without next/headers.
vi.mock("@/lib/session", () => ({
  getSession: () => getSession(),
}));

import {
  hasActiveSubscription,
  requireActiveSubscription,
  isAuthResponse,
} from "@/lib/auth";

// ── Helpers ────────────────────────────────────────────────────────────
const HOUR = 60 * 60 * 1000;
const future = () => new Date(Date.now() + 24 * HOUR);
const past = () => new Date(Date.now() - 24 * HOUR);

function setUser(userId: number | null) {
  getSession.mockResolvedValue({ userId: userId ?? undefined });
}

beforeEach(() => {
  findUnique.mockReset();
  create.mockReset();
  getSession.mockReset();
});

afterEach(() => {
  vi.clearAllMocks();
});

// ── hasActiveSubscription() pure-ish logic ───────────────────────────────
describe("hasActiveSubscription()", () => {
  it("case 1: no subscription -> false", async () => {
    findUnique.mockResolvedValue(null);
    expect(await hasActiveSubscription(1)).toBe(false);
  });

  it("case 2: TRIAL with trialEndsAt in the FUTURE -> true", async () => {
    findUnique.mockResolvedValue({ status: "TRIAL", trialEndsAt: future(), currentPeriodEnd: null });
    expect(await hasActiveSubscription(1)).toBe(true);
  });

  it("case 3: TRIAL with trialEndsAt in the PAST -> false", async () => {
    findUnique.mockResolvedValue({ status: "TRIAL", trialEndsAt: past(), currentPeriodEnd: null });
    expect(await hasActiveSubscription(1)).toBe(false);
  });

  it("case 3b: TRIAL with null trialEndsAt -> false", async () => {
    findUnique.mockResolvedValue({ status: "TRIAL", trialEndsAt: null, currentPeriodEnd: null });
    expect(await hasActiveSubscription(1)).toBe(false);
  });

  it("case 4a: ACTIVE with currentPeriodEnd in the future -> true", async () => {
    findUnique.mockResolvedValue({ status: "ACTIVE", trialEndsAt: null, currentPeriodEnd: future() });
    expect(await hasActiveSubscription(1)).toBe(true);
  });

  it("case 4b: ACTIVE with null currentPeriodEnd (unlimited) -> true", async () => {
    findUnique.mockResolvedValue({ status: "ACTIVE", trialEndsAt: null, currentPeriodEnd: null });
    expect(await hasActiveSubscription(1)).toBe(true);
  });

  it("case 5: ACTIVE with currentPeriodEnd in the past -> false", async () => {
    findUnique.mockResolvedValue({ status: "ACTIVE", trialEndsAt: null, currentPeriodEnd: past() });
    expect(await hasActiveSubscription(1)).toBe(false);
  });

  it("case 6: status EXPIRED -> false", async () => {
    findUnique.mockResolvedValue({ status: "EXPIRED", trialEndsAt: future(), currentPeriodEnd: future() });
    expect(await hasActiveSubscription(1)).toBe(false);
  });
});

// ── requireActiveSubscription() gate semantics ───────────────────────────
describe("requireActiveSubscription() gate", () => {
  it("case 7: unauthenticated -> 401 (before subscription check)", async () => {
    setUser(null);
    const res = await requireActiveSubscription();
    expect(isAuthResponse(res)).toBe(true);
    if (!isAuthResponse(res)) throw new Error("expected NextResponse");
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toEqual({ error: "Unauthorized" });
    // subscription must NOT even be queried when unauthenticated
    expect(findUnique).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  it("case 1 (gate): no subscription -> 403 subscription_required", async () => {
    setUser(42);
    findUnique.mockResolvedValue(null);
    const res = await requireActiveSubscription();
    expect(isAuthResponse(res)).toBe(true);
    if (!isAuthResponse(res)) throw new Error("expected NextResponse");
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.code).toBe("subscription_required");
    expect(typeof body.error).toBe("string");
  });

  it("case 2 (gate): TRIAL future -> returns userId (number)", async () => {
    setUser(42);
    findUnique.mockResolvedValue({ status: "TRIAL", trialEndsAt: future(), currentPeriodEnd: null });
    const res = await requireActiveSubscription();
    expect(isAuthResponse(res)).toBe(false);
    expect(res).toBe(42);
  });

  it("case 3 (gate): TRIAL past -> 403", async () => {
    setUser(42);
    findUnique.mockResolvedValue({ status: "TRIAL", trialEndsAt: past(), currentPeriodEnd: null });
    const res = await requireActiveSubscription();
    expect(isAuthResponse(res)).toBe(true);
    if (!isAuthResponse(res)) throw new Error("expected NextResponse");
    expect(res.status).toBe(403);
    expect((await res.json()).code).toBe("subscription_required");
  });

  it("case 4 (gate): ACTIVE unlimited -> returns userId", async () => {
    setUser(7);
    findUnique.mockResolvedValue({ status: "ACTIVE", trialEndsAt: null, currentPeriodEnd: null });
    const res = await requireActiveSubscription();
    expect(res).toBe(7);
  });

  it("case 5 (gate): ACTIVE expired -> 403", async () => {
    setUser(7);
    findUnique.mockResolvedValue({ status: "ACTIVE", trialEndsAt: null, currentPeriodEnd: past() });
    const res = await requireActiveSubscription();
    expect(isAuthResponse(res)).toBe(true);
    if (!isAuthResponse(res)) throw new Error("expected NextResponse");
    expect(res.status).toBe(403);
  });

  it("case 6 (gate): EXPIRED -> 403", async () => {
    setUser(7);
    findUnique.mockResolvedValue({ status: "EXPIRED", trialEndsAt: future(), currentPeriodEnd: future() });
    const res = await requireActiveSubscription();
    expect(isAuthResponse(res)).toBe(true);
    if (!isAuthResponse(res)) throw new Error("expected NextResponse");
    expect(res.status).toBe(403);
  });
});

// ── No silent auto-trial: the gate must NEVER create a subscription ───────
describe("no silent auto-trial (auto-trial is gone)", () => {
  it("403 path (no sub) does NOT call prisma.subscription.create", async () => {
    setUser(42);
    findUnique.mockResolvedValue(null);
    const res = await requireActiveSubscription();
    expect(isAuthResponse(res)).toBe(true);
    if (!isAuthResponse(res)) throw new Error("expected NextResponse");
    expect(res.status).toBe(403);
    expect(create).not.toHaveBeenCalled();
  });

  it("active path (TRIAL future) does NOT call prisma.subscription.create", async () => {
    setUser(42);
    findUnique.mockResolvedValue({ status: "TRIAL", trialEndsAt: future(), currentPeriodEnd: null });
    const res = await requireActiveSubscription();
    expect(res).toBe(42);
    expect(create).not.toHaveBeenCalled();
  });

  it("unauthenticated path does NOT call prisma.subscription.create", async () => {
    setUser(null);
    const res = await requireActiveSubscription();
    expect(isAuthResponse(res)).toBe(true);
    expect(create).not.toHaveBeenCalled();
  });
});
