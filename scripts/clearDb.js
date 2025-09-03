const { prisma } = require("../src/lib/prisma");

async function main() {
  await prisma.submission.deleteMany({});
  await prisma.shareLink.deleteMany({});
  await prisma.publication.deleteMany({});
  await prisma.template.deleteMany({});
  // Optionally, delete users if you want a full reset:
  // await prisma.user.deleteMany({});
  console.log(
    "Database cleared: submissions, shareLinks, publications, templates."
  );
}

main()
  .catch((e) => {
    console.error(e);
  })
  .finally(() => prisma.$disconnect());
