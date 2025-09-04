import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveOwner } from "@/lib/owner";
import { Prisma } from "@prisma/client";
import type { DSL, FilterOp } from "@/lib/analytics/types";
import { runQuery } from "@/lib/analytics/sql";

type RunBody = {
  metric: "count" | "sum" | "avg" | "min" | "max";
  metricField?: string;
  filters?: Array<{ field: string; op: FilterOp; value: string | number | boolean | string[] }>;
  groupBy?: { field: string } | string; // MVP: basic text group by
  shareLink?: string; // token (MVP)
  assigned?: string;  // name/email contains (MVP)
};

function isNonEmpty(s?: string | null) {
  return !!s && s.trim().length > 0;
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const owner = await resolveOwner();
    // Ensure publication ownership
    const pub = await prisma.publication.findFirst({
      where: { id: params.id },
      include: { form: true },
    });
    if (!pub || !pub.form || pub.form.ownerId !== owner.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = (await req.json()) as RunBody;
    const metric = body.metric || "count";
    const metricField = metric === "count" ? undefined : (body.metricField || "").trim();
    const groupBy = typeof body.groupBy === "string" ? (body.groupBy || "").trim() : (body.groupBy?.field || "").trim();
    const filters = Array.isArray(body.filters) ? body.filters : [];
    const shareToken = body.shareLink && String(body.shareLink);
    const assigned = body.assigned && String(body.assigned);

    if (metric !== "count" && !isNonEmpty(metricField)) {
      return NextResponse.json({ error: "metricField is required for this metric" }, { status: 400 });
    }

    // Build DSL and delegate to shared runner
    const dsl: DSL = {
      metric,
      metricField: metricField || undefined,
      groupBy: groupBy || undefined,
      filters: filters as any,
    };

    const result = await runQuery(pub.formId, dsl);
    return NextResponse.json(result);
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e?.message || "Failed" }, { status: 500 });
  }
}
