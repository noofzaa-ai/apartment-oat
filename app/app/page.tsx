import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export default async function AppRootPage() {
  const session = await getSession();
  
  if (!session.userId) {
    redirect("/login");
  }

  // Check user role and redirect accordingly
  const subscription = await prisma.subscription.findUnique({
    where: { userId: session.userId },
    select: { status: true, trialEndsAt: true, currentPeriodEnd: true }
  });

  const isOwner = subscription && 
    (subscription.status === "TRIAL" || subscription.status === "ACTIVE");

  if (isOwner) {
    redirect("/app/locations");
  } else {
    redirect("/tenant/dashboard");
  }
}
