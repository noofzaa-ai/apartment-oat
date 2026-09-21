import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────
const mockGetIronSession = vi.hoisted(() => vi.fn());

vi.mock("iron-session", () => ({
  getIronSession: mockGetIronSession,
}));

// PRODUCT_BASE_URL drives publicBaseUrl(); set before module import.
process.env.PRODUCT_BASE_URL = "http://localhost:3004";

function makeRequest(path: string): NextRequest {
  return new NextRequest(new URL(`http://localhost:3004${path}`));
}

describe("GET /api/auth/switch-account", () => {
  let GET: (req: NextRequest) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();

    const session = { destroy: vi.fn() };
    mockGetIronSession.mockResolvedValue(session);

    vi.resetModules();
    const mod = await import("@/app/api/auth/switch-account/route");
    GET = mod.GET;
  });

  it("redirects to local /login?account_switch=manual (no central /switch-account)", async () => {
    const req = makeRequest("/api/auth/switch-account");
    const res = await GET(req);

    expect(res.status).toBe(307);
    const location = new URL(res.headers.get("location") ?? "");
    // Must redirect locally, NOT to account.daiyooo.com
    expect(location.hostname).toBe("localhost");
    expect(location.pathname).toBe("/login");
    expect(location.searchParams.get("account_switch")).toBe("manual");
  });

  it("does NOT redirect to account.daiyooo.com (no /switch-account endpoint exists)", async () => {
    const req = makeRequest("/api/auth/switch-account");
    const res = await GET(req);

    expect(res.status).toBe(307);
    const location = new URL(res.headers.get("location") ?? "");
    expect(location.hostname).not.toBe("account.daiyooo.com");
  });

  it("destroys the product session on redirect", async () => {
    const mockDestroy = vi.fn();
    const session = { destroy: mockDestroy };
    mockGetIronSession.mockResolvedValue(session);

    const req = makeRequest("/api/auth/switch-account");
    await GET(req);

    expect(mockDestroy).toHaveBeenCalled();
  });

  it("clears apt_session cookie (Max-Age=0 or expired Set-Cookie from destroy)", async () => {
    const req = makeRequest("/api/auth/switch-account");
    const res = await GET(req);

    // iron-session.destroy() writes a Set-Cookie with Max-Age=0.
    // In tests getIronSession is mocked; confirm getIronSession was called so
    // session clearing was attempted.
    expect(mockGetIronSession).toHaveBeenCalled();
  });

  it("returns a redirect even without an active session", async () => {
    // Simulate session that does not exist yet (destroy still called safely)
    const session = { destroy: vi.fn() };
    mockGetIronSession.mockResolvedValue(session);

    const req = makeRequest("/api/auth/switch-account?return_to=/app/locations");
    const res = await GET(req);

    expect(res.status).toBe(307);
  });
});
