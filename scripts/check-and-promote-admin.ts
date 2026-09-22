import { prisma } from "../lib/prisma";

async function main() {
  const email = "wanwit.phbn@gmail.com";
  
  const user = await prisma.user.findFirst({
    where: { email },
    select: { id: true, email: true, role: true, status: true }
  });

  if (!user) {
    console.log(`User ${email} not found`);
    return;
  }

  console.log("Current user:", JSON.stringify(user, null, 2));

  if (user.role !== "PLATFORM_ADMIN") {
    console.log(`\nPromoting user to PLATFORM_ADMIN...`);
    await prisma.user.update({
      where: { id: user.id },
      data: { role: "PLATFORM_ADMIN" }
    });
    console.log("✓ User promoted to PLATFORM_ADMIN");
  } else {
    console.log("\n✓ User already has PLATFORM_ADMIN role");
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
