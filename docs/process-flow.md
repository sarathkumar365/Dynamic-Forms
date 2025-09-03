# Process Flow — UI Actions to Backend

This guide walks through what happens for each user action in the UI and which components, hooks, and API routes run behind the scenes. It includes how compilation works and why certain design choices were made.

--------------------------------------------------------------------------------

## Overview
- Build forms in the UI against an in-memory FormSpec
- Save to Postgres as a normalized tree (Form → Pages → Sections → Questions + Rules)
- Publish a compiled snapshot (JSON Schema + UI Schema)
- Share public links that render via @rjsf and collect submissions

--------------------------------------------------------------------------------

## User Flow Summary
- Create new form → Add pages/sections/questions → Set keys/options → Add rules → Save
- Open form detail → Publish → Create share link → Open public URL → Submit → View submissions

--------------------------------------------------------------------------------

## Builder Actions (what happens under the hood)

- Open builder
  - UI: `src/app/templates/new/page.tsx:1` renders `BuilderShell`
  - Core: `src/components/builder/BuilderShell.tsx:1`
  - State: `src/hooks/useFormSpec.ts:1` holds the FormSpec (authoring JSON)

- Add Page / Section / Question
  - UI triggers: buttons in `BuilderShell` and `QuestionPalette`
    - `addPage`, `addSection`, `addQuestion` from `useFormSpec`
  - State effects: new IDs are generated, UI order updated, `ensureKeys` assigns valid unique keys if missing
  - Files:
    - `src/components/builder/QuestionPalette.tsx:1`
    - `src/hooks/useFormSpec.ts:1` (add/move/delete logic, ensureKeys)

- Edit Question (label/help/key/required/options)
  - UI: `src/components/builder/Inspector.tsx:1`
  - State: `updateQuestion` in `useFormSpec` mutates FormSpec and re-runs `ensureKeys`
  - Why: keys must be valid (a-z, 0-9, _) and unique to support rules and stable outputs

- Add Field Visibility/Disable Rule
  - UI: `src/components/builder/RuleBuilder.tsx:1`
    - Builds conditions against other fields (by key) with operators (=, ≠, >, ≥, <, ≤, in, not in)
    - Produces question-level `visibleWhen` or `disabledWhen` as OR-of-AND groups
  - State: updates the selected question in FormSpec
  - Cleanup: deleting a question removes any rules that referenced it (`useFormSpec.deleteQuestion`)

- Add Global Rule (require/const/enum when…)
  - UI: `src/components/builder/ActionRules.tsx:1`
    - Produces a rule: `when` (AND conditions) → `then` actions (`setRequired` | `setConst` | `setEnum`)
  - State: appends to `spec.rules`

- Reorder / Delete Questions
  - UI: arrow/delete in `CanvasQuestion`
  - State: `moveQuestion` updates position + ui order; `deleteQuestion` removes refs in rules
  - Files:
    - `src/components/builder/CanvasQuestion.tsx:1`
    - `src/hooks/useFormSpec.ts:1`

- Live Preview
  - UI: `src/components/builder/PreviewPane.tsx:1`
  - Mechanism: FormSpec → `compileFormSpec` → `{ schema, uiSchema }` → @rjsf render
  - Compiler: `src/lib/formspec/compile.ts:1`

--------------------------------------------------------------------------------

## Saving the Form (authoring JSON → normalized DB)

- User clicks Save
  - UI: `src/components/builder/SaveBar.tsx:1`
    - Calls `ensureKeys` and `validateFormSpec`
    - POST `/api/forms` with `{ title, description, pages, rules }`

- API handler
  - File: `src/app/api/forms/route.ts:1` (POST)
  - Does:
    - Creates Form
    - Creates Pages (with `order`), Sections (with `order`), Questions (with `order`)
    - Persists per-question `visibleWhen` as Json
    - Persists top-level `rules` into `Rule` table as Json
  - DB models: `prisma/schema.prisma:1`

- Why normalized storage?
  - Efficient updates and ordering, simple querying, keeps authoring concerns separate from the compiled runtime snapshot

--------------------------------------------------------------------------------

## Loading a Form for Editing

- UI access
  - Page: `src/app/forms/[id]/page.tsx:1`
  - Fetches: `GET /api/forms/:id` → `src/app/api/forms/[id]/route.ts:1`
    - Re-assembles a FormSpec-ish object from normalized tables
    - Remaps any `visibleWhen` field refs from IDs to keys for a stable authoring experience

--------------------------------------------------------------------------------

## Publishing (compile + snapshot)

- User clicks Publish
  - UI: `src/components/forms/FormDetailClient.tsx:1` → `POST /api/templates/:id/publish`

- API handler
  - File: `src/app/api/templates/[id]/publish/route.ts:1`
  - Steps:
    1) Load normalized tree with Pages/Sections/Questions and Rules
    2) Build id→key map; remap any lingering id refs in `visibleWhen`
    3) Validate FormSpec (`src/lib/formspec/validators.ts:1`)
    4) Compile via `compileFormSpec` → `{ schema, uiSchema }`
    5) Store as `Publication` (immutable snapshot)

- Why snapshot?
  - Ensures public forms are immutable and load fast without re-joining authoring tables

--------------------------------------------------------------------------------

## Compilation — what and why

- File: `src/lib/formspec/compile.ts:1`
- Main steps:
  - Key map: build a stable id→key map; attach to `uiSchema["ui:meta"].idToKey` so the public runtime can resolve any stray id references
  - Question → JSON Schema:
    - Map types (text/email/number/integer/boolean/date/select/multiselect/file) to proper JSON Schema shapes
    - Add `enum/enumNames` for selects; `items/uniqueItems` for multiselect
  - Required: compute required array from question flags; scrubbed later at runtime for hidden fields
  - Order: `ui:order` from the UI’s id order (remapped to keys)
  - Question-level rules: mirror `visibleWhen`/`disabledWhen` into both `uiSchema[field].ui:options` and the property’s `ui:options` (robustness across storage/transport)
  - Global rules → `schema.allOf` using `if`/`then` so AJV enforces constraints (e.g., conditional required)

- Rationale
  - Duplicating rule hints in both schema and ui adds resilience
  - `idToKey` supports evolvable authoring identifiers without breaking public rendering

--------------------------------------------------------------------------------

## Sharing and Public Rendering

- Create Share Link(s)
  - API: `POST /api/publications/:id/share-links` or `.../assigned-links`
  - Files: `src/app/api/publications/[id]/share-links/route.ts:1`, `.../assigned-links/route.ts:1`
  - Output: token → `/f/{token}`

- Open public URL
  - Page: `src/app/f/[token]/page.tsx:1`
  - Fetch compiled: `GET /api/public/{token}` → `src/app/api/public/[token]/route.ts:1`
  - Render: `src/components/PublicFormClient.tsx:1` with @rjsf

- Runtime rule evaluation (public)
  - Component: `PublicFormClient`
  - Logic:
    - On every change, evaluate groups/conditions using form data (with `idToKey` safety)
    - Hide or disable fields by updating `uiSchema` dynamically
    - Remove hidden fields from `required` and from any `then.required` blocks to avoid dead-ends

- Submit
  - API: `POST /api/public/{token}/submit` → `src/app/api/public/[token]/submit/route.ts:1`
  - Persists `Submission` with `payload`, linked to `ShareLink` and `Form`
  - Owner sees submissions in: `src/app/publications/[id]/page.tsx:1`

--------------------------------------------------------------------------------

## Design Choices (quick answers)
- Keys vs IDs: IDs are for authoring entities; `key` is stable data shape used in rules/output. Compiler and runtime always target keys.
- Normalized vs compiled: Authoring tree is normalized for editing; published runtime is a flat compiled snapshot for speed and immutability.
- Rules in schema and UI: Duplicated intentionally for compatibility and resilience during storage/transport.

--------------------------------------------------------------------------------

## File Index (by responsibility)
- Builder shell & panes: `src/components/builder/BuilderShell.tsx:1`, `.../BuilderCanvas.tsx:1`, `.../Inspector.tsx:1`, `.../RuleBuilder.tsx:1`, `.../ActionRules.tsx:1`, `.../PreviewPane.tsx:1`
- State & validation: `src/hooks/useFormSpec.ts:1`, `src/lib/formspec/validators.ts:1`
- Compiler: `src/lib/formspec/compile.ts:1`
- APIs: forms `src/app/api/forms/route.ts:1`, `src/app/api/forms/[id]/route.ts:1`; publish `src/app/api/templates/[id]/publish/route.ts:1`; public read/submit `src/app/api/public/[token]/route.ts:1`, `.../submit/route.ts:1`; share links `src/app/api/publications/[id]/*`
- DB models: `prisma/schema.prisma:1`

