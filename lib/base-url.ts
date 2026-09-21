export function publicBaseUrl(): URL {
  const explicit = process.env.PRODUCT_BASE_URL;
  if (explicit) return new URL(explicit);
  const redirect = process.env.DAIYOOO_OIDC_REDIRECT_URI;
  if (redirect) return new URL(new URL(redirect).origin);
  // last-resort dev fallback
  return new URL("http://localhost:3004");
}
