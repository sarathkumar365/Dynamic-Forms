Got it ✅
Here’s the rewritten doc with your new section **folded in, explained in the same “easy to understand” style**, with plain-English notes for technical terms.

---

# How Analytics Works (Step by Step)

### Big Picture

* The **Query Builder UI** (the sidebar where you choose metric, filters, etc.) creates a JSON “definition” of what you want.
* The **API** takes that definition, turns it into SQL, runs it against the `Submission` table, and returns the results.
* The **UI** then renders those results as a chart, table, or KPI card.

  > **KPI (Key Performance Indicator)** = a single number you watch, like “Total Submissions.”

---

## Key Entities

* **Publication** = a snapshot of a form when it was published.
* **Submission** = each response row, with answers stored as JSON in `payload`.

---

## Building the Query (UI → Payload)

Here’s how the **“Builds { metric, metricField?, groupBy?, filters }”** step works:

### What it builds

* **Definition** = the UI composes a JSON object like:

  ```json
  { "metric": "count", "metricField": "salary", "groupBy": "country", "filters": [...] }
  ```

  This is sometimes called a **DSL (Domain Specific Language)** — basically a little “mini language” in JSON describing what to query.

* **Metric** = what calculation you want: `count`, `sum`, `avg`, `min`, `max`.

  * For anything except `count`, you also need a **metricField** (e.g. sum of salary).

* **Grouping (groupBy)** = optional; splits results into categories (like “per country” or “per department”).

* **Filters** = array of conditions `{ field, op, value }`.

  * **Operators (op)**:

    * `eq/ne` = equals / not equals
    * `in/nin` = value in list / not in list
    * `gt/gte/lt/lte` = greater/greater-or-equal / less/less-or-equal

---

### How it runs

1. **API handler** validates ownership and builds the DSL.
2. It calls the query runner (`runQuery`).
3. The WHERE builder (`buildWhereParts`) turns filters into SQL `WHERE` clauses.

   * Text comparisons → case-insensitive.
   * Lists → supported, numbers cast, text lowercased.
   * Numeric filters → cast to numbers, invalid skipped.
4. **Metric logic**:

   * `count` = counts rows.
   * `sum/avg/min/max` = coerce values to numbers:

     * numbers stay numbers
     * booleans → 1/0
     * numeric strings (“123.45”) → numbers
     * anything else ignored.
5. **Grouping**:

   * No `groupBy` → returns single KPI value.
   * With `groupBy` → returns a table + chart series, top 50 categories sorted by value.

     > **Series** = chart-ready data: `{ labels: [...], data: [...] }`.
6. **SQL preview**: if you add `?debug=1`, API also returns a readable SQL string for debugging.

---

### Examples

* **Count submissions by country**

  ```json
  { "metric": "count", "groupBy": "country", "filters": [] }
  ```

  → Groups by `country`, counts rows per group.

* **Average base salary for US contractors**

  ```json
  {
    "metric": "avg",
    "metricField": "base_salary",
    "groupBy": "employment_type",
    "filters": [
      { "field": "country", "op": "eq", "value": "US" },
      { "field": "employment_type", "op": "eq", "value": "contractor" }
    ]
  }
  ```

  → Coerces `base_salary` to numeric, filters only US + contractor, groups by `employment_type`.

---

### Notes

* **Scope**: Queries run over all submissions for the publication’s form (`Submission.formId = formId`).
* **Field discovery**: UI suggests field keys/types by sampling submissions.
* **UI builder**: The client constructs the DSL, runs it, and shows optional SQL in debug mode.

---

## SQL Generation & Execution

* Extract JSON fields with Postgres JSONB operators (`payload->>'field'`).
* Coerce numbers/booleans/strings to numeric.
* Build filters for numbers and text.
* Run aggregations (`count`, `sum`, etc.).
* Return chart/table data.

---

## API Response Shape

```json
{
  "value": 123,           // single KPI
  "series": {             // chart series
    "labels": ["US","CA"],
    "data": [50,30]
  },
  "table": [ ... ]        // tabular data
}
```

* No groupBy → just `value`.
* With groupBy → `series` + `table`.

---

## Rendering in the UI

* KPI card if only a value.
* Chart if `series` exists.
* Table grid if `table` exists.
* Smooth animations for bars, pies, lines.

---

## Field Discovery & Suggestions

* API samples submissions to guess field types + values.
* “Top values” endpoint lists distinct values + counts.
* UI uses this to suggest filters.

---

## Saved Queries

* You can save a definition by name.
* Backed by `AnalyticsQuery` table.
* API endpoints for list/create/get/delete.

---

## Chat Analytics

* Chat input → server interprets text → builds a query DSL.
* Returns both text answer and a `RunResult`.
* UI shows chart/KPI/table under the chat.

---

## Error Handling

* Frontend shows banner if run/save fails.
* API validates ownership + inputs, returns proper HTTP errors.

---

## Example Walkthrough

* You pick: metric = count, groupBy = country, filters = `[department="sales", salary>50000]`.
* API builds SQL:

  * `WHERE formId=... AND LOWER(department)='sales' AND salary>50000`
  * `GROUP BY country`
  * `SELECT country, COUNT(*)`
* Response: labels = countries, data = counts.
* UI: shows bar chart.

---

👉 Would you like me to also produce a **diagram/flow chart** of this (UI → DSL → API → SQL → Response → Chart) so it’s visual?
