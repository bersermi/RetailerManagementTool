# `cocina/` — Wera Cocina, the fondas' app

Loads when a session touches `cocina/`. Lane **Cocina** of `docs/PLAN.md`'s Step 10: a fonda
publishes her surplus meals (*itacates*, `10.4`) and reserves shops' offers (`10.6`). A fonda is a
**workspace**, like a shop (ADR-035 §2.3); what a buyer reads goes through §2.7's one door.
The root `CLAUDE.md` holds what is not app-only; **nothing checks this file**, so it carries
commands, never counts. Its twin is `itacate/CLAUDE.md` — most rules here are in both.

**A Step 10 task reads `~/RetailerToolDev/wera-vision/CLAUDE.md` first** (the owner's private
notes) and copies nothing from it here.

## Measure, don't remember

```
npm --prefix cocina test                  # the runner's tally — identity, permissions, sign-in's rules, the runtime both ways
npm run typecheck --workspace @tienda/cocina
bash docs/checks/wera-runtime.sh          # after ANY install here: Wera's runtime must not move
bash docs/checks/10.4b-iii-a-cocina-contract.sh   # against a local `supabase start`: the kitchen read, as the schema answers
```

## Rules

- **Its id is `mx.wera.cocina`** — iOS bundle, Android package and the sign-in scheme, one
  string (`test/identity.test.ts`). It becomes permanent at the first store upload; changing it
  after that is a new app.
- **It starts from ADR-035 §2.11's table**, as Wera does: Expo Router under `src/app/`, TanStack
  Query for server state, `src/api/` one wrapper per RPC, Spanish in `src/strings.ts`, tests in
  `test/` that pin values and never render. A row that differs for this app is an amendment there.
  ⚠️ **`docs/CONVENTIONS.md` and `conventions-gate.sh` read `app/` only, decided by `10.4b-iii-a`**
  (the first row with real screens here): the page is written about Wera — density for elder
  shopkeepers, four environment values, money — and making that gate and its falsifier read a
  second app of a few files is process outgrowing product. This app's suite pins the rules that
  carry its risks instead (`test/data-layer.test.ts`): Postgres only through `src/api/` and a hook,
  `supabase.auth` in `AuthProvider` alone, `@/` imports, and no word on a screen outside
  `src/strings.ts`. Revisit when a junior is to write here (ADR-035 §3 gates hiring on that page).
- **Its data layer is Wera's, copied — each app's `@/` resolves to its own `src/`, so Cocina cannot
  import Wera's modules.** Every copy names its twin in its header (`app/src/lib/supabase.ts`,
  `app/src/auth/oauth.ts`, …), and a fix to one is a fix to both. What must not drift is held
  against Wera's FILES, not a second spelling: the sign-in sentences and the name's key
  (`test/auth-rules.test.ts` reads `app/src/strings.ts` and `app/src/auth/credentials.ts`, which is
  why `cocina-itacate.yml` fires on them). Two differences, decided: **no persisted cache** (nothing
  here works offline yet), so a read's key carries the login instead (`kitchensKey`); and the way in
  **opens on *Crear cuenta***, because no doors come before it (`src/app/(auth)/entrar.tsx`).
- **A module in `src/api/` is a claim about the applied schema**, as in Wera: `db.yml` fires on
  `cocina/src/api/**` and runs `docs/checks/10.4b-iii-a-cocina-contract.sh` and its falsifier, which
  read the names out of `src/api/kitchen.ts`. ⚠️ **Cocina opens kitchens only**: its read filters on
  `kind = 'cocina'`, so a shop's owner who signs in here lands where a kitchen is made, and her shop
  stays Wera's.
- **Sign-in leans on settings outside this repository** (the plan's status log, 2026-10-30): the
  hosted project's redirect list holds `mx.wera.cocina://**` — without it Google's sign-in hangs, with
  no error — and its Apple client ids hold `mx.wera.cocina`. Android delivers Google's redirect to
  the router as well as to the browser session, which is what `src/app/auth/callback.tsx` is for.
- **SDK 57, through the pilot.** Every native module this app will need is in its first store
  build — maps (`react-native-maps`), notifications (`expo-notifications`) and the camera
  (`expo-image-picker`, `expo-image-manipulator`: a fonda's photos) — so features ship over the
  air. **No location**: a fonda's pin is set on a map, and `app.json` blocks the location
  permissions even if a library declares them. A module missing at the public release waits for
  the major update (`10.8`); before it, one more build.
- ⚠️⚠️ **A dependency here never moves a version Wera uses.** This folder shares Wera's
  `node_modules`. A module Wera also has takes **Wera's exact range** from `app/package.json`; a
  new native module is pinned to the **newest patch whose dependencies Wera's installed tree
  already satisfies** (`npm view <pkg>@<v> dependencies`). Measured 2026-10-27:
  `expo-notifications` 57.0.24 upgraded `expo-constants` and moved Wera's runtime on both
  platforms; 57.0.17 fits. After any install, the root lockfile's diff must only **add**
  entries, and `docs/checks/wera-runtime.sh` (in `app.yml`) must pass.
- **Two values come from EAS's environment into the config, never the repository:** the Android map key
  (`GOOGLE_MAPS_ANDROID_API_KEY`) and Firebase's `google-services.json` (file variable
  `GOOGLE_SERVICES_JSON`, copied in by `eas-pre-install.sh`, which refuses an Android store
  build without either). **Neither enters the runtime** — `fingerprint.config.js` drops both,
  and `test/runtime.test.ts` computes the runtime with and without them. A new value read from
  the environment into the config joins that file and that test, or the runtime this Mac
  computes stops matching EAS's.
- **Ship an update only through the runbook, which computes the runtime the way the build does** —
  `bash docs/runbooks/ship-an-update.sh preview "…" --app cocina`, run on `main` after a green merge
  (`10.4b-iii-a`); its rehearsal in `app.yml` holds the `--app cocina` cases. Never a bare
  `eas update`. ⚠️ **The `preview` builds are the owner's alone, and the published aviso still says
  these versions have no accounts** — so `production` waits for that page's rewrite (`10.4b-iv`).
- **`ios/` and `android/` are generated by `expo prebuild` and gitignored. No workflow compiles
  this app**: `cocina-itacate.yml` is a typecheck and the suite. A device build is the evidence
  for anything native.
- **The icons are provisional**: Wera's mark files (`../app/assets/images/`) on this app's own
  Android ground. A real icon is the owner's call before the public release — an icon is native,
  so after that release it waits for `10.8`.
- **Its EAS project is `@wera-app/cocina`** (`8aca5e83-56a5-4b39-87b4-dd5312a54c76`), made by the owner on 2026-10-27
  (`eas init`, plan `10.2b`); its builds listen for updates at `updates.url` in `app.json`. The
  map key and `google-services.json` are the organization's variables on expo.dev (*Sensitive*,
  `preview` and `production`), read by every project in it. The database's address and
  publishable key are this project's own (`EXPO_PUBLIC_SUPABASE_URL`,
  `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `preview` and `production`, Wera's values, set
  2026-10-29), read by `src/lib/supabase.ts` since `10.4b-iii-a`; on this Mac they come from the
  shell or `cocina/.env.local`. Metro writes such a value into the JavaScript bundle, not the
  config, so the runtime does not move with them (computed both ways, 2026-10-30).
