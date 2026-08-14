import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const globalForPrisma = global as unknown as { _prisma: PrismaClient };

function getPrismaClient() {
  if (!globalForPrisma._prisma) {
    const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
    const adapter = new PrismaPg(pool);
    globalForPrisma._prisma = new PrismaClient({ adapter, log: ["query"] });
  }
  return globalForPrisma._prisma;
}

export const prisma = new Proxy({} as PrismaClient, {
  get: (_, prop) => {
    return (getPrismaClient() as any)[prop];
  }
});
