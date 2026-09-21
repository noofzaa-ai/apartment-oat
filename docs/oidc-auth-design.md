# Apartment Management — Auth Rework Design (Daiyooo OIDC + Subscription + Scoped Membership)

สถานะ: draft สำหรับ implementation. ข้อมูลเดิมใน `dev.db` **ลบทิ้งได้** (ออกแบบ schema ใหม่ได้อิสระ).

## หลักการ (ตกลงกับเจ้าของโปรเจกต์)

1. **ทุกคน login ผ่าน Daiyooo Account OIDC** (`account.daiyooo.com`) — ไม่มี username/password หรือ email/PIN เดิมอีก.
2. **Identity หลัก = `(issuer, subject)`** จาก Daiyooo (ห้าม map ด้วย email). 1 User = 1 Daiyooo sub.
3. **Subscription ผูกกับ User (คนจ่าย)** — ทดลองฟรี 30 วัน. User ที่ subscription active/trial = **apartment admin** (สร้าง apartment + ห้องได้). ไม่มี subscription = เป็นได้แค่ tenant.
4. **สิทธิ์ scoped ต่อ apartment ผ่าน Membership** — คนเดียวเป็นเจ้าของ apartment ตัวเองได้ และเป็น tenant ใน apartment คนอื่นได้พร้อมกัน โดยสิทธิ์ไม่ข้าม apartment.
5. **Pricing ตามจำนวนห้อง** = คิดจาก `COUNT(rooms)` รวมทุก apartment ของ User (billing logic เฟสหลัง; schema เฟสนี้แค่รองรับผ่าน `roomQuota` nullable).
6. **OIDC เป็นแค่วิธี authenticate** — หลัง verify สำเร็จ ออก **local session เดิม (`apt_session`, iron-session)** ต่อ. ไม่แชร์ Account cookie/token.

## Schema ใหม่ (Prisma / SQLite) — ทิศทาง

```
User               id, createdAt, displayName?, email?(mutable snapshot), emailVerified?, avatarUrl?
ExternalIdentity   id, provider="daiyooo-account", issuer, subject, userId  @@unique([issuer, subject])
Subscription       id, userId(unique), status(TRIAL|ACTIVE|EXPIRED), trialEndsAt, currentPeriodEnd?, roomQuota?(nullable→pricing เฟสหลัง)
Apartment          id, ownerUserId, name, address?, createdAt   (เดิมชื่อ Location)
Room               id, apartmentId, roomNumber, roomType?, baseRent, waterRate, electricRate  @@unique([apartmentId, roomNumber])
Membership         id, userId, apartmentId, role(OWNER|TENANT), roomId?(unique, สำหรับ tenant→ห้อง), createdAt  @@unique([userId, apartmentId])
InviteCode         id, code(unique), apartmentId, roomId, expiresAt, usedByUserId?, usedAt?, createdByUserId
OidcTransaction    id, stateHash(unique), nonce, codeVerifier, redirectUri, returnTo, createdAt, used
MeterReading/Bill/BillLineItem/RoomOption — คงเดิม แต่ FK ชี้ Room/Apartment ใหม่
```

หมายเหตุ mapping จากของเดิม: `Location`→`Apartment`, `Admin`/`Tenant`→ลบ (แทนด้วย `User`+`Membership`). Bill/Meter ยังผูก `roomId` เหมือนเดิม.

## สิทธิ์ (authorization)

- **สร้าง apartment/ห้อง**: ต้องมี Subscription status ∈ {TRIAL, ACTIVE} (trial ยังไม่หมด) → ผู้ใช้กลายเป็น OWNER membership ของ apartment ที่สร้าง.
- **จัดการ apartment X** (ห้อง/มิเตอร์/บิล/เชิญ tenant): ต้องมี Membership(role=OWNER) ใน apartment X **เท่านั้น** — ไม่พอแค่มี subscription. กัน owner ของหอ A ไปยุ่งหอ B.
- **tenant ดูบิล/แจ้งชำระ**: ต้องมี Membership(role=TENANT, roomId=…) ใน apartment นั้น. เห็นเฉพาะห้องตัวเองใน apartment นั้น.
- ทุก query scope ด้วย `apartmentId` + `userId`/`roomId` จาก session-derived membership เสมอ (กันข้ามหอ/ข้ามผู้ใช้).

## Flow

### Login (ทุก role)
`GET /api/auth/oidc/login?return_to=/…`
→ สร้าง state/nonce/code_verifier (CSPRNG), เก็บ `OidcTransaction` (TTL ≤10 นาที, ผูก browser ผ่าน httpOnly cookie ที่อ้าง txn id)
→ redirect ไป `authorization_endpoint` (PKCE S256, scope `openid profile email`).

### Callback
`GET /api/auth/oidc/callback?code&state&iss`
→ ตรวจ state (constant-time) + txn ยังไม่ใช้/ไม่หมดอายุ, ตรวจ `iss` exact, mark txn used (atomic กัน replay)
→ exchange code (server-side, ไม่มี client_secret) → ตรวจ id_token (JWKS EdDSA, iss=`https://account.daiyooo.com/api/auth`, aud=client_id, nonce, exp/iat±60s, sub ไม่ว่าง)
→ upsert User ผ่าน `(issuer, subject)`; update profile snapshot (email/name/avatar)
→ ออก `apt_session` (rotate) เก็บ `{ userId }` — role/สิทธิ์คำนวณจาก Subscription + Membership ตอน request ไม่ฝังใน cookie
→ redirect ไป `return_to` (validate internal path เท่านั้น).

### Subscription gate
- login แล้วยังไม่มี Subscription → หน้า "เริ่มทดลองใช้ฟรี 30 วัน" (สร้าง Subscription status=TRIAL, trialEndsAt=+30d) เพื่อปลดสิทธิ์สร้าง apartment.
- trial หมด/EXPIRED → สร้าง apartment/ห้องใหม่ไม่ได้ (อ่าน/ดูของเดิมยังได้); tenant ใน apartment นั้นยังใช้งานได้ (การตัดสิทธิ์ระดับ hard-freeze = เฟสหลัง).

### Join apartment (tenant)
- OWNER สร้างห้อง → ออก `InviteCode` ผูก `roomId` เจาะจง (หมดอายุ + ใช้ครั้งเดียว).
- tenant login (OIDC) → กรอก code → ระบบสร้าง Membership(role=TENANT, apartmentId, roomId) ผูก User↔ห้องทันที, mark code used. (1 ห้อง 1 tenant — roomId unique ใน Membership).

## Pricing-by-room (เฟสหลัง — จุดเสียบ)
- `roomCount(userId) = COUNT(Room) join Apartment WHERE ownerUserId=userId`.
- Quota mode: ตอนสร้างห้องเช็ค `roomCount < subscription.roomQuota` (ถ้า quota != null).
- Usage mode: metered จาก roomCount ต่อรอบบิล.
- schema เฟสนี้เตรียม `Subscription.roomQuota` (nullable) + owner scoping ไว้แล้ว → เพิ่ม billing engine ทีหลังโดยไม่แก้ data model.

## Env contract (เพิ่ม)
```
DAIYOOO_OIDC_ISSUER=https://account.daiyooo.com/api/auth
DAIYOOO_OIDC_DISCOVERY_URL=https://account.daiyooo.com/.well-known/openid-configuration
DAIYOOO_OIDC_CLIENT_ID=<public client id ที่ register กับ Daiyooo>
DAIYOOO_OIDC_REDIRECT_URI=https://apartments.daiyooo.com/api/auth/oidc/callback
DAIYOOO_OIDC_SCOPES="openid profile email"
# ไม่มี client_secret (public client, token_endpoint_auth_method=none, PKCE required)
SESSION_PASSWORD=<≥32 chars, product-owned, ห้ามใช้ BETTER_AUTH_SECRET>  # fail-fast ใน production
```
ยึด discovery/JWKS ตาม spec `daiyooo_account/docs/product-login-integration-spec.md` (EdDSA only, issuer byte-for-byte, conformance gap: metadata ไม่ประกาศ `none` แต่ token endpoint รับ public client — ยึด registration).

## แผนเฟส
1. **OIDC foundation** (เฟสนี้): schema ใหม่, env contract, lib OIDC client (openid-client/jose), `/api/auth/oidc/login|callback|logout`, ออก apt_session, verify build + flow.
2. Subscription + trial 30 วัน + gate สร้าง apartment.
3. Invite code ต่อห้อง + tenant join.
4. Migrate หน้า/route เดิมไป membership-scoped, ปรับ proxy.ts/requireAdmin, ลบ password/PIN.
5. Pricing-by-room billing engine.

## Security (ยึด spec)
maintained OIDC lib (ไม่ implement JOSE เอง) · code เท่านั้น + PKCE S256 · state/nonce/verifier one-time bound browser · exact redirect_uri · pin issuer + verify signature/aud/nonce/time/sub · fail closed · least privilege scopes · redact logs (ไม่ log code/verifier/token/state/nonce) · session fixation/CSRF/open-redirect protection.
