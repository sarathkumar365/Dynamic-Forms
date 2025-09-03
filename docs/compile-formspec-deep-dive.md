# compileFormSpec Deep Dive

This document explains how `compileFormSpec` turns the authoring FormSpec into a JSON Schema + UI Schema that `@rjsf/core` can render. It also highlights design choices and current limitations.

--------------------------------------------------------------------------------

## Purpose and I/O
- Location: `src/lib/formspec/compile.ts:1`
- Signature: `export function compileFormSpec(spec: FormSpec): { schema: any; uiSchema: any }`
- Input: Authoring `FormSpec` (pages → sections → questions, with rules)
- Output:
  - `schema`: JSON Schema object (Draft-07 compatible) for AJV/@rjsf
  - `uiSchema`: UI hints for @rjsf (order, per-field options, meta)

--------------------------------------------------------------------------------

## Step-by-step

1) Build stable id→key map
- Code: `idToKey` Map and `usedKeys` Set
- Why: Authoring uses generated IDs; the public runtime uses human-friendly keys. A stable mapping avoids breaking rules when questions are re-ordered or regenerated.
- How:
  - For each question, compute a `key` (use `q.key` if present, else `slug(q.label)`, else fallback to `q.id`)
  - Ensure uniqueness by adding a random suffix if needed
  - Store `idToKey.set(q.id, key)` and include all discovered `key`s in `usedKeys`
- The helper `toKey(ref)` returns `ref` when it’s already a `key`, otherwise remaps an id with `idToKey`.

2) Build properties and defaults
- For each question, add a property under its key:
  - Mapper: `qToSchema(q)` converts question types → JSON Schema
    - `email` → `{ type: 'string', format: 'email' }`
    - `number`/`integer` → numeric types
    - `boolean`, `date` (with `format: 'date'`)
    - `select` → `enum`/`enumNames`
    - `multiselect` → `{ type: 'array', items: { type: 'string', enum? }, uniqueItems: true }`
    - `file` → `{ type: 'string', contentEncoding: 'base64' }`
    - default (e.g., `text`) → `{ type: 'string' }`
  - Required: if a question is marked `required`, push the key into `required[]`
  - Help: if `q.help` is set, write `uiSchema[key]['ui:help']`
  - Default order: collect keys in `defaultOrder` for use if no explicit UI order is provided

3) Top-level schema and `ui:order`
- Start with `schema = { type: 'object', title, properties }`
- If `required.length`, attach `schema.required`
- Map UI order:
  - If `spec.ui?.order` exists (ids), map each id through `toKey(id)` and set `uiSchema['ui:order']`
  - Else, set `uiSchema['ui:order'] = defaultOrder`
- Attach meta:
  - `uiSchema['ui:meta'].idToKey = Object.fromEntries(idToKey)` so the public runtime can remap any lingering id-based references.

4) Question-level rules (visibility/disable)
- For each question with `visibleWhen`:
  - Remap all condition `field` values via `toKey` (id→key safety)
  - Write `uiSchema[key]['ui:options'].visibleWhen = remapped`
  - Mirror the same under `schema.properties[key]['ui:options'].visibleWhen`
- Repeat the same for `disabledWhen`
- Why mirror in both places? Redundancy increases robustness across storage/transport, and helps if UI hints are partially stripped.

5) Global rules → `allOf` with `if`/`then`
- For each rule in `spec.rules`:
  - Build a JSON Schema `if`:
    - Currently handles `when.all` only (AND of conditions)
    - Each equality condition `field = value` becomes `cond.properties[field] = { const: value }` and adds field to `cond.required`
  - Build a JSON Schema `then`:
    - `setRequired`: push field into `then.required`
    - `setConst`: `then.properties[field] = { const: value }`
    - `setEnum`: `then.properties[field] = { enum: values, enumNames? }`
  - If both parts exist, push `{ if: cond, then: thenObj }` into `schema.allOf`
- Limitation: `when.any` and non-equality operators are not compiled into JSON Schema at present (see “Limitations”).

6) Return `{ schema, uiSchema }`

--------------------------------------------------------------------------------

## Safeguards and Edge Cases
- Key generation
  - `slug(title)` + uniqueness guard; falls back to `id` and adds random suffix when necessary
- UI order
  - If missing, falls back to discovery order
- Rule remapping
  - All condition `field` references are passed through `toKey` so id-based references don’t break
- UI help and options coexist
  - `uiSchema[key]['ui:help']` remains compatible with `ui:options` additions

--------------------------------------------------------------------------------

## Runtime Interplay
- The public renderer (`src/components/PublicFormClient.tsx:1`) uses both schema and uiSchema hints:
  - Evaluates `visibleWhen`/`disabledWhen` and hides/disabled fields accordingly
  - Dynamically removes hidden fields from `required` and from any `then.required` to prevent validation dead-ends
  - Uses `ui:meta.idToKey` to resolve conditions that may still reference ids

--------------------------------------------------------------------------------

## Current Limitations and Opportunities
- Global rule conditions compiled to JSON Schema
  - Only `when.all` + equality (`eq`) are translated into `if`/`then` today
  - Other operators (`gt`, `gte`, `lt`, `lte`, `in`, `nin`) are not compiled and would require mapping to `minimum`/`maximum`/`enum`/`not` blocks or `anyOf` compositions
  - `when.any` could be compiled as `anyOf` branches (not yet implemented; a TODO is noted in the code)
- Question-level rules remain runtime hints
  - Visibility/disable are UI concerns; kept as UI/schema hints and enforced in the public client

--------------------------------------------------------------------------------

## Why This Design
- Keys as the public contract: Human-readable, stable keys are easier to consume downstream than ephemeral ids
- Snapshot for performance: Publications store compiled artifacts to avoid re-joining authoring tables at runtime
- Resilience: Duplicating rule hints in both uiSchema and schema properties and including `idToKey` reduces coupling and breakage across edits/migrations

--------------------------------------------------------------------------------

## Pointers
- Compiler code: `src/lib/formspec/compile.ts:1`
- Types: `src/types/formspec.ts:1`
- Validation: `src/lib/formspec/validators.ts:1`
- Public runtime: `src/components/PublicFormClient.tsx:1`

