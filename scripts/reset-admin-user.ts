import { prisma } from "../lib/prisma";

async function resetAdminUser() {
  const email = "wanwit.phbn@gmail.com";
  
  // Find user
  const user = await prisma.user.findFirst({
    where: { email },
    include: {
      Subscription: true,
      Apartment: true,
      Membership: true,
      ExternalIdentity: true
    }
  });

  if (!user) {
    console.log(`User ${email} not found`);
    return;
  }

  console.log("\nCurrent user data:");
  console.log("- ID:", user.id);
  console.log("- Email:", user.email);
  console.log("- Role:", user.role);
  console.log("- Status:", user.status);
  console.log("- Subscription:", user.Subscription?.status);
  console.log("- Apartments:", user.Apartment.length);
  console.log("- Memberships:", user.Membership.length);

  console.log("\nDeleting user and all related data...");

  // Delete user (cascade will handle related records)
  await prisma.user.delete({
    where: { id: user.id }
  });

  console.log("✓ User deleted successfully");
  console.log("\nNext login will create fresh user with PLATFORM_ADMIN role only");
}

resetAdminUser()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
