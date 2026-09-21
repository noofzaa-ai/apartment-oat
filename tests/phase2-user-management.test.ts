import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { GET as getUsersList } from "@/app/api/admin/users/route";
import { GET as getUserDetail, PATCH as updateUser } from "@/app/api/admin/users/[id]/route";
import { POST as toggleSuspend } from "@/app/api/admin/users/[id]/suspend/route";
import { GET as getNotes, POST as createNote } from "@/app/api/admin/users/[id]/notes/route";
import { NextRequest } from "next/server";

// Mock session
let mockSession: { userId?: number } = {};

vi.mock("@/lib/session", () => ({
  getSession: vi.fn(() => Promise.resolve(mockSession)),
}));

describe("Phase 2 User Management APIs", () => {
  let regularUser: any;
  let platformAdmin: any;
  let superAdmin: any;
  let testUser1: any;
  let testUser2: any;
  let testUser3: any;
  let testPlan: any;

  beforeAll(async () => {
    // Create test plan
    testPlan = await prisma.plan.create({
      data: {
        code: "TEST_BASIC",
        name: "test-basic",
        displayName: "Test Basic Plan",
        pricePerRoom: 99,
        tierSize: 5,
        maxRooms: 25,
        isActive: true,
        updatedAt: new Date(),
      },
    });

    // Create admin users
    regularUser = await prisma.user.create({
      data: {
        displayName: "Regular User",
        email: "regular-p2@test.com",
        role: "USER",
        status: "ACTIVE",
        updatedAt: new Date(),
      },
    });

    platformAdmin = await prisma.user.create({
      data: {
        displayName: "Platform Admin",
        email: "platform-p2@test.com",
        role: "PLATFORM_ADMIN",
        status: "ACTIVE",
        updatedAt: new Date(),
      },
    });

    superAdmin = await prisma.user.create({
      data: {
        displayName: "Super Admin",
        email: "super-p2@test.com",
        role: "SUPER_ADMIN",
        status: "ACTIVE",
        updatedAt: new Date(),
      },
    });

    // Create test users with different attributes for filtering
    testUser1 = await prisma.user.create({
      data: {
        displayName: "Test User One",
        email: "testuser1@example.com",
        role: "USER",
        status: "ACTIVE",
        updatedAt: new Date(),
        Subscription: {
          create: {
            planCode: testPlan.code,
            status: "ACTIVE",
            billingCycle: "MONTHLY",
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            roomQuotaSnapshot: 5,
          },
        },
      },
    });

    testUser2 = await prisma.user.create({
      data: {
        displayName: "Test User Two",
        email: "testuser2@example.com",
        role: "USER",
        status: "ACTIVE",
        updatedAt: new Date(),
        Subscription: {
          create: {
            planCode: testPlan.code,
            status: "TRIAL",
            billingCycle: "MONTHLY",
            trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            roomQuotaSnapshot: 5,
          },
        },
      },
    });

    testUser3 = await prisma.user.create({
      data: {
        displayName: "Test User Three",
        email: "testuser3@example.com",
        role: "USER",
        status: "SUSPENDED",
        updatedAt: new Date(),
      },
    });
  });

  afterAll(async () => {
    // Cleanup in reverse dependency order
    await prisma.adminNote.deleteMany({
      where: {
        targetType: "USER",
        targetId: { in: [testUser1.id, testUser2.id, testUser3.id] },
      },
    });

    await prisma.auditLog.deleteMany({
      where: {
        targetType: "USER",
        targetId: { in: [testUser1.id, testUser2.id, testUser3.id] },
      },
    });

    await prisma.subscription.deleteMany({
      where: {
        userId: { in: [testUser1.id, testUser2.id] },
      },
    });

    await prisma.user.deleteMany({
      where: {
        email: {
          in: [
            "regular-p2@test.com",
            "platform-p2@test.com",
            "super-p2@test.com",
            "testuser1@example.com",
            "testuser2@example.com",
            "testuser3@example.com",
          ],
        },
      },
    });

    await prisma.plan.delete({
      where: { code: testPlan.code },
    });
  });

  beforeEach(() => {
    mockSession = {};
  });

  describe("GET /api/admin/users - User List", () => {
    it("should reject unauthenticated requests", async () => {
      mockSession = {};
      const req = new NextRequest("http://localhost/api/admin/users");
      const response = await getUsersList(req);
      expect(response.status).toBe(401);
    });

    it("should reject regular users", async () => {
      mockSession = { userId: regularUser.id };
      const req = new NextRequest("http://localhost/api/admin/users");
      const response = await getUsersList(req);
      expect(response.status).toBe(403);
    });

    it("should return user list for platform admin", async () => {
      mockSession = { userId: platformAdmin.id };
      const req = new NextRequest("http://localhost/api/admin/users");
      const response = await getUsersList(req);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty("users");
      expect(data).toHaveProperty("pagination");
      expect(Array.isArray(data.users)).toBe(true);
    });

    it("should paginate results correctly", async () => {
      mockSession = { userId: platformAdmin.id };
      
      // Page 1 with limit 2
      const req1 = new NextRequest("http://localhost/api/admin/users?page=1&limit=2");
      const response1 = await getUsersList(req1);
      const data1 = await response1.json();
      
      expect(data1.pagination.page).toBe(1);
      expect(data1.pagination.limit).toBe(2);
      expect(data1.users.length).toBeLessThanOrEqual(2);
      expect(data1.pagination.total).toBeGreaterThan(0);
      expect(data1.pagination.totalPages).toBeGreaterThan(0);
    });

    it("should search by email", async () => {
      mockSession = { userId: platformAdmin.id };
      const req = new NextRequest("http://localhost/api/admin/users?search=testuser1@example.com");
      const response = await getUsersList(req);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.users.length).toBeGreaterThan(0);
      expect(data.users[0].email).toContain("testuser1");
    });

    it("should search by displayName", async () => {
      mockSession = { userId: platformAdmin.id };
      const req = new NextRequest("http://localhost/api/admin/users?search=Test User One");
      const response = await getUsersList(req);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.users.length).toBeGreaterThan(0);
      expect(data.users.some((u: any) => u.displayName.includes("Test User One"))).toBe(true);
    });

    it("should search by user ID", async () => {
      mockSession = { userId: platformAdmin.id };
      const req = new NextRequest(`http://localhost/api/admin/users?search=${testUser1.id}`);
      const response = await getUsersList(req);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.users.length).toBe(1);
      expect(data.users[0].id).toBe(testUser1.id);
    });

    it("should filter by subscription status", async () => {
      mockSession = { userId: platformAdmin.id };
      const req = new NextRequest("http://localhost/api/admin/users?subscriptionStatus=TRIAL");
      const response = await getUsersList(req);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.users.length).toBeGreaterThan(0);
      expect(data.users.every((u: any) => u.subscription?.status === "TRIAL")).toBe(true);
    });

    it("should filter by planCode", async () => {
      mockSession = { userId: platformAdmin.id };
      const req = new NextRequest(`http://localhost/api/admin/users?planCode=${testPlan.code}`);
      const response = await getUsersList(req);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.users.length).toBeGreaterThan(0);
      expect(data.users.every((u: any) => u.subscription?.planCode === testPlan.code)).toBe(true);
    });

    it("should filter by user role", async () => {
      mockSession = { userId: platformAdmin.id };
      const req = new NextRequest("http://localhost/api/admin/users?role=PLATFORM_ADMIN");
      const response = await getUsersList(req);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.users.length).toBeGreaterThan(0);
      expect(data.users.every((u: any) => u.role === "PLATFORM_ADMIN")).toBe(true);
    });

    it("should filter by user status", async () => {
      mockSession = { userId: platformAdmin.id };
      const req = new NextRequest("http://localhost/api/admin/users?status=SUSPENDED");
      const response = await getUsersList(req);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.users.length).toBeGreaterThan(0);
      expect(data.users.every((u: any) => u.status === "SUSPENDED")).toBe(true);
    });

    it("should filter by date range", async () => {
      mockSession = { userId: platformAdmin.id };
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      
      const req = new NextRequest(
        `http://localhost/api/admin/users?dateFrom=${yesterday}&dateTo=${tomorrow}`
      );
      const response = await getUsersList(req);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.users.length).toBeGreaterThan(0);
    });

    it("should include apartment and room counts", async () => {
      mockSession = { userId: platformAdmin.id };
      const req = new NextRequest(`http://localhost/api/admin/users?search=${testUser1.id}`);
      const response = await getUsersList(req);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.users[0]).toHaveProperty("apartmentCount");
      expect(data.users[0]).toHaveProperty("roomCount");
      expect(typeof data.users[0].apartmentCount).toBe("number");
      expect(typeof data.users[0].roomCount).toBe("number");
    });
  });

  describe("GET /api/admin/users/[id] - User Detail", () => {
    it("should reject unauthenticated requests", async () => {
      mockSession = {};
      const req = new NextRequest(`http://localhost/api/admin/users/${testUser1.id}`);
      const response = await getUserDetail(req, { params: Promise.resolve({ id: String(testUser1.id) }) });
      expect(response.status).toBe(401);
    });

    it("should reject regular users", async () => {
      mockSession = { userId: regularUser.id };
      const req = new NextRequest(`http://localhost/api/admin/users/${testUser1.id}`);
      const response = await getUserDetail(req, { params: Promise.resolve({ id: String(testUser1.id) }) });
      expect(response.status).toBe(403);
    });

    it("should return complete user detail for platform admin", async () => {
      mockSession = { userId: platformAdmin.id };
      const req = new NextRequest(`http://localhost/api/admin/users/${testUser1.id}`);
      const response = await getUserDetail(req, { params: Promise.resolve({ id: String(testUser1.id) }) });
      
      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data.id).toBe(testUser1.id);
      expect(data.email).toBe(testUser1.email);
      expect(data).toHaveProperty("displayName");
      expect(data).toHaveProperty("role");
      expect(data).toHaveProperty("status");
      expect(data).toHaveProperty("subscription");
      expect(data).toHaveProperty("apartments");
      expect(data).toHaveProperty("memberships");
      expect(data).toHaveProperty("externalIdentity");
    });

    it("should return 404 for non-existent user", async () => {
      mockSession = { userId: platformAdmin.id };
      const req = new NextRequest("http://localhost/api/admin/users/999999");
      const response = await getUserDetail(req, { params: Promise.resolve({ id: "999999" }) });
      
      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe("user_not_found");
    });

    it("should return 400 for invalid user ID", async () => {
      mockSession = { userId: platformAdmin.id };
      const req = new NextRequest("http://localhost/api/admin/users/invalid");
      const response = await getUserDetail(req, { params: Promise.resolve({ id: "invalid" }) });
      
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe("invalid_user_id");
    });

    it("should include subscription details if present", async () => {
      mockSession = { userId: platformAdmin.id };
      const req = new NextRequest(`http://localhost/api/admin/users/${testUser1.id}`);
      const response = await getUserDetail(req, { params: Promise.resolve({ id: String(testUser1.id) }) });
      const data = await response.json();
      
      expect(data.subscription).not.toBeNull();
      expect(data.subscription.planCode).toBe(testPlan.code);
      expect(data.subscription).toHaveProperty("status");
      expect(data.subscription).toHaveProperty("billingCycle");
    });
  });

  describe("PATCH /api/admin/users/[id] - Update User", () => {
    it("should reject unauthenticated requests", async () => {
      mockSession = {};
      const req = new NextRequest(`http://localhost/api/admin/users/${testUser1.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "SUSPENDED" }),
      });
      const response = await updateUser(req, { params: Promise.resolve({ id: String(testUser1.id) }) });
      expect(response.status).toBe(401);
    });

    it("should allow platform admin to update status", async () => {
      mockSession = { userId: platformAdmin.id };
      const req = new NextRequest(`http://localhost/api/admin/users/${testUser1.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "ACTIVE" }),
      });
      const response = await updateUser(req, { params: Promise.resolve({ id: String(testUser1.id) }) });
      
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.status).toBe("ACTIVE");
    });

    it("should reject platform admin updating role", async () => {
      mockSession = { userId: platformAdmin.id };
      const req = new NextRequest(`http://localhost/api/admin/users/${testUser1.id}`, {
        method: "PATCH",
        body: JSON.stringify({ role: "PLATFORM_ADMIN" }),
      });
      const response = await updateUser(req, { params: Promise.resolve({ id: String(testUser1.id) }) });
      
      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe("forbidden_super_admin_only");
    });

    it("should allow super admin to update role", async () => {
      mockSession = { userId: superAdmin.id };
      
      // Update role
      const req = new NextRequest(`http://localhost/api/admin/users/${testUser1.id}`, {
        method: "PATCH",
        body: JSON.stringify({ role: "PLATFORM_ADMIN" }),
      });
      const response = await updateUser(req, { params: Promise.resolve({ id: String(testUser1.id) }) });
      
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.role).toBe("PLATFORM_ADMIN");
      
      // Restore original role
      const restoreReq = new NextRequest(`http://localhost/api/admin/users/${testUser1.id}`, {
        method: "PATCH",
        body: JSON.stringify({ role: "USER" }),
      });
      await updateUser(restoreReq, { params: Promise.resolve({ id: String(testUser1.id) }) });
    });

    it("should create audit log for role change", async () => {
      mockSession = { userId: superAdmin.id };
      
      const req = new NextRequest(`http://localhost/api/admin/users/${testUser2.id}`, {
        method: "PATCH",
        body: JSON.stringify({ role: "PLATFORM_ADMIN" }),
      });
      await updateUser(req, { params: Promise.resolve({ id: String(testUser2.id) }) });
      
      // Check audit log
      const auditLogs = await prisma.auditLog.findMany({
        where: {
          action: "update_user_role",
          targetId: testUser2.id,
          userId: superAdmin.id,
        },
      });
      
      expect(auditLogs.length).toBeGreaterThan(0);
      const details = JSON.parse(auditLogs[0].details as any);
      expect(details).toHaveProperty("oldRole");
      expect(details).toHaveProperty("newRole");
      
      // Restore
      const restoreReq = new NextRequest(`http://localhost/api/admin/users/${testUser2.id}`, {
        method: "PATCH",
        body: JSON.stringify({ role: "USER" }),
      });
      await updateUser(restoreReq, { params: Promise.resolve({ id: String(testUser2.id) }) });
    });

    it("should reject invalid role value", async () => {
      mockSession = { userId: superAdmin.id };
      const req = new NextRequest(`http://localhost/api/admin/users/${testUser1.id}`, {
        method: "PATCH",
        body: JSON.stringify({ role: "INVALID_ROLE" }),
      });
      const response = await updateUser(req, { params: Promise.resolve({ id: String(testUser1.id) }) });
      
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe("invalid_role");
    });

    it("should reject invalid status value", async () => {
      mockSession = { userId: platformAdmin.id };
      const req = new NextRequest(`http://localhost/api/admin/users/${testUser1.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "INVALID_STATUS" }),
      });
      const response = await updateUser(req, { params: Promise.resolve({ id: String(testUser1.id) }) });
      
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe("invalid_status");
    });

    it("should reject empty update", async () => {
      mockSession = { userId: platformAdmin.id };
      const req = new NextRequest(`http://localhost/api/admin/users/${testUser1.id}`, {
        method: "PATCH",
        body: JSON.stringify({}),
      });
      const response = await updateUser(req, { params: Promise.resolve({ id: String(testUser1.id) }) });
      
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe("no_update_fields");
    });
  });

  describe("POST /api/admin/users/[id]/suspend - Toggle Suspend", () => {
    it("should reject unauthenticated requests", async () => {
      mockSession = {};
      const req = new NextRequest(`http://localhost/api/admin/users/${testUser1.id}/suspend`, {
        method: "POST",
        body: JSON.stringify({ suspend: true }),
      });
      const response = await toggleSuspend(req, { params: Promise.resolve({ id: String(testUser1.id) }) });
      expect(response.status).toBe(401);
    });

    it("should allow platform admin to suspend user", async () => {
      mockSession = { userId: platformAdmin.id };
      const req = new NextRequest(`http://localhost/api/admin/users/${testUser1.id}/suspend`, {
        method: "POST",
        body: JSON.stringify({ suspend: true }),
      });
      const response = await toggleSuspend(req, { params: Promise.resolve({ id: String(testUser1.id) }) });
      
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.status).toBe("SUSPENDED");
    });

    it("should allow platform admin to unsuspend user", async () => {
      mockSession = { userId: platformAdmin.id };
      const req = new NextRequest(`http://localhost/api/admin/users/${testUser1.id}/suspend`, {
        method: "POST",
        body: JSON.stringify({ suspend: false }),
      });
      const response = await toggleSuspend(req, { params: Promise.resolve({ id: String(testUser1.id) }) });
      
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.status).toBe("ACTIVE");
    });

    it("should create audit log for suspend action", async () => {
      mockSession = { userId: platformAdmin.id };
      
      const req = new NextRequest(`http://localhost/api/admin/users/${testUser2.id}/suspend`, {
        method: "POST",
        body: JSON.stringify({ suspend: true }),
      });
      await toggleSuspend(req, { params: Promise.resolve({ id: String(testUser2.id) }) });
      
      // Check audit log
      const auditLogs = await prisma.auditLog.findMany({
        where: {
          action: "suspend_user",
          targetId: testUser2.id,
          userId: platformAdmin.id,
        },
      });
      
      expect(auditLogs.length).toBeGreaterThan(0);
      const details = JSON.parse(auditLogs[0].details as any);
      expect(details).toHaveProperty("previousStatus");
      expect(details).toHaveProperty("newStatus");
      
      // Restore
      const restoreReq = new NextRequest(`http://localhost/api/admin/users/${testUser2.id}/suspend`, {
        method: "POST",
        body: JSON.stringify({ suspend: false }),
      });
      await toggleSuspend(restoreReq, { params: Promise.resolve({ id: String(testUser2.id) }) });
    });

    it("should reject missing suspend field", async () => {
      mockSession = { userId: platformAdmin.id };
      const req = new NextRequest(`http://localhost/api/admin/users/${testUser1.id}/suspend`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      const response = await toggleSuspend(req, { params: Promise.resolve({ id: String(testUser1.id) }) });
      
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe("suspend_field_required");
    });

    it("should return 404 for non-existent user", async () => {
      mockSession = { userId: platformAdmin.id };
      const req = new NextRequest("http://localhost/api/admin/users/999999/suspend", {
        method: "POST",
        body: JSON.stringify({ suspend: true }),
      });
      const response = await toggleSuspend(req, { params: Promise.resolve({ id: "999999" }) });
      
      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe("user_not_found");
    });
  });

  describe("Admin Notes - POST and GET", () => {
    it("should reject unauthenticated requests for creating note", async () => {
      mockSession = {};
      const req = new NextRequest(`http://localhost/api/admin/users/${testUser1.id}/notes`, {
        method: "POST",
        body: JSON.stringify({ note: "Test note" }),
      });
      const response = await createNote(req, { params: Promise.resolve({ id: String(testUser1.id) }) });
      expect(response.status).toBe(401);
    });

    it("should allow platform admin to create note", async () => {
      mockSession = { userId: platformAdmin.id };
      const req = new NextRequest(`http://localhost/api/admin/users/${testUser1.id}/notes`, {
        method: "POST",
        body: JSON.stringify({ note: "Test admin note for user" }),
      });
      const response = await createNote(req, { params: Promise.resolve({ id: String(testUser1.id) }) });
      
      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.note).toBe("Test admin note for user");
      expect(data.admin.id).toBe(platformAdmin.id);
    });

    it("should reject empty note", async () => {
      mockSession = { userId: platformAdmin.id };
      const req = new NextRequest(`http://localhost/api/admin/users/${testUser1.id}/notes`, {
        method: "POST",
        body: JSON.stringify({ note: "" }),
      });
      const response = await createNote(req, { params: Promise.resolve({ id: String(testUser1.id) }) });
      
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe("note_field_required");
    });

    it("should trim whitespace from note", async () => {
      mockSession = { userId: platformAdmin.id };
      const req = new NextRequest(`http://localhost/api/admin/users/${testUser1.id}/notes`, {
        method: "POST",
        body: JSON.stringify({ note: "  Test note with spaces  " }),
      });
      const response = await createNote(req, { params: Promise.resolve({ id: String(testUser1.id) }) });
      
      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.note).toBe("Test note with spaces");
    });

    it("should list admin notes for user", async () => {
      mockSession = { userId: platformAdmin.id };
      const req = new NextRequest(`http://localhost/api/admin/users/${testUser1.id}/notes`);
      const response = await getNotes(req, { params: Promise.resolve({ id: String(testUser1.id) }) });
      
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty("notes");
      expect(Array.isArray(data.notes)).toBe(true);
      expect(data.notes.length).toBeGreaterThan(0);
      
      // Verify note structure
      const note = data.notes[0];
      expect(note).toHaveProperty("id");
      expect(note).toHaveProperty("note");
      expect(note).toHaveProperty("createdAt");
      expect(note).toHaveProperty("admin");
      expect(note.admin).toHaveProperty("id");
      expect(note.admin).toHaveProperty("displayName");
      expect(note.admin).toHaveProperty("email");
    });

    it("should reject unauthenticated requests for listing notes", async () => {
      mockSession = {};
      const req = new NextRequest(`http://localhost/api/admin/users/${testUser1.id}/notes`);
      const response = await getNotes(req, { params: Promise.resolve({ id: String(testUser1.id) }) });
      expect(response.status).toBe(401);
    });

    it("should return empty notes array for user with no notes", async () => {
      // Create a new test user with no notes
      const newUser = await prisma.user.create({
        data: {
          displayName: "No Notes User",
          email: "nonotes@test.com",
          role: "USER",
          status: "ACTIVE",
          updatedAt: new Date(),
        },
      });

      mockSession = { userId: platformAdmin.id };
      const req = new NextRequest(`http://localhost/api/admin/users/${newUser.id}/notes`);
      const response = await getNotes(req, { params: Promise.resolve({ id: String(newUser.id) }) });
      
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.notes).toEqual([]);

      // Cleanup
      await prisma.user.delete({ where: { id: newUser.id } });
    });

    it("should return 404 for notes on non-existent user", async () => {
      mockSession = { userId: platformAdmin.id };
      const req = new NextRequest("http://localhost/api/admin/users/999999/notes");
      const response = await getNotes(req, { params: Promise.resolve({ id: "999999" }) });
      
      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe("user_not_found");
    });
  });
});
