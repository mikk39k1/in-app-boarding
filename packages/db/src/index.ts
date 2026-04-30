import { PrismaClient } from "@prisma/client";

declare global {
  var __ibPrisma: PrismaClient | undefined;
}

export const prisma: PrismaClient =
  globalThis.__ibPrisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.__ibPrisma = prisma;
}

export * from "@prisma/client";
