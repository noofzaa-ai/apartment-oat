import { NextRequest, NextResponse } from "next/server";
import { calculatePrice, BillingCycle } from "@/lib/pricing";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const planCode = searchParams.get("planCode");
    const roomCountStr = searchParams.get("roomCount");
    const billingCycle = (searchParams.get("cycle") || "MONTHLY") as BillingCycle;

    if (!planCode || !roomCountStr) {
      return NextResponse.json(
        { error: "Missing planCode or roomCount" },
        { status: 400 }
      );
    }

    const roomCount = parseInt(roomCountStr, 10);
    if (isNaN(roomCount) || roomCount < 0) {
      return NextResponse.json(
        { error: "Invalid roomCount" },
        { status: 400 }
      );
    }

    const price = await calculatePrice(planCode, roomCount, billingCycle);

    return NextResponse.json({ price, planCode, roomCount, billingCycle });
  } catch (error) {
    console.error("Calculate price error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    );
  }
}
