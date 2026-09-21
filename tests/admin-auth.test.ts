import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { requirePlatformAdmin, requireSuperAdmin } from "@/lib/admin-auth";
import { NextResponse } from "next/server";

// Mock session
let mockSession: { userId?: number } = {};

// Mock getSession
vi.mock("@/lib/session", () => ({
  getSession: vi.fn(() => Promise.resolve(mockSession)),
}));

describe("Admin Authorization Middleware", () => {
  let regularUser: { id: number };
  let platformAdmin: { id: number };
  let superAdmin: { id: number };
  let suspendedAdmin: { id: number };

  beforeAll(async () => {
    // Create test users with different roles
    regularUser = await prisma.user.create({
      data: {
        displayName: "Regular User",
        email: "regular@test.com",
        role: "USER",
        status: "ACTIVE",
        updatedAt: new Date(),
      },
    });

    platformAdmin = await prisma.user.create({
      data: {
        displayName: "Platform Admin",
        email: "platform@test.com",
        role: "PLATFORM_ADMIN",
        status: "ACTIVE",
        updatedAt: new Date(),
      },
    });

    superAdmin = await prisma.user.create({
      data: {
        displayName: "Super Admin",
        email: "super@test.com",
        role: "SUPER_ADMIN",
        status: "ACTIVE",
        updatedAt: new Date(),
      },
    });

    suspendedAdmin = await prisma.user.create({
      data: {
        displayName: "Suspended Admin",
        email: "suspended@test.com",
        role: "PLATFORM_ADMIN",
        status: "SUSPENDED",
        updatedAt: new Date(),
      },
    });
  });

  afterAll(async () => {
    // Cleanup test users
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [
            "regular@test.com",
            "platform@test.com",
            "super@test.com",
            "suspended@test.com",
          ],
        },
      },
    });
  });

  beforeEach(() => {
    mockSession = {};
  });

  describe("requirePlatformAdmin", () => {
    it("should reject unauthenticated requests", async () => {
      mockSession = {}; // No userId

      try {
        await requirePlatformAdmin();
        expect.fail("Should have thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(NextResponse);
        const response = err as NextResponse;
        expect(response.status).toBe(401);
        const body = await response.json();
        expect(body.error).toBe("unauthorized");
      }
    });

    it("should reject regular USER role", async () => {
      mockSession = { userId: regularUser.id };

      try {
        await requirePlatformAdmin();
        expect.fail("Should have thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(NextResponse);
        const response = err as NextResponse;
        expect(response.status).toBe(403);
        const body = await response.json();
        expect(body.error).toBe("forbidden");
      }
    });

    it("should reject SUSPENDED admin", async () => {
      mockSession = { userId: suspendedAdmin.id };

      try {
        await requirePlatformAdmin();
        expect.fail("Should have thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(NextResponse);
        const response = err as NextResponse;
        expect(response.status).toBe(403);
        const body = await response.json();
        expect(body.error).toBe("account_suspended");
      }
    });

    it("should allow PLATFORM_ADMIN role", async () => {
      mockSession = { userId: platformAdmin.id };

      const result = await requirePlatformAdmin();
      expect(result.userId).toBe(platformAdmin.id);
      expect(result.role).toBe("PLATFORM_ADMIN");
    });

    it("should allow SUPER_ADMIN role", async () => {
      mockSession = { userId: superAdmin.id };

      const result = await requirePlatformAdmin();
      expect(result.userId).toBe(superAdmin.id);
      expect(result.role).toBe("SUPER_ADMIN");
    });
  });

  describe("requireSuperAdmin", () => {
    it("should reject unauthenticated requests", async () => {
      mockSession = {};

      try {
        await requireSuperAdmin();
        expect.fail("Should have thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(NextResponse);
        const response = err as NextResponse;
        expect(response.status).toBe(401);
      }
    });

    it("should reject regular USER role", async () => {
      mockSession = { userId: regularUser.id };

      try {
        await requireSuperAdmin();
        expect.fail("Should have thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(NextResponse);
        const response = err as NextResponse;
        expect(response.status).toBe(403);
        const body = await response.json();
        expect(body.error).toBe("forbidden_super_admin_only");
      }
    });

    it("should reject PLATFORM_ADMIN role", async () => {
      mockSession = { userId: platformAdmin.id };

      try {
        await requireSuperAdmin();
        expect.fail("Should have thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(NextResponse);
        const response = err as NextResponse;
        expect(response.status).toBe(403);
        const body = await response.json();
        expect(body.error).toBe("forbidden_super_admin_only");
      }
    });

    it("should allow SUPER_ADMIN role only", async () => {
      mockSession = { userId: superAdmin.id };

      const result = await requireSuperAdmin();
      expect(result.userId).toBe(superAdmin.id);
      expect(result.role).toBe("SUPER_ADMIN");
    });
  });
});
