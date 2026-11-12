import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  bitepassPrisma?: PrismaClient;
};

export function getPrismaClient(): PrismaClient {
  if (!globalForPrisma.bitepassPrisma) {
    globalForPrisma.bitepassPrisma = new PrismaClient({
      log: ['error'],
    });
  }
  return globalForPrisma.bitepassPrisma;
}

