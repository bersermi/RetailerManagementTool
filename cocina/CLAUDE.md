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
bash docs/checks/10.4b-iii-a-cocina-contract.sh   # against a local `supabase start`: the kitchen read, making one and deleting the account, as the schema answers
bash docs/checks/10.4b-iv-a-listing-contract.sh   # the same stack: her list, publishing (each line's keys), a retry, withdrawing
bash docs/checks/5R-k-apple-revoke-contract.sh     # the same stack: the function that tells Apple, served, with Wera's body and this app's
TZ=UTC npm --prefix cocina test           # CI's zone: the window's arithmetic is local time, and the Mac is UTC−6
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
  read the names out of `src/api/kitchen.ts`, `src/api/place.ts` and `src/api/account.ts` — and, in its own
  job (`cocina-listings`), `docs/checks/10.4b-iv-a-listing-contract.sh` and its falsifier, which read
  `src/api/listing.ts`. ⚠️ **Cocina opens kitchens only**:
  its read filters on `kind = 'cocina'`, so a shop's owner who signs in here lands where a kitchen is
  made, and her shop stays Wera's. ⚠️ **And a kitchen's place is read by the kitchen's id**
  (`firstPlace`): the walls show a shop's owner her shop's store too, and an unfiltered read's first
  row is that store — her kitchen's address and pin would land on her shop (`10.4b-iii-b`).
- **A kitchen is made whole at the end of the sign-up** (`src/api/registro.ts`, `10.4b-iii-b`): the
  form, then the map, then one *Registrar* — `onboard_workspace`, her trade, her address, her pin —
  before her kitchens are read again, because the guard moves her the moment that read has one. Only
  the first write can fail the sign-up; **her kitchen's screen is the second door** for the rest, as
  Wera's Ajustes is for a shop.
- **Her way out is Wera's deletion, cut to this app** (`src/api/account.ts`, `@/ui/Salidas`, `10.4b-iii-c`):
  at the foot of the landing and of her kitchen, every business she alone owns named — her kitchens first,
  a shop of hers in Wera too — and each name typed (`0073`), in one body, `{p_business_names}`. No team is
  read here, so nobody else is listed. Wera's words, held to Wera's file (`test/account.test.ts`), but where
  each business lives and the line pointing a shop to Wera's month download. ⚠️ **Apple is told through Wera's
  one function** (`apple-revoke`), and the body's `client_id` is this app's bundle id — Apple issued the code
  to it, and a trade naming Wera's is refused; `5R-k-apple-revoke-contract.sh` reads the key and the id out of
  `account.ts`. Only an iPhone shows the sheet: Android deletes without telling Apple, as Wera does. ⚠️ **The
  first deletion made with Apple from an iPhone build of this app is the only proof that the owner's key covers
  its id** (his grouping under Wera's App ID, 2026-10-30): Apple answers `invalid_client` when it does not.
- **What she publishes is `0072`'s, checked first on the phone** (`src/api/listing.ts`, `src/lib/ventana.ts`,
  `10.4b-iv-a`): one to ten lines, each a dish or a surprise bag with its *vale* (proposal B, his choice of
  2026-10-29), and a pickup window moved by quarter-hour steppers that stop where `publish_listing` would refuse —
  no native time picker is in this build. The form's limits and tags are held to the migration's TEXT
  (`test/listing.test.ts`), and the window's local-time arithmetic runs under a pinned zone (`test/ventana.test.ts`).
  ⚠️ **The id is the phone's, kept for a retry of the same form and new after any edit** (`attemptFor`): the
  database answers an id it holds with that publication as it was, unread. ⚠️ **Each line's keys are a claim**:
  `publish_listing` ignores a key it does not know, so a misspelt *vale* is a 200 with no *vale* — the contract
  check reads the keys out of `LineBody` and asks for each value back. ⚠️ **Money goes through `packages/money`**
  (ADR-035 §2.11: `parseDecimal` in, `formatDecimal` out, integer centavos between) — this app's one workspace
  package — and is drawn by `src/format/mxn.ts`, a copy of Wera's that `test/mxn.test.ts` runs beside Wera's file.
  Nothing is queued: with no signal she is told so and the form keeps what she typed. Her list is read by the
  open kitchen's id, newest first; *Repetir* is that list.
- ⚠️ **The map has no key in a build made on this Mac** (`MAPS_KEY_PLACEHOLDER`, and the key is locked
  to the store and `preview` signatures). Measured 2026-10-30 on the emulator: such a map delivers
  taps but **never moves its camera and draws no marker**, so the zoom, the satellite view and the pin
  are seen only on the `preview` build (or Apple's map, which needs no key). Its rules are
  `src/lib/mapa.ts`, pinned by `test/mapa.test.ts`; to walk the rest of the sign-up on the emulator,
  open the map already close in a local edit, and revert it.
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
  these versions have no accounts** — so `production` waits for that page's rewrite (`10.4b-iv-b`).
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
