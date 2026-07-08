import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis;

function isRetryableDbError(error) {
  const message = String(error?.message || "");
  return (
    error?.code === "P1001" ||
    error?.code === "P1017" ||
    error?.code === "P2024" ||
    message.includes("closed the connection") ||
    message.includes("Connection terminated") ||
    message.includes("Timed out fetching a new connection")
  );
}

function createPrismaClient() {
  return new PrismaClient({
    log: process.env.PRISMA_LOG === "true" ? ["query", "error", "warn"] : ["error"],
  });
}

const base = globalForPrisma.prismaBase ?? createPrismaClient();
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prismaBase = base;
}

export const prisma = base.$extends({
  query: {
    $allModels: {
      async $allOperations({ args, query }) {
        let lastError;
        for (let attempt = 0; attempt < 3; attempt += 1) {
          try {
            return await query(args);
          } catch (error) {
            lastError = error;
            if (!isRetryableDbError(error) || attempt === 2) throw error;
            await new Promise((resolve) => setTimeout(resolve, 300 * (attempt + 1)));
          }
        }
        throw lastError;
      },
    },
  },
});

export async function disconnectDatabase() {
  await base.$disconnect();
}

export async function ensureDatabaseConnection() {
  await base.$connect();
}
