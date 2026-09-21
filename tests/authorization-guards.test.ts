import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────
const mockPrisma = vi.hoisted(() => ({
  user: { findUnique: vi.fn() },
  subscription: { findUnique: vi.fn() },
  membership: { findFirst: vi.fn() },
}));

const mockGetIronSession = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

vi.mock("iron-session", () => ({
  getIronSession: mockGetIronSession,
}));

// ── Helpers ────────────────────────────────────────────────────────────
const HOUR = 60 * 60 * 1000;
const future = () => new Date(Date.now() + 24 * HOUR);

function createRequest(pathname: string): NextRequest {
  return new NextRequest(new URL(`http://localhost:3000${pathname}`));
}

describe("Authorization Guards in proxy middleware", () => {
  let proxy: (req: NextRequest) => Promise<NextResponse>;

  beforeEach(async () => {
    vi.clearAllMocks();
    // Dynamic import to respect mocks
    const module = await import("@/proxy");
    proxy = module.proxy;
  });

  describe("Tenant routes (/tenant/*)", () => {
    it("should allow access to /tenant/login without authentication", async () => {
      mockGetIronSession.mockResolvedValue({ userId: undefined });

      const req = createRequest("/tenant/login");
      const res = await proxy(req);

      // Should pass through (not redirect)
      expect(res.status).not.toBe(307);
      expect(res.status).not.toBe(302);
    });

    it("should allow access to /tenant/invite/:code without authentication", async () => {
      mockGetIronSession.mockResolvedValue({ userId: undefined });

      const req = createRequest("/tenant/invite/abc123");
      const res = await proxy(req);

      // Should pass through
      expect(res.status).not.toBe(307);
      expect(res.status).not.toBe(302);
    });

    it("should redirect unauthenticated user from /tenant/dashboard to login", async () => {
      mockGetIronSession.mockResolvedValue({ userId: undefined });

      const req = createRequest("/tenant/dashboard");
      const res = await proxy(req);

      expect(res.status).toBe(307);
      const location = res.headers.get("location");
      expect(location).toContain("/auth/login");
      expect(location).toContain("return_to");
    });

    it("should allow authenticated owner without tenant role to see /tenant/dashboard no-room state", async () => {
      mockGetIronSession.mockResolvedValue({ userId: 1 });
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 1,
        displayName: "Owner",
        email: "owner@example.com",
      });
      mockPrisma.subscription.findUnique.mockResolvedValue({
        status: "ACTIVE",
        trialEndsAt: null,
        currentPeriodEnd: null,
      });
      mockPrisma.membership.findFirst.mockResolvedValue(null);

      const req = createRequest("/tenant/dashboard");
      const res = await proxy(req);

      expect(res.status).not.toBe(307);
      expect(res.status).not.toBe(302);
    });

    it("should allow authenticated tenant (isTenant=true) to access /tenant/dashboard", async () => {
      mockGetIronSession.mockResolvedValue({ userId: 2 });
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 2,
        displayName: "Tenant",
        email: "tenant@example.com",
      });
      mockPrisma.subscription.findUnique.mockResolvedValue(null);
      mockPrisma.membership.findFirst.mockResolvedValue({
        role: "TENANT",
        roomId: 42,
      });

      const req = createRequest("/tenant/dashboard");
      const res = await proxy(req);

      // Should pass through
      expect(res.status).not.toBe(307);
      expect(res.status).not.toBe(302);
    });

    it("should allow dual-role user (isOwner=true, isTenant=true) to access /tenant/dashboard", async () => {
      mockGetIronSession.mockResolvedValue({ userId: 3 });
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 3,
        displayName: "Dual",
        email: "dual@example.com",
      });
      mockPrisma.subscription.findUnique.mockResolvedValue({
        status: "TRIAL",
        trialEndsAt: future(),
        currentPeriodEnd: null,
      });
      mockPrisma.membership.findFirst.mockResolvedValue({
        role: "TENANT",
        roomId: 99,
      });

      const req = createRequest("/tenant/dashboard");
      const res = await proxy(req);

      // Should pass through
      expect(res.status).not.toBe(307);
      expect(res.status).not.toBe(302);
    });

    it("should allow authenticated user with no roles to see /tenant/dashboard no-room state", async () => {
      mockGetIronSession.mockResolvedValue({ userId: 4 });
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 4,
        displayName: "NoRole",
        email: "norole@example.com",
      });
      mockPrisma.subscription.findUnique.mockResolvedValue(null);
      mockPrisma.membership.findFirst.mockResolvedValue(null);

      const req = createRequest("/tenant/dashboard");
      const res = await proxy(req);

      expect(res.status).not.toBe(307);
      expect(res.status).not.toBe(302);
    });
  });

  describe("Owner routes (/app/*)", () => {
    it("should redirect unauthenticated user from /app/locations to login", async () => {
      mockGetIronSession.mockResolvedValue({ userId: undefined });

      const req = createRequest("/app/locations");
      const res = await proxy(req);

      expect(res.status).toBe(307);
      const location = res.headers.get("location");
      expect(location).toContain("/auth/login");
      expect(location).toContain("return_to");
    });

    it("should redirect authenticated tenant (isTenant=true, isOwner=false) from /app/locations", async () => {
      mockGetIronSession.mockResolvedValue({ userId: 2 });
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 2,
        displayName: "Tenant",
        email: "tenant@example.com",
      });
      mockPrisma.subscription.findUnique.mockResolvedValue(null);
      mockPrisma.membership.findFirst.mockResolvedValue({
        role: "TENANT",
        roomId: 42,
      });

      const req = createRequest("/app/locations");
      const res = await proxy(req);

      expect(res.status).toBe(307);
      const location = res.headers.get("location");
      expect(location).toContain("/login");
    });

    it("should allow authenticated owner (isOwner=true) to access /app/locations", async () => {
      mockGetIronSession.mockResolvedValue({ userId: 1 });
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 1,
        displayName: "Owner",
        email: "owner@example.com",
      });
      mockPrisma.subscription.findUnique.mockResolvedValue({
        status: "ACTIVE",
        trialEndsAt: null,
        currentPeriodEnd: null,
      });
      mockPrisma.membership.findFirst.mockResolvedValue(null);

      const req = createRequest("/app/locations");
      const res = await proxy(req);

      // Should pass through
      expect(res.status).not.toBe(307);
      expect(res.status).not.toBe(302);
    });

    it("should allow dual-role user (isOwner=true, isTenant=true) to access /app/locations", async () => {
      mockGetIronSession.mockResolvedValue({ userId: 3 });
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 3,
        displayName: "Dual",
        email: "dual@example.com",
      });
      mockPrisma.subscription.findUnique.mockResolvedValue({
        status: "TRIAL",
        trialEndsAt: future(),
        currentPeriodEnd: null,
      });
      mockPrisma.membership.findFirst.mockResolvedValue({
        role: "TENANT",
        roomId: 99,
      });

      const req = createRequest("/app/locations");
      const res = await proxy(req);

      // Should pass through
      expect(res.status).not.toBe(307);
      expect(res.status).not.toBe(302);
    });

    it("should redirect user with no roles from /app/locations", async () => {
      mockGetIronSession.mockResolvedValue({ userId: 4 });
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 4,
        displayName: "NoRole",
        email: "norole@example.com",
      });
      mockPrisma.subscription.findUnique.mockResolvedValue(null);
      mockPrisma.membership.findFirst.mockResolvedValue(null);

      const req = createRequest("/app/locations");
      const res = await proxy(req);

      expect(res.status).toBe(307);
      const location = res.headers.get("location");
      expect(location).toContain("/login");
    });
  });

  describe("Edge cases", () => {
    it("should allow /tenant/invite/abc123/claim with authentication", async () => {
      mockGetIronSession.mockResolvedValue({ userId: 5 });

      const req = createRequest("/tenant/invite/abc123/claim");
      const res = await proxy(req);

      // /claim endpoint requires auth per middleware logic
      expect(res.status).not.toBe(307);
    });

    it("should handle expired subscription correctly (isOwner=false)", async () => {
      const past = new Date(Date.now() - 24 * HOUR);
      mockGetIronSession.mockResolvedValue({ userId: 6 });
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 6,
        displayName: "Expired",
        email: "expired@example.com",
      });
      mockPrisma.subscription.findUnique.mockResolvedValue({
        status: "TRIAL",
        trialEndsAt: past,
        currentPeriodEnd: null,
      });
      mockPrisma.membership.findFirst.mockResolvedValue(null);

      const req = createRequest("/app/locations");
      const res = await proxy(req);

      expect(res.status).toBe(307);
      const location = res.headers.get("location");
      expect(location).toContain("/login");
    });

    it("should handle tenant membership without roomId correctly (isTenant=false)", async () => {
      mockGetIronSession.mockResolvedValue({ userId: 7 });
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 7,
        displayName: "Incomplete",
        email: "incomplete@example.com",
      });
      mockPrisma.subscription.findUnique.mockResolvedValue(null);
      mockPrisma.membership.findFirst.mockResolvedValue({
        role: "TENANT",
        roomId: null,
      });

      const req = createRequest("/tenant/dashboard");
      const res = await proxy(req);

      expect(res.status).not.toBe(307);
      expect(res.status).not.toBe(302);
    });
  });
});
