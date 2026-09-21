import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────
const mockPrisma = vi.hoisted(() => ({
  apartment: { findFirst: vi.fn() },
  subscription: { findUnique: vi.fn() },
  plan: { findMany: vi.fn() },
  roomPreset: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  roomPresetOption: { deleteMany: vi.fn() },
  room: {
    findUnique: vi.fn(),
    create: vi.fn(),
    count: vi.fn(),
  },
}));

const mockGetSession = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

vi.mock("@/lib/session", () => ({
  getSession: () => mockGetSession(),
}));

function setUser(userId: number | null) {
  mockGetSession.mockResolvedValue({ userId: userId ?? undefined });
}

function mockOwnerOf(apartmentId: number, userId: number) {
  mockPrisma.apartment.findFirst.mockImplementation((args: any) => {
    if (args.where.id === apartmentId) {
      return Promise.resolve({ id: apartmentId });
    }
    return Promise.resolve(null);
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  
  // Re-setup mocks after clear
  mockPrisma.subscription.findUnique.mockImplementation((args: any) => {
    const queryUserId = args?.where?.userId;
    if (queryUserId !== undefined) {
      return Promise.resolve({
        id: 1,
        userId: queryUserId,
        planCode: 'STANDARD',
        status: 'ACTIVE',
        Plan: {
          code: 'STANDARD',
          features: JSON.stringify(['room_preset', 'bulk_create', 'export_csv', 'dashboard']),
        },
      });
    }
    return Promise.resolve(null);
  });
  
  mockPrisma.plan.findMany.mockResolvedValue([
    {
      id: 'FREE',
      name: 'Free',
      features: ['basic'],
      isActive: true,
      sortOrder: 1,
    },
    {
      id: 'STANDARD',
      name: 'Standard',
      features: ['room_preset', 'tenant_api', 'billing'],
      isActive: true,
      sortOrder: 2,
    },
  ]);
  
  // Mock room.count to return 0 (quota checks pass by default)
  mockPrisma.room.count.mockResolvedValue(0);
});

// ── Preset CRUD Tests ──────────────────────────────────────────────────

describe("GET /api/admin/room-presets", () => {
  let GET: (req: NextRequest) => Promise<Response>;

  beforeEach(async () => {
    const module = await import("@/app/api/admin/room-presets/route");
    GET = module.GET;
  });

  it("should require apartmentId parameter", async () => {
    setUser(1);
    const req = new NextRequest("http://localhost/api/admin/room-presets");
    const res = await GET(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("apartmentId");
  });

  it("should require owner authentication", async () => {
    setUser(1);
    mockPrisma.apartment.findFirst.mockResolvedValue(null); // not owner
    const req = new NextRequest("http://localhost/api/admin/room-presets?apartmentId=5");
    const res = await GET(req);
    expect(res.status).toBe(403);
  });

  it("should return presets for apartment owner", async () => {
    setUser(10);
    mockOwnerOf(5, 10);
    mockPrisma.roomPreset.findMany.mockResolvedValue([
      {
        id: 1,
        apartmentId: 5,
        name: "ห้องแอร์ ชั้น 2",
        roomType: "แอร์",
        baseRent: 3500,
        waterRate: 18,
        electricRate: 8,
        RoomPresetOption: [
          { id: 1, name: "ค่าส่วนกลาง", price: 200 },
          { id: 2, name: "internet", price: 300 },
        ],
      },
    ]);

    const req = new NextRequest("http://localhost/api/admin/room-presets?apartmentId=5");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(1);
    expect(body[0].name).toBe("ห้องแอร์ ชั้น 2");
    expect(body[0].RoomPresetOption).toHaveLength(2);
  });

  it("should return empty array when no presets exist", async () => {
    setUser(10);
    mockOwnerOf(5, 10);
    mockPrisma.roomPreset.findMany.mockResolvedValue([]);

    const req = new NextRequest("http://localhost/api/admin/room-presets?apartmentId=5");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual([]);
  });
});

describe("POST /api/admin/room-presets", () => {
  let POST: (req: NextRequest) => Promise<Response>;

  beforeEach(async () => {
    const module = await import("@/app/api/admin/room-presets/route");
    POST = module.POST;
  });

  it("should require all mandatory fields", async () => {
    setUser(1);
    const req = new NextRequest("http://localhost/api/admin/room-presets", {
      method: "POST",
      body: JSON.stringify({ apartmentId: 5, name: "Test" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("ไม่ครบถ้วน");
  });

  it("should require owner authentication", async () => {
    setUser(1);
    mockPrisma.apartment.findFirst.mockResolvedValue(null);
    const req = new NextRequest("http://localhost/api/admin/room-presets", {
      method: "POST",
      body: JSON.stringify({
        apartmentId: 5,
        name: "Test",
        baseRent: 3000,
        waterRate: 18,
        electricRate: 8,
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it("should create preset with options", async () => {
    setUser(10);
    mockOwnerOf(5, 10);
    mockPrisma.roomPreset.create.mockResolvedValue({
      id: 99,
      apartmentId: 5,
      name: "ห้องพัดลม",
      roomType: "พัดลม",
      baseRent: 2500,
      waterRate: 18,
      electricRate: 8,
      RoomPresetOption: [{ id: 1, name: "ค่าส่วนกลาง", price: 150 }],
    });

    const req = new NextRequest("http://localhost/api/admin/room-presets", {
      method: "POST",
      body: JSON.stringify({
        apartmentId: 5,
        name: "ห้องพัดลม",
        roomType: "พัดลม",
        baseRent: 2500,
        waterRate: 18,
        electricRate: 8,
        options: [{ name: "ค่าส่วนกลาง", price: 150 }],
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.id).toBe(99);
    expect(body.name).toBe("ห้องพัดลม");
    expect(body.RoomPresetOption).toHaveLength(1);

    expect(mockPrisma.roomPreset.create).toHaveBeenCalledWith({
      data: {
        apartmentId: 5,
        name: "ห้องพัดลม",
        roomType: "พัดลม",
        baseRent: 2500,
        waterRate: 18,
        electricRate: 8,
        RoomPresetOption: {
          create: [{ name: "ค่าส่วนกลาง", price: 150 }],
        },
      },
      include: { RoomPresetOption: true },
    });
  });

  it("should create preset without options", async () => {
    setUser(10);
    mockOwnerOf(5, 10);
    mockPrisma.roomPreset.create.mockResolvedValue({
      id: 100,
      apartmentId: 5,
      name: "ห้องมาตรฐาน",
      roomType: null,
      baseRent: 3000,
      waterRate: 20,
      electricRate: 8,
      RoomPresetOption: [],
    });

    const req = new NextRequest("http://localhost/api/admin/room-presets", {
      method: "POST",
      body: JSON.stringify({
        apartmentId: 5,
        name: "ห้องมาตรฐาน",
        baseRent: 3000,
        waterRate: 20,
        electricRate: 8,
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.RoomPresetOption).toEqual([]);
  });
});

describe("PATCH /api/admin/room-presets/[id]", () => {
  let PATCH: (req: NextRequest, ctx: any) => Promise<Response>;

  beforeEach(async () => {
    const module = await import("@/app/api/admin/room-presets/[id]/route");
    PATCH = module.PATCH;
  });

  it("should return 404 when preset does not exist", async () => {
    setUser(10);
    mockPrisma.roomPreset.findUnique.mockResolvedValue(null);

    const req = new NextRequest("http://localhost/api/admin/room-presets/999", {
      method: "PATCH",
      body: JSON.stringify({ name: "Updated" }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: "999" }) });
    expect(res.status).toBe(404);
  });

  it("should require owner authentication", async () => {
    setUser(1);
    mockPrisma.roomPreset.findUnique.mockResolvedValue({ apartmentId: 5 });
    mockPrisma.apartment.findFirst.mockResolvedValue(null);

    const req = new NextRequest("http://localhost/api/admin/room-presets/10", {
      method: "PATCH",
      body: JSON.stringify({ name: "Updated" }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: "10" }) });
    expect(res.status).toBe(403);
  });

  it("should update preset fields", async () => {
    setUser(10);
    mockPrisma.roomPreset.findUnique.mockResolvedValue({ apartmentId: 5 });
    mockOwnerOf(5, 10);
    mockPrisma.roomPreset.update.mockResolvedValue({
      id: 10,
      apartmentId: 5,
      name: "Updated Name",
      roomType: "Suite",
      baseRent: 5000,
      waterRate: 22,
      electricRate: 10,
      RoomPresetOption: [],
    });

    const req = new NextRequest("http://localhost/api/admin/room-presets/10", {
      method: "PATCH",
      body: JSON.stringify({
        name: "Updated Name",
        roomType: "Suite",
        baseRent: 5000,
      }),
    });

    const res = await PATCH(req, { params: Promise.resolve({ id: "10" }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.name).toBe("Updated Name");
  });

  it("should update options when provided", async () => {
    setUser(10);
    mockPrisma.roomPreset.findUnique.mockResolvedValue({ apartmentId: 5 });
    mockOwnerOf(5, 10);
    mockPrisma.roomPreset.update.mockResolvedValue({
      id: 10,
      apartmentId: 5,
      name: "Preset",
      roomType: null,
      baseRent: 3000,
      waterRate: 18,
      electricRate: 8,
      RoomPresetOption: [{ id: 99, name: "New Option", price: 500 }],
    });

    const req = new NextRequest("http://localhost/api/admin/room-presets/10", {
      method: "PATCH",
      body: JSON.stringify({
        options: [{ name: "New Option", price: 500 }],
      }),
    });

    const res = await PATCH(req, { params: Promise.resolve({ id: "10" }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.RoomPresetOption).toHaveLength(1);
    expect(mockPrisma.roomPreset.update).toHaveBeenCalledWith({
      where: { id: 10 },
      data: {
        RoomPresetOption: {
          deleteMany: {},
          create: [{ name: "New Option", price: 500 }],
        },
      },
      include: { RoomPresetOption: true },
    });
  });
});

describe("DELETE /api/admin/room-presets/[id]", () => {
  let DELETE: (req: NextRequest, ctx: any) => Promise<Response>;

  beforeEach(async () => {
    const module = await import("@/app/api/admin/room-presets/[id]/route");
    DELETE = module.DELETE;
  });

  it("should return 404 when preset does not exist", async () => {
    setUser(10);
    mockPrisma.roomPreset.findUnique.mockResolvedValue(null);

    const req = new NextRequest("http://localhost/api/admin/room-presets/999", {
      method: "DELETE",
    });
    const res = await DELETE(req, { params: Promise.resolve({ id: "999" }) });
    expect(res.status).toBe(404);
  });

  it("should require owner authentication", async () => {
    setUser(1);
    mockPrisma.roomPreset.findUnique.mockResolvedValue({ apartmentId: 5 });
    mockPrisma.apartment.findFirst.mockResolvedValue(null);

    const req = new NextRequest("http://localhost/api/admin/room-presets/10", {
      method: "DELETE",
    });
    const res = await DELETE(req, { params: Promise.resolve({ id: "10" }) });
    expect(res.status).toBe(403);
  });

  it("should delete preset successfully", async () => {
    setUser(10);
    mockPrisma.roomPreset.findUnique.mockResolvedValue({ apartmentId: 5 });
    mockOwnerOf(5, 10);
    mockPrisma.roomPreset.delete.mockResolvedValue({ id: 10 });

    const req = new NextRequest("http://localhost/api/admin/room-presets/10", {
      method: "DELETE",
    });
    const res = await DELETE(req, { params: Promise.resolve({ id: "10" }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(mockPrisma.roomPreset.delete).toHaveBeenCalledWith({
      where: { id: 10 },
    });
  });
});

// ── Bulk Room Creation Tests ───────────────────────────────────────────

describe("POST /api/admin/rooms/bulk", () => {
  let POST: (req: NextRequest) => Promise<Response>;

  beforeEach(async () => {
    const module = await import("@/app/api/admin/rooms/bulk/route");
    POST = module.POST;
  });

  it("should require apartmentId", async () => {
    setUser(1);
    const req = new NextRequest("http://localhost/api/admin/rooms/bulk", {
      method: "POST",
      body: JSON.stringify({ roomNumbers: ["101"] }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("apartmentId");
  });

  it("should require owner authentication", async () => {
    setUser(1);
    mockPrisma.apartment.findFirst.mockResolvedValue(null);
    const req = new NextRequest("http://localhost/api/admin/rooms/bulk", {
      method: "POST",
      body: JSON.stringify({
        apartmentId: 5,
        roomNumbers: ["101"],
        baseRent: 3000,
        waterRate: 18,
        electricRate: 8,
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it("should create rooms from preset using roomNumbers array", async () => {
    setUser(10);
    mockOwnerOf(5, 10);
    mockPrisma.roomPreset.findUnique.mockResolvedValue({
      id: 1,
      apartmentId: 5,
      roomType: "แอร์",
      baseRent: 3500,
      waterRate: 18,
      electricRate: 8,
      RoomPresetOption: [{ name: "ค่าส่วนกลาง", price: 200 }],
    });
    mockPrisma.room.findUnique.mockResolvedValue(null); // no duplicates
    mockPrisma.room.create
      .mockResolvedValueOnce({ id: 101, roomNumber: "201" })
      .mockResolvedValueOnce({ id: 102, roomNumber: "202" })
      .mockResolvedValueOnce({ id: 103, roomNumber: "203" });

    const req = new NextRequest("http://localhost/api/admin/rooms/bulk", {
      method: "POST",
      body: JSON.stringify({
        apartmentId: 5,
        presetId: 1,
        roomNumbers: ["201", "202", "203"],
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(207);
    const body = await res.json();
    expect(body.created).toHaveLength(3);
    expect(body.failed).toHaveLength(0);
    expect(body.created[0]).toEqual({ roomNumber: "201", roomId: 101 });
    expect(mockPrisma.room.create).toHaveBeenCalledTimes(3);
  });

  it("should create rooms from preset using roomNumberRange", async () => {
    setUser(10);
    mockOwnerOf(5, 10);
    mockPrisma.roomPreset.findUnique.mockResolvedValue({
      id: 1,
      apartmentId: 5,
      roomType: "แอร์",
      baseRent: 3500,
      waterRate: 18,
      electricRate: 8,
      RoomPresetOption: [],
    });
    mockPrisma.room.findUnique.mockResolvedValue(null);
    mockPrisma.room.create.mockImplementation((args: any) =>
      Promise.resolve({ id: 1000, roomNumber: args.data.roomNumber }),
    );

    const req = new NextRequest("http://localhost/api/admin/rooms/bulk", {
      method: "POST",
      body: JSON.stringify({
        apartmentId: 5,
        presetId: 1,
        roomNumberRange: { start: 301, end: 305 },
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(207);
    const body = await res.json();
    expect(body.created).toHaveLength(5);
    expect(body.created[0].roomNumber).toBe("301");
    expect(body.created[4].roomNumber).toBe("305");
  });

  it("should handle partial failure with duplicates", async () => {
    setUser(10);
    mockOwnerOf(5, 10);
    mockPrisma.roomPreset.findUnique.mockResolvedValue({
      id: 1,
      apartmentId: 5,
      roomType: "แอร์",
      baseRent: 3500,
      waterRate: 18,
      electricRate: 8,
      RoomPresetOption: [],
    });

    // Room 201 is duplicate, 202 and 203 are new
    mockPrisma.room.findUnique.mockImplementation((args: any) => {
      const rn = args.where.apartmentId_roomNumber?.roomNumber;
      if (rn === "201") return Promise.resolve({ id: 50, roomNumber: "201" });
      return Promise.resolve(null);
    });
    mockPrisma.room.create
      .mockResolvedValueOnce({ id: 102, roomNumber: "202" })
      .mockResolvedValueOnce({ id: 103, roomNumber: "203" });

    const req = new NextRequest("http://localhost/api/admin/rooms/bulk", {
      method: "POST",
      body: JSON.stringify({
        apartmentId: 5,
        presetId: 1,
        roomNumbers: ["201", "202", "203"],
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(207);
    const body = await res.json();
    expect(body.created).toHaveLength(2);
    expect(body.failed).toHaveLength(1);
    expect(body.failed[0]).toEqual({ roomNumber: "201", reason: "duplicate" });
    expect(body.created[0].roomNumber).toBe("202");
  });

  it("should return 422 when all rooms fail", async () => {
    setUser(10);
    mockOwnerOf(5, 10);
    mockPrisma.roomPreset.findUnique.mockResolvedValue({
      id: 1,
      apartmentId: 5,
      roomType: "แอร์",
      baseRent: 3500,
      waterRate: 18,
      electricRate: 8,
      RoomPresetOption: [],
    });
    mockPrisma.room.findUnique.mockResolvedValue({ id: 50 }); // all duplicates

    const req = new NextRequest("http://localhost/api/admin/rooms/bulk", {
      method: "POST",
      body: JSON.stringify({
        apartmentId: 5,
        presetId: 1,
        roomNumbers: ["201", "202"],
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.created).toHaveLength(0);
    expect(body.failed).toHaveLength(2);
  });

  it("should enforce 100 room limit", async () => {
    setUser(10);
    mockOwnerOf(5, 10);

    const roomNumbers = Array.from({ length: 101 }, (_, i) => String(i + 1));
    const req = new NextRequest("http://localhost/api/admin/rooms/bulk", {
      method: "POST",
      body: JSON.stringify({
        apartmentId: 5,
        presetId: 1,
        roomNumbers,
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("100");
  });

  it("should create rooms with manual fields when no presetId", async () => {
    setUser(10);
    mockOwnerOf(5, 10);
    mockPrisma.room.findUnique.mockResolvedValue(null);
    mockPrisma.room.create.mockResolvedValue({ id: 100, roomNumber: "101" });

    const req = new NextRequest("http://localhost/api/admin/rooms/bulk", {
      method: "POST",
      body: JSON.stringify({
        apartmentId: 5,
        roomNumbers: ["101"],
        roomType: "Standard",
        baseRent: 2800,
        waterRate: 20,
        electricRate: 9,
        options: [{ name: "Parking", price: 500 }],
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(207);
    const body = await res.json();
    expect(body.created).toHaveLength(1);

    expect(mockPrisma.room.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        roomNumber: "101",
        roomType: "Standard",
        baseRent: 2800,
        waterRate: 20,
        electricRate: 9,
        options: {
          create: [{ name: "Parking", price: 500 }],
        },
      }),
    });
  });

  it("should require manual fields when presetId not provided", async () => {
    setUser(10);
    mockOwnerOf(5, 10);

    const req = new NextRequest("http://localhost/api/admin/rooms/bulk", {
      method: "POST",
      body: JSON.stringify({
        apartmentId: 5,
        roomNumbers: ["101"],
        // missing baseRent, waterRate, electricRate
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("baseRent");
  });

  it("should reject preset from different apartment", async () => {
    setUser(10);
    mockOwnerOf(5, 10);
    mockPrisma.roomPreset.findUnique.mockResolvedValue({
      id: 1,
      apartmentId: 99, // different apartment
      roomType: "แอร์",
      baseRent: 3500,
      waterRate: 18,
      electricRate: 8,
      RoomPresetOption: [],
    });

    const req = new NextRequest("http://localhost/api/admin/rooms/bulk", {
      method: "POST",
      body: JSON.stringify({
        apartmentId: 5,
        presetId: 1,
        roomNumbers: ["101"],
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toContain("does not belong");
  });

  it("should return 404 when preset not found", async () => {
    setUser(10);
    mockOwnerOf(5, 10);
    mockPrisma.roomPreset.findUnique.mockResolvedValue(null);

    const req = new NextRequest("http://localhost/api/admin/rooms/bulk", {
      method: "POST",
      body: JSON.stringify({
        apartmentId: 5,
        presetId: 999,
        roomNumbers: ["101"],
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toContain("not found");
  });
});
