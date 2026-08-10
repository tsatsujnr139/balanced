# Plan 001: Add automatic category and tag rules for new transactions

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report; do not improvise. When done, update the status row for this plan in
> `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat fcdb634..HEAD -- convex/schema.ts convex/finance.ts src/app/_layout.tsx 'src/app/(tabs)/planning/index.tsx' src/app/add-transaction/_layout.tsx src/app/add-transaction/index.tsx src/features/finance/types.ts src/features/finance/transaction-categories.ts`
>
> If an in-scope existing file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding. If the
> relevant transaction-create, sheet, or list patterns changed, treat that as a
> STOP condition.

## Status

- **Priority**: P1
- **Effort**: L (multi-day, including backend tests and cross-platform UI)
- **Risk**: MED (changes the required-category behavior on transaction create)
- **Depends on**: none
- **Category**: direction
- **Planned at**: commit `fcdb634`, 2026-08-08

## Why this matters

Balanced currently requires a category before an expense or income transaction
can be saved, and tags must be selected manually every time. This feature adds a
Planning surface where users can define case-insensitive description rules that
fill missing categories and tags when a new transaction is created. Matching
must run in the same Convex mutation as transaction insertion so the transaction,
its applied tags, attachments, and account balance remain one atomic operation.

The screenshot is a visual reference, not a data-model mandate. In Balanced,
the screenshot's record-type control becomes the same Expense / Income segmented
control used by the transaction form. Transfer is deliberately excluded.

## Agreed V1 behavior

These semantics are load-bearing and should not be changed during execution:

1. A rule has a required name, an Expense or Income type, one required
   `description contains` value, and at least one action: a category and/or one
   or more tags.
2. Matching trims and case-folds both the transaction description and rule text,
   then performs a case-insensitive substring match.
3. Rules run only inside `createTransaction` for non-transfer expense/income
   transactions. They never retroactively change existing transactions, never
   run during `updateTransaction`, and never run for transfer legs or transaction
   charge rows.
4. Manual values win independently:
   - If the user selected a category, no rule replaces it.
   - If the user selected one or more tags, no rule adds or replaces tags.
   - If only one field is missing, rules may fill only that missing field.
5. For a missing category, use the category action from the first matching rule
   in ascending rule order that has one. For missing tags, union tags from all
   matching rules in ascending order and deduplicate by tag ID.
6. Rule order is creation order in V1. Editing preserves order. Reordering is a
   follow-up feature, not part of this plan.
7. If no matching rule supplies a missing category, save the transaction with a
   reserved `Uncategorized` snapshot (`square.grid.2x2`, neutral gray) instead of
   rejecting the create. An empty description does not match any rule; the
   displayed merchant fallback becomes the resolved category name.
8. Category/tag cleanup stays referentially safe: deleting a tag removes it from
   rule actions; deleting/archiving a category clears that category action from
   affected rules. If cleanup would leave a rule with no actions, delete that
   rule rather than retaining an invalid no-op rule.
9. Cap automatic rules at 100. This makes matching and list queries explicitly
   bounded and keeps transaction creation within Convex transaction limits.

## Current state

- `src/app/(tabs)/planning/index.tsx:99-141` declares the Planning cards inline.
  Existing cards route to planned payments, budgets, templates, tags, and
  categories. Add Automatic Rules as the sixth card; do not redesign the grid.
- `src/app/templates.tsx:34-135` is the closest list-screen exemplar: direct
  Convex query, in-memory native search, loading state, reusable card list,
  iOS header plus button, and Android `ScreenFab`.
- `src/app/_layout.tsx:73-107` registers Planning detail lists with the existing
  fade transition. `src/app/_layout.tsx:141-182` registers full-height
  `presentation: "formSheet"` editor stacks. Match these options exactly.
- `src/app/add-template/_layout.tsx:42-186` is the closest add/edit sheet state
  and submit exemplar. It queries by optional ID, hydrates once for edit mode,
  calls create/update mutations, renders platform-specific close/save buttons,
  and uses a context for nested pickers.
- `src/app/add-template/index.tsx:89-121` and `:339-374` are the delete-in-edit
  exemplar: confirmation alert, destructive action, in-flight guard, spinner,
  and a bottom transparent delete button. Automatic Rules must follow it.
- `src/features/finance/components/category-picker-screen.tsx` and
  `tag-picker-screen.tsx` are the shared category/tag selection screens. Reuse
  them rather than creating bespoke pickers. Follow the add-template nested
  `tag-new` / `tag-color` flow so a newly created tag is selected immediately.
- `convex/schema.ts:183-203` shows the ordered CRUD model used by transaction
  templates. `convex/finance.ts:2480-2639` shows bounded data enrichment and
  create/update/delete behavior to emulate, while honoring the generated Convex
  guidance in `convex/_generated/ai/guidelines.md`.
- `src/app/add-transaction/_layout.tsx:393-436` currently rejects an expense or
  income without a selected category. At `:440-552`, the client force-unwraps
  the category and passes required `category`, `color`, and `symbol` strings.
- `convex/finance.ts:1601-1630` likewise validates required category snapshot
  arguments. At `:1851-1906`, it inserts the main transaction and tags before
  adjusting the balance. Rule resolution belongs immediately before that
  non-transfer insert, inside this same mutation.
- `convex/schema.ts:205-238` intentionally stores category name/color/symbol as
  transaction snapshots rather than category IDs. Automatic-rule category
  actions must also preserve a snapshot because built-in categories do not have
  database IDs.
- The repo has no test runner configured. Both `pnpm exec tsc --noEmit` and
  `pnpm exec tsc --noEmit -p convex/tsconfig.json` pass at `fcdb634`.
  `pnpm check` already fails on unrelated tracked plugin formatting/lint and two
  unused imports. Do not widen scope to fix those baseline failures.

## Commands you will need

| Purpose                  | Command                                           | Expected on success                                      |
| ------------------------ | ------------------------------------------------- | -------------------------------------------------------- |
| Install test tooling     | `pnpm add -D convex-test vitest @edge-runtime/vm` | exit 0; manifest and lockfile updated                    |
| Generate Convex types    | `pnpm exec convex codegen`                        | exit 0; generated API/data model include automatic rules |
| App typecheck            | `pnpm exec tsc --noEmit`                          | exit 0, no output                                        |
| Convex typecheck         | `pnpm exec tsc --noEmit -p convex/tsconfig.json`  | exit 0, no output                                        |
| Backend tests            | `pnpm test`                                       | exit 0; all automatic-rule tests pass                    |
| Scoped lint/format check | Use the exact command in Step 9                   | exit 0; no new issues                                    |

Before implementation, read all of:

- `AGENTS.md`
- `convex/_generated/ai/guidelines.md`
- Expo SDK 56 reference: <https://docs.expo.dev/versions/v56.0.0/>
- Expo Router Stack SDK 56 reference:
  <https://docs.expo.dev/versions/v56.0.0/sdk/router/stack/>

Do not start the Expo dev server or launch a simulator/emulator. The repository
instructions require explicit user authorization for either.

## Suggested executor toolkit

- Use the `ultracite` skill for all modified TypeScript/TSX and the final scoped
  check.
- Re-read the local generated Convex guidelines before touching any Convex file.
- Use the exact Expo SDK 56 docs linked above; do not substitute latest docs.

## Scope

**Existing files in scope**:

- `package.json`
- `pnpm-lock.yaml`
- `convex/schema.ts`
- `convex/finance.ts`
- `convex/_generated/api.d.ts` (generated only)
- `convex/_generated/dataModel.d.ts` (generated only)
- `src/app/_layout.tsx`
- `src/app/(tabs)/planning/index.tsx`
- `src/app/add-transaction/_layout.tsx`
- `src/app/add-transaction/index.tsx`
- `src/features/finance/transaction-categories.ts`
- `src/features/finance/types.ts`
- `plans/README.md` (status update only)

**New files in scope**:

- `vitest.config.ts`
- `convex/automatic-rules.ts`
- `convex/automatic-rules.test.ts`
- `convex/lib/automatic-rule-matching.ts`
- `src/app/automatic-rules.tsx`
- `src/app/add-automatic-rule/_layout.tsx`
- `src/app/add-automatic-rule/index.tsx`
- `src/app/add-automatic-rule/category.tsx`
- `src/app/add-automatic-rule/tags.tsx`
- `src/app/add-automatic-rule/tag-new.tsx`
- `src/app/add-automatic-rule/tag-color.tsx`
- `src/features/finance/add-automatic-rule-context.tsx`
- `src/features/finance/components/automatic-rule-list.tsx`

**Out of scope**:

- Authentication or multi-user ownership changes. Match the app's current
  single-person/global category/tag/transaction model.
- Rule enable/disable controls, drag reordering, amount/account/date conditions,
  operators other than `contains`, OR condition groups, retroactive application,
  previews, analytics, or rule-hit history.
- Applying rules to transaction edits, planned-payment backfills, transfers, or
  charge rows.
- Migrating existing transaction rows or making `transactions.category`
  optional. Persist `Uncategorized` as a valid snapshot string instead.
- Any unrelated Ultracite cleanup, refactor of the large `convex/finance.ts`
  module, or broader category/tag ownership cleanup.
- Running a dev server, simulator, emulator, native build, prebuild, or Expo
  export without new explicit authorization from the user.

## Git workflow

- Branch: `feat/automatic-transaction-rules`
- Use Conventional Commits, matching recent history such as
  `feat(transactions): add transaction edit actions`.
- Prefer one backend/test commit and one UI/integration commit if incremental
  commits are requested. Do not push or open a PR unless instructed.

## Steps

### Step 1: Establish the Convex test harness

Add current compatible `convex-test`, `vitest`, and `@edge-runtime/vm`
development dependencies. Add `"test": "vitest run"` to `package.json`. Create
`vitest.config.ts` with `environment: "edge-runtime"`, following the generated
Convex testing guidance. Do not add Jest or a second test framework.

Create `convex/automatic-rules.test.ts` with the required Vite reference and the
module map shape:

```ts
/// <reference types="vite/client" />
const modules = import.meta.glob("./**/*.ts");
```

Start with one schema smoke test so the harness is proven before feature logic.

**Verify**: `pnpm test` -> exit 0 with the smoke test passing.

### Step 2: Add the rule data model and shared public type

In `convex/schema.ts`, export an `automaticRuleType` validator containing only
`expense | income`, then add an `automaticRules` table with:

- `name: string`
- `type: automaticRuleType`
- `matchText: string` and `normalizedMatchText: string`
- optional flattened category snapshot fields: `category`, `categoryColor`,
  `categorySymbol`, and `categoryNormalizedName`
- `tagIds: Id<"tags">[]`
- `order: number`
- optional `userId: string` only for consistency with the current ordered
  Planning models; do not add auth logic in this feature

Add `by_type_and_order` on `["type", "order"]` and
`by_categoryNormalizedName` on `["categoryNormalizedName"]`. Keep index names
exactly aligned with their fields.

In `src/features/finance/types.ts`, add:

- `AutomaticRuleType = "expense" | "income"`
- `AutomaticRuleCategory` with name/color/symbol
- `AutomaticRule` with id, name, type, matchText, nullable category, and enriched
  `TransactionTag[]`

In `src/features/finance/transaction-categories.ts`, add and export the neutral
`UNCATEGORIZED_CATEGORY` snapshot used only when create-time resolution finds no
manual or automatic category. Do not include it in the normal category picker.

Run Convex code generation. Do not hand-edit generated files.

**Verify**:

- `pnpm exec convex codegen` -> exit 0.
- `pnpm exec tsc --noEmit -p convex/tsconfig.json` -> exit 0.
- `pnpm exec tsc --noEmit` -> exit 0.

### Step 3: Implement bounded rule CRUD and matching

Create `convex/automatic-rules.ts`. Public functions must all include validators.
The generated client reference will consequently use bracket syntax such as
`api["automatic-rules"].listAutomaticRules`; do not rename the file to camelCase,
which conflicts with this repository's Ultracite filename convention.

- `listAutomaticRules({})` -> at most 100, sorted by `order`, with non-archived
  tag documents enriched as `{ id, name, color }` and category returned as a
  nested object or `null`.
- `getAutomaticRule({ id })` -> enriched rule or `null`.
- `createAutomaticRule({ name, type, matchText, category?, tagIds })`.
- `updateAutomaticRule({ id, name, type, matchText, category?, tagIds })`.
- `deleteAutomaticRule({ id })` -> require that the document exists, then delete.

Use shared validation for create/update:

- Trim name and condition; normalize the condition using the same locale-aware
  lowercasing convention as existing label lookup.
- Name must be 1-80 characters; match text 1-120 characters.
- Require category or at least one tag.
- Deduplicate tag IDs and verify every referenced tag exists and is not archived.
- Enforce a global maximum of 100 rules with a bounded `take(101)`/`take(100)`
  check. Never use an unbounded `.collect()` for automatic rules.
- On create, assign `order = max(existing order) + 1`; update must preserve it.

Create `convex/lib/automatic-rule-matching.ts` for direct mutation-context
helpers shared with `finance.ts`. It should expose:

```ts
resolveAutomaticRuleActions(ctx, {
  description,
  hasManualCategory,
  hasManualTags,
  type,
}) -> { category: snapshot | null; tagIds: Id<"tags">[] }
```

It must early-return without querying if both manual fields are present or the
trimmed description is empty. Otherwise query the relevant type via
`by_type_and_order`, take at most 100, filter case-insensitive substring matches,
choose the first matching category, and union/dedupe matching tags. Do not call a
Convex query from the transaction mutation; this helper must use the mutation
context directly so creation remains one transaction.

**Verify**:

- `pnpm exec convex codegen` -> exit 0.
- `pnpm exec tsc --noEmit -p convex/tsconfig.json` -> exit 0.

### Step 4: Integrate cleanup into category and tag deletion

In `convex/finance.ts`:

- Extend `deleteTag` to remove the archived tag ID from every affected automatic
  rule. The maximum of 100 rules makes a bounded scan acceptable; use `take(100)`
  and do not introduce another unbounded collection.
- Extend `deleteCategoryByName` to query affected rules through
  `by_categoryNormalizedName`. Clear all four flattened category snapshot fields
  when tags remain; delete the rule if it would otherwise have no action.
- Mirror the category cleanup in `deleteCategory` if that mutation remains
  publicly callable, resolving the category document's normalized name first.

Do not rewrite historical transactions, templates, budgets, or planned payments
when a category is archived; preserve current behavior for those models.

**Verify**: Add tests showing category cleanup and tag cleanup retain a valid
tags-only/category-only rule or delete an actionless rule, then run `pnpm test`.

### Step 5: Apply rules atomically during non-transfer creation

Change only the `createTransaction` contract and non-transfer branch in
`convex/finance.ts`; keep `updateTransaction` category fields required.

The create validator should accept optional `category`, `color`, and `symbol`
snapshot strings. Validate that those three fields are either all present or all
absent. In the non-transfer branch, before computing merchant or inserting:

1. Treat `args.merchant` as the raw trimmed user description for matching.
2. Call the direct mutation-context resolver only for missing fields.
3. Resolve category as manual snapshot, then first matching rule category, then
   the neutral `Uncategorized` snapshot.
4. Resolve tags as manual tag IDs when non-empty; otherwise use matched tag IDs.
5. Compute the displayed merchant as raw description or resolved category name.
6. Insert the transaction, replace its tags with resolved tags, insert
   attachments, create a charge if requested, and update the account balance as
   the existing code already does.

Do not run the resolver in any transfer branch. Do not apply parent-rule tags to
the generated transaction-charge child.

In `src/app/add-transaction/_layout.tsx`:

- Continue requiring an account and positive amount.
- Stop requiring a category in create mode for expense/income. Preserve the
  category requirement in edit mode so editing never accidentally creates an
  uncategorized/manual ambiguity.
- For create, pass optional category snapshot fields and pass the raw trimmed
  description. Remove category non-null assertions from the create payload.
- Preserve the existing transfer validation and required Transfer snapshot.

In `src/app/add-transaction/index.tsx`, change the empty category row from a red
`Required` state to the neutral value `Automatic or Uncategorized` in create
mode. It remains `Required` in edit mode.

**Verify**: both TypeScript commands exit 0.

### Step 6: Lock rule resolution with Convex tests

Use `convex-test(schema, modules)` and real public mutations. Seed only the
minimal account/tag documents each test needs. Cover at least:

1. Expense rule applies category and tag to an uncategorized/untagged expense.
2. Income rule does not apply to an expense with the same description.
3. Description matching is trimmed and case-insensitive.
4. A manual category is preserved while missing tags are filled.
5. Manual tags are preserved while a missing category is filled; rule tags are
   not appended.
6. Overlapping rules choose the earliest category and union/dedupe tag IDs.
7. No matching category persists the `Uncategorized` snapshot.
8. Empty description matches nothing.
9. Transfers and transaction-charge rows never receive rule actions.
10. `updateTransaction` does not re-run rules.
11. Create/update validation rejects an empty condition, an actionless rule,
    stale/archived tag IDs, and rule 101.
12. Delete cleanup cases from Step 4.

Assert persisted `transactions` and `transactionTags` rows, not only mutation
return values. Also assert the account balance so matching changes cannot hide a
regression in the surrounding atomic mutation.

**Verify**: `pnpm test` -> all tests pass with no skipped/only tests.

### Step 7: Add the Planning card and Automatic Rules list

In `src/app/(tabs)/planning/index.tsx`, append an Automatic Rules card using the
existing square-grid layout. Recommended copy:

- Title: `Automatic Rules`
- Subtitle: `Categorize new transactions`
- Symbol: `wand.and.stars`
- Route: `/automatic-rules`

Create `src/app/automatic-rules.tsx` by following `templates.tsx`:

- Query `api["automatic-rules"].listAutomaticRules` directly.
- Native `Stack.SearchBar` filters rule name, match text, category name, and tag
  names case-insensitively.
- Show an activity indicator while undefined.
- Use the iOS toolbar plus button and Android `ScreenFab` to open
  `/add-automatic-rule`.
- Pressing a row opens `/add-automatic-rule?id=<rule id>`.

Create `automatic-rule-list.tsx` matching the card/list visual language of
`transaction-template-list.tsx`. Each accessible row should show:

- rule name as the primary label;
- `Expense` or `Income` plus `Description contains “…”` as secondary copy;
- category icon/name when present;
- compact tag names or `<n> tags` when present;
- a chevron indicating edit navigation;
- an empty card reading `No automatic rules yet`.

In `src/app/_layout.tsx`, register `automatic-rules` with the existing list fade
transition and `add-automatic-rule` with the same full-height `formSheet` options
as `add-template`.

Because `.expo/types/router.d.ts` is generated by the forbidden dev-server flow
and is not tracked, use the repo's existing `as never` route escape only where
the stale local generated type requires it. Do not hand-edit `.expo` files.

**Verify**: `pnpm exec tsc --noEmit` -> exit 0.

### Step 8: Build the add/edit form sheet from existing primitives

Create `add-automatic-rule-context.tsx` and the `add-automatic-rule` route group,
following add-template's architecture:

- `_layout.tsx` owns form state, optional-ID query hydration, create/update
  mutations, submit guard, context, close/save headers, and nested picker routes.
- `index.tsx` renders:
  - Expense / Income `SegmentedControl` using the same transaction visual;
  - a required rule-name text input;
  - a required description-contains text input with clear explanatory copy;
  - optional Category and Tags rows using `FieldGroup` / `FieldRow`;
  - a visible `Clear category` action when a category is selected, since valid
    tags-only rules must be editable without deleting and recreating the rule;
  - a short footnote that rules fill only missing values on newly created
    transactions;
  - the destructive delete button only when editing.
- `category.tsx` reuses `CategoryPickerScreen` and returns after selection.
- `tags.tsx` reuses `TagPickerScreen`.
- `tag-new.tsx` and `tag-color.tsx` mirror add-template so newly created tags are
  selected in the draft.

Submit must validate name, condition, and at least one action before calling the
backend. Backend validation remains authoritative. On failure, show the specific
Error message when available. On success, dismiss back to the rule list. Delete
must confirm, guard duplicate taps, show a spinner, call the delete mutation, and
dismiss to `/automatic-rules`.

Accessibility requirements:

- Every row/button has an accurate accessibility label and role.
- The segmented control state is conveyed by the native control.
- Delete is unavailable during save/delete.
- Inputs have meaningful placeholders and do not rely on color alone to signal
  required state.

**Verify**: `pnpm exec tsc --noEmit` -> exit 0.

### Step 9: Run non-interactive verification and inspect scope

Format only touched files with the repository formatter, then run:

1. `pnpm test`
2. `pnpm exec tsc --noEmit -p convex/tsconfig.json`
3. `pnpm exec tsc --noEmit`
4. The following exact scoped check:

   ```sh
   pnpm exec ultracite check vitest.config.ts convex/schema.ts convex/finance.ts convex/automatic-rules.ts convex/automatic-rules.test.ts convex/lib/automatic-rule-matching.ts src/app/_layout.tsx 'src/app/(tabs)/planning/index.tsx' src/app/add-transaction/_layout.tsx src/app/add-transaction/index.tsx src/app/automatic-rules.tsx src/app/add-automatic-rule src/features/finance/transaction-categories.ts src/features/finance/types.ts src/features/finance/add-automatic-rule-context.tsx src/features/finance/components/automatic-rule-list.tsx
   ```

5. `git status --short`
6. `git diff --check`

The first four targeted gates and `git diff --check` must exit 0. `git status`
must show only files in this plan's scope. Do not use repository-wide
`pnpm check` as a pass/fail gate until the unrelated baseline violations are
resolved elsewhere.

Do not launch a simulator or dev server. Provide the following manual QA list to
the user for a separately authorized device session:

- Planning card opens Automatic Rules.
- Empty, loading, search, add, edit, save, error, and delete states.
- Expense/Income switching and category/tag nested pickers.
- A matching create with no category/tags.
- Manual category only; manual tags only; both manual.
- No-match Uncategorized create.
- Transfer bypass.
- Light/dark mode, VoiceOver/TalkBack labels, and Android back behavior.

## Test plan

- Backend tests live in `convex/automatic-rules.test.ts` and use real Convex
  mutations, schema, and module discovery. Cases are enumerated in Step 6.
- No UI test harness exists in this repository; do not introduce a second large
  testing effort into this feature. App typechecking, scoped Ultracite checks,
  and the deferred device checklist cover the UI layer for V1.
- Verification:
  - `pnpm test` -> all automatic-rule tests pass.
  - `pnpm exec tsc --noEmit -p convex/tsconfig.json` -> exit 0.
  - `pnpm exec tsc --noEmit` -> exit 0.

## Done criteria

- [ ] Automatic Rules appears in Planning and opens a searchable list.
- [ ] Users can add and edit an Expense/Income description-contains rule with a
      category and/or tags.
- [ ] Delete is visible only in edit mode and requires confirmation.
- [ ] New expense/income transactions can be created without choosing a
      category and resolve rules atomically in Convex.
- [ ] Manual category/tags win independently; rule ordering and tag union match
      the Agreed V1 behavior.
- [ ] No-match creates persist the neutral `Uncategorized` snapshot.
- [ ] Transfers, charge rows, edits, and historical rows are unaffected.
- [ ] Category/tag deletion cannot leave stale or actionless rules.
- [ ] Automatic-rule queries are bounded and creation enforces the 100-rule cap.
- [ ] `pnpm test` exits 0 with all Step 6 cases represented.
- [ ] Both TypeScript commands exit 0.
- [ ] Scoped Ultracite check and `git diff --check` exit 0.
- [ ] No out-of-scope files are modified.
- [ ] No dev server, simulator, emulator, prebuild, or native build was run.
- [ ] The status row in `plans/README.md` is updated.

## STOP conditions

Stop and report back instead of improvising if:

- The user wants rules to overwrite manually selected category/tags, apply to
  existing transactions, apply on edit, or include transfers; those materially
  change the agreed semantics and risk profile.
- The screenshot requires condition operators/fields beyond the scoped
  description-contains V1.
- Current code has added authentication/ownership enforcement since `fcdb634`;
  rule ownership must then be designed consistently rather than copied from the
  old global model.
- Convex code generation rejects the non-function support module; report the
  exact error and do not use `ctx.runQuery` as a workaround.
- The 100-rule bounded scan is insufficient for a stated product requirement;
  pagination and matching architecture need a separate design decision.
- Either typecheck fails twice after reasonable feature-local fixes.
- A required fix touches files outside Scope or would require resolving the
  existing repository-wide Ultracite baseline.
- Device/simulator behavior must be verified to proceed; request explicit
  authorization before launching it.

## Maintenance notes

- Rule order is semantically meaningful even though V1 has no reorder UI. Any
  future reorder feature must update `order` transactionally and test category
  precedence.
- Adding new condition fields/operators should use a discriminated union in the
  schema rather than multiple loosely optional fields.
- If authentication is enabled, add owner-derived indexes and authorization to
  every rule CRUD/matching path before exposing the app to multiple users.
- Reviewers should focus on manual-value precedence, bounded queries,
  category-snapshot consistency, and ensuring rule resolution remains inside
  `createTransaction`'s atomic mutation.
- Rule previews, hit counts, enable/disable, reorder, and retroactive apply are
  intentionally deferred until V1 behavior is observed in real use.
