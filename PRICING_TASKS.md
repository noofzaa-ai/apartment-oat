# Pricing Plans Implementation - Task List

**Feature:** Pricing Plans (pay-per-room + tiered pricing)  
**Spec:** `docs/feature-pricing-plans.md`  
**Owner:** PO (Hermes)  
**Start:** 2026-09-20  
**Status:** 🟡 In Progress

---

## Phase 1: Database & Core Logic

### 1.1 Schema & Migration
- [ ] **DBA** - เพิ่ม `Plan` table ใหม่ (code PK, pricePerRoom, tierSize, features JSON, etc.)
- [ ] **DBA** - แก้ `Subscription` table (เพิ่ม planCode FK, billingCycle, currentPeriodStart, แก้ roomQuota → roomQuotaSnapshot)
- [ ] **DBA** - Seed data: สร้าง 4 plans (TRIAL, STARTER, STANDARD, PRO) ใน migration
- [ ] **DBA** - Run migration dev + verify schema
- **Estimate:** 30 min  
- **Blocker:** ไม่มี

### 1.2 Subscription Helper Logic
- [ ] **Backend** - สร้าง `lib/pricing.ts`:
  - `calculatePrice(planCode, roomCount, billingCycle)` → number
  - `getTierForRoomCount(roomCount, tierSize)` → tier index
  - `hasFeature(subscription, feature)` → boolean
  - `getRoomCount(userId)` → number (นับห้องทั้งหมดของ user)
- [ ] **Backend** - เพิ่ม tests `tests/pricing.test.ts` (15+ cases: tier calculation, yearly discount, feature check)
- **Estimate:** 1 hr  
- **Dependency:** 1.1

### 1.3 Subscription API
- [ ] **Backend** - `GET /api/subscription` แก้ไขให้คืน: plan details, roomCount/limit, features, currentPeriod, price
- [ ] **Backend** - `GET /api/subscription/calculate-price?planCode=STANDARD&roomCount=30&cycle=YEARLY` คำนวณราคา
- [ ] **Backend** - เพิ่ม tests API (current subscription, price calculation)
- **Estimate:** 45 min  
- **Dependency:** 1.2

---

## Phase 2: Feature Gating & Quota Enforcement

### 2.1 Feature Gate Middleware
- [ ] **Backend** - สร้าง `lib/feature-gate.ts`:
  - `requireFeature(feature: string)` → middleware ตรวจ subscription.plan.features
  - HTTP 403 `feature_not_available` ถ้าไม่มี feature + แนะนำ plan ที่มี
- [ ] **Backend** - สร้าง `lib/quota.ts`:
  - `checkRoomQuota(userId, additionalRooms)` → throw QuotaExceededError ถ้าเกิน
- [ ] **Backend** - Tests (feature gate, quota check)
- **Estimate:** 45 min  
- **Dependency:** 1.2

### 2.2 Apply Feature Gates
- [ ] **Backend** - แก้ `POST /api/admin/room-presets` → `requireFeature('room_preset')`
- [ ] **Backend** - แก้ `PATCH/DELETE /api/admin/room-presets/[id]` → `requireFeature('room_preset')`
- [ ] **Backend** - แก้ `POST /api/admin/rooms/bulk` → `requireFeature('bulk_create')`
- [ ] **Backend** - แก้ `POST /api/admin/rooms` → เพิ่ม `checkRoomQuota(userId, 1)` ก่อนสร้าง
- [ ] **Backend** - แก้ `POST /api/admin/rooms/bulk` → เพิ่ม `checkRoomQuota(userId, roomNumbers.length)`
- [ ] **Backend** - Tests (gate enforcement, quota block on Starter plan)
- **Estimate:** 1 hr  
- **Dependency:** 2.1

### 2.3 Trial Limit Enforcement
- [ ] **Backend** - แก้ Trial plan seed: `maxRooms: 10`
- [ ] **Backend** - แก้ room creation logic ตรวจ `plan.maxRooms` (trial = 10, อื่น ๆ = unlimited/tier-based)
- [ ] **Backend** - Tests (trial 10-room limit, starter no hard limit)
- **Estimate:** 30 min  
- **Dependency:** 2.2

---

## Phase 3: UI - Plan Selection & Upgrade

### 3.1 Plan Comparison Page
- [ ] **Frontend** - สร้าง `/app/subscription/plans` page:
  - แสดงตารางเปรียบเทียบ 4 plans (Trial/Starter/Standard/Pro)
  - toggle Monthly/Yearly (แสดงส่วนลด "ฟรี 2 เดือน")
  - คำนวณราคาจาก room count ปัจจุบัน + plan tier
  - ปุ่ม "เลือกแผนนี้" / "อัปเกรด" / "แผนปัจจุบัน"
- [ ] **Frontend** - เรียก `GET /api/subscription` เพื่อดู current plan
- [ ] **Frontend** - เรียก `GET /api/subscription/calculate-price` สำหรับแต่ละ plan card
- **Estimate:** 2 hr  
- **Dependency:** 1.3

### 3.2 Subscription Management Page
- [ ] **Frontend** - สร้าง `/app/subscription` page:
  - แสดง current plan, billing cycle, period end date
  - ห้องปัจจุบัน / limit
  - รายการฟีเจอร์ที่มี (checkmarks)
  - ปุ่ม "เปลี่ยนแผน" → link ไป `/app/subscription/plans`
  - ปุ่ม "ยกเลิก" → ยืนยัน modal (Phase 4)
- **Estimate:** 1 hr  
- **Dependency:** 1.3

### 3.3 Quota Warning & Upgrade CTA
- [ ] **Frontend** - สร้าง component `<QuotaWarning>`:
  - แสดง banner เมื่อ `roomCount >= limit * 0.9` (ใกล้เต็ม 90%)
  - "คุณใช้ห้องไป 23/25 ห้อง กรุณาพิจารณาอัปเกรด"
- [ ] **Frontend** - แสดง modal เมื่อ API คืน 403 `room_quota_exceeded`:
  - "ไม่สามารถสร้างห้องเพิ่ม แผน Starter จำกัด 25 ห้อง"
  - ปุ่ม "ดูแผนอื่น" → `/app/subscription/plans`
- [ ] **Frontend** - แสดง upgrade CTA บน `/app/apartments/[id]/presets` เมื่อไม่มี `room_preset` feature:
  - card "Room Preset เฉพาะแผน Standard ขึ้นไป"
  - ปุ่ม "อัปเกรดเพื่อใช้งาน"
- **Estimate:** 1.5 hr  
- **Dependency:** 2.2, 3.1

---

## Phase 4: Upgrade/Downgrade Flow (MVP - ไม่มี payment จริง)

### 4.1 Upgrade API
- [ ] **Backend** - `POST /api/subscription/upgrade`:
  - body: `{ planCode, billingCycle }`
  - ตรวจ planCode valid
  - ตรวจ room count ไม่เกิน plan ใหม่ (ถ้า downgrade)
  - อัปเดต `Subscription`: planCode, billingCycle, currentPeriodStart (now), currentPeriodEnd (+1 month/+12 months)
  - status = 'ACTIVE'
  - คืน updated subscription
- [ ] **Backend** - Tests (upgrade, downgrade ถูกปฏิเสธถ้าห้องเกิน, yearly discount applied)
- **Estimate:** 1 hr  
- **Dependency:** 1.3

### 4.2 Upgrade UI Flow
- [ ] **Frontend** - แก้ `/app/subscription/plans`:
  - คลิก "เลือกแผนนี้" → modal ยืนยัน:
    - แสดงราคา + billing cycle
    - "ยืนยันการเปลี่ยนแผน"
  - เรียก `POST /api/subscription/upgrade`
  - สำเร็จ → redirect `/app/subscription` พร้อม toast "เปลี่ยนแผนเรียบร้อย"
- **Estimate:** 1 hr  
- **Dependency:** 4.1, 3.1

### 4.3 Cancel Subscription (ใช้ได้จนหมด period)
- [ ] **Backend** - `POST /api/subscription/cancel`:
  - status = 'CANCELED' (แต่ยังใช้ได้จน currentPeriodEnd)
  - ไม่ลบ subscription
  - คืน updated subscription
- [ ] **Frontend** - แก้ `/app/subscription`:
  - ปุ่ม "ยกเลิก" → modal warning:
    - "คุณยังใช้งานได้จนถึง [date] แต่จะไม่ต่ออายุอัตโนมัติ"
    - ยืนยัน → POST cancel
- **Estimate:** 45 min  
- **Dependency:** 4.1

---

## Phase 5: QA & Deploy

### 5.1 End-to-End QA
- [ ] **QA** - ตรวจ upgrade flow: Trial → Starter → Standard → Pro
- [ ] **QA** - ตรวจ feature gate: Starter ไม่เห็น Room Preset, Standard เห็น
- [ ] **QA** - ตรวจ quota: Starter 30 ห้อง สร้างห้องที่ 26 ถูกบล็อก
- [ ] **QA** - ตรวจ price calculation: 30 ห้อง Standard Monthly = 400 บาท, Yearly = 4,000 บาท
- [ ] **QA** - ตรวจ trial limit: สร้างห้องที่ 11 ถูกบล็อก
- [ ] **QA** - ตรวจ downgrade ถูกปฏิเสธ: Standard 60 ห้อง → Starter 50 ห้อง limit
- [ ] **QA** - ตรวจ cancel: ยกเลิกแล้วยังใช้ได้จน period end
- [ ] **QA** - lint, build, tests ผ่านทั้งหมด
- **Estimate:** 1.5 hr  
- **Dependency:** Phase 1-4 ทั้งหมด

### 5.2 Deploy
- [ ] **DevOps** - docker compose build + up -d --no-deps apartment-app
- [ ] **DevOps** - verify: container healthy, /app/subscription/plans returns 200
- **Estimate:** 15 min  
- **Dependency:** 5.1

---

## Phase 6: Payment Integration (Future - Not MVP)

- [ ] เลือก payment gateway (Stripe/Omise/2C2P)
- [ ] Backend webhook handling
- [ ] Frontend payment form
- [ ] Receipt/Invoice PDF
- [ ] Prorated billing logic
- [ ] Auto-renewal

**Note:** Phase 6 จะทำแยกต่อ หลัง MVP deploy แล้ว

---

## Summary

**Total Estimates:**
- Phase 1: ~2 hr 15 min
- Phase 2: ~2 hr 15 min
- Phase 3: ~4 hr 30 min
- Phase 4: ~2 hr 45 min
- Phase 5: ~1 hr 45 min
- **Total: ~13 hr 30 min**

**Critical Path:**
1.1 → 1.2 → 1.3 → 2.1 → 2.2 → 2.3 → 3.1 → 4.1 → 4.2 → 5.1 → 5.2

**Current Status:**
- [ ] Phase 1: Not started
- [ ] Phase 2: Not started
- [ ] Phase 3: Not started
- [ ] Phase 4: Not started
- [ ] Phase 5: Not started

---

## Notes for PO

- ผมจะเป็นคนคุม task list นี้
- แต่ละ phase เสร็จจะ update checklist ทันทีในไฟล์นี้
- ถ้ามี blocker จะรายงานทันที
- Payment gateway (Phase 6) ไม่รวมใน MVP — จะทำ manual activate ก่อน
