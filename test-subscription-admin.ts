import { prisma } from "./lib/prisma";

async function testSubscriptionAdminAPIs() {
  console.log("=== Testing Subscription Admin APIs ===\n");

  // 1. Check admin user exists
  console.log("1. Finding admin user...");
  const adminUser = await prisma.user.findFirst({
    where: {
      role: { in: ["PLATFORM_ADMIN", "SUPER_ADMIN"] },
    },
  });
  
  if (!adminUser) {
    console.log("❌ No admin user found. Creating one...");
    const testAdmin = await prisma.user.create({
      data: {
        email: "admin@test.com",
        displayName: "Test Admin",
        role: "PLATFORM_ADMIN",
        status: "ACTIVE",
      },
    });
    console.log(`✅ Created admin user: ${testAdmin.email} (ID: ${testAdmin.id})`);
  } else {
    console.log(`✅ Found admin user: ${adminUser.email} (ID: ${adminUser.id})`);
  }

  // 2. Check subscriptions exist
  console.log("\n2. Checking subscriptions...");
  const subscriptions = await prisma.subscription.findMany({
    take: 5,
    include: {
      User: { select: { email: true, displayName: true } },
      Plan: { select: { displayName: true } },
    },
  });

  if (subscriptions.length === 0) {
    console.log("❌ No subscriptions found. Creating test subscription...");
    
    // Create test user with subscription
    const testUser = await prisma.user.create({
      data: {
        email: "testuser@example.com",
        displayName: "Test User",
        role: "USER",
        status: "ACTIVE",
      },
    });

    const testSub = await prisma.subscription.create({
      data: {
        userId: testUser.id,
        planCode: "TRIAL",
        status: "TRIAL",
        billingCycle: "MONTHLY",
        trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
      },
      include: {
        User: { select: { email: true, displayName: true } },
        Plan: { select: { displayName: true } },
      },
    });
    
    console.log(`✅ Created test subscription ID: ${testSub.id} for ${testSub.User.email}`);
    subscriptions.push(testSub);
  } else {
    console.log(`✅ Found ${subscriptions.length} subscriptions`);
    subscriptions.forEach((sub) => {
      console.log(`   - ID ${sub.id}: ${sub.User.email} (${sub.status}, ${sub.planCode})`);
    });
  }

  // 3. Test data summary
  console.log("\n3. Database summary:");
  const [userCount, subCount, apartmentCount] = await Promise.all([
    prisma.user.count(),
    prisma.subscription.count(),
    prisma.apartment.count(),
  ]);
  console.log(`   - Users: ${userCount}`);
  console.log(`   - Subscriptions: ${subCount}`);
  console.log(`   - Apartments: ${apartmentCount}`);

  // 4. Check room counts for subscriptions
  console.log("\n4. Subscription details with room counts:");
  for (const sub of subscriptions.slice(0, 3)) {
    const apartments = await prisma.apartment.findMany({
      where: { ownerUserId: sub.userId },
      include: {
        Room: { select: { id: true } },
      },
    });
    
    const roomCount = apartments.reduce((sum, apt) => sum + apt.Room.length, 0);
    console.log(`   - Sub ${sub.id}: ${sub.User.email}`);
    console.log(`     Status: ${sub.status}, Plan: ${sub.planCode}, Rooms: ${roomCount}`);
    console.log(`     Trial ends: ${sub.trialEndsAt}`);
  }

  console.log("\n✅ Test data ready. You can now test these endpoints:");
  console.log("\nGET /api/admin/subscriptions");
  console.log(`GET /api/admin/subscriptions/${subscriptions[0]?.id}`);
  console.log(`POST /api/admin/subscriptions/${subscriptions[0]?.id}/extend-trial`);
  console.log(`  Body: {"days": 7}`);
  console.log(`POST /api/admin/subscriptions/${subscriptions[0]?.id}/change-plan`);
  console.log(`  Body: {"planCode": "STARTER"}`);
  console.log(`POST /api/admin/subscriptions/${subscriptions[0]?.id}/cancel`);
  
  console.log("\n=== Test Complete ===");
}

testSubscriptionAdminAPIs()
  .catch((err) => {
    console.error("Error:", err);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
