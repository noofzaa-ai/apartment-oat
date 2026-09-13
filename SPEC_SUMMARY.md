# ระบบจัดการหอพัก (apartment-oat) — สรุปฟีเจอร์ & Progress

> อัปเดตล่าสุด: 2026-07-24

## สถาปัตยกรรม
- **Stack:** Next.js (App Router, TS) + Prisma + SQLite (better-sqlite3) · UI ภาษาไทย
- **Auth:** cookie session (`iron-session`) + hash ด้วย `bcrypt` · 2 บทบาท
- **middleware:** `proxy.ts` (Next.js เวอร์ชันนี้ใช้ชื่อนี้ ไม่ใช่ `middleware.ts`) กัน `/admin/*` + `/tenant/*`

| บทบาท | เข้าสู่ระบบด้วย | เข้าถึง |
|-------|----------------|---------|
| **ADMIN** | username + password | `/admin/*` — หลังบ้านทั้งหมด |
| **TENANT** (ผู้เช่า) | email + PIN 6 หลัก (admin ส่งทางอีเมล) | `/tenant/*` — เห็นเฉพาะห้องตัวเอง |

---

## ฟีเจอร์ฝั่ง ADMIN ✅
| # | ฟีเจอร์ | รายละเอียด |
|---|---------|-----------|
| 1 | จัดการหอพัก (Location) | เพิ่ม/แก้/ลบ · ชื่อ + ที่อยู่ |
| 2 | จัดการห้อง (Room) | ต่อหอพัก · ตั้งค่าเช่า + เรทน้ำ + เรทไฟ · กันเลขห้องซ้ำ |
| 3 | Options จ่ายเพิ่ม | ที่จอด/แอร์/wifi (name+price) · เพิ่มชนิดใหม่ได้ |
| 4 | กรอกมิเตอร์รายเดือน | น้ำ/ไฟ ต่อห้องต่อเดือน + โชว์เลขเดือนก่อนอัตโนมัติ |
| 5 | คำนวณบิลอัตโนมัติ | `เช่า + น้ำ(Δ×เรท) + ไฟ(Δ×เรท) + Σoptions` · breakdown แบบ extensible (BillLineItem) |
| 6 | หน้าสรุปบิล | ต่อห้องต่อเดือน + สถานะ จ่ายแล้ว/ค้างชำระ |
| 7 | จัดการผู้เช่า | สร้าง/ผูกห้อง/ส่ง PIN ทางอีเมล |
| 8 | ยืนยันสลิป | ดูสลิปที่ผู้เช่าอัปโหลด → อนุมัติ/ปฏิเสธ |
| 9 | Export บิล PDF | pdfkit + ฝังฟอนต์ไทย Sarabun |

## ฟีเจอร์ฝั่ง TENANT (ผู้เช่า) ✅
| # | ฟีเจอร์ |
|---|---------|
| 1 | Dashboard — บิลเดือนนี้ + ยอดค้างชำระ |
| 2 | ประวัติย้อนหลัง — บิล + มิเตอร์ |
| 3 | แจ้งชำระเงิน + อัปโหลดสลิป (admin ยืนยันทีหลัง) |
| 4 | ดาวน์โหลดบิล PDF ของห้องตัวเอง |

> 🔒 **ความปลอดภัย:** API ฝั่ง tenant ดึง `roomId` จาก session เอง ไม่เชื่อ input จาก client → เห็นได้แค่ห้องตัวเอง

## โครงสร้างพื้นฐาน
- **อีเมล:** nodemailer (dev = log PIN ลง console ถ้าไม่ตั้ง SMTP)
- **ไฟล์สลิป:** เก็บใน `uploads/` (ไม่ public) เสิร์ฟผ่าน API ที่เช็ค auth
- **PDF:** pdfkit + ฟอนต์ไทย Sarabun (`assets/fonts/`)
- **DB seed:** `npm run seed`

---

## 📊 Progress

### ✅ เสร็จแล้ว
- เฟส 1: Auth + data model + ย้ายหลังบ้านไป `/admin/*`
- เฟส 2: หน้า tenant portal + admin จัดการผู้เช่า
- เฟส 3: แจ้งชำระ + สลิป + PDF จริง + อีเมล PIN
- แก้บั๊ก blocking จาก QA ครบ 3 ข้อ (verify จริงด้วย curl):
  - 🔴 Legacy admin API ไม่มี auth → ใส่ `requireAdmin()` ครบ 8 endpoint → คืน **401**
  - 🟠 PDF ไม่ฝังฟอนต์ไทย → wire Sarabun → PDF มี `FontFile` embedded
  - 🟠 Login ไม่มี rate limit → 5 ครั้ง/15 นาที → **429**
- `npm run build` ผ่าน
- **Dockerize แอปจริง** ✅ — `Dockerfile` (multi-stage, standalone, ฝังฟอนต์ไทย) + `docker-compose.yml` (volume สำหรับ SQLite + `uploads/`) + `.env.example` + `/api/health` + `README_DOCKER.md`
  - build + `docker compose up` ผ่านจริง → container up, health 200, `curl /api/locations` = **401** (verify แล้ว)
  - รันที่ **http://localhost:3004** (admin: `/admin/login`, tenant: `/tenant/login`)

### 📌 ค้าง (Deferred / Tech debt)
- CSRF token, audit logging, prod `SESSION_PASSWORD` (local single-owner เสี่ยงต่ำ)
- package name ยังเป็น `apartment-oat-scaffold`

---

## 🗺️ Roadmap (แนะนำเพิ่ม)
**🟢 คุ้มมาก:** สถานะห้องว่าง/ไม่ว่าง · Dashboard สรุปรายได้/ห้องค้างชำระ · ใบเสร็จหลังชำระ
**🟡 มีประโยชน์:** ค่าปรับจ่ายช้า/ยอดยกมา · ส่งบิลให้ผู้เช่าทาง LINE/อีเมล
**🔵 ระยะยาว:** backup DB อัตโนมัติ · รายงานรายปี/กราฟรายได้

---

## ทีมพัฒนา (multi-agent)
PO (Opus) แจกงาน → developer (sonnet) · qa (haiku) · devops (haiku) · designer (sonnet) — ดู `ROLE.md`

## Deploy
- **Mockup:** docker nginx → http://localhost:8089 (`design/Dockerfile.mockup`)
- **แอปจริง (dev):** `npm run dev` → http://localhost:3000
- **แอปจริง (Docker):** `docker compose up -d` → http://localhost:3004 · ดู `README_DOCKER.md`
