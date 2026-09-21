import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextResponse } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────
const mockPrisma = vi.hoisted(() => ({
  user: { findUnique: vi.fn() },
  subscription: { findUnique: vi.fn() },
  membership: { findFirst: vi.fn() },
}));

const mockGetSession = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

vi.mock("@/lib/session", () => ({
  getSession: () => mockGetSession(),
}));

// ── Helpers ────────────────────────────────────────────────────────────
const HOUR = 60 * 60 * 1000;
const future = () => new Date(Date.now() + 24 * HOUR);
const past = () => new Date(Date.now() - 24 * HOUR);

describe("GET /api/me", () => {
  // Import after mocks are set up
  let GET: () => Promise<NextResponse>;

  beforeEach(async () => {
    vi.clearAllMocks();
    // Dynamic import to respect mocks
    const module = await import("@/app/api/me/route");
    GET = module.GET;
  });

  it("case 1: unauthenticated -> 401 with authenticated: false", async () => {
    mockGetSession.mockResolvedValue({ userId: undefined });

    const res = await GET();
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toEqual({ authenticated: false });
  });

  it("case 2: session userId not found in DB -> 401", async () => {
    mockGetSession.mockResolvedValue({ userId: 999 });
    mockPrisma.user.findUnique.mockResolvedValue(null);

    const res = await GET();
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toEqual({ authenticated: false });
  });

  it("case 3: user with active subscription and no tenant membership -> isOwner=true, isTenant=false", async () => {
    mockGetSession.mockResolvedValue({ userId: 1 });
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 1,
      displayName: "Owner User",
      email: "owner@example.com",
    });
    mockPrisma.subscription.findUnique.mockResolvedValue({
      status: "TRIAL",
      trialEndsAt: future(),
      currentPeriodEnd: null,
    });
    mockPrisma.membership.findFirst.mockResolvedValue(null);

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({
      authenticated: true,
      user: {
        id: 1,
        displayName: "Owner User",
        email: "owner@example.com",
        isOwner: true,
        isTenant: false,
      },
    });
  });

  it("case 4: user with tenant membership with roomId and no subscription -> isOwner=false, isTenant=true", async () => {
    mockGetSession.mockResolvedValue({ userId: 2 });
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 2,
      displayName: "Tenant User",
      email: "tenant@example.com",
    });
    mockPrisma.subscription.findUnique.mockResolvedValue(null);
    mockPrisma.membership.findFirst.mockResolvedValue({
      role: "TENANT",
      roomId: 42,
    });

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({
      authenticated: true,
      user: {
        id: 2,
        displayName: "Tenant User",
        email: "tenant@example.com",
        isOwner: false,
        isTenant: true,
      },
    });
  });

  it("case 5: user with both active subscription and tenant membership -> isOwner=true, isTenant=true", async () => {
    mockGetSession.mockResolvedValue({ userId: 3 });
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 3,
      displayName: "Dual Role User",
      email: "dual@example.com",
    });
    mockPrisma.subscription.findUnique.mockResolvedValue({
      status: "ACTIVE",
      trialEndsAt: null,
      currentPeriodEnd: null,
    });
    mockPrisma.membership.findFirst.mockResolvedValue({
      role: "TENANT",
      roomId: 99,
    });

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({
      authenticated: true,
      user: {
        id: 3,
        displayName: "Dual Role User",
        email: "dual@example.com",
        isOwner: true,
        isTenant: true,
      },
    });
  });

  it("case 6: user with neither subscription nor tenant membership -> isOwner=false, isTenant=false", async () => {
    mockGetSession.mockResolvedValue({ userId: 4 });
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 4,
      displayName: "New User",
      email: "new@example.com",
    });
    mockPrisma.subscription.findUnique.mockResolvedValue(null);
    mockPrisma.membership.findFirst.mockResolvedValue(null);

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({
      authenticated: true,
      user: {
        id: 4,
        displayName: "New User",
        email: "new@example.com",
        isOwner: false,
        isTenant: false,
      },
    });
  });

  it("case 7: user with expired subscription -> isOwner=false", async () => {
    mockGetSession.mockResolvedValue({ userId: 5 });
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 5,
      displayName: "Expired User",
      email: "expired@example.com",
    });
    mockPrisma.subscription.findUnique.mockResolvedValue({
      status: "TRIAL",
      trialEndsAt: past(),
      currentPeriodEnd: null,
    });
    mockPrisma.membership.findFirst.mockResolvedValue(null);

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.user.isOwner).toBe(false);
  });

  it("case 8: user with tenant membership without roomId -> isTenant=false", async () => {
    mockGetSession.mockResolvedValue({ userId: 6 });
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 6,
      displayName: "Incomplete Tenant",
      email: "incomplete@example.com",
    });
    mockPrisma.subscription.findUnique.mockResolvedValue(null);
    mockPrisma.membership.findFirst.mockResolvedValue({
      role: "TENANT",
      roomId: null,
    });

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.user.isTenant).toBe(false);
  });
});
