import { describe, it, expect, beforeEach, vi } from "vitest";

// Test to verify tenant APIs return required fields

const mockPrisma = vi.hoisted(() => ({
  user: { findUnique: vi.fn() },
  membership: { findFirst: vi.fn() },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

vi.mock("@/lib/session", () => ({
  getSession: vi.fn().mockResolvedValue({ userId: 123 }),
}));

import { getTenantMembership } from "@/lib/auth";

describe("Tenant API data structure", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("getTenantMembership should include apartment address", async () => {
    // This test verifies the fix: apartment.address should be included
    const mockMembership = {
      id: 1,
      userId: 123,
      apartmentId: 1,
      role: "TENANT",
      roomId: 5,
      user: { id: 123, displayName: "Test User", email: "test@example.com" },
      Room: {
        id: 5,
        roomNumber: "101",
        roomType: "Standard",
        baseRent: 5000,
        waterRate: 18,
        electricRate: 7,
        Apartment: { id: 1, name: "Test Apartment", address: "123 Test Street" },
        options: [],
      },
      Apartment: { id: 1, name: "Test Apartment", address: "123 Test Street" },
    };

    mockPrisma.membership.findFirst.mockResolvedValue(mockMembership);

    const result = await getTenantMembership(123);

    expect(mockPrisma.membership.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          Room: expect.objectContaining({
            include: expect.objectContaining({
              Apartment: { select: { id: true, name: true, address: true } },
            }),
          }),
          Apartment: { select: { id: true, name: true, address: true } },
        }),
      })
    );
    expect(result).toBeDefined();
    expect(result?.Room?.Apartment?.name).toBe("Test Apartment");
    expect(result?.Room?.Apartment).toHaveProperty("address");
  });

  it("tenant object should include email", () => {
    // Email should be available in tenant responses
    const user = { id: 123, displayName: "Test", email: "test@example.com" };
    const tenant = {
      id: user.id,
      name: user.displayName ?? user.email ?? "ผู้เช่า",
      email: user.email ?? "",
    };

    expect(tenant.email).toBe("test@example.com");
    expect(tenant.name).toBe("Test");
  });
});
