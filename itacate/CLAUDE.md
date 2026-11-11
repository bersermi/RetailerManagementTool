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
bash docs/checks/10.5b-iii-a-reserving-contract.sh  # the same stack: reserving, giving back, collecting, her stars and her standing, by apartados.ts's names
TZ=UTC npm --prefix itacate test          # CI's zone: the list's days and windows are local time, and the Mac is UTC−6
bash store/cocina-itacate/render.sh itacate-icono   # the iPhone's icon, the cow on the blue — and nothing else (native on the iPhone)
```

A signed-in screen is seen only on a **debug build against the local database** (a session may not sign in on the live
one): `npx expo prebuild -p android --no-install` in `itacate/` (gitignored, nothing tracked changes), the local proxy's
`cert.pem` trusted in `android/app/src/main/res/` (`raw/` + `xml/network_security_config.xml` with cleartext allowed for
Metro), `./gradlew :app:assembleDebug -PreactNativeArchitectures=arm64-v8a` (about four minutes on 2026-11-06), Metro
from `itacate/` with the two local `EXPO_PUBLIC_SUPABASE_` values in the shell, and `debug_http_host` in the app's
`shared_prefs`. It replaces the test build's copy on the emulator (another signature): reinstall that copy from
`~/RetailerToolDev/wera-builds/` and `pm clear` it before watching an update arrive.

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
  ruling of 2026-11-04): on *Tú* (`(vecino)/(tabs)/tu`, the last tab, since `10.5-v-b` — before it *Tu
  cuenta*, a screen pushed from the list's band), *Cerrar sesión* and *Eliminar mi cuenta*; a
  neighbour owns nothing and just confirms; a sole owner sees every kitchen (in Wera Cocina) and shop
  (in Wera) that goes with the account and types each name (`0073`), in one body, `{p_business_names}`.
  No business is open here, so they are named kitchens first, then shops. Wera's words, held to Wera's
  file (`test/account.test.ts`); each business's line is the twin's that is not its home. ⚠️ **Apple
  is told through Wera's one function**, its body's `client_id` this app's bundle id (`apple-revoke`
  build 3); only an iPhone shows the sheet, and **no account made with Apple has been seen deleted
  from Itacate's first iPhone build** (`282cfb7d`, `10.5-iv-b-ii`) — the handbook's *Itacate's way
  out*, A, is that proof. ⚠️ ***Tú* is a `Formulario`** so a typed name stays above the keyboard.
  ⚠️ **Since `10.5b-iv-c` the database is asked BEFORE Apple's sheet opens** (Wera Cocina's way, copied): when a kitchen goes with her
  account, one read (`PENDING_*`) asks whether a plate is still to hand over there — `TD014` would refuse the deletion, and Apple must not
  be told of one that does not happen. `test/account.test.ts` holds the read to Wera Cocina's, name for name and line for line.
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
  ⚠️ **Since `0079` (`10.5b-i`) a line's `quantity` is what is LEFT** once neighbours reserve — what this app
  has always drawn as *Quedan N* — and a line with nothing left is not sent, because `countOf` refuses 0; the
  door also sends each line's `para_llevar` and `para_aqui`, each offer's `container_price` and each kitchen's
  `payment` and `eat`, which this app reads since `10.5b-iii-a` (with `0080`'s `min_score`) — and since `10.5b-iii-b` `0080`'s
  `stars` (from five ratings, good tags only: `estrellasOf`; its keys held to the door's text by `test/calificar.test.ts`, the
  door check asking for the key itself). ⚠️ **Reserving's
  claim is `src/api/apartados.ts`** (`10.5b-iii-a`): `0079`'s `reserve_plate`, `my_reservations`, `cancel_my_reservation`,
  `confirm_my_pickup` and `0080`'s `give_my_yes`, `my_standing` — and since `10.5b-iii-b` `rate_kitchen` (`supabase/README.md`'s
  rows) — every argument and key read,
  the states drawn, the refusals turned into sentences — asked as a neighbour against a real PostgREST by
  `docs/checks/10.5b-iii-a-reserving-contract.sh` (its own job in `db.yml`, `itacate-reserving`; its falsifier breaks the file).
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
  ⚠️ **Since `10.5-v-b`, a postal code at her pick** (the owner's answer 5 of 2026-11-05): *Dónde buscar*
  (`(vecino)/donde`, from *Tú* and *Cerca*'s *Cambiar*) sets `@/lib/DondeBuscarProvider` — her location, or
  a code she typed, which then wins over her location until she picks *Mi ubicación* (`@/lib/ubicacion`'s
  `origenDe`); **while she searches from a code her phone is not asked at all** (`useDondeEstoy(activo)`).
  The pick is React state at the root, kept nowhere, the login's own; *Dónde buscar* and *Tú* never ask the
  phone, and the two pages never read the pick (the same census).
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
- **The list is proposal B's, as drawn** (`10.5-iv-a-i`, `(vecino)/(tabs)/index` — *Cerca*, since `10.5-v-b`, the
  first tab — `@/lib/lista`): a card per dish on
  offer (`@/ui/TarjetaPlatillo` — its photo, else her trade's drawing on her colour; her circle; the price,
  the *vale* struck and the saving; *Quedan 2*, *Último*; the window; the distance) and a faded card per
  quiet kitchen (`@/ui/TarjetaCocina` — the owner's words of 2026-11-01, late, as `10.5-v-a` reworded them: *Suele
  tener ofertas entre semana, hacia las 17:00* once 3 publications in 4 weeks show a pattern, else *Publicó ayer*,
  *Publicó el martes*), held word for word by `test/lista.test.ts`. **The order is the owner's answers of 2026-11-05**
  (`10.5-iv-a-iv`, asked on `10.5-iv-a-iii`'s page): it opens on *Ahora* — now, later today, another day, the quiet
  kitchens, nearest first inside each — and *Ordenar* (`@/ui/Ordenar`; a button at the list's head opening a sheet
  since `10.5-v-b`) offers *Más cerca* (nearest first, the order
  until then) and *Más barato*, and nothing else; every kitchen the door sends, an unknown distance last among its
  equals. The orders are `@/lib/lista`'s (`ORDENES`, `ORDEN_INICIAL`, `ordenDe`), her pick the list's state. A window
  that opens or ends while she looks moves its card without asking the door (the cards are made again
  every minute). Since `10.5-iv-b-i` the list slides over the map — the bullet *The map*, below. Since
  `10.5-iv-a-ii` a card opens a page — the next bullet.
- **A kitchen's page and a dish's are proposal B's, as drawn** (`10.5-iv-a-ii`; `(vecino)/cocina/[id]`,
  `(vecino)/platillo/[cocina]/[oferta]/[linea]`, every word and link `@/lib/paginas`', pinned by
  `test/paginas.test.ts`). A dish's card opens its page; a quiet kitchen's card, hers; a dish's page opens
  her page from the kitchen's row, and her page each dish under *Hoy*. ⚠️ **Nothing new is read**: both find
  their kitchen and dish in the door's answer the list holds (in memory), and a window that ends while she
  reads is *Este platillo ya no está en oferta* without asking the door. **Her page's head is Wera Cocina's
  preview of it** (`cocina/src/ui/Portada.tsx`: cover, circle over its edge, name, trade, sentence, *Ver en
  Google Maps ›* in her colour) — what she was shown is what a neighbour sees — then how far she is, where
  and *Cómo llegar*, *Hoy* (else *Hoy no ha publicado* and her pattern; *Por hoy ya se terminó* once she
  published for today and it ended — his words would be false then) and *Lo que suele ofrecer* (the words since
  `10.5-v-a`, held by `test/paginas.test.ts` and `test/palabras.test.ts`). ⚠️ **Both
  links open Google Maps and send nothing of hers**: *Cómo llegar* is Google's Maps URLs (no key, nothing
  billed), to her own pin, else her address as she wrote it — never Google's 30-day copy — with no origin;
  *Ver en Google Maps* opens her link only when `mapsLinkOk` (the database's rule, Wera Cocina's copy)
  takes it. The price, *Quedan* and *Sorpresa* are `@/ui/Precio`'s, drawn alike on the list and both pages.
  ⚠️ **Since `10.5b-iii-a` a dish's page reserves** — the next bullet. ⚠️ **Since `10.5b-iii-b` the stars** (the door's, from
  five ratings) — on a dish's card and a quiet kitchen's beside her name or distance, on a dish's kitchen row (*350 m · ★ 4.8*),
  and on her page *★ 4.8 (23 calificaciones)* with her most given good tags, else *Todavía sin calificaciones* — and her page's
  *Cómo pagas aquí* with a chip per way she takes payment (`@/lib/paginas`' `calificacionDe`, `distanciaYEstrellas`, `pagosDe`;
  the stars in the palette's amber, `PALETTE.estrella`).
  ⚠️⚠️ **Since `10.5-v-c-ii` what each page draws is a component — `@/ui/PaginaDeCocina`, `@/ui/PaginaDePlatillo` —
  handed the kitchen, her trade's name, the distance in words and the clock by its route**, which alone reads (the door,
  `useDistancia`); `@/ui/FilaCocina` takes the distance in words too. **Wera Cocina copies both, with every part they
  draw with** (`@/ui/Atras`, `Circulo`, `Enlace`, `FilaCocina`, `PaginaVacia`, `Precio`, `RenglonPlatillo`, `@/lib/paginas`,
  the door's types, the list's rules for a card's words, `ES.pagina`, `ES.platillo` and those words of `ES.cerca`) into
  `cocina/src/vecinos/`, for *Así la ven* and *Ver como la ven* — and `cocina/test/vecinos.test.ts` holds each copy to
  THESE files: **a change to either page here is copied there in the same PR**, or Wera Cocina's suite is red. Seen on the
  emulator against the local shop the day they moved (2026-11-07): the list, a dish's page, her page from its row, and a
  dish from her page. ⚠️ **Since `10.5-v-d` the list's dish card is copied too** — `@/ui/TarjetaPlatillo`, taking its
  kitchen, offer and dish one by one and the distance in words (the list passes `distanciaTexto`), drawn at the foot of
  Wera Cocina's *Tu oferta de hoy* as she types: the same rule, a change here is copied there in the same PR.
- **Reserving and collecting** (`10.5b-iii-a`; slice 3's design of 2026-11-05 and `10.5b-ii`'s final design of
  2026-11-10). A dish's page says how it is eaten and how she pays at the kitchen, and **its foot is the route's, never the
  page's** (`pie`, a slot `@/ui/PaginaDePlatillo` takes and Wera Cocina's copy leaves empty): `@/ui/PieDeApartar`, *Apartar · $60*
  or why not, chosen by `@/lib/apartar`'s `pieDe`. The sheet (`@/ui/HojaApartar`): her yes once, then how she eats it, her hour
  in quarter hours, how she pays, the total, her code. Every rule in `@/lib/apartar` is one `reserve_plate` also enforces, worked
  out again so the phone offers only what will be taken; the database answers last. ⚠️ **The reservation's id is made on the
  phone** (`@/lib/ids`), new for each changed choice, so a tap sent again after a lost answer is the same reservation — and so
  **her code's hour is the one the database kept under that id**, never only the chip she tapped. ⚠️ **The sheet keeps the dish
  it opened on**: once the LAST plate is hers the door stops sending the dish, and the page must not take her code with it.
  *Apartados* (`(vecino)/(tabs)/apartados`, `@/ui/BoletoApartado`, `@/lib/apartados`): her tickets, a kitchen's cancel while its
  window is open, ⚠️ **a plate that *se liberó* less than a day ago, which keeps its swipe** (`confirm_my_pickup` takes *Ya lo
  tengo* for that day, and it keeps the clock's *No se presentó* off her score), and *Anteriores*. Her reservations are read
  every minute while one is pending, and ⚠️ **her standing (`my_standing`) again whenever what is pending changes** — a handover
  on the kitchen's phone changes her limit. *Ya lo tengo* is a swipe (`@/ui/Deslizar`, `@/lib/deslizar`): how far is Wera's
  slide that sells (`app/src/cart/commit.ts`'s `COMMIT_AT`, read by `test/apartados.test.ts`). *Tú* shows her score from her
  third thumb, rounded down. Both reads are keyed on the login and held in memory only, as every read here.
- **After the plate** (`10.5b-iii-b`; `10.5b-ii`'s final design, *After Ya lo tengo*). **Her stars about the kitchen**
  (`@/ui/Calificar`): under *Ya lo tienes* the moment she swipes, and *Calificar* on a past plate she collected until the day
  after its window (`rate_until`, `porCalificar`); one tap of the stars is SENT AT ONCE (a rating is never lost to a screen she
  leaves), then the tags of their band — the good four after four or five, the other four after one to three (`etiquetasPara`) —
  and a note only Wera reads, sent again on *Listo* (each `rate_kitchen` call sets all three). ⚠️ **A row she opened stays open
  until *Listo***: her tap is saved and her list read again, and the row must not turn into her stars at once (found on the
  emulator). It is not a sheet: *Apartados* is a `Formulario`, so the note stays above the keyboard. Once given, her stars stay on
  the row; the phone never changes them (the database would, until the day after). **The terms of use are accepted with her yes**
  (`@/ui/HojaApartar`: *Aviso de privacidad* and *Términos de uso* above *Acepto y sigo*), before her first reservation and so
  before any rating; her yes keeps its moment (`0080`) — whether that is the record he wants is his question (the plan's
  decisions block). **Her reminder, 15 minutes before her hour** (`@/lib/recordatorio`, pure; `@/lib/avisos`, the one module that
  imports `expo-notifications`; `@/lib/Recordatorios`, mounted with the tabs): her phone holds one per reservation still to
  collect whose hour has not come, ⚠️ **kept by id** — at each read of her reservations those no longer wanted are cancelled and
  the new ones still ahead scheduled, never "cancel all, schedule again", which would cancel one Android has not delivered yet
  (the review of `10.5b-iii-b`); all cancelled when the tabs leave; shown while Itacate is open too (`mostrarRecordatorios`, ours
  only); a tap opens *Apartados*. ⚠️ **What it cannot know:** a plate the kitchen hands over while her app is closed keeps its
  reminder until her next read — nothing reaches her phone (no push to neighbours). ⚠️ **Its words — the kitchen, her hour, her
  code — are held by her phone's scheduler** until it shows or is cancelled: the one thing of a read this app leaves on the disk,
  by the design's ruling (the aviso says so before Itacate reaches people, `10.5b-vi`). Asked after a
  reservation goes through, while the phone still lets Itacate ask — ⚠️ **never "only while undetermined"**: on Android 13 and
  later `expo-notifications` 57.0.17 reports a permission never asked as `denied`, and such a check never asked (found on the
  emulator). ⚠️ **Android 12 and later deliver it late, never early**: an inexact alarm, its window three quarters of the time
  until it, up to an hour (`dumpsys alarm` on the emulator: 9:45, 10:00 and 10:15 with windows of 5, 16 and 28 minutes); the
  exact-alarm permission is native (`10.8`). **`TD014` has its sentence** on *Eliminar mi cuenta* (`deleteErrorMessage`): a plate
  still to hand over at a kitchen that would go with her account.
- **The map, with the list sliding over it** (`10.5-iv-b-i`; the owner's answer 4 of 2026-11-05, *C*, as the family-shell
  page draws *Cerca*). *Cerca* is two layers: **Google's map, the whole screen** (`@/ui/MapaDeCocinas`) — every kitchen the
  door sends as a pin in her colour with her trade's drawing, faded when quiet, wherever she moves it (his ruling of
  2026-11-04, night); pins nearer on her screen than a pin is wide as one grey circle with how many it holds, until she zooms
  in (his of 2026-11-03), a tap coming closer — or, for kitchens on one spot, showing them all — and her dot at the list's
  point, her location or her postal code's centre (his answer 5) — and **the sheet** (`@/ui/HojaDeLista`): the head that was
  *Cerca*'s head, then the list, at three heights, opening half-way; the handle and the head move it (a tap: half-way, or full
  from half-way), the list scrolls inside it at every height and keeps its pull. Every rule is `@/lib/mapa`'s, pure, pinned
  by `test/mapa.test.ts`. ⚠️⚠️ **Google's map on both phones** (`PROVIDER_GOOGLE`; Google's points only on Google's map,
  3.2.3(e)). ⚠️ **Her dot is Itacate's marker**, never Google's *My Location* layer (`showsUserLocation={false}`): the map is
  handed the point and never asks the phone. ⚠️ **Google's logo stays in sight**: the map's padding puts its foot at the
  sheet's top (`paddingDelMapa`), and nothing of ours sits at the map's foot. ⚠️ **It flies to her only when where she
  searches from changes** (`claveDeOrigen`), never as she walks. A pin she taps puts that kitchen's cards first, under *En el
  mapa*, with *Quitar*. Declined or outside the zone: the map over the city beside the postal code's box in the sheet, which
  rises full as she types. ⚠️ **The padding reaches the map only once it is ready** (`10.5b-iii-b`): until `onMapReady` it
  keeps the padding it mounted with, since `react-native-maps` 1.27.2's `applyBaseMapPadding` calls Google's `map.setPadding`
  with no null check — a red screen twice on the emulator when the sheet moved before Google answered (`10.5b-iii-a`).
  **Nothing is cut off by distance** — the 1.5 and 3 km limits wait for Google's reply
  (`10.5-iv-b-iii`). ⚠️ **To see it**: a build made on this Mac draws an inert Android map (no key: no marker, no camera),
  but **an iPhone Simulator debug build with the organization's iPhone key in the shell draws Google's map with every pin**
  — the key is locked to `mx.wera.vecino`, which the Simulator sends (`10.5-iv-b-i`): `npx expo prebuild -p ios --clean`,
  `RCT_USE_PREBUILT_RNCORE=0 RCT_USE_RN_DEP=0 pod install`, `xcodebuild … -sdk iphonesimulator`, Metro with the local
  proxy's `https://localhost:54443` (`simctl keychain … add-root-cert` its `cert.pem` — this app refuses an `http` URL), and a
  local neighbour's session written into the app's `Documents/SQLite/ExpoSQLiteStorage` (`sb-localhost-auth-token`). The
  generated `ios/` then holds the key: `prebuild --clean` again without it afterwards. The Simulator takes no taps while the
  Mac's screen is locked; the Android emulator takes `adb` swipes for the sheet.
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
  `eas-pre-install.sh`, which refuses an Android store build without the file or the Android key, and
  since `10.5-iv-b-i` an iPhone store build without the iPhone key). **Both keys go into
  `react-native-maps`' options** (the iPhone's since `10.5-iv-b-i`: its presence — the placeholder at worst
  — compiles Google's map into every iPhone build, as Google's points require) **and into `extra.google`**
  (`10.5-iv-a-i`), where her phone's questions to Google read their own (`@/lib/useGoogle`). **None enters
  the runtime** — `fingerprint.config.js` removes both keys from the map's options, the iPhone's icon path
  (`ios.icon`, whose FILE is still hashed, for the iPhone alone) and **the whole of `extra.google`**
  (removed, not masked as Wera Cocina's are: the config is hashed as one text for both platforms, and a
  masked key would still be new text in Android's hash), and ignores the file; `test/runtime.test.ts`
  computes the runtime with and without them, and pins Android's to the one Itacate's test build in the
  field carries (`4de35b0b…`, build `2b638d21`) — and, since `10.5-iv-b-ii`, the iPhone's (`a46650e4…`, build `282cfb7d`) — **measured unchanged with the iPhone's key and icon in the
  config (`10.5-iv-b-i`), so the map reached that build as an update.** A new value read from the
  environment into the config joins that file and that test, and the update runbook's list.
- **Ship an update only through the runbook, which computes the runtime the way the build does** —
  `bash docs/runbooks/ship-an-update.sh preview "…" --app itacate`, run on `main` after a green merge
  (`10.5-iii-a`, its first; `production` since `10.5-iii-b`, his); its rehearsal in `app.yml` holds the
  `--app itacate` cases. Never a bare
  `eas update`. ⚠️ **Its test builds are two**: Android's `preview` APK (`2b638d21`, from `10.2b`; EAS
  keeps it to 2026-11-11, installed copies keep working) and, **since 2026-11-09, the iPhone's** (`282cfb7d`,
  1.0.0 build 2, `10.5-iv-b-ii` — made by the owner's command at Terminal.app, for its signing profile, and on
  his iPhone); an update reaches both, and `test/runtime.test.ts` pins both runtimes. The iPhone store build of
  `10.2b` (`e3100436`) was never installed anywhere. The bundle reads
  five values — the database's two and the support number, which this project holds in `preview`, and
  in `production` once his command has run again (`10.5-iii-b`), and since `10.5-iv-a-i` Google's two
  keys through `extra`, the organization's variables in both environments; a new `EXPO_PUBLIC_` value, or
  a variable the config hands to `extra`, joins the runbook's list for `--app itacate`, held by
  `test/support.test.ts`.
- **`ios/` and `android/` are generated by `expo prebuild` and gitignored. No workflow compiles
  this app**: `cocina-itacate.yml` is a typecheck and the suite. A device build is the evidence
  for anything native.
- **The icon is the cow on Itacate's blue** (the owner's ruling of 2026-11-05, the family-shell page's call 6), on both phones:
  Android 8 and later draw it from Wera's mark files (`../app/assets/images/`) on `adaptiveIcon.backgroundColor`, and
  ⚠️ **the iPhone from `ios.icon` — `assets/images/icon.png`, since `10.5-iv-b-i`**, drawn by `render.sh itacate-icono`,
  1024 with no alpha channel (`test/icon.test.ts`). **The top-level `icon` stays Wera's file**: it is also Android's
  launcher icon below Android 8, and changing it would move Android's runtime. The launch screen is still Wera's
  cow on cream.
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

## Screens — the family shell (ruled 2026-11-05, built by `10.5-v-b`)

The owner ruled how the two apps are arranged and worded on 2026-11-05 (`docs/PLAN.md`, rows `10.5-v-a` to `10.5-v-d`
and `10.5b`; the drawn reference is the family-shell page in his private notes' `diseno/`). Every screen built here
follows it, as `cocina/CLAUDE.md`'s does:

- **The tab bar is *Cerca · Apartados · Mis cocinas · Tú*** — four tabs at most, each with its word; the two ends never move; a tab appears only when
  its feature ships; a new feature arrives first as a card on *Cerca*. Wera's JavaScript tabs, not native tabs. ⚠️ **Built by `10.5-v-b`**:
  the tabs are data (`@/navigation/pestanas` — a tab not yet in use names the row that brings it: *Apartados* is in use since `10.5b-iii-a`, *Mis cocinas* waits for `10.9`), the bar is drawn by
  `@/ui/Pestanas` on `expo-router/js-tabs` (the tab in use: blue, a heavier word and a pill of the blue's tint — ⚠️ the other pills the bar's
  white, never `transparent`, since `10.5-v-c-i`: Android squared every pill after the first switch), and `(vecino)/(tabs)/` holds
  exactly the tabs in use — `test/pestanas.test.ts` refuses a screen there that is not one. A tab draws `@/ui/Cabeza` (no *Volver*: a tab is
  never closed); a kitchen's page, a dish's and *Dónde buscar* are pushed over the tabs from the root's stack, with `@/ui/Banda`'s *Volver*.
- **No word that makes the food sound left over** where a fonda or a neighbour reads (*lo que sobra*, *sobrante*,
  *restos*, *desperdicio*): *Publicar una oferta*, *Tu oferta de hoy*, *aprovechar*, *Por hoy ya se terminó*, *Se liberó*.
  `test/palabras.test.ts` refuses them in `src/strings.ts` since `10.5-v-a` — Wera's *Merma* only in the one line
  that names it to a shop's owner.
  **No sentence saying there are no penalties**: a reservation is drawn as a handover — the hour, how she pays, the code.
- **The look:** titles in Nunito ExtraBold (`expo-font`); Itacate's blue `#24476B` for actions; Wera's terracotta `#A9501C` for
  promotions only; state first, before anything tappable (ADR-035 §2.8); one staggered entrance per screen, transform and
  opacity only (§2.11). ⚠️ **Built by `10.5-v-b`:** `@/theme/letra` and `src/marca/letras/` are Wera's file and font byte for byte,
  loaded by the root before the first screen (the phone's face if the load fails); `PALETTE.accion` is the blue, held to `app.json`'s
  icon ground; the motion's numbers are `@/theme/movimiento`'s, drawn by `@/ui/Llega` (a screen's first blocks, once, on mount),
  `@/ui/Hoja` (a sheet's spring), since `10.5-iv-b-i` `@/ui/HojaDeLista` (the list sliding over the map) and since `10.5b-iii-a`
  `@/ui/Deslizar` (*Ya lo tengo*'s swipe) — **the only four modules that import Reanimated**, their animated styles `opacity` and
  `transform` alone (`test/pestanas.test.ts`); the last two are the only modules with a gesture (`react-native-gesture-handler`,
  its root in `app/_layout.tsx`). Reanimated's native half was in this app's first build (`libreanimated.so` and `libworklets.so`
  read inside the test build's APK) and Expo's Babel preset adds its worklets plugin by itself; `10.5-v-b` is the first JavaScript to
  use it in any of the three apps. ⚠️ **The two pages keep their look** (their head is Wera Cocina's preview, `cocina/src/ui/Portada.tsx`)
  until Wera Cocina's shell (`10.5-v-c`) gives both apps' copies Nunito.
- **Money:** no screen stores or shows a bank account, a card or an amount paid — only how she will pay.
