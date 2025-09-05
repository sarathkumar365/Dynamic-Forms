const { PrismaClient } = require("@prisma/client");

// Connection presets
const CONNECTIONS = {
  local:
    "postgresql://sarathkumar@localhost:5432?schema=public",
  prod:
    "postgresql://neondb_owner:npg_v2BHgzh8mTVj@ep-hidden-resonance-adfxobjw-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
};

let prisma;

const rl = require("readline").createInterface({ input: process.stdin, output: process.stdout });
function ask(q) {
  return new Promise((resolve) => rl.question(q, (ans) => resolve(ans)));
}

function maskDbUrl(url) {
  if (!url) return url;
  try {
    const u = new URL(url);
    const maskedAuth = u.password ? `${u.username}:********@` : (u.username ? `${u.username}@` : "");
    const db = u.pathname || "";
    return `${u.protocol}//${maskedAuth}${u.hostname}${u.port ? ":" + u.port : ""}${db}`;
  } catch (_) {
    return url; // If parsing fails, return as-is
  }
}

async function confirmEnvironment() {
  console.log("\nChoose database connection:");
  console.log("  1) local");
  console.log("  2) prod");
  console.log("  3) cancel\n");
  const envChoice = await ask("Enter 1, 2 or 3: ");
  let target;
  if (envChoice.trim() === "1") target = "local";
  else if (envChoice.trim() === "2") target = "prod";
  else {
    console.log("Cancelled.");
    process.exit(0);
  }

  const url = CONNECTIONS[target];
  process.env.DATABASE_URL = url;

  const masked = maskDbUrl(url);
  console.log(`\nSelected environment: ${target}`);
  console.log(`DATABASE_URL: ${masked}`);

  const sure = (await ask("Proceed using this connection? (yes/no): ")).trim().toLowerCase();
  if (sure !== "y" && sure !== "yes") {
    console.log("Aborted by user.");
    process.exit(0);
  }

  // Extra safety for prod
  if (target === "prod") {
    const confirm = await ask('Type "DELETE PROD" to confirm: ');
    if (confirm.trim() !== "DELETE PROD") {
      console.log("Confirmation failed. Aborting.");
      process.exit(1);
    }
  }

  prisma = new PrismaClient();
  return target;
}

async function dryRunPublication(pubId) {
  const publication = await prisma.publication.findUnique({ where: { id: pubId } });
  if (!publication) return { exists: false };

  const shareLinks = await prisma.shareLink.findMany({ where: { publicationId: pubId }, select: { id: true } });
  const shareLinkIds = shareLinks.map((s) => s.id);

  const shareLinkSubmissionCount = shareLinkIds.length
    ? await prisma.submission.count({ where: { shareLinkId: { in: shareLinkIds } } })
    : 0;

  const analyticsCount = await prisma.analyticsQuery.count({ where: { publicationId: pubId } });

  return {
    exists: true,
    publicationTitle: publication.title,
    shareLinkCount: shareLinks.length,
    shareLinkSubmissionCount,
    analyticsQueryCount: analyticsCount,
  };
}

async function deletePublication(pubId, pubSlug) {
  if (!pubId) {
    console.error("No publication ID provided.");
    process.exit(1);
  }

  const info = await dryRunPublication(pubId);
  if (!info.exists) {
    console.log(`No publication found for id: ${pubId}`);
    return;
  }

  console.log("\nAbout to delete the following for publication:");
  console.log(`- Publication: ${info.publicationTitle} (${pubId}${pubSlug ? ", slug: " + pubSlug : ""})`);
  console.log(`- ShareLinks: ${info.shareLinkCount}`);
  console.log(`- Submissions via those ShareLinks: ${info.shareLinkSubmissionCount}`);
  console.log(`- Analytics queries: ${info.analyticsQueryCount}`);

  const confirm = await ask(`Type ${pubSlug ? 'the publication id or slug' : 'the publication id'} exactly to confirm deletion: `);
  const typed = confirm.trim();
  if (!(typed === pubId || (pubSlug && typed === pubSlug))) {
    console.log("ID mismatch. Aborting.");
    return;
  }

  await prisma.$transaction(async (tx) => {
    const shareLinks = await tx.shareLink.findMany({ where: { publicationId: pubId }, select: { id: true } });
    const shareLinkIds = shareLinks.map((s) => s.id);

    if (shareLinkIds.length) {
      await tx.submission.deleteMany({ where: { shareLinkId: { in: shareLinkIds } } });
    }
    await tx.shareLink.deleteMany({ where: { publicationId: pubId } });
    await tx.analyticsQuery.deleteMany({ where: { publicationId: pubId } });
    await tx.publication.deleteMany({ where: { id: pubId } });
  });

  console.log(`\nDeleted publication and related data for id: ${pubId}`);
}

async function dryRunForm(formId) {
  const form = await prisma.form.findUnique({ where: { id: formId } });
  if (!form) return { exists: false };

  const [ruleCount, submissionCount, pages, publications] = await Promise.all([
    prisma.rule.count({ where: { formId: formId } }),
    prisma.submission.count({ where: { formId: formId } }),
    prisma.page.findMany({ where: { formId: formId }, select: { id: true } }),
    prisma.publication.findMany({ where: { formId: formId }, select: { id: true, title: true } }),
  ]);

  const pageIds = pages.map((p) => p.id);
  const sections = pageIds.length
    ? await prisma.section.findMany({ where: { pageId: { in: pageIds } }, select: { id: true } })
    : [];
  const sectionIds = sections.map((s) => s.id);
  const questionCount = sectionIds.length
    ? await prisma.question.count({ where: { sectionId: { in: sectionIds } } })
    : 0;

  const publicationIds = publications.map((p) => p.id);
  const shareLinks = publicationIds.length
    ? await prisma.shareLink.findMany({ where: { publicationId: { in: publicationIds } }, select: { id: true } })
    : [];
  const shareLinkIds = shareLinks.map((s) => s.id);
  const shareLinkSubmissionCount = shareLinkIds.length
    ? await prisma.submission.count({ where: { shareLinkId: { in: shareLinkIds } } })
    : 0;
  const analyticsCount = publicationIds.length
    ? await prisma.analyticsQuery.count({ where: { publicationId: { in: publicationIds } } })
    : 0;

  return {
    exists: true,
    formTitle: form.title,
    ruleCount,
    submissionCount,
    pageCount: pageIds.length,
    sectionCount: sectionIds.length,
    questionCount,
    publicationCount: publicationIds.length,
    publicationTitles: publications.map((p) => p.title),
    shareLinkCount: shareLinks.length,
    shareLinkSubmissionCount,
    analyticsQueryCount: analyticsCount,
  };
}

async function deleteForm(formId) {
  if (!formId) {
    console.error("No form ID provided.");
    process.exit(1);
  }

  const info = await dryRunForm(formId);
  if (!info.exists) {
    console.log(`No form found for id: ${formId}`);
    return;
  }

  console.log("\nAbout to delete the following for form:");
  console.log(`- Form: ${info.formTitle} (${formId})`);
  console.log(`- Rules: ${info.ruleCount}`);
  console.log(`- Submissions (total for form): ${info.submissionCount}`);
  console.log(`- Pages: ${info.pageCount}`);
  console.log(`- Sections: ${info.sectionCount}`);
  console.log(`- Questions: ${info.questionCount}`);
  console.log(`- Publications: ${info.publicationCount}${info.publicationCount ? " (" + info.publicationTitles.join(", ") + ")" : ""}`);
  console.log(`- ShareLinks (via publications): ${info.shareLinkCount}`);
  console.log(`- Submissions via those ShareLinks: ${info.shareLinkSubmissionCount}`);
  console.log(`- Analytics queries (via publications): ${info.analyticsQueryCount}`);

  const confirm = await ask('Type the form id exactly to confirm deletion: ');
  if (confirm.trim() !== formId) {
    console.log("ID mismatch. Aborting.");
    return;
  }

  await prisma.$transaction(async (tx) => {
    // Rules and submissions tied directly to the form
    await tx.rule.deleteMany({ where: { formId } });
    await tx.submission.deleteMany({ where: { formId } });

    // Pages, sections, questions
    const pages = await tx.page.findMany({ where: { formId }, select: { id: true } });
    const pageIds = pages.map((p) => p.id);
    if (pageIds.length) {
      const sections = await tx.section.findMany({ where: { pageId: { in: pageIds } }, select: { id: true } });
      const sectionIds = sections.map((s) => s.id);
      if (sectionIds.length) {
        await tx.question.deleteMany({ where: { sectionId: { in: sectionIds } } });
      }
      await tx.section.deleteMany({ where: { pageId: { in: pageIds } } });
      await tx.page.deleteMany({ where: { id: { in: pageIds } } });
    }

    // Publications and their share links + analytics
    const pubs = await tx.publication.findMany({ where: { formId }, select: { id: true } });
    const pubIds = pubs.map((p) => p.id);
    if (pubIds.length) {
      const shareLinks = await tx.shareLink.findMany({ where: { publicationId: { in: pubIds } }, select: { id: true } });
      const shareLinkIds = shareLinks.map((s) => s.id);
      if (shareLinkIds.length) {
        await tx.submission.deleteMany({ where: { shareLinkId: { in: shareLinkIds } } });
      }
      await tx.shareLink.deleteMany({ where: { publicationId: { in: pubIds } } });
      await tx.analyticsQuery.deleteMany({ where: { publicationId: { in: pubIds } } });
    }
    await tx.publication.deleteMany({ where: { formId } });

    // Finally, the form
    await tx.form.deleteMany({ where: { id: formId } });
  });

  console.log(`\nDeleted form and all related data for id: ${formId}`);
}

async function mainInteractive() {
  // Handle Ctrl+C gracefully
  const cleanup = async (code = 0) => {
    try { rl.close(); } catch {}
    try { if (prisma) await prisma.$disconnect(); } catch {}
    process.exit(code);
  };
  process.on("SIGINT", () => cleanup(130));

  await confirmEnvironment();

  console.log("");
  const choice = await ask("Delete (1) Publication or (2) Form? Enter 1 or 2: ");
  if (choice.trim() === "1") {
    const by = (await ask("Delete publication by (1) ID or (2) slug? Enter 1 or 2: ")).trim();
    let pubId = null;
    let pubSlug = null;
    if (by === "1") {
      pubId = (await ask("Enter publication ID to delete: ")).trim();
    } else if (by === "2") {
      pubSlug = (await ask("Enter publication slug to delete: ")).trim();
      if (!pubSlug) {
        console.log("No slug provided. Aborting.");
        return await cleanup(1);
      }
      const pub = await prisma.publication.findUnique({ where: { slug: pubSlug } });
      if (!pub) {
        console.log(`No publication found with slug: ${pubSlug}`);
        return await cleanup(1);
      }
      pubId = pub.id;
    } else {
      console.log("Invalid choice.");
      return await cleanup(1);
    }
    try {
      await deletePublication(pubId, pubSlug || undefined);
    } catch (e) {
      console.error("Error deleting publication:", e);
    }
    await cleanup(0);
  } else if (choice.trim() === "2") {
    const formId = (await ask("Enter form ID to delete: ")).trim();
    try {
      await deleteForm(formId);
    } catch (e) {
      console.error("Error deleting form:", e);
    }
    await cleanup(0);
  } else {
    console.log("Invalid choice.");
    await cleanup(1);
  }
}

mainInteractive().catch(async (e) => {
  console.error(e);
  try { if (prisma) await prisma.$disconnect(); } catch {}
  process.exit(1);
});
