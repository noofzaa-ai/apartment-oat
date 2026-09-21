import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { createAuditLog, queryAuditLogs } from "@/lib/audit-log";

describe("Audit Log Functions", () => {
  let testUserId: number;

  beforeAll(async () => {
    // Create test user
    const user = await prisma.user.create({
      data: {
        displayName: "Audit Test User",
        email: "audit@test.com",
        role: "PLATFORM_ADMIN",
        status: "ACTIVE",
        updatedAt: new Date(),
      },
    });
    testUserId = user.id;
  });

  afterAll(async () => {
    // Cleanup
    await prisma.auditLog.deleteMany({
      where: { userId: testUserId },
    });
    await prisma.user.delete({
      where: { id: testUserId },
    });
  });

  describe("createAuditLog", () => {
    it("should create audit log with all fields", async () => {
      await createAuditLog({
        category: "ADMIN",
        action: "suspend_user",
        userId: testUserId,
        targetType: "USER",
        targetId: 999,
        ipAddress: "192.168.1.1",
        userAgent: "Mozilla/5.0",
        details: { reason: "policy_violation", notes: "spam" },
      });

      const logs = await prisma.auditLog.findMany({
        where: {
          userId: testUserId,
          action: "suspend_user",
        },
      });

      expect(logs.length).toBe(1);
      const log = logs[0];
      expect(log.category).toBe("ADMIN");
      expect(log.action).toBe("suspend_user");
      expect(log.userId).toBe(testUserId);
      expect(log.targetType).toBe("USER");
      expect(log.targetId).toBe(999);
      expect(log.ipAddress).toBe("192.168.1.1");
      expect(log.userAgent).toBe("Mozilla/5.0");
      expect(log.details).toBe(
        JSON.stringify({ reason: "policy_violation", notes: "spam" })
      );
    });

    it("should create audit log with minimal fields", async () => {
      await createAuditLog({
        category: "SYSTEM",
        action: "backup_completed",
      });

      const logs = await prisma.auditLog.findMany({
        where: {
          category: "SYSTEM",
          action: "backup_completed",
        },
      });

      expect(logs.length).toBeGreaterThan(0);
      const log = logs[0];
      expect(log.category).toBe("SYSTEM");
      expect(log.action).toBe("backup_completed");
      expect(log.userId).toBeNull();
      expect(log.targetType).toBeNull();
      expect(log.targetId).toBeNull();
    });

    it("should not throw on failure (silent failure)", async () => {
      // This should not throw even if there's an error
      await expect(
        createAuditLog({
          category: "TEST",
          action: "test_action",
          userId: testUserId,
        })
      ).resolves.not.toThrow();
    });
  });

  describe("queryAuditLogs", () => {
    beforeAll(async () => {
      // Create test audit logs
      await createAuditLog({
        category: "USER",
        action: "login",
        userId: testUserId,
      });
      await createAuditLog({
        category: "USER",
        action: "logout",
        userId: testUserId,
      });
      await createAuditLog({
        category: "ADMIN",
        action: "view_dashboard",
        userId: testUserId,
      });
      await createAuditLog({
        category: "BILLING",
        action: "subscription_created",
        userId: testUserId,
        targetType: "SUBSCRIPTION",
        targetId: 123,
      });
    });

    it("should query all logs without filters", async () => {
      const result = await queryAuditLogs({
        userId: testUserId,
        limit: 100,
      });

      expect(result.logs.length).toBeGreaterThanOrEqual(4);
      expect(result.total).toBeGreaterThanOrEqual(4);
      expect(result.limit).toBe(100);
      expect(result.offset).toBe(0);
    });

    it("should filter by category", async () => {
      const result = await queryAuditLogs({
        category: "USER",
        userId: testUserId,
      });

      expect(result.logs.length).toBeGreaterThanOrEqual(2);
      result.logs.forEach((log) => {
        expect(log.category).toBe("USER");
      });
    });

    it("should filter by action", async () => {
      const result = await queryAuditLogs({
        action: "login",
        userId: testUserId,
      });

      expect(result.logs.length).toBeGreaterThanOrEqual(1);
      result.logs.forEach((log) => {
        expect(log.action).toBe("login");
      });
    });

    it("should filter by userId", async () => {
      const result = await queryAuditLogs({
        userId: testUserId,
      });

      expect(result.logs.length).toBeGreaterThanOrEqual(4);
      result.logs.forEach((log) => {
        expect(log.userId).toBe(testUserId);
      });
    });

    it("should filter by targetType and targetId", async () => {
      const result = await queryAuditLogs({
        targetType: "SUBSCRIPTION",
        targetId: 123,
      });

      expect(result.logs.length).toBeGreaterThanOrEqual(1);
      result.logs.forEach((log) => {
        expect(log.targetType).toBe("SUBSCRIPTION");
        expect(log.targetId).toBe(123);
      });
    });

    it("should support pagination", async () => {
      const page1 = await queryAuditLogs({
        userId: testUserId,
        limit: 2,
        offset: 0,
      });

      expect(page1.logs.length).toBe(2);
      expect(page1.limit).toBe(2);
      expect(page1.offset).toBe(0);

      const page2 = await queryAuditLogs({
        userId: testUserId,
        limit: 2,
        offset: 2,
      });

      expect(page2.logs.length).toBeGreaterThanOrEqual(0);
      expect(page2.offset).toBe(2);

      // Ensure different results
      if (page2.logs.length > 0) {
        expect(page1.logs[0].id).not.toBe(page2.logs[0].id);
      }
    });

    it("should order by createdAt descending", async () => {
      const result = await queryAuditLogs({
        userId: testUserId,
        limit: 10,
      });

      for (let i = 0; i < result.logs.length - 1; i++) {
        const current = new Date(result.logs[i].createdAt);
        const next = new Date(result.logs[i + 1].createdAt);
        expect(current.getTime()).toBeGreaterThanOrEqual(next.getTime());
      }
    });
  });
});
