import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getOidcConfig } from "@/lib/oidc";

describe("OIDC prompt parameter", () => {
  const originalEnv = {
    DAIYOOO_OIDC_PROMPT: process.env.DAIYOOO_OIDC_PROMPT,
    DAIYOOO_OIDC_ISSUER: process.env.DAIYOOO_OIDC_ISSUER,
    DAIYOOO_OIDC_DISCOVERY_URL: process.env.DAIYOOO_OIDC_DISCOVERY_URL,
    DAIYOOO_OIDC_CLIENT_ID: process.env.DAIYOOO_OIDC_CLIENT_ID,
    DAIYOOO_OIDC_REDIRECT_URI: process.env.DAIYOOO_OIDC_REDIRECT_URI,
  };

  beforeEach(() => {
    // Set required OIDC config for testing
    process.env.DAIYOOO_OIDC_ISSUER = "https://account.daiyooo.com/api/auth";
    process.env.DAIYOOO_OIDC_DISCOVERY_URL = "https://account.daiyooo.com/.well-known/openid-configuration";
    process.env.DAIYOOO_OIDC_CLIENT_ID = "test-client";
    process.env.DAIYOOO_OIDC_REDIRECT_URI = "http://localhost:3000/auth/callback";
  });

  afterEach(() => {
    // Restore all original env vars
    for (const [key, value] of Object.entries(originalEnv)) {
      if (value !== undefined) {
        process.env[key] = value;
      } else {
        delete process.env[key];
      }
    }
  });

  it("returns null when DAIYOOO_OIDC_PROMPT is not set", () => {
    delete process.env.DAIYOOO_OIDC_PROMPT;
    const config = getOidcConfig();
    expect(config.prompt).toBeNull();
  });

  it("returns null when DAIYOOO_OIDC_PROMPT is empty", () => {
    process.env.DAIYOOO_OIDC_PROMPT = "";
    const config = getOidcConfig();
    expect(config.prompt).toBeNull();
  });

  it("rejects select_account prompt because Better Auth does not support it", () => {
    process.env.DAIYOOO_OIDC_PROMPT = "select_account";
    expect(() => getOidcConfig()).toThrow(/DAIYOOO_OIDC_PROMPT/);
  });

  it("accepts login prompt", () => {
    process.env.DAIYOOO_OIDC_PROMPT = "login";
    const config = getOidcConfig();
    expect(config.prompt).toBe("login");
  });

  it("accepts supported multiple space-separated prompts", () => {
    process.env.DAIYOOO_OIDC_PROMPT = "login consent";
    const config = getOidcConfig();
    expect(config.prompt).toBe("login consent");
  });

  it("rejects invalid prompt values", () => {
    process.env.DAIYOOO_OIDC_PROMPT = "invalid_prompt";
    expect(() => getOidcConfig()).toThrow(/DAIYOOO_OIDC_PROMPT/);
  });

  it("rejects none with other prompts", () => {
    process.env.DAIYOOO_OIDC_PROMPT = "none login";
    expect(() => getOidcConfig()).toThrow(/DAIYOOO_OIDC_PROMPT/);
  });
});
