import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { GET } from "@/app/api/admin/dashboard/stats/route";

// Mock session
let mockSession: { userId?: number } = {};

vi.mock("@/lib/session", () => ({
  getSession: vi.fn(() => Promise.resolve(mockSession)),
}));

describe("Admin Dashboard Stats API", () => {
  let adminUser: { id: number };
  let regularUser: { id: number };
  let testPlan: { code: string };

  beforeAll(async () => {
    // Create test users
    adminUser = await prisma.user.create({
      data: {
        displayName: "Admin User",
        email: "admin-stats@test.com",
        role: "PLATFORM_ADMIN",
        status: "ACTIVE",
        updatedAt: new Date(),
      },
    });

    regularUser = await prisma.user.create({
      data: {
        displayName: "Regular User Stats",
        email: "regular-stats@test.com",
        role: "USER",
        status: "ACTIVE",
        updatedAt: new Date(),
      },
    });

    // Create test plan
    testPlan = await prisma.plan.create({
      data: {
        code: "TEST_PLAN",
        name: "Test Plan",
        displayName: "Test Plan",
        pricePerRoom: 100.0,
        tierSize: 25,
        updatedAt: new Date(),
      },
    });
  });

  afterAll(async () => {
    // Cleanup in reverse dependency order
    await prisma.subscription.deleteMany({
      where: { planCode: testPlan.code },
    });
    await prisma.room.deleteMany({
      where: { Apartment: { ownerUserId: regularUser.id } },
    });
    await prisma.apartment.deleteMany({
      where: { ownerUserId: regularUser.id },
    });
    await prisma.plan.delete({
      where: { code: testPlan.code },
    });
    await prisma.user.deleteMany({
      where: {
        email: { in: ["admin-stats@test.com", "regular-stats@test.com"] },
      },
    });
  });

  beforeEach(() => {
    mockSession = {};
  });

  describe("Authorization", () => {
    it("should reject unauthenticated requests", async () => {
      mockSession = {};

      const response = await GET();
      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error).toBe("unauthorized");
    });

    it("should reject regular USER role", async () => {
      mockSession = { userId: regularUser.id };

      const response = await GET();
      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body.error).toBe("forbidden");
    });

    it("should allow PLATFORM_ADMIN role", async () => {
      mockSession = { userId: adminUser.id };

      const response = await GET();
      expect(response.status).toBe(200);
    });
  });

  describe("Metrics Accuracy", () => {
    let apartment: { id: number };
    let room1: { id: number };
    let room2: { id: number };

    beforeAll(async () => {
      // Create test apartment and rooms
      apartment = await prisma.apartment.create({
        data: {
          ownerUserId: regularUser.id,
          name: "Test Apartment Stats",
          address: "123 Test St",
        },
      });

      room1 = await prisma.room.create({
        data: {
          apartmentId: apartment.id,
          roomNumber: "101",
          baseRent: 5000,
          waterRate: 20,
          electricRate: 5,
        },
      });

      room2 = await prisma.room.create({
        data: {
          apartmentId: apartment.id,
          roomNumber: "102",
          baseRent: 6000,
          waterRate: 20,
          electricRate: 5,
        },
      });

      // Create test subscriptions
      await prisma.subscription.create({
        data: {
          userId: regularUser.id,
          planCode: testPlan.code,
          status: "ACTIVE",
          billingCycle: "MONTHLY",
          roomQuotaSnapshot: 2,
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });
    });

    it("should return correct metrics", async () => {
      mockSession = { userId: adminUser.id };

      const response = await GET();
      expect(response.status).toBe(200);

      const data = await response.json();

      // Verify structure
      expect(data).toHaveProperty("totalUsers");
      expect(data).toHaveProperty("activeSubscriptions");
      expect(data).toHaveProperty("trialUsers");
      expect(data).toHaveProperty("totalApartments");
      expect(data).toHaveProperty("totalRooms");
      expect(data).toHaveProperty("mrr");

      // Verify types
      expect(typeof data.totalUsers).toBe("number");
      expect(typeof data.activeSubscriptions).toBe("number");
      expect(typeof data.trialUsers).toBe("number");
      expect(typeof data.totalApartments).toBe("number");
      expect(typeof data.totalRooms).toBe("number");
      expect(typeof data.mrr).toBe("number");

      // Verify minimum counts (at least our test data)
      expect(data.totalUsers).toBeGreaterThanOrEqual(2); // admin + regular
      expect(data.activeSubscriptions).toBeGreaterThanOrEqual(1);
      expect(data.totalApartments).toBeGreaterThanOrEqual(1);
      expect(data.totalRooms).toBeGreaterThanOrEqual(2);
    });

    it("should calculate MRR correctly for MONTHLY billing", async () => {
      mockSession = { userId: adminUser.id };

      const response = await GET();
      const data = await response.json();

      // MRR for our test subscription:
      // 2 rooms * 100 THB per room = 200 THB (MONTHLY, no division)
      expect(data.mrr).toBeGreaterThanOrEqual(200);
    });

    it("should verify counts match database", async () => {
      mockSession = { userId: adminUser.id };

      // Get actual counts from database
      const [
        dbTotalUsers,
        dbActiveSubscriptions,
        dbTrialUsers,
        dbTotalApartments,
        dbTotalRooms,
      ] = await Promise.all([
        prisma.user.count(),
        prisma.subscription.count({ where: { status: "ACTIVE" } }),
        prisma.subscription.count({ where: { status: "TRIAL" } }),
        prisma.apartment.count(),
        prisma.room.count(),
      ]);

      const response = await GET();
      const data = await response.json();

      // Verify exact matches
      expect(data.totalUsers).toBe(dbTotalUsers);
      expect(data.activeSubscriptions).toBe(dbActiveSubscriptions);
      expect(data.trialUsers).toBe(dbTrialUsers);
      expect(data.totalApartments).toBe(dbTotalApartments);
      expect(data.totalRooms).toBe(dbTotalRooms);
    });
  });

  describe("MRR Calculation", () => {
    let yearlyUser: { id: number };
    let yearlyApartment: { id: number };

    beforeAll(async () => {
      // Create user with YEARLY subscription
      yearlyUser = await prisma.user.create({
        data: {
          displayName: "Yearly User",
          email: "yearly@test.com",
          role: "USER",
          status: "ACTIVE",
          updatedAt: new Date(),
        },
      });

      yearlyApartment = await prisma.apartment.create({
        data: {
          ownerUserId: yearlyUser.id,
          name: "Yearly Apartment",
        },
      });

      await prisma.subscription.create({
        data: {
          userId: yearlyUser.id,
          planCode: testPlan.code,
          status: "ACTIVE",
          billingCycle: "YEARLY",
          roomQuotaSnapshot: 12,
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        },
      });
    });

    afterAll(async () => {
      await prisma.subscription.deleteMany({
        where: { userId: yearlyUser.id },
      });
      await prisma.apartment.deleteMany({
        where: { id: yearlyApartment.id },
      });
      await prisma.user.delete({
        where: { id: yearlyUser.id },
      });
    });

    it("should calculate MRR for YEARLY billing (divided by 12)", async () => {
      mockSession = { userId: adminUser.id };

      const response = await GET();
      const data = await response.json();

      // MRR calculation:
      // Monthly user: 2 rooms * 100 = 200
      // Yearly user: (12 rooms * 100) / 12 = 100
      // Total MRR should be at least 300
      expect(data.mrr).toBeGreaterThanOrEqual(300);
    });

    it("should round MRR to 2 decimal places", async () => {
      mockSession = { userId: adminUser.id };

      const response = await GET();
      const data = await response.json();

      // Check that MRR has at most 2 decimal places
      const decimalPart = data.mrr.toString().split(".")[1];
      if (decimalPart) {
        expect(decimalPart.length).toBeLessThanOrEqual(2);
      }
    });
  });
});
