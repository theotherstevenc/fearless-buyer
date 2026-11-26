# Fearless Buyer

A small, shared grocery list for a two-person household. Keep a catalog of the things you usually buy, arranged in the order you walk through your store. Pick what you need, then shop down a list that's already sorted for the trip.

Changes sync in real time, so you can both add to the list from home and check things off in the aisles without stepping on each other.

## What it does

- **Catalog:** your reusable groceries, in store order. Select an item to add it to the list. Use **+** in the header to add something new.
- **Grocery List:** what you've picked for this trip, in the same order. Check items off as they go in the cart, or remove anything you no longer need. When you're done, **New list** clears the trip and leaves your catalog as it was.
- **Store management:** create sections that match your store's layout, then drag items and sections into place. Arrow buttons offer a keyboard-friendly alternative to dragging.
- **Two members, one household:** both accounts can shop and edit. Firestore security rules keep everyone else out.

## Built with

React 19, TypeScript (strict), Vite, Tailwind CSS v4, Radix UI, dnd-kit, Zod, Firebase Authentication, and Cloud Firestore, served by Firebase Hosting. There is no custom backend.

## Before you start

You'll need:

- **Node.js 24.19.0** (pinned in `.nvmrc`). [nvm](https://github.com/nvm-sh/nvm) makes this easy.
- **npm 11.19.0** (pinned in `package.json`). The commands below run it through `npm exec`, so you don't have to change your global npm.
- **Java 21 or newer**, which the Firestore emulator requires. For example, Homebrew's `openjdk@21`.

All tooling, including the Firebase CLI, is installed locally as a project dependency. Nothing needs to be installed globally.

## Getting set up

From the repository root:

```bash
source "$HOME/.nvm/nvm.sh"
nvm use
npm exec --yes --package=npm@11.19.0 -- npm install
```

### Create a local household (first time only)

The app runs against local Firebase emulators, so no real Firebase project is involved. In one terminal, start the emulators:

```bash
npm run emulators
```

In a second terminal, create two local accounts and an empty household:

```bash
npm run setup:local
```

The script prints two sign-in emails (`buyer1@example.test` and `buyer2@example.test`) with freshly generated passwords. Those passwords aren't saved anywhere, so jot them down before pressing Enter. If you lose them, you can reset them in the Emulator UI at http://127.0.0.1:4000.

Once a household exists, running `setup:local` again leaves it alone. You don't need to run it after this first time.

Stop the emulators with a single Ctrl-C (see below) so your new household is saved.

## Day-to-day development

Start the emulators and the app together:

```bash
npm run dev
```

- App: http://127.0.0.1:5173
- Emulator UI: http://127.0.0.1:4000

If you'd rather run them separately, use `npm run emulators` and `npm run dev:client` in two terminals.

### Your local data is kept between runs

Local data lives in `.firebase/emulator-data/`, which Git ignores. It's imported when the emulators start and exported when they shut down.

> **Please press Ctrl-C only once** and wait for "Export complete". A second Ctrl-C, a crash, or a force-quit skips the export, and anything changed during that session is lost.

To go back to an older snapshot, stop the emulators and replace `.firebase/emulator-data/` with a copy of the snapshot directory.

### Trying it on your phone

```bash
npm run dev:lan
```

This makes the app and the Auth and Firestore emulators reachable on your local network, using the same saved data. On a phone connected to the same Wi-Fi, open `http://<your computer's LAN IP>:5173`. The Emulator UI stays private to your computer.

The emulators have no access control, so anyone on the network could read or erase your local data. Please only use this on a network you trust, such as your home Wi-Fi. You may also need to allow Node and Java through your firewall.

## Checking your work

| Command                | What it does                                               |
| ---------------------- | ---------------------------------------------------------- |
| `npm run lint`         | ESLint                                                     |
| `npm run format:check` | Prettier check (`npm run format` fixes formatting)         |
| `npm run build`        | Type-check and production build                            |
| `npm test`             | Client unit and component tests (Vitest)                   |
| `npm run test:rules`   | Firestore security rules tests against temporary emulators |
| `npm run validate`     | All of the above, in order                                 |

`test:rules` starts its own temporary emulators and never touches your saved data. If the emulators are already running, run the rules tests against them instead:

```bash
./node_modules/.bin/vitest run --config vitest.emulator.config.ts
```

### A note on production builds

`client/src/lib/firebase.ts` deliberately refuses to start a production build that still points at a `demo-` project or has no Firebase API key. If you build without real `VITE_FIREBASE_*` values, the app code is dropped from the output. The build looks smaller than it really is, and the resulting app can't be deployed. For a representative build, set real values in `client/.env.local` (see below).

## Project layout

```text
client/                  React app (npm workspace)
  src/components/        Screens and UI pieces (Catalog, Grocery List, store manager)
  src/context/           Authentication context
  src/hooks/             Live household data and connectivity
  src/lib/               Firebase setup and pure grocery helpers
  src/schemas/           Zod schemas for Firestore data
  src/services/          Firestore transactions for list and catalog changes
data/catalogSeed.json    A versioned starter catalog (imported only with setup:production --seed)
docs/plan.md             Design decisions and implementation history
scripts/setupLocal.ts    Creates the local accounts and household
scripts/setupProduction.ts  Creates the production household and member accounts
tests/                   Firestore security rules tests
firestore.rules          Security rules
firebase.json            Hosting and emulator configuration
firebase.lan.json        Emulator configuration for phone testing
```

## Configuration

Client settings are read from `client/.env.local`. Use `client/.env.example` as a starting point. The defaults point at the local demo project and emulators, so you don't need this file for local development.

| Variable                      | Purpose                                                      |
| ----------------------------- | ------------------------------------------------------------ |
| `VITE_FIREBASE_API_KEY`       | Firebase web API key                                         |
| `VITE_FIREBASE_AUTH_DOMAIN`   | Firebase Auth domain                                         |
| `VITE_FIREBASE_PROJECT_ID`    | Firebase project ID (local projects must start with `demo-`) |
| `VITE_FIREBASE_APP_ID`        | Firebase web app ID                                          |
| `VITE_HOUSEHOLD_ID`           | Household document ID (default `home`)                       |
| `VITE_USE_FIREBASE_EMULATORS` | Use the local emulators during development (default `true`)  |

`.env*` files other than `.env.example` are ignored by Git. Please keep real project values and credentials out of commits.

## Deploying

Fearless Buyer hasn't been deployed yet, and there is no production Firebase project. When it's time, the outline below is a starting point. Each step changes real infrastructure, so it's worth going through deliberately.

1. In the [Firebase console](https://console.firebase.google.com/), create a Firebase project and enable **Email/Password** sign-in.
2. Create a **Firestore database** in production mode, which denies all access until the rules are deployed. Its location can't be changed later, so pick one near you.
3. Register a **web app** in the project settings to get its configuration values.
4. Sign the CLI in with `./node_modules/.bin/firebase login`, and point it at the project by adding a `.firebaserc` with the project ID.
5. Deploy the security rules before any data exists:

   ```bash
   ./node_modules/.bin/firebase deploy --only firestore:rules
   ```

6. Create the two member accounts and the household with `npm run setup:production` (see [Production setup](#production-setup)).
7. Put the web app's settings in `client/.env.production.local` (Git-ignored). Vite reads it only for `npm run build`, so `npm run dev` keeps using the emulators. Avoid `client/.env.local` for real values; it also applies to `npm run dev`.
8. Build and deploy the app:

   ```bash
   npm run build
   ./node_modules/.bin/firebase deploy --only hosting
   ```

The real household starts with an empty catalog unless you pass `--seed` to the setup script. Otherwise, add your store's sections and groceries in the app.

### Production setup

`scripts/setupProduction.ts` creates the household for a real Firebase project. It uses the Firebase Admin SDK with [Application Default Credentials](https://cloud.google.com/docs/authentication/provide-credentials-adc): run `gcloud auth application-default login` and `gcloud auth application-default set-quota-project <project-id>` first. A service account key in `GOOGLE_APPLICATION_CREDENTIALS` also works. Keep it outside the repository, and delete both the file and the key (Google Cloud console → IAM & Admin → Service accounts → Keys) after setup.

```bash
npm run setup:production -- --project <project-id> --member <email> --member <email> [--seed] [--household home]
```

The script:

- Shows what it will create and asks you to type the project ID before changing anything.
- Stops without changes if the household already exists, so it never overwrites data.
- Reuses an existing account for an email and leaves its password unchanged. Otherwise it creates the account without a password.
- Prints a one-time password-reset link for each new account so each person chooses their own password. Share each link privately; they expire and aren't saved.
- With `--seed`, imports `data/catalogSeed.json` (sections and items in their saved order) in the same atomic write as the household.
- Refuses `demo-` projects, so it can't be pointed at local data by mistake.

To rehearse safely first, `npm run rehearse:production` runs the script against fresh, throwaway emulators (stop `npm run dev` first; both use the same ports). Type `demo-fearless-buyer-rehearsal` when asked. Nothing is saved when it finishes.
