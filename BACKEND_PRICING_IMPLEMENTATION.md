# Backend Pricing Implementation Summary

**Task:** Phase 1.2 + 1.3 + 2.1 + 2.2 + 2.3 + 4.1 + 4.3  
**Date:** 2026-09-20  
**Agent:** Backend

---

## Files Created

### Core Libraries
1. **lib/pricing.ts** - Pricing calculation and feature checks
   - `calculatePrice(planCode, roomCount, billingCycle)` - Tiered pricing with yearly discount
   - `getTierForRoomCount(roomCount, tierSize)` - Calculate tier index
   - `hasFeature(planFeatures, feature)` - Check if plan has feature
   - `getRoomCount(userId)` - Count rooms across all user apartments
   - `getPlanWithFeature(feature)` - Find lowest plan with feature

2. **lib/feature-gate.ts** - Feature gating middleware
   - `requireFeature(feature)` - Middleware to enforce feature access
   - `featureNotAvailable(feature, suggestedPlan)` - Error response
   - `isFeatureGateResponse(value)` - Type guard

3. **lib/quota.ts** - Room quota enforcement
   - `checkRoomQuota(userId, additionalRooms)` - Validate quota
   - `QuotaExceededError` - Custom error class
   - `quotaExceededResponse(error)` - HTTP error response

### API Endpoints
4. **app/api/subscription/route.ts** (modified)
   - `GET /api/subscription` - Current subscription with plan details, room count, features
   - `POST /api/subscription` - Start trial (existing)

5. **app/api/subscription/calculate-price/route.ts**
   - `GET /api/subscription/calculate-price?planCode=X&roomCount=Y&cycle=Z`
   - Returns price calculation for plan/room combination

6. **app/api/subscription/upgrade/route.ts**
   - `POST /api/subscription/upgrade` - Upgrade/change plan
   - Validates room count doesn't exceed new plan limit
   - Sets currentPeriodStart/End based on billing cycle

7. **app/api/subscription/cancel/route.ts**
   - `POST /api/subscription/cancel` - Cancel subscription
   - Status = CANCELED but access until currentPeriodEnd

### Feature Gates Applied
8. **app/api/admin/room-presets/route.ts** (modified)
   - Added `requireFeature('room_preset')` to GET and POST

9. **app/api/admin/room-presets/[id]/route.ts** (modified)
   - Added `requireFeature('room_preset')` to PATCH and DELETE

10. **app/api/admin/rooms/bulk/route.ts** (modified)
    - Added `requireFeature('bulk_create')` check
    - Added `checkRoomQuota(userId, roomList.length)` before bulk creation

11. **app/api/rooms/route.ts** (modified)
    - Added `checkRoomQuota(userId, 1)` to POST single room creation

### Tests
12. **tests/pricing.test.ts**
    - 20 tests covering tier calculation, pricing logic, feature checks, room counting
    - Tests for TRIAL/STARTER/STANDARD/PRO pricing
    - Yearly discount verification (10 months)

13. **tests/feature-gate.test.ts**
    - 8 tests covering room quota enforcement and feature access
    - TRIAL 10-room limit enforcement
    - STARTER unlimited rooms verification
    - Bulk creation quota checks

14. **tests/subscription-api.test.ts**
    - 7 tests covering subscription API endpoints
    - GET subscription details
    - Upgrade/downgrade logic
    - Yearly billing cycle
    - Cancel subscription

---

## Implementation Details

### Pricing Logic
- **Tiered pricing:** Rounds up to next tier boundary (25 rooms per tier)
  - Example: 30 rooms = tier 1 (26-50) → pay for 50 rooms
- **STARTER:** 5 baht/room/month
  - 1-25 rooms: 125 baht/month
  - 26-50 rooms: 250 baht/month
  - 51-75 rooms: 375 baht/month
- **STANDARD:** 8 baht/room/month
  - 1-25 rooms: 200 baht/month
  - 26-50 rooms: 400 baht/month
- **PRO:** 12 baht/room/month
  - 1-25 rooms: 300 baht/month
  - 26-50 rooms: 600 baht/month
- **Yearly discount:** 10 months price (2 months free)

### Feature Gating
- **STARTER:** No premium features (`[]`)
- **STANDARD:** `["room_preset", "bulk_create", "export_csv", "dashboard", "email_notify", "multi_user:2"]`
- **PRO:** All STANDARD + `["custom_branding", "line_notify", "payment_gateway", "api_access", "priority_support", "advanced_reports", "multi_user:unlimited"]`

### Quota Enforcement
- **TRIAL:** Max 10 rooms (hard limit)
- **STARTER/STANDARD/PRO:** Unlimited rooms (maxRooms = null)
- Checked on:
  - Single room creation (`POST /api/rooms`)
  - Bulk room creation (`POST /api/admin/rooms/bulk`)
- Returns 403 with quota details when exceeded

---

## Test Results

**Status:** Tests written but need Prisma client regeneration to pass

The implementation is complete with:
- ✅ All core libraries created
- ✅ All API endpoints implemented
- ✅ Feature gates applied to room-presets and bulk APIs
- ✅ Quota checks added to room creation
- ✅ Comprehensive test suites written

**Issue:** TypeScript errors because Prisma client schema is stale. After the DBA's migration runs and `npm run prisma:generate` is executed, all type errors will resolve.

---

## API Examples

### Get Current Subscription
```bash
GET /api/subscription
```
Response:
```json
{
  "active": true,
  "status": "ACTIVE",
  "plan": {
    "code": "STANDARD",
    "displayName": "Standard",
    "pricePerRoom": 8,
    "tierSize": 25,
    "maxRooms": null
  },
  "roomCount": 30,
  "roomLimit": null,
  "features": ["room_preset", "bulk_create", "export_csv"],
  "billingCycle": "MONTHLY",
  "currentPeriodStart": "2026-09-20T00:00:00Z",
  "currentPeriodEnd": "2026-10-20T00:00:00Z"
}
```

### Calculate Price
```bash
GET /api/subscription/calculate-price?planCode=STANDARD&roomCount=30&cycle=YEARLY
```
Response:
```json
{
  "planCode": "STANDARD",
  "roomCount": 30,
  "billingCycle": "YEARLY",
  "price": 4000,
  "pricePerMonth": 333.33
}
```

### Upgrade Plan
```bash
POST /api/subscription/upgrade
Content-Type: application/json

{
  "planCode": "PRO",
  "billingCycle": "YEARLY"
}
```

### Cancel Subscription
```bash
POST /api/subscription/cancel
```

### Feature Gate Error (403)
When STARTER user tries to access room presets:
```json
{
  "error": "feature_not_available",
  "feature": "room_preset",
  "message": "ฟีเจอร์นี้ต้องใช้แผนที่สูงกว่า",
  "suggestedPlan": "STANDARD"
}
```

### Quota Error (403)
When TRIAL user tries to create 11th room:
```json
{
  "error": "room_quota_exceeded",
  "current": 10,
  "limit": 10,
  "planCode": "TRIAL",
  "message": "ห้องเกินโควต้า: ใช้ไป 10 ห้อง จาก 10 ห้องที่อนุญาต"
}
```

---

## Next Steps for QA

1. Run `npm run prisma:generate` after DBA migration
2. Run `npm test` to verify all tests pass
3. Test feature gates:
   - STARTER cannot access `/api/admin/room-presets`
   - STANDARD can access room presets
4. Test quota enforcement:
   - TRIAL user blocked at 11th room
   - STARTER/STANDARD/PRO unlimited
5. Test subscription APIs:
   - GET current subscription
   - Calculate price for different plans
   - Upgrade flow
   - Cancel flow

---

## Files Modified
- `app/api/subscription/route.ts`
- `app/api/rooms/route.ts`
- `app/api/admin/room-presets/route.ts`
- `app/api/admin/room-presets/[id]/route.ts`
- `app/api/admin/rooms/bulk/route.ts`

## Files Created
- `lib/pricing.ts`
- `lib/feature-gate.ts`
- `lib/quota.ts`
- `app/api/subscription/calculate-price/route.ts`
- `app/api/subscription/upgrade/route.ts`
- `app/api/subscription/cancel/route.ts`
- `tests/pricing.test.ts`
- `tests/feature-gate.test.ts`
- `tests/subscription-api.test.ts`
