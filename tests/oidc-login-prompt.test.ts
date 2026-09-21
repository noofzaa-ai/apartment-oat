import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import * as client from "openid-client";

// Mock openid-client
const mockBuildAuthorizationUrl = vi.fn();
const mockDiscovery = vi.fn();

vi.mock("openid-client", () => ({
  randomState: () => "test-state",
  randomNonce: () => "test-nonce",
  randomPKCECodeVerifier: () => "test-verifier",
  calculatePKCECodeChallenge: async () => "test-challenge",
  buildAuthorizationUrl: (...args: any[]) => mockBuildAuthorizationUrl(...args),
  discovery: (...args: any[]) => mockDiscovery(...args),
  None: () => "None",
}));

// Mock prisma
const mockPrisma = {
  oidcTransaction: {
    create: vi.fn(),
    deleteMany: vi.fn(),
  },
};

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

describe("beginOidcLogin prompt parameter", () => {
  const originalEnv = {
    DAIYOOO_OIDC_PROMPT: process.env.DAIYOOO_OIDC_PROMPT,
    DAIYOOO_OIDC_ISSUER: process.env.DAIYOOO_OIDC_ISSUER,
    DAIYOOO_OIDC_DISCOVERY_URL: process.env.DAIYOOO_OIDC_DISCOVERY_URL,
    DAIYOOO_OIDC_CLIENT_ID: process.env.DAIYOOO_OIDC_CLIENT_ID,
    DAIYOOO_OIDC_REDIRECT_URI: process.env.DAIYOOO_OIDC_REDIRECT_URI,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Set required OIDC config
    process.env.DAIYOOO_OIDC_ISSUER = "https://account.daiyooo.com/api/auth";
    process.env.DAIYOOO_OIDC_DISCOVERY_URL = "https://account.daiyooo.com/.well-known/openid-configuration";
    process.env.DAIYOOO_OIDC_CLIENT_ID = "test-client";
    process.env.DAIYOOO_OIDC_REDIRECT_URI = "http://localhost:3000/auth/callback";

    // Mock discovery response
    mockDiscovery.mockResolvedValue({
      serverMetadata: () => ({
        issuer: "https://account.daiyooo.com/api/auth",
        authorization_endpoint: "https://account.daiyooo.com/api/auth/authorize",
      }),
    });

    // Mock buildAuthorizationUrl to return a URL
    mockBuildAuthorizationUrl.mockReturnValue(new URL("https://account.daiyooo.com/api/auth/authorize?test=1"));

    // Mock prisma transaction create
    mockPrisma.oidcTransaction.create.mockResolvedValue({});
    mockPrisma.oidcTransaction.deleteMany.mockResolvedValue({});
  });

  afterEach(() => {
    // Restore env
    for (const [key, value] of Object.entries(originalEnv)) {
      if (value !== undefined) {
        process.env[key] = value;
      } else {
        delete process.env[key];
      }
    }
  });

  it("does not add prompt parameter when DAIYOOO_OIDC_PROMPT is not set", async () => {
    delete process.env.DAIYOOO_OIDC_PROMPT;
    
    const { beginOidcLogin } = await import("@/lib/oidc-login");
    await beginOidcLogin(null);

    expect(mockBuildAuthorizationUrl).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        redirect_uri: "http://localhost:3000/auth/callback",
        scope: "openid profile email",
        state: "test-state",
        nonce: "test-nonce",
        code_challenge: "test-challenge",
        code_challenge_method: "S256",
      })
    );

    // Verify prompt is NOT in the params
    const callArgs = mockBuildAuthorizationUrl.mock.calls[0][1];
    expect(callArgs).not.toHaveProperty("prompt");
  });

  it("rejects select_account and does not build an authorization URL", async () => {
    process.env.DAIYOOO_OIDC_PROMPT = "select_account";
    
    // Need to clear module cache to pick up new env var
    vi.resetModules();
    const { beginOidcLogin } = await import("@/lib/oidc-login");

    await expect(beginOidcLogin(null)).rejects.toThrow(/DAIYOOO_OIDC_PROMPT/);
    expect(mockBuildAuthorizationUrl).not.toHaveBeenCalled();
  });

  it("adds supported multiple prompt values when space-separated", async () => {
    process.env.DAIYOOO_OIDC_PROMPT = "login consent";
    
    vi.resetModules();
    const { beginOidcLogin } = await import("@/lib/oidc-login");
    await beginOidcLogin(null);

    const callArgs = mockBuildAuthorizationUrl.mock.calls[0][1];
    expect(callArgs.prompt).toBe("login consent");
  });
});
