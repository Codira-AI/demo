/**
 * Prisma client singleton.
 *
 * Next.js dev mode reloads modules on every file change; without
 * this guard each reload would instantiate a fresh PrismaClient
 * and exhaust the connection pool in minutes. The `globalThis`
 * attachment pattern is the canonical fix recommended in Prisma's
 * Next.js docs.
 *
 * In production (`NODE_ENV === 'production'`) we skip the attach
 * because there's only one instance per server lifetime anyway.
 */

import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    // Quiet the query log by default; uncomment 'query' when
    // debugging slow queries or migration weirdness.
    log: ['warn', 'error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db;
}
