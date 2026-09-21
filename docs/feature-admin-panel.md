# Feature Spec: Admin Panel (Platform Management)

**สถานะ:** 📋 Planning  
**เป้าหมาย:** หน้า /admin สำหรับ platform admin จัดการ users, apartments, subscriptions, และระบบทั้งหมด

---

## Problem Statement

ตอนนี้ยังไม่มีหน้า admin สำหรับ platform owner/operator ในการ:
- ดูภาพรวมระบบ (จำนวน users, apartments, revenue)
- จัดการ users (ดูข้อมูล, suspend, delete)
- จัดการ subscriptions (ดูสถานะ, ขยายอายุ, ยกเลิก)
- จัดการ apartments และห้อง
- Support tickets / ตอบปัญหาผู้ใช้
- ระบบ audit logs

---

## Solution: Platform Admin Panel

### Access Control

**Admin Role:**
- เพิ่ม `User.role` field: `USER` (default) | `PLATFORM_ADMIN` | `SUPER_ADMIN`
- `PLATFORM_ADMIN` = ดูข้อมูล + จัดการ subscriptions + support
- `SUPER_ADMIN` = ทำได้ทุกอย่าง รวม delete users, apartments, access all data

**Access Gate:**
- หน้าทั้งหมดใน `/admin/*` ต้องมี `User.role IN ['PLATFORM_ADMIN', 'SUPER_ADMIN']`
- Middleware: `requirePlatformAdmin()` ตรวจ session + role
- 403 ถ้าไม่มีสิทธิ์

**การสร้าง admin แรก:**
- ENV: `PLATFORM_ADMIN_EMAILS=admin@daiyooo.com,owner@example.com`
- Auto-promote user ที่ login ด้วย email ตรงกับ list นี้
- หรือ CLI: `npm run promote-admin -- user@example.com`

---

## Dashboard Overview (`/admin`)

### Metrics Cards (Top)

| Metric | Description | Period |
|--------|-------------|--------|
| **Total Users** | จำนวน users ทั้งหมด | All time |
| **Active Subscriptions** | Subscription status=ACTIVE | Current |
| **Trial Users** | Subscription status=TRIAL | Current |
| **Total Apartments** | จำนวนหอพักทั้งหมด | All time |
| **Total Rooms** | จำนวนห้องทั้งหมด | All time |
| **MRR** | Monthly Recurring Revenue | Current month |
| **ARR** | Annual Recurring Revenue | Projected |

### Charts

**User Growth (Last 6 Months)**
- Line chart: new users per month
- Stacked area: user status (trial/active/expired)

**Subscription Breakdown**
- Pie chart: แยกตาม plan (Trial/Starter/Standard/Pro)
- Bar chart: billing cycle (Monthly/Yearly)

**Revenue Trend**
- Line chart: MRR over time
- Bar chart: revenue by plan

### Recent Activity (Bottom)

- **New Sign-ups:** 10 ล่าสุด (user, email, created date)
- **Subscriptions Expiring Soon:** 7 วันข้างหน้า
- **Support Tickets:** unresolved tickets

---

## User Management (`/admin/users`)

### User List

**Table Columns:**
| Column | Description | Sortable |
|--------|-------------|----------|
| User ID | `#12345` | ✅ |
| Display Name | ชื่อแสดง | ✅ |
| Email | email address | ✅ |
| Role | USER / PLATFORM_ADMIN / SUPER_ADMIN | ✅ |
| Subscription | Current plan + status | ✅ |
| Apartments | จำนวนหอ | ✅ |
| Rooms | จำนวนห้องทั้งหมด | ✅ |
| Created | วันที่สร้าง | ✅ |
| Last Login | ล่าสุด | ✅ |
| Status | Active / Suspended | ✅ |
| Actions | View / Edit / Suspend | - |

**Filters:**
- Subscription status: All / Trial / Active / Expired / None
- Plan: All / Trial / Starter / Standard / Pro
- Role: All / User / Platform Admin / Super Admin
- Status: All / Active / Suspended
- Date range: created date

**Search:**
- ค้นหาด้วย: user ID, email, display name

**Bulk Actions:**
- Export CSV (filtered users)
- Send notification (email)

### User Detail (`/admin/users/[id]`)

**User Info Section:**
- Display name, email, email verified
- Avatar
- User ID, External Identity (issuer, subject)
- Role (editable by SUPER_ADMIN)
- Status: Active / Suspended (toggle button)
- Created date, last login date

**Subscription Section:**
- Current plan + status
- Billing cycle
- Trial ends at / Period end
- Room quota snapshot
- Action buttons:
  - "Extend Trial" (+7/14/30 days)
  - "Change Plan"
  - "Cancel Subscription"
  - "Refund" (future)

**Apartments Section:**
- List apartments owned by this user
  - Apartment name, address
  - Room count
  - Active tenants count
  - Created date
- Link to apartment detail

**Membership Section:**
- List all memberships (OWNER + TENANT)
  - Apartment name
  - Role
  - Room (if tenant)
  - Created date

**Activity Log Section:**
- Recent actions (login, create apartment, create room, billing events)
- Paginated table

**Admin Actions:**
- "Impersonate User" (login as this user — SUPER_ADMIN only)
- "Suspend Account" (block login + hide data)
- "Delete Account" (SUPER_ADMIN only, requires confirmation)
- "Send Email"
- "Add Note" (admin notes, not visible to user)

---

## Subscription Management (`/admin/subscriptions`)

### Subscription List

**Table Columns:**
| Column | Description |
|--------|-------------|
| Sub ID | `#123` |
| User | Display name + email |
| Plan | TRIAL / STARTER / STANDARD / PRO |
| Status | TRIAL / ACTIVE / EXPIRED / CANCELED |
| Billing Cycle | MONTHLY / YEARLY |
| Room Count | Current / Quota |
| MRR | Monthly revenue |
| Period Start | Start date |
| Period End | End date |
| Days Left | วันเหลือ |
| Actions | View / Edit / Cancel |

**Filters:**
- Plan: All / Trial / Starter / Standard / Pro
- Status: All / Trial / Active / Expired / Canceled
- Billing cycle: All / Monthly / Yearly
- Expiring soon: <7 days / <14 days / <30 days

**Bulk Actions:**
- Export CSV
- Extend trial (bulk)
- Send renewal reminder

### Subscription Detail (`/admin/subscriptions/[id]`)

**Subscription Info:**
- User (link)
- Plan + status
- Billing cycle
- Period dates
- Room quota snapshot

**Billing History:**
- Payment records (ถ้ามี payment gateway)
- Invoice links

**Admin Actions:**
- "Extend Trial" (+days)
- "Change Plan"
- "Cancel Subscription"
- "Pause Subscription" (future)
- "Issue Refund" (future)

---

## Apartment Management (`/admin/apartments`)

### Apartment List

**Table Columns:**
| Column | Description |
|--------|-------------|
| ID | Apartment ID |
| Name | ชื่อหอ |
| Owner | User (name + email) |
| Address | ที่อยู่ |
| Room Count | จำนวนห้อง |
| Tenant Count | จำนวน tenant |
| Unpaid Bills | บิลค้างชำระ |
| Created | วันที่สร้าง |
| Actions | View / Edit / Delete |

**Filters:**
- Owner subscription: All / Trial / Active / Expired
- Room count range: 0-10 / 11-25 / 26-50 / 51+
- Has unpaid bills: Yes / No
- Date range

**Search:**
- ค้นหาด้วย: apartment name, owner email, address

### Apartment Detail (`/admin/apartments/[id]`)

**Apartment Info:**
- Name, address
- Owner (link to user detail)
- Created date

**Rooms Section:**
- List all rooms
  - Room number, room type
  - Base rent, water rate, electric rate
  - Tenant (if any)
  - Current bill status
- Export rooms CSV

**Tenants Section:**
- List all tenants (Membership role=TENANT)
  - User name, email
  - Room
  - Joined date
  - Unpaid bills count

**Bills Section:**
- List all bills
  - Room, period
  - Total amount
  - Payment status
  - Paid at / submitted at

**Admin Actions:**
- "Delete Apartment" (SUPER_ADMIN only, cascade delete)
- "Transfer Ownership" (change owner)
- "Export All Data" (apartment + rooms + bills + tenants CSV)

---

## Support & Logs

### Support Tickets (`/admin/support`) — Future

- User-submitted tickets
- Status: New / In Progress / Resolved / Closed
- Priority: Low / Medium / High / Critical
- Assign to admin
- Internal notes
- Response templates

### Audit Logs (`/admin/logs`)

**Log Categories:**
- User actions (login, logout, signup)
- Admin actions (suspend user, change plan, delete apartment)
- Billing events (subscription created/renewed/canceled)
- System events (errors, API failures)

**Table Columns:**
| Column | Description |
|--------|-------------|
| Timestamp | Date + time |
| Category | User / Admin / Billing / System |
| Action | login / suspend_user / create_subscription |
| User | Who performed |
| Target | Target user/apartment/subscription |
| IP Address | IP |
| Details | JSON payload |

**Filters:**
- Category
- Action type
- User ID
- Date range

**Search:**
- Free text search in details

---

## Data Model Changes

### User Table (แก้ไข)

```prisma
model User {
  id                Int                @id @default(autoincrement())
  displayName       String?
  email             String?
  emailVerified     Boolean            @default(false)
  avatarUrl         String?
  role              String             @default("USER") // USER | PLATFORM_ADMIN | SUPER_ADMIN
  status            String             @default("ACTIVE") // ACTIVE | SUSPENDED | DELETED
  lastLoginAt       DateTime?
  createdAt         DateTime           @default(now())
  updatedAt         DateTime           @updatedAt
  // ... existing relations
}
```

**Changes:**
- เพิ่ม `role` field (default "USER")
- เพิ่ม `status` field (default "ACTIVE")
- เพิ่ม `lastLoginAt` field

### AdminNote Table (ตารางใหม่)

```prisma
model AdminNote {
  id          Int      @id @default(autoincrement())
  targetType  String   // USER | APARTMENT | SUBSCRIPTION
  targetId    Int
  adminUserId Int
  note        String
  createdAt   DateTime @default(now())
  admin       User     @relation(fields: [adminUserId], references: [id])
  
  @@index([targetType, targetId])
  @@index([adminUserId])
}
```

### AuditLog Table (ตารางใหม่)

```prisma
model AuditLog {
  id         Int      @id @default(autoincrement())
  category   String   // USER | ADMIN | BILLING | SYSTEM
  action     String   // login | suspend_user | create_subscription
  userId     Int?
  targetType String?  // USER | APARTMENT | SUBSCRIPTION
  targetId   Int?
  ipAddress  String?
  userAgent  String?
  details    String?  // JSON
  createdAt  DateTime @default(now())
  
  @@index([category, createdAt])
  @@index([userId])
  @@index([targetType, targetId])
}
```

---

## API Endpoints

### Dashboard

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/dashboard/stats` | Overview metrics |
| GET | `/api/admin/dashboard/charts/user-growth` | User growth data |
| GET | `/api/admin/dashboard/charts/revenue` | Revenue trend |
| GET | `/api/admin/dashboard/recent-signups` | Recent users |

### Users

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/users` | List users (paginated, filtered) |
| GET | `/api/admin/users/[id]` | User detail |
| PATCH | `/api/admin/users/[id]` | Update user (role, status) |
| DELETE | `/api/admin/users/[id]` | Delete user (SUPER_ADMIN) |
| POST | `/api/admin/users/[id]/suspend` | Suspend user |
| POST | `/api/admin/users/[id]/unsuspend` | Unsuspend user |
| POST | `/api/admin/users/[id]/impersonate` | Impersonate (SUPER_ADMIN) |
| POST | `/api/admin/users/[id]/notes` | Add admin note |
| GET | `/api/admin/users/[id]/notes` | Get notes |

### Subscriptions

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/subscriptions` | List subscriptions |
| GET | `/api/admin/subscriptions/[id]` | Subscription detail |
| PATCH | `/api/admin/subscriptions/[id]` | Update subscription |
| POST | `/api/admin/subscriptions/[id]/extend-trial` | Extend trial |
| POST | `/api/admin/subscriptions/[id]/change-plan` | Change plan |
| POST | `/api/admin/subscriptions/[id]/cancel` | Cancel subscription |

### Apartments

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/apartments` | List apartments |
| GET | `/api/admin/apartments/[id]` | Apartment detail |
| DELETE | `/api/admin/apartments/[id]` | Delete apartment (SUPER_ADMIN) |
| POST | `/api/admin/apartments/[id]/transfer` | Transfer ownership |

### Logs

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/logs` | Audit logs (paginated, filtered) |
| POST | `/api/admin/logs` | Create log entry (internal) |

---

## Authorization Guards

### Middleware Hierarchy

```typescript
// lib/admin-auth.ts

export function requirePlatformAdmin() {
  // Check session + User.role IN ['PLATFORM_ADMIN', 'SUPER_ADMIN']
  // 403 if not authorized
}

export function requireSuperAdmin() {
  // Check session + User.role = 'SUPER_ADMIN'
  // 403 if not authorized
}

export function checkAdminPermission(action: string) {
  // PLATFORM_ADMIN: read-only + subscription management
  // SUPER_ADMIN: full access
}
```

**Permission Matrix:**

| Action | PLATFORM_ADMIN | SUPER_ADMIN |
|--------|----------------|-------------|
| View dashboard | ✅ | ✅ |
| View users | ✅ | ✅ |
| View subscriptions | ✅ | ✅ |
| View apartments | ✅ | ✅ |
| Edit user role | ❌ | ✅ |
| Suspend user | ✅ | ✅ |
| Delete user | ❌ | ✅ |
| Extend trial | ✅ | ✅ |
| Change plan | ✅ | ✅ |
| Impersonate user | ❌ | ✅ |
| Delete apartment | ❌ | ✅ |
| View logs | ✅ | ✅ |

---

## UI/UX Guidelines

### Layout

**Admin Layout (`/admin/*`):**
- Dedicated admin layout (dark theme)
- Sidebar navigation:
  - Dashboard
  - Users
  - Subscriptions
  - Apartments
  - Support (future)
  - Logs
  - Settings
- Top bar:
  - "Exit Admin" → back to `/app`
  - Current admin user
  - Notifications

**Style:**
- Professional dark theme (ต่างจาก owner/tenant portal)
- Dense tables (more data per screen)
- Power user optimized (keyboard shortcuts)

### Data Tables

- Server-side pagination (default 25/page)
- Column sorting
- Inline filters
- Quick actions (icon buttons)
- Bulk selection
- Export button

### Dangerous Actions

- Require confirmation modal
- "Delete" = type "DELETE" to confirm
- Audit log every destructive action

---

## Security & Privacy

### Access Logs

- Log every admin action
- Include: admin user, action, target, timestamp, IP
- Immutable audit trail

### Data Privacy

- Admins see all user data (necessary for support)
- Redact sensitive data in logs (passwords, tokens)
- GDPR: user can request data export/deletion

### Impersonation

- Only SUPER_ADMIN
- Logged prominently in audit log
- Banner shown to admin during impersonation
- Auto-logout after 30 minutes

---

## Implementation Plan

### Phase 1: Foundation (Week 1)
- [ ] DBA: Migration User.role, User.status, AdminNote, AuditLog
- [ ] Backend: requirePlatformAdmin() middleware
- [ ] Backend: Audit log helper functions
- [ ] Backend: /api/admin/dashboard/stats
- [ ] Frontend: /admin layout + sidebar
- [ ] Frontend: /admin dashboard (basic metrics)
- [ ] Deploy: Set PLATFORM_ADMIN_EMAILS in env

### Phase 2: User Management (Week 2)
- [ ] Backend: /api/admin/users (list, detail, update, suspend)
- [ ] Frontend: /admin/users list page
- [ ] Frontend: /admin/users/[id] detail page
- [ ] Backend: Admin notes API
- [ ] Tests: authorization guards, suspend/unsuspend

### Phase 3: Subscription Management (Week 2)
- [ ] Backend: /api/admin/subscriptions (list, detail, extend, change plan)
- [ ] Frontend: /admin/subscriptions list + detail
- [ ] Frontend: Extend trial modal
- [ ] Tests: subscription admin actions

### Phase 4: Apartment Management (Week 3)
- [ ] Backend: /api/admin/apartments (list, detail, delete, transfer)
- [ ] Frontend: /admin/apartments list + detail
- [ ] Frontend: Transfer ownership modal
- [ ] Tests: apartment admin actions

### Phase 5: Logs & Audit (Week 3)
- [ ] Backend: /api/admin/logs
- [ ] Frontend: /admin/logs page
- [ ] Backend: Integrate audit log into all admin actions
- [ ] Tests: audit log creation, filtering

### Phase 6: Polish (Week 4)
- [ ] Frontend: Charts (user growth, revenue)
- [ ] Frontend: Export CSV all pages
- [ ] Frontend: Bulk actions
- [ ] CLI: promote-admin script
- [ ] Docs: Admin user guide
- [ ] Tests: E2E admin workflows

---

## Future Enhancements

### Phase 7: Support System
- User-submitted tickets
- In-app chat
- Canned responses
- Ticket assignment

### Phase 8: Advanced Analytics
- Cohort analysis
- Churn prediction
- Revenue forecasting
- Custom reports

### Phase 9: System Health
- Server metrics (CPU, memory, DB)
- Error tracking
- Performance monitoring
- Alerting

---

## Known Limitations

- Admin panel ยังไม่มี 2FA/MFA (ควรเพิ่มสำหรับ production)
- Impersonation ยังไม่มี session recording
- Audit log ยังไม่มี retention policy (เก็บตลกาล?)
- Export CSV limit 10,000 rows

---

## Success Metrics

- ✅ Admin response time < 1 hour (support)
- ✅ Zero unauthorized access (audit log clean)
- ✅ Revenue visibility (real-time MRR/ARR)
- ✅ User insight (churn, growth trends)
