# Login Callback 400 Error - Root Cause & Fix

**Date**: 2026-09-21  
**Status**: ✅ FIXED

## Root Cause

**Two deployments were running simultaneously:**
1. `apartment-oat` (old, 12h old) - **Missing secretRef**
2. `apartment-oat-app` (new, created during recent deployment)

The old `apartment-oat` deployment:
- Only had `configMapRef` for apartment-oat-config
- **Missing `secretRef`** for apartment-oat-secrets
- SESSION_PASSWORD stuck at placeholder: `CHANGE_ME_RANDOM_STRING_MIN_32_CHARS`

The old ingress was routing traffic to the broken deployment.

## Why ConfigMap NODE_ENV Fix Didn't Work

The NODE_ENV=production change was correct, but traffic was still hitting the old deployment that didn't load the SECRET at all.

## The Actual Problem

```yaml
# OLD deployment (broken)
envFrom:
  - configMapRef:
      name: apartment-oat-config
  # MISSING secretRef! SESSION_PASSWORD = placeholder

# CORRECT deployment  
envFrom:
  - configMapRef:
      name: apartment-oat-config
  - secretRef:
      name: apartment-oat-secrets  # ✅ Loads real SESSION_PASSWORD
```

When SESSION_PASSWORD is wrong:
- `/auth/login` encrypts cookie with placeholder password
- Browser stores encrypted cookie
- Daiyooo redirects back to `/auth/callback`
- `/auth/callback` tries to decrypt cookie with placeholder password
- Cookie can't be found/validated → `hasTxnCookie: false`
- Transaction lookup fails → **400 Bad Request**

## Fix Applied

1. **Deleted old broken deployment:**
   ```bash
   kubectl delete deployment apartment-oat -n apartment-oat
   kubectl delete svc apartment-oat -n apartment-oat
   ```

2. **Deleted old ingress:**
   ```bash
   kubectl delete ingress apartment-oat -n apartment-oat
   ```

3. **Fixed correct deployment image tag:**
   ```bash
   kubectl set image deployment/apartment-oat-app \
     apartment-oat=192.168.1.74:30500/apartment-oat:a6f12cb-20260921-052007 \
     -n apartment-oat
   ```

4. **Verified correct deployment:**
   ```bash
   kubectl exec deployment/apartment-oat-app -n apartment-oat -- printenv SESSION_PASSWORD
   # Output: e3b21119c408123a890050a587b3f97b3058429cbe2e595dda5f148bb1991e73 ✅
   ```

## Current State

**Running:**
- Deployment: `apartment-oat-app` (1 replica)
- Pod: `apartment-oat-app-59fb77554d-tmxd6`
- Service: `apartment-oat-service` (port 3000)
- Ingress: `apartment-oat-ingress` → apartment-oat-service:3000

**Environment Variables Loaded:**
- ✅ NODE_ENV=production
- ✅ SESSION_PASSWORD=e3b21119c408123a890050a587b3f97b3058429cbe2e595dda5f148bb1991e73
- ✅ All DAIYOOO_OIDC_* configs
- ✅ All other configs from ConfigMap and Secret

## Files Changed

- ✅ deployment/04-deployment.yaml (already had correct envFrom)
- ✅ K8s cluster state cleaned up (removed duplicate/old resources)

## Verification Steps

Login should now work:
1. Visit https://apartments.daiyooo.com/app/locations
2. Redirected to `/auth/login`
3. Creates transaction with correct SESSION_PASSWORD
4. Redirects to Daiyooo Account
5. Daiyooo redirects back to `/auth/callback?code=...&state=...`
6. Callback decrypts cookie with SAME SESSION_PASSWORD
7. Transaction found → exchange code → create session → redirect to app

Expected logs:
```json
{"scope":"oidc","event":"login.start","hasExistingTxnCookie":false}
{"scope":"oidc","event":"login.transaction_created","txnIdPrefix":"..."}
{"scope":"oidc","event":"callback.received","hasTxnCookie":true}
{"scope":"oidc","event":"callback.txn_lookup","txnFound":true}
{"scope":"oidc","event":"callback.session_saved","userId":1}
```

## Lesson Learned

When deploying to K8s:
1. Always check for duplicate deployments/services
2. Verify pods load BOTH ConfigMap AND Secret
3. Check actual running pod env vars, not just YAML files
4. Clean up old resources during deployment updates
