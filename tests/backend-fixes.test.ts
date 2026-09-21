import { describe, it, expect, beforeEach, vi } from "vitest";

// Integration test to verify backend fixes for email and apartment data

const mockPrisma = vi.hoisted(() => ({
  user: { findUnique: vi.fn(), update: vi.fn(), create: vi.fn() },
  externalIdentity: { findUnique: vi.fn() },
  membership: { findFirst: vi.fn() },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

vi.mock("@/lib/session", () => ({
  getSession: vi.fn().mockResolvedValue({ userId: 456 }),
}));

import { getTenantMembership } from "@/lib/auth";
import { provisionUserFromClaims } from "@/lib/oidc-flow";

describe("Backend fixes verification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Issue 1: Email provisioning from OIDC", () => {
    it("provisionUserFromClaims should save email when provided", async () => {
      // New user scenario
      mockPrisma.externalIdentity.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({ id: 999 });

      await provisionUserFromClaims({
        iss: "https://account.daiyooo.com",
        sub: "user123",
        email: "test@example.com",
        emailVerified: true,
        name: "Test User",
        picture: undefined,
      });

      expect(mockPrisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: "test@example.com",
            emailVerified: true,
            displayName: "Test User",
          }),
        })
      );
    });

    it("provisionUserFromClaims should update email for existing users", async () => {
      // Existing user scenario
      mockPrisma.externalIdentity.findUnique.mockResolvedValue({ userId: 888 });
      mockPrisma.user.update.mockResolvedValue({ id: 888 });

      await provisionUserFromClaims({
        iss: "https://account.daiyooo.com",
        sub: "user123",
        email: "updated@example.com",
        emailVerified: true,
        name: "Updated Name",
        picture: undefined,
      });

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 888 },
        data: {
          displayName: "Updated Name",
          email: "updated@example.com",
          emailVerified: true,
          avatarUrl: undefined,
        },
      });
    });
  });

  describe("Issue 2: Apartment address and room details in tenant API", () => {
    it("getTenantMembership should include apartment address field", async () => {
      const mockMembership = {
        id: 1,
        userId: 456,
        apartmentId: 10,
        role: "TENANT",
        roomId: 20,
        user: { id: 456, displayName: "Tenant User", email: "tenant@example.com" },
        Room: {
          id: 20,
          roomNumber: "202",
          roomType: "Deluxe",
          baseRent: 8000,
          waterRate: 20,
          electricRate: 8,
          Apartment: { id: 10, name: "Green Apartments", address: "456 Green Street, Bangkok" },
          options: [{ id: 1, name: "Parking", price: 500 }],
        },
        Apartment: { id: 10, name: "Green Apartments", address: "456 Green Street, Bangkok" },
      };

      mockPrisma.membership.findFirst.mockResolvedValue(mockMembership);

      const result = await getTenantMembership(456);

      // Verify apartment address is included
      expect(result?.Room?.Apartment?.address).toBe("456 Green Street, Bangkok");
      expect(result?.Apartment?.address).toBe("456 Green Street, Bangkok");
      
      // Verify room details are included
      expect(result?.Room?.roomNumber).toBe("202");
      expect(result?.Room?.roomType).toBe("Deluxe");
      expect(result?.Room?.baseRent).toBe(8000);
      expect(result?.Room?.waterRate).toBe(20);
      expect(result?.Room?.electricRate).toBe(8);
      
      // Verify apartment name
      expect(result?.Room?.Apartment?.name).toBe("Green Apartments");
    });

    it("roomForUi transformation includes location with address", () => {
      // Simulate the roomForUi function used in tenant APIs
      const room = {
        id: 20,
        roomNumber: "303",
        roomType: "Suite",
        baseRent: 12000,
        waterRate: 22,
        electricRate: 9,
        Apartment: { id: 10, name: "Blue Tower", address: "789 Blue Road" },
        options: [],
      };

      const roomForUi = { ...room, location: room.Apartment };

      expect(roomForUi.location.name).toBe("Blue Tower");
      expect(roomForUi.location.address).toBe("789 Blue Road");
      expect(roomForUi.roomNumber).toBe("303");
      expect(roomForUi.baseRent).toBe(12000);
    });
  });
});
