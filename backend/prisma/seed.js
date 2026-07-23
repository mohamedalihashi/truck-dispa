import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { ADMIN, DEMO_PASSWORD } from "../config/seed.js";

const prisma = new PrismaClient();

async function ensureAdmin(passwordHash) {
  await prisma.user.upsert({
    where: { email: ADMIN.email },
    update: {
      name: ADMIN.name,
      passwordHash,
      role: ADMIN.role,
      phone: ADMIN.phone,
      status: "Active",
      isSuperAdmin: true,
    },
    create: { ...ADMIN, isSuperAdmin: true, passwordHash },
  });
  console.log(`Admin ready: ${ADMIN.email}`);
}

async function main() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  await ensureAdmin(passwordHash);
  console.log(`Password: ${DEMO_PASSWORD}`);
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
