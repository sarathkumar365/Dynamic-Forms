# Publication Analytics — User Guide

This guide explains what the Analytics page can do, how to use it, and a few tips to get reliable results quickly.

## Overview

Analytics lets a publication owner explore form submissions without leaving the app:

- Build queries with Metric, Group by, and Filters
- See results as a table or charts (vertical bar, horizontal bar, pie, line)
- Save queries for later and export CSV
- Use the floating "Top values" sidebar to quickly pick common filter values
- Optional Chat tab to ask questions in natural language (NLQ)

Access: Publication page → “Analyze Responses” or route `/publications/[id]/analytics` (owner‑only).

## Anatomy of the Analytics Page

1) Analytics Toolbar (top, minimal rows)
- Metric: count, sum, avg, min, max
  - Field: required for sum/avg/min/max (e.g., `base_salary`)
- Group by: a categorical field (e.g., `department`, `employment_type`)
- Filters: add any number of conditions
  - Operators: `eq`, `ne`, `in`, `nin`, `gt`, `gte`, `lt`, `lte`
  - Values: type‑aware (number, boolean, or text)
  - Floating “Top values” sidebar opens when focusing a filter field
- Save: name and save the query (optional); export results as CSV

2) Results
- Display switch: `table`, `barV`, `barH`, `pie`, `line`
  - Default = `table`
  - Switch to a chart to replace the table with your selection
- Vertical Bar (barV): best for grouped metrics
- Horizontal Bar (barH): better for long labels
- Pie: composition for low‑cardinality categories
- Line: simple sequence (use when your groups are ordered categories)
- Colors: readable, consistent palette
- KPI value fallback: when a query returns only a single metric (no group by, no table), the result shows a centered value card automatically

3) Saved Queries
- Saved queries appear as chips; click to load and re‑run

## Building a Query

1) Pick a Metric
- Count responses: `count`
- Numeric aggregations: `sum`, `avg`, `min`, `max` → set the Field (e.g., `base_salary`)

2) (Optional) Group by
- Use a text/boolean field to split results into categories (e.g., `employment_type`)

3) (Optional) Filters
- Click “+ Add filter”
- Enter field, choose operator, set value(s)
- Focus the field to open the Top values sidebar
  - Click chips to fill the value
  - `in`/`nin` operators accept comma‑separated values; chips append automatically

4) Run
- Click “Run” to compute results
- Choose display (table/barV/barH/pie/line)

5) Save / Export
- Give your query a name → “Save”
- Export current table as CSV

## Examples

- Count by department
  - Metric: `count`
  - Group by: `department`

- Average base salary by employment type
  - Metric: `avg`
  - Field: `base_salary`
  - Group by: `employment_type`

- Sum monthly utilities for US contractors
  - Metric: `sum`
  - Field: `monthly_utilities`
  - Filters: `country eq US`, `employment_type eq contractor`

## Tips for Reliable Results

- Use exact field keys as they appear in submissions (e.g., `base_salary`, not `salary`)
- For `in`/`nin`, use comma‑separated values: `country in US,CA`
- Numeric comparisons/coercion:
  - Numbers like `123`/`123.45` are cast
  - Booleans (`true`, `false`, `1`, `0`) are cast for metrics
  - Non‑numeric rows are excluded from numeric aggregations
- Case‑insensitive text equality/IN matching (labels can be in any case)

## Floating “Top Values” Sidebar

- Opens automatically when you focus a filter field or click “+ Add filter”
- Shows the top 10 values for that field (by frequency), with counts
- If nothing appears, it suggests popular field keys to try

## Natural‑Language (Chat) Queries

- Switch to the Chat tab to ask questions like:
  - “count by country”
  - “sum of base_salary where employment_type in (full_time, contractor)”
  - “avg monthly_utilities by department”
- The chat parser maps your question into the same query engine used by the Builder
- Fuzzy matching suggests close field names when you mistype

## Saved Queries & Re‑use

- Click a saved query chip to reapply its definition and run it
- Saved queries are scoped to the current publication

## Export

- CSV export is available for the current table view (aggregated results)

## Troubleshooting

- “No bars show up” in a bar chart
  - Ensure the query has a Group by and returns a series
  - Use `table` to confirm data, then switch back to a chart

- “Sum/avg shows nothing in table mode”
  - The KPI card appears automatically for single values (no group by). If still empty, check your Field key and filters.

- “Top values → Load does nothing”
  - The field name may not exist in submissions (e.g., use `base_salary` instead of `salary`). Try suggested keys in the sidebar.

- “Unknown field”
  - Double‑check spelling. Use the sidebar’s suggested keys, or try Chat which will suggest close matches.

## Notes for Power Users

- The engine operates directly on Postgres JSONB; numeric/boolean coercion is applied safely; invalid casts are excluded
- Performance is suitable for ~100s–1k submissions; add indexes later if needed
- Both Builder and Chat share the same query runner, so results stay consistent across modes

