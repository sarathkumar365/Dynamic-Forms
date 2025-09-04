# JSON Import Guide (Beginner → Advanced)

This guide shows how to create JSON that imports cleanly into the app and renders as a working form. You can start simple and layer on advanced features like sections and conditional logic.

The importer accepts two formats:

- JSON Schema (Draft‑07 subset) — recommended and portable
- FormSpec 1.0 — the app’s native authoring format (advanced users)

Use the Builder: ⋯ (kebab) → Import JSON → Paste → Validate → Preview → Create Form.

---

## 1) Quick Start (JSON Schema)

Smallest useful schema:

```json
{
  "title": "Contact",
  "type": "object",
  "properties": {
    "full_name": { "type": "string", "title": "Full Name" },
    "email": { "type": "string", "format": "email", "title": "Email" }
  },
  "required": ["full_name", "email"]
}
```

- Keys must be snake_case: `^[a-z][a-z0-9_]*$`
- `format`: use `email` or `date` for special inputs
- Add `required` for mandatory fields

Supported primitive types → UI mapping:

- `string` → Text
- `string` + `format: "email"` → Email
- `string` + `format: "date"` → Date
- `number` → Number
- `integer` → Integer
- `boolean` → Yes/No
- `string` + `enum` → Select
- `array` + `items.enum` → Multi‑select

Numeric constraints:

```json
{ "age": { "type": "integer", "title": "Age", "minimum": 18, "maximum": 65 } }
```

---

## 2) Sections (Nested Objects)

Nested objects become sections. The object’s `title` is the section header.

```json
{
  "title": "Registration",
  "type": "object",
  "properties": {
    "contact": {
      "type": "object",
      "title": "Contact Info",
      "properties": {
        "full_name": { "type": "string", "title": "Full Name" },
        "email": { "type": "string", "format": "email", "title": "Email" }
      },
      "required": ["full_name", "email"]
    },
    "address": {
      "type": "object",
      "title": "Address",
      "properties": {
        "country": { "type": "string", "title": "Country", "enum": ["US", "CA", "Other"] },
        "city": { "type": "string", "title": "City" }
      }
    }
  }
}
```

Notes
- Depth > 1 is flattened in v1.1 (you’ll see a warning). Keep nesting shallow.
- Give each object a `title` so the section has a friendly heading.

---

## 3) Single‑Select and Multi‑select

Single‑select:
```json
{ "country": { "type": "string", "title": "Country", "enum": ["US", "CA", "Other"] } }
```

Multi‑select:
```json
{
  "equipment": {
    "type": "array",
    "title": "Equipment",
    "items": { "type": "string", "enum": ["laptop", "vpn_token", "phone"] },
    "uniqueItems": true
  }
}
```

---

## 4) Conditional Logic (if/then) — Simple Equality

Use simple `const` conditions for best results. The importer converts them into UI rules (show/require).

```json
{
  "allOf": [
    {
      "if": { "properties": { "country": { "const": "US" } }, "required": ["country"] },
      "then": {
        "required": ["state"],
        "properties": { "state": { "enum": ["CA", "NY", "TX"] } }
      }
    }
  ]
}
```

- When country = US, the form requires `state` and restricts the options.
- Supported: `const` in if; then can set `required`, `properties.field.const`, or `properties.field.enum`.

---

## 5) Modes (oneOf / anyOf at Root)

Represent alternative “modes” with `oneOf` or `anyOf` at the root. The importer generates a `mode` select.

```json
{
  "oneOf": [
    {
      "title": "Individual",
      "properties": { "person_id": { "type": "string", "title": "Person ID" } },
      "required": ["person_id"]
    },
    {
      "title": "Company",
      "properties": {
        "company_name": { "type": "string", "title": "Company Name" },
        "employee_count": { "type": "integer", "title": "Employees", "minimum": 1 }
      },
      "required": ["company_name"]
    }
  ]
}
```

- Generated select: `mode` with values from branch titles (snake_case)
- Fields in each branch are only visible when that mode is chosen
- Branch‑required fields are enforced conditionally

Full example combining sections + modes:

```json
{
  "title": "Account Setup",
  "type": "object",
  "properties": {
    "contact": {
      "type": "object",
      "title": "Contact Info",
      "properties": {
        "full_name": { "type": "string", "title": "Full Name" },
        "email": { "type": "string", "format": "email", "title": "Email" }
      },
      "required": ["full_name", "email"]
    },
    "hq": {
      "type": "object",
      "title": "Headquarters",
      "properties": {
        "country": { "type": "string", "title": "Country", "enum": ["US", "CA", "Other"] },
        "state": { "type": "string", "title": "State" },
        "province": { "type": "string", "title": "Province" }
      },
      "required": ["country"]
    },
    "age": { "type": "integer", "title": "Admin Age", "minimum": 18, "maximum": 70 }
  },
  "oneOf": [
    {
      "title": "Individual",
      "properties": { "person_id": { "type": "string", "title": "Person ID" } },
      "required": ["person_id"]
    },
    {
      "title": "Company",
      "properties": {
        "company_name": { "type": "string", "title": "Company Name" },
        "employee_count": { "type": "integer", "title": "Employees", "minimum": 1 }
      },
      "required": ["company_name"]
    }
  ],
  "allOf": [
    {
      "if": { "properties": { "hq": { "properties": { "country": { "const": "US" } }, "required": ["country"] } } },
      "then": { "properties": { "hq": { "properties": { "state": { "enum": ["CA", "NY", "TX"] } } } } }
    },
    {
      "if": { "properties": { "hq": { "properties": { "country": { "const": "CA" } }, "required": ["country"] } } },
      "then": { "properties": { "hq": { "properties": { "province": { "enum": ["ON", "QC", "BC"] } } } } }
    }
  ]
}
```

---

## 6) Do & Don’t (for clean imports)

- ✅ Use snake_case keys: `project_type`, not `projectType`
- ✅ Keep nesting shallow: objects under root → sections
- ✅ Use `const` in `if` for conditions; set `required`, `const`, or `enum` in `then`
- ✅ Add `title` on fields and nested objects (section headers)
- ✅ Use `minimum`/`maximum` for numbers

- ❌ Avoid: `patternProperties`, `dependencies`, remote `$ref`, deep nested `oneOf`
- ❌ Avoid overly large JSON (> ~256KB) or extremely deep object graphs

If the importer can’t map something, it will warn and skip gracefully.

---

## 7) FormSpec 1.0 (Advanced)

FormSpec is the app’s native format (authoring/editor). Use this if you need precise control. Minimal example:

```json
{
  "version": "1.0",
  "id": "demo",
  "title": "Quick Contact",
  "pages": [
    {
      "id": "p1",
      "title": "Page 1",
      "sections": [
        {
          "id": "s1",
          "title": "Contact",
          "questions": [
            { "id": "q1", "key": "full_name", "type": "text", "label": "Full Name", "required": true },
            { "id": "q2", "key": "email", "type": "email", "label": "Email", "required": true }
          ]
        }
      ]
    }
  ],
  "ui": { "order": ["q1", "q2"] },
  "rules": []
}
```

Rules (visibility):
```json
{
  "visibleWhen": [
    { "all": [ { "field": "country", "eq": "US" } ] }
  ]
}
```

Global rules:
```json
{
  "rules": [
    { "id": "r1", "when": { "all": [ { "field": "country", "eq": "US" } ] }, "then": [ { "op": "setRequired", "field": "state", "value": true } ] }
  ]
}
```

---

## 8) Troubleshooting

- Keys error: rename to snake_case or let the app auto‑slug where supported.
- Missing sections in preview: ensure nested objects have a `title`.
- Conditional fields not visible: root `oneOf`/`anyOf` supported; deep branches not yet (v1.1).
- RJSF ui:order error: the compiler auto‑appends missing keys, but if you see this, re‑import or republish.
- Large JSON or deep nesting: import a subset first, then expand incrementally.

---

## 9) Samples

See `sample json inputs/` for tested examples:
- `input1.json` — simple contact
- `input2.json` — sections + modes + numeric constraints

You can also copy any JSON snippet from this guide into the Import dialog to try it.

---

## 10) Checklist before you paste

- Root `type: "object"`, `title`, and `properties` present
- Keys are snake_case
- Each field has a `title`
- `required` lists are correct (top‑level and inside `then` if using conditionals)
- Enums are strings or numbers; arrays use `items.enum`
- Nested objects have `title` (become sections)
- (Optional) oneOf/anyOf at root to create modes

If you run into a case the importer can’t map, open an issue (attach your JSON) — we’ll add coverage or provide a workaround.
