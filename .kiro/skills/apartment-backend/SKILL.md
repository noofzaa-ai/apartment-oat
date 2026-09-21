---
name: apartment-backend
description: ApartmentOAT backend conventions — Next.js App Router route handlers, Prisma + SQLite, iron-session auth (admin/tenant), ownership scoping, rate limiting, file upload safety, บิล/มิเตอร์ logic. ใช้เมื่อออกแบบ/เขียน/รีวิว route handler หรือ server-side code.
---

# ApartmentOAT Backend Skill

ApartmentOAT เป็น **standalone Next.js 16 App Router app (TypeScript)** deploy บน Docker พร้อม **SQLite ผ่าน Prisma** (`@prisma/adapter-better-sqlite3`).
Auth ใช้ **iron-session** (encrypted cookie, stateless — ยังไม่มี OIDC), 2 role: `admin` (username+password) และ `tenant` (email+PIN).

โครงหลัก:
- Route handlers: `app/api/**/route.ts` — auth (`api/auth/*`), admin (`api/admin/*`), tenant (`api/tenant/*`), รวม `api/uploads/[...path]`, `api/health`.
- Shared libs: `lib/prisma.ts` (singleton), `lib/session.ts` (iron-session), `lib/auth.ts` (`requireAdmin`/`unauthorized`), `lib/rate-limit.ts`, `lib/email.ts`, `lib/pdf.ts`.
- Schema: `prisma/schema.prisma` (Admin, Tenant, Location, Room, RoomOption, MeterReading, Bill, BillLineItem).
- Path alias `@/*` = repo root.

## Runtime & framework rules
- **App Router route handlers** เท่านั้น (ไม่มี Express). Export `GET`/`POST`/`PATCH`/`DELETE` เป็น async รับ `NextRequest` คืน `NextResponse`.
- Dynamic route param เป็น **Promise** ใน Next 16: `{ params }: { params: Promise<{ id: string }> }` → `const { id } = await params;`.
- Prisma/SQLite ต้องรันบน Node runtime — อย่าใส่ `export const runtime = "edge"`.
- Secret อ่านจาก `process.env` เท่านั้น (`SESSION_PASSWORD`, `SMTP_*`, `DATABASE_URL`) — ห้าม hardcode. **หมายเหตุ**: ปัจจุบัน `SESSION_PASSWORD` มี fallback ค่า dev ใน `lib/session.ts`/`proxy.ts` — ใน production ควร fail ถ้าไม่ตั้ง (ดู known issues).
- Prisma client เป็น singleton ผ่าน `globalForPrisma` (ดู `lib/prisma.ts`).

## Auth & session (iron-session)
- Session cookie `apt_session` (prod: `secure`, `httpOnly`, `sameSite=lax`, 7 วัน) — เก็บ `{ userId, role }` เท่านั้น. อ่านผ่าน `getSession()`.
- **ทุก admin endpoint ต้องเรียก `requireAdmin()` จาก `@/lib/auth` ที่ต้น handler** แล้วคืน `unauthorized()` (401) ถ้า null. อย่า copy-paste `requireAdmin` ซ้ำในแต่ละไฟล์ — import จาก `lib/auth.ts`.
- Tenant endpoint: ตรวจ `session.role === "tenant"` + ดึง `tenant.roomId` **จาก session.userId เท่านั้น** ไม่เชื่อค่าจาก client.
- Password/PIN hash ด้วย **bcrypt** (cost 10); เก็บ hash เท่านั้น; ไม่ส่ง hash กลับ client; PIN แสดง plain ครั้งเดียวตอนสร้าง/reset.
- Route protection ระดับ page ทำใน `proxy.ts` (middleware) — redirect `/admin/*`→`/admin/login`, `/tenant/*`→`/tenant/login` ตาม role.

## Ownership scoping (กันข้อมูลข้ามผู้ใช้)
- Tenant เข้าถึงได้เฉพาะ resource ของห้องตัวเอง: verify bill ด้วย `prisma.bill.findFirst({ where: { id, roomId: tenant.roomId } })` — roomId มาจาก session ไม่ใช่ body.
- ไฟล์อัปโหลด (`api/uploads/[...path]`): tenant เข้าถึงได้เฉพาะโฟลเดอร์ `uploads/{roomId}/` ของตัวเอง, admin เข้าได้ทั้งหมด. ตรวจ path traversal ด้วย `path.resolve` + `startsWith(UPLOADS_DIR)` เสมอ.

## File upload safety (payment slip)
- Validate **MIME** (`image/jpeg|png|webp|gif`, `application/pdf`) และ **size** (≤10MB) ก่อนเขียน.
- ชื่อไฟล์ปลอดภัย `${Date.now()}-slip${ext}` ใน `uploads/{roomId}/` — อย่าใช้ชื่อ client ตรงๆ.
- เสิร์ฟผ่าน route ที่เช็ค auth (`api/uploads/[...path]`) พร้อม `Cache-Control: private` — ไม่ให้เข้าถึง static ตรง.

## Money & bill logic
- เงินเก็บเป็น **`Float`** ใน Prisma (baseRent, waterRate, waterCost, total ฯลฯ) — ไม่ใช่ integer. ระวังปัญหาปัดเศษ; format ตอนแสดงด้วย toLocaleString.
- คำนวณบิล: `waterUnits = curr - prev` (เดือนก่อน), `cost = Math.max(0, units) * rate`, `total = baseRent + water + electric + options`. Bill/MeterReading unique ต่อ `(roomId, period)` (period = "YYYY-MM").
- **Known correctness gaps** (ควรระวัง/แก้เมื่อแตะ): (1) มิเตอร์ปัจจุบัน < เดือนก่อน (rollover/กรอกผิด) ถูกกลืนเป็น 0 เงียบๆ — ควร push เข้า `errors[]`; (2) `meter-readings` POST ไม่ validate ตัวเลข → `NaN` เข้า DB ได้; (3) bill POST เป็น N+1 (query meter ต่อห้องใน loop).

## Conventions
- ทุก route ที่ผูก user ตรวจ session/role ก่อน แล้ว scope ด้วย `roomId`/`userId` (ตอบ 401/403).
- ใช้ **Prisma parameterized query** เสมอ (Prisma กัน SQL injection ให้อยู่แล้ว — อย่าต่อ raw SQL string เอง).
- Rate limit endpoint sensitive (login) ด้วย `checkRateLimit()` (`lib/rate-limit.ts`, 5 ครั้ง/15 นาที). **Known gap**: key อิง `x-forwarded-for` ที่ปลอมได้ + in-memory (ไม่ข้าม instance) — ถ้าขยาย multi-instance ต้องใช้ store กลาง.
- Error response เป็น JSON `{ error: "..." }` (ข้อความไทยสำหรับผู้ใช้), status code เหมาะสม (400/401/404/409/429). ห้ามโยน stack trace/raw error.
- Payment state machine: `UNPAID → SUBMITTED → PAID` (reject → กลับ UNPAID + เก็บ reason). ตรวจ status ก่อนเปลี่ยนเสมอ (เช่น reject ได้เฉพาะ SUBMITTED).
- Email ส่งผ่าน `lib/email.ts` (nodemailer) — ไม่มี SMTP config → log ลง console (dev mode).

## Quality gates ก่อนส่งงาน backend
1. `npm run build` (next build) ผ่าน — โปรเจกต์นี้ **ไม่มี test/lint script** แยก; verify ด้วย build + curl endpoint จริงบน :3004 (`/api/health` ต้อง ok)
2. ทุก admin route เรียก `requireAdmin()`; ทุก tenant route ดึง roomId จาก session; ownership scope ครบ
3. ไม่มี secret hardcode; upload validate MIME+size+path traversal
4. เปลี่ยน schema ผ่าน `prisma migrate` (dev) — อย่าแก้ SQLite ตรงๆ; migration backward-compatible
5. อ่าน route/schema/lib เดิมที่เกี่ยวข้องก่อนแก้ เพื่อ match convention (thin handler + lib helper)
