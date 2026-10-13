# Wera — the owner's handbook

What the app does today, what is on your phone, what is waiting on you, how a
session goes, and the dates. Written for the owner, who is not a developer.

The live build state is always [`docs/PLAN.md`](PLAN.md). If this file and the plan
disagree, the plan is right and this file is the bug. A check
(`docs/checks/handbook-agreement.sh`) holds the two in agreement on what is done,
what was split, what is next and whether anything is waiting on you.

⚠️ **This file was 1,229 lines until 29 September.** Everything it used to say is
kept, unedited, in
[`docs/plan/archive/handbook/handbook-through-2026-09-29.md`](plan/archive/handbook/handbook-through-2026-09-29.md)
— every ruling of yours it recorded, the history of each job, and the long
explanations of the tools. Nothing was lost; it was moved.

---

## What the app does today

Wera is an **alpha** — your word, and accurate. Every screen reads and writes your
real database; none runs on sample data.

- **Getting in** — sign in by email or Google, create the shop, invite somebody by
  name with a code you read out, let in somebody who asks.
- **Productos** — the catalog: search, add, edit, open a family, and retire a
  product you created (products that were there before 24 September stay, by your
  ruling).
- **Vender** — the counter: a stepper and a keypad on every row, a basket, a slide
  that commits the sale. **Works with no signal**, and sends what it held when the
  signal comes back.
- **Comprar** — a delivery from a supplier, and **Costos**: what you have paid for a
  product over time, as a chart and a PDF.
- **Desperdicio** — what was thrown away, and why. Rosa never sees what it cost.
- **Proveedores** — the supplier directory: add, rename, look up, remove.
- **Lo último** — the last seven days of purchases, sales and write-offs, each with
  **Corregir** and **Eliminar**. Stock is a **ledger**, like a bank statement:
  nothing is erased, an undo writes a mirror-image entry, as a bank posts a refund.
- **Números** — what sold, by day, week or month, with IVA; **Precios** for how one
  product's buying and selling prices have moved; and **Descargar un mes** as a
  spreadsheet or PDF.

---

## What is on your phone

**Everything merged up to 10 October**, built by EAS in the cloud and installed that day over
the 9 October build, which kept your session and your shop's data. New on it: **account
deletion** (`5R-c`, *Tu cuenta* at the bottom of Ajustes) and **¿Olvidaste tu contraseña?**
(`5R-h`, under *Entrar* when signed out).

✅ **On 13 October a fix went out over the air to that build** (`5P-d`). It carries the aviso's
box and links (`5R-d-iii`), and it **switches the pilot's measurements on**: from then on your
phone files how long a sale takes to commit, how long Vender takes to open and how many taps a
record costs. Nothing on a shopkeeper's screen changes. It arrives the second time you open
Wera: close it completely, open it, close it, open it again. Then hold the title *Ajustes*:
the panel should say *Versión piloto-1*.

✅ **It takes fixes over the air**: a fix arrives the second time you open Wera after it ships.
It is signed until **10 October 2027**. The old `mx.bserafin.wera` icon can no longer open;
delete it. **The pilot member's Android has the same kind of build** and takes the same fixes.

**A new Android in the pilot installs the 13 October build**, not the 10 October one. The first
time Wera opens it runs what its install carried, and only the 13 October build carries the
aviso's box and the measurements. Its link is on expo.dev, under *Builds*: the newest Android
one marked `preview`. The link is not written here because this repository is public.

⚠️ **Do not reinstall it from Xcode on this Mac any more.** A build made here carries no
update channel, so the phone would stop taking fixes. A change that needs a new build (a new
native library) goes through EAS: `npx eas-cli build -p ios --profile preview`, from `app/`.

**Another iPhone in the pilot** has to be registered before it can install, and then needs a
new build. In Terminal.app, from `app/`, run `npx eas-cli device:create` and choose *Website*.
Send its owner the link (they open it on the iPhone and install a profile), then run the iOS
build again and send them its install link.

---

## What only you can judge — the screens to open

None of this blocks work. It is the polish you said you wanted to do later, and it
is the starting list for the design day. The full questions are in the archive
file above, section 2 of its catch-up.

| Open this | The question |
|---|---|
| **Lo último** | Does a delivery read at a glance as *that one*? Are two buttons under every row too much? Is landing on Comprar with the cart already full a relief or a surprise? |
| **Desperdicio** | Does `¿Qué pasó?` in a window you cannot dismiss help or get in the way? Does a write-off with no peso figure read as finished? |
| **Proveedores** | Does a list of bare names read as a directory or as unfinished? |
| **Productos → a product → Editar** | Add one through *Agregar* first (yours are all protected). Does the red *Retirar del catálogo* read as dangerous enough? |
| **Números** | Do fourteen day-bars read as a fortnight or a comb? Does *Descargar un mes* open in WhatsApp and a spreadsheet with its accents intact? |
| **Números → a product → Precios** | Do two lines read as your margin or a tangle? Does *Compra* with IVA confuse you, when you typed it without? |
| **Entrar → crear una cuenta con correo** | Nobody has ever signed up by email on the live project; all three users came through Google. Create one with a second email address and a password. It should let you straight in with no confirmation email, which is what you asked for. Then sign out and sign back in with it |
| **Entrar → *¿Olvidaste tu contraseña?*** | Signed out, type an email and tap the link under *Entrar*. WhatsApp should open a chat **with you**, with *"Hola, olvidé mi contraseña de Wera. Mi correo es …"* already written. Is the link easy enough to find, and is the message what you want to receive? |
| **Ajustes → Tu cuenta → *Aviso de privacidad*** | New on 13 October, once the update reaches your phone. It should open tu-wera.com/privacidad over the app, and closing it should bring you back to Ajustes |
| **Entrar → *¿No tienes cuenta? Crear una*** | New on 13 October. Signed out, the box *Acepto el Aviso de privacidad* sits above *Crear cuenta*. Tap *Crear cuenta* without ticking it: it should say *"Para crear tu cuenta, acepta el Aviso de privacidad."* Tap the underlined words: the page opens over the app and closing it keeps what you typed. Is the box easy to hit with *Letra grande*? Is it OK that the message stays on screen after you tick until the next tap of *Crear cuenta*, as every message on that screen does? Under *Entrar con Google* there is now one line, *Al continuar, aceptas el Aviso de privacidad*. To look you have to sign out; with signal, signing back in with Google brings your shop back |
| **Airplane mode, from cold** | The one real test: open Productos with signal, **wait over five minutes**, force-quit, airplane mode, reopen. Productos should list and Vender should sell |
| **The pilot's measurements** | On since 13 October, once the fix reaches your phone. Hold the title *Ajustes*: *Lecturas del piloto* should open and say *Versión piloto-1*. Then sell three things, one from inside the Carrito sheet, and open it again: does *Toques por registro* count the taps inside the sheet? |

---

## Where we are

**29 September is the cleaning day** — five jobs, `8a` to `8e`, that make the
documents smaller and change nothing a shopkeeper sees. **30 September is the
design day, with you.** The whole day is `docs/PLAN.md`, `## Step 8`.

| Job | What | State |
|---|---|---|
| **8a** | **The handbook, rewritten short** — this file | ✅ **Done 29 September** — 1,229 lines down to this; the rest moved to the archive |
| **8b** | **The live plan, cut to what is live** | ✅ **Done 29 September** — 5,573 lines to 420 |
| **8c** | **`CLAUDE.md` and `app/CLAUDE.md`, rules only** | ✅ **Done 29 September** — 57 KB to 14 KB |
| **8d** | **Housekeeping** — merged branches, old map snapshots, stale memories | ✅ **Done 29 September** — 17 branches, 50 MB of maps |
| **8e** | **The design map for Wednesday** — every colour, size and animation, and a screenshot of every screen | ✅ **Done 29 September** — https://claude.ai/artifact/4h59q1QEdc1q3ztYnN39EJ |
| **8f** | **The design pass, with you** | ✅ **Done 30 September** — light only; one filled button and one dimmed backdrop everywhere; Precios' cards fixed. Not on your phone yet |
| **8g** | **Your screen-by-screen review** — headers, the tab colour, sign-in and welcome, and what `8f` left you. **Widened on 12 October to a real first day**: sign up, create the shop, import the starter catalog, first sale | ▶️ **Back on 12 October, by you** — after the pilot path, in sessions with you. It settles the look before the logo goes in and before the store screenshots |
| **8h** | **Dark mode** | ⏸️ Set aside by you — *"Light only, for now"* |
| **9a** | **The starter catalog, step 1** — where the seven giros' products will live, and the import that copies them into a shop. `docs/PLAN.md`, `## Step 9` | ✅ **Done 1 October** — empty until your first giro session |
| **9b** | **The starter catalog, step 2** — the spreadsheet format we will fill together, one per giro, and the tool that checks it | ✅ **Done 1 October** — and the Catalog Prompt, below |
| **9c** | **Pollería, with you** — the first giro, product by product. Paste the **Catalog Prompt** | ✅ **Done 1 October** — 24 products, by the kilo, in *Pollo* and *Huevo* |
| **9d** | **The import, in the app** — choose giros, untick what you don't sell, *Importar*; and *Agregar del catálogo* on Productos for later | ✅ **Done 1 October** — on your phone with the next rebuild |
| **9e** | **Carnicería, with you** | ✅ **Done 1 October** — 54 new products in *Res*, *Cerdo* and *Tuétano*; the eggs tagged too |
| **9f** | **Verdulería, with you** | ✅ **Done 2 October** — 53 new products; herbs sold by the new unit *manojo*. *Caja* parked by you as an idea, not a task |
| **9g** | **Frutería, with you** | ✅ **Done 2 October** — 46 new products; melón, sandía, papaya, piña and pitaya both by the kilo and by the piece. Fruta picada left out for now |
| **9h** | **Abarrotes, with you** | ✅ **Done 2 October** — 1,017 products **with brands and presentations**, IVA 0 for now; the berries now say *por charola* |
| **9i** | **Cremería, with you** | ✅ **Done 5 October** — 79 new products: cheese and cold cuts by the kilo, cream by the litro, branded butter and cheese; a new category *Salsas y moles* shared with Abarrotes, Pollería and Carnicería |
| **9j** | **Materias Primas, with you** | ✅ **Done 9 October** — 139 new products: baking supplies, nuts and seeds, spices and sweets by the kilo, and 57 desechables by the package. **The starter catalog is complete: 1,413 products across seven giros** |
| **5R-c** | **Deleting an account, inside the app** — a store requirement. Ruled by you on 9 October: the person's login goes, and **the shop keeps their name** on what they did, shown as *"María (ex-miembro)"*. A sole owner's deletion deletes the shop, after a warning and an offer to download the month first. Immediate, with nothing kept for analytics | ✅ **Done 9 October** — *Tu cuenta → Eliminar mi cuenta*, at the bottom of Ajustes. On your phone since 10 October |
| **5R-h** | ***¿Olvidaste tu contraseña?*** — opens WhatsApp to you, and you set a new password by hand. Your number stays out of the public repository | ✅ **Done 9 October** — the link under *Entrar*, and the script below, *If somebody forgot their password*. On your phone since 10 October |
| **5R-b** | **The cloud build, and updates over the air** — a build made by EAS instead of this Mac, and a JavaScript fix reaching your phone in under an hour without a reinstall | ✅ **Done 10 October** — split into the three rows below, all three finished the same day |
| **5R-b-i** | **Everything that needs no Expo account** — the update library, the build settings, and the one command that ships a fix | ✅ **Done 10 October** — both phones' builds compile the way EAS will build them; the command is `docs/runbooks/ship-an-update.sh`. Nothing changed on screen |
| **5R-b-ii** | **The cloud build, and a fix reaching a phone in under an hour, timed** — with you: your Expo login, and a pilot member's Android | ✅ **Done 10 October** — a change merged at 07:33:56 UTC was on that Android at 07:38:39, **4 min 43 s**; sent back in **1 min 55 s**. See *Shipping a fix to the phones*, below |
| **5R-b-iii** | **The iPhones on updates too** — a cloud build for your iPhone, so a fix reaches it like the Android | ✅ **Done 10 October** — on your iPhone, still signed in; a test fix appeared and was undone. See *What is on your phone* |
| **5R-d** | **The store listing, and the *aviso de privacidad*** — the privacy notice, the store forms, screenshots, and the page Google wants for deletion requests | ✂️ **Split on 10 October** into the four rows below, after your rulings that night |
| **5R-d-i** | **The aviso, written in Spanish** — under the new 2025 privacy law; your name and home address as the responsible party; what a deleted account keeps. No lawyer for the pilot (your call, 12 October) | ✅ **Done 12 October** — the aviso and the deletion page are in `site/`, with blanks where your name and address go, filled in only when they are published. Also a script for deleting an account somebody asks for by email (below) |
| **5R-d-ii** | **The site at tu-wera.com** (bought 12 October, GoDaddy) — the aviso, the deletion page and a home page with `ayuda@tu-wera.com`; privacidad@ and ayuda@ forward to your Gmail through ImprovMX. Your name and address are GitHub secrets, never in the repository | ✅ **Done 12 October** — published from GitHub; the steps you did are under *Putting tu-wera.com up*, below. HTTPS on, and your test email arrived. Left for you, whenever suits: Google's consent screen (step 7), so pilot members stop needing the test-user list, and the domain check in step 2 |
| **5R-d-iii** | **The checkbox on *Crear cuenta*** — *"Acepto el Aviso de privacidad"*, ticked before the account is made; the same link in Ajustes | ✅ **Done 13 October** — the box, the line under *Entrar con Google* (your ruling of 12 October), and *Ajustes → Tu cuenta → Aviso de privacidad*. Each opens tu-wera.com/privacidad over the app. What to look at is in *What only you can judge* |
| **5R-d-iv** | **Both listings, as "Wera: tu tienda"**, Mexico only — descriptions, screenshots, the privacy forms; then the Android test: **12 people for 14 days** before the public listing | ⚠️ **This is where the next piece of work is** — a session can write the descriptions and the answers to both stores' privacy forms without you. The screenshots wait for your review and the logo; **the 14-day Android test does not** (only its testers see that listing), but it cannot start until you have 12 testers, and you have handed over 1 |
| **5R-k** | **Entrar con Apple** on iPhone — Apple asks for it beside Google | Ruled by you on 10 October; can be built any time |
| **5R-m** | **Your logo, on the app icon and the site** — the logo is yours (or your designer's); then the icon, the splash and a restyle of the three web pages | When the logo exists and after your review. **The icon needs a new build, not an over-the-air fix**, so it ships in the same build as Apple sign-in: each pilot phone reinstalls once, keeping its data |
| **5P-d** | **The pilot's measurements, switched on** for the phones on the test channel — one update, no reinstall | ✅ **Done 13 October** — the switch is a setting on EAS (`piloto-1`) and one fix shipped over the air to both phones. The Android build was made again that day, so a new pilot member's first sign-up has the aviso's box. The store builds never carry the switch, and the shipping command now refuses if they would |
| **5P-b** | **How much each pilot shop uses Wera** — sales, purchases and waste per shop per day, counted from the server. Nothing added to the app | ✅ **Done 13 October** — one command prints it, one row per shop per day for two weeks, with the days nothing was recorded shown as zeros. See *Seeing how much each shop uses Wera*, below. It was checked against your own shop: 3 sales and 2 purchases in the last 14 days |
| **5R-l** | **A lawyer reads the aviso** | ⏸️ Parked by you on 12 October — after the pilot, when it is a business |
| **—** | ⚠️ **One question is waiting on YOU**, in the plan's ⛔ DECISIONS OWED block. The daily count reads every shop in the database, and the aviso describes it as part of the **pilot**. That is true while every shop is on a test version, and stops being true for the first shop that installs from a store. **My recommendation:** when the store versions ship, reword that one purpose in the aviso so it covers every shop. A count per shop names nobody, and it is how you will know whether a shop you never met uses Wera. It costs an edit to the page, a new date, and the email to every account the aviso promises | Before the store submission (`5R-e`). Nothing before that waits on it |

**Set aside by you:** `5P-c`, the hand-count completeness check — *"At this point
my main interest is to improve the user experience."* **Your call, 29 September:**
the alpha is declared, and the work turns to design toward a beta and the stores.

**1 October — the starter catalog.** You asked for a default catalog by giro (Pollería,
Carnicería, Verdulería, Frutería, Abarrotes, Cremería, Materias Primas), imported at
onboarding and later. `9a`–`9b` build where it lives; `9c` and `9e`–`9j` are one session
with you per giro, choosing families and units product by product; `9d` is the app.

**Between the alpha and a beta is distribution, not code:** `5R-a` (Apple Developer
Program and Play Console — both opened 1 October), `5R-b` (TestFlight), `5R-c` account deletion
(a store requirement, ruled and built 9 October) and `5R-d` the *aviso de privacidad*. Order: `5R-c` (done), `5R-h` (forgotten password, done), `5R-b` (done: cloud builds and fixes over the air, on both phones), `5R-d` (split four ways on 10 October), `5R-k` (Apple sign-in), then submission. **Yours, with lead time:** ✅ tu-wera.com bought; ⏸️ the lawyer after the pilot; **12 Gmail addresses** for the Android test (**1 of 12** so far). **Order to the pilot** (12 October): the aviso, the site, the checkbox, the pilot's readings on, the engagement count; then the listings, Apple sign-in and submission. Parked by you: phone verification (`5R-i`) and email verification (`5R-j`).

---

## The dates

| Date | What | If it is missed |
|---|---|---|
| **13 October** | ✅ **Done 13 October** — you booted the sealed emulator; Wera opened **still signed in** after about 21½ days untouched. No further reading is scheduled; that emulator is free to use or delete | — |
| **30 April 2027** | **Delete the pilot's measurements** on the live database — the aviso promises it. If the pilot runs longer, change the date on the pages and tell the users first | The aviso says something false about people's data |

Both are in the plan's ⏳ DATES OWED block, which turns the checks red once one passes unticked. The 4 October rebuild is gone: your paid account signed the 9 October build for a year.

---

## How a working session goes

One task per session. Paste the prompt, the session does the work and ends with
what is next and what you need to decide. Then clear the conversation and go again.
Clearing is safe because everything that matters lives in files: `docs/PLAN.md`
says where we are, `CLAUDE.md` tells a fresh session the rules, ADR-035 holds the
architecture.

### Your main prompt

Deliberately free of numbers — anything countable lives in the files.

```
Read docs/PLAN.md and take ONE open task. One task per session, then stop — even if
it went quickly.

Start with `bash docs/checks/plan-handover.sh` — it names the next task and refuses
one that is blocked on a question I owe you. Trust it over your own reading. Then
check nothing was left behind: an unmerged PR, a migration that merged and was never
deployed, a reading I asked for and never got.

Estimate difficulty first and write down what the estimate found. An M or an L is
one sitting — build the whole row. Split only an XL, a row that is gated, or one
whose mistakes would be invisible in half of it.

Use graphify to find WHERE things are; search the plan corpus for what we DECIDED.
ADR-035 is authoritative — if it and the plan disagree, stop and tell me.

Respect the gates. If a row says its decision sits in the decisions block, open the
block and read it rather than trusting the row.

STOP AND ASK ME — do not decide it and carry on — when the answer is a one-way door:
a migration or anything that changes the database shape, a rule about who may see
what, anything the seed bakes in, or anything that changes what a shopkeeper sees or
types in the pilot. After an automated merge, undoing one of those costs a new
migration rather than an edit.

Otherwise don't wait on me: park the question in ⛔ DECISIONS OWED with your
recommendation and carry on with the SAME task. Never start a second task to fill
the time.

Verify properly and name the check that looked at it — never "the file exists", and
never a green tick on a run that had nothing to do. If only a person can judge it,
say so and tell me exactly what to look at on my phone.

A merged migration is not a deployed one: `supabase db push`, then
`bash docs/checks/5R-f-schema-deployed.sh`.

Any number you put in a document, take from the thing that runs — a test runner's
tally, a job log, the database — never from a grep, and say where it came from. If
you find a claim in the plan, CLAUDE.md or this handbook that is no longer true, fix
it in the same PR and tell me which.

End every session the same way, so I can read it in twenty seconds:
  - what shipped, and the check that looked at it, by name
  - what I must LOOK at on my phone, or "nothing to look at" — and whether the build
    on my phone has to be rebuilt first before I can open it
  - what you decided on my behalf, and what reversing it would cost
  - what is waiting on me — one recommendation with your reasoning, not a menu
  - the next task, and whether it is gated
If the question is about what a shopkeeper actually does, walk me through the
situations before showing me a design.
```

### The Catalog Prompt — for each giro of the starter catalog

Use it for the content rows of `## Step 9` (`9c` Pollería, then `9e`–`9j`), one giro per
session, clearing between them. For the build rows (`9d`), use the main prompt.

```
Today is one giro of the starter catalog: docs/PLAN.md, ## Step 9. Take the row
`bash docs/checks/plan-handover.sh` names. If it is a content session, it is ONE
giro, with me, and then stop.

First check nothing was left behind: an open PR, a merged migration not deployed.

How the session goes:
- Draft first, then walk me through it. Read supabase/catalog/README.md and every
  existing CSV before drafting: a product another giro already has is TAGGED,
  never added twice.
- Show the draft as a table in the chat, grouped by family: name, how it is
  bought, how it is sold, how it is priced, pack size, IVA, tags.
- I correct it row by row. Nothing goes into the CSV that I have not seen.
- Never invent what a shop does. If you are unsure whether it is sold by the
  kilo or by the piece, or whether it carries IVA, ask me. Say which rows you
  guessed.
- A unit the app does not have (docena, manojo, caja) is a migration. Stop and
  ask me — do not work around it.
- No prices, no pictures. No brands, unless I rule the giro brand-driven
  (Abarrotes is, 2 October; Cremería for its packaged goods, 5 October): then
  brand + product + presentation.

Then build: the CSV goes through `supabase/catalog/build.mjs`, which must pass,
into one numbered migration — then run `node --test supabase/catalog/build.test.mjs`
AGAIN, because the new migration is something that suite reads. Merge on a green CI run read by job name, then
`supabase db push` and `bash docs/checks/5R-f-schema-deployed.sh`.

End with, in twenty seconds of reading:
  - how many products, how many new, how many only newly tagged
  - the rows you guessed and I did not correct
  - anything parked for a later giro
  - the next row, and whether it is gated
```

### The Cleaning Prompt — for 29 September only

Paste it once per job (`8a`–`8e`), clearing between jobs. **When `8f` is next, the
cleaning is over — go back to the main prompt.**

```
Today is the cleaning day: docs/PLAN.md, ## Step 8. Take ONE row of it — the one
`bash docs/checks/plan-handover.sh` names — finish it, merge it, and stop.

First check nothing was left behind: an open PR, a merged migration not deployed.

Rules for today:
- Nothing a shopkeeper sees changes. No migration, no screen, no rule about who
  sees what. If a cleanup seems to need one, stop and ask me.
- Move, never copy, and never lose history: closed work goes to
  docs/plan/archive/, appended, one file per day.
- Smaller is the goal. Every document you touch comes out shorter; say by how
  much, measured with wc before and after.
- Keep every guard green. If a guard only protects one document from another and
  it stands in the way, do not delete it: list it with its runtime and park ONE
  recommendation in ⛔ DECISIONS OWED.
- Anything deleted outside git (branches, graph snapshots, memories): list it
  first, then delete only what you listed.
- Numbers come from the thing that runs, never from a grep.

End with, in twenty seconds of reading:
  - what got smaller, and by how much
  - the checks that looked at it, by name
  - anything you decided for me, and what undoing it costs
  - the next row, and whether it is gated
```

### What a machine enforces, and what is only the session's word

| The prompt says | Who enforces it |
|---|---|
| Take the task the plan marks next; not a gated one | **A machine** — `plan-handover.sh` refuses, on every pull request |
| Answer a dated obligation | **A machine** — a date passing unanswered turns the checks red |
| This handbook agrees with the plan | **A machine** — `handbook-agreement.sh` |
| Estimate first; name the check that looked | ⚠️ **Nobody** |
| Say what only a person can judge | ⚠️ **Nobody** — the `Costos` PDF passed every check and was wrong on your phone |
| Tell you the phone needs a rebuild | ⚠️ **Nobody** — but the date is in the dates block |
| Deploy a merged database change | ⚠️ **Nobody automatically** — `supabase db push`, then `bash docs/checks/5R-f-schema-deployed.sh` |
| Report what was decided on your behalf | ⚠️ **Nobody** — a session that decides and says nothing passes every check |

**The gates are mechanical; the checkpoints are not.** That is why the closing block
of the prompt asks, line by line, what was decided for you and what undoing it costs.
If a session ends without saying, that is a bug — say so.

**Merging is automatic, deploying is not.** A session pushes, opens a pull request,
reads the job log (not the green tick) and merges on green, database changes
included. Merging touches no database: a merged change reaches your shop only when
somebody runs `supabase db push`. Saying *no, I want to read it first* always costs
nothing.

---

## Shipping a fix to the phones

A change that is only JavaScript reaches the phones in minutes, without the stores and
without reinstalling. Once the fix has merged green, from this Mac:

```
bash docs/runbooks/ship-an-update.sh preview "what the fix does"
```

It refuses, and sends nothing, if the fix is not on `main`, if EAS is missing one of the
app's three settings, or if no phone could run it (a fix that needs a new build). It also says
whether the fix carries the pilot's measurements, and it refuses to send them to the store
versions (`production`). On the
phone: close Wera completely, open it, close it, open it again. **Measured 10 October: 4 min
43 s from merge to seen on a pilot Android; on your iPhone a test fix appeared about 3 minutes
after it was published.**

**If a fix turns out to be bad, undo it first.** The undo command is at the top of
`docs/runbooks/ship-an-update.sh`. It sends every phone back to the version it was
installed with. That took 1 min 55 s on the Android and about 5 minutes on your iPhone.

**To switch the pilot's measurements off**, take the setting away and ship once more. Phones
stop measuring the second time they open Wera after that:

```
(cd app && npx eas-cli env:delete preview --variable-name EXPO_PUBLIC_PILOT --non-interactive)
bash docs/runbooks/ship-an-update.sh preview "Apaga las lecturas del piloto"
```

⏸️ **On hold by you (10 October): a copy of the Android signing key.** EAS holds the only
copy. A phone accepts an update to Wera only if it is signed with the same key, so losing it
would mean uninstalling. When you want the copy: in Terminal.app, `cd` into `app` and run
`npx eas-cli credentials -p android`.

---

## Seeing how much each shop uses Wera

From this Mac, in the project folder. It reads and changes nothing:

```
supabase db query --linked -o table -f docs/runbooks/engagement.sql
```

One row per shop per day, newest first, for the last 14 days: how many **sales**, **purchases**
and **write-offs** (Desperdicio) were recorded that day. It counts records, not pesos. Swap
`-o table` for `-o csv` and add `> uso.csv` to get a file a spreadsheet opens.

How to read it:

- **A row of zeros is a day nothing was recorded.** That is the point of the read: a shop that
  stops using Wera shows up as zeros, and a shop that signed up and never recorded anything is
  listed too, from the day it signed up.
- **A zero from the last few days can still change.** A phone with no signal keeps its sales and
  sends them when it reconnects, and each one counts on the day it was made. So a recent zero
  means *nothing has arrived*, which is not always *nothing was sold*. Wera cannot tell those
  apart from here; ask the shop.
- **The day is the shop's own day**, midnight to midnight where the shop is.
- **A cancelled sale still counts** on the day it was recorded. The cancellation itself does not.
- **A shop with two stores gets a row per store**, named *shop · store*.
- It counts shops, never people. The aviso promises that (*"conteos por tienda, no por
  persona"*), so adding a column about a person means changing the aviso first.

To look further back, change the one number at the top of the query (`14`).

**Is a phone measuring?** The pilot's measurements are a different read:

```
supabase db query --linked -o table "select build, count(*) from public.pilot_reading group by build"
```

A row named `piloto-1` means a phone on the test channel has measured. **On 13 October there was
none yet.** To make one on your phone: close Wera completely, open it, close it, open it again,
then record one sale. Run the line above a minute later.

---

## If somebody forgot their password

They tap *¿Olvidaste tu contraseña?* on *Entrar* and a WhatsApp chat opens with you, naming
their email. **Before you change anything, make sure the person writing is the person who owns
that account** — a voice note, a call, or someone you know by sight. Anyone can type someone
else's email.

Then, from the repository folder on the Mac:

```
bash docs/runbooks/reset-a-password.sh their@email.com
```

It prints a new password like `wera-k7mq-3xtp`. Send it to them; they sign in with it. It changes
nothing and tells you why when the email has no account, or when the account signs in with
Google (tell them to tap *Entrar con Google*). To try it safely first, add `--local`.

There is no *Cambiar contraseña* in the app yet, so the password you send is theirs until they
ask for another.

---

## If somebody asks to delete their account

Most people do it themselves: *Inicio → Ajustes → Tu cuenta → Eliminar mi cuenta*. The page at
`tu-wera.com/eliminar-cuenta` also offers email, because Google requires a way that does not need
the app. **Act only on a request sent from the account's own address**; if it comes from another
one, ask the person to prove who they are first.

From the repository folder on the Mac:

```
bash docs/runbooks/delete-an-account.sh their@email.com
```

It does exactly what the app's button does. Their login goes, and the shop keeps their name as
*(ex-miembro)*. **If they are the only owner of a shop, it stops and prints the shop's name**,
because deleting them deletes the shop. Write back, make sure they understand, then run it again
with `--shop "the name it printed"`. It changes nothing when the email has no account or the
name is wrong. To try it safely first, add `--local`. Then reply that it is done; the page
promises an answer within 20 business days.

---

## Putting tu-wera.com up

The pages are in `site/` and GitHub publishes them every time a change to them merges. Your
name and address are **never in the repository**: GitHub keeps them as two secrets and fills
them in when it builds the site. Seven steps, in this order — **1 and 2 first**, because
nothing can build without them, and **3 before 4**, because the pages promise something
about deleted accounts that is true only once 3 is done.

1. **GitHub — your name and address.** github.com/bersermi/RetailerManagementTool →
   *Settings → Secrets and variables → Actions → New repository secret*, twice:
   `RESPONSABLE` = your full legal name as the aviso should print it; `DOMICILIO` = your
   address on one line (street and number, interior, colonia, alcaldía, C.P., Ciudad de
   México). GitHub never shows them again. To change one later, overwrite it, then
   *Actions → site → Run workflow*.
2. **GitHub — switch the site on.** Same repository → *Settings → Pages*: *Source* =
   **GitHub Actions**; *Custom domain* = `tu-wera.com` → Save (it says the DNS check failed
   until step 4). Then github.com/settings/pages → *Add a domain* → `tu-wera.com`: it shows
   a TXT record for step 4, and after step 4 you come back and press *Verify*. That stops
   anybody else's GitHub site from claiming the domain.
3. **Supabase — the audit log.** Your project → *Authentication* → turn **off** *Write audit
   logs to the database*. Then *SQL Editor*: `delete from auth.audit_log_entries;` → Run.
   Without this, a deleted account leaves its email behind in that log.
4. **GoDaddy — the records.** *My Products → tu-wera.com → DNS*. **Delete** the `A` record
   for `@` (it says *Parked*) and the `CNAME` for `www`; if *Forwarding* is on, remove it.
   **Add:** four `A` records named `@` — `185.199.108.153`, `185.199.109.153`,
   `185.199.110.153`, `185.199.111.153`; a `CNAME` named `www` → `bersermi.github.io`; the
   `TXT` from step 2; and for email, `MX` `@` → `mx1.improvmx.com` (priority 10), `MX` `@` →
   `mx2.improvmx.com` (priority 20), and `TXT` `@` → `v=spf1 include:spf.improvmx.com ~all`.
5. **ImprovMX — the email** (free; GoDaddy stopped including forwarding with new domains).
   improvmx.com → sign up with your Gmail → add `tu-wera.com` → aliases `privacidad` and
   `ayuda`, both to your Gmail. Then send a test email to privacidad@tu-wera.com from another
   address. Your replies go out from your Gmail address, which is fine for the pilot.
6. **When tu-wera.com opens** (minutes, at most an hour after step 4): GitHub → *Settings →
   Pages* → tick **Enforce HTTPS**. Then a session runs `bash docs/checks/5R-d-ii-site-live.sh`,
   which checks every page, that nothing sets a cookie, and the email records.
7. **Google Cloud — Google sign-in for everybody.** console.cloud.google.com → the project
   with Wera's sign-in → *Google Auth Platform → Branding*: home page `https://tu-wera.com/`,
   privacy policy `https://tu-wera.com/privacidad/`, authorized domain `tu-wera.com`. Then
   *Audience → Publish app*. After that nobody has to be added as a test user. Google's
   screen will still name the *supabase.co* address rather than *Wera*; showing the name is
   Google's brand verification, which the pilot does not need.

---

## What only you can decide

- **Anything a shopkeeper sees or types** — wording, taps, what a cashier may change.
- **What the business will need** — a second store, staff moving between shops,
  different prices per store. These change the database shape and are painful to
  retrofit.
- **When something is good enough to stop.** A session will keep finding
  improvements.
- **Whether to trust a piece of work.** Ask how it was verified: *"it applied
  locally"* and *"the independent check passed"* are very different answers.

---

## Looking at things yourself

- **The project map**: `graphify-out/graph.html` in a browser — *where*, never *why*.
- **The documents**: `docs/PLAN.md` (the build, and the one live plan),
  `docs/adr/ADR-035-target-architecture-postgres-react-native.md` (the architecture
  — it wins any disagreement), `CLAUDE.md` (the rules a session obeys),
  `docs/plan/archive/` (closed work, one file per day — this system's own true
  history). `archive/power-platform/` at the top is an abandoned earlier system:
  never current.

---

## Small glossary

**Migration** — one numbered file of database changes. Never edited once applied;
a new one corrects the old, the same principle as the ledger.

**RLS (row-level security)** — the database rule that one shop can never see
another's data. The database enforces it, so a bug in a screen cannot leak it.

**Commit / push / branch** — a checkpoint on this Mac / sending it to GitHub / a
parallel copy for work in progress; `main` is the real one.

**Pull request (PR) / merge** — asking to fold a branch into `main`, with the
checks' verdict attached / accepting it. Merging deploys nothing.

**CI** — the automated checks GitHub runs on every push. The independent referee.

**RPC** — a database function the app calls to do something: record a sale, undo one.
