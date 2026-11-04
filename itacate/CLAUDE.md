# `itacate/` — Itacate, the neighbours' app

Loads when a session touches `itacate/`. Lane **Itacate** of `docs/PLAN.md`'s Step 10: a
neighbour reserves an itacate nearby and collects it in person with a 3-digit code (`10.5`).
**She is no workspace's member**: every policy denies her, and what she reads of other businesses
goes through one `security definer` function (ADR-035 §2.7). *Itacate* is a working name until the
owner's IMPI search. The root `CLAUDE.md` holds what is not app-only; **nothing checks this file**,
so it carries commands, never counts. Its twin is `cocina/CLAUDE.md` — most rules here are in both.

**A Step 10 task reads `~/RetailerToolDev/wera-vision/CLAUDE.md` first** (the owner's private
notes) and copies nothing from it here.

## Measure, don't remember

```
npm --prefix itacate test                 # the runner's tally — identity, permissions, sign-in's rules, the runtime both ways
npm run typecheck --workspace @tienda/itacate
bash docs/checks/wera-runtime.sh          # after ANY install here: Wera's runtime must not move
bash docs/runbooks/set-itacate-sign-in.sh --check   # the two settings outside this repository its sign-in needs, read back
```

## Rules

- **Its id is `mx.wera.vecino`** — iOS bundle, Android package and the sign-in scheme, one
  string (`test/identity.test.ts`). It names the role, not the app, so the IMPI search can rename
  the app without touching it. It becomes permanent at the first store upload.
- **It starts from ADR-035 §2.11's table**, as Wera does: Expo Router under `src/app/`, TanStack
  Query for server state, `src/api/` one wrapper per RPC, Spanish in `src/strings.ts`, tests in
  `test/` that pin values and never render. A row that differs for this app is an amendment there.
  ⚠️ **`docs/CONVENTIONS.md` and `conventions-gate.sh` read `app/` only, decided for Itacate by
  `10.5-iii-a`** (its first real screens), as `10.4b-iii-a` decided for Wera Cocina: the page is
  written about Wera, so this app's suite pins the rules that carry its risks instead
  (`test/data-layer.test.ts`): `supabase.auth` in `AuthProvider` alone, the live client imported by
  it alone, `@/` imports, and no word on a screen outside `src/strings.ts`.
- **Its data layer is Wera's, copied — through Wera Cocina's copies, which it matches** (`10.5-iii-a`).
  Each app's `@/` resolves to its own `src/`, so every copy names both twins in its header
  (`app/src/lib/supabase.ts`, `cocina/src/lib/supabase.ts`, …), and a fix to one is a fix to all
  three. What must not drift is held against **Wera's FILES**: the sign-in sentences and the name's
  key (`test/auth-rules.test.ts` reads `app/src/strings.ts` and `app/src/auth/credentials.ts`), and
  the support link (`test/support.test.ts` runs Wera's `app/src/auth/support.ts` beside its copy).
  Decided, as Wera Cocina's: **no persisted cache**, and the way in **opens on *Crear cuenta***. Its
  own: **two rooms** — the way in (`(auth)`) and the app (`(vecino)`), a session the whole answer,
  because a neighbour is no business's member and nothing is read to decide (`@/auth/guard`);
  **one time limit**, 30 s, since Itacate sends no photo; and **nothing read from the database
  yet** — `src/api/` holds the query layer alone, mounted inside the session for the first read.
  ⚠️ **Her way out is not here yet** (`10.5-iii-b`): no *Eliminar mi cuenta*, no second Apple sheet.
- **A module in `src/api/` is a claim about the applied schema**, as in Wera and Wera Cocina:
  `db.yml` fires on `itacate/src/api/**` since `10.5-iii-a`, before anything there names the
  schema. The first module that does — her way out's (`10.5-iii-b`), the door's (`10.5-iv`) —
  brings the contract check that workflow runs.
- **Sign-in leans on two settings outside this repository**, both made by the owner's one command,
  `bash docs/runbooks/set-itacate-sign-in.sh` (a session's write to either is refused), and read
  back by `--check`: the three values its bundle reads in this EAS project's `preview`, and the
  hosted project's Apple client ids and redirect list holding `mx.wera.vecino` and
  `mx.wera.vecino://**` — without the redirect, Google's sign-in hangs with no error; without the
  id, Apple's token is refused. Android delivers Google's redirect to the router as well as to the
  browser session, which is what `src/app/auth/callback.tsx` is for.
- ⚠️⚠️ **No store version of Itacate carries a sign-in without its way out** (`10.5-iii-b`; Apple's
  5.1.1(v), Play's deletion rule). Its store version in Play's closed test shares the `preview`
  build's runtime, so `ship-an-update.sh` refuses `--app itacate` on `production` until then, and
  **no store build of Itacate is made** before it: one built from `main` carries the sign-in (and,
  with `production` lacking the three values, would not even start).
- **SDK 57, through the pilot.** Every native module this app will need is in its first store
  build — maps (`react-native-maps`), notifications (`expo-notifications`) and location
  (`expo-location`, **only while the app is open**: every "always" string is off, background and
  foreground-service location are blocked) — so features ship over the air: the sign-in's
  modules (`expo-apple-authentication`, `expo-crypto`, `expo-web-browser`, `expo-sqlite`) were in it
  too, so `10.5-iii-a` added three JavaScript packages at Wera's ranges and neither runtime moved
  (measured). **No camera.** A
  module missing at the public release waits for the major update (`10.8`); before it, one more
  build.
- ⚠️ **Her exact position stays on the phone** (the owner's ruling of 2026-11-01, question 6, option
  C): the phone snaps it to a ~2.2 km square — Google counts an area under 3 km² as precise — and
  only that square reaches the door, which answers with what is on offer around it; distance and
  order are computed on the phone. Sent in the request's body, never its URL, and never kept:
  Apple's form needs nothing (data *"immediately discarded after servicing the request"*), Play's
  declares approximate location processed ephemerally (not shown on the store), and the aviso
  says so before the first update that sends it. Declined or approximate: her colonia (D).
- ⚠️⚠️ **A dependency here never moves a version Wera uses.** This folder shares Wera's
  `node_modules`. A module Wera also has takes **Wera's exact range** from `app/package.json`; a
  new native module is pinned to the **newest patch whose dependencies Wera's installed tree
  already satisfies** (`npm view <pkg>@<v> dependencies`). Measured 2026-10-27:
  `expo-notifications` 57.0.24 upgraded `expo-constants` and moved Wera's runtime on both
  platforms; 57.0.17 fits, and `expo-location` 57.0.20. After any install, the root lockfile's
  diff must only **add** entries, and `docs/checks/wera-runtime.sh` (in `app.yml`) must pass.
- **Two values come from EAS's environment, never the repository:** the Android map key
  (`GOOGLE_MAPS_ANDROID_API_KEY`) and Firebase's `google-services.json` (file variable
  `GOOGLE_SERVICES_JSON`, copied in by `eas-pre-install.sh`, which refuses an Android store
  build without either). **Neither enters the runtime** — `fingerprint.config.js` drops both,
  and `test/runtime.test.ts` computes the runtime with and without them. A new value read from
  the environment into the config joins that file and that test. ⚠️ **Wera Cocina's twins of
  those four files moved ahead in `10.4g-i`** (the iPhone map key, `GOOGLE_MAPS_IOS_API_KEY`, and
  `extra.google` for its search); Itacate's stay as they are until its own map (`10.5-iv`), and
  each header says so. Measured that day: the header edits left Itacate's runtime as it was on
  both platforms (`npx expo-updates fingerprint:generate`).
- **Ship an update only through the runbook, which computes the runtime the way the build does** —
  `bash docs/runbooks/ship-an-update.sh preview "…" --app itacate`, run on `main` after a green merge
  (`10.5-iii-a`, its first); its rehearsal in `app.yml` holds the `--app itacate` cases. Never a bare
  `eas update`. ⚠️ **Its only test build is Android's `preview` APK** (`2b638d21`, from `10.2b`; EAS
  keeps it to 2026-11-11, installed copies keep working) — no iPhone test build exists, and the first
  needs the owner at Terminal.app for its signing profile (`5R-b-iii`'s finding). The bundle reads
  three values — the database's two and the support number — which this project holds in `preview`;
  a new `EXPO_PUBLIC_` value joins the runbook's list for `--app itacate`, held by `test/support.test.ts`.
- **`ios/` and `android/` are generated by `expo prebuild` and gitignored. No workflow compiles
  this app**: `cocina-itacate.yml` is a typecheck and the suite. A device build is the evidence
  for anything native.
- **The icons are provisional**: Wera's mark files (`../app/assets/images/`) on this app's own
  Android ground. A real icon is the owner's call before the public release.
- **Its EAS project is `@wera-app/itacate`** (`261e153c-a9db-408e-a10e-f21c09c732b0`), made by the owner on 2026-10-27
  (`eas init`, plan `10.2b`); its builds listen for updates at `updates.url` in `app.json`. The
  map key and `google-services.json` are the organization's variables on expo.dev (*Sensitive*,
  `preview` and `production`), read by every project in it.
- **Sign in with Apple needs the hosted project to list this app's id** (above); **telling Apple
  about a deletion needs `apple-revoke` to learn it** (ADR-035 §2.2, plan `10.5-iii-b`) — a `BUILD`
  bump and its deploy, never a second function — and Itacate grouped under Wera's App ID in Apple's
  portal, so the function's one key covers it. One person has one Apple id across the team's apps,
  grouped or not.
