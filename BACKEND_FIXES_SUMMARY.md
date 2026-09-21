# Backend Fixes Summary

## Issues Fixed

### Issue 1: User Email Not Available After Login

**Root Cause:**
- OIDC callback only read email from ID token claims
- Many OIDC providers (including Daiyooo Account/Better Auth) return email via userinfo endpoint, not embedded in ID token
- Code never called userinfo endpoint → email stayed `null` in DB → nothing to display

**Fix:**
- Modified `app/auth/callback/route.ts` to call `client.fetchUserInfo()` after token exchange
- Prioritize userinfo response over ID token claims (fallback to ID token if userinfo fails)
- Email now provisioned correctly for both new and existing users

**Files Changed:**
- `app/auth/callback/route.ts` (added userinfo endpoint call)

### Issue 2: Apartment Address and Room Details Missing from Tenant API

**Root Cause:**
- `getTenantMembership()` in `lib/auth.ts` used `apartment: { select: { id: true, name: true } }`
- `address` field exists in schema but was omitted from query
- Room fields (roomNumber, roomType, baseRent, waterRate, electricRate) were already included correctly

**Fix:**
- Updated `getTenantMembership()` to include `address: true` in apartment select for both `room.apartment` and direct `apartment` relation
- All existing room details remain intact
- `roomForUi` transformation in tenant API routes automatically includes address via spread operator

**Files Changed:**
- `lib/auth.ts` (added address to apartment select in getTenantMembership)

## Verification

**Tests Added:**
- `tests/backend-fixes.test.ts` - Integration tests for both issues
- `tests/tenant-api.test.ts` - Unit tests for tenant API data structure

**Test Results:**
```
✓ tests/tenant-api.test.ts (2 tests)
✓ tests/auth-subscription.test.ts (18 tests)
✓ tests/backend-fixes.test.ts (4 tests)

Test Files  3 passed (3)
Tests  24 passed (24)
```

**TypeScript Lint:** ✓ No errors

## API Response Structure (After Fix)

### /api/tenant/bill & /api/tenant/bills
```json
{
  "tenant": {
    "id": 123,
    "name": "User Name",
    "email": "user@example.com"
  },
  "room": {
    "id": 20,
    "roomNumber": "202",
    "roomType": "Deluxe",
    "baseRent": 8000,
    "waterRate": 20,
    "electricRate": 8,
    "location": {
      "id": 10,
      "name": "Green Apartments",
      "address": "456 Green Street, Bangkok"
    },
    "options": [...]
  },
  "latestBill": {...}
}
```

### /api/me
```json
{
  "authenticated": true,
  "user": {
    "id": 123,
    "displayName": "User Name",
    "email": "user@example.com"
  }
}
```

## Schema Fields Now Available

**Room details (already working):**
- roomNumber
- roomType
- baseRent
- waterRate
- electricRate

**Apartment details (fixed):**
- id
- name
- address ← **NEW**

**User details (fixed):**
- email ← **NOW POPULATED**
- displayName
- emailVerified

## No Breaking Changes

- All existing API response structures remain compatible
- Only additions (no removals or renames)
- Frontend code using these fields will now receive data instead of null

## Implementation Details

### Email Fix (app/auth/callback/route.ts)

After successful authorization code exchange, the callback now:
1. Extracts claims from ID token (existing behavior)
2. Calls `client.fetchUserInfo()` with access token to get full profile
3. Prioritizes userinfo data over ID token claims (with fallback)
4. Passes merged data to `provisionUserFromClaims()`

This is best-effort: if userinfo fails, ID token claims are still used.

### Apartment Address Fix (lib/auth.ts)

Changed getTenantMembership query from:
```typescript
apartment: { select: { id: true, name: true } }
```

To:
```typescript
apartment: { select: { id: true, name: true, address: true } }
```

Applied to both:
- `room.apartment` relation
- Direct `apartment` relation

No schema changes required - field already existed.
