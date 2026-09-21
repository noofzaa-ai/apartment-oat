import { describe, it, expect, beforeEach, vi } from "vitest";

// ── Mocks ──────────────────────────────────────────────────────────────
const mockPrisma = vi.hoisted(() => ({
  subscription: { findUnique: vi.fn() },
  membership: { findFirst: vi.fn() },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

import { resolvePostLoginPath } from "@/lib/oidc-flow";

// ── Helpers ────────────────────────────────────────────────────────────
const HOUR = 60 * 60 * 1000;
const future = () => new Date(Date.now() + 24 * HOUR);
const past = () => new Date(Date.now() - 24 * HOUR);

describe("resolvePostLoginPath()", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Core routing rule: owner active → /app/locations ─────────────────

  it("owner active (TRIAL future) → /app/locations", async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue({
      status: "TRIAL",
      trialEndsAt: future(),
      currentPeriodEnd: null,
    });

    const path = await resolvePostLoginPath(1, "/");
    expect(path).toBe("/app/locations");
  });

  it("owner active (ACTIVE unlimited) → /app/locations", async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue({
      status: "ACTIVE",
      trialEndsAt: null,
      currentPeriodEnd: null,
    });

    const path = await resolvePostLoginPath(1, "/");
    expect(path).toBe("/app/locations");
  });

  it("owner active (ACTIVE with future period end) → /app/locations", async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue({
      status: "ACTIVE",
      trialEndsAt: null,
      currentPeriodEnd: future(),
    });

    const path = await resolvePostLoginPath(1, "/");
    expect(path).toBe("/app/locations");
  });

  // ── Core routing rule: tenant-only → /tenant/dashboard ───────────────

  it("tenant only (has membership with roomId, no subscription) → /tenant/dashboard", async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue(null);

    const path = await resolvePostLoginPath(1, "/");
    expect(path).toBe("/tenant/dashboard");
  });

  // ── Core routing rule: owner+tenant → /app/locations (owner wins) ────

  it("owner+tenant (active subscription AND tenant membership) → /app/locations", async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue({
      status: "TRIAL",
      trialEndsAt: future(),
      currentPeriodEnd: null,
    });

    const path = await resolvePostLoginPath(1, "/");
    expect(path).toBe("/app/locations");
  });

  // ── Core routing rule: new user / no subscription → /tenant/dashboard ─

  it("new user (no subscription, no membership) → /tenant/dashboard", async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue(null);

    const path = await resolvePostLoginPath(1, "/");
    expect(path).toBe("/tenant/dashboard");
  });

  it("tenant without roomId (membership exists but roomId null) → /tenant/dashboard", async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue(null);

    const path = await resolvePostLoginPath(1, "/");
    expect(path).toBe("/tenant/dashboard");
  });

  // ── Core routing rule: expired subscription → /tenant/dashboard ──────

  it("expired TRIAL subscription → /tenant/dashboard", async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue({
      status: "TRIAL",
      trialEndsAt: past(),
      currentPeriodEnd: null,
    });

    const path = await resolvePostLoginPath(1, "/");
    expect(path).toBe("/tenant/dashboard");
  });

  it("expired ACTIVE subscription (past period end) → /tenant/dashboard", async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue({
      status: "ACTIVE",
      trialEndsAt: null,
      currentPeriodEnd: past(),
    });

    const path = await resolvePostLoginPath(1, "/");
    expect(path).toBe("/tenant/dashboard");
  });

  it("no subscription record → /tenant/dashboard", async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue(null);

    const path = await resolvePostLoginPath(1, "/");
    expect(path).toBe("/tenant/dashboard");
  });

  // ── return_to: safe paths preserved for owners ────────────────────────

  it("owner active + return_to /app/rooms → /app/rooms (safe, owner)", async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue({
      status: "ACTIVE",
      trialEndsAt: null,
      currentPeriodEnd: null,
    });

    const path = await resolvePostLoginPath(1, "/app/rooms");
    expect(path).toBe("/app/rooms");
  });

  it("owner active + return_to /app/tenants → /app/tenants (safe, owner)", async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue({
      status: "ACTIVE",
      trialEndsAt: null,
      currentPeriodEnd: null,
    });

    const path = await resolvePostLoginPath(1, "/app/tenants");
    expect(path).toBe("/app/tenants");
  });

  // ── return_to: /app/* paths blocked for non-owners ───────────────────

  it("non-owner + return_to /app/locations → /tenant/dashboard (blocked, no subscription)", async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue(null);

    const path = await resolvePostLoginPath(1, "/app/locations");
    expect(path).toBe("/tenant/dashboard");
  });

  it("non-owner + return_to /app/rooms → /tenant/dashboard (blocked, expired sub)", async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue({
      status: "TRIAL",
      trialEndsAt: past(),
      currentPeriodEnd: null,
    });

    const path = await resolvePostLoginPath(1, "/app/rooms");
    expect(path).toBe("/tenant/dashboard");
  });

  // ── return_to: tenant paths preserved for anyone ──────────────────────

  it("tenant only + return_to /tenant/history → /tenant/history (safe for tenants)", async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue(null);

    const path = await resolvePostLoginPath(1, "/tenant/history");
    expect(path).toBe("/tenant/history");
  });

  it("owner active + return_to /tenant/dashboard → /tenant/dashboard (preserved as-is)", async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue({
      status: "ACTIVE",
      trialEndsAt: null,
      currentPeriodEnd: null,
    });

    const path = await resolvePostLoginPath(1, "/tenant/dashboard");
    expect(path).toBe("/tenant/dashboard");
  });

  // ── return_to: open-redirect protection ──────────────────────────────

  it("external return_to (https://evil.com) → falls back to role default", async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue({
      status: "ACTIVE",
      trialEndsAt: null,
      currentPeriodEnd: null,
    });

    const path = await resolvePostLoginPath(1, "https://evil.com/steal");
    expect(path).toBe("/app/locations");
  });

  it("protocol-relative return_to (//evil.com) → falls back to role default", async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue(null);

    const path = await resolvePostLoginPath(1, "//evil.com");
    expect(path).toBe("/tenant/dashboard");
  });

  it("null return_to with no subscription → /tenant/dashboard", async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue(null);

    const path = await resolvePostLoginPath(1, null);
    expect(path).toBe("/tenant/dashboard");
  });

  it("undefined return_to with active subscription → /app/locations", async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue({
      status: "ACTIVE",
      trialEndsAt: null,
      currentPeriodEnd: null,
    });

    const path = await resolvePostLoginPath(1, undefined);
    expect(path).toBe("/app/locations");
  });
});
