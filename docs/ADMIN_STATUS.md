# Admin Panel - สถานะการพัฒนา

**อัปเดตล่าสุด:** 2026-09-22  
**สถานะรวม:** Phase 1-3 เสร็จสมบูรณ์ ✅

---

## สิ่งที่ทำเสร็จแล้ว

### Phase 1: Foundation ✅
- [x] **Database Schema**
  - เพิ่ม `User.role` (USER | PLATFORM_ADMIN | SUPER_ADMIN)
  - เพิ่ม `User.status` (ACTIVE | SUSPENDED | DELETED)
  - เพิ่ม `User.lastLoginAt`
  - เพิ่มตาราง `AdminNote` (admin notes สำหรับ user/apartment/subscription)
  - เพิ่มตาราง `AuditLog` (audit trail สำหรับ admin actions)

- [x] **Backend Middleware**
  - `lib/admin-auth.ts` - requirePlatformAdmin() และ requireSuperAdmin()
  - Authorization guards ตรวจสอบ role + status

- [x] **Backend API - Dashboard**
  - `GET /api/admin/dashboard/stats` - metrics overview

- [x] **Frontend Layout**
  - `/admin/layout.tsx` - Admin layout wrapper
  - `app/admin/admin.css` - Dark theme styling
  - `components/AdminSidebar.tsx` - Sidebar navigation
  - Route protection (client-side role check)

- [x] **Frontend Dashboard**
  - `/admin/page.tsx` - Dashboard with metrics cards
  - แสดง: Total Users, Active Subscriptions, Trial Users, Total Apartments, Total Rooms, MRR

- [x] **Environment & Config**
  - `.env.example` - เพิ่ม `PLATFORM_ADMIN_EMAILS`
  - `docker-compose.yml` - pass env var
  - `scripts/check-and-promote-admin.ts` - CLI script promote admin

- [x] **API /me Enhancement**
  - แก้ `/api/me` return `role` field สำหรับ admin check

---

### Phase 2: User Management ✅
- [x] **Backend API**
  - `GET /api/admin/users` - List users (pagination, filters, search)
  - `GET /api/admin/users/[id]` - User detail
  - `POST /api/admin/users/[id]/notes` - Add admin note
  - `GET /api/admin/users/[id]/notes` - Get admin notes

- [x] **Frontend Pages**
  - `/admin/users/page.tsx` - User list with filters
  - `/admin/users/[id]/page.tsx` - User detail page
  - `components/AdminNotes.tsx` - Admin notes component

---

### Phase 3: Subscription Management ✅
- [x] **Backend API**
  - `GET /api/admin/subscriptions` - List subscriptions
  - `GET /api/admin/subscriptions/[id]` - Subscription detail
  - `POST /api/admin/subscriptions/[id]/extend-trial` - Extend trial
  - `POST /api/admin/subscriptions/[id]/change-plan` - Change plan
  - `POST /api/admin/subscriptions/[id]/cancel` - Cancel subscription

- [x] **Frontend Pages**
  - `/admin/subscriptions/page.tsx` - Subscription list
  - `/admin/subscriptions/[id]/page.tsx` - Subscription detail

---

### Phase 4: Apartment Management ✅ (Partial)
- [x] **Backend API**
  - `GET /api/admin/apartments` - List apartments (pagination, filters)
  - `GET /api/admin/apartments/[id]` - Apartment detail with rooms/tenants

- [x] **Frontend Pages**
  - `/admin/apartments/page.tsx` - Apartment list
  - (Detail page ยังเป็น placeholder)

---

### Phase 5: Audit Logs 🟡 (Placeholder)
- [x] Schema `AuditLog` มีแล้ว
- [ ] Backend API `/api/admin/logs` - ยังไม่ implement
- [x] Frontend `/admin/logs/page.tsx` - มี placeholder

---

## สิ่งที่ยังต้องทำต่อ

### 1. Auto-Promote Admin (High Priority)
- [ ] **Middleware auto-promote** - เพิ่ม logic ใน `/auth/callback` หรือ middleware
  - ตรวจสอบ email กับ `PLATFORM_ADMIN_EMAILS` env
  - Auto-promote user ที่ login ครั้งแรกด้วย email ในรายการ
  - อัปเดต `lastLoginAt` ทุกครั้ง login

### 2. Audit Log Implementation
- [ ] Helper functions สร้าง audit log
- [ ] Integrate ใน admin actions ทั้งหมด
- [ ] API `/api/admin/logs` (list, filter, search)
- [ ] Frontend log viewer page

### 3. Admin Actions (Phase 2 ต่อ)
- [ ] Suspend/Unsuspend user
- [ ] Delete user (SUPER_ADMIN only)
- [ ] Edit user role

### 4. Apartment Management (Phase 4 ต่อ)
- [ ] Delete apartment (SUPER_ADMIN only)
- [ ] Transfer ownership
- [ ] Apartment detail page (full implementation)

### 5. Testing
- [ ] Unit tests - authorization guards
- [ ] Integration tests - admin APIs
- [ ] E2E tests - admin workflows

### 6. Polish
- [ ] Charts (user growth, revenue trend)
- [ ] Export CSV (all pages)
- [ ] Bulk actions
- [ ] Mobile sidebar toggle
- [ ] Loading skeletons

---

## การใช้งาน

### 1. Promote User เป็น Admin

**ตัวเลือกที่ 1: ใช้ ENV (แนะนำ)**
```bash
# แก้ .env
PLATFORM_ADMIN_EMAILS="admin@example.com,owner@daiyooo.com"

# Restart container
docker-compose restart apartment-oat-app
```

User ที่ login ด้วย email ในรายการจะถูก promote อัตโนมัติ (ต้อง implement middleware)

**ตัวเลือกที่ 2: ใช้ Script**
```bash
# แก้ email ใน scripts/check-and-promote-admin.ts
# แล้วรัน
npx tsx scripts/check-and-promote-admin.ts
```

### 2. เข้าใช้งาน Admin Panel
```
https://apartments.daiyooo.com/admin
```

ต้อง login ด้วย account ที่มี role = PLATFORM_ADMIN หรือ SUPER_ADMIN

---

## API Endpoints

### Dashboard
- `GET /api/admin/dashboard/stats` - Overview metrics

### Users
- `GET /api/admin/users` - List users (pagination, filters)
- `GET /api/admin/users/[id]` - User detail
- `POST /api/admin/users/[id]/notes` - Add admin note
- `GET /api/admin/users/[id]/notes` - Get notes

### Subscriptions
- `GET /api/admin/subscriptions` - List subscriptions
- `GET /api/admin/subscriptions/[id]` - Detail
- `POST /api/admin/subscriptions/[id]/extend-trial` - Extend trial
- `POST /api/admin/subscriptions/[id]/change-plan` - Change plan
- `POST /api/admin/subscriptions/[id]/cancel` - Cancel

### Apartments
- `GET /api/admin/apartments` - List apartments
- `GET /api/admin/apartments/[id]` - Detail

### Logs (ยังไม่ implement)
- `GET /api/admin/logs` - Audit logs

---

## Files Modified

### Backend
- `lib/admin-auth.ts` ✅
- `app/api/me/route.ts` ✅ (เพิ่ม role)
- `app/api/admin/dashboard/stats/route.ts` ✅
- `app/api/admin/users/route.ts` ✅
- `app/api/admin/users/[id]/route.ts` ✅
- `app/api/admin/users/[id]/notes/route.ts` ✅
- `app/api/admin/subscriptions/route.ts` ✅
- `app/api/admin/subscriptions/[id]/route.ts` ✅
- `app/api/admin/subscriptions/[id]/extend-trial/route.ts` ✅
- `app/api/admin/subscriptions/[id]/change-plan/route.ts` ✅
- `app/api/admin/subscriptions/[id]/cancel/route.ts` ✅
- `app/api/admin/apartments/route.ts` ✅
- `app/api/admin/apartments/[id]/route.ts` ✅

### Frontend
- `app/admin/layout.tsx` ✅
- `app/admin/admin.css` ✅
- `app/admin/page.tsx` ✅
- `app/admin/components/AdminSidebar.tsx` ✅
- `app/admin/components/AdminNotes.tsx` ✅
- `app/admin/users/page.tsx` ✅
- `app/admin/users/[id]/page.tsx` ✅
- `app/admin/subscriptions/page.tsx` ✅
- `app/admin/subscriptions/[id]/page.tsx` ✅
- `app/admin/apartments/page.tsx` ✅
- `app/admin/logs/page.tsx` ✅ (placeholder)

### Config
- `.env.example` ✅
- `docker-compose.yml` ✅
- `scripts/check-and-promote-admin.ts` ✅

### Database
- `prisma/schema.prisma` ✅ (User.role, User.status, User.lastLoginAt, AdminNote, AuditLog)

---

## Next Steps (แนะนำ)

1. **ทดสอบระบบ admin panel ที่มีอยู่**
   - Deploy Docker container
   - Promote admin user
   - ทดสอบ login และดู dashboard
   - ทดสอบ user management, subscription management

2. **Implement auto-promote middleware** (ถ้าต้องการ)
   - แก้ `/auth/callback` เพิ่ม logic check email vs PLATFORM_ADMIN_EMAILS
   - Auto-promote on first login

3. **Implement audit log** (ถ้าต้องการ tracking)
   - สร้าง helper `lib/audit-log.ts`
   - Integrate ใน admin actions
   - สร้าง API `/api/admin/logs`
   - แก้หน้า `/admin/logs` ให้แสดงข้อมูลจริง

4. **เพิ่ม admin actions อื่น ๆ** (ตามความต้องการ)
   - Suspend/unsuspend user
   - Delete user/apartment
   - Transfer ownership

---

## Known Issues

1. **Client-side auth only** - Route protection ยังเป็น client-side check อย่างเดียว
   - ฝั่ง server มี `requirePlatformAdmin()` ใน API แล้ว
   - แต่ page rendering ยังไม่มี server-side redirect
   - ไม่เป็นปัญหาถ้า API มี guard ครบ

2. **Auto-promote ยังไม่ implement** - ต้องใช้ script promote ด้วยมือ

3. **Audit log ยังไม่ทำงาน** - ยังไม่มี logging ใน admin actions

4. **Mobile sidebar ยังไม่มี toggle** - ซ่อนอยู่บน mobile แต่ไม่มีปุ่มเปิด

---

## Summary

Admin panel Phase 1-3 **เสร็จสมบูรณ์และพร้อมใช้งาน** ✅

ฟีเจอร์หลักที่ใช้งานได้:
- ✅ Dashboard metrics
- ✅ User list + detail + admin notes
- ✅ Subscription list + detail + extend trial + change plan + cancel
- ✅ Apartment list + detail

ฟีเจอร์ที่ยังขาด:
- ⏳ Auto-promote admin
- ⏳ Audit log viewer
- ⏳ User suspend/delete
- ⏳ Apartment delete/transfer
- ⏳ Charts & export CSV
