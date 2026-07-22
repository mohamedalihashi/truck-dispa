import { disconnectDatabase, ensureDatabaseConnection } from "../lib/prisma.js";

export async function connectDatabase() {
  await ensureDatabaseConnection();
  console.log("PostgreSQL connected via Prisma.");
}

export { disconnectDatabase, ensureDatabaseConnection };
