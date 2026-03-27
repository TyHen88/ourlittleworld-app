import { Prisma, PrismaClient } from '@prisma/client'

const prismaClientSingleton = () => {
    return new PrismaClient()
}

type GlobalForPrisma = typeof globalThis & {
    prisma?: PrismaClient
    prismaSchemaFingerprint?: string
}

const globalForPrisma = globalThis as GlobalForPrisma
const prismaSchemaFingerprint = Object.keys(Prisma.UserScalarFieldEnum ?? {}).join(",")

if (
    process.env.NODE_ENV !== 'production' &&
    globalForPrisma.prisma &&
    globalForPrisma.prismaSchemaFingerprint !== prismaSchemaFingerprint
) {
    globalForPrisma.prisma.$disconnect().catch(() => undefined)
    globalForPrisma.prisma = undefined
}

const prisma = globalForPrisma.prisma ?? prismaClientSingleton()

export default prisma

if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prisma
    globalForPrisma.prismaSchemaFingerprint = prismaSchemaFingerprint
}
