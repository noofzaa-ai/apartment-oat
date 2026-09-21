import { prisma } from "../lib/prisma";

async function main() {
  console.log("Seeding Plan data...");

  // Seed Plans per docs/feature-pricing-plans.md spec
  
  // TRIAL Plan
  await prisma.plan.upsert({
    where: { code: "TRIAL" },
    update: {},
    create: {
      code: "TRIAL",
      name: "Trial",
      displayName: "ทดลองใช้",
      pricePerRoom: 0,
      tierSize: 25,
      maxRooms: 10,
      features: "[]",
      isActive: true,
      sortOrder: 0,
      updatedAt: new Date(),
    },
  });

  // STARTER Plan
  await prisma.plan.upsert({
    where: { code: "STARTER" },
    update: {},
    create: {
      code: "STARTER",
      name: "Starter",
      displayName: "Starter",
      pricePerRoom: 5,
      tierSize: 25,
      maxRooms: null,
      features: "[]",
      isActive: true,
      sortOrder: 1,
      updatedAt: new Date(),
    },
  });

  // STANDARD Plan
  await prisma.plan.upsert({
    where: { code: "STANDARD" },
    update: {},
    create: {
      code: "STANDARD",
      name: "Standard",
      displayName: "Standard",
      pricePerRoom: 8,
      tierSize: 25,
      maxRooms: null,
      features: JSON.stringify([
        "room_preset",
        "bulk_create",
        "export_csv",
        "dashboard",
        "email_notify",
        "multi_user:2",
      ]),
      isActive: true,
      sortOrder: 2,
      updatedAt: new Date(),
    },
  });

  // PRO Plan
  await prisma.plan.upsert({
    where: { code: "PRO" },
    update: {},
    create: {
      code: "PRO",
      name: "Pro",
      displayName: "Pro",
      pricePerRoom: 12,
      tierSize: 25,
      maxRooms: null,
      features: JSON.stringify([
        "room_preset",
        "bulk_create",
        "export_csv",
        "dashboard",
        "email_notify",
        "multi_user:unlimited",
        "custom_branding",
        "line_notify",
        "payment_gateway",
        "api_access",
        "priority_support",
        "advanced_reports",
      ]),
      isActive: true,
      sortOrder: 3,
      updatedAt: new Date(),
    },
  });

  console.log("✅ Seeded 4 plans: TRIAL, STARTER, STANDARD, PRO");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
