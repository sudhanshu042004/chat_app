import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

function createPrismaClient(): PrismaClient {
  try {
    return new PrismaClient()
  } catch (error) {
    console.error("Failed to create PrismaClient (likely missing DATABASE_URL during build):", error)
    // Return a proxy that throws at runtime but doesn't crash at build time
    return new Proxy({} as PrismaClient, {
      get: (_target, prop) => {
        if (prop === 'then') return undefined // prevent Promise-like behavior
        return () => {
          throw new Error("PrismaClient is not available - DATABASE_URL may be missing")
        }
      }
    })
  }
}

export const prisma =
  globalForPrisma.prisma || createPrismaClient()

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma
