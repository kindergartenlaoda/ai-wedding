import { PrismaClient, type Prisma } from '../../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
const ENABLE_QUERY_LOG = process.env.PRISMA_LOG_QUERIES === 'true';
const SLOW_QUERY_MS = Number(process.env.PRISMA_SLOW_QUERY_MS || '300');

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  const adapter = new PrismaPg({ connectionString });
  const client = new PrismaClient({
    adapter,
    log: ENABLE_QUERY_LOG
      ? [
          { emit: 'event', level: 'query' },
          { emit: 'stdout', level: 'warn' },
          { emit: 'stdout', level: 'error' },
        ]
      : [
          { emit: 'stdout', level: 'warn' },
          { emit: 'stdout', level: 'error' },
        ],
  });

  if (ENABLE_QUERY_LOG) {
    client.$on('query', (event: Prisma.QueryEvent) => {
      if (event.duration < SLOW_QUERY_MS) return;
      const compactQuery = event.query.replace(/\s+/g, ' ').slice(0, 240);
      console.warn(
        `[slow-query] ${event.duration}ms :: ${compactQuery} :: params=${event.params}`
      );
    });
  }

  return client;
}

export const prisma = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
