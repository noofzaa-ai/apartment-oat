# Feature Spec: Pricing Plans

**สถานะ:** 📋 Planning  
**เป้าหมาย:** เพิ่ม pricing plans แบบ pay-per-room พร้อม tier ขั้นบันได 25 ห้อง และส่วนลดรายปี

---

## Problem Statement

ตอนนี้ระบบมีแค่ trial 30 วัน แล้วหมดอายุ ยังไม่มีการเก็บเงินจริง และยังไม่มีการจำกัดจำนวนห้องตาม package

---

## Solution: Tiered Pricing Plans

### Plans Overview

| Plan | ราคา/ห้อง/เดือน | ฟีเจอร์หลัก | เหมาะกับ |
|------|----------------|------------|----------|
| **Trial** | ฟรี 30 วัน | ทดลองใช้ จำกัด 10 ห้อง | คนใหม่ |
| **Starter** | 5 บาท | จัดการพื้นฐาน | หอเล็ก |
| **Standard** | 8 บาท | Starter + Preset/Bulk/Report | หอกลาง |
| **Pro** | 12 บาท | Standard + LINE/Branding/API | หอใหญ่ |

---

## Plan Details

### Trial (ฟรี 30 วัน)
- **ราคา:** ฟรี
- **จำกัด:** สูงสุด 10 ห้อง
- **ฟีเจอร์:** ทุกอย่างของ Starter
- **ข้อจำกัด:**
  - มี watermark "ทดลองใช้งาน" บน PDF
  - หมดอายุ → ดูข้อมูลได้ แต่สร้าง/แก้/ออกบิลไม่ได้
- **สิทธิ์:** ทุกคนได้ trial 1 ครั้ง

---

### Starter
**ราคา:** 5 บาท/ห้อง/เดือน

**Tier ขั้นบันได (รายเดือน):**
| จำนวนห้อง | ราคา/เดือน |
|-----------|-----------|
| 1-25 | 125 บาท |
| 26-50 | 250 บาท |
| 51-75 | 375 บาท |
| 76-100 | 500 บาท |
| 101-125 | 625 บาท |
| 126-150 | 750 บาท |

**รายปี (ฟรี 2 เดือน = จ่าย 10 เดือน):**
| จำนวนห้อง | ราคา/ปี | เฉลี่ย/เดือน |
|-----------|---------|--------------|
| 1-25 | 1,250 บาท | ~104 บาท |
| 26-50 | 2,500 บาท | ~208 บาท |
| 51-75 | 3,750 บาท | ~313 บาท |
| 76-100 | 5,000 บาท | ~417 บาท |

**ฟีเจอร์:**
- ✅ จัดการหอ/ห้อง/ผู้เช่า
- ✅ บันทึกมิเตอร์น้ำ/ไฟ
- ✅ ออกบิลรายเดือน
- ✅ อัปโหลดสลิปชำระเงิน
- ✅ ตรวจสลิป (อนุมัติ/ปฏิเสธ)
- ✅ PDF ใบแจ้งหนี้
- ✅ Invite code สำหรับผู้เช่า
- ❌ Room Preset / Bulk create
- ❌ Export Excel/CSV
- ❌ รายงาน/Dashboard

---

### Standard
**ราคา:** 8 บาท/ห้อง/เดือน

**Tier ขั้นบันได (รายเดือน):**
| จำนวนห้อง | ราคา/เดือน |
|-----------|-----------|
| 1-25 | 200 บาท |
| 26-50 | 400 บาท |
| 51-75 | 600 บาท |
| 76-100 | 800 บาท |
| 101-125 | 1,000 บาท |
| 126-150 | 1,200 บาท |

**รายปี (ฟรี 2 เดือน):**
| จำนวนห้อง | ราคา/ปี | เฉลี่ย/เดือน |
|-----------|---------|--------------|
| 1-25 | 2,000 บาท | ~167 บาท |
| 26-50 | 4,000 บาท | ~333 บาท |
| 51-75 | 6,000 บาท | ~500 บาท |
| 76-100 | 8,000 บาท | ~667 บาท |

**ฟีเจอร์ Starter + เพิ่ม:**
- ✅ Room Preset + Bulk room creation
- ✅ Export Excel/CSV (บิล, ผู้เช่า, รายงาน)
- ✅ Dashboard รายงาน (รายรับ, ห้องว่าง, ค้างชำระ)
- ✅ อีเมลแจ้งเตือนอัตโนมัติ (ใกล้ครบกำหนด, ค้างชำระ)
- ✅ Multi-user access (เพิ่มผู้ช่วย 2 คน)

---

### Pro
**ราคา:** 12 บาท/ห้อง/เดือน

**Tier ขั้นบันได (รายเดือน):**
| จำนวนห้อง | ราคา/เดือน |
|-----------|-----------|
| 1-25 | 300 บาท |
| 26-50 | 600 บาท |
| 51-75 | 900 บาท |
| 76-100 | 1,200 บาท |
| 101-125 | 1,500 บาท |
| 126-150 | 1,800 บาท |

**รายปี (ฟรี 2 เดือน):**
| จำนวนห้อง | ราคา/ปี | เฉลี่ย/เดือน |
|-----------|---------|--------------|
| 1-25 | 3,000 บาท | ~250 บาท |
| 26-50 | 6,000 บาท | ~500 บาท |
| 51-75 | 9,000 บาท | ~750 บาท |
| 76-100 | 12,000 บาท | ~1,000 บาท |

**ฟีเจอร์ Standard + เพิ่ม:**
- ✅ Custom branding (logo, สี, ชื่อหอบน PDF)
- ✅ LINE notification (แจ้งผู้เช่าผ่าน LINE OA)
- ✅ Payment gateway integration (QR/PromptPay อัตโนมัติ)
- ✅ API access (เชื่อมระบบบัญชี/ERP)
- ✅ Multi-user unlimited
- ✅ Priority support (ตอบภายใน 24 ชม.)
- ✅ Advanced reports (เปรียบเทียบรายปี, กำไร/ขาดทุน)

---

## Data Model Changes

### Plan (ตารางใหม่)
```prisma
model Plan {
  code            String   @id // TRIAL, STARTER, STANDARD, PRO
  name            String
  displayName     String   // "Starter", "Standard", "Pro"
  pricePerRoom    Float    // 5, 8, 12 บาท
  tierSize        Int      @default(25) // ขั้นบันได 25 ห้อง
  maxRooms        Int?     // null = unlimited, 10 = trial limit
  features        Json     // ["room_preset", "export_csv", ...]
  isActive        Boolean  @default(true)
  sortOrder       Int      @default(0)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  subscriptions   Subscription[]
}
```

### Subscription (แก้ไข)
```prisma
model Subscription {
  id                  Int       @id @default(autoincrement())
  userId              Int       @unique
  planCode            String    // FK → Plan.code
  status              String    @default("TRIAL") // TRIAL | ACTIVE | EXPIRED | CANCELED
  billingCycle        String    @default("MONTHLY") // MONTHLY | YEARLY
  trialEndsAt         DateTime?
  currentPeriodStart  DateTime?
  currentPeriodEnd    DateTime?
  roomQuotaSnapshot   Int?      // snapshot ตอนสมัคร เพื่อกัน plan เปลี่ยนแล้วกระทบ sub เก่า
  createdAt           DateTime  @default(now())
  updatedAt           DateTime  @updatedAt
  user                User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  plan                Plan      @relation(fields: [planCode], references: [code])
  
  @@index([planCode])
}
```

**Changes:**
- เพิ่ม `planCode` FK → Plan
- เพิ่ม `billingCycle` (MONTHLY / YEARLY)
- เพิ่ม `currentPeriodStart`
- `roomQuota` → `roomQuotaSnapshot` (nullable, เก็บ snapshot)
- ลบ field `roomQuota` เดิม (ใช้ Plan.maxRooms แทน)

---

## Business Logic

### Room Quota Enforcement

**การนับห้อง:**
- นับห้องทั้งหมดที่ `Room.apartmentId IN (apartments ของ userId นี้)`
- ไม่นับ soft-deleted (ถ้ามี)

**การตรวจสอบ:**
1. ตอน `POST /api/admin/rooms` → เช็ค current room count < plan limit
2. ตอน `POST /api/admin/rooms/bulk` → เช็ค current + new count < plan limit
3. ตอน `POST /api/locations` (สร้างหอ) → ไม่บล็อก แต่ห้องแรกจะโดน quota check

**เมื่อเกิน quota:**
- HTTP 403 `room_quota_exceeded`
- Response: `{ error: "room_quota_exceeded", current: 30, limit: 25, planCode: "STARTER" }`
- UI แสดง modal "อัปเกรดแผน" พร้อมราคาแผนถัดไป

### Billing Cycle Logic

**รายเดือน (MONTHLY):**
- `currentPeriodEnd` = `currentPeriodStart` + 1 เดือน
- ต่ออายุอัตโนมัติ (auto-renew) หรือ manual

**รายปี (YEARLY):**
- `currentPeriodEnd` = `currentPeriodStart` + 12 เดือน
- ราคา = ราคา/เดือน × 10 (ฟรี 2 เดือน)

**การคำนวณราคา:**
```typescript
function calculatePrice(planCode: string, roomCount: number, billingCycle: string): number {
  const plan = await prisma.plan.findUnique({ where: { code: planCode } })
  const tierIndex = Math.floor((roomCount - 1) / plan.tierSize) // 0-indexed
  const tierRoomCount = (tierIndex + 1) * plan.tierSize // 25, 50, 75, ...
  const monthlyPrice = tierRoomCount * plan.pricePerRoom
  
  if (billingCycle === 'YEARLY') {
    return monthlyPrice * 10 // ฟรี 2 เดือน
  }
  return monthlyPrice
}
```

**ตัวอย่าง:**
- 30 ห้อง, Starter (5 บาท), Monthly
  - tierIndex = Math.floor((30-1)/25) = 1
  - tierRoomCount = (1+1) * 25 = 50
  - monthlyPrice = 50 * 5 = 250 บาท
- 30 ห้อง, Starter, Yearly
  - 250 * 10 = 2,500 บาท/ปี

---

## Feature Gating

**Feature flags ใน Plan.features (JSON array):**
```json
{
  "STARTER": [],
  "STANDARD": ["room_preset", "bulk_create", "export_csv", "dashboard", "email_notify", "multi_user:2"],
  "PRO": ["room_preset", "bulk_create", "export_csv", "dashboard", "email_notify", "multi_user:unlimited", "custom_branding", "line_notify", "payment_gateway", "api_access", "priority_support", "advanced_reports"]
}
```

**การเช็ค:**
```typescript
function hasFeature(subscription: Subscription, feature: string): boolean {
  const plan = subscription.plan
  return plan.features.includes(feature)
}
```

**ตัวอย่าง gate:**
- `POST /api/admin/room-presets` → require `room_preset` feature
- `POST /api/admin/rooms/bulk` → require `bulk_create` feature
- `/app/apartments/[id]/presets` → ถ้าไม่มี feature แสดง upgrade CTA

---

## UI/UX Changes

### 1. Plan Selection / Upgrade Page

**หน้า `/app/subscription/plans`**
- แสดงตาราง 4 plans เทียบกัน (Trial, Starter, Standard, Pro)
- toggle Monthly / Yearly (แสดงส่วนลด "ฟรี 2 เดือน")
- แต่ละ plan card:
  - ชื่อ plan
  - ราคา (คำนวณจาก room count ปัจจุบัน)
  - รายการฟีเจอร์
  - ปุ่ม "เลือกแผนนี้" / "อัปเกรด" / "แผนปัจจุบัน"

### 2. Subscription Management

**หน้า `/app/subscription`**
- แสดง current plan, billing cycle, period end
- ห้องปัจจุบัน / limit
- ประวัติการชำระ (ถ้ามี)
- ปุ่ม "เปลี่ยนแผน", "ยกเลิก"

### 3. Quota Warning

**เมื่อใกล้ถึง limit:**
- แสดง banner "คุณใช้ห้องไป 23/25 ห้อง ใกล้ถึงขั้นถัดไป"
- แนะนำ upgrade

**เมื่อเกิน limit:**
- modal block "ไม่สามารถสร้างห้องเพิ่ม กรุณาอัปเกรดแผน"
- แสดงตารางเปรียบเทียบแผน

---

## API Endpoints

### Plan Management (admin/internal only)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/plans` | ดูรายการ plans ทั้งหมด |
| POST | `/api/admin/plans` | สร้าง plan ใหม่ (internal) |
| PATCH | `/api/admin/plans/[code]` | แก้ plan (internal) |

### Subscription Management (owner)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/subscription` | ดู subscription ปัจจุบัน |
| POST | `/api/subscription/start-trial` | เริ่ม trial (เดิมที่มี) |
| POST | `/api/subscription/upgrade` | อัปเกรด/เปลี่ยน plan |
| POST | `/api/subscription/cancel` | ยกเลิก subscription |
| GET | `/api/subscription/calculate-price` | คำนวณราคาสำหรับ plan + room count |

---

## Implementation Plan

### Phase 1: Database & Core Logic
- [ ] DBA: Migration เพิ่ม Plan table, แก้ Subscription table
- [ ] DBA: Seed plans (TRIAL, STARTER, STANDARD, PRO) ลง DB
- [ ] Backend: `lib/subscription.ts` helper (calculatePrice, hasFeature, getRoomCount)
- [ ] Backend: Subscription API (GET /api/subscription, calculate-price)
- [ ] Tests: subscription logic, price calculation, room quota

### Phase 2: Feature Gating
- [ ] Backend: Feature gate middleware/helper
- [ ] Backend: แก้ `/api/admin/room-presets/*` ให้ gate `room_preset` feature
- [ ] Backend: แก้ `/api/admin/rooms/bulk` ให้ gate `bulk_create` feature
- [ ] Backend: Room creation ตรวจ quota before create
- [ ] Tests: feature gate enforcement, quota exceeded

### Phase 3: UI - Plan Selection & Upgrade
- [ ] Frontend: หน้า `/app/subscription/plans` (plan comparison table)
- [ ] Frontend: `/app/subscription` (current subscription info)
- [ ] Frontend: Upgrade flow (POST /api/subscription/upgrade)
- [ ] Frontend: Quota warning banner/modal
- [ ] Tests: UI rendering, upgrade flow

### Phase 4: Payment Integration (ถ้าทำจริง)
- [ ] Backend: Payment gateway integration (Stripe/Omise/2C2P)
- [ ] Backend: Webhook handling (payment success → activate subscription)
- [ ] Frontend: Payment form/redirect
- [ ] Tests: payment flow

---

## Known Limitations & Future Work

- **Payment gateway:** spec นี้ยังไม่ระบุ payment method จริง — ควรทำ Phase 4 แยกต่อ
- **Prorated billing:** ถ้า upgrade กลางเดือน ยังไม่มี logic คืนเงิน/ปรับราคา
- **Grace period:** หมดอายุแล้วอาจให้ grace 7 วันก่อน block
- **Refund:** ยกเลิกแล้วไม่คืนเงิน (ใช้ได้จนหมด period)
- **Invoice/Receipt:** ยังไม่มี PDF ใบเสร็จสำหรับ subscription payment

---

## Success Metrics

- ✅ Trial → Paid conversion rate
- ✅ Average revenue per user (ARPU)
- ✅ Upgrade rate (Starter → Standard → Pro)
- ✅ Churn rate (ยกเลิกต่อเดือน)
- ✅ Yearly subscription adoption (เป้า 40%+)
