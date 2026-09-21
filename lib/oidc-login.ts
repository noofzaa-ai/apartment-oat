import * as client from "openid-client";
import { prisma } from "@/lib/prisma";
import { getOidcConfig, getOidcClientConfig } from "@/lib/oidc";
import {
  TXN_TTL_MS,
  hashState,
  safeReturnTo,
  newTxnId,
  pruneExpiredTransactions,
} from "@/lib/oidc-flow";

export async function beginOidcLogin(returnToParam: string | null | undefined) {
  const cfg = getOidcConfig();
  const returnTo = safeReturnTo(returnToParam);
  const configuration = await getOidcClientConfig();

  const state = client.randomState();
  const nonce = client.randomNonce();
  const codeVerifier = client.randomPKCECodeVerifier();
  const codeChallenge = await client.calculatePKCECodeChallenge(codeVerifier);
  const txnId = newTxnId();

  await pruneExpiredTransactions();
  await prisma.oidcTransaction.create({
    data: {
      id: txnId,
      stateHash: hashState(state),
      nonce,
      codeVerifier,
      redirectUri: cfg.redirectUri,
      returnTo,
      used: false,
      expiresAt: new Date(Date.now() + TXN_TTL_MS),
    },
  });

  const params: Parameters<typeof client.buildAuthorizationUrl>[1] = {
    redirect_uri: cfg.redirectUri,
    scope: cfg.scopes,
    state,
    nonce,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  };

  // Add prompt parameter if configured (e.g., "select_account" for account switching)
  if (cfg.prompt) {
    params.prompt = cfg.prompt;
  }

  const authUrl = client.buildAuthorizationUrl(configuration, params);

  return { authUrl, txnId };
}
