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
bash docs/checks/10.4b-iii-a-cocina-contract.sh   # against a local `supabase start`: the kitchen read, making one, deleting one alone and deleting the account, as the schema answers
bash docs/checks/10.4b-iv-a-listing-contract.sh   # the same stack: her list, publishing (each line's keys), a retry, withdrawing
bash docs/checks/5R-k-apple-revoke-contract.sh     # the same stack: the function that tells Apple, served, with Wera's body, this app's and Itacate's
bash docs/checks/10.5-i-a-kitchen-photos-contract.sh   # the same stack WITH Storage started before the reset: her page and the bucket `cocina`, by this app's names
bash docs/checks/10.5b-iv-a-handover-contract.sh      # the same stack: her kitchen's reservations, who reserved each, the handover and her thumb, by apartados.ts's names — and her queue's claims, by cola.ts's
bash docs/checks/10.5b-iv-c-settings-contract.sh      # the same stack: her settings, her stars, each dish's ways, − and +, and the read before a deletion, by ajustes.ts', calificaciones.ts', listing.ts' and account.ts' names
bash store/cocina-itacate/render.sh giros         # the nine trades' drawings, from brand/giros.svg into src/marca/giros/ — and nothing else
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
  (`test/auth-rules.test.ts` reads `app/src/strings.ts` and `app/src/auth/credentials.ts`, and
  `test/support.test.ts` runs Wera's `app/src/auth/support.ts` beside its copy, which is why
  `cocina-itacate.yml` fires on them). Two differences, decided: **its saved cache is three reads, bound
  without Wera's library** (`10.5b-iv-b`, the section *With no signal* below) — every read's key still carries
  the login (`kitchensKey`); and the way in
  **opens on *Crear cuenta***, because no doors came before it (`src/app/(auth)/entrar.tsx`) — since `10.5-v-d` the
  opening's two buttons (`(auth)/hola`) open it on the half she picked, *Ya tengo cuenta* with `cuenta=tengo`.
- **A module in `src/api/` is a claim about the applied schema**, as in Wera: `db.yml` fires on
  `cocina/src/api/**` and runs `docs/checks/10.4b-iii-a-cocina-contract.sh` and its falsifier, which
  read the names out of `src/api/kitchen.ts`, `src/api/place.ts` and `src/api/account.ts` — and, in its own
  job (`cocina-listings`), `docs/checks/10.4b-iv-a-listing-contract.sh` and its falsifier, which read
  `src/api/listing.ts`. ⚠️ **Cocina opens kitchens only**:
  its read filters on `kind = 'cocina'`, so a shop's owner who signs in here lands where a kitchen is
  made, and her shop stays Wera's. ⚠️ **Since `10.5b-iv-a`, `src/api/apartados.ts`** — her kitchen's reservations
  read from `0079`'s table, `0080`'s `reservation_neighbours` and `rate_neighbour`, `hand_over_reservation` — is a
  claim of its own, asked by `docs/checks/10.5b-iv-a-handover-contract.sh` and its falsifier (its own job in `db.yml`,
  `cocina-handover`), a neighbour reserving through Itacate's names. ⚠️ **Since `10.5b-iv-c`, `src/api/ajustes.ts` and
  `src/api/calificaciones.ts`** — her six settings on `kitchen_page` and the keys `set_kitchen_page` reads, `0080`'s `my_kitchen_ratings`
  and every key of its answer — **with `listing.ts`' − and + and each dish's ways, and `account.ts`' pending read**, are asked by
  `docs/checks/10.5b-iv-c-settings-contract.sh` and its falsifier (its own job, `cocina-settings`). ⚠️ **And a kitchen's place is read by the kitchen's id**
  (`firstPlace`): the walls show a shop's owner her shop's store too, and an unfiltered read's first
  row is that store — her kitchen's address and pin would land on her shop (`10.4b-iii-b`).
- **A kitchen is made whole at the end of the sign-up** (`src/api/registro.ts`, `10.4b-iii-b`): her
  kitchen's name and trade (`/registro`), then her address on a screen of its own (`/donde`, `10.4h`),
  then one *Registrar mi cocina* — `onboard_workspace`, her trade, her address, and her own point with
  her line **only if she set one**, else her line alone (`set_store_directions`, `0075`) — before her
  kitchens are read again, because the guard moves her the moment that read has one. Only the first
  write can fail the sign-up; **her kitchen's screen is the second door** for the rest — *Mi cocina* since
  `10.5-v-c-i`, its *Falta …* in red with the door — as Wera's Ajustes is for a shop.
- **Her address first** (`10.4h`, the owner's ruling of 2026-11-03: *"The pin is only indicative"*).
  *¿Dónde está tu cocina?* (`@/ui/PantallaDireccion`, in the sign-up and behind *Cambiar dirección*)
  holds the search, her five boxes, a small map (`@/ui/MapaFijo`), her line and the button; ⚠️⚠️ **the
  small map draws her own point while it still belongs to the street and number in the boxes
  (`@/api/direccion`'s `puntoVigente`), else where Google places her address — her pick's point, behind
  *Cambiar dirección* her kitchen's stored copy while the boxes read as stored, or her boxes through
  Geocoding once they rest (`useDondeEsta`) — and since `10.5-i-b-ii` what it draws is what her save keeps
  as Google's point (the next bullet).** A tap on it, or *Ajustar punto* on her kitchen, opens *Ajusta el punto* (`@/ui/PantallaPunto`,
  the full map), the only way to a point of her own; *Listo* keeps nothing while the middle is Google's.
  ⚠️⚠️ **`set_store_pin` writes her line with the pin on every call**, and *Ajustar punto* has no box for
  it, so it sends her stored line (`test/direccion.test.ts`). **A new street or number clears her point**
  (`escrituras`: `clear_store_pin`, `0075`), so the map follows the new address; a colonia, city or
  postal code never does. *Cambiar giro* is a door of its own (`/giro`). The drafts that cross two routes
  live in their group's layout (`@/lib/borrador`); the pick rides beside them — ⚠️ and since `10.5-i-b-ii`
  its point and Google's ID for the place reach what `@/api/` sends as Google's point, never as her pin.
- **Google's point for her address, a 30-day copy** (`10.5-i-b-ii`, `0078`; the owner's ruling of
  2026-11-04, night — Google's Service Specific Terms §14.3 and §6.3.1 allow 30 days). The address screen hands
  its small map's point to her save (`useDondeEsta`'s `google`: her pick's point with its place's ID, or
  Geocoding's for her boxes with none), and the sign-up and *Guardar* send it through `set_google_point`
  (`@/api/place`'s `setGooglePointArgs`) — ⚠️⚠️ **LAST, after her address**, because `0078`'s trigger clears
  the copy whenever any part of her address changes; never while she has a pin of her own, which wins
  everywhere; and its failure never fails her save. **Her kitchen's screen draws the stored copy**
  (`@/lib/useGoogle`'s `useDondeEstaSuCocina`), so the app no longer asks Google each time it runs (`10.4h`'s
  decision (f), reversed); once the copy is older than `GOOGLE_REFRESH_DAYS` (7) or missing, ONE question —
  Place Details for the ID (`CAMPOS_DEL_REFRESCO`, `id,location`; a 404 or 400 falls back to her address
  through Geocoding) or Geocoding for her address — and ⚠️ the answer is kept in the same step that asked
  (`useSaveGooglePoint`), keyed on the copy it replaces, so an answer held in memory is never written later as
  fresh. "When the app opens" is its launch and each return to the front (`useAlAbrir`); nothing on screen
  says any of it. *Ajustar punto* opens on the copy, and *Cambiar dirección* starts with it as the place known
  for her boxes (`@/lib/google`'s `lugarGuardado`). The database clears every copy at 29 days, every night
  (`0078`'s job), so nothing here deletes one. ⚠️ **Only the point and the ID** — never what Google names:
  `test/punto-google.test.ts` holds the four columns to `src/api/place.ts` and `set_google_point` to one call
  and one argument builder, and `docs/checks/10.4b-iii-a-cocina-contract.sh`'s group 12 asks a real PostgREST
  (stamped by the database, a shop's store refused, a new address clearing it).
- **Her way out is Wera's deletion, cut to this app** (`src/api/account.ts`, `@/ui/Salidas`, `10.4b-iii-c`):
  at the foot of the landing and of *Mi cocina* (her kitchen's screen until `10.5-v-c-i`), every business she alone owns named — her kitchens first,
  a shop of hers in Wera too — and each name typed (`0073`), in one body, `{p_business_names}`. No team is
  read here, so nobody else is listed. Wera's words, held to Wera's file (`test/account.test.ts`), but where
  each business lives and the line pointing a shop to Wera's month download. ⚠️ **Apple is told through Wera's
  one function** (`apple-revoke`), and the body's `client_id` is this app's bundle id — Apple issued the code
  to it, and a trade naming Wera's is refused; `5R-k-apple-revoke-contract.sh` reads the key and the id out of
  `account.ts`. Only an iPhone shows the sheet: Android deletes without telling Apple, as Wera does. ⚠️ **The
  first deletion made with Apple from an iPhone build of this app is the only proof that the owner's key covers
  its id** (his grouping under Wera's App ID, 2026-10-30): Apple answers `invalid_client` when it does not.
  ⚠️ **Since `10.5b-iv-c` the database is asked BEFORE Apple's sheet opens**: when a business goes with her account, one read
  (`PENDING_*`, `reservation_state`'s `apartado` as four filters) asks whether a plate is still to hand over at any of them — `TD014`
  would refuse the deletion, and Apple must not be told of a deletion that does not happen. One is, and she reads why, with no sheet. A
  read that fails says nothing; the database still answers last. Itacate's copy asks the same read (`itacate/test/account.test.ts`
  holds it to this file).
  ⚠️ **Itacate's way out is this one, copied** (`itacate/src/api/account.ts`, `10.5-iii-b`):
  `10.4b-iii-a-cocina-contract.sh` refuses any of its names that differs from this file's before it sends a
  request, so a change to the owners read or the deletion's body is made in both apps, in one PR.
- **Her kitchen deleted alone, her account kept** (`10.5-iii-c`, `0077`, the owner's ruling of 2026-11-04):
  *Eliminar esta cocina* in `@/ui/Salidas`, on her kitchen only and only once the owners read says it is hers
  alone (`kitchenAlone`); one of the two deletions opens at a time. `delete_my_business(p_workspace_id,
  p_business_name)` — the kitchen's id and the name as typed — and nothing told to Apple, nobody signed out:
  the hook drops the kitchen from her list at once and reads her kitchens and the owners again, so the guard
  sends her where a kitchen is made, or to her next-made kitchen; the block is keyed on the kitchen so nothing
  typed survives into the next. ⚠️ **Not while a plate is still to hand over there** (`TD014`, since `10.5b-iv-c` said in words:
  *Alguien tiene un apartado por recoger en esta cocina…*). ⚠️ **A kitchen only**: the database refuses a shop (`TD013`), and Itacate's
  copy has none of these names — `account.ts` is the file the contract check reads them from. By email:
  `docs/runbooks/delete-a-kitchen.sh`, which can never delete a login.
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
  Nothing is queued: with no signal she is told so and the form keeps what she typed.
  ⚠️⚠️ **Since `10.5b-iv-c`, how each dish may be eaten** (call 26): with both of her kitchen's ways on, each dish asks *Para llevar* /
  *Para comer aquí* after *Avisa si pica*, both on at first; sent as `para_llevar`/`para_aqui` ONLY then — else `null`, the kitchen's
  own, so a stale read never contradicts her settings (`comoSeComeDe`); a bag always to go. *Repetir* — the form's and the one tap's —
  keeps each dish's ways narrowed to what her kitchen offers now (`eleccionRepetida`); unread, a narrowed dish opens the form. The read
  brings each line's ways and each offer's *desechable* (copied when published). ⚠️ **A line's count may be 0 since `0079`** (− with
  nothing reserved): `countOf` reads it — until `10.5b-iv-c` it refused 0 and the whole offer left her list.
  ⚠️⚠️ **Since `10.5-v-d` *Lo que vale normalmente* is required on every line, a dish's too** (the owner's ruling of
  2026-11-06), so every card in Itacate shows the saving: `checkLine`'s `usual`, sent by `lineBody` for every line, carried
  by *Repetir*. **The database never requires it** — `usual_price` stays nullable for the builds in the field (the field
  rule; `test/listing.test.ts` refuses a migration that makes it `not null`) — so an offer published before the rule has
  none, and its one-tap *Repetir* opens the form, which asks for it once. **At the form's foot, *Así la verán en Itacate***:
  Itacate's list card (`@/vecinos/ui/TarjetaPlatillo`, a copy held by `test/vecinos.test.ts`), one per line, made from what
  she typed (`@/lib/vistaPrevia`) — the drawing's hints (*Comida corrida*, *60*, *120*) until she writes her own, which the
  boxes carry as their placeholders too; her new photos drawn from the phone (`RecienTomadas`, the photo adapter's). Her list is read by the
  open kitchen's id, newest first — her last 60 since `10.5-v-c-ii` (ten until then: four weeks at two a day, for her reminder and her page as neighbours see it), from which *Hoy*'s card, *Tus ofertas* and *Repetir* are drawn
  (`@/lib/hoy`, `10.5-v-c-i`).
- **Her page in Itacate and her photos** (`10.5-ii`, proposal B, the owner's ruling of 2026-11-01): *Tu página en
  Itacate* (`/pagina`, from *Mi cocina*) — the page's head live (`@/ui/Portada`), a cover, six colours, one
  sentence, her logo, her Google Maps link — and a photo per dish on *Publicar* (`@/ui/Renglon`), *Repetir* sending the
  same path again. `@/api/pagina` is the table and its door (`set_kitchen_page`, ⚠️ **sent only what she changed** —
  `pagePatch` — so a field a later build adds is never erased by this one) and every default: her trade's colour and
  drawing (`POR_GIRO`), her initials (`kitchenInitials`: *Fonda Doña Mari* is `DM`). `@/api/fotos` is the bucket and
  ⚠️⚠️ **the files' names, a contract with Itacate (`10.5-iv`)**: each picture is a folder `<kitchen>/<uuid>` of two
  JPEGs, `720.jpg` and `160.jpg`, the number the shorter side — the cover 16:9, the logo and a dish square. A new photo
  is a new path, made when it is taken, so a retry finds its file (409, `alreadyStored`); the files go up BEFORE what
  names them is sent. ⚠️ **`@/lib/foto` is the one module that opens the camera or the gallery** (Wera's
  `@/capture/photo`, twinned): the gallery is the system picker, which needs no permission (`photosPermission` stays
  `false`); every photo is cut, resized and re-encoded, which strips where it was taken; the bytes come back as base64
  from the manipulator, because `expo-file-system` is only `expo`'s own dependency here. A saved photo is drawn by
  `expo-image` with her token in a header (`@/ui/Foto`, `photoRequest`), its disk cache never stale. The nine drawings
  are PNGs (no app has SVG), drawn by `render.sh giros` — never the script's default run, which re-draws the icon and
  the launch screen, both native. ⚠️ **A deleted kitchen's photos stay in the bucket** until
  `docs/runbooks/delete-orphan-photos.sh` deletes them — the aviso promises within 30 days.
- **Her reminder** (`10.5-v-c-ii`, the owner's ruling of 2026-11-05 — the family-shell page's call 21 — and its drawing of round
  6): the middle of the moments she published over her last two weeks, rounded down to the half hour, on the weekdays she published
  on two different dates; asked once on *Hoy*, under the doors, after her third offer and only while the rule finds an hour and a day
  (`@/lib/recordatorio`, pure, pinned by `test/recordatorio.test.ts` in Mexico City's zone); then *Recordatorio diario* in *Mi
  cocina* and its sheet (`@/ui/HojaRecordatorio`, React Native's `Modal` — no Reanimated). ⚠️ **A notification her own phone
  schedules, every week on each of her days** (`expo-notifications`, in every build since `10.2a`): `@/lib/avisos` is the one module
  that imports it — no push token is ever asked for — and `@/lib/RecordatorioProvider`, in the tabs' layout, holds her answer for both
  tabs, makes the phone hold exactly her reminders on every launch and return to the front, cancels them when the tabs leave (signed
  out, kitchen deleted) and opens *Publicar* on a tap. Her answer is kept on the phone per kitchen, beside *Hoy*'s closed door; the
  aviso says so (section 3, since this row). ⚠️ **Android 12 and later deliver it late, up to an hour, never early**: without the
  exact-alarm permission (not in any build, and the person must grant it in Settings) `expo-notifications` schedules an inexact alarm
  (`window=+1h` in `dumpsys alarm`) — measured on the emulator, 31 s and 3 min 21 s after the hour. ⚠️ Expo's weekly weekday counts
  from **Sunday** (1) and this app from Monday; an iPhone reports a notification's moment in **seconds**, Android in milliseconds
  (`milisegundosDe`). **To see it on the emulator**: the debug build against the local shop, a fortnight of publications back-dated
  as `supabase_admin` (the session's fixture of 2026-11-07), `adb root` and `adb shell date -u MMDDhhmmYYYY.ss` to move the clock
  (`settings put global auto_time 1` after) — ⚠️ `am force-stop` cancels the app's alarms (scheduled again on the next open), `kill -9`
  as root does not.
- ***Así la ven* and *Ver como la ven*** (`10.5-v-c-ii`): Itacate's dish page and kitchen page, one and the same screen, inside Wera
  Cocina — on each of today's offers in *Tus ofertas* (an offer of one dish opens its page, of several her page) and beside *Editar
  tu página* in *Mi cocina*; `/asi-la-ven/[oferta]/[linea]` and `/como-la-ven`, under `@/ui/BarraVista` (dark, *Cerrar*, the phone's
  clock turned light). ⚠️ **`src/vecinos/` is Itacate's code**: `itacate/src/ui/PaginaDeCocina.tsx`, `PaginaDePlatillo.tsx` and the
  parts they draw with, `lib/paginas.ts`, the door's types and the list's rules — `test/vecinos.test.ts` holds each to its twin, code
  for code below the imports, and the words (`VECINOS` in `src/strings.ts`) value for value; only `vecinos/ui/Foto.tsx` is an adapter to
  this app's `@/ui/Foto`. A change to Itacate's two pages is copied here in the same PR. The one difference a fonda sees: *Cómo llegar
  ›* in this app's green (`test/pestanas.test.ts` refuses Itacate's blue here). ⚠️ **Fed from her own rows, never the door** (ADR-035
  §2.7: a second reader of the one read across businesses needs a ruling): `@/lib/comoLaVen` makes the door's answer for her kitchen —
  on offer, her point, and the four-week summary — and `test/comoLaVen.test.ts` reads every rule it repeats out of whichever migration
  defines `on_offer_now` and `normalize_name` last, so `cocina-itacate.yml` fires on every migration. Seen on the emulator 2026-11-07:
  her page's *Lo que suele ofrecer* matched the local door's answer line for line. As the page drew a preview: no way back over the
  picture, nothing that opens, no distance, and a line under the bar while the door would not send her.
  ⚠️⚠️ **Since `10.5b-iv-c` the preview is the door's answer for her, whole** (`@/lib/useLoQueVen` hands `cocinaComoLaVen` three more
  reads): **what is LEFT** (`0079`) — each dish's count less what is taken (`@/lib/apartados`' `tomadosDe`), a dish with nothing left not
  sent, an offer with nothing left not on offer, though her kitchen is still *seen* while it is open, as the door says (`seVeEnItacate`
  ignores what is left); **her settings** — payment, ways, who may reserve — and each dish's own ways and each offer's *desechable*; **her
  stars** from five (`@/api/calificaciones`' `estrellasDe`: the door's three most given good tags, worked out from her own
  `my_kitchen_ratings`, never the door). Unread, each part is the door's default (`SIN_AJUSTES`, held to its `coalesce`s by
  `test/comoLaVen.test.ts`). ⚠️ **Since `10.5b-iii-a` the dish page takes a foot (`pie`) that only Itacate's route fills** — the
  preview draws none, so no *Apartar* here. The copies draw the stars and *Cómo pagas aquí* in Itacate's amber (`estrella`,
  `estrellaApagada`).
- ⚠️ **The map has no key in a build made on this Mac** (`MAPS_KEY_PLACEHOLDER`, and the key is locked
  to the store and `preview` signatures). Measured 2026-10-30 on the emulator: such a map delivers
  taps but **never moves its camera and draws no marker**, so the zoom, the flights to a search's
  answer, the flat map and the pin in the middle (`10.4e`) are seen only on the `preview` build — on
  an iPhone too since `10.4g-i`, whose map is Google's and needs its key. Its rules are `src/lib/mapa.ts`, pinned by `test/mapa.test.ts`; to walk the rest of the sign-up
  on the emulator, open the map already close in a local edit (`CIUDAD`), and revert it. ⚠️ **Since
  `10.4g-i` such a build has no search either** — the search is Google's, with the same keys — so the
  box, its list and the card's warning are the `preview` build's to show too.
- **The map she moves is Google's flat street map, on both phones, and the search above it only moves
  it** (`10.4c`, the owner's ruling of 2026-10-31, and `10.4g-i`, his of 2026-11-03: Google on both phones;
  `src/lib/google.ts`, pure, `src/lib/useGoogle.ts`, its requests, `@/ui/Buscador`). Since `10.4h` it is
  *Ajusta el punto*, opened where the small map placed her address (`abreEn`). ⚠️⚠️ **What is stored is
  her five boxes, her line, her own pin only if she sets one, and — since `10.5-i-b-ii` — Google's point for
  her address as a 30-day copy (the bullet above), never as her pin; never what Google names**: a suggestion she picks in the form fills the
  boxes — on the map a pick only moves the map — (Google lets the address an end user picks be hers — *Autocomplete for end user addresses*, its
  Places policies — never the list) and every box stays hers to change. **Since `10.4e` (his ruling of
  2026-11-02, as Uber does it) the pin is fixed in the middle and she moves the map under it**; the middle is
  her pin only once her own hand moved the map — a drag, a pinch, a double tap, or a tap, which brings the
  point she tapped to the middle — and never after a flight to an answer until she does (`src/lib/mapa.ts`'s
  `alLlegar`, its sequences pinned by `test/mapa.test.ts`). `test/buscar.test.ts` reads `@/ui/MapaPunto` for the
  wiring and refuses the search in `src/api/`. **The search, measured first** (the plan's status log,
  2026-11-03): Places API (New) Autocomplete as she types, kept to the zone (Mexico City and the State of
  Mexico since `10.4f`, `ZONA_DE_BUSQUEDA`), with the colonia and city she gave in the form when she types
  none (without them her colonia was among the five for 3 to 5 of twenty, with them 11 to 14); **one session
  per search**, ended by Place Details Essentials (`CAMPOS_DE_DETALLES` — a field of a dearer tier bills the
  whole session at it); Geocoding (the GA one; v4 was a Preview) for the map's opening on her four parts and
  for the keyboard's search key. **The card over the map names her address, and warns only when Google names
  another street under her pin** (`otraCalle`, measured: her street at 14 of the twenty recorded doors, at 11
  of the 12 trusted). It sits at the TOP of the map: the foot is where Google's logo is, which the terms forbid
  covering. The suggestions' box carries *Google Maps* at its foot (its attribution rules: over the map the list
  can hide the logo, and the form has no map). A build with no key for its phone draws no box.
- **Her address form opens on *Busca tu dirección*, above the five boxes** (`@/ui/Direccion`, `10.4g-i`, the
  owner's answer of 2026-11-03, as Uber and Rappi do it — never under the street box: the street is the first box,
  so Google would not know her colonia yet). It asks what she typed alone (the map's box adds her colonia and city;
  this one's hint asks for them), in its own session; a pick's details fill the five boxes and *revisa* asks her to
  check them; a part Google does not name keeps what she typed, **unless Google's street is another** — then
  nothing she had is kept, because a number or colonia left over reads as decided (`@/lib/google`'s `cajasDe`).
  Its list is in the form's own flow, so ⚠️ **the form brings that box to its top when focused** (`@/ui/Formulario`'s
  `useArriba`, `@/lib/teclado`'s `hastaArriba`) — held just above the keyboard as every other box is, every row
  would sit behind the keys. `test/buscar.test.ts` reads both files for it; how it looks above a real keyboard is
  the `preview` build's to show.
- ⚠️ **Each phone asks with its own key, locked to this app**: an iPhone names the bundle id
  (`X-Ios-Bundle-Identifier`), Android the package and Expo's test-build fingerprint (`X-Android-Cert`, one
  of the two the Android key accepts). Google says such a lock can be copied, so a copied key is bounded by the
  project's daily limits and budget alert (the handbook's *Google's search for Wera Cocina*), not by it.
- ⚠️⚠️ **`modules/geocodificador` — the phone's own geocoder, `10.4d` — stays in the build, asked by nothing
  since `10.4g-i`**: its answers were Apple's on an iPhone, which may not be shown on Google's map, and
  `addressForCoordinate` is Apple's geocoder on an iPhone whatever the map (`react-native-maps` 1.27.2). One
  function, `buscar(pregunta, caja, limite)`, in Kotlin (Android's `Geocoder`) and Swift (Apple's `CLGeocoder`),
  autolinked from `modules/` for this app alone; **no workflow compiles either**, and the suite still reads them
  for what must hold (no permission, no position). Removing it is a native change: it leaves with a build that
  has another reason.
- ⚠️ **`cocina/.gitignore` is hashed into the runtime** — `@expo/fingerprint` lists it as a file source.
  Measured 2026-11-02 (`10.4d-i`): three lines added to it moved both runtimes (iOS `03e08251` → `04ea3329`,
  Android `1c9713fb` → `5bb2a913`) with no other change. An edit to it is a native change; compute the
  runtime after it (`npx expo-updates fingerprint:generate --platform …`), never before.
- **Sign-in leans on settings outside this repository** (the plan's status log, 2026-10-30): the
  hosted project's redirect list holds `mx.wera.cocina://**` — without it Google's sign-in hangs, with
  no error — and its Apple client ids hold `mx.wera.cocina`. Android delivers Google's redirect to
  the router as well as to the browser session, which is what `src/app/auth/callback.tsx` is for.
- **SDK 57, through the pilot.** Every native module this app will need is in its first store
  build — maps (`react-native-maps`), notifications (`expo-notifications`) and the camera
  (`expo-image-picker`, `expo-image-manipulator`: a fonda's photos) — so features ship over the
  air. **No location**: a fonda's pin is set on a map, and `app.json` blocks the location
  permissions even if a library declares them. A module missing at the public release waits for
  the major update (`10.8`); before it, one more build — `10.4d`'s, which carries the phone's own
  geocoder (`modules/geocodificador`).
- ⚠️⚠️ **A dependency here never moves a version Wera uses.** This folder shares Wera's
  `node_modules`. A module Wera also has takes **Wera's exact range** from `app/package.json`; a
  new native module is pinned to the **newest patch whose dependencies Wera's installed tree
  already satisfies** (`npm view <pkg>@<v> dependencies`). Measured 2026-10-27:
  `expo-notifications` 57.0.24 upgraded `expo-constants` and moved Wera's runtime on both
  platforms; 57.0.17 fits. After any install, the root lockfile's diff must only **add**
  entries, and `docs/checks/wera-runtime.sh` (in `app.yml`) must pass.
- **Three values come from EAS's environment into the config, never the repository:** the Android map key
  (`GOOGLE_MAPS_ANDROID_API_KEY`), the iPhone map key since `10.4g-i` (`GOOGLE_MAPS_IOS_API_KEY`) and Firebase's
  `google-services.json` (file variable `GOOGLE_SERVICES_JSON`, copied in by `eas-pre-install.sh`, which refuses
  an Android store build without the file or the Android key, and an iPhone store build without the iPhone key).
  The two keys go into `react-native-maps`' options — the iPhone key's presence is what compiles Google's map
  into an iPhone build — and into `extra.google`, where the search reads each phone's own. **None enters the
  runtime** — `fingerprint.config.js` drops the Android key, masks the iPhone's (its presence is native, its value
  not) and both copies in `extra`, and ignores the file; `test/runtime.test.ts` computes the runtime with and
  without them. A new value read from the environment into the config joins that file and that test, or the
  runtime this Mac computes stops matching EAS's. ⚠️ **Their twins in `itacate/` carry both keys in the map's
  options too since `10.5-iv-b-i`** (Itacate's own map), with one difference: Itacate's `fingerprint.config.js` REMOVES the
  iPhone key rather than masking it, because Itacate's Android runtime had to stay its field build's.
- **Ship an update only through the runbook, which computes the runtime the way the build does** —
  `bash docs/runbooks/ship-an-update.sh preview "…" --app cocina`, run on `main` after a green merge
  (`10.4b-iii-a`); its rehearsal in `app.yml` holds the `--app cocina` cases. Never a bare
  `eas update`. ⚠️ **The `preview` builds are the owner's alone; a `production` update reaches his
  closed testers only once they have the store version `10.4g-ii` built (it replaced `10.4d-ii`'s,
  never uploaded), because the module, the pictures and then Google's map on an iPhone moved this
  app's runtime — and it is his command** (a session's is refused as *Production Deploy*). The store
  versions and the `preview` builds of `10.4g-i` share one runtime per platform (measured by
  `10.4g-ii`), so the same code reaches both, each on its own channel. The aviso
  says what an account, a kitchen and a publication hold since `10.4b-iv-b`; before the first such
  update, Play Console holds `store/cocina-itacate.md`'s Wera Cocina answers (*Data safety*, *Sign-in
  details*) and Wera's Android store version carries `10.4b-ii` — the handbook's *Before Wera Cocina
  reaches your testers*.
- **`ios/` and `android/` are generated by `expo prebuild` and gitignored. No workflow compiles
  this app**: `cocina-itacate.yml` is a typecheck and the suite. A device build is the evidence
  for anything native.
- **The icon and the launch screen are ruled** (the owner, 2026-11-02) **and are this app's own files**
  since `10.4d-ii` — nothing in Wera's folder: `assets/images/icon.png`, Wera's cream cow on this app's
  green (`#1C6B4B`), is the iPhone's icon and Android's launcher icon below Android 8 (Expo 57 draws the
  legacy icon from `icon`); Android 8 and later draw the adaptive icon, Wera's mark files
  (`../app/assets/images/`) on `adaptiveIcon.backgroundColor`, the same green. `assets/images/splash-icon.png`
  is the cow in this app's green on nothing, so the cream round it is the splash's `backgroundColor` —
  the palette's `fondo`. Both drawn from `brand/wera-mark.svg` by `store/cocina-itacate/render.sh`, beside
  the Play listing's icon, and held by `test/icon.test.ts`: the paths, the icon 1024 square with **no alpha
  channel** (App Store Connect refuses an icon with one — at the first upload, long after the build), and
  each picture's colours read off its pixels. ⚠️ **Both files are hashed into the runtime on both
  platforms** (`@expo/fingerprint`'s external files): re-drawing either is a native change, and after the
  public release an icon waits for `10.8`.
- **Its EAS project is `@wera-app/cocina`** (`8aca5e83-56a5-4b39-87b4-dd5312a54c76`), made by the owner on 2026-10-27
  (`eas init`, plan `10.2b`); its builds listen for updates at `updates.url` in `app.json`. The
  map key and `google-services.json` are the organization's variables on expo.dev (*Sensitive*,
  `preview` and `production`), read by every project in it. The database's address and
  publishable key are this project's own (`EXPO_PUBLIC_SUPABASE_URL`,
  `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `preview` and `production`, Wera's values, set
  2026-10-29), read by `src/lib/supabase.ts` since `10.4b-iii-a`; and so is the support number,
  `EXPO_PUBLIC_SUPPORT_WHATSAPP` (*Sensitive*, `preview` and `production`, Wera's value, set
  2026-10-31), which *¿Olvidaste tu contraseña?* opens (`src/lib/supportWhatsapp.ts`, `10.4b-iv-b`) —
  never written in this public repository. LocationIQ's token (`EXPO_PUBLIC_LOCATIONIQ_TOKEN`, from `10.4c`)
  is read by nothing since `10.4g-i`; it can be deleted from EAS and `cocina/.env.local`. The iPhone map key
  is the organization's, like the Android one (*Sensitive*, both environments, set by a session on
  2026-11-03 from the key the owner made). On this Mac they come from the shell or `cocina/.env.local`. Metro writes such a value into the JavaScript bundle, not the config, so the
  runtime does not move with them (computed both ways, 2026-10-30). ⚠️ **A new `EXPO_PUBLIC_` value,
  or a variable the config hands to `extra`, joins the update runbook's list for `--app cocina`** —
  `test/support.test.ts` holds every one to that list (the two map keys since `10.4g-i`), because `eas
  update` builds from EAS's environment alone and a value it lacks fails silently or on the first launch.

## Screens — the family shell (ruled 2026-11-05)

The owner ruled how the two apps are arranged and worded on 2026-11-05 (`docs/PLAN.md`, rows `10.5-v-a` to `10.5-v-d`
and `10.5b`; the drawn reference is the family-shell page in his private notes' `diseno/`). Every screen built here
follows it, as `itacate/CLAUDE.md`'s does:

- **The first run** (`10.5-v-d`, the family-shell page's): a stranger is sent to the opening (`(auth)/hola`, `@/auth/guard`),
  Wera's `8g` opening in Cocina's green (`@/ui/Apertura`, `@/theme/apertura` — starts on the splash's own frame, ends on the
  icon's picture, both read off `store/cocina-itacate/render.sh` and `app.json` by `test/primera.test.ts`; once per phone,
  `OPENING_KEY`; on Android after the splash's 400 ms fade, measured on the emulator). Wera's cream cow, byte for byte,
  drawn green by tint. ⚠️ **The splash is held from the root's module** (`@/lib/splash`, Wera's) until the opening's
  pictures are in, or `Gate` has nowhere to send her. Then *Crear cuenta* / *Ya tengo cuenta*, her account, *Paso 1 de 3*
  (name and trade), *Paso 2 de 3* (her address), and — ⚠️ **the guard sends a kitchen made in the sign-up to
  `/que-ofreces`, never straight to *Hoy*** — *Paso 3 de 3*, *¿Qué ofreces hoy?*: *Publicar mi primera oferta* (the one
  form, `primera`) or *Después*, both ending on `/ya-estas`, her page as Itacate draws it (titled *Tu cocina ya está en
  Itacate* only while the door would send her), then *Ir a Hoy*. Android's back on the last two leaves for *Hoy*; nothing
  of the first run is kept on the phone, so a restart opens *Hoy*.
- **The tab bar is *Hoy · Apartados · Clientes · Mi cocina*** — four tabs at most, each with its word; the two ends never move; a tab appears only when
  its feature ships; a new feature arrives first as a card on *Hoy*. Wera's JavaScript tabs, not native tabs. ⚠️ **Built by `10.5-v-c-i`**, Itacate's
  shell copied: the tabs are data (`@/navigation/pestanas`, *Apartados* in use since `10.5b-iv-a` and *Clientes* naming `10.9`), the bar is `@/ui/Pestanas` (the tab
  in use: green, a heavier word and a pill of the green's tint — ⚠️ the other pills the bar's white, never `transparent`: Android squared every pill
  after the first switch), and `(cocina)/(tabs)/` holds exactly the tabs in use. *Tus ofertas*, *Publicar*, her page's editor and her address's
  screens are pushed over the tabs. ⚠️ **Google's point for her address is asked again from the tabs' layout**, always mounted — *Mi cocina*,
  which draws the small map, mounts only when she opens it.
- ***Hoy* is a hub** (his directions of 2026-11-06, `10.5-v-c-i`): the day's card (`@/ui/DiaDeHoy`), *Publicar una oferta* with her last day's
  offers as one-tap *Repetir* chips (`@/lib/useRepetir` — the form opens instead whenever it would not send the same thing untouched), and the
  doors (`@/ui/Puertas`: *Tu página · 4 de 5*, closed on this phone per kitchen, `@/lib/puerta`). Nothing on it is edited in place. What every
  zone says is `@/lib/hoy`'s, pure, pinned by `test/hoy.test.ts` in Mexico City's zone. ⚠️ **An offer taken back by *Deshacer* was never
  published**, for every rule there (`deshecha`: withdrawn within a minute of being published). *Tus ofertas* (`(cocina)/ofertas`) is today's
  with *Ya se terminó* and *Así la ven*, then *Anteriores*, one row per offer. *Mi cocina* is what she sets once — since `10.5-v-c-ii` with
  *Ver como la ven* and *Recordatorio diario*. Her reminder's question is *Hoy*'s fifth zone, once (`@/ui/PreguntaRecordatorio`).
- ***Deshacer*, 8 seconds, at the root** (`@/lib/NotaProvider`, `@/ui/Nota`): after publishing or *Repetir* the toast's *Deshacer* is
  `withdraw_listing`, sent by the provider with the kitchen in the call (`useQuitarPublicada`) — the screen that published is gone by then.
- **No word that makes the food sound left over** where a fonda or a neighbour reads (*lo que sobra*, *sobrante*,
  *restos*, *desperdicio*): *Publicar una oferta*, *Tu oferta de hoy*, *aprovechar*, *Por hoy ya se terminó*, *Se liberó*.
  `test/palabras.test.ts` refuses them in `src/strings.ts` and the aviso since `10.5-v-a` — Wera's *Merma* only in the one line
  that names it to a shop's owner.
  **No sentence saying there are no penalties**: a reservation is drawn as a handover — the hour, how she pays, the code.
- **The look:** titles in Nunito ExtraBold (`expo-font`; Wera's file byte for byte in `src/marca/letras/`, loaded before the first screen,
  since `10.5-v-c-i`); Wera Cocina's green `#1C6B4B` for actions; Wera's terracotta `#A9501C` for
  promotions only; state first, before anything tappable (ADR-035 §2.8); one staggered entrance per screen (`@/ui/Llega`, Itacate's), transform and
  opacity only (§2.11) — `test/pestanas.test.ts` lets Reanimated into `@/ui/Llega`, `@/ui/Nota` and, since `10.5-v-d`,
  the opening's `@/ui/Apertura` alone.
- **Money:** no screen stores or shows a bank account, a card or an amount paid — only how she will pay.

## *Apartados* — she sees and hands over (`10.5b-iv-a`)

The owner's final design of 2026-11-10 (the page *Names, Records and Stars*, version 5, its table of states) and slice 3's
handover (the family-shell page, stage 2). Since `10.5b-iv-b` it works with no signal (the next section); her settings, − and +
and *Así la ven*'s what-is-left are `10.5b-iv-c`'s (the section after it).

- **The read** (`useApartados`): her kitchen's reservations from 30 days back and later — `reservation_neighbours`' own reach —
  and that function's line on each. ⚠️⚠️ **In three parts, because her data plan is hers** (measured: ~810 bytes an order; 30
  days every minute was over 100 MB a day for a busy fonda): **today's and later's** (`hoy`) every minute while an offer of hers is
  not over or an order still waits (`vivo`) and the app is in front; **the 30 days before** (`antes`, the newest first — PostgREST
  answers at most 1,000 rows) when the app opens, every 30 minutes and when *Historial* opens; **who reserved each** (`vecinos`)
  whenever today's orders change (`firmaDeHoy`). Nothing tells her phone a neighbour reserved until `10.5b-v`.
  ⚠️⚠️ **When they are read again lives in ONE reader** (`useApartadosAlDia`, in the tabs' layout, since `10.5b-iv-b`): a new day
  and a new order are `refetch()`s from an effect, and a `refetch()` cancels a read in flight and sends a new one — from every screen
  each would go out once per screen. Every other screen calls `useApartados`, which reads the same queries and asks nothing again.
  ⚠️ **A list read on another day is asked again** (with the app open at midnight, and on the morning's first launch), and until the
  history is, today's read reaches back to the day it was read (`desdeDeHoy`) — so no day falls between the two lists.
  (The minute itself TanStack merges — each answer re-arms every screen's interval — measured at the local gateway 2026-11-10: one
  read of today's orders a minute with three screens up, the interval on one reader or on all three.) ⚠️ **No key carries the day or today's orders** (they are kept on the phone): the two
  lists are joined by id, today's winning (`unir`), and read again when the day turns.
  ⚠️ **`buyer_id` is granted to nobody**: the columns are named, never `*`. ⚠️ **The day after the window is the clock's on the
  phone too** (`ordenesDe`): the name gone, an unrated released plate drawn *No se presentó*.
- ⚠️ **The state is the database's definition, repeated** (`@/api/apartados`' `estadoDe`, `reservation_state`), and so is what
  is taken of a dish (`tomado`, `listing_line_taken`) — `test/apartados.test.ts` holds both to whichever migration defines each
  last. Each state's mark, colour and action is `@/lib/apartados`' `marcaDe`/`coloresDe`: green *Entregar* (rust hour 15
  minutes before), rust *Calificar*, rust *No se presentó* with green *Sí pasó*, grey for what is over.
- ⚠️ **Every *Entregar* opens the code** (`/entregar`, a keypad of its own): an order is never handed over from its card. The
  code is found among today's and every order still to hand over, the nearest to now (`buscarCodigo` — a window may cross
  midnight or open tomorrow, and an hour on another day says its day), whatever its state. ⚠️ **A neighbour who swiped *Ya lo
  tengo* first is still to hand over** until her window ends (`marcaDe`): what to charge and the button stay — ⚠️ **a handover is
  always recorded** (ruled 2026-11-10), so a cancelled or released order is handed over all the same, the screen saying so first.
  The handover sends her phone's moment (`p_at`) — what `10.5b-iv-b`'s queue will send late.
- **Her thumb** (`@/ui/CalificarVecino`): sent on the tap, her labels of its side on *Listo* (Itacate's stars' rule), one send at a
  time; changeable for 24 hours; the clock's drawn, never offered. ⚠️⚠️ **The panel keeps the order and the name it opened with**
  (`panelPara`, `nombres`, `nombreVisto`): once rated, the database stops sending the name (as ruled), and a panel drawn from the
  live read closed before she could add a label (found on the emulator). ⚠️ ***Sí pasó* clears a *No se presentó* on the phone
  too** (`sinNoSePresento`), as `hand_over_reservation` does in the database — else her panel opened on 👎.
- ⚠️ **The terms, once per login on each phone, before her first thumb** (`@/ui/AntesDeCalificar`, `@/lib/terminos`) — a *No
  se presentó* from the list opens the order first when they are not yet accepted. Kept on the phone, not the database: where it
  is kept is the owner's question in the plan's decisions block.
- **The tab's count** is what waits for her thumb (`porCalificar`), read in the tabs' layout from the same query, handed to
  `@/ui/Pestanas` as `cuentas`. Nothing on *Hoy* or *Apartados* names who may reserve (the final design).
- **To see it on the emulator**: Cocina's debug APK (`cocina/android/app/build/outputs/apk/debug/`, no native change since
  2026-11-03) in place of the test build, Metro from `cocina/` on 8082 with the local values, and a fixture made through the
  apps' own functions — `10.5b-iv-a`'s session back-dated a fortnight of one neighbour's plates as the database's owner for a
  score, and moved a window into the past for a plate that *se liberó*.

## With no signal — the counter works from the phone (`10.5b-iv-b`)

The owner's questions 7–10 of 2026-11-05: *"it works without signal (today's reservations saved on her phone)"*. ADR-035 §2.6's
*Offline* paragraph, amended for this app: reads from the phone with visible staleness, writes queued and drawn at once.

- **Three reads are kept on the phone** (`@/api/persist`, pinned by `test/persist.test.ts`): her kitchens, her offers and her
  reservations — today's and later's, the 30 days before, who reserved each (the neighbour's short name and score, while the order
  waits or waits for its thumb). Nothing else. ⚠️ **TanStack's own `hydrate` as the client is built**, from the phone's synchronous
  store (`@/api/QueryProvider`), never Wera's persister library: the first frame already has her kitchen, so a cold start with no
  signal goes straight to *Hoy*, and no dependency was added (an install here can move Wera's runtime). Saved at most every three
  seconds, at once when the app leaves the front, and at once when a queued send lands. Wera's rules kept: a refresh that failed is
  written as the success it last was (`asLastGood`); the kept reads are never collected (`gcTime`); the buster is a shape version
  (`CACHE_SHAPE`); ⚠️ **a `Date` is written as `{ "$fecha": iso }`** (`aTexto`/`deTexto`) — her orders' moments are `Date`s, and JSON
  alone brings them back as strings that throw on the first `getTime`. ⚠️ **Forgotten on *Cerrar sesión* alone** (`forgetCache` in
  `AuthProvider.signOut`, memory first), never on `session === null`, which a renewal that failed with no signal also is.
- ⚠️⚠️ **Her handover and her thumb are QUEUED, with signal or without** (`@/api/cola`, pure, pinned by `test/cola.test.ts`; bound by
  `@/lib/cola` and `@/lib/ColaProvider`): one path, Wera's C10.3. A write on a weak signal waits up to 30 s for its answer
  (`@/lib/plazo`) and a neighbour is at the counter, so the tap is written to the phone (`cocina.cola`, its own key) and drawn at once
  (`reservasConCola`, `vecinosConCola`), and sent now or when the signal returns, with her phone's moment (`p_at` — the database keeps
  it, and keeps the first handover). At most one of each per order (a second thumb replaces the first's content, keeping its moment and
  place; a handover clears a *No se presentó* waiting for the same order, and opens her thumb until her window's end plus 24 hours, as the
  database will once it lands). ⚠️ **A thumb never goes ahead of its handover**: sent in the order made, and an order whose send did not go
  keeps its later ones waiting — others go on; a new login ends a drain. ⚠️ **A landed send is drawn into the cached read and the cache saved
  BEFORE it leaves the queue** (`@/api/llegada`, awaited by the drain): her reservations' reads in flight are cancelled first — one that
  started before the send landed would write the list from before it — and each read keeps its age, which *Sin señal* reads
  (`test/llegada.test.ts`, against a real TanStack client). ⚠️⚠️ **Only the database's last word drops a send** (`desenlaceDe`): `22023`, `TD022`,
  and a `42501` whose message is the functions' own (*not at one of your kitchens*) — never a `42501` *permission denied for function*,
  which is what a call with NO session answers (supabase-js sends the publishable key when it could not renew hers; measured on the local
  stack), nor `PGRST301`–`303`; both stop the drain and wait. `docs/checks/10.5b-iv-a-handover-contract.sh` groups 11–13 ask a real
  PostgREST for each. ⚠️ **The queue outlives *Cerrar sesión***, per login: a send goes only while the login that made it is in — a
  handover is her record, and another session would sign it.
- **The signal is Wera's machine, copied** (`@/api/connectivity`, held to `app/src/api/connectivity.ts` code for code by
  `test/senal.test.ts`; `cocina-itacate.yml` fires on Wera's file), bound by `@/lib/connectivityMonitor`, **the only module that imports
  `expo-network`**: a listener plus a poll plus the app-state wake, a drop believed after two seconds, a retry ladder that outlasts the
  auth layer's 90 seconds. It drains her queue and is handed to TanStack's `onlineManager` (a read with no signal waits with its copy).
- **What the counter says** (`@/ui/SinSenal`, on *Hoy*, *Apartados* and *Entregar un apartado*): *Sin señal. Lo que ves se leyó a las
  13:05.* and *2 entregas y 1 calificación por enviar* with Wera's *Todavía están en este teléfono. Se envían solas cuando vuelve la
  señal.*; under *Entregado*, *Guardada en este teléfono. Se envía sola cuando vuelve la señal.*; and with no signal a code not on the
  phone is *Ese código no está en tus apartados de las 13:05. Sin señal no llegan los nuevos.* — never *Pídeselo otra vez* alone.
  A refusal that comes back later is drawn on its order (`rechazoDe`, a day).
- **To see it on the emulator**: the debug build against the local shop (above); **offline = airplane mode AND `adb reverse --remove
  tcp:54443`** (the local shop is reached through adb, not the emulator's network); read the queue and the cache with `run-as
  mx.wera.cocina cat files/SQLite/ExpoSQLiteStorage` (table `storage`, keys `cocina.cola` and `cocina.query-cache`).

## Her settings and her offers (`10.5b-iv-c`)

The family-shell page's two sheets (stage 2, ruled 2026-11-05: *Cómo te pagan*, *Para llevar o comer aquí*; calls 12, 17, 26–28)
and `10.5b-ii`'s final design (*Mi cocina*'s rows, *Ajustes de apartados*; Q3's stars). No migration: every column and function is
`0079`'s and `0080`'s.

- **Her settings are six columns of her page's row** (`@/api/ajustes`: `accepts_card`, `accepts_transfer`, `para_llevar`, `para_aqui`,
  `container_price`, `min_score`), ⚠️ **read apart from her page** — `Page` is the door's own shape, which Itacate's copied pages are
  drawn from — and set through the same door, `set_kitchen_page`, **one key a tap** (only what she changed, `@/api/pagina`'s rule).
  Not kept on the phone (`@/api/persist`): nothing at the counter needs them with no signal. `test/ajustes.test.ts` holds every rule to
  `0079`'s and `0080`'s text.
- ***Mi cocina***: after her trade, *Cómo te pagan*, *Cómo se come*, *El desechable*, her reminder, *Tus calificaciones*, *Ajustes de
  apartados* — each row saying what is set (`@/lib/ajustes`), each opening a screen pushed over the tabs (`(cocina)/cobro`,
  `como-se-come`, `desechable`, `calificaciones`, `ajustes-apartados`) inside `@/ui/PantallaDeAjustes`: the band with *‹ Mi cocina*,
  ⚠️ *Leyendo…* or *Intentar de nuevo* until her settings are read — never the defaults drawn as hers — and *Listo*.
- **A switch or an option saves on the tap** (`useGuardarAjuste`): drawn at once (`ajustesCon`), put back with the sentence when the door
  refuses or the signal fails, one save at a time. `@/ui/FilaInterruptor` (a row with a drawn switch; `fijo` for *Efectivo*, always on,
  and the LAST way a kitchen hands plates over — the database refuses neither, `22023`) and `@/ui/FilaOpcion` (a radio row).
- ***Cómo te pagan*** — *Efectivo* always; *Tarjeta* and *Transferencia*, off at first. ⚠️ No account, card or amount is asked or kept;
  with *Transferencia* on, the screen says so. The drawing's *Wera nunca recibe tu dinero* is written *Tus vecinos te pagan a ti,
  directo: Wera Cocina no toca ese dinero.* (true whatever fee comes later).
- ***El desechable*** — a price (Wera's `parsePesos` cleaning, above 0, below 100,000) with *Guardar*, or *No lo cobro*; each offer
  keeps the price it had when published, and the screen says so.
- ***Ajustes de apartados › Quién puede apartar*** — *Todos*, *Más de 75%*, *80%*, *85%*, and nothing else; ⚠️ named in *Mi cocina*
  alone (`test/ajustes.test.ts` refuses it on *Hoy* and *Apartados*); someone with no score yet always passes; nobody is cancelled.
- ***Tus calificaciones*** (`my_kitchen_ratings`, read at most every 30 minutes): from five, ★ and the average, how many, *Lo que más
  dicen* (each tag given) and *De ayer, en desorden*; below five, how many and *desde la quinta*. Nothing that arrives can say who.
  ⚠️ The round-1 drawing's *Reportar* is not drawn: no function takes a report.
- **− and + on *Tus ofertas*** (`useCantidades`, `set_listing_quantity`): *quedan 2 de 5* between them, − stopping at what is reserved
  (`TD019` said if a neighbour reserved meanwhile), + at 999. ⚠️ **One send at a time per dish, the last tap wins**, counted from the
  last tap (never a render not yet made); her list's read in flight is cancelled before the drawing. Online only.
- **To see it on the emulator**: the debug build against the local shop (*Apartados*' section); `docs/checks/10.5b-iv-c-settings-contract.sh`
  shows how five rated plates of yesterday are made as the database's owner, for *Tus calificaciones* from five.
