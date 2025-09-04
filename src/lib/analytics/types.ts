export type FilterOp = "eq" | "ne" | "in" | "nin" | "gt" | "gte" | "lt" | "lte";

export type DSL = {
  metric: "count" | "sum" | "avg" | "min" | "max";
  metricField?: string;
  groupBy?: string;
  filters: Array<{ field: string; op: FilterOp; value: string | number | boolean | string[] }>;
};

export type Series = { labels: string[]; data: number[] };

export type RunResult = { value?: number | null; table: any[]; series?: Series };

