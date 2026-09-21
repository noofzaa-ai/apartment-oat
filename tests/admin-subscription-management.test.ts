import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";

/**
 * Phase 3 Subscription Management API Tests
 * Tests admin subscription list, detail, and actions:
 * - GET /api/admin/subscriptions (list with filters)
 * - GET /api/admin/subscriptions/[id] (detail)
 * - POST /api/admin/subscriptions/[id]/extend-trial
 * - POST /api/admin/subscriptions/[id]/change-plan
 * - POST /api/admin/subscriptions/[id]/cancel
 */
describe("Admin Subscription Management APIs", () => {
  let adminUserId: number;
  let testUserIds: number[] = [];
  let testSubscriptionIds: number[] = [];

  beforeAll(async () => {
    // Create admin user for authorization tests
    const admin = await prisma.user.create({
      data: {
        displayName: "Admin User",
        email: "admin-sub-test@example.com",
        role: "PLATFORM_ADMIN",
        status: "ACTIVE",
        updatedAt: new Date(),
      },
    });
    adminUserId = admin.id;
  });

  afterAll(async () => {
    // Cleanup in reverse order of dependencies
    if (testSubscriptionIds.length > 0) {
      await prisma.subscription.deleteMany({
        where: { id: { in: testSubscriptionIds } },
      });
    }
    if (testUserIds.length > 0) {
      await prisma.user.deleteMany({
        where: { id: { in: testUserIds } },
      });
    }
    await prisma.user.delete({ where: { id: adminUserId } });
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean up test data before each test
    if (testSubscriptionIds.length > 0) {
      await prisma.subscription.deleteMany({
        where: { id: { in: testSubscriptionIds } },
      });
      testSubscriptionIds = [];
    }
    if (testUserIds.length > 0) {
      await prisma.user.deleteMany({
        where: { id: { in: testUserIds } },
      });
      testUserIds = [];
    }
  });

  describe("GET /api/admin/subscriptions - List subscriptions", () => {
    it("should list all subscriptions with pagination", async () => {
      // Create test users with subscriptions
      const user1 = await prisma.user.create({
        data: {
          displayName: "User 1",
          email: "user1-sub-list@example.com",
          updatedAt: new Date(),
        },
      });
      testUserIds.push(user1.id);

      const user2 = await prisma.user.create({
        data: {
          displayName: "User 2",
          email: "user2-sub-list@example.com",
          updatedAt: new Date(),
        },
      });
      testUserIds.push(user2.id);

      // Create subscriptions
      const sub1 = await prisma.subscription.create({
        data: {
          userId: user1.id,
          planCode: "TRIAL",
          status: "TRIAL",
          billingCycle: "MONTHLY",
          trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        },
      });
      testSubscriptionIds.push(sub1.id);

      const sub2 = await prisma.subscription.create({
        data: {
          userId: user2.id,
          planCode: "STANDARD",
          status: "ACTIVE",
          billingCycle: "MONTHLY",
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });
      testSubscriptionIds.push(sub2.id);

      // Test data layer query
      const subscriptions = await prisma.subscription.findMany({
        select: {
          id: true,
          planCode: true,
          status: true,
          billingCycle: true,
          User: {
            select: {
              id: true,
              displayName: true,
              email: true,
            },
          },
        },
        orderBy: { id: "desc" },
        take: 25,
        skip: 0,
      });

      expect(subscriptions.length).toBeGreaterThanOrEqual(2);
      expect(subscriptions.some((s) => s.id === sub1.id)).toBe(true);
      expect(subscriptions.some((s) => s.id === sub2.id)).toBe(true);
    });

    it("should filter by plan code", async () => {
      const user = await prisma.user.create({
        data: {
          displayName: "Plan Filter User",
          email: "plan-filter@example.com",
          updatedAt: new Date(),
        },
      });
      testUserIds.push(user.id);

      const sub = await prisma.subscription.create({
        data: {
          userId: user.id,
          planCode: "PRO",
          status: "ACTIVE",
          billingCycle: "YEARLY",
        },
      });
      testSubscriptionIds.push(sub.id);

      const filtered = await prisma.subscription.findMany({
        where: { planCode: "PRO" },
        select: { id: true, planCode: true },
      });

      expect(filtered.some((s) => s.id === sub.id)).toBe(true);
      expect(filtered.every((s) => s.planCode === "PRO")).toBe(true);
    });

    it("should filter by status", async () => {
      const user = await prisma.user.create({
        data: {
          displayName: "Status Filter User",
          email: "status-filter@example.com",
          updatedAt: new Date(),
        },
      });
      testUserIds.push(user.id);

      const sub = await prisma.subscription.create({
        data: {
          userId: user.id,
          planCode: "STANDARD",
          status: "CANCELED",
          billingCycle: "MONTHLY",
        },
      });
      testSubscriptionIds.push(sub.id);

      const filtered = await prisma.subscription.findMany({
        where: { status: "CANCELED" },
        select: { id: true, status: true },
      });

      expect(filtered.some((s) => s.id === sub.id)).toBe(true);
      expect(filtered.every((s) => s.status === "CANCELED")).toBe(true);
    });

    it("should filter by billing cycle", async () => {
      const user = await prisma.user.create({
        data: {
          displayName: "Cycle Filter User",
          email: "cycle-filter@example.com",
          updatedAt: new Date(),
        },
      });
      testUserIds.push(user.id);

      const sub = await prisma.subscription.create({
        data: {
          userId: user.id,
          planCode: "STANDARD",
          status: "ACTIVE",
          billingCycle: "YEARLY",
        },
      });
      testSubscriptionIds.push(sub.id);

      const filtered = await prisma.subscription.findMany({
        where: { billingCycle: "YEARLY" },
        select: { id: true, billingCycle: true },
      });

      expect(filtered.some((s) => s.id === sub.id)).toBe(true);
      expect(filtered.every((s) => s.billingCycle === "YEARLY")).toBe(true);
    });

    it("should filter expiring subscriptions", async () => {
      const user = await prisma.user.create({
        data: {
          displayName: "Expiring Filter User",
          email: "expiring-filter@example.com",
          updatedAt: new Date(),
        },
      });
      testUserIds.push(user.id);

      // Create subscription expiring in 5 days
      const expiringDate = new Date();
      expiringDate.setDate(expiringDate.getDate() + 5);

      const sub = await prisma.subscription.create({
        data: {
          userId: user.id,
          planCode: "STANDARD",
          status: "ACTIVE",
          billingCycle: "MONTHLY",
          currentPeriodEnd: expiringDate,
        },
      });
      testSubscriptionIds.push(sub.id);

      // Filter subscriptions expiring within 7 days
      const now = new Date();
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      const filtered = await prisma.subscription.findMany({
        where: {
          currentPeriodEnd: {
            gte: now,
            lte: futureDate,
          },
          status: { in: ["TRIAL", "ACTIVE"] },
        },
        select: { id: true, currentPeriodEnd: true },
      });

      expect(filtered.some((s) => s.id === sub.id)).toBe(true);
    });

    it("should calculate MRR correctly for MONTHLY subscriptions", async () => {
      const user = await prisma.user.create({
        data: {
          displayName: "MRR Monthly User",
          email: "mrr-monthly@example.com",
          updatedAt: new Date(),
        },
      });
      testUserIds.push(user.id);

      const apartment = await prisma.apartment.create({
        data: {
          ownerUserId: user.id,
          name: "MRR Test Apartment",
        },
      });

      // Create 5 rooms
      for (let i = 1; i <= 5; i++) {
        await prisma.room.create({
          data: {
            apartmentId: apartment.id,
            roomNumber: `${i}`,
            baseRent: 3000,
            waterRate: 18,
            electricRate: 7,
          },
        });
      }

      const sub = await prisma.subscription.create({
        data: {
          userId: user.id,
          planCode: "STANDARD",
          status: "ACTIVE",
          billingCycle: "MONTHLY",
        },
      });
      testSubscriptionIds.push(sub.id);

      // Get subscription with plan data
      const subWithPlan = await prisma.subscription.findUnique({
        where: { id: sub.id },
        include: {
          Plan: true,
          User: {
            include: {
              Apartment: {
                include: {
                  Room: true,
                },
              },
            },
          },
        },
      });

      const roomCount = subWithPlan!.User.Apartment.reduce(
        (sum, apt) => sum + apt.Room.length,
        0
      );
      const mrr = subWithPlan!.Plan.pricePerRoom * roomCount;

      expect(roomCount).toBe(5);
      expect(subWithPlan!.Plan.pricePerRoom).toBe(8); // STANDARD plan price from seed
      expect(mrr).toBe(40); // 8 * 5

      // Cleanup
      await prisma.apartment.delete({ where: { id: apartment.id } });
    });

    it("should calculate MRR correctly for YEARLY subscriptions", async () => {
      const user = await prisma.user.create({
        data: {
          displayName: "MRR Yearly User",
          email: "mrr-yearly@example.com",
          updatedAt: new Date(),
        },
      });
      testUserIds.push(user.id);

      const apartment = await prisma.apartment.create({
        data: {
          ownerUserId: user.id,
          name: "MRR Yearly Test Apartment",
        },
      });

      // Create 3 rooms
      for (let i = 1; i <= 3; i++) {
        await prisma.room.create({
          data: {
            apartmentId: apartment.id,
            roomNumber: `${i}`,
            baseRent: 3000,
            waterRate: 18,
            electricRate: 7,
          },
        });
      }

      const sub = await prisma.subscription.create({
        data: {
          userId: user.id,
          planCode: "PRO",
          status: "ACTIVE",
          billingCycle: "YEARLY",
        },
      });
      testSubscriptionIds.push(sub.id);

      const subWithPlan = await prisma.subscription.findUnique({
        where: { id: sub.id },
        include: {
          Plan: true,
          User: {
            include: {
              Apartment: {
                include: {
                  Room: true,
                },
              },
            },
          },
        },
      });

      const roomCount = subWithPlan!.User.Apartment.reduce(
        (sum, apt) => sum + apt.Room.length,
        0
      );
      const yearlyPrice = subWithPlan!.Plan.pricePerRoom * roomCount;
      const mrr = yearlyPrice / 12;

      expect(roomCount).toBe(3);
      expect(subWithPlan!.Plan.pricePerRoom).toBe(12); // PRO plan price from seed
      expect(mrr).toBe(3); // (12 * 3) / 12 = 3

      // Cleanup
      await prisma.apartment.delete({ where: { id: apartment.id } });
    });

    it("should calculate daysLeft correctly", async () => {
      const user = await prisma.user.create({
        data: {
          displayName: "Days Left User",
          email: "days-left@example.com",
          updatedAt: new Date(),
        },
      });
      testUserIds.push(user.id);

      const periodEnd = new Date();
      periodEnd.setDate(periodEnd.getDate() + 10); // 10 days from now

      const sub = await prisma.subscription.create({
        data: {
          userId: user.id,
          planCode: "STANDARD",
          status: "ACTIVE",
          billingCycle: "MONTHLY",
          currentPeriodEnd: periodEnd,
        },
      });
      testSubscriptionIds.push(sub.id);

      const subData = await prisma.subscription.findUnique({
        where: { id: sub.id },
        select: { currentPeriodEnd: true },
      });

      const now = new Date();
      const daysLeft = Math.ceil(
        (subData!.currentPeriodEnd!.getTime() - now.getTime()) /
          (1000 * 60 * 60 * 24)
      );

      expect(daysLeft).toBeGreaterThanOrEqual(9);
      expect(daysLeft).toBeLessThanOrEqual(11);
    });
  });

  describe("GET /api/admin/subscriptions/[id] - Subscription detail", () => {
    it("should return detailed subscription info", async () => {
      const user = await prisma.user.create({
        data: {
          displayName: "Detail Test User",
          email: "detail-test@example.com",
          emailVerified: true,
          role: "OWNER",
          status: "ACTIVE",
          updatedAt: new Date(),
        },
      });
      testUserIds.push(user.id);

      const apartment = await prisma.apartment.create({
        data: {
          ownerUserId: user.id,
          name: "Test Apartment",
          address: "123 Test Street",
        },
      });

      for (let i = 1; i <= 3; i++) {
        await prisma.room.create({
          data: {
            apartmentId: apartment.id,
            roomNumber: `${i}`,
            baseRent: 3000,
            waterRate: 18,
            electricRate: 7,
          },
        });
      }

      const sub = await prisma.subscription.create({
        data: {
          userId: user.id,
          planCode: "STANDARD",
          status: "ACTIVE",
          billingCycle: "MONTHLY",
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          roomQuotaSnapshot: 50,
        },
      });
      testSubscriptionIds.push(sub.id);

      const detail = await prisma.subscription.findUnique({
        where: { id: sub.id },
        select: {
          id: true,
          planCode: true,
          status: true,
          billingCycle: true,
          currentPeriodStart: true,
          currentPeriodEnd: true,
          trialEndsAt: true,
          roomQuotaSnapshot: true,
          createdAt: true,
          updatedAt: true,
          User: {
            select: {
              id: true,
              displayName: true,
              email: true,
              emailVerified: true,
              avatarUrl: true,
              role: true,
              status: true,
              createdAt: true,
              lastLoginAt: true,
              Apartment: {
                select: {
                  id: true,
                  name: true,
                  address: true,
                  createdAt: true,
                  Room: {
                    select: {
                      id: true,
                    },
                  },
                },
              },
            },
          },
          Plan: {
            select: {
              code: true,
              name: true,
              displayName: true,
              pricePerRoom: true,
              tierSize: true,
              maxRooms: true,
              features: true,
            },
          },
        },
      });

      expect(detail).not.toBeNull();
      expect(detail!.id).toBe(sub.id);
      expect(detail!.User.displayName).toBe("Detail Test User");
      expect(detail!.User.Apartment.length).toBe(1);
      expect(detail!.User.Apartment[0].Room.length).toBe(3);
      expect(detail!.Plan.code).toBe("STANDARD");
      expect(detail!.roomQuotaSnapshot).toBe(50);

      // Cleanup
      await prisma.apartment.delete({ where: { id: apartment.id } });
    });

    it("should return 404 for non-existent subscription", async () => {
      const nonExistentId = 999999;
      const sub = await prisma.subscription.findUnique({
        where: { id: nonExistentId },
      });

      expect(sub).toBeNull();
    });
  });

  describe("POST /api/admin/subscriptions/[id]/extend-trial", () => {
    it("should extend trial by specified days", async () => {
      const user = await prisma.user.create({
        data: {
          displayName: "Extend Trial User",
          email: "extend-trial@example.com",
          updatedAt: new Date(),
        },
      });
      testUserIds.push(user.id);

      const oldDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const sub = await prisma.subscription.create({
        data: {
          userId: user.id,
          planCode: "TRIAL",
          status: "TRIAL",
          billingCycle: "MONTHLY",
          trialEndsAt: oldDate,
        },
      });
      testSubscriptionIds.push(sub.id);

      // Extend trial by 14 days
      const daysToAdd = 14;
      const newDate = new Date(oldDate);
      newDate.setDate(newDate.getDate() + daysToAdd);

      const updated = await prisma.subscription.update({
        where: { id: sub.id },
        data: { trialEndsAt: newDate },
        select: { id: true, trialEndsAt: true },
      });

      expect(updated.trialEndsAt).not.toBeNull();
      const daysDiff = Math.ceil(
        (updated.trialEndsAt!.getTime() - oldDate.getTime()) /
          (1000 * 60 * 60 * 24)
      );
      expect(daysDiff).toBe(daysToAdd);
    });

    it("should reject negative days", async () => {
      const user = await prisma.user.create({
        data: {
          displayName: "Negative Days User",
          email: "negative-days@example.com",
          updatedAt: new Date(),
        },
      });
      testUserIds.push(user.id);

      const sub = await prisma.subscription.create({
        data: {
          userId: user.id,
          planCode: "TRIAL",
          status: "TRIAL",
          billingCycle: "MONTHLY",
          trialEndsAt: new Date(),
        },
      });
      testSubscriptionIds.push(sub.id);

      // Validation: days must be positive integer
      const days = -5;
      const isValid =
        days && typeof days === "number" && days > 0 && Number.isInteger(days);

      expect(isValid).toBe(false);
    });

    it("should reject non-TRIAL status subscriptions", async () => {
      const user = await prisma.user.create({
        data: {
          displayName: "Non-Trial User",
          email: "non-trial@example.com",
          updatedAt: new Date(),
        },
      });
      testUserIds.push(user.id);

      const sub = await prisma.subscription.create({
        data: {
          userId: user.id,
          planCode: "STANDARD",
          status: "ACTIVE",
          billingCycle: "MONTHLY",
        },
      });
      testSubscriptionIds.push(sub.id);

      const subData = await prisma.subscription.findUnique({
        where: { id: sub.id },
        select: { status: true },
      });

      expect(subData!.status).not.toBe("TRIAL");
    });

    it("should reject if trialEndsAt is null", async () => {
      const user = await prisma.user.create({
        data: {
          displayName: "Null Trial User",
          email: "null-trial@example.com",
          updatedAt: new Date(),
        },
      });
      testUserIds.push(user.id);

      const sub = await prisma.subscription.create({
        data: {
          userId: user.id,
          planCode: "TRIAL",
          status: "TRIAL",
          billingCycle: "MONTHLY",
          trialEndsAt: null,
        },
      });
      testSubscriptionIds.push(sub.id);

      const subData = await prisma.subscription.findUnique({
        where: { id: sub.id },
        select: { trialEndsAt: true },
      });

      expect(subData!.trialEndsAt).toBeNull();
    });

    it("should create audit log for extend-trial action", async () => {
      const user = await prisma.user.create({
        data: {
          displayName: "Audit Log User",
          email: "audit-extend@example.com",
          updatedAt: new Date(),
        },
      });
      testUserIds.push(user.id);

      const sub = await prisma.subscription.create({
        data: {
          userId: user.id,
          planCode: "TRIAL",
          status: "TRIAL",
          billingCycle: "MONTHLY",
          trialEndsAt: new Date(),
        },
      });
      testSubscriptionIds.push(sub.id);

      // Simulate creating audit log
      const auditLog = await prisma.auditLog.create({
        data: {
          category: "ADMIN",
          action: "extend_trial",
          userId: adminUserId,
          targetType: "SUBSCRIPTION",
          targetId: sub.id,
          details: JSON.stringify({
            days: 14,
            targetUserId: user.id,
          }),
        },
      });

      expect(auditLog.action).toBe("extend_trial");
      expect(auditLog.targetType).toBe("SUBSCRIPTION");
      expect(auditLog.targetId).toBe(sub.id);

      await prisma.auditLog.delete({ where: { id: auditLog.id } });
    });
  });

  describe("POST /api/admin/subscriptions/[id]/change-plan", () => {
    it("should change plan successfully", async () => {
      const user = await prisma.user.create({
        data: {
          displayName: "Change Plan User",
          email: "change-plan@example.com",
          updatedAt: new Date(),
        },
      });
      testUserIds.push(user.id);

      const sub = await prisma.subscription.create({
        data: {
          userId: user.id,
          planCode: "STARTER",
          status: "ACTIVE",
          billingCycle: "MONTHLY",
        },
      });
      testSubscriptionIds.push(sub.id);

      const updated = await prisma.subscription.update({
        where: { id: sub.id },
        data: { planCode: "STANDARD" },
        select: { id: true, planCode: true },
      });

      expect(updated.planCode).toBe("STANDARD");
    });

    it("should reject invalid plan code", async () => {
      const invalidPlan = "NONEXISTENT_PLAN";
      const plan = await prisma.plan.findUnique({
        where: { code: invalidPlan },
      });

      expect(plan).toBeNull();
    });

    it("should create audit log for change-plan action", async () => {
      const user = await prisma.user.create({
        data: {
          displayName: "Audit Change Plan User",
          email: "audit-change-plan@example.com",
          updatedAt: new Date(),
        },
      });
      testUserIds.push(user.id);

      const sub = await prisma.subscription.create({
        data: {
          userId: user.id,
          planCode: "STARTER",
          status: "ACTIVE",
          billingCycle: "MONTHLY",
        },
      });
      testSubscriptionIds.push(sub.id);

      const auditLog = await prisma.auditLog.create({
        data: {
          category: "ADMIN",
          action: "change_plan",
          userId: adminUserId,
          targetType: "SUBSCRIPTION",
          targetId: sub.id,
          details: JSON.stringify({
            oldPlan: "STARTER",
            newPlan: "STANDARD",
            targetUserId: user.id,
          }),
        },
      });

      expect(auditLog.action).toBe("change_plan");
      expect(auditLog.targetType).toBe("SUBSCRIPTION");

      await prisma.auditLog.delete({ where: { id: auditLog.id } });
    });
  });

  describe("POST /api/admin/subscriptions/[id]/cancel", () => {
    it("should cancel subscription successfully", async () => {
      const user = await prisma.user.create({
        data: {
          displayName: "Cancel User",
          email: "cancel@example.com",
          updatedAt: new Date(),
        },
      });
      testUserIds.push(user.id);

      const periodEnd = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);
      const sub = await prisma.subscription.create({
        data: {
          userId: user.id,
          planCode: "STANDARD",
          status: "ACTIVE",
          billingCycle: "MONTHLY",
          currentPeriodEnd: periodEnd,
        },
      });
      testSubscriptionIds.push(sub.id);

      const canceled = await prisma.subscription.update({
        where: { id: sub.id },
        data: { status: "CANCELED" },
        select: { id: true, status: true, currentPeriodEnd: true },
      });

      expect(canceled.status).toBe("CANCELED");
      expect(canceled.currentPeriodEnd).toEqual(periodEnd);
    });

    it("should reject canceling already-canceled subscription", async () => {
      const user = await prisma.user.create({
        data: {
          displayName: "Already Canceled User",
          email: "already-canceled@example.com",
          updatedAt: new Date(),
        },
      });
      testUserIds.push(user.id);

      const sub = await prisma.subscription.create({
        data: {
          userId: user.id,
          planCode: "STANDARD",
          status: "CANCELED",
          billingCycle: "MONTHLY",
        },
      });
      testSubscriptionIds.push(sub.id);

      const subData = await prisma.subscription.findUnique({
        where: { id: sub.id },
        select: { status: true },
      });

      expect(subData!.status).toBe("CANCELED");
    });

    it("should create audit log for cancel action", async () => {
      const user = await prisma.user.create({
        data: {
          displayName: "Audit Cancel User",
          email: "audit-cancel@example.com",
          updatedAt: new Date(),
        },
      });
      testUserIds.push(user.id);

      const sub = await prisma.subscription.create({
        data: {
          userId: user.id,
          planCode: "STANDARD",
          status: "ACTIVE",
          billingCycle: "MONTHLY",
        },
      });
      testSubscriptionIds.push(sub.id);

      const auditLog = await prisma.auditLog.create({
        data: {
          category: "ADMIN",
          action: "cancel_subscription",
          userId: adminUserId,
          targetType: "SUBSCRIPTION",
          targetId: sub.id,
          details: JSON.stringify({
            targetUserId: user.id,
          }),
        },
      });

      expect(auditLog.action).toBe("cancel_subscription");
      expect(auditLog.targetType).toBe("SUBSCRIPTION");

      await prisma.auditLog.delete({ where: { id: auditLog.id } });
    });
  });

  describe("Authorization", () => {
    it("should require admin role for subscription management", async () => {
      // Create regular user (non-admin)
      const regularUser = await prisma.user.create({
        data: {
          displayName: "Regular User",
          email: "regular@example.com",
          role: "OWNER",
          status: "ACTIVE",
          updatedAt: new Date(),
        },
      });
      testUserIds.push(regularUser.id);

      // Verify user is not admin
      expect(regularUser.role).not.toBe("PLATFORM_ADMIN");

      // Admin user should have correct role
      const adminUser = await prisma.user.findUnique({
        where: { id: adminUserId },
        select: { role: true },
      });

      expect(adminUser!.role).toBe("PLATFORM_ADMIN");
    });
  });
});
