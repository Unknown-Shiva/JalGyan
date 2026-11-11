import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/client/client.ts';
import { config } from './env.js';

// Retrieve database URL from centralized config (which loads .env first)
const connectionString = config.databaseUrl;

// Configure PostgreSQL connection pool
const pool = new pg.Pool({
  connectionString,
});

// Initialize Prisma 7 PostgreSQL driver adapter
const adapter = new PrismaPg(pool);

// Instantiate PrismaClient with driver adapter
export const prisma = new PrismaClient({
  adapter,
  log: config.nodeEnv === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
});

export default prisma;
