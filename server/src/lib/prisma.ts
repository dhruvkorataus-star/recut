import { setDefaultAutoSelectFamilyAttemptTimeout } from 'net';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';

// Neon's host resolves to IPv6 (often unreachable) and IPv4. Node races them but
// aborts each attempt after 250ms — too short for our latency, so the IPv4
// connect gets killed just before it succeeds. Give each attempt more time.
setDefaultAutoSelectFamilyAttemptTimeout(2000);

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not set in the environment');
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

export default prisma;
