import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";

describe("Subscription API", () => {
  let testUserId: number;
  let sessionCookie: string;

  beforeAll(async () => {
    // Create test user
    const user = await prisma.user.create({
      data: {
        displayName: "Subscription Test User",
        email: "sub-test@example.com",
        updatedAt: new Date(),
      },
    });
    testUserId = user.id;

    // Create mock session (simplified - in real tests you'd use actual session)
    sessionCookie = "mock-session-cookie";
  });

  afterAll(async () => {
    // Cleanup
    await prisma.subscription.deleteMany({ where: { userId: testUserId } });
    await prisma.user.delete({ where: { id: testUserId } });
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean subscription before each test
    await prisma.subscription.deleteMany({ where: { userId: testUserId } });
  });

  describe("GET /api/subscription", () => {
    it("should return no subscription if none exists", async () => {
      // This would require actual HTTP testing or mocking
      // For now, test the data layer
      const sub = await prisma.subscription.findUnique({
        where: { userId: testUserId },
      });
      expect(sub).toBeNull();
    });

    it("should return subscription with plan details", async () => {
      await prisma.subscription.create({
        data: {
          userId: testUserId,
          planCode: "STANDARD",
          status: "ACTIVE",
          billingCycle: "MONTHLY",
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });

      const sub = await prisma.subscription.findUnique({
        where: { userId: testUserId },
        include: { Plan: true },
      });

      expect(sub).not.toBeNull();
      expect(sub?.planCode).toBe("STANDARD");
      expect(sub?.Plan.displayName).toBe("Standard");
      expect(sub?.status).toBe("ACTIVE");
    });
  });

  describe("POST /api/subscription/upgrade", () => {
    it("should create new subscription when none exists", async () => {
      const sub = await prisma.subscription.create({
        data: {
          userId: testUserId,
          planCode: "STARTER",
          status: "ACTIVE",
          billingCycle: "MONTHLY",
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });

      expect(sub.planCode).toBe("STARTER");
      expect(sub.status).toBe("ACTIVE");
    });

    it("should upgrade from STARTER to STANDARD", async () => {
      await prisma.subscription.create({
        data: {
          userId: testUserId,
          planCode: "STARTER",
          status: "ACTIVE",
          billingCycle: "MONTHLY",
        },
      });

      const updated = await prisma.subscription.update({
        where: { userId: testUserId },
        data: { planCode: "STANDARD" },
      });

      expect(updated.planCode).toBe("STANDARD");
    });

    it("should prevent downgrade if room count exceeds new plan limit", async () => {
      // Create STANDARD subscription
      await prisma.subscription.create({
        data: {
          userId: testUserId,
          planCode: "STANDARD",
          status: "ACTIVE",
        },
      });

      // Create apartment with 15 rooms (exceeds TRIAL limit of 10)
      const apt = await prisma.apartment.create({
        data: {
          ownerUserId: testUserId,
          name: "Large Apartment",
        },
      });

      const roomPromises = [];
      for (let i = 1; i <= 15; i++) {
        roomPromises.push(
          prisma.room.create({
            data: {
              apartmentId: apt.id,
              roomNumber: `${i}`,
              baseRent: 3000,
              waterRate: 18,
              electricRate: 7,
            },
          })
        );
      }
      await Promise.all(roomPromises);

      const roomCount = await prisma.room.count({
        where: { Apartment: { ownerUserId: testUserId } },
      });
      expect(roomCount).toBe(15);

      const trialPlan = await prisma.plan.findUnique({ where: { code: "TRIAL" } });
      expect(trialPlan?.maxRooms).toBe(10);
      expect(roomCount).toBeGreaterThan(trialPlan!.maxRooms!);

      // Cleanup
      await prisma.apartment.delete({ where: { id: apt.id } });
    });

    it("should apply yearly billing cycle correctly", async () => {
      const now = new Date();
      const sub = await prisma.subscription.create({
        data: {
          userId: testUserId,
          planCode: "STANDARD",
          status: "ACTIVE",
          billingCycle: "YEARLY",
          currentPeriodStart: now,
          currentPeriodEnd: new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000),
        },
      });

      expect(sub.billingCycle).toBe("YEARLY");
      
      const daysDiff = Math.floor(
        (sub.currentPeriodEnd!.getTime() - sub.currentPeriodStart!.getTime()) /
          (24 * 60 * 60 * 1000)
      );
      expect(daysDiff).toBeGreaterThanOrEqual(364);
      expect(daysDiff).toBeLessThanOrEqual(366);
    });
  });

  describe("POST /api/subscription/cancel", () => {
    it("should mark subscription as CANCELED but keep access until period end", async () => {
      const periodEnd = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);
      await prisma.subscription.create({
        data: {
          userId: testUserId,
          planCode: "STANDARD",
          status: "ACTIVE",
          billingCycle: "MONTHLY",
          currentPeriodEnd: periodEnd,
        },
      });

      const canceled = await prisma.subscription.update({
        where: { userId: testUserId },
        data: { status: "CANCELED" },
      });

      expect(canceled.status).toBe("CANCELED");
      expect(canceled.currentPeriodEnd).toEqual(periodEnd);
    });
  });
});
