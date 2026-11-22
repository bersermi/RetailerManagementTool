# `cocina/` — Wera Cocina, the fondas' app

Loads when a session touches `cocina/`. Lane **Cocina** of `docs/PLAN.md`'s Step 10: a fonda
publishes her surplus meals (*itacates*, `10.4`) and reserves shops' offers (`10.6`). A fonda is a
**workspace**, like a shop (ADR-035 §2.3); what a buyer reads goes through §2.7's one door.
Since the owner's ruling of 2026-11-22 (Step 13) its sentences call the neighbours' app **Wera** (once
*Itacate*) and the shop app **Wera Tienda** — `test/palabras.test.ts` holds it; keys such as `enItacate`
and the comments keep the old word. The root `CLAUDE.md` holds what is not app-only; **nothing checks this file**, so it carries
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
bash docs/checks/10.5-i-a-kitchen-photos-contract.sh   # the same stack WITH Storage started before the reset: her page and the bucket `cocina`, by this app's names — what a neighbour opens, what her kitchen deletes (`0090`)
bash docs/checks/10.5b-iv-a-handover-contract.sh      # the same stack: her kitchen's reservations, who reserved each, the handover and her thumb, by apartados.ts's names — and her queue's claims, by cola.ts's; and her kitchen's sealing secret, by sello.ts's
bash docs/checks/10.5b-iv-c-settings-contract.sh      # the same stack: her settings, her stars, each dish's ways, − and +, and the read before a deletion, by ajustes.ts', calificaciones.ts', listing.ts' and account.ts' names
bash docs/checks/10.9a-i-features-contract.sh         # the same stack: what her kitchen uses, Wera's switch, Cuéntanos, and the door's word on it, by servicios.ts' names and Itacate's
bash docs/checks/10.9b-ii-team-contract.sh            # the same stack: a helper joining by her owner's code (invitar.ts' names), her role, who works at her kitchen, Quitar and Salir (equipo.ts') — as a real owner and a real helper
bash docs/checks/10.9d-i-following-contract.sh        # the same stack: Te siguen N by seguidores.ts' names, as the fonda, beside Itacate's following
bash docs/checks/10.9e-i-card-contract.sh             # the same stack: the loyalty card by tarjeta.ts' names — Activar, a phone's code, a scan, a stamp, a reward, Cerrar — beside Itacate's
bash docs/checks/10.9f-numbers-contract.sh            # the same stack: her numbers by numeros.ts' names, as the owner, after a plate reserved in Itacate and handed over here — one visit
bash docs/checks/10.9g-i-promotions-contract.sh       # the same stack: promotions by promociones.ts' names — made, three at once, ended, undone — an offer joining one by listing.ts', the door's band by Itacate's; and `0094`'s alert to her followers, dark and on
bash docs/checks/10.5b-v-ii-push-contract.sh          # the same stack: her phone's messages by push.ts' names — this phone's token stored and retired, her kinds by every key, her switch, a tap counted with nobody kept (nothing is sent)
bash docs/checks/10.5c-iii-consent-contract.sh        # the same stack: her answer to Novedades on the sheet's version (refused until the runbook's on 1 approves it), a campaign's tap
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
  `docs/checks/10.5b-iv-c-settings-contract.sh` and its falsifier (its own job, `cocina-settings`). ⚠️ **Since `10.9a-i`, `src/api/servicios.ts`** —
  `0081`'s `my_kitchen_features`, `set_kitchen_features` and `send_menu_request`, every argument and key of their one answer, the four features,
  the three states and `TD024` — is asked by `docs/checks/10.9a-i-features-contract.sh` and its falsifier (its own job, `cocina-features`), with
  the door's `features` by Itacate's names. ⚠️ **Since `10.9b-ii`, `src/api/equipo.ts`** — her role (`my_role`), the memberships' table, its
  columns and the filters the owner's list and *Quitar a …* send, and `leave_kitchen` with `TD025` — is asked by `docs/checks/10.9b-ii-team-contract.sh`
  and its falsifier (its own job, `cocina-team`), as a real owner and a real helper (the section *Helpers* below) — ⚠️ and since `10.9b-iii`
  `src/api/invitar.ts` too (`0083`'s `invite_helper` and `kitchen_of_code`, `redeem_invite`, every argument and key of their answers, `TD005`
  and `TD003`), the same check's second file: the helper joins by her owner's code. ⚠️ **Since `10.9d-i`, `src/api/seguidores.ts`** — `0084`'s
  `kitchen_followers` (*Te siguen N*: any member reads it, a count of followers and never who) — is asked as the fonda by
  `docs/checks/10.9d-i-following-contract.sh` beside Itacate's `siguiendo.ts` (its own job, `itacate-following`). ⚠️ **Since `10.9e-i`,
  `src/api/tarjeta.ts`** — `0085`'s seven for the loyalty card: `set_card_terms` and `close_card` (the owner's, `42501` for a helper),
  `kitchen_card` (the counts and today's lines), `register_kitchen_key` (this phone's secret, handed once), `card_of_code`, `give_stamp`
  and `give_reward` (any member; a scan from the queue carries its moment, `p_at`, up to 7 days back) — every argument and key, `TD027`;
  a scan is ANSWERED with a `result`, never refused. Asked against a real PostgREST by `docs/checks/10.9e-i-card-contract.sh` beside
  Itacate's (its own job, `loyalty-card`; its falsifier breaks the file), held to `0085`'s text by `test/tarjeta.test.ts`. ⚠️ **Since `10.9f`,
`src/api/numeros.ts`** — `0086`'s `kitchen_numbers` (the owner's: `42501` for anyone else, `TD013` a shop), its argument and every key of its
answer at three levels — is asked by `docs/checks/10.9f-numbers-contract.sh` and its falsifier (its own job, `cocina-numbers`), after a plate
reserved through Itacate's names and handed over through this app's, its stamp and its reservation one visit — and since `10.9l` the
card's figures in the same answer (`0091`), that one stamp counted as given at a handover; held to `0086`'s and `0091`'s text by
`test/numeros.test.ts` (the section *Her numbers* below). ⚠️ **Since `10.9g-i`, `src/api/promociones.ts`** — `0087`'s four for
promotions: `kitchen_promotions` (any member: a helper publishes and *Publicar* asks her which runs), `create_promotion`, `end_promotion`
(*Terminarla hoy*) and `undo_promotion` (*Deshacer*, two minutes) — the owner's, `42501` for a helper — every argument and key of their one
answer, `TD029` (three at once), `TD030` (*Para tus clientes* with no card), `TD032` (too late to undo) — ending or undoing one not there answers her list — and since `10.9h-ii` `0094`'s two for *Avisar a quienes te siguen*: `promotion_alert_offered` (any member; `true` only while the kind `promocion_cocina` is on — dark until his product analyst rules) and `alert_promotion` (the owner's, once; `{offered, alerted}`, never how many); and `src/api/listing.ts`'
optional `p_promotion_id`, sent only when she picks one (`publish_listing`'s sixth, defaulted; `TD031` when it cannot join). Asked against
a real PostgREST by `docs/checks/10.9g-i-promotions-contract.sh` beside Itacate's door (its own job, `promotions`; its falsifier breaks the
three files), held to `0087`'s text by `test/promociones.test.ts`. ⚠️ **Since `10.5b-v-ii`, `src/api/push.ts`** — `0092`'s five: `register_push_token` (this phone's token on each open, its channels and those she silenced, the token it replaces), `retire_push_token` (*Cerrar sesión*), `my_notification_kinds` (each kind's channel, its switch's words, what a tap opens, her switch), `set_notification_switch` (service kinds only) and `count_notification_tap` — every argument, the app's name, its kind and every key of a kind; asked against a real PostgREST by `docs/checks/10.5b-v-ii-push-contract.sh` and its falsifier (its own job, `cocina-push`), held to `0092`'s text by `test/push.test.ts`. What the phone does on each open is `@/lib/useAvisosDelTelefono`'s (the rules `@/lib/avisosPush`'s, the phone's calls `@/lib/avisos`'): ⚠️ asking Expo for the token makes the phone announce it, so only a DIFFERENT token counts as a change (measured on the emulator — the first version looped and never registered). ⚠️ **Since `10.5c-iii` a permission granted from a screen** (*Mi cocina*'s switch, her reminder's question, the *Novedades* sheet) **runs those steps at once** (`@/lib/avisos`' `alConcederPermiso`) — Android's dialog is no open, and until then such a phone reached the database only at the next one (found on Itacate's emulator). ⚠️ **And `0093`'s three** in the same file: `my_consent`, `set_my_consent` (her answer to *Novedades de Wera Cocina*, given only on the sheet's version `PALABRAS` = `cocina-hoja-1`, which the runbook's *on 1* inserts — refused with 22023 until then) and `count_campaign_tap` — asked by `docs/checks/10.5c-iii-consent-contract.sh` (its own job, `campaigns-in-the-apps`, and its falsifier), the sheet's words held to the runbook's by `test/push.test.ts`. *Novedades* is drawn in *Mi cocina* only while a promotion kind comes in her kinds (`novedadesDe` — his test accounts until the analyst turns it on): on opens `@/ui/HojaOfertas`, off is her no; the sheet also rises once when she leaves *Entregar* after a handover (`@/lib/ofertas`' `hayQuePreguntar`), its words a draft for the analyst. A tap opens what its kind says (`@/lib/avisosPush`' `RUTAS`, anything else nothing — since `10.5c-iii` still counted): *Apartados*, and since `10.9h-ii` *Publicar* for the nudge to a kitchen with no offer yet (`0094`'s `primera_oferta`, *¿Tienes alguna oferta?*, at 12:00 on her kitchen's second day) — whose switch *Mi cocina* draws from its row, as every service kind's. **Drawn since `10.9g-ii`** — the section *Promotions* below; Wera's
switch `promociones` keeps them off for everyone. The code on
  *Sellar* is `src/lib/codigo.ts` — HOTP over the minute in plain TypeScript (no crypto package: a dependency moves Wera's runtime),
  held to RFC 4226 and RFC 6238 by `test/codigo.test.ts`, and Itacate's copy to it by `itacate/test/gemelos.test.ts`. **Drawn since
  `10.9e-ii`** — the section *The loyalty card* below. ⚠️ **Drawn since
  `10.9d-ii`** (`useSeguidores`, never on the phone's disk): *Te siguen 38 vecinos* on *Hoy*'s day's card, on offer or not, from the first
  follower (`@/ui/DiaDeHoy`' `teSiguen` — `null` while unread or with no signal draws nothing, never a 0 that is not one); and before
  *Eliminar esta cocina* — and *Eliminar mi cuenta* when the kitchen open here goes with it — *Te siguen 12 vecinos en Itacate. Dejarán de
  ver tu cocina, y durante 30 días su lista dirá que dejó Itacate.* (`@/ui/Salidas`), warned and never blocked (G23). Itacate's kitchen
  page takes *Seguir* as a slot (`seguir`), and `vecinos/ui/PaginaDeCocina.tsx` carries the slot code for code and hands it nothing —
  ⚠️ as, since `10.9e-iii`, the loyalty card's (`tarjeta`, her card or the kitchen's invitation after *Hoy*), the list card's mark of her
  card (`vecinos/ui/TarjetaPlatillo.tsx`' `marca`, *3/8*) and the door's `Kitchen.tarjeta` (`comoLaVen` sets it `null`): Itacate's to fill,
  never drawn here — *Así la ven* is the page with no neighbour's card on it, and the card's own screen shows her how it looks. Her choices are **per kitchen, never per phone**: every member reads them, only the owner writes them
  and what she tells Wera about the menu; a feature Wera has switched off (`available`) is offered nowhere and refused `on`; a feature or a state
  this build does not know is left out (`loQueUsaFrom`). Read by `useServicios`; written since `10.9a-ii` by `useElegirServicios` and `useContarMenu` (the section *Her choices* below). ⚠️ **And a kitchen's place is read by the kitchen's id**
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
  `docs/runbooks/delete-orphan-photos.sh` deletes them — the aviso promises within 30 days. ⚠️ **Since `10.9i-ii`
  (`0090`) a photo is opened outside her kitchen only while Itacate shows it, and her kitchen deletes one nothing
  names**: after *Guardar* lands, the cover or logo it replaced or removed (`picturesToDelete`, from the page the
  database answered); after *Deshacer*, the undone promotion's photo, once it is gone from her list — both through
  `deletePictures`, one call, never waited on and never throwing (the database refuses whatever something still names,
  and the runbook takes what is left after a day). A dish's photo is never deleted here: every offer keeps naming it.
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
  `my_kitchen_ratings`, never the door); ⚠️ and since `10.9a-i` **what the door says she uses** (`servicios`: `@/api/servicios`' `enLaPuerta`,
  from her own `my_kitchen_features` — the card and promotions she uses, never her numbers — `[]` while unread); ⚠️ and since `10.9g-iii`
  **her promotions a neighbour sees** (`promocionesVistas`: her own `kitchen_promotions`' running and `shown`, newest first — the door's
  order; read only while she uses them, `seLeen`), each offer's mark from her list's `promotion_id` while its promotion is one of them, and
  *seen* while one is shown though she published nothing in 14 days (`seVeEnItacate`'s third argument, `0087`'s door). Unread, each part is the door's default (`SIN_AJUSTES`, held to its `coalesce`s by
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
  air. ⚠️ **Since `10.9c` (2026-11-18) the build also carries a camera module that scans a code — `expo-camera`
  57.0.6 — and printing and sharing — `expo-print`, `expo-sharing`, at Wera's ranges** (the loyalty card's *Sellar*,
  a helper joining, the counter poster). `app.json`'s ONE camera sentence names both uses and is written by two
  plugins (`expo-image-picker`'s and `expo-camera`'s): an iPhone shows whichever ran last, so
  `test/identity.test.ts` holds them to one string. Never the microphone (`recordAudioAndroid` and
  `microphonePermission` off). **No location**: a fonda's pin is set on a map, and `app.json` blocks the location
  permissions even if a library declares them. A module missing at the public release waits for
  the major update (`10.8`); before it, one more build — `10.4d`'s, which carries the phone's own
  geocoder (`modules/geocodificador`).
- ⚠️⚠️ **A dependency here never moves a version Wera uses.** This folder shares Wera's
  `node_modules`. A module Wera also has takes **Wera's exact range** from `app/package.json`; a
  new native module is pinned to the **newest patch whose dependencies Wera's installed tree
  already satisfies** (`npm view <pkg>@<v> dependencies`). Measured 2026-10-27:
  `expo-notifications` 57.0.24 upgraded `expo-constants` and moved Wera's runtime on both
  platforms; 57.0.17 fits. After any install, the root lockfile's diff must only **add**
  entries, and `docs/checks/wera-runtime.sh` (in `app.yml`) must pass. ⚠️ **Measured again 2026-11-18
  (`10.9c`): `npm install expo-print@~57.0.2 expo-sharing@~57.0.22 -w @tienda/cocina` — Wera's own ranges —
  fetched the newest patches and CHANGED Wera's hoisted `expo-sharing`, `@expo/config-plugins`, `@expo/plist`,
  `xcode` and dropped `uuid`.** A module Wera already has goes in by writing its range into this
  `package.json` by hand and running `npm install` with no package named: npm then keeps the locked copy.
  Compare the lockfile's entries before and after (a few lines of `node` over `packages`), not `git diff --stat`.
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

- ⚠️⚠️ **RE-RULED 2026-11-16 AND 17 — THE MVP RUNS THROUGH THE FAMILY SHELL'S STAGE 4, BUILT BY `10.9a`–`10.9h`**
  (`docs/PLAN.md`; the family-shell page redrawn the same day). **The bullets below describe what is built until each row
  lands**; what changes here: the first run loses *¿Qué ofreces hoy?* — *Paso 3 de 3* becomes *¿Qué más quieres usar?*, the
  features she picks, nothing pre-checked — and forks after her account into *Registrar mi cocina* / *Unirme a una cocina*
  (`10.9a`, `10.9b`); **three tabs for every kitchen**, *Clientes* gone (`10.9a`); *Hoy* gains a half-width tile per feature
  she uses, in a fixed order, and *Tu página · 4 de 5* gives way to one quiet nudge line (`10.9a`, built by `10.9a-iii`); *Mi cocina* gains *Lo que
  usas* and *Quién trabaja aquí* (`10.9a`, `10.9b`); **a helper — the database's *staff* — publishes and hands over**
  (`10.9b`; the database lets her since `0082`, `10.9b-i`: `publish_listing`, `withdraw_listing`, `set_listing_quantity` ask `staff` at a
  kitchen, and `leave_kitchen` is *Salir de esta cocina*; her screens built by `10.9b-ii` — the section *Helpers* below —, joining by a code built by `10.9b-iii` — ruled 2026-11-18: a code for one person, good for 24 hours, no address asked, joining at once; the section *Joining* below); a camera module to scan, and printing and sharing for the counter poster, arrive with a new store build
  (`10.9c`). A service never lives in two places: its tile on *Hoy* opens its one screen. ⚠️ **`10.9a` split in three on 2026-11-17**: the database
  and both apps' claims (`10.9a-i`, built — `@/api/servicios`), the first run's third step and *Lo que usas* (`10.9a-ii`, built — the section *Her
  choices* below), *Hoy*'s tiles and the nudges (`10.9a-iii`, built — the section *The nudges and the firsts* below).
- **The first run** (`10.5-v-d`, the family-shell page's): a stranger is sent to the opening (`(auth)/hola`, `@/auth/guard`),
  Wera's `8g` opening in Cocina's green (`@/ui/Apertura`, `@/theme/apertura` — starts on the splash's own frame, ends on the
  icon's picture, both read off `store/cocina-itacate/render.sh` and `app.json` by `test/primera.test.ts`; once per phone,
  `OPENING_KEY`; on Android after the splash's 400 ms fade, measured on the emulator). Wera's cream cow, byte for byte,
  drawn green by tint. ⚠️ **The splash is held from the root's module** (`@/lib/splash`, Wera's) until the opening's
  pictures are in, or `Gate` has nowhere to send her. Then *Crear cuenta* / *Ya tengo cuenta*, her account, ⚠️ since `10.9b-iii` the
  fork *¿Qué quieres hacer?* (`/empezar`: *Registrar mi cocina* or *Unirme a una cocina* — the section *Joining* below), *Paso 1 de N*
  (name and trade), *Paso 2 de N* (her address), and — ⚠️ **the guard sends a kitchen made in the sign-up on, never straight
  to *Hoy*** — since `10.9a-ii` (G32, ruled 2026-11-17: no first offer inside the first run) to *Paso 3 de 3*, *¿Qué más quieres
  usar?* (`/que-mas`), while this build carries a feature to pick, else at once to `/ya-estas`, her page as Itacate draws it
  (titled *Tu cocina ya está en Itacate* only while the door would send her), then *Ir a Hoy*. ⚠️ **N is the build's** (`@/lib/
  loQueUsas`' `pasos`): 3 since the card was built (`10.9e-ii`; 2 before — the section *Her choices*). *¿Qué ofreces hoy?* (`/que-ofreces`) was the third
  step from `10.5-v-d` to `10.9a-ii`. Android's back on the last two leaves for *Hoy*; nothing of the first run is kept on the
  phone, so a restart opens *Hoy*.
- **The tab bar is *Hoy · Apartados · Mi cocina*, the same for every kitchen** (his arrangement A, 2026-11-16; it said *Hoy · Apartados · Clientes ·
  Mi cocina* until then) — four tabs at most, each with its word; the two ends never move; a service lives as a tile on *Hoy* and its own screen,
  never as a tab. Wera's JavaScript tabs, not native tabs. ⚠️ **Built by `10.5-v-c-i`**, Itacate's
  shell copied: the tabs are data (`@/navigation/pestanas`, *Apartados* in use since `10.5b-iv-a`; *Clientes* out of the data since `10.9a-ii`), the bar is `@/ui/Pestanas` (the tab
  in use: green, a heavier word and a pill of the green's tint — ⚠️ the other pills the bar's white, never `transparent`: Android squared every pill
  after the first switch), and `(cocina)/(tabs)/` holds exactly the tabs in use. *Tus ofertas*, *Publicar*, her page's editor and her address's
  screens are pushed over the tabs. ⚠️ **Google's point for her address is asked again from the tabs' layout**, always mounted — *Mi cocina*,
  which draws the small map, mounts only when she opens it.
- ***Hoy* is a hub** (his directions of 2026-11-06, `10.5-v-c-i`): the day's card (`@/ui/DiaDeHoy`), *Publicar una oferta* with her last day's
  offers as one-tap *Repetir* chips (`@/lib/useRepetir` — the form opens instead whenever it would not send the same thing untouched), and —
  since `10.9a-iii` — a tile per feature she uses (`@/ui/Mosaicos`) where *Tu página · 4 de 5*'s door was (`@/ui/Puertas`, `10.5-v-c-i` to
  `10.9a-iii`), with at most one quiet line under the day's card (the section *The nudges and the firsts*). Nothing on it is edited in place. What every
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
  promotions and for what waits for her — an order's *pronto* and dot (`10.5b-iv-a`), a tile's dot and *Falta* (`10.9a-iii`) — never an action; state first, before anything tappable (ADR-035 §2.8); one staggered entrance per screen (`@/ui/Llega`, Itacate's), transform and
  opacity only (§2.11) — `test/pestanas.test.ts` lets Reanimated into `@/ui/Llega`, `@/ui/Nota`, since `10.5-v-d`
  the opening's `@/ui/Apertura` and, since `10.9a-iii`, *Publicar*'s glow `@/ui/Brillo` alone (`scaleX` and `scaleY` count as the transform).
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

- **Her reads kept on the phone** (`@/api/persist`, pinned by `test/persist.test.ts`): her kitchens, her offers and her
  reservations — today's and later's, the 30 days before, who reserved each (the neighbour's short name and score, while the order
  waits or waits for its thumb) — ⚠️ and since `10.9b-ii` a fourth, her role at each kitchen (`['cocina','rol']`); ⚠️ since `10.9e-ii`
  what her kitchen uses (`['cocina','servicios']`) and her card's counts and today's lines (`['cocina','tarjeta']`) — the card's tile on
  *Hoy* is the door to *Sellar*, whose code works with no signal. Nothing else. ⚠️ **TanStack's own `hydrate` as the client is built**, from the phone's synchronous
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
  `expo-network`** — ⚠️ since `10.9j-ii-a` **Itacate copies `@/lib/connectivityMonitor`, `@/lib/useSenal`, `@/api/cola`'s `FlushStop`,
  `Drenado` and `CODIGOS_DE_SESION`, and `ES.cola.sinSenal`/`sinDatos`** for her *Ya lo tengo* with no signal, held code for code by
  `itacate/test/gemelos.test.ts`: a change here is copied there in the same PR: a listener plus a poll plus the app-state wake, a drop believed after two seconds, a retry ladder that outlasts the
  auth layer's 90 seconds. It drains her queue and is handed to TanStack's `onlineManager` (a read with no signal waits with its copy).
- **What the counter says** (`@/ui/SinSenal`, on *Hoy*, *Apartados* and *Entregar un apartado*): *Sin señal. Lo que ves se leyó a las
  13:05.* and *2 entregas y 1 calificación por enviar* with Wera's *Todavía están en este teléfono. Se envían solas cuando vuelve la
  señal.*; under *Entregado*, *Guardada en este teléfono. Se envía sola cuando vuelve la señal.*; and with no signal a code not on the
  phone is *Ese código no está en tus apartados de las 13:05. Sin señal no llegan los nuevos.* — never *Pídeselo otra vez* alone.
  A refusal that comes back later is drawn on its order (`rechazoDe`, a day).
- ⚠️⚠️ **Her ticket's QR, checked on this phone** (`10.9j-ii-b`; the owner's J2 and J3 of 2026-11-20; `@/api/sello`, pure, pinned by
  `test/sello.test.ts`). Every reservation still to collect carries a SEAL (`0088`): fourteen `|`-fields of printable ASCII — the order,
  the kitchen, the code, her hour, the dish's name percent-encoded, never her name — and an 80-bit HMAC-SHA1 under her kitchen's secret.
  **The secret is a read kept on the phone** (`kitchen_seal_keys` by `useLlavesDeSello`, mounted in the tabs' layout; `['cocina','sello']`
  on `@/api/persist`'s list): the current one, and a retired one until its `until` — a new one is made whenever someone stops working
  there. ***Escanear su código*** sits on *Entregar*'s keypad, always (`@/ui/Escaner`, the card's camera, opened on her tap): `leerSello`
  reads the QR's text, `revisarSello` checks it — this kitchen's, a version this phone holds and may still use, the MAC over the text AS
  SCANNED (`@/lib/codigo`'s `hmacSha1`) — and anything else stays *Ese código no es de un apartado de tu cocina.*; a version newer than
  this phone's, with signal, reads the secrets again and checks the same scan once more. An order the phone has read is drawn as if
  typed; ⚠️ **one it never read is drawn FROM THE SEAL** (`reservaDeSello`, `ordenDeSello`: what to prepare and charge, its day, *Revisado
  en este teléfono*, *Su nombre y su calificación aparecen cuando vuelva la señal.*) and handed over by id from her queue as any — the
  next read brings the order itself. **J3:** a typed code the phone never read is never handed over; with no signal the keypad says
  so and the QR is the way. `test/entregarSello.test.ts` pins the screen's rules in its source. ⚠️ **Held to the database by a seal it
  made**: `test/sello-de-la-base.json` (`0088` on a local stack, its `made_by`) is read field for field and its MAC checked with the
  secret the database handed a helper's phone; the shape is read out of the migration that defines `reservation_seal` last; the handover
  check's group 14 asks a real PostgREST for the secret by this file's names. ⚠️ **No device has seen *Escanear su código* yet** — it
  reaches phones with the final MVP version (his ruling of 2026-11-19); to see it on the emulator: a debug build carrying the camera
  (`10.9c`), the local shop, a reservation made through Itacate's names, its `seal` drawn as a QR (`@/lib/qr`) into the emulator's camera
  image (`-camera-back imagefile:<png>`, written before the camera opens — `itacate/CLAUDE.md`'s card notes).
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
  ⚠️ **Since `10.9i-i` (his D5 of 2026-11-19), *Reportar* on each of yesterday's rows** — WhatsApp to him, as *Hubo un problema*
  does: *Quiero reportar una calificación de ayer: ★★☆☆☆ Tuve que esperar — Fonda Doña Lupe* (`@/lib/ajustes`' `reporteTexto`: the
  row's stars, its tags as the row joins them, her kitchen's name). No function takes a report — he removes a rating by hand — and
  nothing is drawn when the build has no support number.
- **− and + on *Tus ofertas*** (`useCantidades`, `set_listing_quantity`): *quedan 2 de 5* between them, − stopping at what is reserved
  (`TD019` said if a neighbour reserved meanwhile), + at 999. ⚠️ **One send at a time per dish, the last tap wins**, counted from the
  last tap (never a render not yet made); her list's read in flight is cancelled before the drawing. Online only.
- **To see it on the emulator**: the debug build against the local shop (*Apartados*' section); `docs/checks/10.5b-iv-c-settings-contract.sh`
  shows how five rated plates of yesterday are made as the database's owner, for *Tus calificaciones* from five.

## Her choices — *¿Qué más quieres usar?*, *Lo que usas*, *Cuéntanos* (`10.9a-ii`)

The owner's rulings of 2026-11-16 and 17 (G32, G33, G44, G45; the family-shell page, round 7), on `10.9a-i`'s functions. No
migration. The rules are `@/lib/loQueUsas`, pure, pinned by `test/loQueUsas.test.ts`.

- ⚠️⚠️ **Two gates decide what she is offered**: Wera's switch for everyone (`available`, the database's) AND this build —
  `PANTALLA_DE` names the screen of each feature built into it, `PREPARAR` its setup (only the card's). **The card's since `10.9e-ii`**
  (`/tarjeta`, `/preparar-tarjeta`), her numbers' since `10.9f` (`/numeros`), promotions' since `10.9g-ii` (`/promociones`) — no setup for either. A feature with no screen here is offered nowhere even with its switch on, so a phone
  still on an older update never offers what it cannot open. The menu is never picked: *Próximamente* until its own session.
- ⚠️ **The first run's step count is the build's** (`pasos`): *Paso 1 de N* is drawn before her kitchen exists, and the database
  answers what is offered only to a member. **3 since `10.9e-ii`** (the card) — and while its switch is still off for everyone, the third
  step goes straight on (`elegibles` empty): until the card's switch goes on (built by `10.9e-iii`, on with the owner's yes), *Paso 1 de
  3* and two steps.
- ***¿Qué más quieres usar?*** (`(cocina)/que-mas`): her need first and the feature under it, nothing pre-checked; *Tu menú a la mano ·
  Próximamente* greyed while `proximamente` is on. ⚠️ ***Seguir* is ONE `set_kitchen_features` call** — `on` for what she picked, `off`
  for the rest she was shown (`eleccionesDe`) — and waits for it; *Decidir después* sends nothing. Then `/ya-estas`. The card's setup is
  never done here.
- ***Mi cocina › Lo que usas*** (`@/ui/LoQueUsas`, at the top, above her page): each feature offered with its state (`filasDe`: *En tu
  Hoy*, or *No la usas* in its gender, and a green *Activar*); ***Activar*** (`(cocina)/activar/[servicio]`): the feature's picture
  (`ICONO_DE`, held to the glyph map), its need, a sentence, *Lo que te pide*, one button that waits for the database, then its setup or
  *Listo, ya está en tu Hoy* and *Ver mi Hoy* (`router.dismissTo('/')`). Off is in each feature's own screen. *Tu menú · Próximamente*
  with *Me interesa* → `interesada` and *Anotado*. ⚠️ **Absent when there is nothing to draw — every kitchen today.**
- ⚠️ **`TD024` is said in words** (*Ya no está disponible.*, `servicioErrorMessage`): Wera switched a feature off while she looked; her
  choices are read again, so the feature leaves the screen and no button stays to be refused.
- ***Cuéntanos cómo necesitas tu menú*** (`@/ui/Cuentanos`, *Hoy*'s foot): while `proximamente` is on, until her kitchen told us once
  (`menu_requests`, the database's) or she closed it with ✕ — kept on the phone per kitchen (`@/lib/puerta`'s `'menu'`), with *Deshacer*.
  Its sheet is React Native's `Modal` with `KeyboardAvoidingView` padding on BOTH phones (nothing resizes a Modal's window on Android):
  500 characters (`MENU_MAXIMO`), blank refused on the phone, *Gracias, lo leemos todo* once it landed.
- **To see it on the emulator**: the debug build against the local shop (*Apartados*' section), the local switches turned on as the
  database's owner (`update servicio.feature_switch set is_on = true where name in (…)`), and — for the third step and *Activar* — a local
  edit of `PANTALLA_DE` naming any existing route, never committed. `10.9a-ii`'s walk did all three, and put both back.

## The nudges and the firsts — *Hoy* (`10.9a-iii`)

The owner's rulings of 2026-11-16 and 17 (G31, G32 and the nudges: *"attractive but not invasive"*; the family-shell page, round 7):
**a nudge sits where the thing will live, and takes no space of its own.** No migration: every rule is `@/lib/empujones`, pure, pinned
by `test/empujones.test.ts` against a calendar in Mexico City's zone.

- ⚠️⚠️ **All of it is this phone's** (the ruling: *"phone-only"*) — one record per kitchen in the phone's store (`clave`:
  `wera-cocina.hoy.empujones.<kitchen>`), nothing sent anywhere. ⚠️ **Every write is read, changed and written at once**
  (`cambiarMemoria`): *Hoy*, the tabs' layout and *Publicar* each hold a copy, and a copy written whole would put another's fields back.
  A store that fails reads as an empty record.
- **Until her first offer** (`nuncaPublico`: none, or only one taken back by *Deshacer*) the day's card is the invitation (`Invitacion` in
  `@/ui/DiaDeHoy`, his words), opening *Publicar*; and **on her first three days with none** — the first three days her *Hoy* opens with
  no offer, not calendar days — *Publicar* glows at each open (`@/ui/Brillo`, keyed on `useAlAbrir`). *Hoy* marks today from an effect
  keyed on one string (`marca`), never on every render.
- **One small celebration per first**, the toast in the green with the cow (`festejar`; `@/ui/Nota`'s `festejo`): her first offer —
  *¡Ya te ven en Itacate!*, read BEFORE it is sent (`ofertaDeEstreno`) and keeping its *Deshacer* — and her first reservation and first
  handover, watched once from the tabs' layout on the read it already makes (`@/lib/useFestejos`). ⚠️ **A first is celebrated only if
  this phone saw her history read with none** (`primerasDe`, `'cero'`): a phone that meets a reservation already there says nothing.
  Her history is the 30 days the phone reads. ⚠️ The stamp's — *Diste tu primer sello* — since `10.9e-ii` (`useFestejoDelSello`, the
  zero seen in `kitchen_card`'s counts); the promotion's — *Tu primera promoción ya se ve en tu página* — since `10.9g-ii`, keeping its
  *Deshacer*, and only when the database says it is shown (the section *Promotions*).
- **At most one quiet line under the day's card** (`@/ui/LineaEmpujon`, `lineaDe`), only on a day she published, and only once every read it
  counts is in: her page's next missing part (her first offer never — it is the invitation's), on three days she publishes each, then the
  next — ✕ ends them for good (`@/lib/puerta`'s `'pagina'`, the key her page's door kept since `10.5-v-c-i`), with *Deshacer*; else a
  feature she did not pick, two weeks after the first day this phone drew her *Hoy*, one a week, on one day each, opening its *Activar*.
  *Cuéntanos* at the foot is a *Próximamente*, not the line.
- **No count of what she has not done anywhere** — *Mi cocina*'s checklist is a *Falta* row per missing part (`@/ui/Falta`), each opening
  where it is done (`DONDE_SE_HACE`).
- **The tiles** (`@/ui/Mosaicos`, `@/lib/loQueUsas`' `mosaicosDe`): one per feature she uses that this build carries, in the fixed order,
  each opening its screen; dashed in its first-time state (*Prepara tu tarjeta*) until its row hands `vivos` its words (`EnVivo`), with a
  dot for what waits. ⚠️ **The card's since `10.9e-ii`**, with *Sellar* on it (`EnVivo`'s `accion`) — the next section.
- ***Así funciona*** (`@/ui/AsiFunciona`, `useAsiFunciona`): three pictures (`PASOS_DE`) at the top of a feature's one screen the first time
  she opens it, gone when she uses it (`usado`) or closes it. **Built here, drawn by each feature's row** — the card's since `10.9e-ii`.
- ⚠️ **The one nudge that leaves the phone is the database's** (`0094`'s `primera_oferta`, `10.9h-i`; the nudges' ruling of
  2026-11-17: *"don't discard the nudge notification"*): *¿Tienes alguna oferta? · Publícala y tus vecinos la verán.* at 12:00 on her kitchen's second day with nothing
  published, to every member; a tap opens *Publicar* (`RUTAS`, `10.9h-ii`). ⚠️ **It reaches only a phone that already shows
  notifications**: this app asks the phone after her kitchen's first publication (`hayQuePreguntar`), and her reminder after three — so
  before her first offer only an Android 12 or older (on unasked), or one whose *Tu primera oferta* she turned on in *Mi cocina* (which
  asks), holds a token. When to ask is in the plan's decisions block, his product analyst's (found by `10.9h-ii`).
- **To see it on the emulator**: the debug build against the local shop (*Apartados*' section), Metro **without** `CI=1` (with it Metro does
  not watch files, so an edit never reaches the phone); a fonda signed up through the app; a neighbour reserving through `give_my_yes` and
  `reserve_plate` with her own token (the handover check's way). The glow lasts under four seconds: read it from a burst of raw `screencap`s
  sampling a band round the button (the first frames after a return come about a second apart). The tiles, *Así funciona* and a feature's
  line need the local switches on and a local edit of `PANTALLA_DE` (never committed); "two weeks on" is the phone's record edited —
  `adb exec-out run-as mx.wera.cocina cat files/SQLite/ExpoSQLiteStorage`, `desde` moved back with `sqlite3`, pushed back with the app stopped.

## Helpers — what a helper sees, and who works at a kitchen (`10.9b-ii`)

The owner's rulings of 2026-11-16 and 17 (G13 everyone on her own phone; G18 two roles, the owner and a helper — the database's
`owner` and `staff`, `manager` left free; G19 the owner removes a helper from *Quién trabaja aquí*; G36 a helper publishes too) and
the family-shell page's *Ayudante*. No migration: `my_role` (`0001`), the owner's update policy on `workspace_member` (`0001`) and
`leave_kitchen` (`0082`) answer everything. The claims are `@/api/equipo`; what each role sees, `@/lib/ayudante`.

- **Her role, per kitchen, kept on the phone** (`useSuRol`, `my_role`): ⚠️ **unread or `null`, nobody is the owner** (`esDuena`) — what is
  the owner's fades in, and is never shown to a helper and taken away; a role this build does not know reads as a helper's (`rolFrom`).
  *Mi cocina* is the owner's, a helper's, or a wheel with her way out while the role is unread (`miCocinaPara`).
- **A helper's *Hoy*:** *Ayudas en esta cocina*, the day's card, *Lo que sigue*, *Publicar* and *Repetir* — and the invitation and
  *Publicar*'s glow, which are publishing's. ⚠️ **Never** the nudge line (`verHoy`'s `duena`), the owner's tiles (`mosaicosPara`: the card's
  alone, drawn by `10.9e` with *Sellar*), the reminder's question or *Cuéntanos*. `test/ayudante.test.ts` reads each gate out of the screen.
- **A helper's *Mi cocina*** (`MiCocinaDeAyudante`): her name, address and how she signs in (`@/auth/quien`' `cuentaDe`); the kitchen with
  *Ayudas aquí* — ⚠️ **true today**, *entregas y publicas ofertas*; *das sellos y premios* only once her kitchen uses the card this build
  carries (`conTarjeta`); help; *Salir de esta cocina* behind a sheet (`@/ui/HojaConfirmar`; `leave_kitchen` — her kitchen leaves her
  list at once, as *Eliminar esta cocina*'s does); *Cerrar sesión*; *Eliminar mi cuenta*, which names nothing (she owns no business —
  `@/api/account`' `businessesThatGo`, held by both apps' `account.test.ts`) and never offers *Eliminar esta cocina*.
- **The owner's *Quién trabaja aquí*** (`@/ui/QuienTrabajaAqui`, after her settings): the kitchen's active memberships, read on her phone
  alone (`useEquipo` — ⚠️ every member MAY read them, `workspace_member_select`; a helper's phone never asks), her own row *Dueña · tú*, a
  name blank or missing drawn as the role's word, and *Invitar a alguien* under it — ⚠️ **drawn always since `10.9b-iii`** (only while
  someone else worked there before it; the section *Joining* below).
  A helper's row opens *¿Quitar a … de tu cocina?*; *Quitar* is the table's own update of `is_active` (`setMemberActive`), asked back with
  `.single()` (an RLS refusal is a 200 with no row → `PGRST116`), ⚠️ **its filter `role=neq.owner`, so it never ends an owner's
  membership** (the falsifier's C11: on the wrong column it ends the owner's own); then *Quitaste a …* with *Deshacer* for 8 seconds (the
  same update, `true`; the toast takes its own words after an undo, `@/lib/NotaProvider`'s `palabras`).
- ⚠️⚠️ **A helper removed or gone is read as no kitchen — by the walls**: `my_workspaces()` asks `is_active`, so her kitchens read `[]`.
  Her role answering `null` reads her kitchens again from ONE place (`useSiYaNoEstaAqui`, the tabs' layout), and the guard sends her where
  a kitchen is made — the next time a read goes out: on a return to the front a minute on.
- **To see it on the emulator**: the debug build against the local shop (*Apartados*' section); since `10.9b-iii` a helper joins through
  the app (*Invitar a alguien* on the owner's phone, *Unirme a una cocina* on hers — the section *Joining*). ⚠️ **Tap *Deshacer* in the same
  command as *Quitar***: reading a screenshot between the two outlasts the toast's 8 seconds (the first walk's miss).

## Joining — a helper's code (`10.9b-iii`)

The owner's ruling of 2026-11-18 (*"Agree with your recommendation."*): **a code for one person, good for 24 hours, sixteen characters
in four groups of four (Wera's own invitation), no address asked, and she joins as a helper at once** — no one confirms her by name; the
owner removes her from *Quién trabaja aquí*. G18: inviting is the owner's. `0083` is the database's half; the claims are `@/api/invitar`.

- ***Invitar a alguien*** (`@/ui/HojaInvitar`, from *Quién trabaja aquí*): ⚠️ **a new code each time the sheet opens** (`useInvitar`,
  `invite_helper`) — one per person; an earlier one keeps its 24 hours, and the code is shown once (only its hash is kept). The sheet:
  *Que abra Wera Cocina…*, the code in four groups, *Sirve para una persona, hasta mañana a las …*, what she will do there (`@/lib/
  ayudante`' `podraTexto` — true today: stamps and rewards once her kitchen uses the card), and ***Compartir el código*** — React Native's own `Share`, as Wera's
  invitation is shared: no module, no native change. With no signal it says so, with *Intentar de nuevo*. ⚠️ **Since `10.9c`
  the code is a QR above the typed code** (`@/ui/CodigoQR`, the next section): the sixteen the database hashed, never the
  grouped rendering.
- ⚠️⚠️ **The code is Wera's, copied** (`normalizarCodigo` ← `app/src/api/redeem.ts`' `normalizeCredential`; `codigoAgrupado` ←
  `app/src/api/invites.ts`' `groupedToken`): the grouping is a rendering; `I`/`L` → `1`, `O` → `0`, as `normalize_workspace_code` does
  inside the hash; what is SENT is the normalised sixteen. `test/invitar.test.ts` holds both copies to Wera's files code for code
  (`cocina-itacate.yml` fires on them).
- **The fork** (`(onboarding)/empezar`, *¿Qué quieres hacer?*): ⚠️ **the guard sends every login with no kitchen here** (`/empezar`, no
  longer `/registro`) — *Registrar mi cocina* (her three steps) or *Unirme a una cocina*; *Cerrar sesión* and *Eliminar mi cuenta* at its
  foot, as on the form; the form has *Volver*.
- ***Unirme a una cocina*** (`(onboarding)/unirme`): she types the code — or pastes the whole message *Compartir* sent her: the box finds
  the LAST four groups of four in it (`codigoAlEscribir`), so no `maxLength` — and once it is whole the database is asked the kitchen's name
  (`useCocinaDelCodigo`, `kitchen_of_code`; its refusals never retried), and the button says *Unirme a Fonda Doña Mari*. `TD005` (none, or
  used) and `TD003` (expired) each say to ask for another. The tap is `redeem_invite`; the kitchen enters her list at once (`useUnirme`).
- ⚠️⚠️ **The guard decides by the screen** (`@/auth/guard`' `screenOf`, `DONDE_SE_REGISTRA`): a kitchen that appears in the sign-up goes on
  to the first run's last screens ONLY on `/donde`, where *Registrar mi cocina* makes it; anywhere else — she joined on `/unirme`, or her
  owner's *Deshacer* gave her kitchen back while she sat on the fork — she goes to *Hoy* (a helper skips the set-up), and *Listo: ya ayudas
  en …* shows there.
- **To see it on the emulator**: two logins on two phones, or one phone signed in as each in turn — the owner's *Invitar a alguien*, then
  the helper's *Unirme a una cocina* with the code read off the owner's screen (or `invite_helper` called as the owner through the local
  API, the contract check's way). To SCAN it there, the next section.

## The camera that scans, and a QR with no native module (`10.9c`)

G16 and the row: a camera module in the first public build, asked the first time she taps, the code typed when she refuses.

- **A QR is `@/lib/qr` + `@/ui/CodigoQR`**: `qrcode-generator` (MIT, no dependencies, plain JavaScript — measured first, as the row
  asked: no app has SVG and none is needed) says which squares are dark; each row's dark runs are one `View` each, black on white, in the
  four-square quiet zone, the square rounded to whole pixels. A code of Crockford's alphabet goes in QR's alphanumeric mode — 21 × 21 at
  level M; anything else (a link) as bytes. ⚠️ **`test/qr.test.ts` READS THE DRAWING BACK with a real decoder** — `zxing-wasm` (the
  reader `expo-camera`'s web half carries, a dev dependency pinned to the lockfile's copy, its WASM loaded from disk) — so a grid that
  would not scan is red. The poster (`10.9e-ii`, `@/lib/cartel` — `expo-print` takes HTML) draws the same grid as SVG `<rect>`s.
- **The camera is `@/ui/Escaner`**: a box on the screen, `CameraView` reading QR codes alone, the four corners and *Apunta a su código*
  over it. **What it shows is `@/lib/escaner`' `cajaDelEscaner`, a pure rule of the phone's answer**: never asked → a button (the tap
  asks); allowed — here or by *Tomar foto*, the same permission — → the camera at once; refused while the phone will ask again → why, and
  ask again; refused for good → why, and *Permitir la cámara en Ajustes* (coming back reads it again). `onLeido(texto)` says whether the
  code was the one wanted: `true` and the screen closes the camera; `false` says *Ese no es el código…* and keeps reading, one answer per
  code (it fires for every frame). ⚠️ **Nothing it sees is kept or sent** — the aviso's section 3 says so.
- ***Unirme a una cocina***: the camera above the typed box; a scan goes through the typed box's own rule (`codigoAlEscribir`, then
  `codigoCompleto`), so a scan is exactly what typing it would have been; the camera closes once the code is whole and opens again if the
  box is cleared.
- ⚠️ **To scan on the emulator** (`wera-android-36`, measured 2026-11-18): its back camera is `emulated` (a black picture) — boot it with
  `emulator -avd wera-android-36 -camera-back imagefile:<png> -no-snapshot-load`, the QR **small in the middle of a large white 4:3
  image** (`sips -p 1600 2133 --padColor FFFFFF`): with the QR filling the image, the emulator stretches it to the frame and nothing
  reads. ⚠️ `adb exec-out screencap` draws the camera's box BLACK — `adb emu screenrecord screenshot <file>` shows what the camera sees.
  The QR to hang there is the owner's own screen: a screenshot of *Invitar a alguien*, cropped (`sips --cropOffset`). Then *Unirme*
  reads it, the box fills, and the database names the kitchen.

## The loyalty card — Wera Cocina's half (`10.9e-ii`)

The owner's rulings G4–G19, G23, G34–G36 and G41 of 2026-11-16 and 17, as the family-shell page draws stage 3 (`cTarjeta`, `cSetup`,
`cSellar`, `cFscan`, `cFres`, `cCartel`, `tcerrarSheet`, `cardTile`), on `0085`'s functions (`@/api/tarjeta`, the section *Measure*).
No migration. What every screen says is `@/lib/tarjeta`, pure, pinned with `@/lib/llave` and `@/lib/cartel` by `test/tarjetaCocina.test.ts`
in Mexico City's zone. ⚠️ **Wera's switch `tarjeta` was off until `10.9e-iii` built Itacate's half** — and goes on with the owner's yes
(the plan's decisions block): nothing of this shows on a phone before it.

- **Its one screen** (`(cocina)/tarjeta`, `PANTALLA_DE`): *Así funciona* the first time; the card as her neighbours see it — her page's
  colour and logo (`@/ui/TarjetaDeLealtad`, G41); three counts (`kitchen_card`); *Sellar*; then the owner's (G18) — *Tu cartel para el
  mostrador*, *Cambiar el premio, los sellos o cuándo se borran* (new cards only, G12), *Cerrar la tarjeta* behind a sheet. Not set up,
  the owner is sent to the setup and a helper reads that it is not. ⚠️ **Closed, it stays while its 30 days run** (`tarjetaGuardada`, and
  `mosaicosDe`' `ademas` keeps its tile though her choice is off): those who started it still finish and claim, and need *Sellar* for it;
  *Abrirla otra vez* opens the setup.
- **The setup** (`(cocina)/preparar-tarjeta`, `PREPARAR`): the reward (60), 4–12 stamps, and since `10.9k` (`0089`, the owner's rulings of
  2026-11-19) ***Nunca · 2 semanas · 1 mes · 2 meses · 3 meses · Otro…*** — kept as 0, 14, 30, 60, 90 days — **nothing pre-chosen**, the
  8 dashed as a hint (`@/ui/Fichas`) — the card and its conditions naming her kitchen and its address (`condicionesDe`, the words Itacate
  shows before her first stamp since `10.9e-iii`, held to these by Itacate's `test/gemelos.test.ts`); *Activar* → *Listo, ya está en tu Hoy* with her tile; *Guardar*; awaited (`set_card_terms`).
- ***Otro…*** (`@/ui/HojaDias`, `10.9k`): dashed until it holds her days, then *21 días*, chosen; a tap opens ***¿Cuántos días sin venir?***
  with **the number pad up** — typed, never clicked through (his words) — three digits, no decimals (`soloDigitos`), − / + by one held to
  14…365 (`empujarDias`, from an empty box 14), the live *Se borran si pasan* **21 días** *sin venir.* and *Si su último sello fuera hoy, se
  borrarían el 11 de diciembre.* (`ejemploDeDias`); out of range *Elige de 14 a 365 días.* in red and *Listo* off; a typed 14, 30, 60 or 90
  chooses its own chip (`fichaDeDias`). A card set up on 15 or 45 before `10.9k` reopens as *Otro…*. ⚠️ **NOT A `Modal`**: on Android a
  `Modal`'s window leaves the pad down until the box is tapped (Wera's `HojaPrecio`, R9), so the sheet is drawn over the screen, standing on
  the keyboard by its height (+ the gesture bar on Android 15+, nothing below 15); the hardware back closes the pad, then the sheet. Seen on the
  emulator (`mInputShown=true` on opening). How long the stamps wait is said as she chose it — `siPasan` in `@/strings`: *2 semanas*, *un
  mes* (*pasa*), *2 meses*, *3 meses*, else its days — in the conditions, the card's line and the sheet; Itacate's copy is held to it.
- **The tile on *Hoy***: *6 sellos hoy*, *1 premio por entregar* with its dot (else the cards going, or *Cerrada · la completan hasta el …*),
  and *Sellar* on it. A helper sees it only once set up (`@/lib/ayudante`' `mosaicosPara`). ⚠️ **A copy read on another day says nothing
  of today** (`deHoy`): `kitchen_card` is kept on the phone, and yesterday's names and counts are not today's.
- ***Sellar*** (`(cocina)/sellar`): this phone's key — ⚠️ **asked ONCE and kept per login per kitchen** (`@/lib/llave`, in the phone's store
  beside her session: no keychain module, which is a native build) — never on each open, which would drop her other phones' codes (three a
  member); *¿A tus clientes no les sirve tu código? Pide uno nuevo* asks again on her tap (a helper removed and invited again lost hers).
  The QR (`WERA1:c:<key>:<code>`) and its six digits worked out on the phone every second, *Cambia en 0:42*, ⚠️ **with no signal too**.
  Today's lines read every five seconds **only while it is in front** (`useIsFocused`), a new one of the last two minutes said in a toast;
  then the scans waiting on the phone and the ones that went late and gave nothing.
- ***Escanear a tu cliente*** (`(cocina)/escanear`, `@/ui/Escaner`): her QR (`WERA1:v:…`) or her six digits typed. With signal,
  `card_of_code` → *Ana R. · 5 de 8 · 2 premios*, *Dar sello* / *Ya tiene su sello de hoy*, *Entregar premio* → *¿Cuál le das?*. ⚠️ **Her
  *Cobras: …* code names its reward** (a fifth part, `@/lib/codigo`, both apps) **and is given at once**. ⚠️ **Each call checked at the scan's
  moment**: by the database's clock within a minute of the scan, by the scan's own after (`momentoDeLaLlamada` — a phone whose clock is off
  does not miss). ⚠️ **One reward a scan** (`0085`): once given, *Entregar premio* goes. ⚠️ **One neighbour at a time** (`turno`).
- ⚠️⚠️ **With no signal** whose code it is cannot be read: *Dar sello sin señal* — and a *Cobras* code's reward — go to her queue
  (`@/api/cola`'s kinds `sello` and `premio`, about no order: `reserva` is the scan's id) with the scan's moment; the same scan again is
  *ya está guardado* and goes once — a reward is not handed over twice. ⚠️ **A scan is ANSWERED, not refused**: a landed answer that gave
  nothing (`no_valido`, `ya_hoy`, and a queued reward's `ya_cobrado` — claimed elsewhere first) is drawn on *Sellar* for a day, with her name
  and the reason; a refusal keeps the database's code and words. ⚠️ **The card's `42501` has its own pattern** (`NO_ES_SU_COCINA_DE_TARJETA`):
  `NO_ES_DE_SU_COCINA` is read word for word by the handover's contract check and its falsifier.
- **The counter poster** (`(cocina)/cartel`, `@/lib/cartel`, G35): her colour, her circle (her logo fetched with her token as a data URI, else
  her initials), her name, *Junta 4 sellos y llévate …*, ⚠️ **a QR of her kitchen's address** (`direccionDeCocina`, held to Itacate's reading
  of it — never *Sellar*'s code, which changes every minute), *Escanéalo con tu cámara*, her address, *en Itacate* small, *Wera* nowhere.
  *Imprimir* (`printAsync`) and *Mandarlo como PDF* (`printToFileAsync`, A4, then `expo-sharing`). The owner's.
- **Before *Eliminar esta cocina*** (G23): *5 vecinos juntan sellos en tu tarjeta y hay 1 premio por entregar. Con la cocina se borran sus
  sellos y sus premios.* — warned, never blocked (`avisoAlEliminar`).
- **To see it on the emulator**: a NEW debug build (camera and printing since `10.9c`: `expo prebuild -p android`, the proxy's cert, `gradlew
  :app:assembleDebug`); the local switch on (`update servicio.feature_switch set is_on = true where name = 'tarjeta'`, off after); people made
  through the apps' functions — a neighbour's key with `register_my_key`, her code at any moment by RFC 6238 (`10.9e-i-card-contract.sh`'s
  `code_at`). ⚠️ **`uiautomator dump` never settles on *Sellar*** (its code ticks every second) — a stale `/sdcard/ui.xml` reads as the
  screen before: tap it by coordinates. ⚠️ **A *Cobras* QR for the camera is a code for one coming minute**: once the camera is allowed it
  opens on arrival and reads at once, so time the arrival into the code's minute.

## Her numbers — *Tus números* (`10.9f`, and the card's since `10.9l`)

The owner's rulings G24–G27 of 2026-11-17, as the family-shell page draws stage 4 (`cNumeros`, the tile's `41 platos`), on `0086`'s
`kitchen_numbers` (`@/api/numeros`). What each question says is `@/lib/numeros`, pure, pinned by `test/numeros.test.ts` against the
database's own answer at the suite's calendar (`RESPUESTA`, copied from `supabase/tests/0086_her_numbers.sql`'s run, never written by hand;
and `CON_TARJETA`, from `supabase/tests/0091_her_numbers_with_the_card.sql`'s, before its nightly job).

- ⚠️ **Since `10.9l` (his ruling of 2026-11-19, night: *"Yes to everything"* on https://claude.ai/artifact/7iB3p7ffyFhSf9XowGVrWy) — ONE
  SCROLL**: on top the summary row (`resumenDe`) — *platos · visitas · sellos*, each against the period before, *vecinos* in place of
  *sellos* while her kitchen does not use the card (*aparece desde cinco* under the floor); *Tus apartados* — the five below, unchanged;
  ***Tu tarjeta de lealtad*** — only while she uses the card (`conTarjeta`) — six answers (`tarjetaDe`): her visits that got a stamp of
  all (*14 de 16*, *88% · la anterior, 100%*, a bar; under it *2 al entregar un apartado · 12 en el mostrador*); rewards won (under it
  *Cobraron 1 esta semana · 1 por entregar*); cards going now against ONE PERIOD EARLIER (*hace una semana, 14*; *ayer a esta hora*,
  *hace un mes*) and *N están a un sello del premio*; new cards (her first stamp ever here); the middle gap between two stamps (*2 días*,
  *la mitad tarda menos*); cards erased, under it her rule today in `10.9k`'s words (*Por pasar 2 semanas sin venir*, *Elegiste que nunca
  se borren*; nothing while `kitchen_card` is unread) and ***Cambiar cuándo se borran ›*** to `(cocina)/preparar-tarjeta`. The drawing's
  *NUEVA* marks were the proposal's, not the screen's. ⚠️ **Every figure is the database's** (`0091`): the floor of five on cards going,
  new cards (the period's neighbours, as `returning`) and the gaps' people — `null`, *Aparece desde cinco vecinos*; a gap before under it
  reads *con menos de cinco vecinos*, never *menos de cinco*, which would read as days.

- **What is counted is the database's** (`0086`): plates and pesos of reservations *recogido* (the kitchen's *Entregar* OR her *Ya lo tengo*),
  visits — one person one day, a reservation and its stamp one; her swipe counted no later than her window's end — walk-ins (a stamp and no reservation that day), and, ⚠️ **only from five
  neighbours in the period, `neighbours` and `returning`** — under five they arrive `null` and the screen says *Aparece desde cinco vecinos*.
  ⚠️ **The floor is the database's, never this app's**: a phone never holds a number it must not show. Someone whose account is gone is a
  visit still, never one of *vecinos*.
- **Its one screen** (`(cocina)/numeros`, `PANTALLA_DE`): *Así funciona* the first time; what is counted, true today (*y quienes juntan
  sellos* only while her kitchen uses the card — `@/lib/ayudante`' `conTarjeta`); *Día · Semana · Mes* (`@/ui/Segmento`), *Semana* first;
  the five questions, each against the WHOLE period before (*Esta semana · la anterior, 36*; a period before under five reads *menos de
  cinco*); *Tus días fuertes* for a week or a month, *Tus horas fuertes* from her first hour with a visit to her last (`@/ui/Barras`, every
  count written beside its bar); *Cuentas de tus entregas, sin nombres.*; *Dejar de ver tus números* — one `set_kitchen_features` with
  `numeros: off`, back to *Hoy*, *Deshacer* for 8 seconds. Before her first visit ever (`since` null): *Empiezan con tu primera entrega*.
- **The tile on *Hoy***: *12 platos · entregados esta semana · la anterior, 6* — said as the screen says it, never *N más* (on a Tuesday that
  weighs two days against seven); dashed *Empiezan con tu primera entrega* until her first visit; it WAITS for its read, and a failed read
  says *— · No se pudieron leer* — never a first time that is not one; ⚠️ with no signal the read PAUSES (TanStack's
  online mode) instead of failing, and `fetchStatus === 'paused'` is read the same; a later refetch that fails never replaces today's read.
- ⚠️ **The owner's alone** (G18): asked only on her phone (`veSusNumeros`: the owner, using them, this build carrying them); a helper has no
  tile (`mosaicosPara`) and one who reaches the screen is sent to *Hoy*; the database refuses anyone else.
- ⚠️ **Never on the phone's disk** (`@/api/persist`'s list unchanged): a read from another day is read again (`leidoHoy`, by the phone's own
  calendar, from the start of `ahora`'s day — ⚠️ never the answer's `day` against the phone's, which a phone in another zone would never
  match, and never "the same day as `ahora`", which a read landing at 00:00:01 while `ahora` still says 23:59 would miss: both ask for
  ever), and not while a read failed or waits for a signal. A handover or a stamp that lands reads them again (`ColaProvider`, `useEscaneo`), so the tile never lags *¡Tu primera
  entrega! Ya cuenta en tus números* — the first handover's words once she sees her numbers (`palabrasDelFestejo`, the tabs' layout).
- **To see it on the emulator**: the debug build against the local shop (*Apartados*' section), the local switch on (`update
  servicio.feature_switch set is_on = true where name in ('numeros', 'tarjeta')`), *Mi cocina › Lo que usas › Tus números › Activar*; a
  week of visits written as the database's owner the suite's way (`_r`/`_s`), then away from the app a minute and back (the reads' 60
  seconds). ⚠️ **Tap *Deshacer* in the same command as *Dejar de ver tus números*** — reading a screenshot between them outlasts the toast.
  ⚠️ **Airplane mode does NOT cut the local shop** (it is `adb reverse`): to see the tile with no signal, `adb reverse --remove tcp:54443`,
  close and reopen the app, then `adb reverse tcp:54443 tcp:54443`.

## Promotions — Wera Cocina's half (`10.9g-ii`)

The owner's rulings of 2026-11-05 (calls 23–25: an offer and a promotion are two records; four kinds; an end date required, eight weeks
at most; conditions written for her with her kitchen's name and address; a live preview; *Deshacer*; *Terminarla hoy*) and G18, G28–G30
and G36 of 2026-11-16 and 17, as the family-shell page draws stage 4 (`cPromos`, `promoForm`, `promoSheet`, `promoBand`, the tile), on
`0087`'s functions (`@/api/promociones`, the section *Measure*). No migration. What every screen says is `@/lib/promociones`, pure, pinned
by `test/promocionesCocina.test.ts` against a calendar in Mexico City's zone. ⚠️ **Wera's switch `promociones` stays off until his product
analyst rules** (the plan's decisions block, since `10.9g-iii`): nothing of this shows on a phone before it.

- **Its one screen** (`(cocina)/promociones`, `PANTALLA_DE`): *Así funciona* the first time — ⚠️ marked on THIS screen once any promotion
  exists (the form's copy of the phone's record is not this screen's: the first walk found the strip still drawn after her first); every
  promotion as the database orders them, *Activa* or *Terminó*; *Crear promoción*, or *Tienes tres activas…* (`row.running >= row.max`);
  what a promotion is against an offer; *Dejar de usar promociones* — ⚠️ **her own *off* ends the running ones** (`0087`'s trigger), so
  while any runs it asks first (`@/ui/HojaConfirmar`) and offers no *Deshacer*; with none, her numbers' way, *Deshacer* for 8 seconds.
- ***Nueva promoción*** (`(cocina)/nueva-promocion`, `?de=<id>` for *Usarla otra vez*): the four kinds (`tiposDe(card_open)` — *Para tus
  clientes* only while her card is open), what (40), more (80), a square photo (a dish's `CampoFoto`), *Todos* or her days (`tocarDia`),
  *Esta semana · Dos semanas · Fin de mes · Otra fecha…* — ⚠️ **a calendar drawn in JavaScript** (`@/ui/Calendario`, `calendarioDe`: no
  date-picker module, which would be a native build), the conditions written for her (`condicionesDe`) with *Cambiar* (her own text kept
  when the fields change; *Que se escriban solas* puts them back), *Así la verán en tu página* — the band and the mark (`@/ui/BandaPromocion`).
  ⚠️ **Every rule checked before anything is sent** (`revisar`), conditions over 400 included (*Toca Cambiar y acórtalas* — never cut).
  ⚠️ **A retry is the same promotion**: the id is kept while what it sends is unchanged. Its photo goes up first (`useCrearPromocion`).
- ***Deshacer*, 8 seconds, at the root** (`undo_promotion`, the database's two minutes for a slow signal; `TD032` after says *termínala hoy*):
  ⚠️ `useDeshacerPromocion` is a plain call with the kitchen and the id — never a screen's mutation — because the form is gone by then. Her
  first is celebrated in the green and keeps its *Deshacer* (`NotaProvider`'s `avisar(…, festejo)`).
- ***Tu promoción*** (`@/ui/HojaPromocion`): the band, *Condiciones* opening its words, *Se ve en tu página. Una oferta de hoy lleva su marca.*
  (`offers_today`, the database's — only while shown). ⚠️ ***Terminarla hoy* has no *Deshacer*** — `0087` keeps no way back; *Usarla otra vez*
  fills a new form (kind, what, more, photo, days — never its end or conditions; *Para tus clientes* with her card closed starts as *Platillo nuevo*).
- **The tile on *Hoy*** (`enVivoDe`): dashed *Crea tu primera promoción* until her first ever; then the newest running — *Pozole verde · Hasta
  el 17 de diciembre · y 2 más* — or *Ninguna ahora*; a failed or paused read says *— · No se pudieron leer*; unread, it waits. ⚠️ **The
  owner's alone** (G18): asked only on her phone (`duena && seLeen`); a helper has no tile (`mosaicosPara`) and the screen sends her to *Hoy*.
- ***¿Es parte de una promoción?*** in *Publicar* (G30, G36 — a helper too): asked only while her kitchen uses them (`seLeen`) and one runs on
  the window's day (`activasEl`); *No* chosen at first; the pick in terracotta, dropped when the window leaves its days; sent as `publishBody`'s
  `p_promotion_id`. `TD031` (it ended meanwhile) is said in words and her promotions are read again (`usePublish`).
- ⚠️ **The band and the mark are written to be copied** (`@/ui/BandaPromocion`: every word and its picture from its caller; terracotta,
  never the action's colour): ✅ Itacate draws them since `10.9g-iii` from a copy its `test/gemelos.test.ts` holds to this file — a change
  here is copied there in the same PR. ⚠️ **And her previews show them** (`10.9g-iii`): *Ver como la ven* her band and her dishes' marks
  (`@/lib/comoLaVen`, her list reading `promotion_id`), *Publicar*'s card the mark of the one she picked (`@/lib/vistaPrevia`'s `promocion`).
- ***Avisar a quienes te siguen*** (`10.9h-ii`, the drawing's switch under the conditions): ⚠️ **drawn only while
  `promotion_alert_offered` answers true** (`useAvisoOfrecido`, the owner's phone only, never on its disk) — `0094`'s kind
  `promocion_cocina`, dark until his product analyst rules, so on every phone today there is no switch and no alert. **On at
  first** (`Borrador.avisar`, the drawing's `freshPromo`; *Usarla otra vez* too), never part of what `create_promotion` is sent (a
  retry with it changed is the same promotion). Under it ***38 vecinos · un solo aviso, al publicarla*** — *Hoy*'s count
  (`kitchen_followers`), from the first follower; none or unread, *Un solo aviso, al publicarla* (`detalleDelAviso`).
  ⚠️⚠️ **THE ALERT IS ASKED AFTER *DESHACER*, NEVER BEFORE IT** (`@/lib/avisoDePromocion`, `test/avisoDePromocion.test.ts`):
  `alert_promotion` queues it at once and the database's minute job sends it, so asked as she publishes it could reach her
  neighbours while *Deshacer* is on screen — and one a day, the corrected promotion's would wait for tomorrow. Asked once
  *Deshacer*'s eight seconds and a margin are over (`ESPERA_MS`, 10 s), only for a promotion the database says is shown; *Deshacer*
  stops it, *Deshacer* refused sends it at once; a lost signal is tried again (three in all, 20 s apart), a refusal not; ⚠️ **a phone
  closed before the ten seconds sends none** — as `10.9h-i` ruled for a signal lost between publishing and the alert. Who receives
  it and when is the database's (the kind's class: a promotion — her neighbours' yes, 9:00 to 20:00, her day's and week's limits).
  ⚠️ ***Tu promoción* never says *y avisamos*** (the drawing's sheet): no answer says whether one was announced, or to whom.
- **To see it on the emulator**: the debug build against the local shop (*Apartados*' section), Metro from `cocina/` on 8082 with the local
  values; the local switch on (`update servicio.feature_switch set is_on = true where name in ('promociones', 'tarjeta')`, off after) —
  and for *Avisar a quienes te siguen* its kind (`update servicio.notification_kind set is_on = true where kind = 'promocion_cocina'`,
  off after; what it queued is `servicio.notice`'s rows `where kind = 'promocion_cocina'`, read as the database's owner); a fonda
  made through the apps' functions (`onboard_workspace`, `set_store_address`, `set_card_terms` for *Para tus clientes*); more than one running
  is quickest through `create_promotion` with her token. ⚠️ **Tap *Deshacer* in the same command as *Publicar promoción*** — reading a
  screenshot between them outlasts the toast. ⚠️ *Publicar*'s number boxes move when one takes focus: read the boxes back before publishing.
