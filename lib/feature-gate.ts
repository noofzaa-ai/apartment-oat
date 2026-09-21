import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";
import { hasFeature, getPlanWithFeature } from "@/lib/pricing";

/**
 * Feature gate error response.
 */
export function featureNotAvailable(feature: string, suggestedPlan?: string) {
  return NextResponse.json(
    {
      error: "feature_not_available",
      feature,
      message: `ฟีเจอร์นี้ต้องใช้แผนที่สูงกว่า`,
      suggestedPlan,
    },
    { status: 403 }
  );
}

/**
 * Middleware to require a feature for the current user's subscription.
 * Returns userId if authorized, NextResponse if feature is unavailable.
 */
export async function requireFeature(
  feature: string
): Promise<number | NextResponse> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const subscription = await prisma.subscription.findUnique({
    where: { userId },
    include: { Plan: true },
  });

  if (!subscription) {
    const suggestedPlan = await getPlanWithFeature(feature);
    return featureNotAvailable(feature, suggestedPlan || undefined);
  }

  if (!hasFeature(subscription.Plan.features, feature)) {
    const suggestedPlan = await getPlanWithFeature(feature);
    return featureNotAvailable(feature, suggestedPlan || undefined);
  }

  return userId;
}

/**
 * Type guard to check if a value is an auth response.
 */
export function isFeatureGateResponse(
  value: number | NextResponse
): value is NextResponse {
  return typeof value !== "number";
}
