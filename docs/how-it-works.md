# How This Project Works

This guide explains how the form builder, compiler, storage, and public runtime fit together — from a user building a form in the UI, to JSON being compiled, saved, retrieved, rendered, and submitted.

--------------------------------------------------------------------------------

## Big Picture
- Builder creates an in-memory FormSpec (your “authoring JSON”).
- Saving persists a normalized tree in Postgres (Form → Pages → Sections → Questions + Rules).
- Publishing compiles the FormSpec to JSON Schema + UI Schema and snapshots it as a Publication.
- Public links render that compiled schema via @rjsf and store submissions.

--------------------------------------------------------------------------------

## Authoring (UI → FormSpec JSON)
- State hook: `src/hooks/useFormSpec.ts:1`
  - Builds and mutates the FormSpec the builder UI edits (add/move/delete questions).
  - Ensures valid, unique question keys via `ensureKeys`.
  - Keeps UI order and cleans up rules when questions are removed.
- Builder shell: `src/components/builder/BuilderShell.tsx:1`
  - Layout: add pages/sections/questions; canvas + global rules; inspector; live preview.
- Field rules: `src/components/builder/RuleBuilder.tsx:1`
  - Adds `visibleWhen` / `disabledWhen` to questions as groups of conditions (keys, ops, values).
- Global rules: `src/components/builder/ActionRules.tsx:1`
  - Adds rules that can set required/const/enum for target fields.

FormSpec types and helpers:
- Types: `src/types/formspec.ts:1`
- Defaults: `src/lib/formspec/defaults.ts:1`
- Validation: `src/lib/formspec/validators.ts:1`

--------------------------------------------------------------------------------

## Saving (FormSpec → DB)
- Save button: `src/components/builder/SaveBar.tsx:1`
  - Validates FormSpec and POSTs to the API.
- Create API: `src/app/api/forms/route.ts:1`
  - Persists normalized records (Form, Pages, Sections, Questions) and Rules.
  - Stores per-question rule JSON (visibleWhen/disabledWhen) and top-level rules as JSON.
- DB schema: `prisma/schema.prisma:1`
  - Question.visibleWhen / disabledWhen (Json), Rule.when/then (Json), Submission.payload (Json).
  - Publication.schema/uiSchema (Json) hold compiled snapshots.

--------------------------------------------------------------------------------

## Retrieval & Editing
- List forms: `src/app/page.tsx:1`
- Form detail page: `src/app/forms/[id]/page.tsx:1`
- Read API: `src/app/api/forms/[id]/route.ts:1`
  - Remaps rule field refs back to keys (id→key) for a robust authoring experience.

--------------------------------------------------------------------------------

## Publishing (Compile → Snapshot)
- Endpoint: `src/app/api/templates/[id]/publish/route.ts:1`
  - Loads the normalized form tree, validates, remaps any id→key in conditions.
  - Compiles via `src/lib/formspec/compile.ts:1` into:
    - JSON Schema: types, required, `allOf`/`if`/`then` for global rules.
    - UI Schema: `ui:order`, per-field `ui:options.visibleWhen/disabledWhen`, and `ui:meta.idToKey`.
  - Stores snapshot as `Publication.schema` and `Publication.uiSchema`.

--------------------------------------------------------------------------------

## Public Display & Rules
- Public fetch: `src/app/api/public/[token]/route.ts:1` → returns compiled `{ schema, uiSchema }`.
- Public page: `src/app/f/[token]/page.tsx:1`
- Renderer: `src/components/PublicFormClient.tsx:1`
  - Uses @rjsf (AJV v8) to render JSON Schema.
  - Evaluates `visibleWhen` / `disabledWhen` on every change and hides or disables fields accordingly.
  - Removes hidden fields from `required` (including inside `then.required`) so submits aren’t blocked.
  - Submits payload to the API.

--------------------------------------------------------------------------------

## Submission Flow
- Submit API: `src/app/api/public/[token]/submit/route.ts:1`
  - Saves `Submission` with `payload` (Json), linked to the `ShareLink` and `Form`.
- Owner view of submissions: `src/app/publications/[id]/page.tsx:1`

--------------------------------------------------------------------------------

## Share Links
- Create link: `src/app/api/publications/[id]/share-links/route.ts:1`
- Assigned link (with name/email/note): `src/app/api/publications/[id]/assigned-links/route.ts:1`
- Each link has a unique `token` → public URL `/f/{token}`.

--------------------------------------------------------------------------------

## What JSON lives where
- Authoring JSON (FormSpec): in memory on the client (builder), validated and posted to create/update forms.
- Normalized DB records: Form/Page/Section/Question + Rules in Postgres (Prisma).
- Compiled JSON: Publication.schema + Publication.uiSchema (the “live” runtime JSON for @rjsf).
- Submissions JSON: Submission.payload.

--------------------------------------------------------------------------------

## Key Files (quick map)
- Authoring types: `src/types/formspec.ts:1`
- Builder shell: `src/components/builder/BuilderShell.tsx:1`
- State & helpers: `src/hooks/useFormSpec.ts:1`
- Field rules: `src/components/builder/RuleBuilder.tsx:1`
- Global rules: `src/components/builder/ActionRules.tsx:1`
- Compiler: `src/lib/formspec/compile.ts:1`
- Public renderer: `src/components/PublicFormClient.tsx:1`
- DB models: `prisma/schema.prisma:1`
- Owner resolution (demo auth): `src/lib/owner.ts:1`

--------------------------------------------------------------------------------

## Visuals & Example
- ER diagram (image): `docs/er-diagram.svg`
- Detailed ER + end-to-end example: `docs/er-and-example.md:1`

If you want a guided demo: build a simple form in the UI, click Save (creates Form tree), then Publish (creates Publication). Create a share link from the publication page, open `/f/{token}`, submit the form, and see the submission listed back on the publication page.

