// Daiyooo Account OIDC client (relying party).
//
// ระบบนี้เป็น public OIDC client ของ account.daiyooo.com (Better Auth).
// - Authorization Code + PKCE S256 เท่านั้น, ไม่มี client_secret (token_endpoint_auth_method=none).
// - ยึด discovery metadata; ตรวจ issuer byte-for-byte; ID token alg = EdDSA.
// ใช้ openid-client (maintained) — ไม่ implement JOSE เอง (ตาม integration spec).
//
// อ้างอิง: daiyooo_account/docs/product-login-integration-spec.md

import * as client from "openid-client";

export interface OidcConfig {
  issuer: string;
  discoveryUrl: string;
  clientId: string;
  redirectUri: string;
  scopes: string;
  prompt: string | null;
}

const ALLOWED_PROMPT_VALUES = new Set(["none", "login", "consent"]);

/**
 * Parse and validate DAIYOOO_OIDC_PROMPT env var.
 * Returns null if unset/empty, validated space-separated string otherwise.
 * Throws if values invalid or "none" combined with other values.
 */
function parsePrompt(): string | null {
  const raw = process.env.DAIYOOO_OIDC_PROMPT;
  if (!raw || raw.trim() === "") return null;

  const values = raw.trim().split(/\s+/).filter(Boolean);
  if (values.length === 0) return null;

  // "none" cannot be combined with other prompt values per OIDC spec
  if (values.includes("none") && values.length > 1) {
    throw new Error('DAIYOOO_OIDC_PROMPT: "none" cannot be combined with other prompt values');
  }

  for (const value of values) {
    if (!ALLOWED_PROMPT_VALUES.has(value)) {
      throw new Error(`DAIYOOO_OIDC_PROMPT: invalid value "${value}" (allowed: none, login, consent)`);
    }
  }

  return values.join(" ");
}

/** อ่าน + validate env. fail-fast ถ้าไม่ครบ (โดยเฉพาะ production). */
export function getOidcConfig(): OidcConfig {
  const issuer = process.env.DAIYOOO_OIDC_ISSUER;
  const discoveryUrl = process.env.DAIYOOO_OIDC_DISCOVERY_URL;
  const clientId = process.env.DAIYOOO_OIDC_CLIENT_ID;
  const redirectUri = process.env.DAIYOOO_OIDC_REDIRECT_URI;
  const scopes = process.env.DAIYOOO_OIDC_SCOPES ?? "openid profile email";
  const prompt = parsePrompt();

  const missing: string[] = [];
  if (!issuer) missing.push("DAIYOOO_OIDC_ISSUER");
  if (!discoveryUrl) missing.push("DAIYOOO_OIDC_DISCOVERY_URL");
  if (!clientId) missing.push("DAIYOOO_OIDC_CLIENT_ID");
  if (!redirectUri) missing.push("DAIYOOO_OIDC_REDIRECT_URI");
  if (missing.length > 0) {
    throw new Error(`OIDC misconfigured: missing ${missing.join(", ")}`);
  }

  return {
    issuer: issuer!,
    discoveryUrl: discoveryUrl!,
    clientId: clientId!,
    redirectUri: redirectUri!,
    scopes,
    prompt,
  };
}

// discovery config ราคาแพง (network) — cache ไว้ พร้อม TTL upper-bound.
let cached: { config: client.Configuration; fetchedAt: number } | null = null;
const DISCOVERY_TTL_MS = 60 * 60 * 1000; // 1 ชม.

/**
 * โหลด (และ cache) OIDC Configuration จาก discovery.
 * ตรวจ issuer ให้ตรง byte-for-byte กับ config ที่ตั้งไว้ — fail closed ถ้าไม่ตรง.
 */
export async function getOidcClientConfig(): Promise<client.Configuration> {
  const now = Date.now();
  if (cached && now - cached.fetchedAt < DISCOVERY_TTL_MS) {
    return cached.config;
  }

  const cfg = getOidcConfig();

  // public client (PKCE, ไม่มี secret) → client authentication = None
  const configuration = await client.discovery(
    new URL(cfg.discoveryUrl),
    cfg.clientId,
    undefined,
    client.None(),
  );

  // ตรวจ issuer byte-for-byte (กัน issuer mix-up)
  const discoveredIssuer = configuration.serverMetadata().issuer;
  if (discoveredIssuer !== cfg.issuer) {
    throw new Error(
      `OIDC issuer mismatch: discovery=${discoveredIssuer} expected=${cfg.issuer}`,
    );
  }

  cached = { config: configuration, fetchedAt: now };
  return configuration;
}

/** reset cache (สำหรับ test/rotation). */
export function _resetOidcCache() {
  cached = null;
}
