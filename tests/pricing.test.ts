import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  calculatePrice,
  getTierForRoomCount,
  hasFeature,
  getRoomCount,
  getPlanWithFeature,
} from "@/lib/pricing";

describe("Pricing Logic", () => {
  beforeAll(async () => {
    // Ensure plans exist (they should be seeded)
    const plans = await prisma.plan.findMany();
    if (plans.length === 0) {
      throw new Error("Plans not seeded. Run migration first.");
    }
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe("getTierForRoomCount", () => {
    it("should calculate tier 0 for 1-25 rooms", () => {
      expect(getTierForRoomCount(1, 25)).toBe(0);
      expect(getTierForRoomCount(25, 25)).toBe(0);
    });

    it("should calculate tier 1 for 26-50 rooms", () => {
      expect(getTierForRoomCount(26, 25)).toBe(1);
      expect(getTierForRoomCount(30, 25)).toBe(1);
      expect(getTierForRoomCount(50, 25)).toBe(1);
    });

    it("should calculate tier 2 for 51-75 rooms", () => {
      expect(getTierForRoomCount(51, 25)).toBe(2);
      expect(getTierForRoomCount(75, 25)).toBe(2);
    });

    it("should return 0 for 0 or negative rooms", () => {
      expect(getTierForRoomCount(0, 25)).toBe(0);
      expect(getTierForRoomCount(-5, 25)).toBe(0);
    });
  });

  describe("calculatePrice", () => {
    it("should return 0 for TRIAL plan", async () => {
      const price = await calculatePrice("TRIAL", 10, "MONTHLY");
      expect(price).toBe(0);
    });

    it("should calculate STARTER monthly price correctly", async () => {
      // 1-25 rooms: 25 * 5 = 125
      expect(await calculatePrice("STARTER", 1, "MONTHLY")).toBe(125);
      expect(await calculatePrice("STARTER", 25, "MONTHLY")).toBe(125);

      // 26-50 rooms: 50 * 5 = 250
      expect(await calculatePrice("STARTER", 26, "MONTHLY")).toBe(250);
      expect(await calculatePrice("STARTER", 30, "MONTHLY")).toBe(250);
      expect(await calculatePrice("STARTER", 50, "MONTHLY")).toBe(250);

      // 51-75 rooms: 75 * 5 = 375
      expect(await calculatePrice("STARTER", 51, "MONTHLY")).toBe(375);
    });

    it("should calculate STANDARD monthly price correctly", async () => {
      // 1-25 rooms: 25 * 8 = 200
      expect(await calculatePrice("STANDARD", 1, "MONTHLY")).toBe(200);
      expect(await calculatePrice("STANDARD", 25, "MONTHLY")).toBe(200);

      // 26-50 rooms: 50 * 8 = 400
      expect(await calculatePrice("STANDARD", 30, "MONTHLY")).toBe(400);
    });

    it("should calculate PRO monthly price correctly", async () => {
      // 1-25 rooms: 25 * 12 = 300
      expect(await calculatePrice("PRO", 1, "MONTHLY")).toBe(300);

      // 26-50 rooms: 50 * 12 = 600
      expect(await calculatePrice("PRO", 30, "MONTHLY")).toBe(600);
    });

    it("should apply yearly discount (10 months)", async () => {
      // STARTER 30 rooms: monthly = 250, yearly = 2500
      expect(await calculatePrice("STARTER", 30, "YEARLY")).toBe(2500);

      // STANDARD 30 rooms: monthly = 400, yearly = 4000
      expect(await calculatePrice("STANDARD", 30, "YEARLY")).toBe(4000);

      // PRO 30 rooms: monthly = 600, yearly = 6000
      expect(await calculatePrice("PRO", 30, "YEARLY")).toBe(6000);
    });

    it("should throw error for non-existent plan", async () => {
      await expect(calculatePrice("INVALID", 10, "MONTHLY")).rejects.toThrow();
    });
  });

  describe("hasFeature", () => {
    it("should return true when feature exists", () => {
      const features = '["room_preset","bulk_create","export_csv"]';
      expect(hasFeature(features, "room_preset")).toBe(true);
      expect(hasFeature(features, "bulk_create")).toBe(true);
    });

    it("should return false when feature does not exist", () => {
      const features = '["room_preset","bulk_create"]';
      expect(hasFeature(features, "line_notify")).toBe(false);
      expect(hasFeature(features, "api_access")).toBe(false);
    });

    it("should return false for empty feature list", () => {
      const features = "[]";
      expect(hasFeature(features, "room_preset")).toBe(false);
    });

    it("should handle invalid JSON gracefully", () => {
      const features = "not-json";
      expect(hasFeature(features, "room_preset")).toBe(false);
    });
  });

  describe("getPlanWithFeature", () => {
    it("should find STANDARD plan for room_preset", async () => {
      const plan = await getPlanWithFeature("room_preset");
      expect(plan).toBe("STANDARD");
    });

    it("should find STANDARD plan for bulk_create", async () => {
      const plan = await getPlanWithFeature("bulk_create");
      expect(plan).toBe("STANDARD");
    });

    it("should find PRO plan for line_notify", async () => {
      const plan = await getPlanWithFeature("line_notify");
      expect(plan).toBe("PRO");
    });

    it("should return null for non-existent feature", async () => {
      const plan = await getPlanWithFeature("nonexistent_feature");
      expect(plan).toBeNull();
    });
  });

  describe("getRoomCount", () => {
    it("should return 0 for user with no apartments", async () => {
      // Create a user with no apartments
      const user = await prisma.user.create({
        data: { displayName: "Test User No Apartments", updatedAt: new Date() },
      });

      const count = await getRoomCount(user.id);
      expect(count).toBe(0);

      await prisma.user.delete({ where: { id: user.id } });
    });

    it("should count rooms across all user's apartments", async () => {
      // Create user with subscription
      const user = await prisma.user.create({
        data: {
          displayName: "Test User Multiple Apartments",
          updatedAt: new Date(),
          Subscription: {
            create: {
              planCode: "STANDARD",
              status: "ACTIVE",
            },
          },
        },
      });

      // Create two apartments with rooms
      const apt1 = await prisma.apartment.create({
        data: {
          ownerUserId: user.id,
          name: "Apartment 1",
          Room: {
            create: [
              { roomNumber: "101", baseRent: 3000, waterRate: 18, electricRate: 7 },
              { roomNumber: "102", baseRent: 3000, waterRate: 18, electricRate: 7 },
            ],
          },
        },
      });

      const apt2 = await prisma.apartment.create({
        data: {
          ownerUserId: user.id,
          name: "Apartment 2",
          Room: {
            create: [
              { roomNumber: "201", baseRent: 3500, waterRate: 18, electricRate: 7 },
              { roomNumber: "202", baseRent: 3500, waterRate: 18, electricRate: 7 },
              { roomNumber: "203", baseRent: 3500, waterRate: 18, electricRate: 7 },
            ],
          },
        },
      });

      const count = await getRoomCount(user.id);
      expect(count).toBe(5);

      // Cleanup
      await prisma.apartment.deleteMany({ where: { ownerUserId: user.id } });
      await prisma.user.delete({ where: { id: user.id } });
    });
  });
});
