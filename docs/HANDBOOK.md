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
  their email (Wera shows a code once and you send it to them), let in somebody who asks.
  **Apple's sign-in is built for iPhone and is not switched on yet**: see *Turning on Entrar
  con Apple*, below.
- **Productos** — the catalog: search, add, edit, open a family, and retire any
  product, including the ones that came with the app (your ruling of 14 October, which
  replaced *"only what you created"*). Nothing brings a retired product back.
- **The starter catalog** — creating the shop asks for your giros only and brings all
  their products (14 October); *Agregar del catálogo* in Productos brings more later and
  still lets you untick. A product brought in can be renamed, repriced and retired.
- **Vender** — the counter: a stepper and a keypad on every row, a basket, a slide
  that commits the sale. **Works with no signal**, and sends what it held when the
  signal comes back. For you and a manager, a tap on a price changes it there.
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

⚠️ **Not there: how much stock you have.** Every sale, delivery and write-off moves the
stock in the database, and no screen shows the result (found 13 October). So the store
listings do not say *inventario*; the home page of tu-wera.com still does.

---

## What is on your phone

✅ **Your iPhone has the build of 14 October** (EAS `5f9a384f`, which you built in
Terminal.app and installed from its QR code): the cow, Apple sign-in's code and that day's
three fixes. **Fixes reach it over the air again.** ⚠️ **The pilot member's Android does not
have its new build yet**, and no fix reaches it until it does.

- **Your iPhone.** Apple's button shows on Entrar when you are signed out, but it cannot sign
  anybody in until your steps 1 to 3 in *Turning on Entrar con Apple* are done.
- **The pilot member's Android.** Its owner opens the newest Android build marked `preview` on
  expo.dev and installs it over the one they have. Since 14 October that is the build with
  the cow, Apple sign-in's code and the three fixes of that day (giros only, the family
  buttons, prices from Vender), **so this phone installs once and not twice**. The file is
  also on this Mac, in `~/RetailerToolDev/wera-builds/` (the `.apk` ending in `f3fa55be`).
  Apple's button is for iPhones and does not show on it.

⚠️ **Until the Android installs the new build, no fix reaches it over the air.** Fixes are
made for the newest builds and the old ones cannot take them. Until then it runs everything
merged up to 10 October plus the fix of 13 October.

**What the new build carries from its first launch:** everything merged up to 13 October,
with the aviso's box and links and the pilot's measurements (`5P-d`). Hold the title *Ajustes*
and the panel should say *Versión piloto-1*.

✅ **It takes fixes over the air**: a fix arrives the second time you open Wera
after it ships. It is signed until **10 October 2027**. The old `mx.bserafin.wera` icon can no
longer open; delete it.

**A new Android in the pilot installs the newest `preview` build**. Its
link is on expo.dev, under *Builds*; it is not written here because this repository is public.
⚠️ **EAS lists a build's file as expiring two weeks after it is made** (these: 27 October), so
every build's file is also kept on this Mac, in `~/RetailerToolDev/wera-builds/`. An Android
installs from the `.apk` file itself. A phone that already has Wera is not affected.


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
is the starting list for your screen-by-screen review (`8g`). The full questions are in the archive
file above, section 2 of its catch-up.

| Open this | The question |
|---|---|
| **Lo último** | Does a delivery read at a glance as *that one*? Are two buttons under every row too much? Is landing on Comprar with the cart already full a relief or a surprise? |
| **Desperdicio** | Does `¿Qué pasó?` in a window you cannot dismiss help or get in the way? Does a write-off with no peso figure read as finished? |
| **Proveedores** | Does a list of bare names read as a directory or as unfinished? |
| **Productos → a product → Editar** | Make one first: in Productos, type a name nothing matches and tap *Crear Nuevo Producto* (yours are all protected, and so is anything from *Agregar del catálogo*). Does the red *Retirar del catálogo* read as dangerous enough? |
| **Inicio — *Una operación no se guardó*** | Found 13 October: one delivery you recorded on the night of 24 September never reached the database. It hit a unit problem that was fixed the next day, and it is still listed as not saved. Does Inicio tell you so? Did you record that delivery again? Tell a session either way |
| **Ajustes → Tu cuenta → *Eliminar mi cuenta*** | On your phone since 10 October and never looked at. Open it, read the warning, tap *Cancelar*. **Do not confirm.** Is the warning clear about the shop being deleted with you? |
| **Agregar del catálogo → the list you untick** | Never looked at on a phone. With *Abarrotes* it is about a thousand rows in one list: does it scroll smoothly? Should *Volver* ask before throwing away what you unticked? |
| **Números** | Do fourteen day-bars read as a fortnight or a comb? Does *Descargar un mes* open in WhatsApp and a spreadsheet with its accents intact? |
| **Números → a product → Precios** | Do two lines read as your margin or a tangle? Does *Compra* with IVA confuse you, when you typed it without? |
| **Entrar → crear una cuenta con correo** | Nobody has ever signed up by email on the live project; all three users came through Google. Create one with a second email address and a password. It should let you straight in with no confirmation email, which is what you asked for. Then sign out and sign back in with it |
| **Entrar → *¿Olvidaste tu contraseña?*** | Signed out, type an email and tap the link under *Entrar*. WhatsApp should open a chat **with you**, with *"Hola, olvidé mi contraseña de Wera. Mi correo es …"* already written. Is the link easy enough to find, and is the message what you want to receive? |
| **Ajustes → Tu cuenta → *Aviso de privacidad*** | New on 13 October, once the update reaches your phone. It should open tu-wera.com/privacidad over the app, and closing it should bring you back to Ajustes |
| **Entrar → *¿No tienes cuenta? Crear una*** | New on 13 October. Signed out, the box *Acepto el Aviso de privacidad* sits above *Crear cuenta*. Tap *Crear cuenta* without ticking it: it should say *"Para crear tu cuenta, acepta el Aviso de privacidad."* Tap the underlined words: the page opens over the app and closing it keeps what you typed. Is the box easy to hit with *Letra grande*? Is it OK that the message stays on screen after you tick until the next tap of *Crear cuenta*, as every message on that screen does? Under *Entrar con Google* there is now one line, *Al continuar, aceptas el Aviso de privacidad*. To look you have to sign out; with signal, signing back in with Google brings your shop back |
| **The listing your testers will see** | New on 13 October, and not in the app: `store/google-play.md`, section 2 — the short and the long description — and the five pictures in `store/google-play/`. Is this how you would describe Wera to a shopkeeper? It says nothing about *inventario*, because no screen shows how much stock there is. Only your testers see it, and every word can change |
| **The icon and the first screen** | New on 13 October, on your iPhone. Is the cow the right size inside the square next to your other apps? The first screen at launch is the cow in rust on cream, not on the rust square: is that the one you want? Both need a new build to change, so say so before Apple sign-in's build |
| **Entrar → Apple's button** | Only after your five steps in *Turning on Entrar con Apple*. Signed out, there is a button under *Entrar con Google*. It is Apple's own, so it is white with a black outline and says *Continuar con Apple*; Apple does not allow *Entrar con Apple*. Is it the right size beside Google's? Would you rather have Apple's black one? Both can change without a new build |
| **The first screen after signing in, with no shop** | New on 13 October, once a build made after it is on your phone. At the very bottom of *Crea tu tienda* there are two grey lines: *Cerrar sesión* and *Eliminar mi cuenta*. Until now somebody who signed in with the wrong account was stuck there. Are they easy enough to find without getting in the way of a new shopkeeper? In Ajustes the same two are red; here they are grey on purpose, and you can say otherwise |
| **Deleting an account made with Apple** | Do it with a throwaway, never your own: step 6 of *Turning on Entrar con Apple* walks you through it. Apple's sheet appears once more before the account goes. Does that read as a normal confirmation or as something broken? |
| **Solicitudes → a request from a hidden address** | Somebody who hid their email with Apple and typed your shop's code. Their **name** is on top and *Correo oculto con Apple* under it, as you ruled. Is the name enough to know who it is? |
| **Creating a shop: just the giros** | New on 14 October, on a build made after it (your iPhone's step 5; the Android's next install). *Crea tu tienda* shows the giros and no list of products: picking Abarrotes brings all 1,017. Then, in Productos, a product you don't sell: *Editar → Retirar del catálogo*. Is retiring one at a time bearable with a thousand? |
| **Productos → Refrescos** | Fixed 14 October. *Agregar Variante*, *Editar* and *Costos* were under the 126th product; now they sit in a bar at the bottom, and the list opens at the one you tapped. Do they read as belonging to the marked product? |
| **Vender → tap a price** | New on 14 October, for you and a manager, not a cashier. Tap the underlined price on a row: a sheet asks the new price, *Guardar*, and you are back in the sale. A product with no price in the basket says *Poner precio*. Does the underline read as something to tap? |
| **Airplane mode, from cold** | The one real test: open Productos with signal, **wait over five minutes**, force-quit, airplane mode, reopen. Productos should list and Vender should sell |
| **The pilot's measurements** | On since 13 October, once the fix reaches your phone. Hold the title *Ajustes*: *Lecturas del piloto* should open and say *Versión piloto-1*. Then sell three things, one from inside the Carrito sheet, and open it again: does *Toques por registro* count the taps inside the sheet? |

---

## Where we are

**29 September was the cleaning day** (`8a` to `8e`) **and 30 September the design day**
(`8f`); both are done. What is left of that step is your review, `8g`. Since then: the
starter catalog, the release path, the aviso and the site, and on 13 October the logo.

| Job | What | State |
|---|---|---|
| **8a** | **The handbook, rewritten short** — this file | ✅ **Done 29 September** — 1,229 lines down to this; the rest moved to the archive |
| **8b** | **The live plan, cut to what is live** | ✅ **Done 29 September** — 5,573 lines to 420 |
| **8c** | **`CLAUDE.md` and `app/CLAUDE.md`, rules only** | ✅ **Done 29 September** — 57 KB to 14 KB |
| **8d** | **Housekeeping** — merged branches, old map snapshots, stale memories | ✅ **Done 29 September** — 17 branches, 50 MB of maps |
| **8e** | **The design map for Wednesday** — every colour, size and animation, and a screenshot of every screen | ✅ **Done 29 September** — https://claude.ai/artifact/4h59q1QEdc1q3ztYnN39EJ |
| **8f** | **The design pass, with you** | ✅ **Done 30 September** — light only; one filled button and one dimmed backdrop everywhere; Precios' cards fixed. On your phone since 10 October |
| **8g** | **Your screen-by-screen review** — headers, the tab colour, sign-in and welcome, and what `8f` left you. **Widened on 12 October to a real first day**: sign up, create the shop, import the starter catalog, first sale | ▶️ **Back on 12 October, by you** — after the pilot path, in sessions with you. It settles the look before the logo goes on the website and before the public listings' screenshots (the app icon is already in) |
| **8h** | **Dark mode** | ⏸️ Set aside by you — *"Light only, for now"* |
| **9a** | **The starter catalog, step 1** — where the seven giros' products will live, and the import that copies them into a shop. `docs/PLAN.md`, `## Step 9` | ✅ **Done 1 October** — empty until your first giro session |
| **9b** | **The starter catalog, step 2** — the spreadsheet format we will fill together, one per giro, and the tool that checks it | ✅ **Done 1 October** — and the Catalog Prompt, below |
| **9c** | **Pollería, with you** — the first giro, product by product. Paste the **Catalog Prompt** | ✅ **Done 1 October** — 24 products, by the kilo, in *Pollo* and *Huevo* |
| **9d** | **The import, in the app** — choose giros, untick what you don't sell, *Agregar N productos*; and *Agregar del catálogo* on Productos for later | ✅ **Done 1 October** — on your phone since 10 October |
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
| **5R-d-iv** | **Both listings, as "Wera: tu tienda"**, Mexico only — descriptions, screenshots, the privacy forms; then the Android test: **12 people for 14 days** before the public listing | ✂️ **Split on 13 October** into the three rows below: what a session could do without you, what needs your hands in Play Console, and what waits for your review and the logo |
| **5R-d-iv-a** | **Everything for the Android test that needs no hands of yours** — the text and the answers to every form for both stores, the pictures Google asks for, and the store version of the app, built | ✅ **Done 13 October** — it is all in `store/`. The store version built that day will not be the one uploaded: you ruled the same evening to wait for the build with the cow. The steps are under *Putting Wera on Google Play's closed test*, below. Found on the way: nothing in Wera shows how much stock a shop has, so the listing does not say *inventario* (the home page of tu-wera.com still does); and the app's icon is still Expo's blue "A" |
| **5R-d-iv-b** | **The Android test itself** — you make the demo account, paste the listing, upload the app and send it to Google; then 12 testers for 14 days | **Yours, now** — the store file is in your Downloads folder, and nothing waits for Apple sign-in. ⚠️ There are three there since 14 October: upload the one whose name has **`-5-`** (`…-5-giros.aab`). It has the cow, three fewer permissions and the fixes of 14 October, so a tester's very first screen asks only for giros; the `-3-` and `-4-` ones are older builds. Six steps, under *Putting Wera on Google Play's closed test*. You have **all 12** testers since 14 October: their addresses go straight into Play Console. Tell a session the day the twelfth joins |
| **5R-d-iv-c** | **The public listings** — the screenshots and final text for both stores, and the App Store's record | **No longer waits for your review** (your call, 14 October): made from today's screens, and retaken after your review as an update |
| **5R-k** | **Entrar con Apple** on iPhone — Apple asks for it beside Google | ✂️ **Split on 13 October** into the two rows below: what a session could build and check without a phone, and what only your iPhone can show |
| **5R-k-a** | **Apple sign-in, built** — Apple's button on Entrar, the name Apple hands over, and telling Apple when such an account is deleted. Four things you ruled that day: a small server function that stores nothing; a hidden email shows the person's name in *Solicitudes*; you send the aviso's notice yourself; and the first screen gets *Cerrar sesión* and *Eliminar mi cuenta* | ✅ **Done 13 October** — in the app's code, on the site (the aviso and the deletion page now name Apple) and in the architecture record. **Not on any phone, and not switched on**: that takes your five steps |
| **5R-k-b** | **Apple sign-in, working on your iPhone** — your five steps, then a session reads the result with you holding the phone | ⚠️ **This is where the next piece of work is** — and it starts with you: *Turning on Entrar con Apple*, below. Do the steps in order and tell a session when they are done; it checks each one and tells you if one is missing |
| **5R-m** | **Your logo, on the app icon and the site** — the icon, the splash and a restyle of the three web pages | ✅ **You chose the mark on 13 October: the cow's face, option A**, with the W in its fringe. It is the file `brand/wera-mark.svg`, and the three options are still on the canvas: https://claude.ai/artifact/DQFB1T7w62t6DYUnTyJDch. **And its colour the same day: rust, on cream.** **The icon is in since 13 October: a cream cow on a rust square**, with builds of its own, because you asked for it on your phone at once. Each pilot phone installs again after Apple sign-in, keeping its data. What is left for this row is the site: the mark and a restyle of the three pages, after your review |
| **5P-d** | **The pilot's measurements, switched on** for the phones on the test channel — one update, no reinstall | ✅ **Done 13 October** — the switch is a setting on EAS (`piloto-1`) and one fix shipped over the air to both phones. The Android build was made again that day, so a new pilot member's first sign-up has the aviso's box. The store builds never carry the switch, and the shipping command now refuses if they would |
| **5P-b** | **How much each pilot shop uses Wera** — sales, purchases and waste per shop per day, counted from the server. Nothing added to the app | ✅ **Done 13 October** — one command prints it, one row per shop per day for two weeks, with the days nothing was recorded shown as zeros. See *Seeing how much each shop uses Wera*, below. It was checked against your own shop: 3 sales and 2 purchases in the last 14 days |
| **5P-e** | **The pilot's start list** — what has to be true before a shop that is not yours signs up: backups, the two security fixes, a health check you can run, and getting the app onto each phone | Your three answers are in (15 October), so a session can build it. ✅ **Your phone is already measuring**: 37 readings from your iPhone's new build that morning |
| **5R-l** | **A lawyer reads the aviso** | ⏸️ Parked by you on 12 October — after the pilot, when it is a business |
| **—** | ✅ **Nothing is waiting on YOU in the plan's decisions block.** You answered the last three on 15 October: a nightly copy from this Mac until the pilot starts, then Supabase Pro (the same database, upgraded, not moved); both database doors closed; an invitation honoured straight away only for a Google or Apple sign-in. The pilot's start list (`5P-e`) builds them | — |

**Set aside by you:** `5P-c`, the hand-count completeness check — *"At this point
my main interest is to improve the user experience."* **Your call, 29 September:**
the alpha is declared, and the work turns to design toward a beta and the stores.

**1 October — the starter catalog.** You asked for a default catalog by giro (Pollería,
Carnicería, Verdulería, Frutería, Abarrotes, Cremería, Materias Primas), imported at
onboarding and later. `9a`–`9b` build where it lives; `9c` and `9e`–`9j` are one session
with you per giro, choosing families and units product by product; `9d` is the app.

**Between the alpha and a beta is distribution, not code:** `5R-a` (Apple Developer
Program and Play Console — both opened 1 October), `5R-b` (cloud builds and fixes over the air; TestFlight comes with the App Store listing), `5R-c` account deletion
(a store requirement, ruled and built 9 October) and `5R-d` the *aviso de privacidad*. Order: `5R-c` (done), `5R-h` (forgotten password, done), `5R-b` (done: cloud builds and fixes over the air, on both phones), `5R-d` (split four ways on 10 October), `5R-k` (Apple sign-in), then submission. **Yours, with lead time:** ✅ tu-wera.com bought; ⏸️ the lawyer after the pilot; **12 Gmail addresses** for the Android test (**1 of 12** so far). In Play Console all six steps can go: the store file with the cow is in your Downloads folder. **The order now** (14 October, your call: both stores as soon as possible): the Android test is yours, today; switching Apple sign-in on is yours too, then a session reads it on your iPhone (`5R-k-b`); then the listings from today's screens and the iPhone's submission, which can be first; Android's public listing follows its 14 days. Your review and the pilot's start list run beside them. Parked by you: phone verification (`5R-i`) and email verification (`5R-j`).

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

*Finished: all seven giros are in (`9c`–`9j`). Kept for a future giro.*

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
- A unit the app does not have (docena, caja) is a migration. Stop and
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

*Finished on 29 September. Kept as the record.*

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
| Take the task the plan marks next; not a gated one | **A machine, in part** — on every pull request that touches the app, the plan or this handbook, `plan-handover.sh` checks that the plan names exactly one next task and that no open question of yours blocks it. Whether the session took THAT task is its word |
| Stop and ask before a one-way door | ⚠️ **Nobody** — it is a sentence in your prompt, and since 13 October in `CLAUDE.md` |
| Answer a dated obligation | **A machine** — a date passing unanswered turns the checks red |
| This handbook agrees with the plan | **A machine** — `handbook-agreement.sh` |
| Estimate first; name the check that looked | ⚠️ **Nobody** |
| Say what only a person can judge | ⚠️ **Nobody** — the `Costos` PDF passed every check and was wrong on your phone |
| Tell you the phone needs a rebuild | ⚠️ **Nobody** — and no rebuild is dated any more: the build on your iPhone is signed until 10 October 2027 |
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
`docs/runbooks/ship-an-update.sh`. ⚠️ **Run it twice**: as written for the Android, then
with `--platform ios` and the iPhone's runtime (the script prints both runtimes when it
ships). Each sends those phones back to the version they were installed with. That took 1
min 55 s on the Android and about 5 minutes on your iPhone.

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
none yet** (the row `8d8758c` is the 28 September build; ignore it). To make one on your phone: close Wera completely, open it, close it, open it again,
then record one sale. Run the line above a minute later.

---

## If somebody forgot their password

They tap *¿Olvidaste tu contraseña?* on *Entrar* and a WhatsApp chat opens with you, naming
their email if they had typed it (otherwise ask them for it). **Before you change anything, make sure the person writing is the person who owns
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

**If they signed in with Apple and hid their email**, their account is under an address Apple
invented, not the one they write from, so the script finds nothing. Ask them for the shop's
name and tell a session: it can find the account's address, and you run the script with that.
⚠️ The script does not tell Apple, which only the app can do. In your reply, add: *"Para que
Wera deje de aparecer en tu cuenta de Apple: en tu iPhone, Configuración → tu nombre → Iniciar
sesión con Apple → Wera → Eliminar."*

---

## Putting tu-wera.com up

✅ **Done on 12 and 13 October, and kept as the record.** Still yours: step 7, and pressing
*Verify* in step 2.

The pages are in `site/` and GitHub publishes them every time a change to them merges. The
aviso's copy of your name and address is **never in the repository**: GitHub keeps them as
two secrets and fills them in when it builds the site. ⚠️ Your address is nowhere in it. Your
name is, once: in an old file of the abandoned Power Apps version (see the questions waiting
on you). Seven steps, in this order — **1 and 2 first**, because
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

## Turning on Entrar con Apple

The code is merged (`5R-k-a`, 13 October). **Nothing works until these five steps are done**,
and they are yours because each needs your Apple account, your Supabase account or your mail.
About half an hour in all. Do them in this order, then tell a session; it checks each one.

⚠️ I have not seen Apple's or Supabase's consoles: the names below are from their help pages,
and a label may read a little differently.

**1. The key, on Apple's developer site** (developer.apple.com/account → *Certificates, IDs &
Profiles*).
- *Identifiers* → `mx.wera.app` → tick **Sign In with Apple** → *Save*. Skip this if it is
  already ticked.
- *Keys* → **+** → name it `Wera Sign in with Apple` → tick **Sign in with Apple** →
  *Configure* → Primary App ID `mx.wera.app` → *Save* → *Continue* → *Register* → **Download**.
- ⚠️ **The file downloads once and never again.** It is called `AuthKey_XXXXXXXXXX.p8`; the ten
  characters are its **Key ID**. Keep it outside the repository, for example in
  `~/RetailerToolDev/wera-keys/`. Never paste it into a chat or a commit.

**2. Give the key to the function** (Terminal, from the repository folder; put your Key ID in
both places):

```
supabase secrets set APPLE_TEAM_ID=RGWA74UM3G APPLE_KEY_ID=XXXXXXXXXX APPLE_PRIVATE_KEY="$(cat ~/RetailerToolDev/wera-keys/AuthKey_XXXXXXXXXX.p8)"
bash docs/checks/5R-k-function-deployed.sh
```

The second line should end *all … assertion groups passed*. The function itself is already
on the live project since 13 October; all it lacks is this key.

**3. Supabase's switch** (supabase.com/dashboard → your project → *Authentication* → *Sign In /
Providers* → **Apple**). Turn it on. In **Client IDs** type `mx.wera.app`. Leave *Secret Key*
empty: that is for a website's sign-in, which Wera does not have. *Save*.

**4. The notice.** The aviso promises an email before a change to what data is used. Since 14 October it announces two changes, Apple's and the daily count's. Send this
from your own mail to every account that is not yours, before step 5. There are three accounts
today; a session can tell you which are not yours.

> **Asunto:** Cambio al aviso de privacidad de Wera
>
> Hola:
>
> Te escribimos porque tienes una cuenta en Wera. El 14 de octubre de 2026 actualizamos
> nuestro aviso de privacidad: tu-wera.com/privacidad
>
> Qué cambia:
>
> 1. En iPhone, Wera ahora también permite entrar con Apple. Quien elige entrar así nos
>    comparte, a través de Apple, su nombre y su correo (o una dirección que lo oculta, si así
>    lo prefiere). Cuando esa persona elimina su cuenta, le avisamos a Apple para que retire
>    el acceso.
> 2. Contamos cuántas ventas, compras y desperdicios registra cada tienda por día, para saber
>    si Wera le sirve. Antes lo decíamos solo de las versiones de prueba; ahora aplica también
>    a las versiones de la App Store y de Google Play. Son conteos por tienda, no por persona.
>
> Para ti no cambia nada en cómo usas Wera, y no usamos tus datos para nada más.
>
> Si tienes dudas o no estás de acuerdo, responde a este correo o escribe a
> privacidad@tu-wera.com.
>
> Wera: tu tienda

**5. The iPhone's build** — ✅ **done 14 October** (EAS `5f9a384f`, installed from its QR
code). For the next time (Terminal.app itself, not a `!` line: it asks you questions).

```
cd ~/RetailerToolDev/RetailerManagementTool/app && npx eas-cli build -p ios --profile preview
```

It asks for your Apple ID and a six-digit code, because the build has to add *Sign in with
Apple* to the app's signing profile. Say yes when it offers to. About ten minutes later
expo.dev shows the build with an install link; open it on the iPhone, or tell a session and it
installs over Wi-Fi. It installs over the Wera you have; your session and your shop stay.

**6. Then look, with a session if you like.** In this order, because Apple asks *share or hide
my email* only once:
- Sign out (*Ajustes → Cerrar sesión*). Tap Apple's button and choose **Ocultar mi correo**.
  You land on *Crea tu tienda*, in a new and empty account. That is expected.
- At the bottom, tap *Eliminar mi cuenta* and confirm. **Apple's sheet appears once more**; go
  through it. You are back on Entrar.
- ✅ **The proof it worked:** on the iPhone, *Configuración → your name → Iniciar sesión con
  Apple* no longer lists Wera, and tapping Apple's button again asks for your name and email
  as if for the first time.
- This time choose **Compartir mi correo**. If your Apple account uses the same address as
  your Google sign-in, you should land in your own shop. If you land on *Crea tu tienda*
  instead, tap *Cerrar sesión*, sign in with Google as always, and tell a session: that is
  something it needs to know.
- ⚠️ **Never delete your own account to test this.** You are the only owner, so it deletes the
  shop.

⚠️ **What this does not cover:** somebody who makes their account with Apple and later moves
to an Android phone cannot get in there. Apple's button is on iPhone only, as you ruled. It
can be added later without touching anybody's account.

---

## Putting Wera on Google Play's closed test

Google will not let a personal account publish an app until **12 people have been opted in to a
closed test for 14 days in a row**. Nothing about it is public: only the people on your list
can see the listing or install the app. Everything you paste is in
[`store/google-play.md`](../store/google-play.md), in the order Play Console asks, and the
pictures are in `store/google-play/`.

**The store build has the cow**, and since the evening of 13 October a newer one also drops
three permissions Wera never used; it does not wait for Apple sign-in. Neither Google nor
your testers ever see Expo's blue "A". **All six steps can start now**: the store file is in
your Downloads folder, and step 4 names it.

Once it is uploaded, Google reviews the first release before anybody can join (hours,
sometimes up to seven days). You do not need all twelve testers to upload: each tester's 14
days start the day they join.

⚠️ **Two things to know before you upload:**

- **Uploading the app in step 4 makes `mx.wera.app` permanent** on Google's side. A package
  name can never be changed, deleted or used again.
- **A pilot phone must not install the Play version.** It is the same app to Android, so the
  phone would have to uninstall the pilot build first, and the Play version does not take the
  pilot's measurements. A pilot member can be a tester on a different phone.

1. **Google sign-in for everybody** — step 7 of *Putting tu-wera.com up*, above, if you have
   not done it. Until then a tester who taps *Entrar con Google* is refused.
2. **Make the demo account**, which Google's reviewers sign in with. On your iPhone, with
   signal: *Ajustes → Cerrar sesión*, then *¿No tienes cuenta? Crear una* with an address you
   can read (your Gmail with `+wera` before the `@` works) and a password you will give to
   Google. Create a shop called *Tienda Demo*, take a giro's products, record two sales. Sign
   out and back in with Google: your own shop comes back. This is also the first email
   sign-up anybody has made on the live project, which *What only you can judge* asks you to
   try.
3. **Play Console → Create app**, then *Dashboard → Set up your app*. Paste sections 1 to 4
   of `store/google-play.md`: the listing, the store settings and every *App content* form.
   The demo account's email and password go in *App access*. The icon and the wide picture
   in `store/google-play/` are the cow's since 13 October.
4. **Closed testing → Create new release.** Upload
   `~/Downloads/wera-tienda-1.0.0-5-giros.aab`, the newest store build (it is also on
   expo.dev under *Builds*, the newest Android one marked `production`, until 13
   November). ⚠️ Not the `-3-` or `-4-` files beside it, which are older builds; if you
   already uploaded one of them, make a new release with this one. Accept
   *Play App Signing*. Countries: **Mexico** only. Testers: a list with the Gmail addresses.
5. **Send for review.** When Google approves it, *Closed testing → Testers* shows a link:
   *Copy link*, and send it to each tester. They open it signed in to the Gmail on your list,
   tap *Become a tester*, and install Wera from Google Play.
6. **Tell a session the day the twelfth tester joins.** The 14 days end two weeks after that,
   and the date goes into the plan so nobody has to remember it. Then *Dashboard → Apply for
   production* opens, and Google asks how the test went: section 7 of the same file lists the
   questions, so keep a note of what the testers tell you.

Add a tester later in *Closed testing → Testers*; nothing restarts for the others. A tester
who leaves and comes back starts their own 14 days again.

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
checks' verdict attached / accepting it. Merging deploys nothing to the app or the database; the website is the exception, and a merged change to `site/` is published.

**CI** — the automated checks GitHub runs on every push. The independent referee.

**RPC** — a database function the app calls to do something: record a sale, undo one.
