import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Clearing all database tables…");

  await prisma.payment.deleteMany();
  await prisma.trip.deleteMany();
  await prisma.cargoRequest.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.verificationCode.deleteMany();
  await prisma.truck.deleteMany();
  await prisma.setting.deleteMany();
  await prisma.user.deleteMany();
  await prisma.truckType.deleteMany();

  console.log("Database cleared successfully.");
}

main()
  .catch((error) => {
    console.error("Reset failed:", error.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
