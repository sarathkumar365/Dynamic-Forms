import { prisma } from "./prisma"

export async function resolveOwner() {
  let u = await prisma.user.findUnique({ where: { email: "demo@owner.local" } })
  if (!u) u = await prisma.user.create({ data: { email: "demo@owner.local" } })
  return u
}
