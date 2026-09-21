# ระบบจัดการหอพัก — ฟีเจอร์และสถานะ

ระบบจัดการหอพัก (Next.js 16 App Router + React 19 + Prisma/SQLite) login ผ่าน Daiyooo Account (OIDC)
Deploy: Docker container `apartment-oat-app` (port 3004→3000) หลัง Cloudflare ที่ `https://apartments.daiyooo.com`

อัปเดตล่าสุด: 2026-09-21

---

## แนวคิดหลัก (Product model)

- **ทุกคน login ผ่าน Daiyooo Account (OIDC)** — ไม่มี username/password หรือ email/PIN แยกอีกต่อไป
- **หลัง login = user ธรรมดา** (ยังไม่มีสิทธิ์อะไรพิเศษ)
- **สิทธิ์สร้างหอพัก = ต้องมี subscription** (ทดลองใช้ฟรี 30 วัน หรือ active) — ผูกกับ "คนจ่าย" ระดับ User
- **membership ผูกต่อ apartment** — เป็น OWNER หอตัวเอง แต่ไปอยู่หอคนอื่นเป็น TENANT ธรรมดา สิทธิ์ไม่ข้าม apartment
- **ผู้เช่าเข้าหอด้วย invite code** (ต่อห้อง)

## โครงสร้าง Path

| Path | ใคร | ทำอะไร | สถานะ |
|------|-----|--------|--------|
| `/` | ทุกคน | Landing page | ✅ |
| `/login` | ทุกคน | จุดเข้าสู่ระบบรวม (unified) — route ไป Daiyooo SSO | ✅ |
| `/auth/login`, `/auth/callback` | ทุกคน | OIDC login flow (internal) | ✅ |
| `/app/*` | เจ้าของหอ (login แล้ว) | จัดการหอ/ห้อง/ผู้เช่า/มิเตอร์/บิล — ถ้าไม่มี subscription เห็น paywall | ✅ |
| `/tenant/*` | ผู้เช่า | ดูบิล/ประวัติ/แจ้งชำระ, รับ invite | ✅ (invite flow ยังไม่ verify ครบวง) |
| `/admin` | platform admin (อนาคต) | user management ของแพลตฟอร์มจริง — **สงวนว่างไว้** | ⏳ ยังไม่ทำ |

---

## ฟีเจอร์

### 1. Authentication (Daiyooo OIDC) — ✅ เสร็จ
- Authorization Code + PKCE (S256), public client (`client_id=apartments`, no secret)
- Provider: `account.daiyooo.com` (Better Auth), issuer `https://account.daiyooo.com/api/auth`
- `/login` — จุดเข้าสู่ระบบรวมของผู้ใช้ทุกบทบาท แล้วส่งต่อไป Daiyooo SSO
- `/auth/login` — สร้าง state/nonce/PKCE, เก็บ transaction (one-time, TTL 10 นาที), redirect ไป provider โดย **ไม่ส่ง `prompt=select_account`** เพราะ Better Auth ปฏิเสธพารามิเตอร์นี้
- `/auth/callback` — verify id_token (signature EdDSA/iss/aud/exp/nonce/PKCE), กัน replay/expired, provision user ผ่าน (issuer, subject) — ไม่ map ด้วย email
- **Session** — iron-session cookie `apt_session` (เก็บแค่ `userId`, สิทธิ์คำนวณจาก DB ทุก request)
- **Logout** (`/api/auth/logout`) — clear `apt_session` (session.destroy()) และ redirect กลับ Daiyooo account logout
- **Logout UI** — ปุ่ม "ออกจากระบบ" มีทั้ง owner sidebar และ tenant top nav
- `/api/me` — endpoint ตรวจสถานะ session (คืน user displayName/email)
- Proxy (`proxy.ts`) — `/app` และ `/tenant` เป็น protected; unauth → redirect `/login?return_to=<path>`
- ข้อจำกัด: ยังบังคับเปิด email/account chooser ไม่ได้ จนกว่า Daiyooo Account จะมี safe account-switch flow ที่รองรับอย่างเป็นทางการ

### 2. Subscription & Trial gate — ✅ เสร็จ
- `POST /api/subscription` — เริ่มทดลองใช้ฟรี 30 วัน (TRIAL) แบบ explicit (idempotent), `GET` ดูสถานะ
- **สร้างหอต้องมี active subscription** — `POST /api/locations` ใช้ `requireActiveSubscription()` → ไม่มี = 403 `subscription_required`
- ไม่มีการแจก trial อัตโนมัติ (ต้องกดเริ่มเอง)
- หน้า `/app` แสดง paywall "เริ่มทดลองใช้งานฟรี" เมื่อยังไม่มี subscription + chip วันคงเหลือเมื่ออยู่ในช่วง trial
- status: TRIAL / ACTIVE / EXPIRED (เช็ค trialEndsAt / currentPeriodEnd)
- Unit test 18 เคสครอบตรรกะ gate

### 3. จัดการหอพัก (เจ้าของหอ) — ✅ เสร็จ (core)
- หอพัก (Apartment): สร้าง/แก้/ลบ — owner-scoped
- ห้อง (Room) + RoomOption
- ผู้เช่า (Tenant/Membership)
- มิเตอร์ (MeterReading) — unique (roomId, period)
- บิล (Bill + BillLineItem) — unique (roomId, period), PDF
- ทุก endpoint guard ด้วย `requireOwnerOfApartment()` / ownership scope
- **Role routing หลัง login**: user ที่มี active owner membership → `/app/locations`, คนอื่น → `/tenant/dashboard` (no-room state)
- **UI ปรับปรุง**: แสดง email/displayName จาก userinfo; tenant no-room แสดง CTA "สร้างหอ / ใช้งานโหมดเจ้าของ"; มีลิงก์สลับโหมดระหว่าง owner ↔ tenant
- **Tenant access**: ผู้เช่าเข้าถึงเฉพาะห้องที่ตัวเองผูกอยู่ภายใน apartment นั้น (scoped by membership + roomId)

### 4. Invite code (ผู้เช่าเข้าหอ) — ✅ เสร็จ
- `POST /api/admin/invites` (owner สร้าง invite ต่อห้อง), `GET` ดูรายการ
- `/tenant/invite` (หน้ากรอก code), `/tenant/invite/[code]` + `/tenant/invite/[code]/claim` (claim flow)
- `POST /api/tenant/invites/[code]/claim` — API claim invite
- Empty state สำหรับ tenant ที่ยังไม่มีห้อง พร้อม CTA "ใช้ Invite Code"
- Neo-brutalist design: flat colors, thick borders, no shadows

### 5. ชำระเงิน / สลิป — ✅ เสร็จ (จาก schema เดิม)
- Tenant แจ้งชำระ + อัปโหลดสลิป (`/api/tenant/payment`)
- Owner ตรวจสลิป (`/api/admin/slips`) — state machine UNPAID→SUBMITTED→PAID (reject→UNPAID+reason)

### 6. Pricing Plans — ✅ เสร็จ (MVP)
- 4 plans: TRIAL (ฟรี 30 วัน, 10 ห้อง), STARTER (5฿), STANDARD (8฿, room_preset), PRO (12฿, all features)
- Tiered pricing: ขั้นบันได 25 ห้อง, รายเดือน/รายปี (ฟรี 2 เดือน)
- Feature gates: room_preset ต้อง STANDARD ขึ้นไป
- Room quota enforcement: Trial 10 ห้อง, อื่น ๆ unlimited แบบ tier
- API: `/api/admin/plans`, `/api/subscription/calculate-price`, `/api/subscription/upgrade`, `/api/subscription/cancel`
- UI: `/app/subscription/plans` (plan comparison), `/app/subscription` (management)
- QuotaWarning component (banner + modal)
- Neo-brutalist design: thick 4px borders, flat colors, no shadows

### 7. Onboarding Flow — ✅ เสร็จ
- `/get-started` — หน้าเลือก plan สำหรับ user ใหม่
- Middleware: user ใหม่ (ไม่มี subscription) redirect ไป `/get-started` หลัง login
- แสดงกล่องแพลน 4 อัน (TRIAL, STARTER, STANDARD, PRO) พร้อมฟีเจอร์แต่ละแพลน
- TRIAL highlighted เป็น "แนะนำ" พร้อม CTA "เริ่มทดลองฟรี 30 วัน"
- เลือก TRIAL → เริ่ม trial → redirect `/app/locations`
- Paid plans: แสดง "ติดต่อเราเพื่อเปิดใช้งาน" (Payment gateway Phase 6)
- **Logout button** — มุมบนขวาหน้า get-started เพื่อเปลี่ยน account
- **Invite button** — ปุ่ม "🎟️ ใช้รหัสเชิญ" เปิด modal กรอกรหัสบนหน้าเดิม
  - รองรับทั้งรหัสสั้น (8 ตัว: `zn3quM-C`) และ URL เต็ม (`https://apartments.daiyooo.com/tenant/invite/...`)
  - Auto-parse และ extract code จาก URL
  - ไม่ redirect, ไม่ loop
- Neo-brutalist design ตลอด
- **Deploy:** commit 4835cce (2026-09-21), invite modal รองรับ URL parsing

---

## Data model (Prisma / SQLite)

- **User** — คน login ผ่าน OIDC (displayName, email, avatarUrl)
- **ExternalIdentity** — `@@unique([issuer, subject])` map OIDC identity → User (ห้าม map ด้วย email)
- **Subscription** — `userId @unique`, status TRIAL/ACTIVE/EXPIRED, trialEndsAt, currentPeriodEnd, roomQuota (nullable, pricing เฟสหลัง)
- **OidcTransaction** — `stateHash @unique`, nonce, codeVerifier, used, expiresAt (one-time PKCE)
- **Apartment** — ownerUserId
- **Room** — apartmentId
- **Membership** — `@@unique([userId, apartmentId])`, role OWNER/TENANT, `roomId @unique` (nullable) — สิทธิ์ scoped ต่อ apartment
- **InviteCode** — `code @unique`, roomId, expiresAt
- **RoomOption / MeterReading / Bill / BillLineItem**

---

## งานที่เหลือ (Roadmap)

- [x] Tenant invite flow (สร้าง → claim → เห็นบิล) + empty states
- [x] เปลี่ยนชื่อแบรนด์เป็น wording กลางในจุดที่ผู้ใช้เห็น
- [x] Role routing หลัง login (owner → /app/locations, tenant → /tenant/dashboard)
- [x] Unified /login endpoint
- [x] แสดง userinfo และ tenant room details ใน UI
- [x] Pricing Plans (TRIAL/STARTER/STANDARD/PRO) + feature gates + quotas
- [x] Onboarding flow สำหรับ user ใหม่ (/get-started)
- [x] Neo-brutalist design (thick borders, flat colors, no shadows)
- [ ] Platform admin ที่ `/admin` (user management ของแพลตฟอร์มจริง)
- [ ] Payment Gateway integration (Stripe/Omise) — Phase 6

## Environment (สำคัญ)

- `SESSION_PASSWORD` (>=32 chars, required, fail-fast ใน production)
- `DAIYOOO_OIDC_ISSUER`, `DAIYOOO_OIDC_DISCOVERY_URL`, `DAIYOOO_OIDC_CLIENT_ID=apartments`, `DAIYOOO_OIDC_REDIRECT_URI=https://apartments.daiyooo.com/auth/callback`, `DAIYOOO_OIDC_SCOPES`
- `PRODUCT_BASE_URL=https://apartments.daiyooo.com`
- `DATABASE_URL` (dev `file:./dev.db`, prod `file:/app/data/app.db` ใน volume)
