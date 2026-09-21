---
name: apartment-frontend
description: ApartmentOAT frontend patterns — Next.js 16 App Router + React 19 (no Tailwind/shadcn), global CSS + inline style convention, 4 states, accessibility, money/date format. ใช้เมื่อ build หรือ review หน้า/คอมโพเนนต์ฝั่ง UI.
---

# ApartmentOAT Frontend Skill

แนวทางแปลง design system เป็นโค้ด frontend ให้ตรงแบรนด์และ maintain ง่าย.
Stack จริง: **Next.js 16 App Router, React 19, TypeScript** — **ไม่มี Tailwind, ไม่มี shadcn, ไม่มี component library.** สไตล์ทำผ่าน global CSS (`app/globals.css`) + scoped CSS (`app/landing.css`, `app/auth.css`) + inline `style` object ใน React.

> อ้างอิงสี/token จาก skill `apartment-design-system` และไฟล์ CSS จริงเสมอ.

## โครงสร้างโปรเจกต์ (App Router)
- `app/page.tsx` = landing (server component, มี session redirect), `app/layout.tsx` = root layout.
- Admin: `app/admin/(auth)/login/`, `app/admin/(dashboard)/{locations,rooms,meter-reading,bills,tenants}/` — layout ใช้ `.sidebar` (`components/AdminSidebar.tsx`).
- Tenant: `app/tenant/login/`, `app/tenant/(portal)/{dashboard,payment,history}/` — layout ใช้ `components/TenantTopNav.tsx`.
- Shared components: `components/*` (AdminSidebar, TenantTopNav, Toast, Sidebar).
- Path alias: `@/*` = repo root (เช่น `import "@/app/auth.css"`, `import Toast from "@/components/Toast"`).

## Server vs Client
- Default **Server Component**. ใส่ `"use client"` เฉพาะที่มี state/effect/event/browser API (เช่น หน้า login, dashboard, TenantTopNav).
- Session-derived redirect ทำใน **server component** (เช่น `app/page.tsx` เรียก `getSession()` แล้ว `redirect()`).
- อย่า import server-only module (`@/lib/prisma`, `@/lib/session`) เข้า client component — client เรียกผ่าน `fetch("/api/...")` แทน (ดู dashboard เรียก `/api/tenant/bill`).

## Styling conventions
- ธีมกลางมาจากตัวแปรใน `app/globals.css :root` → ใช้ class `.btn`/`.btn-primary`/`.card`/`.form`/`.sidebar` ที่มีอยู่ก่อน.
- หน้าที่ต้องการดีไซน์เฉพาะ (login/dashboard) ใช้ inline `style` object + ค่าคงที่สีที่ประกาศบนสุดของไฟล์ (ดู `INK/YELLOW/PURPLE` ใน dashboard) — อ้างอิง token จาก design-system skill อย่า hardcode สีมั่ว.
- CSS ที่ใช้ซ้ำหลายหน้า (เช่น login) แยกเป็นไฟล์ `.css` แล้ว `import` (เช่น `app/auth.css`). CSS ของ landing scope ใต้ `.landing-root` ห้ามรั่ว.

## 4 States (อย่าปล่อยหน้าจอว่าง)
- **Loading**: ข้อความ/spinner เบาๆ (ดู dashboard "กำลังโหลด...").
- **Empty**: อธิบายเป็นมิตร + มาสคอต + CTA (ดู `EmptyCard` "ยังไม่มีบิลในระบบ" / "ยังไม่ได้ผูกห้อง").
- **Error**: ภาษาคนธรรมดา + ทางออก ผ่าน `Toast` ("โหลดข้อมูลล้มเหลว") — **ห้าม** โยน stack trace/raw error ให้ผู้ใช้.
- **Stale/rejected**: บิลถูกปฏิเสธ → แสดง `paymentRejectionReason` + ปุ่มแจ้งชำระใหม่.

## Money & date formatting
- เงินเก็บเป็น `Float` (Prisma) — แสดง `n.toLocaleString("th-TH", { minimumFractionDigits: 0, maximumFractionDigits: 2 })` + `฿`.
- `font-variant-numeric: tabular-nums` + JetBrains Mono กับตัวเลขทุกที่; ยอดในตาราง/breakdown ชิดขวา.
- วันที่/รอบบิลเป็น **พ.ศ. + เดือนไทย** (helper `thaiPeriod("2026-09")` → "กันยายน 2569").
- สถานะบวก/ลบ/จ่าย สื่อด้วย **สี + ข้อความ/จุด คู่กัน** (ดู `StatusBadge`).

## Accessibility
- Semantic HTML: `<button>`, `<nav>`, `<main>`, `<label htmlFor>`, heading เรียงลำดับ.
- ทุก interactive element focus ด้วยคีย์บอร์ดได้ + focus ring; target ≥ 44px.
- `aria-live="polite"` บนแจ้งเตือนที่อัปเดต (ดู due-date notice), `aria-label` บนปุ่ม icon-only, `aria-hidden` บน element ตกแต่ง/มาสคอต.
- honor `prefers-reduced-motion`.
- รูปมาสคอตที่เป็นเนื้อหามี `alt`, ที่เป็นตกแต่งใส่ `alt="" aria-hidden`.
- ปัจจุบันใช้ `<img>` ธรรมดา (มี `eslint-disable @next/next/no-img-element`) — ยอมรับได้สำหรับ static asset; ถ้าจะใช้ `next/image` ต้องเทสต์ใน standalone build.

## Quality gates ก่อนส่งงาน frontend
1. `npm run build` (next build) ผ่าน — **ไม่มี lint/test script แยก** ในโปรเจกต์นี้ (ต่างจากโปรเจกต์อื่น), verify ด้วย build + curl หน้าจริงบน :3004
2. ไม่ hardcode สีนอก token design-system; ไม่เกิน 3–4 สีต่อหน้า
3. Contrast ผ่าน WCAG AA (ปุ่มเหลืองใช้ตัวอักษร ink); target ≥ 44px; คีย์บอร์ด/aria เข้าถึงได้
4. เงิน: tabular-nums + ชิดขวา + คั่นหลักพัน + สถานะ สี+ข้อความคู่กัน; วันที่เป็น พ.ศ./เดือนไทย
5. ครบ 4 states (loading/empty/error/stale)
6. CSS ของ landing ไม่รั่วออกนอก `.landing-root`; client ไม่ import server module
7. อ่านหน้า/คอมโพเนนต์เดิมก่อนเพื่อ match convention (inline style object + ค่าสีคงที่บนหัวไฟล์)
