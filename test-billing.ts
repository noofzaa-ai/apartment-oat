import { PrismaClient } from "@prisma/client";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PrismaBetterSqlite3 } = require("@prisma/adapter-better-sqlite3");

function createPrismaClient(): PrismaClient {
  const dbUrl = process.env.DATABASE_URL ?? "file:./dev.db";
  const adapter = new PrismaBetterSqlite3({ url: dbUrl });
  return new PrismaClient({ adapter });
}

const prisma = createPrismaClient();

async function testBilling() {
  try {
    console.log("=== TEST BILLING CALCULATION ===\n");

    const bills = await prisma.bill.findMany({
      include: {
        room: {
          include: {
            options: true,
            meterReadings: true,
          },
        },
        lineItems: true,
      },
      orderBy: { id: "asc" },
    });

    if (bills.length === 0) {
      console.log("❌ No bills found in database");
      process.exit(1);
    }

    let passCount = 0;
    let failCount = 0;

    for (const bill of bills) {
      const { room, period } = bill;
      console.log(`\n--- Bill: Room ${room.roomNumber}, Period ${period} ---`);

      // Calculate expected total
      let expectedTotal = bill.baseRent;
      console.log(`  Base Rent: ${bill.baseRent}`);

      // Water cost
      const waterReadings = room.meterReadings
        .filter((r) => r.period === period)
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

      let waterDelta = 0;
      if (waterReadings.length > 0) {
        const currentReading = waterReadings[waterReadings.length - 1].waterReading;

        const prevMonthReadings = room.meterReadings
          .filter((r) => r.period < period)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        if (prevMonthReadings.length > 0) {
          const prevReading = prevMonthReadings[0].waterReading;
          waterDelta = Math.max(0, currentReading - prevReading);
        } else {
          waterDelta = currentReading;
        }
      }

      const expectedWaterCost = waterDelta * room.waterRate;
      expectedTotal += expectedWaterCost;
      console.log(`  Water: Δ=${waterDelta} units × ${room.waterRate}/unit = ${expectedWaterCost}`);

      // Electric cost
      const electricReadings = room.meterReadings
        .filter((r) => r.period === period)
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

      let electricDelta = 0;
      if (electricReadings.length > 0) {
        const currentReading = electricReadings[electricReadings.length - 1].electricReading;

        const prevMonthReadings = room.meterReadings
          .filter((r) => r.period < period)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        if (prevMonthReadings.length > 0) {
          const prevReading = prevMonthReadings[0].electricReading;
          electricDelta = Math.max(0, currentReading - prevReading);
        } else {
          electricDelta = currentReading;
        }
      }

      const expectedElectricCost = electricDelta * room.electricRate;
      expectedTotal += expectedElectricCost;
      console.log(`  Electric: Δ=${electricDelta} units × ${room.electricRate}/unit = ${expectedElectricCost}`);

      // Options cost
      let optionsCostSum = 0;
      room.options.forEach((opt) => {
        optionsCostSum += opt.price;
        console.log(`  Option: ${opt.name} = ${opt.price}`);
      });
      expectedTotal += optionsCostSum;
      console.log(`  Options Total: ${optionsCostSum}`);

      // Compare
      console.log(`\n  DB Total: ${bill.total}`);
      console.log(`  Expected: ${expectedTotal}`);

      const tolerance = 0.01;
      if (Math.abs(bill.total - expectedTotal) < tolerance) {
        console.log(`  ✅ PASS`);
        passCount++;
      } else {
        console.log(`  ❌ FAIL - Difference: ${Math.abs(bill.total - expectedTotal)}`);
        failCount++;
      }
    }

    console.log(`\n=== SUMMARY ===`);
    console.log(`Total Bills: ${bills.length}`);
    console.log(`✅ Passed: ${passCount}`);
    console.log(`❌ Failed: ${failCount}`);

    if (failCount === 0) {
      console.log(`\n✅ ALL BILLING TESTS PASSED`);
    } else {
      console.log(`\n❌ SOME BILLING TESTS FAILED`);
      process.exit(1);
    }
  } catch (error) {
    console.error("ERROR:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testBilling();
