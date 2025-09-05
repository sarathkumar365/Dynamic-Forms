# Rules Builder Guide

This guide explains how to create and manage both per‑field Visibility/Disable rules and Global rules in the form builder. It covers concepts, UI steps, examples, compilation behavior, and troubleshooting tips.

## Overview

- Visibility/Disable rules: control whether a specific field is shown or enabled based on other field values.
- Global rules: enforce data constraints across the form such as making a field required, setting a constant value, or restricting allowed options when conditions match.

Both rule types use the same condition model: AND within a group, OR across groups.

## Core Concepts

- Key vs ID: Rules reference fields by their `key` (e.g., `email`, `age`), not by internal ids. Ensure each question has a unique, stable key before building rules.
- Condition groups:
  - A group contains one or more conditions combined with AND.
  - Multiple groups are combined with OR. If any group matches, the rule triggers.
- Operators:
  - Equality/inequality: `=` (`eq`), `≠` (`ne`)
  - Comparisons: `> (gt)`, `≥ (gte)`, `< (lt)`, `≤ (lte)`
  - Set membership: `in`, `not in (nin)`
- Type handling:
  - Booleans are typed as `true`/`false`.
  - Numbers are parsed when the input looks numeric.
  - For `in`/`nin`, provide comma‑separated values or multiple selections (for select/multiselect questions).
- Self‑reference safety: Per‑field rules cannot reference the same field they modify (the UI hides the current field from the controller list) to avoid cycles.

## Visibility / Disable Rules (Per‑Field)

Use these to show/hide or enable/disable a single field based on other answers.

Where: Inspector → “Visibility / Disable Rules” for the selected question.

Steps:
1) Choose an effect: “Hide when …” or “Disable when …”.
2) Build conditions:
   - First row starts with IF; add more rows with “+ AND condition” to require all to match.
   - Pick a controlling field (by key), select an operator, and provide a value.
   - For boolean controllers, pick true/false.
   - For select controllers, you can pick a single value or multiple values for `in`/`nin`.
3) Click “Add OR group” to save the group. Add additional groups to express alternatives.
4) Manage rules:
   - Existing Hide/Disable rules list above the editor; each can be deleted.

Examples:
- Hide “company” when `employment_type = student`.
- Disable “state” unless `country in [US, CA]` (use a group with `country in US, CA`).

How it runs:
- These rules are evaluated at runtime in the public renderer to toggle field visibility and disabled state. They are also copied into the compiled UI schema for portability.

## Global Rules (Form‑Level)

Use these to change validation or data shape when conditions match.

Where: Builder → “Global Rules”.

Actions supported:
- Make required (`setRequired`): mark a field required when conditions are met.
- Set constant (`setConst`): force a field’s value to a constant when conditions are met.
- Restrict options (`setEnum`): limit a field’s allowed values when conditions are met.

Steps:
1) Pick the Target field (by key).
2) Choose an Action: Make required, Set value, or Restrict options.
   - For Set value, provide the constant value.
   - For Restrict options, provide a comma‑separated list of allowed values.
3) Build the IF conditions just like per‑field rules (AND within a group).
4) Click “Add Rule” to save it. Existing rules appear in a list; each can be deleted.

Examples:
- Require “email” when `contact_method = email`.
- Set “country = US” when `region = NA`.
- Restrict “size ∈ {S,M,L}” when `category = t-shirt`.

How it compiles and runs:
- Global rules compile into JSON Schema `if`/`then` blocks under `allOf`. They are enforced by the schema validator (AJV) in both the builder preview and public form runtime.

## Compilation Behavior (Summary)

- Visibility/Disable rules → Copied into UI schema and `ui:options` for fields; also stored on questions for authoring.
- Global rules → Translated into JSON Schema constructs so that validation (required/const/enum) is guaranteed by the schema.

## Best Practices

- Set keys early: Name fields clearly and uniquely before adding rules.
- Prefer select options for categorical logic: Use selects with explicit `value`s (not labels) for robust comparisons.
- Keep groups focused: Start with one group; add an OR group only when truly alternative logic is needed.
- Avoid over‑constraining: Combining restrictive global rules with hide/disable logic can create states where the user cannot satisfy validation.
- Test in Preview: Switch to Preview to verify both UI behavior and validation.

## Troubleshooting

- A rule doesn’t trigger:
  - Verify the controlling field’s key matches exactly.
  - Check value types: numbers vs strings, boolean true/false.
  - For selects, compare against option `value`, not the label.
  - For `in`/`nin`, ensure values are comma‑separated without stray spaces.
- Validation fails unexpectedly:
  - A global `setRequired` may require a hidden/disabled field. Revisit logic or make the field visible under the same conditions.
- After editing fields, rules look broken:
  - If you changed keys, update rules to reference the new keys. Keep keys stable when possible.

## Reference

- Condition logic: AND within a group; multiple groups are ORed.
- Operators: `=`, `≠`, `>`, `≥`, `<`, `≤`, `in`, `not in`.
- Data types: boolean, number/integer, string; arrays for `in`/`nin`.

## Related Files (for developers)

- Field Rules UI: `src/components/builder/RuleBuilder.tsx`
- Global Rules UI: `src/components/builder/ActionRules.tsx`
- Types: `src/types/formspec.ts` (`visibleWhen`, `disabledWhen`, `rules`)
- Compilation: `src/lib/formspec/compile.ts` (copies field rules; converts global rules into `if/then`) 
