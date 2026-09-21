# Feature Spec: Room Preset

**สถานะ:** 📋 Planning  
**เป้าหมาย:** ให้เจ้าของหอสร้าง template ห้อง (preset) แล้วใช้ซ้ำตอนเพิ่มห้องใหม่ รวมถึงสร้างห้องทีละหลาย ๆ ห้องได้

---

## ปัญหาที่แก้

ตอนนี้เจ้าของหอต้องกรอกค่าเช่า ค่าน้ำ ค่าไฟ และ options ทุกครั้งที่สร้างห้องใหม่  
ถ้าหอมีห้องหลายสิบห้องที่ค่าเช่าเหมือนกัน (เช่น ชั้น 2 ทั้งชั้นเป็นห้องแอร์ 3,500 บาท) การกรอกซ้ำ ๆ เป็นงานที่ช้าและผิดพลาดง่าย

---

## Solution: Room Preset

### 1. Room Preset คืออะไร

**Template สำหรับห้อง** ที่เจ้าของหอสร้างไว้ล่วงหน้า เก็บค่า:
- **ชื่อ preset** (เช่น "ห้องแอร์ ชั้น 2", "ห้องพัดลม มุม")
- `roomType` (String, optional)
- `baseRent` (Float)
- `waterRate` (Float)
- `electricRate` (Float)
- **Options** (array ของ `{ name, price }` เช่น ค่าส่วนกลาง 200, ค่า internet 300)

**Scope:** preset ผูกต่อ `apartmentId` — แต่ละหอมี preset ของตัวเอง ไม่ share ข้าม apartment

### 2. เมื่อสร้างห้อง → เลือก preset

หน้าเพิ่มห้องมี dropdown/list "เลือกจาก preset" (optional)  
เลือกแล้ว → auto-fill ค่าเช่า/น้ำ/ไฟ/options ลงฟอร์ม  
เจ้าของหอยังแก้ค่าได้ก่อนบันทึกห้อง (preset เป็นแค่ default)

**สิ่งที่บันทึกลง DB:**  
- `Room` + `RoomOption` บันทึกค่าจริง ณ เวลานั้น  
- ไม่เก็บ FK `presetId` ใน Room (เพราะถ้า preset ถูกลบ/แก้ไข ภายหลัง ไม่ควรกระทบห้องเก่าที่สร้างไปแล้ว)

### 3. Bulk room creation

เจ้าของหอสร้างห้องทีละหลาย ๆ ห้องในครั้งเดียว มี 2 mode:

**Mode A: ช่วงเลขห้อง**  
- กรอก: ชั้น 2, เลขห้อง 201–210  
- เลือก preset "ห้องแอร์ ชั้น 2"  
- ระบบสร้าง 10 ห้อง: `201`, `202`, ..., `210` ด้วยค่าจาก preset

**Mode B: รายการเลขห้อง**  
- กรอก/paste: `201, 202, 203, 205, 207` (ข้าม 204, 206)  
- เลือก preset  
- สร้างเฉพาะห้องที่ระบุ

**Validation:**  
- ตรวจ `@@unique([apartmentId, roomNumber])` ใน DB ก่อนสร้าง  
- ถ้าซ้ำ → ไม่สร้างห้องนั้น แต่สร้างห้องอื่นที่ไม่ซ้ำต่อไป + แจ้ง error รายห้องที่ซ้ำ

---

## Data Model

### RoomPreset (ตารางใหม่)

```prisma
model RoomPreset {
  id           Int                @id @default(autoincrement())
  apartmentId  Int
  name         String
  roomType     String?
  baseRent     Float
  waterRate    Float
  electricRate Float
  createdAt    DateTime           @default(now())
  updatedAt    DateTime           @updatedAt
  apartment    Apartment          @relation(fields: [apartmentId], references: [id], onDelete: Cascade)
  options      RoomPresetOption[]

  @@index([apartmentId])
}

model RoomPresetOption {
  id       Int         @id @default(autoincrement())
  presetId Int
  name     String
  price    Float
  preset   RoomPreset  @relation(fields: [presetId], references: [id], onDelete: Cascade)
}
```

**ไม่เพิ่ม FK `presetId` ใน Room** เพราะ:
- ห้องที่สร้างแล้วควรเป็น snapshot ค่า ณ เวลานั้น  
- ถ้า preset ถูกลบหรือแก้ไขภายหลัง → ไม่ควรกระทบห้องเก่า/บิลเก่า

---

## API Endpoints

### Preset CRUD

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/admin/room-presets?apartmentId=<id>` | owner | ดูรายการ preset ของหอ |
| `POST` | `/api/admin/room-presets` | owner | สร้าง preset ใหม่ |
| `PATCH` | `/api/admin/room-presets/[id]` | owner | แก้ preset (ไม่กระทบห้องเก่า) |
| `DELETE` | `/api/admin/room-presets/[id]` | owner | ลบ preset (ไม่กระทบห้องเก่า) |

**Request body สำหรับ POST/PATCH:**
```json
{
  "apartmentId": 1,
  "name": "ห้องแอร์ ชั้น 2",
  "roomType": "แอร์",
  "baseRent": 3500,
  "waterRate": 18,
  "electricRate": 8,
  "options": [
    { "name": "ค่าส่วนกลาง", "price": 200 },
    { "name": "ค่า internet", "price": 300 }
  ]
}
```

### Bulk Room Creation

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/admin/rooms/bulk` | owner | สร้างห้องทีละหลาย ๆ ห้อง |

**Request body:**
```json
{
  "apartmentId": 1,
  "presetId": 5,  // optional — ถ้าไม่ระบุ ต้องส่ง roomType/baseRent/waterRate/electricRate/options มาแทน
  "roomNumbers": ["201", "202", "203", "205", "207"]  // Mode B
  // หรือ
  "roomNumberRange": { "start": 201, "end": 210 }     // Mode A
}
```

**Response:**
```json
{
  "created": [
    { "roomNumber": "201", "roomId": 101 },
    { "roomNumber": "202", "roomId": 102 }
  ],
  "failed": [
    { "roomNumber": "204", "reason": "duplicate" }
  ]
}
```

**Logic:**
1. ตรวจ owner ของ `apartmentId`
2. ถ้ามี `presetId` → ดึงค่าจาก preset
3. Loop สร้างห้อง:
   - ตรวจ `@@unique([apartmentId, roomNumber])`
   - ถ้าซ้ำ → skip + เก็บไว้ใน `failed[]`
   - ถ้าไม่ซ้ำ → สร้าง `Room` + `RoomOption` ตาม preset
4. คืน `{ created, failed }`

---

## UI Flow (Owner)

### จัดการ Preset

**หน้า `/app/apartments/[id]/presets`** (หรือ tab "Preset" ในหน้าหอ)

- แสดงรายการ preset ของหอนี้ (ชื่อ, ค่าเช่า, จำนวน options)
- ปุ่ม "+ สร้าง Preset ใหม่"
- แต่ละ preset มี: แก้ไข / ลบ
- Modal/form สร้าง/แก้ preset:
  - ชื่อ preset
  - ประเภทห้อง (optional)
  - ค่าเช่า / น้ำ / ไฟ
  - Options (+ เพิ่ม / - ลบ)

### สร้างห้องแบบเลือก Preset

**หน้าเพิ่มห้อง `/app/apartments/[id]/rooms/new`**

- เพิ่ม dropdown "เลือกจาก preset" ด้านบน (optional)
- เลือก preset → auto-fill ฟอร์มค่าเช่า/น้ำ/ไฟ/options
- User ยังแก้ได้ก่อนบันทึก
- กด "บันทึก" → สร้าง 1 ห้องตามปกติ

### Bulk Create

**หน้า `/app/apartments/[id]/rooms/bulk`** (หรือปุ่ม "สร้างหลายห้อง")

- **Step 1:** เลือก preset (optional แต่แนะนำ)
- **Step 2:** เลือก mode:
  - [ ] ช่วงเลข: `201` ถึง `210`
  - [ ] รายการ: กรอก/paste `201, 202, 203, 205`
- **Step 3:** แสดงตัวอย่างห้องที่จะสร้าง (เลขห้อง + ค่าจาก preset)
- กด "สร้าง" → เรียก `/api/admin/rooms/bulk`
- แสดงผล: "สร้างสำเร็จ X ห้อง, ซ้ำ/ล้มเหลว Y ห้อง" พร้อมรายการที่ล้มเหลว

---

## Validation & Edge Cases

### Validation

1. **Preset scope:** preset ต้องอยู่ใน `apartmentId` เดียวกับห้องที่จะสร้าง
2. **Room number unique:** ต้องตรวจ `@@unique([apartmentId, roomNumber])` ก่อนสร้างทุกห้อง
3. **Bulk limit:** จำกัดไม่เกิน 100 ห้อง/ครั้ง (ป้องกัน timeout/DB load)
4. **Preset name unique:** ไม่บังคับ unique ใน DB แต่ UI ควรแนะนำไม่ให้ชื่อซ้ำในหอเดียวกัน

### Edge Cases

| สถานการณ์ | พฤติกรรม |
|----------|----------|
| ลบ preset ที่ห้องเคยใช้สร้าง | ห้องเก่ายังอยู่ปกติ (ไม่มี FK) |
| แก้ preset (ราคา/options) | ห้องเก่าไม่เปลี่ยน, ห้องใหม่ใช้ค่าใหม่ |
| Bulk create ห้องซ้ำ | skip ห้องนั้น, สร้างห้องอื่นต่อ, คืน `failed[]` |
| Bulk create เลข 201.5 หรือ 2A3 | ยอมรับ (roomNumber เป็น String) |
| Preset ไม่มี options | สร้างห้องได้ แต่ไม่มี RoomOption |

---

## Implementation Plan

### Phase 1: Preset CRUD
- [ ] Migration: เพิ่ม `RoomPreset`, `RoomPresetOption`
- [ ] API: `/api/admin/room-presets` (GET/POST/PATCH/DELETE)
- [ ] UI: หน้า preset list + modal สร้าง/แก้
- [ ] Tests: preset ownership, cascade delete

### Phase 2: Room creation with preset
- [ ] UI: dropdown เลือก preset ในหน้าเพิ่มห้อง
- [ ] Logic: auto-fill ฟอร์มจาก preset
- [ ] Tests: สร้างห้องจาก preset, แก้ค่าก่อนบันทึก

### Phase 3: Bulk creation
- [ ] API: `/api/admin/rooms/bulk`
- [ ] UI: หน้า bulk create (range/list mode)
- [ ] Validation: unique check, limit 100
- [ ] Tests: bulk success/partial failure, duplicate handling

---

## Known Limitations

- Preset ไม่มี versioning — ถ้าแก้ preset ห้องเก่าจะไม่เปลี่ยนตาม (ตามที่ต้องการ)
- Bulk limit 100 ห้อง/ครั้ง (ถ้าต้องการมากกว่า ต้องสร้างหลายรอบ)
- ไม่รองรับ "อัปเดตห้องเก่าตาม preset" เพราะกระทบบิลที่มีอยู่
