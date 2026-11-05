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
npm --prefix itacate test                 # the runner's tally — identity, permissions, sign-in's rules, her way out, the runtime both ways
npm run typecheck --workspace @tienda/itacate
bash docs/checks/wera-runtime.sh          # after ANY install here: Wera's runtime must not move
bash docs/runbooks/set-itacate-sign-in.sh --check   # the two settings outside this repository its sign-in needs, read back
bash docs/checks/10.4b-iii-a-cocina-contract.sh     # against a local `supabase start`: her way out's names held to Wera Cocina's, which the database answers
bash docs/checks/5R-k-apple-revoke-contract.sh      # the same stack: the function that tells Apple, served, with this app's body among the three
bash docs/checks/10.5-iv-a-door-contract.sh         # the same stack: the one door, every key the list reads, asked as a neighbour
TZ=UTC npm --prefix itacate test          # CI's zone: the list's days and windows are local time, and the Mac is UTC−6
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
  **one time limit**, 30 s, since Itacate sends no photo; and **three reads** — her own owner
  memberships, for her way out (`10.5-iii-b`), the one door (`10.5-iv-a-i`), and the kitchens'
  trades' names (`kitchen_giros()`, `10.5-iv-a-ii`: the catalogue, no business's rows) — inside the
  session, keyed on the login. ⚠️ **Nothing of a read is kept on the phone's disk**: the
  kitchens' photos too are drawn from memory (`@/ui/Foto`'s `cachePolicy="memory"`), so a
  deleted kitchen's photos leave every neighbour's reach at once, as Wera Cocina's aviso promises.
- **Her way out is Wera Cocina's, cut to this app** (`src/api/account.ts`, `@/ui/Salidas`, the owner's
  ruling of 2026-11-04): on *Tu cuenta* (`(vecino)/cuenta`, since `10.5-iv-a-i`, reached from the list's
  band — the foot of the one screen before), *Cerrar sesión* and *Eliminar mi cuenta*; a
  neighbour owns nothing and just confirms; a sole owner sees every kitchen (in Wera Cocina) and shop
  (in Wera) that goes with the account and types each name (`0073`), in one body, `{p_business_names}`.
  No business is open here, so they are named kitchens first, then shops. Wera's words, held to Wera's
  file (`test/account.test.ts`); each business's line is the twin's that is not its home. ⚠️ **Apple
  is told through Wera's one function**, its body's `client_id` this app's bundle id (`apple-revoke`
  build 3); only an iPhone shows the sheet, and **Itacate has no iPhone build**, so that half has
  never run from it. ⚠️ ***Tu cuenta* is a `Formulario`** so a typed name stays above the keyboard.
- **A module in `src/api/` is a claim about the applied schema**, as in Wera and Wera Cocina:
  `db.yml` fires on `itacate/src/api/**` since `10.5-iii-a`. ⚠️ **Her way out's names
  (`src/api/account.ts`) are Wera Cocina's, one by one**: the first group of
  `docs/checks/10.4b-iii-a-cocina-contract.sh` refuses any that differs before a request is sent,
  so its deletions are this app's too — one check over one engine, not a copy (its falsifier breaks
  both files at once). A change to the read or the body is made in both apps. ⚠️ **The door's claim
  is `src/api/cocinas.ts`** (`10.5-iv-a-i`): `on_offer_now` and every key the list reads, at every level
  of one jsonb answer, by the database's names — where a misspelt key is a 200 with that part missing.
  `docs/checks/10.5-iv-a-door-contract.sh` (its own job in `db.yml`, `itacate-door`) reads them out of
  that file and asks a real PostgREST as a neighbour, a fonda set up through Wera Cocina's own names;
  money and quantities arrive as decimal text and are read by `parseDecimal` (`@tienda/money`, this
  app's one workspace package since `10.5-iv-a-i`); a kitchen it cannot read is dropped, never the list.
  ⚠️ **Since `10.5-iv-a-ii` the same file names `kitchen_giros()` and its two keys** (Wera Cocina's
  names, held to `cocina/src/api/kitchen.ts` by `test/gemelos.test.ts`), and the same check asks for them
  as a neighbour and refuses them signed out (its group 8; its falsifier's C13 and C14).
- **Sign-in leans on two settings outside this repository**, both made by the owner's one command,
  `bash docs/runbooks/set-itacate-sign-in.sh` (a session's write to either is refused), and read
  back by `--check`: the three values its bundle reads in this EAS project's `preview` and, since
  `10.5-iii-b`, `production`, and the
  hosted project's Apple client ids and redirect list holding `mx.wera.vecino` and
  `mx.wera.vecino://**` — without the redirect, Google's sign-in hangs with no error; without the
  id, Apple's token is refused. Android delivers Google's redirect to the router as well as to the
  browser session, which is what `src/app/auth/callback.tsx` is for.
- ⚠️⚠️ **Its store version gets the sign-in and the way out together, with its first `production`
  update** (Apple's 5.1.1(v), Play's deletion rule: both in the code since `10.5-iii-b`). Its store
  version in Play's closed test shares the `preview` build's runtime, so `ship-an-update.sh` ships
  `--app itacate` to `production` as to any channel — refusing while EAS's `production` lacks one of
  the three values — and that update is the owner's command. ⚠️ **Before it reaches his testers, Play
  Console holds `store/cocina-itacate.md`'s Itacate answers for an app with accounts** (*App access*,
  with a demo account that owns nothing; *Data safety — Itacate*): an update passes no Google review.
- **SDK 57, through the pilot.** Every native module this app will need is in its first store
  build — maps (`react-native-maps`), notifications (`expo-notifications`) and location
  (`expo-location`, **only while the app is open**: every "always" string is off, background and
  foreground-service location are blocked) — so features ship over the air: the sign-in's
  modules (`expo-apple-authentication`, `expo-crypto`, `expo-web-browser`, `expo-sqlite`) were in it
  too, so `10.5-iii-a` added three JavaScript packages at Wera's ranges and neither runtime moved
  (measured). **No camera.** A
  module missing at the public release waits for the major update (`10.8`); before it, one more
  build.
- ⚠️⚠️ **Her location never leaves the phone** (the owner's ruling of 2026-11-04, night, which replaced
  2026-11-01's 2 km square — this bullet said the square reaches the door until `10.5-iv-a-i`): the door
  takes no area and sends every kitchen a neighbour may see, and the distance and the order are worked
  out on her phone (`@/lib/distancia`, `@/lib/lista`). One module asks `expo-location`
  (`@/lib/useUbicacion`: the last known location, then a fresh one, a watch every 50 m while the app is
  open — removed whenever it leaves the front — and the whole question again on a pull or a return; the
  permission asked once, only while never asked), and the list alone reads it (`test/donde.test.ts`).
  ⚠️ **The two pages show the list's distance and never learn where she is** (`10.5-iv-a-ii`): the list
  hands each kitchen's distance — a number — to `@/lib/DistanciasProvider` (React state at the root, as
  `AuthProvider` holds the session: ADR-035 §2.11 keeps Zustand for the cart), and empties it when it
  leaves; the census holds the list its one writer and the pages away from every location module. The clock
  is `@/lib/useAhora`, a module of its own so the pages need not import `@/lib/useUbicacion`.
  ⚠️ **Found on the emulator (`10.5-iv-a-i`)**: a request the phone answers *denied* with no dialog (its
  permission screen frozen) must not strand her — *Usar mi ubicación* under the postal code's box asks again
  where the phone still allows it, else opens Itacate's page in Settings, and a request that fails reads as
  *not found*; ⚠️ **never Google's *Location Accuracy* prompt** (`mayShowUserSettingsDialog: false`, on both
  calls) — and so **high accuracy**: a balanced fix is served by Google's network location, and without it no
  GPS ran and the walk never reached the list.
  **Declined or approximate** — read from the permission: an iPhone's `reduced`, Android's `coarse` —
  **her postal code**, typed (`@/ui/CodigoPostal`, the ruling of 2026-11-03), asked of Google by her phone
  and held in memory only. **Outside Wera Cocina's search zone** (`@/lib/zona`, held to Wera Cocina's
  constant): *Itacate aún no llega a tu zona*. Apple's form needs nothing; Play's declares *Approximate
  location* for the postal code (`store/cocina-itacate.md`); the aviso's section 10 says all of it.
- **The list is proposal B's, as drawn** (`10.5-iv-a-i`, `(vecino)/index`, `@/lib/lista`): a card per dish on
  offer (`@/ui/TarjetaPlatillo` — its photo, else her trade's drawing on her colour; her circle; the price,
  the *vale* struck and the saving; *Quedan 2*, *Último*; the window; the distance) and a faded card per
  quiet kitchen (`@/ui/TarjetaCocina` — the owner's words of 2026-11-01, late: *Suele publicar entre
  semana, hacia las 17:00* once 3 publications in 4 weeks show a pattern, else *Publicó ayer*, *Publicó el
  martes*), held word for word by `test/lista.test.ts`. **The order is the owner's answers of 2026-11-05**
  (`10.5-iv-a-iv`, asked on `10.5-iv-a-iii`'s page): it opens on *Ahora* — now, later today, another day, the quiet
  kitchens, nearest first inside each — and *Ordenar* (`@/ui/Ordenar`) offers *Más cerca* (nearest first, the order
  until then) and *Más barato*, and nothing else; every kitchen the door sends, an unknown distance last among its
  equals. The orders are `@/lib/lista`'s (`ORDENES`, `ORDEN_INICIAL`, `ordenDe`), her pick the list's state. A window
  that opens or ends while she looks moves its card without asking the door (the cards are made again
  every minute). ⚠️ **No kitchen is drawn on a map**: Google's points go only on Google's map, which is
  `10.5-iv-b`'s. Since `10.5-iv-a-ii` a card opens a page — the next bullet.
- **A kitchen's page and a dish's are proposal B's, as drawn** (`10.5-iv-a-ii`; `(vecino)/cocina/[id]`,
  `(vecino)/platillo/[cocina]/[oferta]/[linea]`, every word and link `@/lib/paginas`', pinned by
  `test/paginas.test.ts`). A dish's card opens its page; a quiet kitchen's card, hers; a dish's page opens
  her page from the kitchen's row, and her page each dish under *Hoy*. ⚠️ **Nothing new is read**: both find
  their kitchen and dish in the door's answer the list holds (in memory), and a window that ends while she
  reads is *Este platillo ya no está en oferta* without asking the door. **Her page's head is Wera Cocina's
  preview of it** (`cocina/src/ui/Portada.tsx`: cover, circle over its edge, name, trade, sentence, *Ver en
  Google Maps ›* in her colour) — what she was shown is what a neighbour sees — then how far she is, where
  and *Cómo llegar*, *Hoy* (else *Hoy no ha publicado* and her pattern; *Ya no tiene nada por hoy* once she
  published for today and it ended — his words would be false then) and *Lo que suele publicar*. ⚠️ **Both
  links open Google Maps and send nothing of hers**: *Cómo llegar* is Google's Maps URLs (no key, nothing
  billed), to her own pin, else her address as she wrote it — never Google's 30-day copy — with no origin;
  *Ver en Google Maps* opens her link only when `mapsLinkOk` (the database's rule, Wera Cocina's copy)
  takes it. The reserving is `10.5b`'s: no button, no line about paying. The price, *Quedan* and *Sorpresa*
  are `@/ui/Precio`'s, drawn alike on the list and both pages.
- **Google, from her phone, for her alone, kept nowhere** (`@/lib/google`, pure; `@/lib/useGoogle`, the
  requests): Geocoding for a kitchen the door sends with no point — her address, asked once while the app
  is open, the answer in TanStack's memory (Service Specific Terms §6.3.2) — and for her postal code, never
  cached. Each request names THIS app (`mx.wera.vecino`; on Android its test builds' signature, held to the
  handbook's record of what the key accepts). ⚠️⚠️ **Measured 2026-11-05: Google's Android key gets
  Itacate's requests past its app lock and then refuses Places and Geocoding (`API_KEY_SERVICE_BLOCKED`) —
  for Wera Cocina too** — until the owner's console step (the handbook's *Before Wera Cocina reaches your
  testers*, item 6): meanwhile, on Android, a kitchen with no point shows no distance and a postal code
  cannot be placed; the iPhone key answers both apps.
- **Wera Cocina's defaults and names, copied — each copy naming its twin**: `@/api/pagina` (the six
  colours, each trade's colour and drawing, the initials), `@/api/fotos` (the photos' names and how a
  phone asks for one), `@/theme/colores`, `@/theme/dibujos` with `src/marca/giros/` (the nine PNGs, byte
  for byte), `@/format/mxn` (Wera's, through Wera Cocina's), `@/lib/ventana` (a window's words),
  `@/lib/zona`, `@/ui/Dibujo`, `@/ui/Iniciales`, and `@/lib/google`'s shared code. `test/gemelos.test.ts`
  holds each to the TWIN'S FILE: it runs the twin where it loads under this app's `@/`, compares the code
  block by block where it cannot, and the drawings by their bytes — a re-drawing in Wera Cocina is copied
  here in the same PR, or that test is red.
- ⚠️⚠️ **A dependency here never moves a version Wera uses.** This folder shares Wera's
  `node_modules`. A module Wera also has takes **Wera's exact range** from `app/package.json`; a
  new native module is pinned to the **newest patch whose dependencies Wera's installed tree
  already satisfies** (`npm view <pkg>@<v> dependencies`). Measured 2026-10-27:
  `expo-notifications` 57.0.24 upgraded `expo-constants` and moved Wera's runtime on both
  platforms; 57.0.17 fits, and `expo-location` 57.0.20. After any install, the root lockfile's
  diff must only **add** entries, and `docs/checks/wera-runtime.sh` (in `app.yml`) must pass.
- **Three values come from EAS's environment, never the repository:** the Android map key
  (`GOOGLE_MAPS_ANDROID_API_KEY`), the iPhone key (`GOOGLE_MAPS_IOS_API_KEY`, since `10.5-iv-a-i`) and
  Firebase's `google-services.json` (file variable `GOOGLE_SERVICES_JSON`, copied in by
  `eas-pre-install.sh`, which refuses an Android store build without the file or the Android key). The
  Android key goes into `react-native-maps`' options, and **both keys into `extra.google`**
  (`10.5-iv-a-i`), where her phone's questions to Google read their own (`@/lib/useGoogle`). ⚠️ **The
  iPhone key is NOT in the map's options**: there its presence compiles Google's map into an iPhone
  build, a native change that is `10.5-iv-b`'s. **None enters the runtime** — `fingerprint.config.js`
  drops the Android key from the map's options and **the whole of `extra.google`** (removed, not
  masked as Wera Cocina's are, so the config hashes as it did before), and ignores the file;
  `test/runtime.test.ts` computes the runtime with and without them, and pins Android's to the one
  Itacate's test build in the field carries (`4de35b0b…`, build `2b638d21`). A new value read from the
  environment into the config joins that file and that test, and the update runbook's list.
- **Ship an update only through the runbook, which computes the runtime the way the build does** —
  `bash docs/runbooks/ship-an-update.sh preview "…" --app itacate`, run on `main` after a green merge
  (`10.5-iii-a`, its first; `production` since `10.5-iii-b`, his); its rehearsal in `app.yml` holds the
  `--app itacate` cases. Never a bare
  `eas update`. ⚠️ **Its only test build is Android's `preview` APK** (`2b638d21`, from `10.2b`; EAS
  keeps it to 2026-11-11, installed copies keep working) — no iPhone test build exists, and the first
  needs the owner at Terminal.app for its signing profile (`5R-b-iii`'s finding). The bundle reads
  five values — the database's two and the support number, which this project holds in `preview`, and
  in `production` once his command has run again (`10.5-iii-b`), and since `10.5-iv-a-i` Google's two
  keys through `extra`, the organization's variables in both environments; a new `EXPO_PUBLIC_` value, or
  a variable the config hands to `extra`, joins the runbook's list for `--app itacate`, held by
  `test/support.test.ts`.
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
  about a deletion needs `apple-revoke` to list it — build 3 does** (ADR-035 §2.2, plan `10.5-iii-b`;
  a fourth app the same way, never a second function) — and Itacate grouped under Wera's App ID in
  Apple's portal, the owner's hands, so the function's one key covers it: until then Apple answers
  `invalid_client` to a deletion from an iPhone build, and the account is deleted regardless. One
  person has one Apple id across the team's apps, grouped or not.

## Screens — the family shell (ruled 2026-11-05)

The owner ruled how the two apps are arranged and worded on 2026-11-05 (`docs/PLAN.md`, rows `10.5-v-a` to `10.5-v-d`
and `10.5b`; the drawn reference is the family-shell page in his private notes' `diseno/`). Every screen built here
follows it, as `cocina/CLAUDE.md`'s does:

- **The tab bar is *Cerca · Apartados · Mis cocinas · Tú*** — four tabs at most, each with its word; the two ends never move; a tab appears only when
  its feature ships; a new feature arrives first as a card on *Cerca*. Wera's JavaScript tabs, not native tabs.
- **No word that makes the food sound left over** where a fonda or a neighbour reads (*lo que sobra*, *sobrante*,
  *restos*, *desperdicio*): *Publicar una oferta*, *Tu oferta de hoy*, *aprovechar*, *Por hoy ya se terminó*, *Se liberó*.
  **No sentence saying there are no penalties**: a reservation is drawn as a handover — the hour, how she pays, the code.
- **The look:** titles in Nunito ExtraBold (`expo-font`); Itacate's blue `#24476B` for actions; Wera's terracotta `#A9501C` for
  promotions only; state first, before anything tappable (ADR-035 §2.8); one staggered entrance per screen, transform and
  opacity only (§2.11).
- **Money:** no screen stores or shows a bank account, a card or an amount paid — only how she will pay.
