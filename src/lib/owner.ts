import { prisma } from './prisma'
export async function resolveOwner(email = 'demo@owner.local') {
  let user = await prisma.user.findUnique({ where: { email } })
  if (!user) user = await prisma.user.create({ data: { email } })
  return user
}
