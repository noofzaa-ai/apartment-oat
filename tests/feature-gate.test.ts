import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { checkRoomQuota, QuotaExceededError } from "@/lib/quota";

describe("Feature Gating and Quota", () => {
  let starterUserId: number;
  let standardUserId: number;
  let trialUserId: number;

  beforeAll(async () => {
    // Create users with different plans
    const starterUser = await prisma.user.create({
      data: {
        displayName: "Starter User",
        updatedAt: new Date(),
        Subscription: {
          create: {
            planCode: "STARTER",
            status: "ACTIVE",
          },
        },
      },
    });
    starterUserId = starterUser.id;

    const standardUser = await prisma.user.create({
      data: {
        displayName: "Standard User",
        updatedAt: new Date(),
        Subscription: {
          create: {
            planCode: "STANDARD",
            status: "ACTIVE",
          },
        },
      },
    });
    standardUserId = standardUser.id;

    const trialUser = await prisma.user.create({
      data: {
        displayName: "Trial User",
        updatedAt: new Date(),
        Subscription: {
          create: {
            planCode: "TRIAL",
            status: "TRIAL",
            trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
        },
      },
    });
    trialUserId = trialUser.id;
  });

  afterAll(async () => {
    await prisma.apartment.deleteMany({
      where: {
        ownerUserId: { in: [starterUserId, standardUserId, trialUserId] },
      },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [starterUserId, standardUserId, trialUserId] } },
    });
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean apartments/rooms before each test
    await prisma.apartment.deleteMany({
      where: {
        ownerUserId: { in: [starterUserId, standardUserId, trialUserId] },
      },
    });
  });

  describe("Room Quota Enforcement", () => {
    it("should allow STARTER user to create rooms up to unlimited", async () => {
      const starterPlan = await prisma.plan.findUnique({ where: { code: "STARTER" } });
      expect(starterPlan?.maxRooms).toBeNull();

      await expect(checkRoomQuota(starterUserId, 100)).resolves.not.toThrow();
    });

    it("should enforce TRIAL limit of 10 rooms", async () => {
      const trialPlan = await prisma.plan.findUnique({ where: { code: "TRIAL" } });
      expect(trialPlan?.maxRooms).toBe(10);

      // Create apartment with 9 rooms
      const apt = await prisma.apartment.create({
        data: {
          ownerUserId: trialUserId,
          name: "Trial Apartment",
        },
      });

      for (let i = 1; i <= 9; i++) {
        await prisma.room.create({
          data: {
            apartmentId: apt.id,
            roomNumber: `${i}`,
            baseRent: 3000,
            waterRate: 18,
            electricRate: 7,
          },
        });
      }

      // Should allow 1 more room (total 10)
      await expect(checkRoomQuota(trialUserId, 1)).resolves.not.toThrow();

      // Should reject 2 more rooms (total 11)
      await expect(checkRoomQuota(trialUserId, 2)).rejects.toThrow(QuotaExceededError);
    });

    it("should throw QuotaExceededError with correct details", async () => {
      // Create 10 rooms for trial user
      const apt = await prisma.apartment.create({
        data: {
          ownerUserId: trialUserId,
          name: "Full Trial Apartment",
        },
      });

      for (let i = 1; i <= 10; i++) {
        await prisma.room.create({
          data: {
            apartmentId: apt.id,
            roomNumber: `${i}`,
            baseRent: 3000,
            waterRate: 18,
            electricRate: 7,
          },
        });
      }

      try {
        await checkRoomQuota(trialUserId, 1);
        expect.fail("Should have thrown QuotaExceededError");
      } catch (error) {
        expect(error).toBeInstanceOf(QuotaExceededError);
        const quotaError = error as QuotaExceededError;
        expect(quotaError.current).toBe(10);
        expect(quotaError.limit).toBe(10);
        expect(quotaError.planCode).toBe("TRIAL");
      }
    });

    it("should allow bulk room creation within quota", async () => {
      // Trial user with 5 rooms can add 5 more
      const apt = await prisma.apartment.create({
        data: {
          ownerUserId: trialUserId,
          name: "Partial Trial Apartment",
        },
      });

      for (let i = 1; i <= 5; i++) {
        await prisma.room.create({
          data: {
            apartmentId: apt.id,
            roomNumber: `${i}`,
            baseRent: 3000,
            waterRate: 18,
            electricRate: 7,
          },
        });
      }

      await expect(checkRoomQuota(trialUserId, 5)).resolves.not.toThrow();
    });

    it("should reject bulk room creation exceeding quota", async () => {
      // Trial user with 5 rooms cannot add 10 more
      const apt = await prisma.apartment.create({
        data: {
          ownerUserId: trialUserId,
          name: "Partial Trial Apartment 2",
        },
      });

      for (let i = 1; i <= 5; i++) {
        await prisma.room.create({
          data: {
            apartmentId: apt.id,
            roomNumber: `${i}`,
            baseRent: 3000,
            waterRate: 18,
            electricRate: 7,
          },
        });
      }

      await expect(checkRoomQuota(trialUserId, 10)).rejects.toThrow(QuotaExceededError);
    });
  });

  describe("Feature Access", () => {
    it("should verify STARTER plan has no premium features", async () => {
      const sub = await prisma.subscription.findUnique({
        where: { userId: starterUserId },
        include: { Plan: true },
      });

      const features = JSON.parse(sub!.Plan.features);
      expect(features).toEqual([]);
    });

    it("should verify STANDARD plan has room_preset and bulk_create", async () => {
      const sub = await prisma.subscription.findUnique({
        where: { userId: standardUserId },
        include: { Plan: true },
      });

      const features = JSON.parse(sub!.Plan.features);
      expect(features).toContain("room_preset");
      expect(features).toContain("bulk_create");
      expect(features).toContain("export_csv");
      expect(features).not.toContain("line_notify");
    });

    it("should verify PRO plan has all features", async () => {
      const proPlan = await prisma.plan.findUnique({ where: { code: "PRO" } });
      const features = JSON.parse(proPlan!.features);

      expect(features).toContain("room_preset");
      expect(features).toContain("bulk_create");
      expect(features).toContain("line_notify");
      expect(features).toContain("api_access");
      expect(features).toContain("custom_branding");
    });
  });
});
