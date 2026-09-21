# Room Preset API Implementation

**Status:** ✅ Complete  
**Date:** 2026-09-20  
**Subagent:** Backend

---

## Summary

Implemented Phase 1 + 2 + 3 Room Preset API per `docs/feature-room-preset.md`:
- ✅ Preset CRUD (GET/POST/PATCH/DELETE `/api/admin/room-presets`)
- ✅ Bulk room creation (POST `/api/admin/rooms/bulk`)
- ✅ Preset copy logic (rates + options)
- ✅ Ownership enforcement (apartmentId scope)
- ✅ Comprehensive test coverage (26 tests)
- ✅ All validations (unique roomNumber, limit 100, partial failure handling)

---

## Files Changed

### API Routes Created

1. **`app/api/admin/room-presets/route.ts`** (2,015 bytes)
   - `GET /api/admin/room-presets?apartmentId=<id>` — List presets for apartment
   - `POST /api/admin/room-presets` — Create preset with options

2. **`app/api/admin/room-presets/[id]/route.ts`** (2,600 bytes)
   - `PATCH /api/admin/room-presets/[id]` — Update preset fields/options
   - `DELETE /api/admin/room-presets/[id]` — Delete preset

3. **`app/api/admin/rooms/bulk/route.ts`** (4,811 bytes)
   - `POST /api/admin/rooms/bulk` — Bulk room creation
   - Supports `roomNumbers` array or `roomNumberRange` {start, end}
   - Accepts `presetId` (copies rates+options) or manual fields
   - Returns `{created: [{roomNumber, roomId}], failed: [{roomNumber, reason}]}`

### Tests Created

4. **`tests/room-preset.test.ts`** (20,690 bytes)
   - 26 tests covering all API endpoints
   - Ownership enforcement, validation, error cases
   - Bulk creation success/partial failure scenarios

---

## API Design

### Preset CRUD

```http
GET    /api/admin/room-presets?apartmentId=<id>
POST   /api/admin/room-presets
PATCH  /api/admin/room-presets/[id]
DELETE /api/admin/room-presets/[id]
```

**Auth:** All endpoints require `requireOwnerOfApartment(apartmentId)`

**POST/PATCH body:**
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

```http
POST /api/admin/rooms/bulk
```

**Request body (with preset):**
```json
{
  "apartmentId": 1,
  "presetId": 5,
  "roomNumbers": ["201", "202", "203"]
}
```

**Request body (range mode):**
```json
{
  "apartmentId": 1,
  "presetId": 5,
  "roomNumberRange": { "start": 301, "end": 310 }
}
```

**Request body (manual, no preset):**
```json
{
  "apartmentId": 1,
  "roomNumbers": ["101"],
  "roomType": "Standard",
  "baseRent": 3000,
  "waterRate": 20,
  "electricRate": 8,
  "options": [{ "name": "Parking", "price": 500 }]
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

**Status codes:**
- `207` — Partial/full success (some/all rooms created)
- `422` — All rooms failed
- `400` — Validation error
- `403` — Not owner / preset belongs to different apartment
- `404` — Preset not found

---

## Validation Rules

1. **Preset scope:** Preset must belong to the same `apartmentId` as the rooms being created
2. **Room number unique:** Enforced by `@@unique([apartmentId, roomNumber])`
3. **Bulk limit:** Maximum 100 rooms per request
4. **Preset ownership:** Only apartment owner can create/modify/delete presets
5. **Duplicate handling:** Skip duplicate rooms, continue with remaining, report in `failed[]`

---

## Preset Copy Logic

When creating a room from `presetId`:
1. Load preset with `include: { options: true }`
2. Validate `preset.apartmentId === apartmentId`
3. Copy to Room:
   - `roomType`, `baseRent`, `waterRate`, `electricRate`
4. Copy to RoomOption:
   - Create one `RoomOption` row per `RoomPresetOption`
5. **No FK stored:** Room does not reference `presetId` (snapshot pattern)

---

## Test Coverage (26 tests)

### Preset CRUD
- ✅ GET: require apartmentId, owner auth, return presets, empty array
- ✅ POST: require fields, owner auth, create with/without options
- ✅ PATCH: 404 non-existent, owner auth, update fields, update options
- ✅ DELETE: 404 non-existent, owner auth, successful delete

### Bulk Creation
- ✅ Require apartmentId, owner auth
- ✅ Create from preset with roomNumbers array
- ✅ Create from preset with roomNumberRange
- ✅ Partial failure with duplicates (207 status)
- ✅ All rooms fail (422 status)
- ✅ Enforce 100 room limit
- ✅ Create with manual fields (no preset)
- ✅ Require manual fields when no preset
- ✅ Reject preset from different apartment (403)
- ✅ 404 when preset not found

---

## Verification

```bash
$ npm run lint
✓ No TypeScript errors

$ npm test
✓ 114 tests passed (including 26 new room preset tests)
  - tests/room-preset.test.ts: 26 passed
  - All existing tests: 88 passed
```

---

## Edge Cases Handled

| Scenario | Behavior |
|----------|----------|
| Delete preset used by rooms | Rooms unchanged (no FK) |
| Update preset rates | Old rooms unchanged, new rooms use new values |
| Bulk create with all duplicates | Return 422, `failed` array, `created` empty |
| Bulk create partial duplicates | Return 207, skip duplicates, create rest |
| Room number "201.5" or "2A3" | Accepted (roomNumber is String) |
| Preset without options | Create room with empty options array |
| presetId from different apartment | 403 error |
| Bulk limit exceeded (>100) | 400 error |

---

## Schema (Already Migrated by DBA)

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
  id       Int        @id @default(autoincrement())
  presetId Int
  name     String
  price    Float
  preset   RoomPreset @relation(fields: [presetId], references: [id], onDelete: Cascade)
}
```

---

## Not Implemented (Per Scope)

- ❌ UI (frontend subagent responsibility)
- ❌ Deployment (not requested)
- ❌ Docker operations (not requested)
- ❌ Daiyooo Account integration (not in scope)

---

## Next Steps (Recommended for PO)

1. **Frontend implementation:**
   - Preset management UI (`/app/apartments/[id]/presets`)
   - Bulk creation form (`/app/apartments/[id]/rooms/bulk`)
   - Preset selector in single room creation form

2. **End-to-end testing:**
   - Manual QA of preset creation workflow
   - Manual QA of bulk creation with duplicates
   - Verify ownership enforcement in browser

3. **Documentation:**
   - Update API docs with preset endpoints
   - Add preset usage guide for apartment owners
