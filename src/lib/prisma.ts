import { PrismaClient } from '@prisma/client'
import { PrismaD1 } from '@prisma/adapter-d1'

// We need to initialize Prisma per-request when running on Cloudflare Edge
// because the D1 binding is provided via the request context, not a global env var.

export function getPrisma(dbBinding: any) {
  const adapter = new PrismaD1(dbBinding);
  return new PrismaClient({ adapter });
}
