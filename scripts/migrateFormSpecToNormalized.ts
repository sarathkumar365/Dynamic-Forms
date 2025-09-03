import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function migrateTemplates() {
  const publications = await prisma.publication.findMany();
  for (const pub of publications) {
    const specRaw = pub.schema;
    const uiRaw = pub.uiSchema;
    const spec = typeof specRaw === "string" ? JSON.parse(specRaw) : specRaw;
    const uiSchema = typeof uiRaw === "string" ? JSON.parse(uiRaw) : uiRaw;
    if (!spec) continue;

    // Ensure every question has a valid key
    let usedKeys = new Set<string>();
    for (const p of spec.pages ?? [])
      for (const s of p.sections ?? [])
        for (const q of s.questions ?? []) {
          if (!q.key || !/^[a-z][a-z0-9_]*$/.test(q.key)) {
            let base = (q.label || "")
              .toLowerCase()
              .replace(/[^a-z0-9_]+/g, "_")
              .replace(/^_+|_+$/g, "");
            if (!/^[a-z][a-z0-9_]*$/.test(base)) base = "q_" + q.id.slice(0, 6);
            let key = base;
            let i = 2;
            while (usedKeys.has(key)) {
              key = base + "_" + i;
              i++;
            }
            q.key = key;
          }
          usedKeys.add(q.key);
        }

    // Build id-to-key map
    const idToKey: Record<string, string> = {};
    for (const p of spec.pages ?? [])
      for (const s of p.sections ?? [])
        for (const q of s.questions ?? []) {
          if (q.id && q.key) idToKey[q.id] = q.key;
        }

    // Remap visibleWhen fields to use keys
    for (const p of spec.pages ?? [])
      for (const s of p.sections ?? [])
        for (const q of s.questions ?? []) {
          if (q.visibleWhen) {
            q.visibleWhen = q.visibleWhen.map((clause: any) => ({
              all: clause.all?.map((cond: any) => ({
                ...cond,
                field: idToKey[cond.field] || cond.field,
              })),
              any: clause.any?.map((cond: any) => ({
                ...cond,
                field: idToKey[cond.field] || cond.field,
              })),
            }));
          }
        }

    // Optionally, recompile spec to update schema/uiSchema
    // If you have a compileFormSpec function, you can use it here
    // const { schema: newSchema, uiSchema: newUiSchema } = compileFormSpec(spec);

    // Update publication with fixed spec
    await prisma.publication.update({
      where: { id: pub.id },
      data: {
        schema: spec,
        uiSchema: uiSchema,
      },
    });
    console.log("Fixed publication:", pub.title);
  }
}

migrateTemplates().then(() => {
  console.log("Migration complete");
  prisma.$disconnect();
});
