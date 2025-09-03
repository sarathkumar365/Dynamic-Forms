# ER Diagram and End‑to‑End Example

This document provides:
- An ER diagram of the database (rendered via Mermaid)
- A concrete example of the full flow: FormSpec → compiled JSON → public render/submit

--------------------------------------------------------------------------------

## ER Diagram

Mermaid will render on GitHub and most IDEs. To export an image locally, you can use the Mermaid Live Editor or `@mermaid-js/mermaid-cli`.

```mermaid
erDiagram
  USER ||--o{ FORM : owns
  FORM ||--o{ PAGE : has
  PAGE ||--o{ SECTION : has
  SECTION ||--o{ QUESTION : has
  FORM ||--o{ RULE : has
  FORM ||--o{ PUBLICATION : has
  PUBLICATION ||--o{ SHARELINK : has
  SHARELINK ||--o{ SUBMISSION : has
  FORM ||--o{ SUBMISSION : has

  USER {
    string id PK
    string email
    datetime createdAt
  }
  FORM {
    string id PK
    string ownerId FK -> USER.id
    string title
    string? description
    datetime createdAt
    datetime updatedAt
  }
  PAGE {
    string id PK
    string formId FK -> FORM.id
    string title
    int order
  }
  SECTION {
    string id PK
    string pageId FK -> PAGE.id
    string title
    int order
  }
  QUESTION {
    string id PK
    string sectionId FK -> SECTION.id
    string? key
    string label
    string type
    boolean required
    json? options
    json? visibleWhen
    json? disabledWhen
    int order
  }
  RULE {
    string id PK
    string formId FK -> FORM.id
    json when
    json then
    string? description
  }
  PUBLICATION {
    string id PK
    string formId FK -> FORM.id
    string title
    json schema
    json? uiSchema
    datetime createdAt
  }
  SHARELINK {
    string id PK
    string publicationId FK -> PUBLICATION.id
    string token UNI
    boolean isDisabled
    datetime createdAt
    string? assignedName
    string? assignedEmail
    string? note
  }
  SUBMISSION {
    string id PK
    string formId FK -> FORM.id
    string? shareLinkId FK -> SHARELINK.id
    json payload
    datetime createdAt
  }
```

Tips for exporting an image:
- Mermaid Live Editor: paste the block above and export PNG/SVG.
- CLI: `npx -y @mermaid-js/mermaid-cli -i docs/er-and-example.md -o docs/er-diagram.svg` (or extract the fenced code to a `.mmd` file first).

--------------------------------------------------------------------------------

## End‑to‑End Example

This example mirrors exactly how the app compiles and runs forms.

### 1) Authoring: FormSpec

This is the shape edited in the Builder UI (`src/components/builder/BuilderShell.tsx`). Keys are human‑readable and used for rules and output.

```json
{
  "version": "1.0",
  "id": "example-form",
  "title": "Job Application",
  "pages": [
    {
      "id": "p1",
      "title": "Basics",
      "sections": [
        {
          "id": "s1",
          "title": "Contact",
          "questions": [
            { "id": "q_name", "key": "name", "type": "text", "label": "Full Name", "required": true },
            { "id": "q_email", "key": "email", "type": "email", "label": "Email", "required": true },
            { "id": "q_age", "key": "age", "type": "number", "label": "Age" },
            {
              "id": "q_country",
              "key": "country",
              "type": "select",
              "label": "Country",
              "options": [
                { "value": "US", "label": "United States" },
                { "value": "CA", "label": "Canada" }
              ]
            },
            {
              "id": "q_state",
              "key": "state",
              "type": "text",
              "label": "State",
              "visibleWhen": [
                { "all": [ { "field": "country", "eq": "US" } ] }
              ]
            }
          ]
        }
      ]
    }
  ],
  "rules": [
    {
      "id": "r1",
      "when": { "all": [ { "field": "age", "lt": 18 } ] },
      "then": [ { "op": "setRequired", "field": "guardian_email", "value": true } ]
    }
  ],
  "ui": { "order": ["q_name", "q_email", "q_age", "q_country", "q_state"] }
}
```

Notes:
- Field rule: `state` is only visible when `country == US`.
- Global rule: if `age < 18` then require `guardian_email` (you would add the `guardian_email` question in the builder).

### 2) Compilation: JSON Schema + UI Schema

The compiler (`src/lib/formspec/compile.ts`) converts the FormSpec to JSON Schema and UI Schema for @rjsf.

Schema (excerpt):

```json
{
  "type": "object",
  "title": "Job Application",
  "properties": {
    "name": { "type": "string", "title": "Full Name" },
    "email": { "type": "string", "format": "email", "title": "Email" },
    "age": { "type": "number", "title": "Age" },
    "country": { "type": "string", "title": "Country", "enum": ["US", "CA"], "enumNames": ["United States", "Canada"] },
    "state": {
      "type": "string",
      "title": "State",
      "ui:options": {
        "visibleWhen": [ { "all": [ { "field": "country", "eq": "US" } ] } ]
      }
    }
  },
  "required": ["name", "email"],
  "allOf": [
    {
      "if": { "properties": { "age": { "const": 17 } }, "required": ["age"] },
      "then": { "required": ["guardian_email"] }
    }
  ]
}
```

UI Schema (excerpt):

```json
{
  "ui:order": ["name", "email", "age", "country", "state"],
  "ui:meta": { "idToKey": { "q_name": "name", "q_email": "email", "q_age": "age", "q_country": "country", "q_state": "state" } },
  "state": { "ui:options": { "visibleWhen": [ { "all": [ { "field": "country", "eq": "US" } ] } ] } }
}
```

What to notice:
- Question types become JSON Schema types; selects produce `enum/enumNames`.
- `visibleWhen` is mirrored into both UI and property `ui:options` for robustness.
- Global rules compile to `allOf` with `if/then`.
- `ui:meta.idToKey` lets the public runtime map any id‑based references back to keys.

### 3) Public Render and Submit

Flow after publishing a form:
1. Create a Publication (snapshot) via `POST /api/templates/:id/publish`.
2. Create a share link via `POST /api/publications/:id/share-links` (or assigned link).
3. Open `/f/{token}`. The page fetches compiled schema/ui:
   - `GET /api/public/{token}` → `{ schema, uiSchema }`
4. The public client (`src/components/PublicFormClient.tsx`) renders with @rjsf and:
   - Evaluates `visibleWhen`/`disabledWhen` on each change
   - Hides (or disables) fields and removes hidden ones from required validation
5. On submit, it posts:
   - `POST /api/public/{token}/submit` → stores a `Submission` linked to the `ShareLink` and `Form`.

Example submit (using curl):

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"payload": {"name": "Ada", "email": "ada@example.com", "age": 21, "country": "US", "state": "CA"}}' \
  http://localhost:3000/api/public/YOUR_TOKEN_HERE/submit
```

That’s it. This example matches the actual code paths in:
- Compiler: `src/lib/formspec/compile.ts:1`
- Public runtime: `src/components/PublicFormClient.tsx:1`
- Publish endpoint: `src/app/api/templates/[id]/publish/route.ts:1`
- Public read: `src/app/api/public/[token]/route.ts:1`
- Public submit: `src/app/api/public/[token]/submit/route.ts:1`

