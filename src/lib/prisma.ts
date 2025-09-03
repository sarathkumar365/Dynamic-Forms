import { PrismaClient } from '@prisma/client'

// Avoid creating multiple PrismaClient instances in dev (Next.js HMR)
const globalForPrisma = global as unknown as { prisma?: PrismaClient }

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    // keep logs minimal; adjust if you want more visibility
    log: ['error', 'warn'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
