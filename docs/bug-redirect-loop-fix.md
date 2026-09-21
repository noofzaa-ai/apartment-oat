# Bug Fix: Redirect Loop at /app

**Status:** 🔴 Critical  
**Reported:** 2026-09-21  
**Assigned to:** dev-backend, dev-frontend

---

## Problem

User logs in with `wanwit.phbn@gmail.com` → infinite redirect loop:
- Auth callback redirects to `/app/locations`
- `/app/locations` returns 404 (Not Found)
- Browser keeps retrying
- **User cannot access the app**

**Error in browser:**
```
GET https://apartments.daiyooo.com/app 404 (Not Found)
```

---

## Root Cause Analysis

The issue is **NOT** about route groups in URLs. Route groups `(dashboard)` are invisible in URLs.

**Actual problem:**
- Auth callback uses: `redirect("/app/locations")` 
- But **there is no page at `/app/locations`**
- File structure shows: `app/app/(dashboard)/locations/page.tsx`
- **Correct URL should be:** `/app/locations` (route groups are stripped from URL)

**Missing file:** `/app/app/page.tsx` (fallback for `/app` route)

---

## Solution Options

### Option 1: Create /app redirect page (Recommended)
**Create:** `app/app/page.tsx`

```typescript
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export default async function AppRootPage() {
  const session = await getSession();
  
  if (!session.userId) {
    redirect("/login");
  }

  // Check user role and redirect accordingly
  const subscription = await prisma.subscription.findUnique({
    where: { userId: session.userId },
    select: { status: true, trialEndsAt: true, currentPeriodEnd: true }
  });

  const isOwner = subscription && 
    (subscription.status === "TRIAL" || subscription.status === "ACTIVE");

  if (isOwner) {
    redirect("/app/locations");
  } else {
    redirect("/tenant/dashboard");
  }
}
```

**Why this works:**
- `/app` now has a page that handles routing logic
- User lands on `/app` → server-side redirect to correct destination
- No 404, no loop

---

### Option 2: Fix route structure (More work)

**Problem:** `app/app/(dashboard)/locations/page.tsx` creates URL `/app/locations`  
**But:** There's no index page for `/app`

**Solution:**
1. Move everything from `app/app/(dashboard)/*` to `app/app/*` (remove route group)
2. OR create `app/app/page.tsx` as Option 1

---

## Implementation Plan

### Task 1: dev-backend
- [ ] Create `app/app/page.tsx` with redirect logic (see Option 1 code)
- [ ] Import necessary functions: getSession, prisma, subscriptionIsActive
- [ ] Test: visit `/app` → should redirect to `/app/locations` or `/tenant/dashboard`

### Task 2: dev-frontend  
- [ ] Verify `/app/locations` page still works after adding `/app/page.tsx`
- [ ] Test navigation: sidebar links, breadcrumbs still work

### Task 3: qa
- [ ] Test login flow: login → should reach `/app/locations` (not 404)
- [ ] Test `/app` direct access → redirects correctly
- [ ] Test tenant login → redirects to `/tenant/dashboard`
- [ ] Test owner login → redirects to `/app/locations`

### Task 4: devops
- [ ] Deploy fix
- [ ] Verify: `curl https://apartments.daiyooo.com/app` returns 30x redirect (not 404)

---

## Testing Checklist

- [ ] Owner with active subscription → `/app/locations`
- [ ] Tenant with room → `/tenant/dashboard`
- [ ] New user (no subscription) → `/get-started`
- [ ] `/app` direct access → no 404, no loop
- [ ] Login from landing page → no loop

---

## Notes

**DO NOT:**
- ❌ Change `/app/locations` to `/app/(dashboard)/locations` in redirects (route groups don't appear in URLs)
- ❌ Add `(dashboard)` to any redirect or Link href
- ❌ Modify existing page file structure without testing

**DO:**
- ✅ Create `/app/page.tsx` as a router/redirect handler
- ✅ Keep URLs as `/app/locations`, `/app/rooms`, etc. (route groups are internal only)
- ✅ Test login flow after changes

---

## Priority

🔴 **CRITICAL** - User cannot login. Fix and deploy immediately.
