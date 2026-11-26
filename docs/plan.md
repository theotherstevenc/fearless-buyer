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
No reference repository files were changed. Approved, signed local commits
exist on `main` (see Commit handoff). No remote, pushes, production Firebase
resources, or deployments have been created.

## Implementation progress

### Jump in next time (updated 2026-11-24)

**Starting state:** the user considers the app v1-ready. Local app/emulators are
stopped and data was exported cleanly. Latest signed local commits (2026-11-24):
`199fe6a chore: add opt-in LAN dev mode for device testing`,
`70cc15c feat: apply warm grocer theme and polish management UI`, and
`77d7490 chore: persist local emulator data across restarts`. The safe seed has
seven sections and 69 items. `docs/list.md` is untracked and must remain
untouched unless requested. Any further commit or push needs separate approval.

**Local data now persists automatically.** `npm run dev` and `npm run emulators`
import from and export on exit to `.firebase/emulator-data/` (Git-ignored). It
was seeded from `.firebase/session-handoff-2026-11-23-2216/`, which is kept as a
fallback. Start everything in one terminal from the repository root:

```bash
source "$HOME/.nvm/nvm.sh"
nvm use
npm exec --yes --package=npm@11.19.0 -- npm run dev
```

App: http://127.0.0.1:5173. Emulator UI: http://127.0.0.1:4000.
Use the existing local credentials (`buyer1@example.test`, `buyer2@example.test`);
passwords were regenerated on 2026-11-24 and are not recorded here. If lost,
reset them with the Admin SDK against the running Auth emulator or via the
Emulator UI.
Stop with **one** Ctrl-C and wait for "Export complete"; a second Ctrl-C forces
exit and skips the export. A crash or force-kill also loses changes since the
last start. `npm run emulators` plus `npm run dev:client` in two terminals still
works the same way. **Do not run `setup:local`** while the persisted household
exists. To restore an older snapshot, stop the emulators and replace
`.firebase/emulator-data/` with a copy of that snapshot directory.

**Testing on a real phone (opt-in):** `npm run dev:lan` uses `firebase.lan.json`
to bind the Auth/Firestore emulators and Vite to `0.0.0.0`, sharing the same
persisted data. The Emulator UI and hub stay on `127.0.0.1`. Open
`http://<Mac LAN IP>:5173` on a phone on the same Wi-Fi; the client connects to
the emulators at the page's hostname. Use it only on a trusted home network:
the emulators have no access control, so anyone on the network can read or wipe
local data. The macOS firewall currently permits the nvm Node 24 and Homebrew
OpenJDK 21 binaries.

Restore verified 2026-11-24: both accounts and household membership, sections
"1"–"7" in order with counts 14/7/15/17/7/3/6, contiguous item `sortOrder`,
matching `itemCount`/`lastItemId`, and section/item names and order identical to
`data/catalogSeed.json`. The current list was empty and the ordering revision
was 46.

Persistence change (2026-11-24): `dev` now uses `firebase emulators:exec` with the
client as its script instead of `concurrently`, which was removed. concurrently's
tree-kill signalled the Firestore Java process and sent Firebase a second
signal, so exports were skipped. Verified with a temporary marker document (since
deleted) that data survives restarts after `npm run emulators` + SIGINT,
`npm run dev` + Ctrl-C, and `npm run dev` when the client exits first.
`test:rules` still uses fresh, non-persisted emulators.

UI and theme changes (2026-11-24, from the user's manual review):

- Trader Joe's–inspired warm grocer palette for light and dark modes (red
  primary/header, parchment background, cream surfaces, brown text) plus
  matching `theme-color` meta tags. All text pairs were checked against WCAG AA
  4.5:1 and control borders against 3:1. Light-mode `control-border` is now
  darker than `border`. Danger is maroon/salmon and close in hue to primary; the
  user accepted this for now.
- Catalog/Grocery List tab buttons gained horizontal padding.
- Management rows: below a 21rem list width (container query on `.manage-rows`),
  actions move to a full-width soft-background band; hover there is
  `bg-surface/50`.
- Modals use a 2px border. A fixed header with a separately scrolling body was
  tried and rejected because it used too much screen space.
- The store manager modal no longer shows a description; reordering guidance
  remains in the controls' accessible labels.

Next priorities:

1. Done: restored household verified and automatic local persistence configured.
2. The user reviewed small-screen layout, then tested on a real iPhone via
   `npm run dev:lan` and reported it fine (2026-11-24). Not individually
   confirmed: two-person sync, offline errors, long-press/keyboard reordering,
   live dark-mode switching, and VoiceOver. Browser automation remains removed
   by user request.
3. Assessed 2026-11-25 (uncommitted: `client/vite.config.ts`, `package-lock.json`).
   - Bundle: a production build without `VITE_FIREBASE_*` env hits the config
     `throw` in `lib/firebase.ts`, so the app is tree-shaken away and sizes are
     misleading. With placeholder env the single chunk was 1,005 kB (306 kB gzip).
     Firestore is ~490 kB of that and must stay the full SDK (`onSnapshot`).
     Vite now splits `firestore`, `firebase`, `react`, and `vendor` chunks; the
     app chunk is ~29 kB, every chunk is under 500 kB, and the warning is gone.
     Total download is unchanged; vendor chunks stay cached across app deploys.
   - Advisories: `npm audit --omit=dev` reports 0. `npm audit fix` (non-breaking)
     updated `re2` 1.24.1 → 1.27.2 (via `firebase-tools` → `superstatic`); the
     Hosting emulator was smoke-tested. The remaining 13 moderate advisories are
     dev-only, inside `firebase-tools`/`firebase-admin` (glob, minimatch, uuid,
     `@opentelemetry/core`); npm's `--force` fix downgrades `firebase-tools` to
     13.x, so they are accepted until upstream releases fixes.
4. Write the setup README. Add explicit seed import/migration tooling when
   requested; the committed seed is not automatically loaded or deployed.

Latest full application validation passed: ESLint, Prettier, TypeScript/build,
37 client tests, and 20 emulator tests. The seed separately passed strict schema,
count/order, and live-catalog comparison checks. While emulators are already
running, use `./node_modules/.bin/vitest run --config vitest.emulator.config.ts`
for rules tests; do not start a second emulator or target the live
household. No remote, push, production provisioning, or deployment is authorized.

### End-of-day catalog seed checkpoint (2026-11-23, 22:16)

- User authorized committing the catalog as a safe seed file:
  `data/catalogSeed.json`. It contains version 1, seven named sections, and
  69 ordered item names. Strict schema validation and comparison against the live
  catalog verified every name and ordering. It contains no Auth accounts,
  passwords, Firebase/household IDs, timestamps, or current-list selections.
- Section order is the `sections` array order; item order is each section's
  `items` array order. The seed is not automatically imported by `setup:local`
  and is not bundled into the app. A future explicit local/production import can
  use it without copying emulator credentials or overwriting household membership.
- Committed as `7eceb76 chore: version household catalog seed`; the seed and
  handoff were its only files, and the signature was verified. The preceding UX commit in current Git
  history is `56da4c6`. Repo-local identity/signing was verified; global config
  was not changed. `docs/list.md` stays untracked and untouched. No push,
  production provisioning, or deployment is authorized.
- Final local Auth/Firestore snapshot:
  `.firebase/session-handoff-2026-11-23-2216/` (Git-ignored). Verified both Auth
  accounts, Firestore export metadata/files, and all 69 seed item names in the
  exported data before shutdown. Older snapshots are preserved.
- App and emulators are stopped; their listener ports were checked. Next session:
  restore this latest snapshot with
  `npm run emulators -- --import=.firebase/session-handoff-2026-11-23-2216`,
  then run `npm run dev:client` under the pinned runtime/npm. Do not run
  `setup:local` for a successfully restored household. Restoration of this final
  snapshot remains to be checked.
- Application code is unchanged by the seed commit. Last full code checks passed:
  lint, formatting, production build, 37 client tests, and 20 emulator tests.
  Seed validation/formatting is verified separately. Automatic emulator
  persistence, seed import/migration tooling, README, dependency/bundle assessment,
  and full two-person/phone/accessibility verification remain unfinished.

### Earlier local data snapshot (2026-11-23, 22:12)

- Added 55 items in a single local transaction: section "2" has 7, "3" has 15,
  "4" has 17 (both supplied lists combined in order), "5" has 7, "6" has 3,
  and "7" has 6. No existing names needed skipping. Verified item records,
  within-section order, and section counts. Section "1" and the current shopping
  list were unchanged; the catalog now contains 69 items.
- Exported Auth/Firestore to the ignored
  `.firebase/catalog-import-2026-11-23-2212/` snapshot. This was the latest local
  snapshot at that checkpoint; older exports are preserved. Resume with
  `npm run emulators -- --import=.firebase/catalog-import-2026-11-23-2212`
  and `npm run dev:client` under the pinned runtime/npm.
- App/emulators remain running. Export again before shutdown if data changes;
  automatic persistence is still not configured. No application code or
  production data changed. `docs/list.md` remains untouched; these handoff
  updates are uncommitted and no additional commit/push/deployment is authorized.

### Earlier section 1 snapshot (2026-11-23, 22:06)

- Added the user's 14 items to existing section "1" in the supplied order in a
  single local Firestore transaction. Verified item records, section count, and
  ordering; the current shopping list was unchanged. No application code or
  production data was changed.
- Exported Auth/Firestore to the ignored
  `.firebase/catalog-import-2026-11-23-2206/` snapshot. This is newer than the
  earlier session-handoff snapshot and includes the user's current sections and
  catalog. Resume with
  `npm run emulators -- --import=.firebase/catalog-import-2026-11-23-2206`
  and `npm run dev:client` under the pinned runtime/npm. Do not run `setup:local`
  for a successfully restored household.
- App and emulators remain running. Automatic persistence is still not enabled;
  export again before shutdown if data changes after this snapshot. The previous
  snapshot is preserved. `docs/list.md` remains untouched; this handoff update is
  uncommitted and no additional commit/push/deployment is authorized.

### Commit checkpoint (2026-11-23 evening)

- User authorized one local commit for the accumulated UX changes:
  `feat: refine shopping UI and add system dark mode`. Scope includes management
  improvements, item/dialog copy, confirmation/focus handling, system-only dark
  mode, locally served Kalam header typography, narrow-phone header layout,
  regression tests, dependency lockfile, and this handoff. `docs/list.md` and
  ignored local emulator data are excluded. No push or deployment is authorized.
- Final pre-commit validation: ESLint, full Prettier check, TypeScript/production
  build, all 37 client tests, and all 20 isolated emulator tests pass. The existing
  large-chunk warning remains (813.80 kB JS, 247.26 kB gzip). Latest desktop UX
  feedback was positive; physical-phone, VoiceOver, and full two-person checks
  remain manual and incomplete.
- Repo-local author identity and GPG signing configuration match the previous
  verified signed commit. Global Git configuration was not changed. The preceding
  management commit in current Git history is `ccf8e2b`; earlier handoffs used
  `8607afb`. Use `git log -1 --show-signature` for the new commit's identity.
- App and emulators remain running. Automatic persistence and local-to-production
  migration are not implemented; export Auth/Firestore before shutdown to retain
  newly entered data. No production resources exist. README, dependency/bundle
  assessment, persistence, and remaining manual validation are unfinished.

### Resumed session (2026-11-23 evening)

- Restored `.firebase/session-handoff-2026-11-23/` without running
  `setup:local` or changing household data. Auth emulator accounts match the
  snapshot; the household has both members, 5 sections, 3 groceries, an empty
  active list, and ordering metadata.
- App and emulators are running as detached local processes under Node 24.19.0
  and npm 11.19.0. HTTP readiness verified at http://127.0.0.1:5173 and
  http://127.0.0.1:4000. Existing local credentials are unchanged.
- Snapshot restoration is verified. Automatic persistence is still pending;
  this run imports the previous snapshot but does not export on exit.
- Next: manual management retesting and two-person/responsive/accessibility
  verification. Browser automation remains removed; no visual checks are
  claimed from HTTP or data-restoration checks.
- No commit, push, production provisioning, or deployment was performed.
  Existing uncommitted plan edits are preserved; `docs/list.md` is untouched.

### Management and shopping UX feedback pass (2026-11-23 evening)

- Continue tracking this focused UX pass here; a separate plan is unnecessary.
  The user confirmed the preceding management fixes looked good.
- Empty sections now show a deliberate bordered empty state instead of an empty
  sortable-list border. An empty store also has a first-section prompt.
- Management copy is now "Your store, your route" and "Arrange sections and
  groceries in the order you shop. Hold a name to drag, or use the arrows."
- Section name and Add/Save section controls share a row. The redundant visible
  New section label is removed while an accessible input label remains. Long
  section headings and row names truncate with an ellipsis; full names remain
  available to screen readers and in hover titles.
- Management rows use explicit matching top/bottom corner radii. Scrollbars are
  hidden without disabling scrolling. The app header can wrap on narrow screens.
- Holding a row name or drag handle for 300 ms activates mouse/touch reordering.
  Moving before activation cancels the hold so touch scrolling remains available.
  Keyboard dragging and explicit move arrows remain supported.
- Add/Edit grocery dialogs no longer show the redundant heading or catalog
  explanation. Dialogs retain accessible names. Grocery and section name fields
  use `autocomplete="off"` and `data-1p-ignore`; these request suppression from
  1Password, but extension behavior still needs manual verification. Login
  credential autofill remains enabled.
- The all-selected catalog message is "You're all set. Happy shopping!" with
  no "Open Grocery List" instruction.
- Sign out is now a labeled footer button rather than an ambiguous header icon,
  with a confirmation and an in-dialog retryable error. New list is a filled
  button with a reset icon in a matching footer panel; reset still confirms.
- Empty-section deletion now requires confirmation, supports cancellation,
  surfaces failure in the dialog, and clears an active rename after success.
  Populated sections remain protected from deletion.
- Regression coverage includes empty sections, confirmed section deletion and
  failed-delete recovery, actual held-mouse reordering, held-touch activation
  and scroll cancellation, keyboard activation/cancellation, sign-out
  confirmation/cancellation, and failed-sign-out recovery.
- Verified after this pass: ESLint, full Prettier check, TypeScript/production
  build, all 33 client tests, and all 20 isolated emulator rules/service tests
  pass. Rules tests ran against `demo-fearless-buyer-tests` on the existing
  emulator, not a second emulator process or the live household.
- App and Emulator UI still return HTTP 200. Latest visual/phone/VoiceOver checks
  remain manual; no browser automation was added. The existing large-chunk
  warning remains (813.80 kB JS, 247.26 kB gzip). Dependency assessment, bundle-size
  work, README, and automatic emulator persistence remain separate unfinished
  plan items. No commit was authorized at that checkpoint.

### Item wording and dialog separation follow-up (2026-11-23 evening)

- User confirmed the UX pass is looking good. Add/edit/save/delete/choose actions
  and related item copy now use the more casual "item"/"items" rather than
  "grocery"/"groceries". The Grocery List tab name, storage model, and internal
  service/component names are unchanged.
- Initially removed the Add/Edit item header row and X. At the user's subsequent
  request, restored the visible "Add item"/"Edit item" header and X close button.
  The redundant catalog explanation stays removed. Cancel and Escape still
  dismiss the form without saving.
- User then approved "What else sounds good?" for the add-item dialog heading.
  The edit heading remains "Edit item"; action labels remain Add item/Save item.
  All 10 targeted editor/management tests and targeted lint/format checks pass
  after this copy update.
- Dialogs have a darker, lightly blurred backdrop, a border, and a stronger
  shadow. Overlays and contents share a stacking level so a later nested dialog's
  overlay also dims the management dialog underneath it, not just the app behind
  management.
- Dialogs restore focus to their opener on close. Regression checks cover
  Cancel/Escape without an X and Escape returning from the item editor to the
  management Add item control.
- Verified: ESLint, full Prettier check, TypeScript/production build, 35 client
  tests, and 20 isolated emulator tests pass. The live app returns HTTP 200 and
  serves the updated editor. Visual backdrop/phone checks remain manual; the
  existing large-chunk warning remains. No commit, push, or deployment.
- After restoring the header/X: all 10 targeted editor/management tests,
  targeted ESLint/Prettier checks, and TypeScript/production build pass.
  Regression checks now cover X, Cancel, Escape, and the visible item heading.

### System dark mode (2026-11-23 evening)

- Added system-only dark mode using `prefers-color-scheme: dark`. No appearance
  picker, saved preference, or additional JavaScript; the OS/browser preference
  controls the theme and changes take effect automatically.
- Shared dark color tokens cover the page, login, catalog/list, management,
  dialogs, errors, completion states, and focus outlines. Separate foreground
  tokens keep filled buttons/checkboxes readable; dialog backdrops remain dark
  rather than becoming pale when the foreground text switches to light.
- Light colors remain unchanged. Dark-mode form/checkbox borders have stronger
  contrast than decorative row separators. Native controls use the matching
  `color-scheme`, and browser theme-color metadata follows the system setting.
- Verified: ESLint, full Prettier check, TypeScript/production build, and all 36
  client tests pass. All 14 checked text/color pairs in each palette meet the
  4.5:1 WCAG AA text threshold (minimum 4.91:1 light, 6.41:1 dark). These palette
  checks are not a complete accessibility audit; visual system-theme switching
  and phone/VoiceOver checks remain manual. Existing bundle warning remains.
- No dependencies, commits, pushes, production resources, or deployments added.

### Header font trial (2026-11-23 evening)

- User approved trying Kalam Bold for "Fearless Buyer" and Kalam Regular for
  "Your weekly haul, in order." Only the signed-in app header's text uses Kalam;
  login, tabs, forms, dialogs, and other content keep Geist.
- Added `@fontsource/kalam` to client dependencies and the workspace lockfile
  using the pinned npm. Regular/Bold Latin subsets are bundled and served locally,
  with font-display swap and Geist/sans-serif fallbacks. No Google Fonts CDN
  request or global tooling installation is needed.
- Verified: full ESLint/Prettier checks, TypeScript/production build, and both
  targeted app tests pass. Build includes both Kalam weights, and their local
  CSS endpoints return HTTP 200. Lockfile changes are limited to the added font.
  Visual font sizing/phone checks remain manual; the existing bundle warning
  remains. No commit, push, or deployment.
- User reported the old font was still visible. Found that Vite's normal CSS
  module retained the old transform after the Kalam import failed before the
  package finished installing; the built CSS already contained Kalam. Restarted
  only the client server, leaving emulators/household data untouched.
- After restart, verified the actual live `/src/index.css` module includes both
  Kalam weights, the display-font token, and the header's font-family rule.
  Both font URLs referenced by that stylesheet return complete HTTP 200
  downloads; Emulator UI also remains available. A page refresh loads the
  corrected stylesheet.
- Increased the signed-in header title from 20px to 30px and its tagline from
  14px to 18px at the user's request. Header wrapping remains enabled for narrow
  screens. Both app tests, targeted lint/format checks, and production build
  pass after resizing.
- Added a narrow-phone adjustment targeting the iPhone 13 mini's 375px portrait
  viewport: below 390px, the title is 24px and tagline 16px; at 390px and above,
  they retain 30px/18px. The basket icon does not shrink, and header actions can
  wrap without being hidden. Both app tests, targeted lint/format checks, and
  production build pass. Physical-device visual verification remains manual.
- Subsequent feedback approved removing the basket logo from the signed-in
  header and hiding its Add item shortcut below 390px. The title/tagline group
  and management control now stay in one header row, replacing the earlier
  action-wrapping approach. Larger screens retain the Add item shortcut.
- Add item remains available through management on small screens. All three
  app tests (including this alternative add flow), targeted lint/format checks,
  and production build pass. Physical-device layout verification remains manual.

### Previous stopping point (2026-11-23)

- Committed and signature verified: `ccf8e2b fix: improve store management usability`.
  Six local commits are on `main`; no remote, push, or deployment exists.
- Latest checks pass: ESLint, Prettier, TypeScript/production build, 25 client
  tests, and 20 emulator rules/service/concurrency tests. The existing
  large-chunk build warning and 14 moderate dependency advisories remain open.
- Dev server and emulators are stopped. Auth and Firestore were exported to
  `.firebase/session-handoff-2026-11-23/` (ignored by Git); export files were
  verified, but restoration and automatic persistence are not yet validated.
- Next session: restore the snapshot, visually recheck the management fixes,
  continue UX refinement, and finish the two-person/responsive/accessibility
  checks. Then assess dependencies/bundle size and write the setup README.
- `docs/list.md` remains untracked and untouched. This post-commit plan update
  is intentionally uncommitted; another commit, push, or deployment requires
  separate approval.

| Workstream                        | Status                                       | Remaining before completion                                                                                                                                                                        |
| --------------------------------- | -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Workspace and runtime             | Complete                                     | Node 24.19.0, npm 11.19.0 configuration, dependencies, and initial tooling verified                                                                                                                |
| Firebase model and authentication | In progress: emulator rules tests pass       | Finish browser login/access verification and revalidate final implementation                                                                                                                       |
| Shared data services              | In progress: emulator concurrency tests pass | Manual browser verification of actual services and failure paths remains                                                                                                                           |
| Catalog selection                 | In progress: written                         | Verify full selection animation and failed-save recovery in a browser                                                                                                                              |
| Grocery List                      | In progress: written                         | Verify shared check/remove/reset flow in a browser                                                                                                                                                 |
| Store management                  | In progress: fixes and regression tests pass | Visually recheck borders, Add/Delete controls, and reorder flicker; refine UX and verify drag/keyboard ordering, section moves, and concurrent edits                                               |
| Integrated validation             | In progress                                  | Lint, build, 25 client tests, and 20 emulator tests pass after management fixes; Playwright removed; browser retesting, responsive/accessibility checks, and dependency advisory assessment remain |
| Setup documentation               | Pending                                      | Local setup guide and separately authorized production provisioning instructions                                                                                                                   |

- Git initialized at the user's request with an empty `main` branch.
  `.gitignore` excludes dependencies, build output, TypeScript build metadata,
  local environment/secrets, emulator state, logs, and test artifacts while
  retaining `.env.example` and explicitly retaining `.nvmrc` despite a global
  ignore rule. `.gitattributes` normalizes source/config text line endings.
  Six local commits exist on `main` (see Commit handoff).
  No remote is configured and nothing has been pushed.
- Scaffold, authentication components, catalog/list screens, store management,
  Firestore services/rules, and tests are written. All 20 current emulator
  access/rules/concurrency tests pass after fixes; full end-to-end behavior is not
  verified. Emulator tests cover the shared update helper and actual selection/
  deletion services, including deletion races; they do not replace browser checks.
- Matched Subaru's runtime configuration: `.nvmrc` is `24.19.0`, package engines
  are `24.x`, and packageManager is `npm@11.19.0`. Installed Node through existing
  nvm; no project-local Node dependency and no global CLI installs.
- Node 24.19.0 bundles npm 11.17.0 here. Use
  `npm exec --yes --package=npm@11.19.0 -- npm <command>` after `nvm use` to run the
  pinned npm without changing global packages.
- Refreshed the workspace lockfile using npm 11.19.0 and aligned the root Vite
  dependency with the client to resolve a build-time duplicate-version conflict.
- Latest verification under Node 24.19.0: TypeScript/production build, ESLint,
  formatting, and all 25 client tests passed. Build reports a large-chunk warning
  (813.67 kB JS, 247.18 kB gzip).
- Installation reports 14 moderate dependency advisories; these still need
  assessment. Existing user npm configuration produces legacy always-auth
  warnings; the user's configuration was not modified.
- Formatting: `npm run format` (project-local Prettier) rewrote 24 files before
  the commits; `npm run format:check`, `npm run lint`, and `npm test` (19 unit
  tests) passed afterward under Node 24.19.0. TypeScript/production build and
  emulator rules tests were rerun after formatting (2026-11-23): `npm run build`
  passed (same large-chunk warning) and `npm run test:rules` passed 14/14.
- Remaining: snapshot restoration, management UX refinement and visual retesting,
  manual two-person browser and responsive/accessibility verification; local setup
  documentation; automatic emulator persistence; final validation. Do not equate
  passing tests with a verified working shared app.

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
- The two-person browser workflow must be verified manually, not by automation;
  this verification is still incomplete.
- Do not assume a dev server or persistent local household is currently running.
- Resumed 2026-11-23: restarted `npm run dev` as a detached local process and
  verified HTTP readiness at http://127.0.0.1:5173 and
  http://127.0.0.1:4000, plus Auth emulator readiness and the Firestore listener.
  `npm run setup:local` created a fresh empty household and two local accounts;
  generated passwords remain in terminal output only. At the user's stopping
  point, Auth and Firestore were exported successfully to the ignored local
  `.firebase/session-handoff-2026-11-23/` directory, then the dev server and
  emulators were stopped. Automatic persistence is still not configured.
  To resume this snapshot, start `npm run emulators -- --import=.firebase/session-handoff-2026-11-23`
  and `npm run dev:client` in separate terminals under the pinned runtime/npm.
  Export metadata was verified; restoration has not yet been tested. Browser
  verification remains pending.

### Management feedback and fixes (2026-11-23)

- Manual feedback identified disconnected rounded borders, no grocery deletion,
  an indistinct Add grocery action, and flicker during reordering. The user also
  described the management page as unintuitive; broader UX refinement remains
  pending rather than being treated as resolved by these targeted changes.
- Rounded first/last management rows now match their container. Row actions wrap
  on narrow screens instead of crowding the grocery name. Add grocery is a filled
  button with a plus icon.
- Reorders immediately retain the requested row order while saving, restore shared
  order on failure, and accept subsequent shared changes. Brief saves no longer
  dim every control; permanently unavailable moves remain visibly disabled.
- Catalog deletion is now included in v1 at the user's request. Management offers
  a Delete control and confirmation; the transaction deletes the catalog item,
  removes its active-list field, decrements its section count, and advances the
  ordering revision. Rules require coordinated count/list cleanup. Removal is
  written even for an initially unselected item to handle concurrent selection.
- Verified: lint, formatting, TypeScript/production build, 25 client tests, and 20 emulator
  rules/service/concurrency tests pass. The large-chunk build warning remains.
  Rules tests now use `demo-fearless-buyer-tests`, isolated from the live local
  household. With `npm run dev` already running, the rules suite was invoked using
  `npm exec -- vitest run --config vitest.emulator.config.ts` (under the pinned
  runtime/npm), not a second emulator process. The live household was preserved.
- Before shutdown, the dev server hot-reloaded these changes and the emulator confirmed
  the rules update. Visual border/layout and drag-flicker retesting, plus the full
  two-person workflow, remain manual checks. The user approved committing this
  session's changes at the stopping point. No push or deployment is authorized.

### Rules and concurrency fixes made during pre-commit validation

- Firestore Rules Sets do not support the attempted `toList()` operation.
  Replaced it with a write-supplied `changedItemId` checked against the actual map
  diff; rules still validate the changed entry and reject unrelated entry changes.
- Full-map transaction writes could fail authorization during concurrent edits.
  Individual list operations now update only their item's field via `FieldPath`
  and set `changedItemId`. Reset remains an atomic empty-list replacement.
- Sections maintain an item count with catalog moves/creation in the same
  transaction, preventing removal of a populated section.
- Initial `npm run test:rules`/rules phase of `npm run validate`: 14 passed,
  including household isolation, invalid-write rejection, section integrity,
  concurrent edits, idempotent selection, listener synchronization, and reset.
  The latest isolated emulator suite passes 20 tests, including the added
  catalog-deletion access, integrity, actual-service, and concurrency cases.

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
  - `84355fe chore: remove Playwright browser tests`.
  - `e4be001 feat: simplify catalog and grocery list UI` — smoother selection exit,
    the UI simplifications below, the `setupLocal` TTY fix, and this plan.
  - `ccf8e2b fix: improve store management usability` — rounded borders, an explicit Add
    grocery button, optimistic reorder presentation with failure recovery,
    confirmed transactional catalog deletion, focused UI/emulator regressions,
    and this session handoff. Authorized by the user at the stopping point.
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

1. Done: lint, formatting, TypeScript/production build, 25 client tests, and
   20 emulator tests pass. The management fixes are committed as `ccf8e2b`.
2. Done: browser automation removed (see Browser testing). Next, manually
   verify the two-person workflow on two signed-in sessions against the local
   emulators: selection animation, check/remove/reset sync,
   failure states, responsive layout, and accessible ordering.
   Session of 2026-11-23: `npm run dev` was started (app at
   http://127.0.0.1:5173, Emulator UI at http://127.0.0.1:4000) and
   `npm run setup:local` created the empty household and two local accounts
   (`buyer1@example.test`, `buyer2@example.test`; passwords printed by the
   script only). The initial session had no export; the latest stopping point
   saved Auth/Firestore to `.firebase/session-handoff-2026-11-23/` before stopping
   the server. Automatic persistence remains pending. Fixed:
   `scripts/setupLocal.ts` only waits for Enter in an
   interactive terminal, so non-interactive runs no longer report a false
   "Local setup failed" after successful setup.
   User feedback: selection exit was too fast and the page redraw jumpy.
   Fixed: 450 ms two-phase exit (slide/fade, then grid-row
   height collapse), several rows can exit at once and only the write blocks
   other operations, controls no longer dim during brief saves, and the status
   line reserves its height. Reduced motion skips the animation and wait.
   Then set to 450 ms at the user's request.
   UI tweaks (user request): removed the "Synced with your
   household" and "Saving..." status text (the status line now shows only
   Offline/Connecting warnings and takes no space otherwise), removed the
   Catalog "Choose your groceries" heading and subtitle, moved Add item to a
   44x44 "+" icon button beside the search field,
   and removed both Undo and the "... added to Grocery List." notice; the exit
   animation is the only selection feedback. Also dropped the "Item returned to
   catalog." notice, aligned the search focus ring with the rounded field, and
   removed section headings from Catalog and Grocery List (one flat list each,
   still in store order). Removed catalog search for now (the filter remains in
   `groupGroceries` so it can return); Add item moved to a "+" header button,
   and focus moves to the next catalog row after a selection. Grocery List
   dropped its heading; progress and New list moved to a footer below the items.
   Quantity controls were removed from the UI and deferred to v2 after trying a
   modal, an inline stepper, and a tap-to-open chip; all felt clunky.
   Next: restore the saved snapshot using
   `npm run emulators -- --import=.firebase/session-handoff-2026-11-23` and run
   `npm run dev:client` separately. Verify restoration before changing data;
   `setup:local` is unnecessary for a successfully restored household.
   Recheck the management borders, Add/Delete controls, and reorder behavior,
   then finish the two-person check (sync, reset, ordering, phone layout, offline)
   and broader UX refinement.
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
  and Grocery List share the same section/item order; search (currently removed) preserved this order.
- New sections append to the route; new items append within their chosen section.
  Users refine both orders with management-mode dragging or move controls.
- Catalog and Grocery List show no section headings: each is one flat list
  ordered by section, then item. Management shows all sections (including
  empty ones) with headings so they remain editable.
- Store layout and groceries can be entered incrementally and revised later without
  changing permanent section/item IDs. No retailer product feed or aisle lookup is
  needed in v1.

### Catalog tab

- Show reusable items that are not currently selected, in store order (no section headings).
- Support Add Item (a "+" button in the app header) and an explicit Edit
  action. Search is removed for now and may return.
- Selecting an item adds it with quantity 1 and incomplete status, then animates
  it out of the catalog. Stay on this tab so successive selections are easy.
- Update the Grocery List tab count and announce the addition accessibly.
- Add Item saves to the reusable catalog only; it does not select the new item.
- Require a name and section. New items append within their chosen section.
- Do not delete an item from storage merely because it disappears from this tab.

### Grocery List tab

- Show selected items in custom section and item order.
- Keep one row per catalog item; repeated rows are explicitly out of scope.
- No quantity UI in v1 (deferred to v2). The data model still stores
  `quantity: 1` per entry so a v2 control needs no schema or rules change.
  Tried and rejected: a modal, an always-visible stepper, a tap-to-open chip.
- Checking an item dims it and shows a checked state without changing position.
  Unchecking restores its incomplete appearance.
- Completion is distinct from removal. A separate Remove action returns the item
  to its ordered position in the catalog.
- Do not offer catalog-detail editing on this tab. Only completion and removal
  controls belong here; completion applies to this trip.
- Edit names, sections, and order through Catalog or its management view only.
- Intentional catalog reordering may change list order; checking never does.
- No tab heading: the list starts under the tabs, like Catalog. A footer below
  the items shows "N of M in cart" and the New list action.

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
- Catalog groceries can be deleted from management after confirmation. Delete
  permanently removes the grocery from the catalog and current list for both
  members, preserving other groceries and keeping the section count consistent.
- Multi-store support, prices, brands, substitutions, imports,
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
  StoreManager, login, and confirmation dialogs.
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
- Catalog deletion requires an atomic section-count decrement and no remaining
  active-list entry for the deleted item.
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
- Show offline/connecting states; per user request there is no visible
  saving/saved text (selection feedback is the exit animation only).
  On rejection/failure, restore a usable
  catalog row, preserve user input where relevant, and show a specific retry path.
- No Undo for selection (removed at the user's request); Remove on Grocery
  List returns an item to the catalog.
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
Use large touch targets, section headings only in management, explicit catalog edit controls
and Grocery List removal controls, visible focus, semantic tabs/checkboxes, and
non-color completion indicators.

Selecting a catalog row uses a short fade/slide and height-collapse transition.
Keep the catalog item editor separate from the selection target and Grocery List
removal separate from the check target. Do not show a catalog editor
or catalog-detail edit action on Grocery List.
Screen-reader announcements and focus behavior must work without animation.
Validate on a phone viewport and desktop; refine branding after the core flow works.

## Implementation todos

1. Scaffold the new workspace, tooling, theme, tab shell, and test infrastructure.
2. Define schemas, Firestore model, Firebase setup, auth gate, and access rules.
3. Implement real-time data hooks and transactional shopping/catalog services.
4. Build catalog search, add/edit forms, and animated selection.
5. Build ordered Grocery List, completion, removal, and reset (quantity UI
   deferred to v2).
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
