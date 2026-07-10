import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis;
const PRISMA_CLIENT_VERSION = "2026-07-10-avatar-truck-photos";

function isRetryableDbError(error) {
  const message = String(error?.message || "");
  return (
    error?.code === "P1001" ||
    error?.code === "P1017" ||
    error?.code === "P2024" ||
    error?.code === "P2034" ||
    message.includes("closed the connection") ||
    message.includes("Connection terminated") ||
    message.includes("Timed out fetching a new connection") ||
    message.includes("Unable to start a transaction")
  );
}

/** Pooled Postgres (e.g. Prisma Data Platform) needs longer waits for interactive transactions. */
export const TX_OPTIONS = { maxWait: 15000, timeout: 30000 };

export function withTransaction(fn) {
  return base.$transaction(fn, TX_OPTIONS);
}

function getDatabaseUrl() {
  const url = process.env.DATABASE_URL;
  if (!url) return url;

  try {
    const parsed = new URL(url);
    if (!parsed.searchParams.has("connection_limit")) {
      parsed.searchParams.set(
        "connection_limit",
        process.env.DATABASE_CONNECTION_LIMIT ||
          (process.env.NODE_ENV === "production" ? "5" : "1")
      );
    }
    if (!parsed.searchParams.has("pool_timeout")) {
      parsed.searchParams.set("pool_timeout", process.env.DATABASE_POOL_TIMEOUT || "60");
    }
    return parsed.toString();
  } catch {
    return url;
  }
}

function createPrismaClient() {
  const databaseUrl = getDatabaseUrl();
  return new PrismaClient({
    log: process.env.PRISMA_LOG === "true" ? ["query", "error", "warn"] : ["error"],
    ...(databaseUrl
      ? {
          datasources: {
            db: { url: databaseUrl },
          },
        }
      : {}),
  });
}

function getPrismaBase() {
  if (
    globalForPrisma.prismaBase &&
    globalForPrisma.prismaClientVersion === PRISMA_CLIENT_VERSION
  ) {
    return globalForPrisma.prismaBase;
  }

  if (globalForPrisma.prismaBase) {
    globalForPrisma.prismaBase.$disconnect().catch(() => {});
  }

  const client = createPrismaClient();
  globalForPrisma.prismaBase = client;
  globalForPrisma.prismaClientVersion = PRISMA_CLIENT_VERSION;
  return client;
}

const base = getPrismaBase();

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
