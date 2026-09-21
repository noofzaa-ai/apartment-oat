---
name: apartment-design-system
description: ApartmentOAT (Apartments by Daiyooo) brand & UI design system — สี/ฟอนต์/radius/มาสคอต/ปุ่ม ที่ดึงจาก app/globals.css, app/landing.css, app/auth.css จริง. ใช้เมื่อออกแบบหน้าจอ เลือกสี/spacing หรือรีวิว UI ให้ตรงแบรนด์.
---

# ApartmentOAT Design System Skill

ApartmentOAT คือ **ระบบจัดการหอพัก** (Apartments by Daiyooo) — landing สาธารณะ + พอร์ทัลเจ้าของหอ (admin) + พอร์ทัลผู้เช่า (tenant).
Visual direction: **warm yellow / cream / deep purple** พร้อมมาสคอต "โอ๊ตตี้" (ลูกปิงปองสีเหลือง) โทนอบอุ่น เป็นมิตร ไม่ใช่ SaaS สีเย็น.

> ค่าทั้งหมดดึงจาก **`app/globals.css`, `app/landing.css`, `app/auth.css` จริง** — เมื่อขัดแย้งยึดไฟล์เหล่านี้. ห้ามคิดสีใหม่นอก token.

## Core tokens (CSS variables ใน `:root` ของ app/globals.css — ใช้ค่านี้เสมอ)
```css
--brand-yellow: #ffc83d;         /* primary action */
--brand-yellow-deep: #f6b818;    /* hover / darker */
--brand-yellow-shadow: #dfad2d;  /* ปุ่ม 3D bottom shadow */
--brand-purple: #3d284c;         /* sidebar, navbar, ยอดเงิน, accent เข้ม */
--brand-purple-soft: #543665;
--brand-cream: #fff9ed;          /* surface อ่อน / footer / cta bar */
--brand-cream-deep: #fff4d7;     /* gradient hero */
--brand-ink: #2b2131;            /* ตัวอักษรหลัก */

--color-primary: #ffc83d;              /* = yellow */
--color-primary-dark: #f6b818;
--color-primary-contrast: #2b2131;     /* ตัวอักษรบนพื้นเหลือง = ink (ห้ามขาว) */
--color-success: #4dc88c;
--color-warning: #e0a12a;
--color-error: #e05a5a;
--color-info: #7d59e9;                  /* ม่วงสด (accent รอง) */

--color-text-primary: #2b2131;
--color-text-secondary: #675e6b;
--color-bg-primary: #ffffff;
--color-bg-light: #fffdfa;              /* app background ครีมอ่อนมาก */
--color-bg-lighter: #fff9ed;
--color-border: #ece3d5;                /* เส้นขอบโทนอุ่น */
--border-radius: 8px;
```

## Typography
- Font: `--font-family: 'IBM Plex Sans Thai', 'DM Sans', 'Inter', system-ui, sans-serif` — **IBM Plex Sans Thai** เป็น primary (ไทย), **DM Sans** สำหรับ brand/heading (letter-spacing ติดลบ ~-.04em ถึง -.06em).
- Numeric/เงิน: `'JetBrains Mono', monospace` + `font-variant-numeric: tabular-nums`.
- Weight: body 400, heading/label 700, brand/ยอดเงินเน้น 800.
- ฟอนต์โหลดผ่าน `@import` ที่ต้น `app/globals.css` (Google Fonts) — อย่าเปลี่ยน family เอง.

## Signature components (มีจริงในโปรเจกต์)
- **ปุ่มหลัก (yellow 3D)**: พื้น `#ffc83d`, ตัวอักษร `#28202f`, `box-shadow: 0 7px 0 #dfad2d`, hover `translateY(-2px)` เงาลึกขึ้น, active กดลง. ดู `.button-primary` (landing) / `.auth-submit` (login) / ปุ่มแจ้งชำระใน dashboard.
- **การ์ด**: พื้นขาว, `border: 1px solid #f0e5d3`, radius 18–28px, เงานุ่มโทนอุ่น `0 18px 44px rgba(140,94,39,0.12)` — ใช้เงานุ่มไม่ใช่เส้นหนา.
- **Navbar/sidebar**: พื้น `--brand-purple #3d284c`, โลโก้ orb เหลือง `✦`, เมนู active = พื้นเหลือง + ตัวอักษร ink. ดู `components/TenantTopNav.tsx` + `.sidebar` ใน globals.css.
- **Brand lockup**: `apartments` + dot สีทอง `#e9a700` + orb เหลือง `✦` (DM Sans, letter-spacing -.06em).
- **Eyebrow/kicker**: uppercase ตัวเล็ก letter-spacing กว้าง weight 800 สีทองเข้ม `#82682d`/`#a08a4a`, มี ✳/✦ นำ.
- **มาสคอตโอ๊ตตี้**: `/landing/oatty-hero.png` (ทักทาย), `oatty-rooms.png` (ห้อง), `oatty-bills.png` (บิล/ว่าง), `oatty-payments.png` (ชำระ). ใช้ประกอบ hero, การ์ด login, empty state, greeting. มี animation `mascot-bob`/`auth-bob` (ลอยเบาๆ) — honor `prefers-reduced-motion`.

## Status colors (payment states — ให้ตรงกับ enum จริง)
- **PAID (จ่ายแล้ว)**: เขียว `#3f9d6d` บนพื้น `#e6f6ed` border `#b6e6c9`.
- **SUBMITTED (รอยืนยัน)**: ม่วง `#7d59e9` บนพื้น `#f1ecfa` border `#d9caf6`. (หมายเหตุ: enum จริงคือ `SUBMITTED` ไม่ใช่ `PENDING`).
- **UNPAID (ค้างชำระ)**: เหลืองเข้ม `#a9781a` บนพื้น `#fff2c9` border `#fbdf9b`.
- **rejected**: แดง `#c0453f` บนพื้น `#fdecec` border `#f6cfcf` (แสดง `paymentRejectionReason`).
- สื่อสถานะด้วย **สี + จุด/ข้อความ คู่กัน** เสมอ (ไม่ใช้สีอย่างเดียว — colorblind).

## Money & data display
- เงินในระบบเก็บเป็น **`Float`** (Prisma) — แสดงด้วย `n.toLocaleString("th-TH", { maximumFractionDigits: 2 })` + `฿`/`บาท`.
- ตัวเลขใช้ `font-variant-numeric: tabular-nums` (+ JetBrains Mono), ยอดเงินใหญ่สีม่วง `#3d284c` (ยังไม่จ่าย) / เขียว (จ่ายแล้ว).
- วันที่แสดงเป็น พ.ศ. + เดือนไทย (ดู `thaiPeriod()`/`getCurrentThaiDate()` ใน dashboard).

## Usage formula
```
~70% cream/white (#fffdfa / #ffffff)
~20% yellow (#ffc83d primary + cream surfaces)
~10% purple #3d284c + status colors (green/purple/red) เฉพาะจุดสื่อความหมาย
```
ไม่เกิน 3–4 สีต่อหน้า. หลักคือ **ข้อมูลชัดก่อน แล้วค่อยตกแต่ง**. โทนอบอุ่น เป็นมิตร.

## Scope rule (สำคัญ)
- CSS ของ landing scope ใต้ `.landing-root` (ใน `app/landing.css`) — ห้ามให้ `:root`/`body`/`*` รั่วไปกระทบ UI admin/tenant.
- ธีมกลางของแอป (admin/tenant) มาจากตัวแปรใน `app/globals.css` `:root` → เปลี่ยนที่นี่ที่เดียวมีผลทั้ง `.btn`/`.card`/`.sidebar`.

## Accessibility
- ตัวอักษร ink `#2b2131` บนครีม/ขาว ผ่าน WCAG AA; ปุ่มเหลืองใช้ตัวอักษร ink (ห้ามขาว — contrast ไม่ผ่าน).
- Focus ring เห็นชัด (`box-shadow: 0 0 0 4px #ffc83d33` บน input). Interactive target ≥ 44px (ปุ่ม dashboard สูง 48–50px).
- honor `prefers-reduced-motion` (มี media query ปิด animation แล้วใน landing.css).
