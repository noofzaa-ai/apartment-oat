# Get Started Onboarding Page Implementation

**Date:** 2026-09-20  
**Feature:** New user onboarding flow with plan selection

## Summary

Created `/get-started` onboarding page for new users to select their first plan after login. Updated authentication middleware to redirect users without subscription to this page.

## Changes Made

### 1. Frontend: `/get-started` Page
**File:** `app/get-started/page.tsx`

**Design:** Neo-brutalist style (NOT claymorphism)
- Flat solid colors: green `#6BCF7F`, blue `#A8D8EA`, coral `#FFB3BA`, yellow `#FFD700`
- NO shadows, NO gradients
- Bold borders: `border-4 border-black`
- Rounded corners: `rounded-2xl`
- Extra bold typography: `font-extrabold`

**Features:**
- Display 4 plan cards (TRIAL, STARTER, STANDARD, PRO)
- TRIAL card highlighted as "แนะนำ" (recommended) with yellow ring
- CTA button: "เริ่มทดลองฟรี 30 วัน" for TRIAL plan
- Other plans: "ติดต่อเราเพื่อเปิดใช้งาน" button
- Feature list with base features + plan-specific features
- Toast notifications for success/error feedback

**Flow:**
1. User clicks "เริ่มทดลองฟรี 30 วัน" on TRIAL card
2. POST `/api/subscription` to start trial
3. Redirect to `/app/locations` on success
4. Other plans show contact message (no payment integration in MVP)

### 2. Backend: Authentication Flow Update
**File:** `lib/oidc-flow.ts`

**Function:** `resolvePostLoginPath()`

**Updated routing logic:**
- Active owner subscription → `/app/locations`
- **New user with no subscription → `/get-started`** (NEW)
- Tenant with room → `/tenant/dashboard`
- Everything else → `/tenant/dashboard`

**Changes:**
- Added parallel query for both subscription and tenant membership
- Check if user has NO subscription AND is NOT a tenant
- Redirect to `/get-started` for new users

### 3. Middleware: Authorization Guard
**File:** `proxy.ts`

**Changes:**
1. Added `hasSubscription` flag to `getRouteAuthorization()` return type
2. Added `isGetStartedRoute` check for `/get-started` path
3. Made `/get-started` a protected route (requires authentication)
4. Added redirect logic: owner routes without subscription → `/get-started`
5. Allow authenticated users to access `/get-started` page

**New logic:**
```typescript
// Redirect new users without subscription to onboarding (except if they're tenants)
if (isOwnerRoute && !auth.hasSubscription && !auth.isTenant) {
  audit("proxy.redirect", { reason: "no_subscription_onboarding", pathname });
  return NextResponse.redirect(new URL("/get-started", publicBaseUrl()));
}
```

## User Flow

### New User (First Login)
1. User logs in via Daiyooo OIDC → `/auth/callback`
2. Callback checks: no subscription exists
3. `resolvePostLoginPath()` returns `/get-started`
4. User redirected to onboarding page
5. User sees 4 plan cards with TRIAL highlighted
6. User clicks "เริ่มทดลองฟรี 30 วัน"
7. POST `/api/subscription` creates trial subscription
8. Redirect to `/app/locations`

### Existing User (With Subscription)
1. User logs in via Daiyooo OIDC
2. Callback checks: subscription exists
3. `resolvePostLoginPath()` returns `/app/locations`
4. User goes directly to dashboard (no onboarding)

### User Tries to Access /app/* Without Subscription
1. User navigates to `/app/locations` directly
2. Middleware checks: authenticated but no subscription
3. Proxy redirects to `/get-started`
4. User must select a plan before accessing owner routes

## API Used

**Existing APIs (no changes):**
- `GET /api/admin/plans` - Fetch available plans
- `POST /api/subscription` - Start trial subscription (existing functionality)

## Testing Checklist

- [x] Build passes without errors
- [x] `/get-started` route created successfully
- [ ] New user login → redirects to `/get-started`
- [ ] TRIAL button → starts trial → redirects to `/app/locations`
- [ ] User with subscription → skips `/get-started`
- [ ] Direct access to `/app/*` without subscription → redirects to `/get-started`
- [ ] Tenant users (no subscription) → NOT redirected to `/get-started`
- [ ] Neo-brutalist design: flat colors, no shadows, bold borders

## Design Tokens (Neo-Brutalist)

```tsx
// Colors
TRIAL:    bg-[#6BCF7F]  // Green
STARTER:  bg-[#A8D8EA]  // Blue
STANDARD: bg-[#FFB3BA]  // Coral
PRO:      bg-[#FFD700]  // Yellow
Text:     text-[#2C3E50] // Dark blue-gray

// Borders
border-4 border-black
border-2 border-black (smaller elements)

// Rounded corners
rounded-2xl (~16px)
rounded-xl (~12px)

// Typography
font-extrabold text-5xl (hero)
font-extrabold text-2xl (plan names)
font-bold (body text)

// NO shadows, NO gradients, NO soft effects
```

## Files Modified

1. `app/get-started/page.tsx` - NEW: Onboarding page
2. `lib/oidc-flow.ts` - MODIFIED: Post-login routing logic
3. `proxy.ts` - MODIFIED: Middleware authorization guards

## Notes

- Design follows neo-brutalist reference (NOT claymorphism)
- Paid plan activation requires manual contact (MVP limitation)
- TRIAL plan CTA is the only functional action
- Middleware prevents access to owner routes without subscription
- Tenants with room access are not affected by this flow
