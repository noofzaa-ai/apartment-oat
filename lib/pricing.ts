import { prisma } from "@/lib/prisma";

export type BillingCycle = "MONTHLY" | "YEARLY";

/**
 * Calculate tier index from room count.
 * Example: roomCount=30, tierSize=25 → tier=1 (second tier: 26-50)
 */
export function getTierForRoomCount(roomCount: number, tierSize: number): number {
  if (roomCount <= 0) return 0;
  return Math.floor((roomCount - 1) / tierSize);
}

/**
 * Calculate pricing for a plan based on room count and billing cycle.
 * Uses tiered pricing: rounds up to next tier boundary.
 * Yearly = 10 months (2 months free discount).
 */
export async function calculatePrice(
  planCode: string,
  roomCount: number,
  billingCycle: BillingCycle = "MONTHLY"
): Promise<number> {
  const plan = await prisma.plan.findUnique({ where: { code: planCode } });
  if (!plan) {
    throw new Error(`Plan ${planCode} not found`);
  }

  // Trial is free
  if (planCode === "TRIAL") return 0;

  // Calculate tier
  const tierIndex = getTierForRoomCount(roomCount, plan.tierSize);
  const tierRoomCount = (tierIndex + 1) * plan.tierSize;
  
  // Monthly price for tier
  const monthlyPrice = tierRoomCount * plan.pricePerRoom;

  // Yearly discount: pay 10 months
  if (billingCycle === "YEARLY") {
    return monthlyPrice * 10;
  }

  return monthlyPrice;
}

/**
 * Check if a subscription has a specific feature.
 * Plan.features is stored as JSON string array.
 */
export function hasFeature(
  planFeatures: string,
  feature: string
): boolean {
  try {
    const features = JSON.parse(planFeatures) as string[];
    return features.includes(feature);
  } catch {
    return false;
  }
}

/**
 * Get total room count for a user across all apartments.
 */
export async function getRoomCount(userId: number): Promise<number> {
  const count = await prisma.room.count({
    where: {
      Apartment: {
        ownerUserId: userId,
      },
    },
  });
  return count;
}

/**
 * Get the lowest-tier plan that has a specific feature.
 * Returns lowest-tier plan code with it.
 */
export async function getPlanWithFeature(feature: string): Promise<string | null> {
  const plans = await prisma.plan.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });

  for (const plan of plans) {
    if (hasFeature(plan.features, feature)) {
      return plan.code;
    }
  }
  return null;
}
