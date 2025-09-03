import { prisma } from "../src/lib/prisma.js";

async function main() {
  await prisma.submission.deleteMany({});
  await prisma.shareLink.deleteMany({});
  await prisma.publication.deleteMany({});
  await prisma.rule.deleteMany({});
  await prisma.question.deleteMany({});
  await prisma.section.deleteMany({});
  await prisma.page.deleteMany({});
  await prisma.form.deleteMany({});
  // await prisma.user.deleteMany({}); // Optional
  console.log("Database cleared: submissions, links, publications, rules, forms.");
}

main()
  .catch((e) => {
    console.error(e);
  })
  .finally(() => prisma.$disconnect());
