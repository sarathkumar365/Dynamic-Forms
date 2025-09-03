# Developer Handbook — JSON Form Builder & Runtime

A single, comprehensive guide to understand and work on this project. It merges: overview, how it works, process flow, compilation deep‑dive, data model, public runtime, APIs, and an end‑to‑end example.

--------------------------------------------------------------------------------

## 1) Overview
- Builder creates an in‑memory FormSpec (authoring JSON).
- Save persists a normalized tree in Postgres (Form → Pages → Sections → Questions + Rules).
- Publish compiles FormSpec into JSON Schema + UI Schema and snapshots it as a Publication.
- Share links render compiled forms publicly via @rjsf and store submissions.

Auth: a demo owner (`demo@owner.local`) is auto‑created for POC.

Tech: Next.js 14 (App Router), React 18, TypeScript, Prisma + PostgreSQL, @rjsf/core (AJV v8), Tailwind.

Quick Start:
- `npm i`
- `cp .env.example .env` and set `DATABASE_URL`
- `npx prisma generate && npx prisma migrate dev --name init`
- `npm run dev` → http://localhost:3000

--------------------------------------------------------------------------------

## 2) Data Model (ER)
Entities and relationships:
- User 1—N Form
- Form 1—N Page 1—N Section 1—N Question
- Form 1—N Rule
- Form 1—N Publication
- Publication 1—N ShareLink
- ShareLink 1—N Submission; Submission also belongs to Form

View the diagram: `docs/er-diagram.svg`

Key Prisma models and fields:
- Publication: `schema` (Json), `uiSchema` (Json), `formId`, `createdAt`.
- ShareLink: `token` (unique), `publicationId`, optional `assignedName/email/note`.
- Form: belongs to User; has Pages, Sections, Questions, Rules; timestamps.
- Page/Section/Question: normalized with `order`; Question stores `key`, `type`, `options`, `visibleWhen`, `disabledWhen`.
- Rule: `when`/`then` Json for global rules.
- Submission: `payload` (Json), `formId`, optional `shareLinkId`.

Files: `prisma/schema.prisma:1`

--------------------------------------------------------------------------------

## 3) Authoring — UI to FormSpec
Core pieces:
- Builder shell: `src/components/builder/BuilderShell.tsx:1`
- State & logic: `src/hooks/useFormSpec.ts:1`
- Canvas: `src/components/builder/BuilderCanvas.tsx:1` → `CanvasPage.tsx:1` → `CanvasSection.tsx:1` → `CanvasQuestion.tsx:1`
- Inspector: `src/components/builder/Inspector.tsx:1`
- Field rules: `src/components/builder/RuleBuilder.tsx:1` (visibleWhen/disabledWhen)
- Global rules: `src/components/builder/ActionRules.tsx:1`
- Live preview: `src/components/builder/PreviewPane.tsx:1` (@rjsf)
- Save bar: `src/components/builder/SaveBar.tsx:1`

FormSpec types/utilities:
- Types: `src/types/formspec.ts:1`
- Defaults: `src/lib/formspec/defaults.ts:1`
- Validation: `src/lib/formspec/validators.ts:1`

Behaviors:
- `ensureKeys` guarantees valid, unique keys (a‑z, 0‑9, `_`) for questions.
- Reorder/delete updates UI order and prunes rules referencing removed questions.
- Field rules are authored against question `key`s; groups are OR‑of‑AND.
- Global rules define `when` (AND) → `then` actions (`setRequired`, `setConst`, `setEnum`).

--------------------------------------------------------------------------------

## 4) Process Flow — UI Actions → Backend
- Open builder
  - Page `src/app/templates/new/page.tsx:1` mounts `BuilderShell` with `useFormSpec` state.
- Add page/section/question
  - Buttons call `addPage`, `addSection`, `addQuestion` (in `useFormSpec`).
  - Generates IDs, updates `ui.order`, and runs `ensureKeys`.
- Edit a question
  - Inspector calls `updateQuestion`; re‑runs `ensureKeys`.
- Add field rule
  - RuleBuilder composes AND conditions into OR groups; updates `visibleWhen` / `disabledWhen` on the question.
- Add global rule
  - ActionRules appends a rule with `when` → `then`.
- Reorder/delete a question
  - `moveQuestion` changes position and UI order; `deleteQuestion` removes references in rules.
- Live preview
  - `compileFormSpec` produces `{ schema, uiSchema }`; @rjsf renders in `PreviewPane`.

Saving:
- SaveBar validates and POSTs to `POST /api/forms` (`src/app/api/forms/route.ts:1`).
- API creates: Form, Pages (with `order`), Sections (with `order`), Questions (with `order`), and Rules.

Loading for edit:
- `GET /api/forms/:id` (`src/app/api/forms/[id]/route.ts:1`) reconstructs a FormSpec‑like shape and remaps id→key in rule fields.

Publishing:
- UI (FormDetailClient) calls `POST /api/templates/:id/publish`.
- Handler `src/app/api/templates/[id]/publish/route.ts:1`:
  1) Loads normalized tree + rules
  2) Builds id→key map; remaps conditions
  3) Validates
  4) Compiles (`compileFormSpec`) → `{ schema, uiSchema }`
  5) Stores Publication snapshot

Sharing & public render:
- Create link(s): `POST /api/publications/:id/share-links` or `.../assigned-links` → gives a `token`.
- Public page `/f/{token}` loads compiled JSON via `GET /api/public/{token}` and renders in `PublicFormClient.tsx:1`.
- On change, runtime evaluates visibility/disable and adjusts UI; hidden fields are removed from `required`.
- Submit posts to `POST /api/public/{token}/submit` and creates a `Submission`.

--------------------------------------------------------------------------------

## 5) Compilation Deep Dive — compileFormSpec
File: `src/lib/formspec/compile.ts:1`

Purpose: Convert authoring FormSpec to runtime JSON Schema + UI Schema for @rjsf.

Steps:
1) Stable id→key map
- Compute/normalize keys for each question (fallback slug/id) and ensure uniqueness.
- Store `idToKey`; expose in `uiSchema['ui:meta'].idToKey` for robust runtime remapping.

2) Properties, required, help, default order
- `qToSchema` maps types: string/email/number/integer/boolean/date/select/multiselect/file.
- `required[]` from question flags; `uiSchema[key]['ui:help']` from help text.

3) Top‑level schema and `ui:order`
- `schema = { type:'object', title, properties }` plus `required` if any.
- `ui:order` from `spec.ui.order` (ids remapped to keys) or fallback to discovery order.

4) Question‑level rules (visibility/disable)
- Remap condition `field` through id→key.
- Write to both `uiSchema[key]['ui:options'].*` and `schema.properties[key]['ui:options'].*` for resilience.

5) Global rules → JSON Schema `allOf` with `if`/`then`
- Translate `when.all` equality to `if.properties[field] = { const:value }` + `required`.
- Translate actions: `setRequired`, `setConst`, `setEnum` into `then` object.
- Push `{ if, then }` into `schema.allOf`.

Safeguards:
- Key uniqueness guard; UI order fallback; id→key remapping for all conditions; compatible `ui:help` and `ui:options`.

Runtime interplay:
- PublicFormClient hides/disables per rules, and scrubs hidden fields from required (top‑level and inside `allOf.then.required`).

Limitations / TODO:
- Only `when.all` + equality compiled into `if/then` today. Operators (`gt/gte/lt/lte/in/nin`) and `when.any` could be compiled via `minimum/maximum/enum/not/anyOf` patterns.

Rationale:
- Keys as stable public contract; snapshot for performance; duplication of hints (schema + ui) to increase robustness.

--------------------------------------------------------------------------------

## 6) Public Runtime & Rules
- Fetch compiled: `GET /api/public/{token}` → `{ schema, uiSchema }`.
- Renderer: `src/components/PublicFormClient.tsx:1` uses @rjsf + AJV v8.
- Evaluates `visibleWhen`/`disabledWhen` on change; disables or hides fields.
- Removes hidden fields from required lists (both top‑level and then‑blocks) to avoid validation dead‑ends.
- Submits payload to `POST /api/public/{token}/submit`.

--------------------------------------------------------------------------------

## 7) API Overview
- Forms
  - `GET /api/forms`
  - `POST /api/forms`
  - `GET /api/forms/:id`
  - `PUT /api/forms/:id`
  - `DELETE /api/forms/:id`
- Templates (alias to forms for publishing)
  - `GET /api/templates`
  - `POST /api/templates`
  - `POST /api/templates/:id/publish`
- Publications
  - `GET /api/publications/:id`
  - `DELETE /api/publications/:id`
  - `POST /api/publications/:id/share-links`
  - `POST /api/publications/:id/assigned-links`
- Public
  - `GET /api/public/:token`
  - `POST /api/public/:token/submit`
- AI (optional)
  - `POST /api/ai/generate-form`

Key handlers: `src/app/api/**`

--------------------------------------------------------------------------------

## 8) Database & Environment
- Env: `.env` with `DATABASE_URL`; see `.env.example:1`.
- Prisma: `npx prisma generate && npx prisma migrate dev --name init`.
- Demo owner: `src/lib/owner.ts:1` (no real auth).
- Utilities: `scripts/clearDb.ts` and `scripts/migrateFormSpecToNormalized.ts`.

--------------------------------------------------------------------------------

## 9) End‑to‑End Example
Authoring FormSpec (excerpt):

```json
{
  "version": "1.0",
  "id": "job-app",
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
            { "id": "q_country", "key": "country", "type": "select", "label": "Country", "options": [
              { "value": "US", "label": "United States" },
              { "value": "CA", "label": "Canada" }
            ]},
            { "id": "q_state", "key": "state", "type": "text", "label": "State",
              "visibleWhen": [ { "all": [ { "field": "country", "eq": "US" } ] } ] }
          ]
        }
      ]
    }
  ],
  "rules": [
    { "id": "r1", "when": { "all": [ { "field": "age", "lt": 18 } ] },
      "then": [ { "op": "setRequired", "field": "guardian_email", "value": true } ] }
  ],
  "ui": { "order": ["q_name", "q_email", "q_age", "q_country", "q_state"] }
}
```

Compiled (excerpt):

Schema
```json
{
  "type": "object",
  "title": "Job Application",
  "properties": {
    "name": { "type": "string", "title": "Full Name" },
    "email": { "type": "string", "format": "email", "title": "Email" },
    "age": { "type": "number", "title": "Age" },
    "country": { "type": "string", "title": "Country", "enum": ["US", "CA"], "enumNames": ["United States", "Canada"] },
    "state": { "type": "string", "title": "State", "ui:options": { "visibleWhen": [ { "all": [ { "field": "country", "eq": "US" } ] } ] } }
  },
  "required": ["name", "email"],
  "allOf": [
    { "if": { "properties": { "age": { "const": 17 } }, "required": ["age"] },
      "then": { "required": ["guardian_email"] } }
  ]
}
```

UI Schema
```json
{
  "ui:order": ["name", "email", "age", "country", "state"],
  "ui:meta": { "idToKey": { "q_name": "name", "q_email": "email", "q_age": "age", "q_country": "country", "q_state": "state" } },
  "state": { "ui:options": { "visibleWhen": [ { "all": [ { "field": "country", "eq": "US" } ] } ] } }
}
```

Public render & submit:
- Publish: `POST /api/templates/:id/publish` → creates Publication with compiled JSON.
- Share: `POST /api/publications/:id/share-links` → `{ token }` → open `/f/{token}`.
- Renderer: `PublicFormClient` evaluates `visibleWhen` and hides `state` unless `country == 'US'`.
- Submit: `POST /api/public/{token}/submit` stores payload as `Submission`.

--------------------------------------------------------------------------------

## 10) Troubleshooting
- Publish fails or empty: Ensure there’s at least one question and validation passes; republish after edits.
- Visibility rules not applying publicly: Check that all questions have valid `key`s and re‑publish.
- AJV validation blocks due to hidden fields: runtime scrubs required for hidden fields; ensure rules are correct.
- DB errors: verify `DATABASE_URL` and run Prisma migrations; use `scripts/clearDb.ts` to reset dev data.

--------------------------------------------------------------------------------

## 11) File Map (quick links)
- Compiler: `src/lib/formspec/compile.ts:1`
- Builder & panes: `src/components/builder/*`
- Public runtime: `src/components/PublicFormClient.tsx:1`
- APIs: `src/app/api/**`
- Models: `prisma/schema.prisma:1`
- Owner: `src/lib/owner.ts:1`
- Diagrams & examples: `docs/er-diagram.svg`, `docs/er-and-example.md:1`

