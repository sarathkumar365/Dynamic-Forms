const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function deletePublication(pubId) {
  if (!pubId) {
    console.error("No publication ID provided.");
    process.exit(1);
  }
  // Find all shareLinks for this publication
  const shareLinks = await prisma.shareLink.findMany({
    where: { publicationId: pubId },
  });
  const shareLinkIds = shareLinks.map((sl) => sl.id);

  // Delete submissions for these shareLinks
  if (shareLinkIds.length > 0) {
    await prisma.submission.deleteMany({
      where: { shareLinkId: { in: shareLinkIds } },
    });
  }

  // Delete shareLinks
  await prisma.shareLink.deleteMany({ where: { publicationId: pubId } });

  // Delete analytics queries (if model exists)
  if (prisma.analyticsQuery) {
    await prisma.analyticsQuery.deleteMany({ where: { publicationId: pubId } });
  }

  // Delete the publication itself
  await prisma.publication.deleteMany({ where: { id: pubId } });
  console.log(`Deleted publication and related data for id: ${pubId}`);
}

const readline = require("readline").createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question) {
  return new Promise((resolve) => readline.question(question, resolve));
}

async function deleteForm(formId) {
  if (!formId) {
    console.error("No form ID provided.");
    process.exit(1);
  }
  // Delete rules and submissions first
  await prisma.rule.deleteMany({ where: { formId } });
  await prisma.submission.deleteMany({ where: { formId } });

  // Find all page IDs for this form
  const pages = await prisma.page.findMany({ where: { formId } });
  const pageIds = pages.map((p) => p.id);

  // Find all section IDs for these pages
  let sectionIds = [];
  if (pageIds.length > 0) {
    const sections = await prisma.section.findMany({
      where: { pageId: { in: pageIds } },
    });
    sectionIds = sections.map((s) => s.id);
  }

  // Delete questions for these sections
  if (sectionIds.length > 0) {
    await prisma.question.deleteMany({
      where: { sectionId: { in: sectionIds } },
    });
  }

  // Delete sections for these pages
  if (pageIds.length > 0) {
    await prisma.section.deleteMany({ where: { pageId: { in: pageIds } } });
    await prisma.page.deleteMany({ where: { id: { in: pageIds } } });
  }

  // Delete publications for this form
  await prisma.publication.deleteMany({ where: { formId } });

  // Delete the form itself
  await prisma.form.deleteMany({ where: { id: formId } });
  console.log(`Deleted form and all related data for id: ${formId}`);
}

async function mainInteractive() {
  const choice = await ask(
    "Delete (1) Publication or (2) Form? Enter 1 or 2: "
  );
  if (choice === "1") {
    const pubId = await ask("Enter publication ID to delete: ");
    await deletePublication(pubId.trim())
      .catch((e) => {
        console.error(e);
      })
      .finally(() => readline.close());
  } else if (choice === "2") {
    const formId = await ask("Enter form ID to delete: ");
    await deleteForm(formId.trim())
      .catch((e) => {
        console.error(e);
      })
      .finally(() => readline.close());
  } else {
    console.log("Invalid choice.");
    readline.close();
  }
  prisma.$disconnect();
}

mainInteractive();
