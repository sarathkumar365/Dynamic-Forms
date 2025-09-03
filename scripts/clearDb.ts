import { prisma } from "../src/lib/prisma";

async function main() {
  // Delete in dependency order to avoid FK issues
  await prisma.submission.deleteMany({});
  await prisma.shareLink.deleteMany({});
  await prisma.publication.deleteMany({});
  await prisma.rule.deleteMany({});

  // Delete normalized form tree
  const pageIds = (await prisma.page.findMany({ select: { id: true } })).map(
    (p) => p.id
  );
  const sectionIds = (
    await prisma.section.findMany({ select: { id: true } })
  ).map((s) => s.id);
  if (sectionIds.length) await prisma.question.deleteMany({ where: { sectionId: { in: sectionIds } } });
  if (pageIds.length) await prisma.section.deleteMany({ where: { pageId: { in: pageIds } } });
  await prisma.page.deleteMany({});

  await prisma.form.deleteMany({});

  // Optionally, delete users if you want a full reset:
  // await prisma.user.deleteMany({});
  console.log("Database cleared: submissions, links, publications, rules, forms.");
}

main()
  .catch((e) => {
    console.error(e);
  })
  .finally(() => prisma.$disconnect());
