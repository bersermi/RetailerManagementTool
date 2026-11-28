# Tienda — retail management tool

Multi-tenant retail operations for small Mexican retailers. Postgres (Supabase) +
React Native (Expo). MXN, IVA, LFPDPPP — not GDPR, CFDI out of scope. **The names, since the
owner's ruling of 2026-11-22 (the plan's Step 13):** the shop app is **Wera Tienda** (`app/`; under its
icon too from Wera 1.2.0, `13.4`), the fondas' **Wera Cocina** (`cocina/`), and the neighbours' **Wera**
(`itacate/`, once *Itacate*) — new prose says *Wera (vecinos)* wherever *Wera* alone could mean either.
The repo, the folders, the ids, the schemes and the `@tienda/*` packages keep their names.

**Step 10 of the plan is the ecosystem** — Wera's pilot version, two new sibling apps (Wera Cocina for
fondas in `cocina/`, Wera (vecinos) — once Itacate — for neighbours in `itacate/`, beside Wera's `app/` since `10.2a`) and
the backend they share. **A task there reads
`~/RetailerToolDev/wera-vision/CLAUDE.md` first** — the owner's private notes, outside this repo — and copies
nothing from them here: no strategy, fees, prices or research, only what the code needs.

**Read these before anything else:**

| File | Authority |
|------|-----------|
| [`docs/PLAN.md`](docs/PLAN.md) | Where the build is. **Read `## Position` first** — the two obligation blocks and the status log, newest entry first |
| [`docs/adr/ADR-035`](docs/adr/ADR-035-target-architecture-postgres-react-native.md) | The architecture. **If anything disagrees with the ADR, the ADR wins and the other file is the bug** |
| [`docs/HANDBOOK.md`](docs/HANDBOOK.md) | **The file the owner reads** — a task that closes usually edits it too. `handbook-agreement.sh` holds it to the plan on done, split, next and whether anything waits on him |
| [`app/CLAUDE.md`](app/CLAUDE.md) | Rules for `app/` — loads when a session touches it |
| [`cocina/CLAUDE.md`](cocina/CLAUDE.md), [`itacate/CLAUDE.md`](itacate/CLAUDE.md) | Rules for the two sibling apps — each loads when a session touches its folder |

**Orient in one command** — the next task, the plan's size, and every live obligation:

```
bash docs/checks/plan-handover.sh
```

⚠️ **Never write the next task id, or any count, into this file.** Nothing checks this file,
so every number in it decays silently. Where a number matters, the command that measures it
is given instead.

## The plan

- **`docs/PLAN.md` is the only plan file you edit.** Closed work is MOVED, unedited, to
  `docs/plan/archive/` (`ls` it — never trust a list of it). The status log is archived **one
  working day per file**: a later cut of the same day APPENDS; never a second file for one
  date, never a rename. `docs/plan/archive/handbook/` sits outside the corpus glob on purpose.
- **Search live + archive in one command:** `grep -n '<task-id>' "$(bash docs/checks/plan-corpus.sh)"`.
  Lookups are content-addressed (`| **task** |`), never by line number.
- **Move, never copy.** Two homes for one claim is this repo's most repeated defect, and
  nothing checks for it since the split guards were retired — grep the corpus before and after.
- `plan-handover.sh` caps `docs/PLAN.md` at 6,000 lines and `## Position` at 1,400 and prints
  both. Before a cut, ask *is this block indexed anywhere else?* — a line range is not a
  semantic boundary.
- **Never archive `⛔ DECISIONS OWED` or `⏳ DATES OWED`** — exactly one of each must stay live.
- **The decisions block can lose a question with nothing going red.** A gate cell saying *see
  the decisions block* must be read against the block.
- **A *Blocks* cell is machine-read:** ids only, never an id alone (add a few digit-free
  words), and it must name a row genuinely downstream — a decision naming the next task
  blocks it.
- **Closed is not wrong.** `docs/plan/archive/` is this system's own history, and for several
  screen rulings the only record. `archive/power-platform/` is a system nobody is building —
  never cite it as current; say so when you read it for history.

## CI, and what a green run means

**List every job by name** (`money.yml` and `cocina-itacate.yml` are matrixed — count each twice):

```
ruby -ryaml -e 'Dir[".github/workflows/*.yml"].sort.each{|f| YAML.load_file(f)["jobs"].each{|k,v| puts "#{File.basename f}  #{v["name"]||k}"}}'
```

| Workflow | Fires on |
|---|---|
| `app.yml` | `app/**`, `packages/money/**`, root `package*.json`, the two sibling apps' `package.json`, the plan, handbook, conventions page, ADR-035 and their checks, and the update runbook with its rehearsal; since `11.6`, the look's sources its suite holds Wera to (`brand/mostrador/paleta.json`, `brand/letras/**`), and since `11.9` the counter's objects, motions and pictures (`objetos.json`, `movimiento.json`, `png/`); since `11.10-i`, the icon font, its map and Google's G (`brand/iconos/WeraIconos.*`, `brand/marcas/**` — WhatsApp's glyph too since `11.10-iii`); since `11.10-ii`, the drawings of its screens with nothing yet (`brand/dibujos/png/**`, `dibujos.json`). Two jobs: the app (**Wera's runtime against its builds in the field**, typecheck, Vitest, conventions gate, the runbook's rehearsal) and *the documents still agree* |
| `cocina-itacate.yml` | `cocina/**`, `itacate/**`, root `package*.json`, and the files Cocina's suite reads outside its folder: Wera's `app/src/strings.ts`, `app/src/auth/credentials.ts`, `app/src/api/collection.ts` and `app/src/api/account.ts` (one login across the apps, so one spelling of its words, its name key, its address rule and its deletion), `packages/money/**` with Wera's `app/src/format/mxn.ts` and `app/src/api/catalogWrite.ts` (one way to read, store and write a price), `0072`'s and `0076`'s migrations (the limits a fonda's form checks — `publish_listing`'s body is `0076`'s), Wera's `app/src/auth/support.ts` and the update runbook (one forgotten-password link, and every value Cocina's bundle reads on the runbook's list), the privacy page its sign-in opens, and — since `10.5-ii` — Wera's `app/src/api/photos.ts` (a square photo's two sizes), `brand/giros.svg` and `store/cocina-itacate/render.sh` (the nine trades' flat drawings — since `11.10-ii` the neighbours' map pins alone); and since `10.5-v-b` Wera's title font (`app/src/marca/letras/`), its `app/src/theme/letra.ts` and its rust cow (`app/src/marca/vaca-oxido.png`), which Itacate copies byte for byte — and Wera Cocina the font and `letra.ts` since `10.5-v-c-i` (Archivo since `11.6` in Wera and `11.7-i` in both siblings — and with it Wera's font loader, `app/src/marca/fuentes.ts`, held code for code). Since `11.7-i`, the design system's colours (`brand/mostrador/paleta.json`), which each sibling's `test/palette.test.ts` holds its palette to and measures; Wera's `app/src/theme/density.ts`, whose `normal` row is the siblings' fixed sizes; and Wera's `app/app.json`, whose launch cream Wera Cocina's is held to until `11.11`. Since `11.7-ii`, Mansalva and its licence (`brand/letras/Mansalva-Regular.ttf`, `OFL-Mansalva.txt`): a kitchen's phrase in both apps, each copy held to them byte for byte by `test/esquinas.test.ts`, which also holds each app's `ESQUINA` to Wera's `density.ts` (above). Since `11.8-i`, the counter's objects (`brand/mostrador/objetos.json` and `brand/mostrador/png/`): each app's `@/ui/Mostrador` draws the tickets, stamps, tags and the tab's stroke from those pictures byte for byte at those measures (`test/mostrador.test.ts` in each). Since `11.8-ii`, their motions (`brand/mostrador/movimiento.json`): each app's `@/theme/movimiento` holds the stamp landing and the stub tearing number for number (`test/movimiento.test.ts` in each). Since `11.10-i`, the drawn icons: Wera's `app/src/ui/Icono.tsx` and `app/src/marca/glifos.ts` (one file each in the three apps), the icon font and its map (`brand/iconos/WeraIconos.ttf`, `WeraIconos.json`) and Google's G and, since `11.10-iii`, WhatsApp's glyph (`brand/marcas/**`), each app's copies held to them byte for byte by `test/iconos.test.ts`. Since `11.10-ii`, the drawings (`brand/dibujos/png/**` and `dibujos.json`): each app's `src/marca/dibujos/` held to them byte for byte, and every empty screen, photo-less cover and the reward to the inventory, by `test/dibujos.test.ts`. Since `10.5-v-c-ii`, **every migration** (`supabase/migrations/**`): Wera Cocina's previews of her offer and her page work out the door's rules and `normalize_name` again, and its suite reads both out of whichever migration defines each last. Since `10.5-v-d`, Wera's opening, which Wera Cocina's first run copies: its cream cow (`app/src/marca/vaca-crema.png`, byte for byte), its splash hold (`app/src/lib/splash.ts`), its steps (`app/src/theme/apertura.ts`) and the mark it is measured on (`brand/wera-mark.svg`). Since `10.5b-iii-a`, Wera's slide that sells (`app/src/cart/commit.ts`): how far Itacate's *Ya lo tengo* swipe must travel is its `COMMIT_AT`. Since `10.5b-iii-b`, the terms of use (`site/terminos/cocina-e-itacate/index.html`), which Itacate's express yes links to. Since `10.5b-iv-b`, Wera's connectivity machine (`app/src/api/connectivity.ts`), which Wera Cocina copies code for code for her counter with no signal — and Itacate since `10.9j-ii-a`, for her *Ya lo tengo* with no signal. Since `10.9b-iii`, Wera's invitation token (`app/src/api/redeem.ts` and `app/src/api/invites.ts`): a helper's code is normalised and grouped as Wera's, held code for code. Since `10.9c`, the site's `.well-known/` and `cocina/` — a kitchen's address, held by Itacate's suite to one host and path with its `app.json` and its link parser. Since `10.5c-iii`, the owner's campaign runbook (`docs/runbooks/campaigns.sql`): each app's offers' sheet shows exactly the words its *on 1* approves, and both suites hold the two equal. One job per app: typecheck, and its suite — its id, what it may ask a person for, a runtime the two secrets never touch, and for Cocina its sign-in's rules, her kitchen's sign-up, the map's arithmetic, her way out, what she publishes, her forgotten password, her page in Itacate with its photos, and — since `10.5-v-c-ii` — her reminder and Itacate's two pages copied into Wera Cocina, held to Itacate's files; and — since `10.5b-iv-b` — her counter with no signal: what the phone keeps, her queue, and its signal held to Wera's machine; and — since `10.9j-ii-b` — a neighbour's ticket checked by its seal, against a seal the database made; and for Itacate its sign-in's rules and its way out, held to Wera's files, its update runbook's list, and — since `10.9j-ii-a` — her ticket and *Ya lo tengo* with no signal: what her phone keeps, her queue, her ticket's QR read back, and its signal held to Wera's machine; and — since `10.5-iv-a-i` — the list of the kitchens near her: the door's answer read, where she is, Google from her phone, and every copy held to Wera Cocina's file; since `10.5-iv-a-ii`, a kitchen's page and a dish's — their words, their two links to Google Maps, and the pages held away from where she is (it reads `cocina/**`, Wera's `app/src/format/mxn.ts`, the handbook's record of Itacate's signature and the text of `0072` and `0078`) |
| `db.yml` | `supabase/**`, **`app/src/api/`**, **`cocina/src/api/`** and **`itacate/src/api/`** (since `10.5-iii-a`; its first claim, her way out, since `10.5-iii-b`; the one door, in a job of its own, `itacate-door`, since `10.5-iv-a-i`, with the kitchens' trades' names since `10.5-iv-a-ii`; reserving, collecting and her standing, in a job of its own, `itacate-reserving`, since `10.5b-iii-a` — and her stars about a kitchen since `10.5b-iii-b`; and Wera Cocina's handover — her kitchen's reservations, who reserved each, the handover and her thumb — in a job of its own, `cocina-handover`, since `10.5b-iv-a`, with her queue's claims since `10.5b-iv-b`: a late send keeps her moment, and only the database's last word drops one — and her kitchen's sealing secret since `10.9j-ii-b`; and her settings, her stars, how each dish may be eaten, − and + and the read before a deletion — in both apps' `account.ts` — in a job of its own, `cocina-settings`, since `10.5b-iv-c`; and what a kitchen uses — her choices, Wera's switch, *Cuéntanos* — read and set by `cocina/src/api/servicios.ts`'s names, with the door's `features` by Itacate's, in a job of its own, `cocina-features`, since `10.9a-i`; and who works at a kitchen — her role, the owner's list, *Quitar a …* never on an owner's row, *Salir de esta cocina* — by `cocina/src/api/equipo.ts`'s names, as a real owner and a real helper, in a job of its own, `cocina-team`, since `10.9b-ii` — and in it since `10.9b-iii` a helper joining by her owner's code, by `cocina/src/api/invitar.ts`'s; and following — *Seguir*, the bell and her list by `itacate/src/api/siguiendo.ts`'s names, *Te siguen N* by `cocina/src/api/seguidores.ts`'s — in a job of its own, `itacate-following`, since `10.9d-i`; and the loyalty card — the kitchen's setup, a phone's code, a neighbour's code read, a stamp each way and a reward by `cocina/src/api/tarjeta.ts`'s names, her phone's code, her cards and her claim by `itacate/src/api/tarjeta.ts`'s — in a job of its own, `loyalty-card`, since `10.9e-i`; and her numbers — *Tus números* by `cocina/src/api/numeros.ts`'s names, as the owner, after a plate reserved through Itacate's names and handed over through Wera Cocina's — in a job of its own, `cocina-numbers`, since `10.9f`; and promotions — her kitchen's, making one, *Terminarla hoy* and *Deshacer* by `cocina/src/api/promociones.ts`'s names, an offer joining one by `listing.ts`'s, the door's band and each offer's mark by Itacate's `cocinas.ts` — in a job of its own, `promotions`, since `10.9g-i`; and her phone's messages from the server — this phone's token, her kinds, her switch, a tap — by `cocina/src/api/push.ts`'s names, in a job of its own, `cocina-push`, since `10.5b-v-ii` — Itacate's `push.ts` in it too since `10.5c-iii`; and each app's answer to offers and a campaign's tap, by both `push.ts`' names and on the words the runbook's *on 1* approves, in a job of its own, `campaigns-in-the-apps`, since `10.5c-iii`), `cocina/src/auth/credentials.ts`, `app/src/auth/`, `app/src/lib/supabase.ts`, `app/src/cart/cart.ts`, `app/src/strings.ts`, `packages/money/cases.json`, `docs/runbooks/engagement.sql` and `docs/runbooks/health.sql` (each held by its suite in `supabase/tests/`), `docs/runbooks/delete-an-account.sh` and `docs/runbooks/delete-a-kitchen.sh` with their rehearsal, `docs/runbooks/delete-orphan-photos.sh` (rehearsed by the kitchens' photo check), `docs/runbooks/campaigns.sql` (the owner's campaigns, run step by step against the schema by its contract check, in a job of its own, `campaigns`, since `10.5c-ii`), root `package*.json`, each contract check by name, and the field rule's check with its two helpers — a module in any app's `src/api/` is a claim about the applied schema, and so is every runbook named here |
| `money.yml` | `packages/**` and root `package*.json` |
| `site.yml` | `site/**` and its two build checks. On a pull request it only builds; on `main` it **publishes `site/` to tu-wera.com** (GitHub Pages) — since `10.9c` with `.well-known/` (the two files that hand a kitchen's address to Itacate; uploaded with `include-hidden-files`, which GitHub's upload otherwise drops without a word) and the site's one script, on a kitchen's page. The aviso's name and address come from the repository secrets `RESPONSABLE` and `DOMICILIO`, never from a commit. The only workflow that deploys anything |

Adding a dependency moves the root lockfile, so it fires every workflow but `site.yml`.

- **The number to check a log against is the jobs that COULD fire for the paths changed** —
  each workflow has its own `paths:` filter, and an absent job is not a skipped one.
- **Those filters are for pull requests.** Every push to `main` runs every workflow but
  `site.yml` in full, whatever changed; only `site.yml` filters its push.
- ⚠️ **The three apps share one `node_modules`, so an install in `cocina/` or `itacate/` can move
  Wera's runtime** — measured 2026-10-27, and then no update reaches a pilot phone until new
  store builds. `docs/checks/wera-runtime.sh` (in `app.yml`) holds it to the runtime of Wera's
  builds in the field; the siblings' `CLAUDE.md` say how to pin a dependency so it never moves.
- A red `db.yml` whose steps read `skipped` after *Start Postgres* is a **registry throttle**,
  not a migration defect. **A cancelled job is not a failed assertion** — `gh pr checks`
  prints *fail* for both.
- **No workflow compiles a native app** — Wera's or either sibling's, nor the repository's own
  native code (Wera Cocina's `cocina/modules/geocodificador`, since `10.4d-i`). A native dependency
  swap stays green until a Mac or EAS builds it.

## Rules that are not negotiable

- **A file is not evidence; a green CI run is.** Every schema claim traces to a migration CI
  has applied (ADR-035 §9).
- **A green CI run is not a deploy.** Each check builds and deletes its own Postgres; the
  database a phone talks to is reached only by hand. **Say which you have evidence about: the
  schema, the code, or the shop.**
- **Deploying the database** — in no workflow on purpose: a deploy from CI would hold the
  database password, which no token scope limits, and the deploy check's answer depends on the
  world rather than the diff (`supabase/README.md`). Supabase tokens can now be scoped to
  one project (its docs, read 2026-10-27), so the old premise is gone; the decision is not:

  ```
  supabase db push                            # applies what the remote is missing
  bash docs/checks/5R-f-schema-deployed.sh    # proves it landed: version numbers, and the walls (grants) — not the rest of the schema
  ```
- **The one Edge Function deploys separately** — `supabase/functions/apple-revoke` (ADR-035
  §2.2: it tells Apple when an account made with Apple is deleted, and stores nothing).
  `db push` does not carry it, and nothing fails when it is missing:

  ```
  supabase functions deploy apple-revoke --use-api   # raise BUILD in its index.ts with every change
  bash docs/checks/5R-k-function-deployed.sh    # the hosted build is the merged one, and it holds its key
  ```

  Its three secrets are the owner's (`supabase/README.md`). **A second function needs a ruling** —
  and push is not a reason for one: a push to a phone is sent from Postgres through `pg_net`, as
  the Discord line is (ADR-035 §2.2, ruled 2026-10-27).
- **The owner's Discord alerts need their webhook set by hand** (`0070`: a line when somebody
  makes an account or opens a shop — or a kitchen, since `0072`). It lives only in the hosted Vault as
  `discord_avisos_webhook`; `db push` does not carry it, and nothing fails without it:
  `bash docs/runbooks/set-discord-webhook.sh`. **A message names nobody** — a name is an aviso
  change first.
- **Expo's push security is ON** (since `10.5b-v-iii`, on the `wera-app` account): Expo refuses
  every push without that account's access token, which lives only in the hosted Vault as
  `expo_push_access_token` (the robot user `push-sender`'s). `db push` does not carry it, and
  nothing fails visibly without it — **every message of both apps is refused, silently**. Replace
  it with `bash docs/runbooks/set-expo-push-token.sh`, prove it with
  `bash docs/checks/10.5b-v-iii-push-security.sh <file with a test phone's push token>`; to stop
  using it, the setting off FIRST, then the secret.
- **The site deploys itself on merge** (`site.yml`). `bash docs/checks/5R-d-ii-site-live.sh`
  proves what tu-wera.com is serving; nothing runs it but a person.
- **`store/` is read by no workflow, and `brand/` only where a suite holds an app's copy to its source** (the
  trades' drawings; since `11.6` Wera's colours and Archivo, in `app.yml`'s filter; since `11.7-i` the colours in `cocina-itacate.yml`'s too, since `11.7-ii` Mansalva, since `11.8-i` the counter's objects (`brand/mostrador/objetos.json` and `png/`), since `11.8-ii` their motions (`movimiento.json`), and since `11.10-i` the icon font and Google's G, since `11.10-iii` WhatsApp's glyph (`brand/iconos/WeraIconos.*` and `brand/marcas/**`), and since `11.10-ii` the drawings (`brand/dibujos/png/**`, `dibujos.json`), in both workflows' filters): the text a person pastes
  into the two stores' consoles, and the mark. `store/README.md` ties each store answer to what backs it.
- **Migrations are append-only once applied.** Fix forward with a new numbered migration;
  numbering is fixed in [`supabase/README.md`](supabase/README.md). The newest is
  `ls supabase/migrations/*.sql | tail -1`. `0006` and `0007` are permanent holes, so never
  infer the count from the highest number. Every migration has a row in that README's table
  (nothing checks it) — match the backticked filename anywhere in the line, because two rows
  are wrapped in links.
- **A migration keeps every build in the field working** (ADR-035 §2.2, ruled 2026-10-27): it
  adds — a table, a defaulted column, a function, an argument with a default — and never drops
  or renames what a build still in use calls, because every app's builds and every offline
  outbox call this one database. A signature changes by drop and re-create with the new
  argument defaulted (`0064`), never by an overload. **`docs/checks/field-rule.sh` holds it in
  CI** (`db.yml`): everything a signed-in phone could reach before the change must still answer
  after it, and a migration that removes something says why on a line of its own —
  `-- field-rule: breaks <kind> <key> — <why no build in use calls it>`. It proves a call is
  still found, not what it does; that half is still the session's.
- **A new function revokes `from public, anon`, never `from public` alone**, and grants
  `authenticated` only what a client calls — **and names that function in
  `supabase/pgtap/_walls.sql`'s list in the same PR.** That file is the walls as one query, run
  by CI (F12 of `01_rls_coverage.sql`) and on the hosted project (`5R-f`, group 7): until `0071`
  the hosted defaults granted the client roles everything and CI's nothing, so only reading the
  shop shows the shop (ADR-035, its revisions of 2026-10-27).
- **A person with no membership — Itacate's buyer — is denied by every policy**, and none is
  ever written that names her; what she reads of other businesses goes through one
  `security definer` function, and nothing is readable without an account (ADR-035 §2.7).
- **RLS is bypassed by the `postgres` superuser.** An isolation check run as superuser passes
  vacuously — test under `set role authenticated`.
- **A view is invisible to the RLS guard** (`01_rls_coverage.sql` joins `relkind = 'r'`).
  ADR-035 §2.7 keys invoker vs definer on where the fence is; `waste_reason_line` is the only
  `security definer` view and `supabase/tests/0041_waste_reason_line.sql` asserts it, so a
  second needs a ruling.
- **An RLS UPDATE refusal is a 200 with zero rows**, not a 403 — `.single()` surfaces it
  (PGRST116).
- **Never edit `graphify-out/`** — it is generated.

## Domain vocabulary

Spanish module names are the domain language, not a translation layer: Comprar (buy),
Vender (sell), Productos (catalog), Proveedores (providers), Merma (write-offs — *Desperdicio* until the owner's ruling of 2026-10-20; the route and code keep `desperdicio`), Números
(reports). `workspace` is the tenant; `location` is the store — they are not the same thing,
and conflating them is a one-way door (ADR-035 §2.3). A fonda (Wera Cocina) is a workspace
too; a buyer (Itacate) is no workspace's member (§2.7).

## Working agreement

One task per session, taken from `docs/PLAN.md`. **Estimate difficulty first and write down
what the estimate found.** Update `docs/PLAN.md` (and usually the handbook) when a task closes.

- **`M` and `L` are one sitting; `XL` splits on size** (owner, 2026-09-24). A split at `M`/`L`
  must name a non-size reason in its row: half is gated on an owner decision, the row carries
  two failure classes one of which is invisible here, or the deferral test separates
  look-questions not yet answerable. Full argument: the plan's `## Working agreement`.
- **Stop and ask before a one-way door** — a migration or anything else that changes the
  database's shape, a rule about who may see or do what, anything the seed bakes in, anything
  that changes what a shopkeeper, a fonda or a neighbour sees or types — unless his rulings in
  wera-vision's `negocio/decisiones.md` or the family-shell page already decide it. A notification
  question (what is sent, to whom, when, what is counted) is his product analyst's: park it in the
  decisions block as hers. When he cannot answer, park it in
  ⛔ DECISIONS OWED with a recommendation and carry on with what does not depend on it. (The
  owner's standing prompt; written here on 2026-10-13, because a session he starts without
  that prompt is bound by this file alone.)
- **Merging is automated.** Push, open the PR, wait for CI, **read the job log**, and on green
  run `gh pr merge` without asking — a migration he has ruled on included.
- **Never merge red, and never on a green tick alone** — a tick is also what a silently
  skipped step looks like. Confirm the checks by name in the log.
- **Report every decision made on the owner's behalf**, in the closing message and the PR body.
  Flag loudly the ones cheap now and expensive later — anything a migration or the seed bakes in.
- **A paid provider's change goes on his private price sheet** — a new provider, a new paid call, or a change in how often one is
  made also updates `negocio/costos.md` in `~/RetailerToolDev/wera-vision` (committed and pushed there). Prices never go in this
  public repository.
- **Merging is not deploying.** A session that merges a migration owes `supabase db push` and
  a green `5R-f-schema-deployed.sh`, or a sentence to the owner saying why not. A change to
  the Edge Function owes its own deploy and `5R-k-function-deployed.sh`, the same way.

Local database: `supabase start` then `supabase db reset`. Add
`-x realtime,storage-api,imgproxy,kong,mailpit,postgrest,postgres-meta,studio,edge-runtime,logflare,vector,supavisor`
to bring up only what a migration reset needs.

## graphify

A knowledge graph lives in `graphify-out/` over TypeScript, Markdown, SQL and shell. It is **AST-only** —
no semantic layer, since no `GEMINI_API_KEY` / `GOOGLE_API_KEY` is set — so it tells you
**where** something is, never what it means. Read the node count from `graphify-out/graph.json`
if it matters; never quote one here.

- For codebase questions, first run `graphify query "<question>"`; `graphify path "<A>" "<B>"`
  for relationships, `graphify explain "<concept>"` for a concept. If `graphify-out/wiki/index.md`
  exists, use it for navigation. Read `graphify-out/GRAPH_REPORT.md` only for broad review.
- **For what was DECIDED, grep the corpus**, not the graph.
- `docs/plan/archive/` is indexed; `archive/power-platform/` is not. The `.graphifyignore` rule
  is `/archive/` **with a leading slash** — a bare `archive/` silently drops `docs/plan/archive/`.
  Check a result's `src=` before citing it as current.
- SQL is indexed (tables, functions, triggers, views, CTEs). **`create policy` is not** — read
  `supabase/migrations/` or ask the database, and **grep case-insensitively**: every policy is
  written lower-case, so `grep 'CREATE POLICY'` returns nothing.
- After modifying code, run `graphify update .` (the git hooks do it on `main`).
- Every subagent prompt that involves code exploration must repeat these rules.
