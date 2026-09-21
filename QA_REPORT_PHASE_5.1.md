# QA Report: Phase 5.1 - Pricing Plans End-to-End Verification

**Date:** 2026-09-20T05:30:00Z  
**Role:** QA  
**Status:** ❌ **BLOCKED - Cannot proceed with verification**

---

## Executive Summary

**Phase 5.1 QA cannot be completed.** The pricing implementation has **critical build failures** that prevent any end-to-end testing. Additionally, the database has no Plan seed data, making it impossible to test subscription flows.

---

## Critical Blockers

### 1. Build Failure ❌

**Issue:** Next.js build fails with module resolution errors.

```
Error: Turbopack build failed with 7 errors:
Module not found: Can't resolve 'fs'

Import trace:
  ./lib/pricing.ts [Client Component Browser]
  ./app/app/(dashboard)/subscription/plans/page.tsx [Client Component Browser]
```

**Root Cause:** Client component (`plans/page.tsx`) imports `calculatePrice` from `lib/pricing.ts`, which imports `prisma` (server-only). Client components cannot import server-side modules.

**Impact:** 
- Cannot run the application
- Cannot verify any UI flows
- Blocks all QA scenarios

---

### 2. Lint Failures ❌

**Issue:** TypeScript compilation errors in feature gate and quota modules.

```
lib/feature-gate.ts(4,22): error TS2305: Module '"@/lib/pricing"' has no exported member 'getPlanWithFeature'.
lib/feature-gate.ts(35,16): error TS2353: Object literal may only specify known properties, and 'plan' does not exist in type 'SubscriptionInclude<DefaultArgs>'.
lib/feature-gate.ts(43,32): error TS2339: Property 'plan' does not exist on type '{ status: string; id: number; ... }'.
lib/quota.ts(3,10): error TS2305: Module '"@/lib/pricing"' has no exported member 'getRoomCount'.
lib/quota.ts(26,16): error TS2353: Object literal may only specify known properties, and 'plan' does not exist in type 'SubscriptionInclude<DefaultArgs>'.
lib/quota.ts(33,29): error TS2339: Property 'plan' does not exist on type '{ status: string; id: number; ... }'.
```

**Root Cause:** 
- Prisma schema not regenerated after migration
- Type definitions out of sync with implementation

**Impact:**
- Code does not pass type checking
- Risk of runtime errors
- Blocks production deployment

---

### 3. Missing Plan Seed Data ❌

**Issue:** Plan table is empty despite migration creating the table structure.

```bash
$ sqlite3 prisma/dev.db "SELECT code, name, pricePerRoom, maxRooms FROM Plan;"
No Plan data
```

**Expected:** 4 plans seeded (TRIAL, STARTER, STANDARD, PRO) per migration file.

**Root Cause:** Migration SQL includes INSERT statements, but they were not executed or were rolled back.

**Impact:**
- Cannot test upgrade flows (no plans to upgrade to)
- Cannot test pricing calculations (no plan data)
- Cannot test feature gates (no plan features)
- Blocks all functional verification

---

## Implementation Status Review

### ✅ Completed Components

| Component | Status | Notes |
|-----------|--------|-------|
| Schema migration | ✅ | Plan table, Subscription.planCode FK added |
| lib/pricing.ts | ✅ | calculatePrice, getTierForRoomCount, hasFeature, getRoomCount |
| lib/feature-gate.ts | ⚠️ | Implemented but has type errors |
| lib/quota.ts | ⚠️ | Implemented but has type errors |
| API: /api/subscription/upgrade | ✅ | POST endpoint implemented |
| API: /api/subscription/cancel | ✅ | POST endpoint implemented |
| API: /api/subscription/calculate-price | ✅ | GET endpoint implemented |
| UI: /app/subscription/plans | ⚠️ | Implemented but causes build failure |
| UI: /app/subscription | ✅ | Management page exists |
| Room quota: bulk create | ✅ | checkRoomQuota applied |

### ❌ Missing Components

| Component | Expected | Found |
|-----------|----------|-------|
| API: /api/admin/plans | Required for UI | ❌ Missing |
| Room quota: single room create | Required | ❌ Not enforced |
| Feature gate: room-presets routes | Required | ❌ Not applied |
| Tests: pricing logic | Required | ❌ No tests |
| Tests: quota enforcement | Required | ❌ No tests |
| Tests: feature gates | Required | ❌ No tests |
| Plan seed data | 4 plans | ❌ Empty table |

---

## QA Scenarios - Verification Status

### ❌ Scenario 1: Upgrade Flow (Trial → Starter → Standard → Pro)
**Status:** Cannot verify - no Plan data, build fails  
**Requirement:** User can upgrade through all tiers  
**Result:** BLOCKED

### ❌ Scenario 2: Feature Gates
**Status:** Cannot verify - build fails, feature gates not applied  
**Requirement:** 
- Starter: no room preset access
- Standard: has room preset access

**Expected Behavior:**
- Starter user accessing `/api/admin/room-presets` → 403 `feature_not_available`
- Standard user accessing `/api/admin/room-presets` → 200 OK

**Result:** BLOCKED - requireFeature not applied to room-presets routes

### ❌ Scenario 3: Quota Enforcement (Starter 26th room blocked)
**Status:** Cannot verify - no Plan data, single room creation not gated  
**Requirement:** Starter plan (25 room limit) blocks 26th room  
**Expected:** POST /api/admin/rooms with 26 existing rooms → 403 `room_quota_exceeded`  
**Result:** BLOCKED

### ❌ Scenario 4: Price Calculation (30 rooms Standard)
**Status:** Cannot verify - no Plan data  
**Requirement:**
- 30 rooms, Standard, Monthly = 400 บาท
- 30 rooms, Standard, Yearly = 4,000 บาท

**Expected Calculation:**
- tierIndex = floor((30-1)/25) = 1
- tierRoomCount = (1+1) * 25 = 50
- monthlyPrice = 50 * 8 = 400
- yearlyPrice = 400 * 10 = 4,000

**Result:** BLOCKED - cannot call API without Plan data

### ❌ Scenario 5: Trial 11th Room Blocked
**Status:** Cannot verify - no Plan data  
**Requirement:** Trial plan (10 room limit) blocks 11th room  
**Expected:** POST /api/admin/rooms with 10 existing rooms → 403  
**Result:** BLOCKED

### ❌ Scenario 6: Downgrade Rejection
**Status:** Cannot verify - no Plan data  
**Requirement:** Standard user with 60 rooms cannot downgrade to Starter (50 room limit)  
**Expected:** POST /api/subscription/upgrade with planCode=STARTER → 403 `room_count_exceeds_plan_limit`  
**Result:** BLOCKED

### ❌ Scenario 7: Cancel - Still Usable Until Period End
**Status:** Cannot verify - build fails, cannot test UI/API flow  
**Requirement:** Canceled subscription status=CANCELED but active until currentPeriodEnd  
**Expected:** hasActiveSubscription() returns true for CANCELED if currentPeriodEnd > now  
**Result:** BLOCKED

---

## Test Execution Results

### Unit Tests
```bash
$ npm run test
✓ 12 test files passed (114 tests)
```
**Note:** No pricing-specific tests exist. All passing tests are from previous features (auth, OIDC, room-preset).

### Lint
```bash
$ npm run lint
6 TypeScript errors
```
**Fail:** Cannot proceed to production with type errors.

### Build
```bash
$ npm run build
Build failed: Module not found errors
```
**Fail:** Application cannot be deployed.

---

## Required Fixes (Priority Order)

### P0 - Critical (Must fix to unblock QA)

1. **Fix build failure**
   - Move `calculatePrice` call to server action or API route
   - Remove direct prisma imports from client components
   - Use `fetch('/api/subscription/calculate-price')` in client

2. **Regenerate Prisma Client**
   ```bash
   npx prisma generate
   ```
   - Fixes type errors for `subscription.plan` relation

3. **Seed Plan data**
   ```bash
   npx prisma db seed
   # OR manually INSERT plans into database
   ```
   - Add 4 plans: TRIAL, STARTER, STANDARD, PRO with correct features

### P1 - High (Required for spec compliance)

4. **Apply room quota to single room creation**
   - Add `checkRoomQuota(userId, 1)` to `POST /api/admin/rooms`

5. **Apply feature gate to room-presets**
   - Add `requireFeature('room_preset')` to all `/api/admin/room-presets/*` routes

6. **Create `/api/admin/plans` endpoint**
   - UI needs this to load plan list

7. **Add pricing tests**
   - `tests/pricing.test.ts`: calculatePrice, getTierForRoomCount, hasFeature
   - `tests/quota.test.ts`: quota enforcement scenarios
   - `tests/feature-gate.test.ts`: feature availability checks

---

## Readiness Assessment

| Criteria | Status | Notes |
|----------|--------|-------|
| Lint passes | ❌ | 6 TypeScript errors |
| Build passes | ❌ | Module resolution failure |
| Tests pass | ⚠️ | Pass but no pricing tests |
| Database seeded | ❌ | Plan table empty |
| API functional | ⚠️ | Implemented but untested |
| UI functional | ❌ | Build fails |
| Feature gates applied | ❌ | Only bulk route, missing presets |
| Quota enforcement complete | ❌ | Only bulk route, missing single room |

**Overall Readiness:** 🔴 **NOT READY** - 0% scenarios verified

---

## Recommendation

**Do not proceed to Phase 5.2 (Deploy).** Critical build and data issues must be resolved before any deployment.

### Immediate Actions Required:

1. **Backend team:** Fix client component / server module import issue
2. **DBA team:** Verify Plan seed data execution
3. **Backend team:** Apply missing quota/feature gates
4. **Backend team:** Create `/api/admin/plans` endpoint
5. **Backend team:** Add test coverage

### Re-test Criteria:

Once fixes are applied, QA will re-verify:
- ✅ `npm run lint` passes
- ✅ `npm run build` succeeds
- ✅ `npm run test` passes with pricing test coverage
- ✅ Plan table contains 4 seeded plans
- ✅ All 7 QA scenarios executable

**Estimated fix time:** 2-3 hours (if all roles coordinate)

---

## Appendix: Environment

- Node.js: detected via package.json
- Database: SQLite (prisma/dev.db)
- Framework: Next.js 16.2.11
- Test runner: Vitest 3.2.7
- Migration status: Up to date (3 migrations applied)
- Prisma schema: Includes Plan and updated Subscription tables
