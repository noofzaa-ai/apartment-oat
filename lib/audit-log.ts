import { prisma } from "@/lib/prisma";

/**
 * Create an audit log entry.
 * 
 * @param category - USER | ADMIN | BILLING | SYSTEM
 * @param action - Specific action like "login", "suspend_user", "create_subscription"
 * @param userId - User who performed the action (optional for system events)
 * @param targetType - Target entity type: USER | APARTMENT | SUBSCRIPTION (optional)
 * @param targetId - Target entity ID (optional)
 * @param ipAddress - IP address of the request (optional)
 * @param userAgent - User agent string (optional)
 * @param details - Additional JSON details (optional)
 */
export async function createAuditLog({
  category,
  action,
  userId,
  targetType,
  targetId,
  ipAddress,
  userAgent,
  details,
}: {
  category: string;
  action: string;
  userId?: number;
  targetType?: string;
  targetId?: number;
  ipAddress?: string;
  userAgent?: string;
  details?: Record<string, unknown>;
}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        category,
        action,
        userId: userId ?? null,
        targetType: targetType ?? null,
        targetId: targetId ?? null,
        ipAddress: ipAddress ?? null,
        userAgent: userAgent ?? null,
        details: details ? JSON.stringify(details) : null,
      },
    });
  } catch (err) {
    // Audit log failure should not break the request
    console.error("Failed to create audit log:", err);
  }
}

/**
 * Query audit logs with filters.
 * 
 * @param filters - Filter criteria for querying logs
 * @returns Paginated audit log entries
 */
export async function queryAuditLogs({
  category,
  action,
  userId,
  targetType,
  targetId,
  startDate,
  endDate,
  limit = 50,
  offset = 0,
}: {
  category?: string;
  action?: string;
  userId?: number;
  targetType?: string;
  targetId?: number;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
} = {}) {
  const where: Record<string, unknown> = {};

  if (category) where.category = category;
  if (action) where.action = action;
  if (userId) where.userId = userId;
  if (targetType) where.targetType = targetType;
  if (targetId) where.targetId = targetId;
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) (where.createdAt as Record<string, unknown>).gte = startDate;
    if (endDate) (where.createdAt as Record<string, unknown>).lte = endDate;
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return { logs, total, limit, offset };
}
