# Fearless Buyer implementation plan

This file (`docs/plan.md`) is the canonical implementation plan and session
handoff; update it here rather than in session-state copies. Keep verified results,
unfinished work, known failures, and authorization boundaries current; do not
treat code that is merely written as a completed, validated feature.

## Problem and approach

Build a new, private, phone-first grocery web app for one household and one store.
Each shopping cycle starts empty. A reusable catalog follows the store's walking
route. Selecting an item animates it out of the catalog and adds it to a separate
Grocery List tab. Purchased items remain in place, visibly completed.

The approved app workspace is at `/Users/s.collins/Projects/fearless-buyer`.
Use Subaru Where Are You as an architecture and UI reference, not as the project
to modify or a repository to clone wholesale. The working name is Fearless Buyer;
name, domain, and trademark availability have not been verified.

## Current-state analysis

At initial planning there was no grocery codebase. The inspected reference project is
`/Users/s.collins/Projects/subaru-where-are-you`.

- `README.md`, root `package.json`, and `firebase.json` establish a React,
  TypeScript, Vite, Firebase Hosting, and Firestore application, with root-owned
  client dependencies and an independent Cloud Functions package.
- `client/package.json` confirms React 19, Tailwind v4, shadcn/Base UI, Lucide,
  Vitest, React Testing Library, and Firebase SDK usage.
- `client/src/App.tsx` switches between authentication and application content
  through an auth provider without a client router. This simple pattern fits v1.
- `client/src/index.css` defines shared color/radius tokens, light/dark themes,
  Geist typography, and animation utilities. Reuse the visual approach, not
  vehicle/chart-specific CSS or blanket focus-outline suppression.
- `client/src/lib/firebase.ts` initializes Firestore and supports local emulators.
  The new app also needs Firebase Authentication and its emulator.
- `client/src/hooks/useGasHistory.ts` uses one-shot Firestore reads. The new app
  needs live listeners with cleanup and explicit error/pending states.
- `firestore.rules` permits public reads of selected history collections and
  denies browser writes. Those rules are unsuitable for private shared groceries.
- The reference's custom JWT login, Express Functions, Smartcar OAuth, schedules,
  caches, charts, and data imports are not needed here.

The new app workspace has been created and its dependencies installed locally.
No reference repository files were changed. Three approved, signed local commits
exist on `main` (see Commit handoff). No remote, pushes, production Firebase
resources, or deployments have been created.

## Implementation progress

| Workstream                        | Status                                       | Remaining before completion                                                                                                                                                                      |
| --------------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Workspace and runtime             | Complete                                     | Node 24.19.0, npm 11.19.0 configuration, dependencies, and initial tooling verified                                                                                                              |
| Firebase model and authentication | In progress: emulator rules tests pass       | Finish browser login/access verification and revalidate final implementation                                                                                                                     |
| Shared data services              | In progress: emulator concurrency tests pass | Manual browser verification of actual services and failure paths remains                                                                                                                         |
| Catalog selection                 | In progress: written                         | Verify full selection animation, Undo, and failed-save recovery in a browser                                                                                                                     |
| Grocery List                      | In progress: written                         | Verify shared quantity/check/remove/reset flow in a browser                                                                                                                                      |
| Store management                  | In progress: written                         | Verify drag/keyboard ordering, section moves, and concurrent edits                                                                                                                               |
| Integrated validation             | In progress                                  | Formatting applied; lint, 19 unit tests, build, and 14 emulator rules tests pass after formatting; Playwright removed; responsive/accessibility checks and dependency advisory assessment remain |
| Setup documentation               | Pending                                      | Local setup guide and separately authorized production provisioning instructions                                                                                                                 |

- Git initialized at the user's request with an empty `main` branch.
  `.gitignore` excludes dependencies, build output, TypeScript build metadata,
  local environment/secrets, emulator state, logs, and test artifacts while
  retaining `.env.example` and explicitly retaining `.nvmrc` despite a global
  ignore rule. `.gitattributes` normalizes source/config text line endings.
  Three local commits exist on `main`; the working tree was clean afterward.
  No remote is configured and nothing has been pushed.
- Scaffold, authentication components, catalog/list screens, store management,
  Firestore services/rules, and initial tests are written. All 14 current emulator
  access/rules/concurrency tests pass after fixes; full end-to-end behavior is not
  verified. Emulator concurrency tests exercise the shared update helper with
  transactions; they are not a substitute for testing the actual browser service.
- Matched Subaru's runtime configuration: `.nvmrc` is `24.19.0`, package engines
  are `24.x`, and packageManager is `npm@11.19.0`. Installed Node through existing
  nvm; no project-local Node dependency and no global CLI installs.
- Node 24.19.0 bundles npm 11.17.0 here. Use
  `npm exec --yes --package=npm@11.19.0 -- npm <command>` after `nvm use` to run the
  pinned npm without changing global packages.
- Refreshed the workspace lockfile using npm 11.19.0 and aligned the root Vite
  dependency with the client to resolve a build-time duplicate-version conflict.
- Verified under Node 24.19.0 before the latest rules/service/browser-test edits:
  TypeScript/production build, ESLint, and all 19 initial unit/component tests
  passed. Build reports a large-chunk warning (813.78 kB JS, 247.15 kB gzip).
- Installation reports 14 moderate dependency advisories; these still need
  assessment. Existing user npm configuration produces legacy always-auth
  warnings; the user's configuration was not modified.
- Formatting: `npm run format` (project-local Prettier) rewrote 24 files before
  the commits; `npm run format:check`, `npm run lint`, and `npm test` (19 unit
  tests) passed afterward under Node 24.19.0. TypeScript/production build and
  emulator rules tests were rerun after formatting (2026-11-23): `npm run build`
  passed (same large-chunk warning) and `npm run test:rules` passed 14/14.
- Remaining: manual two-person browser verification and
  responsive/accessibility verification; local setup documentation;
  persistent emulator-data handling; final validation. Do not equate passing
  the initial tests with a verified working shared app.

### Browser testing: removed (matches Subaru)

- Playwright e2e tests were removed at the user's request (2026-11-23) to match
  Subaru, which has no browser-automation tests. Removed `@playwright/test`
  (and transitive `playwright`/`playwright-core`) from devDependencies and the
  lockfile, `playwright.config.ts`, `e2e/`, the `test:integration` script, and
  the Playwright `.gitignore` entries. `npm run validate` now runs lint, format
  check, build, unit tests, and `npm run test:rules`; it passes.
- Root cause of the earlier failures: managed Google Chrome (and Homebrew
  Chrome Canary) log "DevTools remote debugging is disallowed by the system
  admin" ~5-10 s after launch and drop the automation connection. Not an app
  defect: before removal, both e2e tests (desktop, phone) passed using a
  pre-existing cached Chromium left by another project.
- Installs must go through Homebrew. The Homebrew `chromium` cask is disabled
  (fails Gatekeeper); `ungoogled-chromium` exists but was not installed. If
  browser automation returns, it needs a non-managed browser and user approval.
- The two-person browser workflow is now verified manually, not by automation.
- Do not assume a dev server or persistent local household is currently running.

### Rules and concurrency fixes made during pre-commit validation

- Firestore Rules Sets do not support the attempted `toList()` operation.
  Replaced it with a write-supplied `changedItemId` checked against the actual map
  diff; rules still validate the changed entry and reject unrelated entry changes.
- Full-map transaction writes could fail authorization during concurrent edits.
  Individual list operations now update only their item's field via `FieldPath`
  and set `changedItemId`. Reset remains an atomic empty-list replacement.
- Sections maintain an item count with catalog moves/creation in the same
  transaction, preventing removal of a populated section.
- Latest `npm run test:rules`/rules phase of `npm run validate`: 14 passed,
  including household isolation, invalid-write rejection, section integrity,
  concurrent edits, idempotent selection, listener synchronization, and reset.

### Commit handoff and authorization

- User approved three local commits: `chore: scaffold Fearless Buyer workspace`,
  `feat: add private shared grocery workflow`, and
  `docs: document local setup and development`.
- User explicitly accepted committing with failing browser tests (documented in
  the feat commit body) after formatting was applied first.
- Made (GPG-signed, "Good signature", Copilot co-author trailer included):
  - `5010c67 chore: scaffold Fearless Buyer workspace` — 17 config/tooling
    files: root dotfiles, package/lock files, ESLint, Firebase and emulator
    Vitest config, client config, and `client/.env.example` (demo values only).
    Configuration only; not a runnable app on its own.
  - `f5b260e feat: add private shared grocery workflow` — 31 files:
    `client/src/**`, `firestore.rules`, `tests/`, `e2e/`,
    `playwright.config.ts`, and `scripts/`. Body records the known e2e failure.
  - `1b950c0 docs: add implementation plan and handoff` — `docs/plan.md`.
- Staged diffs were inspected before each commit: no real secrets (password hits
  are runtime-generated or fixtures); lockfile resolves only from
  `registry.npmjs.org`; no internal registry references.
- Repo-local identity and signing were re-verified before committing; global Git
  config was not changed.
- Still pending: the `docs` commit. The setup README is not written yet; do not
  create a documentation commit with nonexistent or unverified instructions.
- No remote is configured. No push is authorized; pushing needs separate
  explicit approval, as does every further commit.

### Remaining implementation order (resume only when requested)

1. Done: build and `npm run test:rules` (14/14) pass after formatting.
2. Done: browser automation removed (see Browser testing). Next, manually
   verify the two-person workflow on two signed-in sessions against the local
   emulators: selection animation and Undo, quantity/check/remove/reset sync,
   failure states, responsive layout, and accessible ordering.
3. Assess the 14 moderate dependency advisories and the large-chunk build warning.
4. Document local startup, account setup, and emulator persistence; then propose
   the approved `docs: document local setup and development` commit.
5. Commit, add a remote, push, and deploy only with separate explicit
   authorization for each action.

## Confirmed v1 behavior

### Starting data and grouping

- Actual products, aisle numbers, and a completed store layout are not prerequisites
  for implementation. Use fictional fixtures in tests/local UI development only.
- The real household starts with an empty catalog. Guide users to create a section,
  then add groceries; do not silently populate production with sample products.
- Group groceries under named store sections in the order users walk the store.
  Labels such as Produce or Frozen are sufficient; exact aisle numbers are optional
  text in the section name, not required identity or sorting data.
- Within each section, use custom item order, not alphabetical order. Both Catalog
  and Grocery List share the same section/item order; search preserves this order.
- New sections append to the route; new items append within their chosen section.
  Users refine both orders with management-mode dragging or move controls.
- Hide section headings with no visible items in ordinary tab views. Keep all
  sections visible in management so empty sections remain editable.
- Store layout and groceries can be entered incrementally and revised later without
  changing permanent section/item IDs. No retailer product feed or aisle lookup is
  needed in v1.

### Catalog tab

- Show reusable items that are not currently selected, grouped in store order.
- Support search, Add Item, and an explicit Edit action.
- Selecting an item adds it with quantity 1 and incomplete status, then animates
  it out of the catalog. Stay on this tab so successive selections are easy.
- Update the Grocery List tab count and announce the addition accessibly.
- Add Item saves to the reusable catalog only; it does not select the new item.
- Require a name and section. New items append within their chosen section.
- Do not delete an item from storage merely because it disappears from this tab.

### Grocery List tab

- Show selected items in custom section and item order.
- Keep one row per catalog item; repeated rows are explicitly out of scope.
- Default quantity is 1 with no visible x1 badge. Show x2, x3, etc. for multiples.
- Use a separate quantity control with positive whole-number values.
- Checking an item dims it and shows a checked state without changing position.
  Unchecking restores its incomplete appearance.
- Completion is distinct from removal. A separate Remove action returns the item
  to its ordered position in the catalog.
- Do not offer catalog-detail editing on this tab. Only quantity, completion,
  and removal controls belong here; quantity and completion apply to this trip.
- Edit names, sections, and order through Catalog or its management view only.
- Intentional catalog reordering may change list order; checking never does.

### Management and reset

- Both household members can add/edit catalog items and manage store sections.
- The Catalog management view includes all catalog items, including those hidden
  from ordinary selection because they are already on Grocery List.
- Use drag handles in management mode to reorder sections and items within a
  section. Change an item's section through its edit form.
- Provide keyboard-accessible move controls as an alternative to dragging.
- Keep drag/reorder behavior out of ordinary selection and shopping mode.
- New List requires confirmation and clears all selections, quantities, and
  completion states. Preserve catalog and store order. Do not retain list history.
- No automatic weekly reset.
- Empty sections can be removed; populated sections require reassignment first.
- Catalog deletion, multi-store support, prices, brands, substitutions, imports,
  and shopping history are outside v1.

## Architecture

### Project structure and tooling

- Root npm workspace owns `client/` and the single dependency lockfile.
- `client/`: React + TypeScript strict mode + Vite + Tailwind/shadcn + Lucide.
- Firebase Hosting serves the SPA. No custom backend or Functions package in v1.
- Firebase Authentication supplies email/password login and password recovery.
- Firestore provides authorized data storage and real-time synchronization.
- Use Zod schemas at data/form boundaries, focused service modules, interfaces
  for application shapes, and explicit exported return types.
- Use local devDependencies only. Confirm package installation scope before
  installing; never install CLI tooling globally.
- Define root scripts for development, build, lint, formatting, tests, rules
  tests, and full validation. Use the reference's supported runtime/tooling
  conventions while checking compatibility when scaffolding.

### Proposed modules

- `client/src/App.tsx`: auth gate and tab shell.
- `client/src/context/`: Firebase auth provider and guarded consumption hook.
- `client/src/lib/firebase.ts`: SDK setup and explicit development emulator wiring.
- `client/src/schemas/`: catalog, section, and active-list boundary schemas.
- `client/src/services/`: catalog, section-order, and shopping-list operations.
- `client/src/hooks/`: subscribed household data and user-visible operation state.
- `client/src/components/`: CatalogTab, GroceryListTab, grocery rows, item editor,
  quantity editor, StoreManager, login, and confirmation dialogs.
- `client/src/lib/`: tested search, ordering, and catalog/list projection helpers.
- Root `firebase.json`, `firestore.rules`, and emulator rule tests.

### Firestore model

Use a single provisioned household, with stable IDs separate from route positions:

- `households/{householdId}`: privileged configuration containing the two
  authorized Firebase Authentication UIDs; ordinary clients cannot edit membership.
- `households/{householdId}/sections/{sectionId}`: section name and sort order.
- `households/{householdId}/catalog/{itemId}`: item name, sectionId, sort order,
  and update metadata.
- `households/{householdId}/shoppingLists/active`: an `items` map keyed by stable
  catalog item IDs; each entry contains quantity and completion status.
  Individual writes also set `changedItemId` for rules validation.

Implementation also includes `itemCount` and an operation item reference on
sections for validated atomic catalog moves, plus
`households/{householdId}/metadata/ordering` with a revision for management conflicts.

Derive row names and store ordering from the shared catalog. Derive catalog
visibility from membership in the active-list map, not completion status.
Sort by section order, item order, then stable ID as a deterministic tie-breaker.

A single small active-list document is deliberate: it makes reset atomic and
avoids generation IDs, orphan cleanup, or a backend solely to clear a list.
Use transactions for selection, removal, quantity changes, completion, and reset,
so concurrent changes do not overwrite unrelated entries. Persist desired
completion values rather than retrying a blind toggle. Selection is idempotent.
Do not put the entire catalog into that document.

This choice has document-size and contention limits; it fits the current
one-household grocery workload, not large collaborative inventories. Surface
capacity/write errors explicitly. Move to per-item documents only if actual scale
requires it. Avoid adding speculative size caps to the product.

Reordering uses coordinated writes and revision checks where needed so concurrent
management changes do not silently lose ordering edits.

### Access control and provisioning

- Provision two separate email/password accounts through a privileged setup step.
  Do not expose a public registration UI or collect credentials in source files.
- Rules deny unauthenticated and nonmember access to every household path.
- Knowing the Firebase config or authenticating as an unrelated user grants no
  grocery access. A missing signup screen alone is not an access-control boundary.
- Clients cannot create households or modify the approved member list.
- Rules validate allowed fields, name/section references, numeric ordering, and
  shopping-list entry quantity/completion shapes. Limit edits to supported
  operations; test nested-map updates and empty-list reset explicitly.
- Default-deny all other paths. Use least privilege rather than copying public
  collection rules from Subaru.
- Create a separate Firebase project only with explicit provisioning approval.
  Account emails/passwords and production secrets stay out of committed files.

### Synchronization, errors, and connectivity

- Subscribe to sections, catalog, and active list only after authorized login.
  Clean up listeners on logout/unmount and distinguish loading, empty, and denied.
- Both devices see confirmed changes without refreshing.
- Local exit animation is presentation state, not the authority for list changes.
  Disable duplicate activation during an operation. Reconcile live updates without
  replaying exit animations or generating duplicate rows.
- Clearly indicate saving versus saved. On rejection/failure, restore a usable
  catalog row, preserve user input where relevant, and show a specific retry path.
- Provide Undo for selection by returning the item to the catalog.
- Respect reduced motion; maintain sensible keyboard focus after a row exits.
- Offline editing and persistent offline storage are outside v1. Do not enable
  persistent Firestore cache as an accidental offline promise. Transactions
  require connectivity; SDK snapshots may still show cached data, which must not
  be represented as proof of a fresh server connection.
- Expose connectivity/pending/error states accurately; network loss must not
  leave an item hidden as though an unconfirmed write succeeded.

## UX and visual direction

Use Subaru's clean token-based styling with a simpler mobile layout. Provide two
primary tabs, Catalog and Grocery List, and a secondary management entry point.
Use large touch targets, clear section headings, explicit catalog edit controls
and Grocery List removal controls, visible focus, semantic tabs/checkboxes, and
non-color completion indicators.

Selecting a catalog row uses a short fade/slide and height-collapse transition.
Keep the catalog item editor separate from the selection target and Grocery List
quantity controls separate from the check target. Do not show a catalog editor
or catalog-detail edit action on Grocery List.
Screen-reader announcements and focus behavior must work without animation.
Validate on a phone viewport and desktop; refine branding after the core flow works.

## Implementation todos

1. Scaffold the new workspace, tooling, theme, tab shell, and test infrastructure.
2. Define schemas, Firestore model, Firebase setup, auth gate, and access rules.
3. Implement real-time data hooks and transactional shopping/catalog services.
4. Build catalog search, add/edit forms, and animated selection with Undo.
5. Build ordered Grocery List, quantity editing, completion, removal, and reset.
6. Build section/item management, drag ordering, and accessible move controls.
7. Validate integrated behavior, access rules, concurrency, and responsive UX.
8. Document local setup and prepare the separate production provisioning steps.

Dependencies: scaffolding precedes Firebase integration; Firebase/model setup
precedes services; services precede the three feature workstreams; integrated
validation follows all feature work; production setup documentation follows
validated behavior.

## Verification and acceptance

- Unit tests: deterministic section/item sorting, search, selected-item filtering,
  quantity validation, and active-list updates.
- Component tests: selecting removes a catalog row and adds the list row; Add Item
  stays catalog-only; catalog details are editable only through Catalog/management,
  including selected items; Grocery List has no catalog edit action; x1 is hidden;
  multiples display;
  completion preserves ordering; Remove restores catalog visibility; confirmed
  reset restores all items; canceled reset changes nothing.
- Setup/grouping tests: an empty household can create its first section and item;
  new entries append; both tabs and search follow custom route order rather than
  alphabetical order; empty visible groups are hidden outside management.
- Failure tests: failed selection restores the row, concurrent duplicate selection
  adds once, live updates reconcile with a local animation, and connectivity loss
  does not look like a successful save.
- Auth/Firestore emulator tests: signed-out and unrelated accounts denied; both
  approved members allowed; membership edits and invalid writes denied.
- Emulator integration: simultaneous edits preserve unrelated entries; reset
  conflicts/retries produce a coherent shared state; both sessions converge.
- Accessibility checks: keyboard tabs and forms, focus after animated removal,
  screen-reader announcements, reduced motion, and drag alternatives.
- Run targeted tests during implementation, then lint, format check, TypeScript/
  production build, unit/component tests, and emulator rules/integration tests.
- Verify local app readiness and the full Choose -> Grocery List -> New List flow.
  Production verification waits for separately authorized provisioning/deployment.

## Remaining setup inputs and boundaries

- Actual store sections and starter groceries are not blocking inputs. Enter them
  through management after the app is available, starting with one section and
  a few items if desired. Use clearly labeled fictional fixture data only for
  tests/local development, not invented store facts or automatic production seeds.
- Firebase project selection, account provisioning, and deployment need separate
  explicit authorization. Do not inspect production data to implement the app.
- Do not commit, push, or deploy without approval for each specific action.
- Before any approved commit, verify repo-local identity and signing config.
- This plan does not modify Subaru or enable its Smartcar/vehicle features.
