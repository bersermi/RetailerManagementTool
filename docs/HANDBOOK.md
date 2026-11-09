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

- **Getting in** — sign in by email or Google, create the shop (the first giro you pick is its
  *giro principal*, starred; it picks the drawing at the top of the tabs), invite somebody by
  their email (Wera shows a code once and you send it to them), let in somebody who asks.
  **Apple's sign-in is built for iPhone and is not switched on yet**: see *Turning on Entrar
  con Apple*, below.
- **Productos** — the catalog: search, add, edit, open a family, and retire any
  product, including the ones that came with the app (your ruling of 14 October, which
  replaced *"only what you created"*). Nothing brings a retired product back.
- **The starter catalog** — creating the shop asks for your giros only and brings all
  their products (14 October); *Agregar del catálogo* in Productos brings more later and
  still lets you untick. A product brought in can be renamed, repriced and retired.
- **Vender** — the counter, **redrawn on 15 October as your row B**: each product with its
  initials on the left (its photo's place, for when there are photos), the name, the price and a
  round green `+`; a basket, and a slide that commits the sale. **Works with no signal**, and
  sends what it held when the signal comes back. For you and a manager the price is a chip with a
  pencil, and a tap changes it. **A product with no price never goes in the basket**: your `+`
  asks its price first and adds it; a cashier's `+` says who can price it.
- **Comprar** — a delivery from a supplier, in its own blue: each product shows what
  that supplier charged last time and the margin it leaves, and a product with no cost
  asks its cost first. And **Costos**: what you have paid for a product over time, as a
  chart and a PDF.
- **Merma** (called *Desperdicio* until 20 October) — in its own berenjena, and since 27 October it
  is **Tirar** for everyone: what was thrown away, with *Hoy* and *Caducado* already chosen and
  changeable, and each product's expiry; Rosa never sees what it cost. It no longer asks for the
  store's address. **Te lo compro** — one product at a time for Wera to collect at the store — is
  **paused** at your word of 27 October: hidden, not deleted, and the requests already made stay.
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

⏳ **9 November: Itacate's first iPhone build — yours to install.** Your command made it this afternoon. On your iPhone open https://expo.dev/accounts/wera-app/projects/itacate/builds/282cfb7d-73c5-4333-b25e-7345b69c79fd and tap *Install* (EAS keeps it until 23 November). Read inside before you get it: signed for your iPhone until October 2027, Google's map and its key, the map with the list over it. Sign in with Google, as in Wera. **What to look at:** *What only you can judge* → *Itacate → the map* — publish a dish from Wera Cocina first. **And three things read today:** **your iPhone's Wera is the App Store version** (holding *Ajustes* opens nothing), so test updates no longer reach it — only your `production` command does; nothing in Wera changes before `10.6a`, whose session puts the test build back first. **You hold no Android**: the Android entries below describe Itacate's and Wera Cocina's Android test builds, seen on a test phone here; a look on an Android is someone you ask, only when it is needed. And **Wera Cocina's updates of 7 November reached your iPhone today**.

⏳ **7 November, night: Itacate's map, sent over the air** (*Itacate: el mapa con las cocinas, y la lista encima (10.5-iv-b-i)*, then *Itacate: tu ubicación, solo después de entrar*) to Itacate's test build **for Android** — your iPhone has no Itacate yet (`10.5-iv-b-ii`). On the Android: open Itacate, wait ten seconds, **close it completely** and open it again — the update runs from the second open. **First sign it arrived:** *Cerca* is a map with the list over it, half-way up. **What to look at:** *What only you can judge* → *Itacate → the map*. Seen first on a test Android with that same file, opened signed out: each update downloaded on the first open and ran on the second (the app's own update record). And a fix found there: until now, a brand-new Itacate asked for your location over the sign-up screen; now it asks only once you are in, on *Cerca*. The privacy page and the terms say Itacate shows a map (tu-wera.com/privacidad/cocina-e-itacate). Nothing changes in Wera or Wera Cocina.

⏳ **7 November, afternoon: Wera Cocina's form and its first run, sent over the air** (*Wera Cocina: lo que vale normalmente en cada
platillo, cómo la verán en Itacate y tu primera vez (10.5-v-d)*, then three small fixes to the cow as it opens — the last *Wera
Cocina: la vaca al abrir, sin parpadeo*) to Wera Cocina's test builds — **your iPhone's included**, with nothing to reinstall. On the
iPhone: open Wera Cocina, wait ten seconds, **close it completely** and open it again — the update runs from the second open; if it
still looks as before, once more. **First sign it arrived:** *Publicar una oferta* asks ***Lo que vale normalmente*** on a dish, with
***Así la verán en Itacate*** under the hours. **What to look at:** *What only you can judge* → *Wera Cocina → the first run, and Así
la verán en Itacate* — ⚠️ the first run only with a throwaway account. **And to Itacate's Android test build**, the same afternoon:
nothing you can see — its dish card is now a part Wera Cocina shares. Seen first on a test Android with each same file, opened signed
out: downloaded on the first open, running on the second (each app's own update record); the cow's opening recorded there frame by
frame after each fix; and every new screen on a test copy of the database before the merge. The privacy page no longer says the usual
price is optional (tu-wera.com/privacidad/cocina-e-itacate). Nothing changes in Wera.

⏳ **7 November, morning: Wera Cocina's daily reminder, *Así la ven* and *Ver como la ven*, sent over the air** (*Wera Cocina: tu
recordatorio diario, Así la ven y Ver como la ven (10.5-v-c-ii)*) to Wera Cocina's test builds — **your iPhone's included**, with nothing
to reinstall. On the iPhone: open Wera Cocina, wait ten seconds, **close it completely** and open it again — the update runs from the
second open; if it still looks as before, once more. **First sign it arrived:** in *Mi cocina*, ***Ver como la ven*** beside *Editar tu
página*. **What to look at:** *What only you can judge* → *Wera Cocina → your reminder, Así la ven and Ver como la ven*. ⚠️ What you
publish is on the live database, and Itacate shows it — use a test kitchen. **And to Itacate's Android test build**, the same morning:
nothing you can see — its two pages are drawn by parts Wera Cocina now shares. Seen first on a test Android with each same file, opened
signed out: downloaded on the first open, running on the second (each app's own update record); and every new screen on a test copy of
the database before the merge. The privacy page says the reminder (tu-wera.com/privacidad/cocina-e-itacate, section 3, dated 7
November). Nothing changes in Wera.

⏳ **6 November, evening: Wera Cocina's *Hoy*, *Tus ofertas* and *Mi cocina*, sent over the air** (*Wera Cocina: Hoy, Tus ofertas y
Mi cocina, Deshacer (10.5-v-c-i)*) to Wera Cocina's test builds — **your iPhone's included**, with nothing to reinstall. On the
iPhone: open Wera Cocina, wait ten seconds, **close it completely** and open it again — the update runs from the second open; if it
still looks as before, once more. **First sign it arrived:** a bar at the foot with *Hoy* and *Mi cocina*, and the titles in rounder
letters. **What to look at:** *What only you can judge* → *Wera Cocina → Hoy, Tus ofertas and Mi cocina*. ⚠️ What you publish is on
the live database, and Itacate shows it — use a test kitchen. **And to Itacate's Android test build**, the same evening: the name on a
kitchen's page and a dish's in Nunito, and the tab bar's soft pill staying round when you switch tabs (Wera Cocina's, the same
bar, squared after the first switch). Seen first on a test Android with each same file, opened signed out: downloaded on the first open, running on the second (each
app's own update record), Wera Cocina's first title in Nunito; and every new screen on a test copy of the database before the merge.
Nothing changes in Wera.

⏳ **6 November, afternoon: Itacate's tab bar, *Tú* and *Dónde buscar*, sent over the air** (*Itacate: Cerca y Tú, Dónde buscar,
Ordenar, letras y movimiento (10.5-v-b)*) to Itacate's Android test build — **nothing to look at on your iPhone** (no Itacate build
for an iPhone yet). On the Android with Itacate's test build: open Itacate, wait ten seconds, **close it completely** (swipe it away)
and open it again — the update runs from the second open; if it still looks as before, once more. **First sign it arrived:** signed
out, *Tu cuenta* in rounder letters and *Crear cuenta* in dark blue, not green. **What to look at:** *What only you can judge* →
*Itacate → its tab bar, Tú and Dónde buscar*. Seen first on a test Android with that same file, opened signed out: downloaded on the
first open, running on the second (the phone's own update record), its first screen in Nunito and blue; and, on a test copy of the
database, every screen signed in, the sheet's spring and the screens' entrance. The privacy page says the postal-code choice
(tu-wera.com/privacidad/cocina-e-itacate, section 10). Nothing changes in Wera or Wera Cocina.

⏳ **5 November, late night: the words, sent over the air to both apps** — Wera Cocina (*Wera Cocina: Publicar una oferta y Vende hasta
el último plato (10.5-v-a)*) to its test builds, **your iPhone's included**, with nothing to reinstall; and Itacate (*Itacate: La comida
del día de tu colonia, a mejor precio — sin ofertas, Por hoy ya se terminó (10.5-v-a)*) to its Android test build (no Itacate build for
an iPhone yet). On each phone: open the app, wait ten seconds, **close it completely** and open it again — the update runs from the
second open. **What to look at:** signed out, each app's first screen now opens on its line — *Vende hasta el último plato* in Wera
Cocina, *La comida del día de tu colonia, a mejor precio* in Itacate; on your kitchen, the button ***Publicar una oferta***, and its
screen ***Tu oferta de hoy***; in Itacate, a kitchen's page that published today and ended says ***Por hoy ya se terminó***, and a
quiet kitchen ***Suele tener ofertas …*** once it has a pattern. Do they read as a better price for food that gets eaten — never as
leftovers? Seen first on a test Android with each same file, opened signed out: the update downloaded on the first open and ran on
the second (each phone's own update record), and both first screens with their line. The privacy page, the terms and tu-wera.com's
home page say *tus ofertas del día*. Nothing changes in Wera.

⏳ **5 November, evening: Itacate — what you can pick up now, first, and *Ordenar*, sent over the air** (*Itacate: lo que
puedes recoger ahora, primero, y Ordenar (10.5-iv-a-iv)*) to Itacate's Android test build — **nothing to look at on your iPhone**
(no Itacate build for an iPhone yet). On the Android with Itacate's test build: open Itacate, wait ten seconds, **close it
completely** (swipe it away) and open it again — the update runs from the second open; if the list still looks as before, once
more (the download can finish during the second open). **What to look at:** *What only you can judge* → *Itacate → the kitchens
near you* — ⚠️ **publish two dishes from Wera Cocina first**: *Ordenar* shows once the list has two cards. Seen first on a test
Android with that same file, opened signed out: the update downloaded and ran (the phone's own update record). The privacy page
says it in the same words (tu-wera.com/privacidad/cocina-e-itacate). Nothing changes in Wera or Wera Cocina.

⏳ **5 November, midday: Itacate — a kitchen's page and a dish's, sent over the air** (*Itacate: la página de cada cocina y de
cada platillo (10.5-iv-a-ii)*) to Itacate's Android test build — **nothing to look at on your iPhone** (no Itacate build for an
iPhone yet). On the Android with Itacate's test build: open Itacate, wait ten seconds, **close it completely** (swipe it away) and
open it again — the update runs from the second open. **What to look at:** *What only you can judge* → *Itacate → a kitchen's page
and a dish's* — ⚠️ **publish a dish from Wera Cocina first**, ideally with a photo, on *Bernies Bobas* or *Test 2*: the live
database had no publication this morning. Seen first on a test Android with that same file, opened signed out: Android started the
fresh install once by itself, the next open downloaded this update and the one after ran it; and, on a test copy of the database,
every state of both pages — and *Cómo llegar* opening Google Maps with directions to the kitchen. The privacy page says the two
links open Google Maps (tu-wera.com/privacidad/cocina-e-itacate, section 10). Nothing changes in Wera or Wera Cocina.

⏳ **5 November: Itacate shows the kitchens near you, sent over the air** (*Itacate: las cocinas cerca de ti (10.5-iv-a-i)*) to
Itacate's only test build, the Android one — **nothing to look at on your iPhone**: there is no Itacate build for an iPhone yet
(it comes with the map, `10.5-iv-b`). On the Android where you installed Itacate's test build (the 4 November entries below say
how — **EAS keeps the file until 11 November**): open Itacate, wait ten seconds, close it completely and open it again — the
update runs from the second open, and asks for your location once. **What to look at:** *What only you can judge* → *Itacate →
the kitchens near you* — ⚠️ **publish something from Wera Cocina first** (*Bernies Bobas* or *Test 2*): the live database has no
publication today, so the list says *Todavía ninguna cocina tiene algo publicado* until you do. ⚠️ **Until you fix Google's Android
key** (*Before Wera Cocina reaches your testers*, item 6), a postal code cannot be found and *Test 3* shows no distance. Seen first
on a test Android with that same file: downloaded on the first open, running on the second, opening on *Cerca de ti*; and, on a
test copy of the database, every card, the quiet kitchens' lines, the walk out of the zone and back, and the postal code. The
privacy page says what Itacate now does with your location (tu-wera.com/privacidad/cocina-e-itacate, section 10). Nothing changes
in Wera or Wera Cocina.

⏳ **4 November, night: Wera Cocina keeps your kitchen's point, sent over the air** (*Wera Cocina: tu cocina en el mapa sin
preguntarle a Google cada vez (10.5-i-b-ii)*) to Wera Cocina's test builds — **your iPhone's included**, with nothing to
reinstall. On the iPhone: open Wera Cocina, wait ten seconds, close it completely and open it again — the update runs from
the second open. **What to look at, on your kitchen's screen — the small map under your address:** the first time the update
runs, the app asks Google where your address is, once, and keeps that point; **close it and open it again: the map should be
there at once, with no *Buscando tu dirección…*** — it is drawn from the kept point now. *Cambiar dirección* should open with
the same point on its small map. **If you set your own point earlier, nothing changes**: yours is drawn, and nothing of
Google's is kept. Afterwards a session can read on the live database that your kitchen kept its point (today none has one).
Seen first on a test Android with the same update: downloaded on the first open, running on the second. The privacy page
says it (tu-wera.com/privacidad/cocina-e-itacate, sections 3 and 7). Nothing changes in Wera or Itacate.

⏳ **4 November, night: Wera Cocina — *Eliminar esta cocina*, sent over the air** (*Wera Cocina: eliminar solo tu cocina (10.5-iii-c)*) to Wera Cocina's test builds — **your iPhone's included**, with nothing to reinstall. On the iPhone: open Wera Cocina, wait ten seconds, close it completely and open it again — the update runs from the second open. **What to look at:** *What only you can judge* → *Wera Cocina → deleting a kitchen, keeping the account* — with a throwaway account. The database change went first the same night, and the privacy page and Wera Cocina's deletion page say what goes and what stays (tu-wera.com/eliminar-cuenta/cocina, *Eliminar solo tu cocina*). Nothing changes in Wera or Itacate.

⏳ **4 November, evening: Itacate's *Eliminar mi cuenta*, sent over the air** (*Itacate: Eliminar mi cuenta
(10.5-iii-b)*) to Itacate's only test build, the Android one. **Nothing to look at on your iPhone**: there is no
Itacate test build for an iPhone yet. On the Android where you install Itacate's test build (the entry below says
how — **EAS keeps the file until 11 November**): open Itacate, wait ten seconds, close it completely and open it
again — the update runs from the second open. Seen first on a test Android with that same file: this morning's
update on the first open, this one on the second. **What to look at:** *What only you can judge* → *Itacate →
deleting an account* — with a throwaway account. The same evening Apple's deletion function learned Itacate, and
Itacate's deletion page went live (tu-wera.com/eliminar-cuenta/itacate). Nothing changes in Wera or Wera Cocina.

⏳ **4 November, morning: Itacate's sign-in, sent over the air** (*Itacate: entra con Google, Apple o tu
correo (10.5-iii-a)*) to Itacate's only test build, the Android one, right after your one command (*both
settings hold*). **Nothing to look at on your iPhone**: there is no Itacate test build for an iPhone yet —
it comes with `10.5-iv`, which changes Itacate's iPhone build anyway. On any Android you hold (Itacate is a
separate app, so nothing else on it changes): open
https://expo.dev/accounts/wera-app/projects/itacate/builds/2b638d21-19e4-43de-b060-2e83e8c4732b, download
the file and open it — **EAS keeps it until 11 November**, so install it before then. Open Itacate, wait
ten seconds, close it completely and open it again — the update runs from the second open. Seen first on a
test Android with that same file: the old screen on the first open, *Tu cuenta* on the second. **What to
look at:** *What only you can judge* → *Itacate → signing in*. Nothing changes in Wera or Wera Cocina.

⏳ **4 November: Wera Cocina — your page in Itacate and a photo per dish, sent over the air** (*Wera Cocina: tu página en Itacate y una foto por platillo (10.5-ii)*) to Wera Cocina's test builds — **your iPhone's included**, with nothing to reinstall: the build on it takes it (the camera and the photo pieces were in it from the start). On the iPhone: open Wera Cocina, wait ten seconds, close it completely and open it again — the update runs from the second open. **What to look at:** *What only you can judge* → *Wera Cocina → your page in Itacate, and a photo per dish* — and the real screens and the nine drawings are on one page: https://claude.ai/artifact/BptbFT7edNLbxZxcTcsGZW (open it on claude.ai). ⚠️ Use a test kitchen: what you save is on the live database, and its photos in the live photo store. Seen first on a test Android against a test copy of the database: the editor, choosing a photo with no permission asked, the camera asked for only at *Tomar foto*, a photo's location removed before it was stored, a dish published with a photo and *Repetir* reusing it. The privacy page and both deletion pages are live with the new text. Nothing changes in Wera.

✅ **3 November, night: Wera Cocina — address first, sent over the air** (*Wera Cocina: tu dirección primero — el pin es una sugerencia (10.4h)*) to Wera Cocina's test builds — **your iPhone's included**, with nothing to reinstall: the build you installed this morning takes it. ✅ **Looked at on your iPhone, 6 November** — *"work very good"* (your words; the row in *What only you can judge*). On the iPhone: open Wera Cocina, wait ten seconds, close it completely and open it again — the update runs from the second open. **What to look at:** *What only you can judge* → *Wera Cocina → address first*. ⚠️ Registering makes a real kitchen on the live database — use a test account. Seen first on a test Android (stand-in answers for Google, so nothing went to Google): the two screens, the pin on the small map, registering without touching the map — and the database keeping the address and the directions, and no point. The database change went first, the same night, and the privacy page says her point is kept only if she sets one (tu-wera.com/privacidad/cocina-e-itacate). Nothing changes in Wera.

✅ **3 November: Wera Cocina on Google — new test builds, your iPhone's first.** ✅ **Installed and looked at the same day** — *"The search works amazing"* (your word). An update cannot bring it: the iPhone's key changes the app's settings, so **your iPhone's Wera Cocina takes no update from now on until you install this build** (Wera is not touched). On your iPhone open https://expo.dev/accounts/wera-app/projects/cocina/builds/a1d7040f-5630-40db-b13a-a3d3dbeaa251 and tap *Install* — it goes over the one you have, and your session and kitchen stay; EAS keeps it until 17 November, and a copy is `~/RetailerToolDev/wera-builds/cocina-1.0.0-3-preview-google.ipa`. Read inside before you get it: Google's map and its key are in it, and the new words. **What to look at:** *What only you can judge* → *Wera Cocina → Google on your iPhone*. **And one for Android**, for any Android you hold (it is a separate app, so Wera on that phone is untouched): open https://expo.dev/accounts/wera-app/projects/cocina/builds/fba4918c-3a05-4f66-b6ea-03894599fa05 on it, download the file and open it (a copy: `cocina-1.0.0-4-preview-google.apk`; EAS keeps it until 17 November). It opened on the test phone; nobody has signed in on it, so the Android half of that look is the first time Google answers it.

⏳ **2 November, later that night: Wera Cocina's search covers the State of Mexico, sent over the air** (*Wera Cocina: la búsqueda cubre la Ciudad de México y el Estado de México (10.4f)*) to Wera Cocina's test builds — **your iPhone's included**, with nothing to reinstall; it comes with the map fixes of the entry below. On the iPhone: open Wera Cocina, wait ten seconds, close it completely and open it again. **What to look at:** register a kitchen with a test account and an address in the State of Mexico — the map should open there, and typing the street and number should list the door; an address in another state should say *No encontramos esa calle en la Ciudad de México ni en el Estado de México…* (*What only you can judge* → *Wera Cocina → the pin in the middle, and your door in the list*). Seen first on a test Android: with Tepetlixpa as the town, *Morelos 10* listed **Avenida Morelos 10 — Tepetlixpa** at the top. ⚠️ The search area is a rectangle around the state, so places just over its edges come along: a Mérida address offered a *Calle Montejo* in Temixco, **Morelos** — it says its state, so nobody would take it for theirs. Its privacy page says the city goes with what you type since the same night. Nothing changes in Wera.

⏳ **2 November, late night: Wera Cocina's map fixes, sent over the air** (*Wera Cocina: tu puerta en la lista y el pin en medio del mapa (10.4e)*) to Wera Cocina's test builds — **your iPhone's included**: the test build you installed the same night (build 3, the entry below) takes it, with nothing to reinstall. On the iPhone: open Wera Cocina, wait ten seconds, close it completely and open it again — the update runs from the second open. **What to look at:** *What only you can judge* → *Wera Cocina → the pin in the middle, and your door in the list*, then **slice 1 once more** — with a test account, register a kitchen and publish a dish — and tell a session whether slice 1 works: that word opens slice 2 (`10.5`). Seen first on a test Android: typing *Durango 220* now lists **Durango 220, Roma Norte** at the top, and the pin sits grey in the middle until the map is moved. ⚠️ **Moving the map under the pin was not seen on any phone yet** — a test phone here can't sign in to the live database, and a map built on this Mac doesn't move — so your iPhone is the first: drag the map, and the pin should turn green with *¿Es aquí?* on the card. Its privacy page says so since the same night (tu-wera.com/privacidad/cocina-e-itacate). Nothing changes in Wera.

⏳ **2 November, night: Wera Cocina's new test build for your iPhone — its green icon, the green cow as it opens, and the phone's own search.** ✅ **Installed the same night — *"Installed it on my iPhone, the green icon shows"*** (your word; this Mac reads Wera Cocina 1.0.0 build 3 on your iPhone, this build). ✅ **And the cow as it opens, the same night — *"The green cow shows when it opens"*** (your word). **Still to look at:** the map's fixes reached this build as an update the same night (the entry above): slice 1 once more. It replaces the build of the afternoon (the entry below): if you have not installed that one, skip it. On your iPhone open https://expo.dev/accounts/wera-app/projects/cocina/builds/bbf84c34-ba3f-4288-8b67-ba02e42bd838 and tap *Install* — it goes over the one you have (build 2), and your session and kitchen stay; EAS keeps it until 16 November, and a copy is on this Mac (`~/RetailerToolDev/wera-builds/`). **What to look at:** on your home screen, Wera Cocina's icon is now Wera's cream cow on Wera Cocina's green, beside Wera's rust one; open it, and **for a moment the green cow on the cream**, where it showed the rust one. Then *What only you can judge* → *Wera Cocina → its icon and the cow as it opens* and *→ the phone's own search*, and **slice 1 once more** — with a test account, register a kitchen and publish a dish — and tell a session whether slice 1 works: that word opens slice 2 (`10.5`). An update cannot bring any of this: the pictures and the search are inside the app, so **your iPhone's Wera Cocina takes no update until you install this build**. Wera is not touched. It is the same code as the two store versions built with it (*Where we are*, `10.4d-ii`).

⏳ **2 November: a new test build of Wera Cocina for your iPhone — the phone's own search.** ⚠️ **Replaced the same night by the build above — install that one instead.** An update cannot bring it: the search is a new piece inside the app, so **your iPhone's Wera Cocina takes no update from now on until you install this build** (Wera is not touched). On your iPhone open https://expo.dev/accounts/wera-app/projects/cocina/builds/c852aafc-2ff8-426b-9717-b8b3cf26f17e and tap *Install* — it goes over the one you have (31 October), and your session and kitchen stay; EAS keeps it until 16 November. Then: *What only you can judge* → *Wera Cocina → the phone's own search*, and **slice 1 once more** — with a test account, register a kitchen and publish a dish — and tell a session whether slice 1 works: that word opens slice 2 (`10.5`). **It still shows Wera's rust cow — the icon and as it opens — and that is expected**: this build was made before your two rulings of 2 November; the green comes with `10.4d-ii`'s test build, which replaces it. ⚠️ Before this build goes to anyone but you, the privacy page's email to every Wera Cocina account (today only yours) — `10.4d-ii` in *Where we are*.

⚠️ **2 November, morning: your iPhone was running the store version — the test build is back on it.** Since some day between 24 and 29 October, your iPhone's Wera was the version Apple is reviewing, installed from *TestFlight* (build 3, read off the phone; every test build is build 1). On an iPhone that version takes no update until Apple approves it, so **none of the updates below from 27 October on reached your iPhone**, though each entry said it went there — Expo counts no iPhone that installed them, so your looks of 29 October were of the 21 October version. That old version is what showed *"Un momento…"* on the price sheet and no *Cobrar* slider: it counts your Wera Cocina kitchen as a second store, and sells only when it sees one. A session put the test build back over Wi‑Fi from this Mac's copy (`~/RetailerToolDev/wera-builds/ios-3f12b2a9/`, signed for your iPhone until October 2027) — your data kept, and nothing was waiting to send — and Wera downloaded the 1 November update below within seconds. **Close Wera completely and open it again:** from then on it runs everything below. **What to look at:** Vender with one product in the basket — the *Cobrar* slider, with signal and then in airplane mode (don't slide it; *Vaciar carrito* after); then *What only you can judge* → *Vender → a price with no signal*. ⚠️ **In TestFlight, never tap *Install* on Wera on this iPhone, and turn its *Automatic Updates* off** — it would replace the test build again. **The pilot Android:** Expo counts no Android that installed any of Wera's 20 newest test updates in the last 30 days, so none of the entries below reached it either. **Android's store testers:** none took the 27 or the 29 October update.

⏳ **1 November, late night: a price with or without signal, over the air** (*Un precio con o sin señal (8i)*) to Wera's test builds — **your iPhone downloaded it on 2 November** (the entry above); the pilot Android has not. Open Wera, wait ten seconds, close it completely and open it again: the update runs from the second open. The database change went first the same night, so a price you set reaches the shop. What to look at: *What only you can judge* → *Vender → a price with no signal*. ⚠️ It changes real prices in your shop — put them back the same way. The store versions get it with your next `production` command.

✅ **1 November: Wera Cocina finds your kitchen on the map, sent over the air** (*Wera Cocina: tu cocina en el mapa — mapa de calles y buscador de tu calle*) to Wera Cocina's test builds — **your iPhone's included: its first update**, and Apple's map needs no key, so you see all of it. On the iPhone: open Wera Cocina, wait ten seconds, close it completely and open it again — the update runs from the second open. What to look at: *What only you can judge* → *Wera Cocina → finding your kitchen on the map*. Nothing changes in Wera. Its privacy page says so since the same morning (tu-wera.com/privacidad/cocina-e-itacate). ✅ **Looked at the same day — *"Opened Cocina on my iPhone, the map search works"*** (your word).

⏳ **21 October: a new install for both phones, with the first day.** It carries the camera's
new sentence, and **after it every update needs it**: until a phone has it, nothing new reaches
that phone. Your data stays.
- **Your iPhone:** ✅ **installed 21 October** (your word). If it ever needs it again: open
  https://expo.dev/accounts/wera-app/projects/wera/builds/3f12b2a9-dd33-4afe-880d-f9a34c22b3bb on the phone and tap *Install*.
  ⚠️ Don't try *Continuar con Apple* yet: the server still has no Apple key.
- **The pilot Android:** open https://expo.dev/accounts/wera-app/projects/wera/builds/3fd48b8c-67a7-42ea-90ee-d164682f0190
  on it, download the file and open it.
- Both files are also in `~/RetailerToolDev/wera-builds/`. EAS lists them until 4 November.
- **What to look at:** close Wera and open it — the welcome only if you sign out first (the cow
  plays once per phone). Then rounds 1 to 3 of the first day (`8g`, the status log).

⏳ **31 October, evening: Wera Cocina's *¿Olvidaste tu contraseña?*, sent over the air** (*Wera Cocina: ¿Olvidaste tu contraseña? por WhatsApp*) to Wera Cocina's Android **test build**, on none of your phones yet — install it as the entries below say (the same file), open Wera Cocina, wait ten seconds, close it completely and open it again: the update runs from the second open. What to look at: *What only you can judge* → *Wera Cocina → a forgotten password*. Seen on a test phone: the link under *Entrar*, and WhatsApp's page opening a chat with your number and the message with the email typed. **Its privacy page and its deletion page are live on tu-wera.com**, read back after they went up. Nothing changes in Wera.

⏳ **31 October, afternoon: Wera Cocina publishes, sent over the air** (*Wera Cocina: publica lo que te sobra — platillos o bolsa sorpresa, Repetir y Retirar*) to Wera Cocina's Android **test build**, on none of your phones yet — install it as the entries below say (the same file), open Wera Cocina, wait ten seconds, close it completely and open it again: the update runs from the second open. What to look at: *What only you can judge* → *Wera Cocina → publishing*. ⚠️ It writes a real publication on the live database, under the kitchen you sign in with — nobody can see it yet, and *Retirar* takes it down. Nothing changes in Wera.

⏳ **31 October: Wera Cocina deletes an account, sent over the air** (*Wera Cocina: eliminar mi cuenta, cada negocio con su nombre*) to Wera Cocina's Android **test build**, on none of your phones yet — install it as the entries below say (the same file), open Wera Cocina, wait ten seconds, close it completely and open it again: the update runs from the second open. What to look at: *What only you can judge* → *Wera Cocina → deleting an account* — ⚠️ **with a throwaway account only, never your own**: your login owns your shop. Nothing changes in Wera. **The function that tells Apple was updated on the live project the same night** (it now knows Wera from Wera Cocina); Wera's deletions work exactly as before.

⏳ **30 October, night: Wera Cocina registers your kitchen, sent over the air** (*Wera Cocina: registra tu cocina — nombre, giro, dirección y su punto en el mapa*) to Wera Cocina's Android **test build**, on none of your phones yet — install it as the entry below says (the same file), open Wera Cocina, wait ten seconds, close it completely and open it again: the update runs from the second open. What to look at: *What only you can judge* → *Wera Cocina → making your kitchen*, then *→ signing in*. ⚠️ Registering makes a real kitchen on the live database, owned by the account you sign in with.

⏳ **30 October: Wera Cocina's sign-in, sent over the air** (*Wera Cocina: entrar con Google, Apple o correo*) to Wera Cocina's Android **test build**, which is on none of your phones yet — seen arriving on a test phone, where *Continuar con Google* opened Google's page. On any Android you hold — it is a separate app, so Wera on that phone is untouched — open https://expo.dev/accounts/wera-app/projects/cocina/builds/276cfaee-7959-4f00-af66-8b7767933496, download the file and open it (EAS keeps it until 11 November; a copy is `~/RetailerToolDev/wera-builds/cocina-1.0.0-preview.apk`). Then open Wera Cocina, wait ten seconds, close it completely and open it again: the update runs from the second open. What to look at: *What only you can judge* → *Wera Cocina → signing in*. **Your iPhone has no Wera Cocina test build**, so Apple's button cannot be tried yet: one needs your Apple sign-in in Terminal — `cd ~/RetailerToolDev/RetailerManagementTool/cocina && npx eas-cli build --profile preview --platform ios` — whenever you want it; nothing waits on it.

✅ **29 October, late night: Wera reads only the shop open in it, over the air** (*Wera lee solo la tienda abierta: una cocina no se mezcla*). **Nothing changes on your screen** — no account has a shop and a kitchen yet. It was sent to your iPhone and the pilot Android; neither took it (*2 November*, at the top). **The one thing worth trying, in this order:** with signal, open Wera, wait ten seconds and close it completely (that downloads the update); turn on airplane mode; open Wera — the update's first run, with no signal. Vender must show your products, and with one in the basket the *Cobrar* slider (don't slide it; *Vaciar carrito* after). Turn airplane mode off. If Vender shows no products or no slider, tell a session at once — the update can be undone in two minutes. ✅ **Looked at the same night — *"Opened Wera in airplane mode, products and slider there"*** (your word). Android's store version gets it with your command, before Wera Cocina's sign-up reaches anyone but you.

✅ **29 October, night: *Eliminar mi cuenta* names every business, over the air** (*Eliminar mi cuenta: cada negocio con su nombre*). **Nothing changes on your screen** — no account has a shop and a kitchen yet, so Ajustes → *Tu cuenta* → *Eliminar mi cuenta* looks exactly as before: open it to see, then tap *Cancelar* (never confirm). It matters the day someone owns both: the screen lists the shop and the kitchen and asks for each name. It was sent to your iPhone and the pilot Android; neither took it (*2 November*, at the top). ✅ **Looked at the same night — *"Opened Wera twice, nothing changed"*** (your word), which covers the entry below too: the update carries both changes. ✅ **Android's store version got both the same night, by your command** (group `338f6217`) — this one and *Wera abre solo tiendas*, below; a tester's phone runs it the second time Wera opens. The iPhone's store version gets both when Apple approves.

✅ **29 October: Wera opens only shops, over the air** (*Wera abre solo tiendas: una cocina es de Wera Cocina*). **Nothing changes on your screen** — every account today is a shop. It matters the day someone owns a shop and a kitchen: Wera opens the shop. Open Wera, close it completely, open it again — twice; it should open your shop exactly as before. If it ever shows *Crea tu tienda* instead, tell a session at once (the update can be undone in two minutes). It was sent to your iPhone and the pilot Android; neither took it (*2 November*, at the top). ✅ **Android's store version got it the night of 29 October**, with the entry above. The iPhone's store version gets it when Apple approves.

✅ **27 October: *Te lo compro* paused, over the air** (*Te lo compro en pausa: Merma es Tirar para
todos*). Merma opens straight on *Tirar* for everyone and no longer asks for the store's address;
Inicio shows no *Próxima recolección* and no *Rescatado*; the tutorial's Merma card is a new picture
of *Tirar*. Open Wera, close it completely, open it again — twice. It was sent to your pilot phones (neither took it: *2 November*, at the top) and to
Android's store version; the iPhone's store version gets it when Apple approves. ⚠️ A phone that
installs Wera fresh from a store still shows the old Merma on its very first launch, and the update
from the second.

✅ **18 October, evening: photos in Productos, over the air** (*Fotos en Productos: las de Wera y
las tuyas*). In *Tienda Demo*: Inicio → Más → Productos → the aisle *A granel* or *Refrescos* —
your 25 photos, in the list, the mosaic, the aisle's own picture and each product's page, and in
Vender, Comprar and Desperdicio. On *Nuevo producto*, *Tomar foto* comes first; on *Editar* of a
product you made, *Tomar otra foto* and *Quitar foto*. A product without a photo keeps its
initials. Open Wera, close it completely, open it again. More photos in your folders reach the app
with `bash docs/runbooks/catalog-photos.sh --linked`.

✅ **17 October, night: Productos redrawn, over the air** (*Productos nuevo: pasillos, ficha y
cambiar precio*). Inicio → Más → Productos: the aisles along the top (one tap shows only that
aisle, *Todo* shows everything), and ☰ / ▦ in the corner for list or mosaic. Tap a product for its
page: price, what it costs you, what you earn, this week. *Cambiar precio* tells you what you'd earn
as you type. Catalog products show *Ya no lo vendo* instead of *Editar*.

⏳ **17 October: the camera's new install is built, and the aviso that covers it is up on
tu-wera.com.** Both phones need it, and **after it every update needs it**: until a phone has it,
nothing new reaches that phone.
- **Your iPhone:** ✅ **installed from this Mac on 17 October** (it waited until you unlocked it).
  If it ever needs it again: open https://expo.dev/accounts/wera-app/projects/wera/builds/65530d87-e68c-4e5a-a259-9653bea39035
  on the phone and tap *Install*. Your data stays.
- **The pilot Android:** open https://expo.dev/accounts/wera-app/projects/wera/builds/24376f0a-0c73-4f5b-b42d-cd2202edf2cb
  on it, download the file and open it. The same two files are kept on this Mac in
  `~/RetailerToolDev/wera-builds/` (EAS lists both until 31 October).
- **What to look at:** *Merma → Te lo compro*, a product, the four answers, then *📷 Tomar foto*.
  The phone asks once for the camera. Take one, then *Otra foto*; tap a photo to remove it. On
  *Guardar solicitud* the photos go to Wera with the request. They show in the dashboard under
  *Storage → merma*, in the shop's folder.

✅ **17 October: *Rescatado* on Inicio, over the air** (*Rescatado: lo que la Wera te compró*). When
you mark a pickup *recogida* in the dashboard and type what you paid in `wera_paid`, the shop's
owner and manager see it add up beside *Ahorro en compras*, and a coin drops into the jar. The
steps are under *Handling a Te lo compro request*. Open Wera, close it completely, open it again.
⚠️ **This is the last update your phones can take before the camera's new install.**

✅ **16 October, late night: *Ahorro en compras* on Inicio, over the air** (*Ahorro en compras en
Inicio*). Under your last sales, a blue card: what this week's deliveries cost you LESS than the
last delivery of the same product from the same supplier, with *Esta semana, comprando más barato
que la vez pasada.* under it. It only appears once a delivery came in cheaper. Open Wera, close it
completely, open it again.

✅ **16 October, late night: your new Inicio, over the air** (*Inicio nuevo: el total que sube, la
racha y tu mejor viernes*). Sell something on Vender and come back to Inicio: the total rolls up and
a green **+$** floats over it. Under it, a bar towards your best day of the week; beat it and there
is confetti. Then your streak, the three coloured doors, your last three sales, the next Te lo compro
pickup, and every other screen in **Más** (Ajustes is the last one). *Ahorro en compras* comes next.
*Rescatado* waits for your answer in the plan's decisions block: what Wera paid, or an estimate.

✅ **16 October, late night: your picker, option A, over the air** (*El horario de Te lo compro en
un toque*). In *Te lo compro → Cuándo*, pick the day and then one time: every time that can still
be booked, under *En la mañana*, *En la tarde* and *Al atardecer*. Times less than five hours away
are not shown. Open Wera, close it completely, open it again.

✅ **16 October, late night: your three corrections went out over the air** (*Tu Precio, Mallugado y
recolección a 5 horas*). In Comprar each card says *Tu Precio: $45 / pza* — red when what you
paid is above it. *Te lo compro* says *Mallugado*, and offers only pickups at least five hours
away (the database refuses sooner ones too). Open Wera, close it completely, open it again.

✅ **16 October, night: two updates, over the air.** (1) ⚠️ **A fix you should know about:** a
sale slid from the bar after a second product, or a second `+`, was saved with only what the
basket held when the slide first appeared; the rest was dropped. It has been like that since the
first slide (24 September), on Vender, Comprar and Desperdicio. **Sales and deliveries recorded
on the pilot phones since then may be missing lines or units that were on the screen**, and
nothing in the database says which (*Cobrar guarda todo lo que está en el carrito*). (2) **The new
Desperdicio** (*Desperdicio nuevo: Tirar y Te lo compro (8l)*): the two doors, *Tirar* with its
defaults, and *Te lo compro*. **What to look at** is in the table below. Open Wera, close it
completely, open it again. ⚠️ **The aviso de privacidad does not mention Te lo compro yet**: the
draft is pull request 327, waiting for you (it publishes on merge).

✅ **16 October, evening: your store's address went out over the air** (*Dirección de la tienda
(8k)*). Open Wera, close it completely, open it again. **Then, please: Ajustes → Tu tienda →
*Dirección* → *Cambiar*,** and type your store's street, number, ciudad and código postal (the
colonia is optional). Every shop made before today has none, and *Te lo compro* will need it. A new
shop is asked for it when it is created. **The database for Desperdicio's redesign is on the live
project** (06400 and 06470 are the service area); the screen itself comes next, after you rule on the
canvas.

✅ **16 October, afternoon: the new Comprar went out over the air** (*Comprar nuevo y un solo
carrito (8g ronda 4)*). Open Wera, close it completely, open it again. **What to look at:** in
Comprar, the blue card with your supplier and *Cambiar*; the cards two across; **a product you
have bought from that supplier shows his last price already in the box**, with *Anterior · hace
N días* under it, and a margin pill (red when the cost is above your shelf price); change the
price and it says *Antes $…*. A product you never bought from him asks *¿Cuánto te costó?* on
`+`. Open the Carrito from the bar: name and total, price and quantity to correct, the Total at
the foot. **And in all three counters the Carrito is now one design** — Desperdicio's has the
title and count Vender's got in round 1. ⚠️ **On Android, the number pad in the cost and price
questions comes up when you tap the box** (on the emulator it did not open by itself); tell me
if your Android does the same.

✅ **16 October: your shop's *giro principal* went out over the air** (*Giro principal de la tienda*),
with the change to the database it needs, already on the live project. **Your shop has none yet**: open
Ajustes → *Tu tienda* → *Giro principal* → *Cambiar*, and pick it; the drawing appears at the top of
the tabs.

✅ **15 October, late night: round 2 went out over the air too** (*Encabezado crema con el sello
de la tienda*): the four tabs' cream band with your shop's name and a faint drawing of its giro.
Same as before: open Wera, close it completely, open it again.

✅ **15 October, night: Vender and the Carrito in your row B went out over the air** (*Vender y el
Carrito nuevos (8g ronda 1)*). **Open Wera, close it completely (swipe it away), open it again.**
The first open fetches the update and the second runs it. You will know it is there because each
product has its initials in a square on the left, and the active tab is green.

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
| **Itacate → the map** | New on 8 November, **on your iPhone, with Itacate's first iPhone build** (made 9 November — *What is on your phone* says how to install it). Signed in, with something published on one of your test kitchens (Wera Cocina), open ***Cerca***. **The map:** Google's, the whole screen, with the list half-way up over it — is Google's logo visible just above the list? Is each kitchen a circle in its colour with its drawing, and a kitchen with nothing on offer faded? Is your blue dot where you are? **Zoom out with two fingers** until two kitchens touch: they should become one grey circle with a *2* — tap it: the map should come closer until they part. **Tap a kitchen's circle:** the list comes half-way and shows that kitchen's dishes first, under *En el mapa*, with *Quitar*; tap the map's ground and they go back. **The list:** drag the little bar or the title up — the list fills the screen — and down — only the title shows, the map above; a quick flick should jump to the next height; tap the bar too. Scroll the cards at every height. **The round button at the top right** brings the map back to you. **Tú → Dónde buscar**, a postal code: the map should fly there and draw the dot at the code's centre. **Is the map where you want it, and does the list slide the way you expected?** |
| **Wera Cocina → the first run, and *Así la verán en Itacate*** | New on 7 November, **once the update reaches your iPhone's Wera Cocina** (*What is on your phone* says when — no reinstall). **The form first, on your own kitchen:** *Publicar una oferta* — every dish now asks ***Lo que vale normalmente*** (your word of 6 November), and *Publicar* says so when it is empty; under *¿Cuándo pueden pasar?*, ***Así la verán en Itacate***: Itacate's own card, showing *Comida corrida*, $60, ~~$120~~ until you type, then your dish as you type it. **Does it read as a preview of what neighbours get, and does it help you price?** An old offer's *Repetir* chip now opens the form once, to ask its usual price. **Then the first run** — ⚠️ **with a throwaway account, never your own** (it makes a real kitchen on the live database; *Eliminar mi cuenta* in *Mi cocina* takes it away after). In *Mi cocina*, *Cerrar sesión*: **the opening plays once on this phone** — the green cow, the square growing as she turns cream, a nod, the rise, *Wera Cocina · Vende hasta el último plato*, *Crear cuenta* and *Ya tengo cuenta*. **Does it feel like Wera's, in the green, and is it quick enough?** *Crear cuenta* with a test email → *Paso 1 de 3* (name and trade) → *Paso 2 de 3* (address) → *Registrar mi cocina* → ***¿Qué ofreces hoy?*** (*Paso 3 de 3*) → publish one dish, or *Después* → your page as neighbours see it — ***Tu cocina ya está en Itacate*** after an offer, ***Así te verán tus vecinos*** after *Después* → *Ir a Hoy*. **Is anything missing a new fonda would need on her first day?** Afterwards: *Eliminar mi cuenta*, then sign in with your own account again |
| **Wera Cocina → your reminder, *Así la ven* and *Ver como la ven*** | New on 7 November, **once the update reaches your iPhone's Wera Cocina** (*What is on your phone* says when — no reinstall). On a test kitchen (what you publish is on the live database, and Itacate shows it). **Así la ven:** publish a dish, tap *Hoy*'s green card: on *Tus ofertas*, beside *Ya se terminó*, ***Así la ven*** opens the dish's page exactly as Itacate draws it, under a dark bar with *Cerrar*. **Does it read as a preview — nothing to change there — and is it what you would want her to check?** An offer of several dishes opens your page instead. ***Ver como la ven*** in *Mi cocina*: your page as neighbours see it. One difference from Itacate, on purpose: *Cómo llegar* in Wera Cocina's green. **The reminder:** its question appears on *Hoy* only once a kitchen has published three offers and on the same weekday two weeks running (your rule of 5 November) — on a test kitchen about eight days of publishing; it was seen on a test Android with a fortnight of offers set up. When it shows: *Sí, recuérdame* → your phone asks permission once → at that hour on those days, *¿Qué ofreces hoy?* ⚠️ **Tap it: does it open *Tu oferta de hoy*?** On the test Android 7 of 9 taps did, the last 6 in a row; two early ones came back to the screen she had left, on a test setup a real phone does not have — only your phone can say. On Android it can come up to an hour late (Android's rule for an app without a permission she would grant in Settings); on the iPhone, on the minute |
| **Wera Cocina → *Hoy*, *Tus ofertas* and *Mi cocina*** | New on 6 November, **once the update reaches your iPhone's Wera Cocina** (*What is on your phone* says when — no reinstall). On one of your test kitchens (what you publish is on the live database, and Itacate shows it). Wera Cocina opens on ***Hoy***, with a bar at the foot: *Hoy* and *Mi cocina*. **The card at the top:** with nothing published today it says *Hoy todavía no has publicado* and when you last did. Tap ***Publicar una oferta***, publish one dish for later today, and you are back on *Hoy*: the card turns green — *Hoy en Itacate · hasta las …*, how many plates, a bar for the time left, the dish on a line — and a strip at the foot says *Publicaste …* with ***Deshacer***. **Is the card the first thing you read, and does it say enough at a glance?** Tap *Deshacer* within 8 seconds: **does it feel safe — the dish gone, nothing else changed?** Publish it again and tap the green card: ***Tus ofertas*** — today's with *Ya se terminó*, then *Publicar una oferta*, then *Anteriores* with *Repetir* on each. **Tomorrow**, *Hoy* shows today's offers as *Repetir* chips under *Publicar una oferta*: one tap publishes the same dish at the same hours, with *Deshacer* — **is one tap too easy, or just right?** (when its hours have passed, it opens the form instead). If your page lacks a cover or a sentence, *Hoy* shows a door *Tu página · 4 de 5* with a ✕ — close it, and *Deshacer* brings it back. ***Mi cocina***: your page as neighbours see its top, *Editar tu página*, the checklist while something is missing, where you hand food over, *Qué es tu cocina*, *Ayuda* and your way out. **Is anything you used every day now too far away?** The titles are in Nunito, as Wera's. Your reminder, and seeing an offer or your page exactly as neighbours do, come next (`10.5-v-c-ii`) |
| **Itacate → its tab bar, *Tú* and *Dónde buscar*** | New on 6 November, **on Itacate's test build for Android since its update of that afternoon** (*What is on your phone*; there is none for an iPhone yet). Nothing to set up: signed in, Itacate opens on ***Cerca***. **The bar at the foot:** *Cerca* and *Tú*, the one you are on in blue with a soft blue pill behind its icon — **is it clear which tab you are on?** **The titles** — *Cerca de ti*, *Tú*, *Dónde buscar*, *Ordenar* — are in Nunito, Wera's rounded letters: **do they belong with Wera's?** **The blue**: every button and link is Itacate's blue now, where Wera's green was. **Ordenar:** with two cards or more, ***Ordenar: Ahora*** at the top right; tap it — a sheet slides up from the foot with a small spring: *Ahora*, *Más cerca*, *Más barato*, each with a line under it; pick one — **does the spring feel right, or too much?** **Tú:** your name, your email and *Entras con Google*; *Dónde buscar*; *Aviso de privacidad*; *Ayuda por WhatsApp* — tap it: WhatsApp opens to you with *Hola, necesito ayuda con Itacate. Mi correo es …* —; *Cerrar sesión* and *Eliminar mi cuenta*, quiet at the bottom; *Itacate, de Wera* under the cow. **Is anything missing, or in the wrong order?** **The first time each screen opens**, its blocks rise into place one after another — **does it feel quick, or slow?** **Dónde buscar** (from *Tú*, or *Cambiar* on *Cerca*): *Mi ubicación* or *Un código postal*; on an Android, the postal code is found since you fixed Google's Android key on 9 November |
| **Itacate → a kitchen's page and a dish's** | New on 5 November, on Itacate's Android test build **since its update of that day** (*What is on your phone*). With something published from Wera Cocina (the row below says how): **tap the dish's card** — does its page read at a glance, and is everything you would want before going there on it: the photo, *your kitchen · how far*, what it has, its tags, the price and what it is usually worth, the hours with *Quedan …*, your street and your line of directions? A surprise bag adds *Es sorpresa: si tienes alergia, pregunta antes o elige otro*. **Tap *Cómo llegar*** — Google Maps should open with directions to your kitchen. **Tap your kitchen's row** — your page: your cover and circle as Wera Cocina showed them to you, your trade under your name, your sentence, *Ver en Google Maps* if you gave the link, then *HOY* with what you published. Take it down in Wera Cocina (*Retirar*), pull your page down: it should say *Por hoy ya se terminó* (*Ya no tiene nada por hoy* before the update of 6 November). ⚠️ *Lo que suele ofrecer* (*Lo que suele publicar* before it) stays empty until one dish of yours appears in two publications within four weeks. A kitchen with no point of its own opens Google Maps by its address |
| **Itacate → the kitchens near you** | New on 5 November, **on Itacate's test build for Android**, once the update reaches it (*What is on your phone* says when; there is none for an iPhone yet). ⚠️ It shows the live database's kitchens — today only your three tests, and **none has published anything, so the list is empty until you publish**: in Wera Cocina on your iPhone, publish a dish with a photo on *Bernies Bobas* or *Test 2* (both have their own point on the map, so their distance needs nothing of Google). Then open Itacate on the Android: it asks for your location once — **Allow, and Precise**. *Cerca de ti*: does the dish's card read at a glance — the photo, the kitchen's circle and name, the price and what it is usually worth, *Quedan …*, the hours, how far? Take it down in Wera Cocina (*Retirar*) and pull the list down: the kitchen turns faded, with *Publicó hoy*. **Then say no**: Android's *Settings → Apps → Itacate → Permissions → Location → Don't allow*, and open Itacate again — it asks for your postal code, and *Usar mi ubicación* under the box takes you back to Itacate's settings to allow it again. Since you fixed Google's Android key on 9 November, a postal code is found and *Test 3*, with no point, shows its distance on an Android too. *Tu cuenta*, at the top, holds *Cerrar sesión* and *Eliminar mi cuenta*. **The order, once the update of 5 November, evening, reaches it** (`10.5-iv-a-iv`): the list opens on *Ahora* — what you can pick up now first, the faded kitchens last — and ***Ordenar*** at its top switches to *Más cerca* or *Más barato*. ⚠️ *Ordenar* shows once the list has two cards: publish **two dishes** from Wera Cocina. Does the row read at a glance, and is each button easy to hit? |
| **Wera Cocina → deleting a kitchen, keeping the account** | New on 4 November, night, **once the update reaches your iPhone's Wera Cocina** (*What is on your phone* says when — no reinstall). ⚠️⚠️ **Only with a throwaway account and its own test kitchen — never your own: your login owns your shop and your kitchen.** The safe way: in Wera Cocina, *Cerrar sesión*, then *Crear cuenta* with a test email; register a kitchen (a name, what it is, an address). On that kitchen's screen, at the very bottom, between *Cerrar sesión* and *Eliminar mi cuenta*: ***Eliminar esta cocina***. **Is it clear it is not the account?** Tap it: what goes, what stays (*Tu cuenta sigue…*), and a box for the kitchen's name — the red button only once the name matches. Tap it: you should land on *Registra tu cocina*, still signed in (*Entraste como …*). **Does landing there read as "my kitchen is gone, I can make another", or as something broken?** Then *Eliminar mi cuenta* on that screen deletes the test account itself. ⚠️ Everything here is on the live database, and the new account reaches your Discord line |
| **Itacate → deleting an account** | New on 4 November, **on Itacate's test build for Android** — the update went out that evening (*What is on your phone* says how to install it; there is none for an iPhone yet). ⚠️⚠️ **Only with a throwaway account — never your own: your login owns your shop and your kitchen, and Itacate would name both and delete them if you typed their names.** Make one in Itacate (*Crear cuenta*, a test email), then at the very bottom of the screen, under *Cerrar sesión*: *Eliminar mi cuenta*. **Is it quiet enough, and still findable? Does the one warning read right for a neighbour?** Tap the red *Eliminar mi cuenta*: you should be back on *Tu cuenta*, and signing in again with that address should fail. ⚠️ A new account is a real one on the live database, and it reaches your Discord line |
| **Itacate → signing in** | New on 4 November, **on Itacate's test build for Android** — the update went out that morning (*What is on your phone* says how to install it; there is none for an iPhone yet). It opens on ***Tu cuenta***. **The one thing a test phone could not show us — Google answering:** tap *Continuar con Google* and pick your Google account: **does it come back to Itacate signed in, under the map, with *Entraste como* and your name?** It is your Wera account, so nothing new is made. Then *Cerrar sesión*, and *¿Ya tienes cuenta? Entrar* with a test email and password, or *Crear cuenta* with a new one — ⚠️ a new account is a real one on the live database. **Do the words and the order read right for a neighbour who has never heard of Wera?** Apple's button shows only on an iPhone |
| **Wera Cocina → your page in Itacate, and a photo per dish** | New on 4 November, **once the update reaches your iPhone's Wera Cocina** (*What is on your phone* says when). ⚠️ With a **test kitchen** — it writes on the live database, and its photos go to the live photo store. On your kitchen's screen, under what you published: *Tu página en Itacate*, your trade's drawing on its colour and your initials. Tap *Editar tu página*. **The one thing an Android could not show us — the iPhone's photo picker:** tap *Elegir* by *Foto de portada*; your iPhone's own picker should open **without asking to see your photos**, and the photo you pick should appear cut to the banner's shape. Then *Tomar foto* by *Tu logo*: the iPhone asks for the camera once, with the sentence about your photos. Choose a colour, write a sentence (the count goes to 100), paste a Google Maps link (Google Maps → your place → *Compartir* → *Copiar*). *Guardar*: your kitchen's screen shows the page with your photos. Then *Publicar lo que te sobra*: each dish has *Foto (opcional)*; publish one with a photo, then *Repetir* it — the photo should already be there. **Questions:** do the drawings read as their trades (a fonda's is a pot; the nine are in `brand/giros.svg`)? Is the cut — the middle of the photo, no frame to move — good enough, or should she choose the frame? Is the page's place on your kitchen's screen right? |
| **Wera Cocina → address first** | ✅ **Looked at 6 November, on your iPhone** — *"The engine, map and gestures that I'm currently looking at in my iPhone for Cocina app work very good, some small details in our own interface that we can polish afterwards."* (your words). The details go with Wera Cocina's new screens (`10.5-v-c`, `10.5-v-d`): tell a session which ones when you take those. Kept for the record: new on 3 November, night, **once the update reaches your iPhone's Wera Cocina** (*What is on your phone* says when). ⚠️ With a **test account** — registering makes a real kitchen on the live database. Register a kitchen: the first screen asks only its name and what it is (*Paso 1 de 2*); *Siguiente: tu dirección* opens ***¿Dónde está tu cocina?*** (*Paso 2 de 2*). Find your address in *Busca tu dirección* and pick it: **does the small map show the pin on your block, and does it feel set — something you can leave alone?** Under it, *Si el punto no es tu puerta, toca el mapa.* Type a line in *Cómo encontrarte* and tap ***Registrar mi cocina*** without touching the map: you land on your kitchen, the address first, the small map under it. Then tap the small map (on the second screen) or ***Ajustar punto*** (on your kitchen): the map you know opens on that pin, grey until you move it; drag it to your door and tap *Listo* — the pin is yours now, on every map. Last, ***Cambiar dirección***: change the number and save — **does the pin go back to where Google puts the new address?** And ***Cambiar giro*** is its own door now. Does any screen ask you something you didn't expect? |
| **Wera Cocina → Google on your iPhone: the map, the search and *Busca tu dirección*** | ✅ **Looked at 3 November** — *"The search works amazing"* (your word); the pin asking to be moved was in your way, and `10.4h` makes it a suggestion you never have to touch. Kept for the record: new on 3 November, **once your iPhone has Wera Cocina's new test build** (*What is on your phone* — a new install; an update cannot bring it). Your session and your kitchen stay. **The map is Google's now on your iPhone too**: on your kitchen's screen the small map, then *Cambiar el punto* — it opens on your pin, and the pin stays in the middle as before. In the box at the top type a street and number somewhere else — *Durango 220* — and stop: **Google's suggestions**, with *Google Maps* at the list's foot; tap one: the map flies there, and the pin is grey until you nudge the map. Move the map onto another street: the card says *El pin parece estar en …, no en …* only when Google puts the pin on a street that is not yours. *Volver* (it saves nothing). Then *Cambiar giro o dirección*: **above your five boxes, *Busca tu calle, número y colonia***. Touch it: the box should rise to the top of the screen, with the list under it above the keyboard. Type *Durango 220 Roma* and pick the first: the five boxes fill — Durango, 220, Roma Norte, Cuauhtémoc, 06700 — and *Revisa que tu dirección esté bien* appears under the box. **Does the list show above the keyboard? Is it clear the filled boxes are yours to check? Is Google's map on your iPhone as easy to move as Apple's was?** ⚠️ *Guardar* on either screen changes your real kitchen on the live database; *Volver* leaves it as it was. **And once on an Android**, the same steps on Wera Cocina's Android test build (*What is on your phone*): it is the first time Google answers an Android build — a session may not sign in on the live database to try it. If the search there says *Ahora no podemos buscar*, tell a session: the fix is a setting in Google Cloud or an update, not a new build |
| **Wera Cocina → its icon and the cow as it opens** | ✅ **Looked at 2 November, night** — *"the green icon shows"* and *"The green cow shows when it opens"* (your words). New on 2 November, night, **once your iPhone has Wera Cocina's new test build** (*What is on your phone*). On your home screen, next to Wera's rust icon: **are the two apps told apart at a glance, and do they still look like one family?** Close Wera Cocina completely and open it: for a moment the green cow on the cream, then the first screen (or your kitchen). **Does the cow sit at the size and place you expect?** It is drawn exactly as Wera's is, in Wera Cocina's green. An icon is inside the app: changing it again means new store versions, and after the public release it waits for the major update (`10.8`) |
| **Wera Cocina → the pin in the middle, and your door in the list** | New on 2 November, late night, **once the update reaches your iPhone's Wera Cocina** (*What is on your phone* says when). On your kitchen's screen tap *Cambiar el punto* (or register a kitchen with a test account). **The pin is fixed in the middle of the map and the map moves under it**: it opens on your pin, green; drag the map, let go, and the card says ***¿Es aquí? …*** for the spot under the pin. In the box at the top type a street and number somewhere else — *Durango 220* — and stop: **after a moment the list opens on *Calle Durango 220*, the door**, with LocationIQ's streets below (since 3 November the whole list is Google's — the first row of this table). Tap it: the map flies there, and **the pin turns grey and hollow** — the card says *Mueve el mapa hasta que el pin quede justo donde entregas la comida.* Nudge the map: the pin turns green, and *¿Es aquí?* names the spot. Tap a point near the pin: that point comes to the middle. **The State of Mexico too** (since `10.4f`): register with an address in, say, Toluca or Valle de Bravo — the map should open there, and a street and number typed in the box should find the door; an address in another state should say *No encontramos esa calle en la Ciudad de México ni en el Estado de México…*. Pinch out until the card says *Toca el mapa cerca de tu cocina…*: the pin is grey, and *Guardar* says to move the map and saves nothing. **Does the list show the door as you type the number? Does moving the map feel like Uber's? Is it clear that the grey pin needs a nudge?** ⚠️ If dragging never turns the pin green on your iPhone, tell a session — tapping your door still does. ⚠️ *Guardar* moves your real kitchen's pin on the live database; *Volver* leaves it as it was |
| **Wera Cocina → the phone's own search** | ⚠️ **Replaced on 3 November** (`10.4g-i`): the search is Google's on both phones now — the first row of this table; nothing to look at here. Kept for the record: new on 2 November, **once your iPhone has Wera Cocina's new test build** (*What is on your phone* says when it is ready — an update cannot bring it, it is a new install). With a test account, register a kitchen (or, on your kitchen's screen, tap *Cambiar el punto*): **the map opens on the address you typed, at your block**, not five blocks out — your iPhone's own search found the right block for 9 of the 12 trustworthy addresses we measured, and Google's on Android for 11. Then in the box at the top type a street and number somewhere else — *Insurgentes Sur 1000* — and tap the keyboard's **Buscar** key, not a suggestion: **the map should fly to that door, close in**, and the box close. The suggestions while you type are still LocationIQ's. With airplane mode on, *Buscar* should say *Sin conexión. Busca tu cocina en el mapa.* **Does the map land on the door? Is *Buscar* something a fonda would press?** It never asks for your location. ⚠️ *Guardar* moves your real kitchen's pin on the live database; *Volver* leaves it as it was |
| **Wera Cocina → finding your kitchen on the map** | ✅ **Looked at 1 November** — *"the map search works"* (your word). New on 31 October, late, once the update reaches **your iPhone's Wera Cocina** (*What is on your phone*) — the first update that reaches it, and Apple's map needs no key, so you see all of it. On your kitchen's screen tap *Cambiar el punto* (or register a kitchen with a test account: the map then opens on the address you typed). **The map is now the flat street map**, Apple's muted one. In the box at the top, type your street and number — *Durango 220*: after a moment it suggests streets *in your colonia* (it adds the colonia you gave). Tap yours: **the map flies there, about five blocks wide** — the search knows streets, rarely the door. Tap near your door to come closer, tap your door: the pin, and on the card ***¿Es aquí? …*** — your iPhone's own name for that spot. **Does the flat map make your door easier to find than the satellite did? Does the search find your street? Does *¿Es aquí?* match where you are?** Under the box, *Search by LocationIQ.com · © OpenStreetMap* — in English, the free plan's required words: acceptable? ⚠️ *Guardar* moves your real kitchen's pin on the live database; *Volver* leaves it as it was |
| **Wera Cocina → publishing** | New on 31 October, once the update reaches Wera Cocina's Android test build (*What is on your phone*). On your kitchen's screen, *Publicar lo que te sobra* is now first. ⚠️ **It writes a real publication on the live database**, under the kitchen you signed in with — nobody can see it yet, and *Retirar* takes it down. Publish what a fonda would at half past four: a dish (*Comida corrida*, $65, 4) and, with *Otro platillo*, a bag (*Bolsa sorpresa*: *Bolsa de pan*, $45, 5, and *Lo que vale normalmente* $90). **Is the switch between *Platillo* and *Bolsa sorpresa* clear?** Do *Desde* and *Hasta* — a quarter of an hour a tap — get you to the window you want in a few taps? Back on your kitchen, does *Lo que publicaste* read right — *En oferta · Hoy · 17:00 a 18:00*, *4 a $65 · Pica*? Then *Repetir* (it should open filled in, at the same hours) and *Retirar* (it asks *¿Retirarla?* first). Tell a session what you would change; every word changes over the air |
| **Wera Cocina → a forgotten password** | New on 31 October, once the update reaches Wera Cocina's Android test build (*What is on your phone*). On the first screen tap *¿Ya tienes cuenta? Entrar*, type an email, and under the *Entrar* button tap ***¿Olvidaste tu contraseña?***: WhatsApp should open a chat **with you**, with *"Hola, olvidé mi contraseña de Wera Cocina. Mi correo es …"* already written. It is not on *Crear cuenta*, where there is nothing to forget. Is the message what you want to receive from a fonda? |
| **Wera Cocina → deleting an account** | New on 31 October, once the update reaches Wera Cocina's Android test build (*What is on your phone*). ⚠️⚠️ **Only with a throwaway account — never your own: your login owns your shop, and deleting it from Wera Cocina deletes the shop with everything in it.** Make one by email in Wera Cocina (*Crear cuenta*), register a kitchen, then on your kitchen's screen, at the very bottom: *Eliminar mi cuenta*. Is it quiet enough under *Cerrar sesión*, and still findable? Does the warning say plainly that the kitchen goes with the account? The button stays grey until the name is typed exactly — is that clear, or does it look broken? Tap it: you should be back on the first screen, and signing in again with that address should fail. **The Apple half needs an iPhone build of Wera Cocina** (one command of yours in Terminal: `cd ~/RetailerToolDev/RetailerManagementTool/cocina && npx eas-cli build --profile preview --platform ios`): make a throwaway account there with *Continuar con Apple*, delete it, and Apple's sheet appears once more. ✅ **The proof your Apple grouping works:** afterwards, *Configuración → tu nombre → Iniciar sesión con Apple* no longer lists Wera Cocina. Tell a session either way |
| **Wera Cocina → making your kitchen** | New on 30 October, once the update reaches Wera Cocina's Android test build (*What is on your phone*). ⚠️ **It makes a real kitchen on the live database**, owned by the account you signed in with, and your Discord says *🍲 Nueva cocina en Wera Cocina* — sign in with a test account if you would rather your own login not own a kitchen (a test account and its kitchen can be deleted in Wera Cocina since 31 October — the row above). Fill the form, then on the map — since 31 October the flat street map, opening near the address you typed, with a search box above it (the first row of this table). Do the taps that bring the map closer feel natural, or would you rather pinch? Once it shows a block, **does the red pin land exactly where you tapped**? Is *Los vecinos verán este punto exacto en el mapa.* clear before *Registrar mi cocina*? Then, on your kitchen's screen, does the map picture show your spot — and does *Cambiar el punto* move it? |
| **Wera Cocina → signing in** | New on 30 October, on Wera Cocina's Android test build once the update reaches it (*What is on your phone*). *Continuar con Google* with your own account: it should come back to Wera Cocina and say *Entraste como …* with your name, above the form that registers a kitchen — **not** open your shop, which stays in Wera. *Cerrar sesión* goes back to the first screen. That screen opens on *Crear cuenta*, not *Entrar*, because almost everyone who reaches it is a new fonda: does that feel right? Are Google's button and the email boxes in the right order? Apple's button needs an iPhone build of Wera Cocina first |
| **Lo último** | Does a delivery read at a glance as *that one*? Are two buttons under every row too much? Is landing on Comprar with the cart already full a relief or a surprise? |
| **Inicio** | New on 16 October. With real days behind it, your phone shows *Tu mejor viernes* (or whichever day it is) and your streak. Do the roll, the +$ and the confetti feel like a reward or like noise? Is *Más* easy to find for Ajustes? |
| **Inicio → *Conoce Wera · 1 minuto*** | New on 21 October, once the update reaches your iPhone: the card under *Hoy*. Tap it: eight cards, about a minute and a half, the Vender one moving. Since 22 October each card stays as long as its words take to read slowly, plus a look at its screen (12 to 17 seconds; the hello card 8), and the bar on top fills while it does. Is that enough now? Does the finger read as a hand? Does *Saltar* find your thumb? *Ajustes → Ver el recorrido* opens it again. Since your word of 22 October it opens by itself once on every phone that has not seen it — yours had already, so for you it stays in Ajustes |
| **The keyboard, anywhere you type** | New on 22 October, after your first user. On a box low on the screen, does the box rise above the keyboard as you tap it? With the keyboard still up, can you scroll to the button under it? Does every keyboard have its ✓ (on the iPhone's number pads, *Listo*)? On *Entrar*, does the eye beside *Contraseña* show what you typed? Try *Ajustes → Tu tienda → Dirección → Cambiar*, and *Proveedores → Nuevo* down to *Teléfono* |
| **Merma → Tirar** | New on 16 October. Add two products: under each, *Sin fecha*. The bar says *Hoy* and *Caducado*; tap either and the Carrito opens with *Caducidad* per product, *¿Cuándo lo tiraste?* and *Motivo*. Is the default visible enough to count as chosen? Is the Carrito's foot too tall at *Letra grande*? |
| **Merma** | New on 27 October, once the update reaches your phone (close Wera completely and open it again, twice): Merma opens straight on *Tirar* — no doors, no *Te lo compro*, and no address question, even in a shop with no address. Inicio has no *Próxima recolección*. In *Ajustes → Ver el recorrido*, the Merma card shows *Tirar* and says nothing about Wera buying. Does *Tirar* on its own read as Merma? |
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
| **Vender, redrawn (round 1 of your review)** | New on 15 October, by an update. Does the list invite you at the counter? Are about four products on screen enough? Does the green `+` alone at rest read right, with `−` appearing only once a product is in the sale? Turn on *Letra grande* in Ajustes and look again |
| **Vender → `+` on a product with no price** | Your `+` opens *¿A cómo lo vendes?*; type it, *Guardar y agregar al carrito*, and it is in the sale — with or without signal since 1 November (`8i`). A cashier's `+` is grey and says who can price it — to see it, sign in as somebody you invited as *Empleado* |
| **Vender → a price with no signal** | New on 1 November, once the update reaches your iPhone (*What is on your phone*). Turn on airplane mode, open Vender, tap a price chip and change it: the sheet closes at once and the row shows the new price. Put one in the basket and slide *Cobrar*. Close Wera completely and open it again, still in airplane mode: the new price is still there. Turn airplane mode off and wait a few seconds: the price and the sale reach the shop (*Tus últimas operaciones ya se guardaron*). Is it clear that the price you typed is the one you charged? ⚠️ **It changes the real price in your shop** — put it back the same way afterwards |
| **Vender → the price chip** | For you and a manager the price sits on a green chip with a pencil (grey outline when there is none). Tap it: the sheet shows *Ahora: $45 / pza* above an empty box. Does the chip read as something to tap? |
| **Vender → the Carrito** | Open it from *N productos ›*. Each line reads like a ticket; *Carrito* and the count are on top; **the Total is now on the sheet**, above *Vaciar carrito* and the slide. Tap a line's price chip: the same sheet opens over the Carrito. *Vaciar carrito* now says how many products it takes |
| **The four tabs' header (round 2)** | The cream band now, as on every other screen, with your shop's name in small rust capitals under the title and a faint drawing of your **main giro** at the right. Do you notice it, and does it stay quiet? |
| **Ajustes → Tu tienda → Giro principal** | New on 16 October. **Your shop has none yet** (it was made before), so the band shows only its name: tap *Cambiar* and pick yours; the drawing appears. Only the owner sees *Cambiar* |
| **Creating a shop → *¿Qué vendes?*** | The first giro you tap gets ★ and *Tu giro principal*; the others don't. Untap it and the star moves to the next one you picked. To see it you need a new account (sign out, sign up with another email) |
| **Airplane mode, from cold** | The one real test: open Productos with signal, **wait over five minutes**, force-quit, airplane mode, reopen. Productos should list and Vender should sell |
| **The pilot's measurements** | On since 13 October, once the fix reaches your phone. Hold the title *Ajustes*: *Lecturas del piloto* should open and say *Versión piloto-1*. Then sell three things, one from inside the Carrito sheet, and open it again: does *Toques por registro* count the taps inside the sheet? |

---

## Where we are

**29 September was the cleaning day** (`8a` to `8e`) **and 30 September the design day**
(`8f`); both are done. What is left of that step is your review, `8g`. Since then: the
starter catalog, the release path, the aviso and the site, and on 13 October the logo.
**Since 27 October the plan also carries Step 10, the ecosystem** — Wera's pilot version, Wera Cocina,
Itacate and the shared backend. Its strategy stays in your private notes, outside this repository.

**From 28 October the rest of Step 10 is built in slices, each ending on a phone you can check** (your word: *"that will
allow us to get the app asap in the stores"*): `10.3` drew the whole marketplace on paper for your review once (done 28
October; its questions wait on you) — no table yet; `10.4` a fonda publishes an itacate in Wera Cocina; `10.5` a neighbour finds it in Itacate; `10.5b` reserve
and collect, and then the public releases — **the MVP ends there** (your word of 5 November); **then Wera's shops offer to the fondas** (`10.6a`–`10.6c`, your ruling of 6 November: Merma's *Ofrecer*, Wera Cocina's list with each shop's address and *Cómo llegar*, no map, and the handover in Vender); the stamp card, your numbers and promotions come after them (`10.9`). Each slice reaches the test builds over the air, and the next one starts
after you have tried it.

| Job | What | State |
|---|---|---|
| **10.4e** | **Wera Cocina — the map fixed before slice 2** | ✅ **Done 2 November, late night**, the same night as your word. **Measured first, as a fonda types**: the same twenty Mexico City addresses, each typed in four steps — half the street, the street, the first digit of the number, the whole number. With the whole number typed, LocationIQ's list opened on the right block 6 times in 20 and **never on the door**; your phone's own search answered with **the door 18 times in 20**, on the right block 12 times on Android and 11 on an iPhone. Before the number, the phone's search did no better than LocationIQ's. **So the list now opens on her door once she has typed the number**, LocationIQ's streets below it while she is still typing the street. **The pin stays in the middle of the map, as Uber does it** — she moves the map under it, or taps her door to bring it to the middle. **What is saved is the middle, only once she has moved the map herself**: right after the map flies to a search answer the pin is grey and hollow and the card says *Mueve el mapa hasta que el pin quede justo donde entregas la comida.* — Apple's and Google's terms forbid keeping their point, so a nudge of hers makes the pin green, and hers. All of it reaches your iPhone's new test build as an update, with nothing to reinstall. What to try: *What only you can judge* → *Wera Cocina → the pin in the middle, and your door in the list* |
| **10.4g-i** | **Wera Cocina on Google on both phones — the search, and both phones' test builds** | ✅ **Done 3 November**, your ruling of that morning (*"go, send me the Google Cloud steps"*) and your answer on the address form (*"Let's go with your recommendation"*). **Measured first**: Google's search on the same twenty addresses, as she types them — its first suggestion on her block 12 times in 20, where your iPhone's search found 11; the map's opening 13. **What changed for a fonda:** Google's map on the iPhone too; Google's suggestions as she types, in the map's box and — new — in a ***Busca tu dirección*** box above her five boxes: she types her street, number and colonia, picks hers, and the five boxes fill for her to check, with *Revisa que tu dirección esté bien* under the box; the map opens on Google's point; the card on the map names her address — the one that is saved — and warns only when Google puts the pin on another street. LocationIQ and the phone's own search are out. The privacy page says Google on both phones, and a terms page carries Google's notice. **Seen on the test phone** (with stand-in answers, so nothing went to Google): the box rises to the top of the form as she touches it, so the list shows above the keyboard. **It needs new test builds on both phones** — the iPhone's key changed the app's settings, which moves both runtimes, so no update can carry it. **Yours to do:** install the iPhone's (*What is on your phone*), then *What only you can judge* → *Wera Cocina → Google on your iPhone*; and the privacy page's email (*Before Wera Cocina reaches your testers*, item 4). ✅ **Looked at 3 November** — *"The search works amazing"* (your word); the pin's nudge was in your way, which `10.4h` removes |
| **10.4g** | **Wera Cocina on Google on both phones** | ✅ **Done 3 November, late night — both halves.** **Split in two on 3 November**, measured about two sittings: the search with both phones' test builds (`10.4g-i`, done 3 November), then the two store versions (`10.4g-ii`, done 3 November, night) — Android's version 5 replaces version 4, which you never sent |
| **10.4h** | **Wera Cocina — address first, as Uber Eats does it** | ✅ **Done 3 November, night**, your ruling of that evening (*"Let's go with your proposal an your recommendation"*, and *"Yes"* to its small database change). **What changed for a fonda:** registering is two screens — her kitchen's name and trade (*Paso 1 de 2*), then ***¿Dónde está tu cocina?*** (*Paso 2 de 2*): the search, her five boxes, **a small map with the pin where Google places her address**, her line of directions and *Registrar mi cocina*. **She never has to touch the map.** A tap on the small map opens *Ajusta el punto* — the map you know, pin in the middle — and only if she moves it there is that point kept, and used everywhere after; change the street or the number later and it is dropped, so the map follows the new address. Her kitchen's screen shows the address first, the small map under it, her directions, and ***Cambiar dirección***, ***Ajustar punto*** and ***Cambiar giro*** as separate doors. **What we keep:** her address, her directions, and her own point only if she sets one — Google's point was looked up live by each phone and never stored, until `10.5-i-b-ii` (4 November, night), which keeps it up to 30 days. **The database change** (two new functions: her directions saved without a pin, and her pin cleared) was tested as the owner, a manager, a cook, a shop's owner and nobody signed in, and adds without breaking anything a phone in use calls. **Seen on the test phone** (stand-in answers for Google): the two screens, the pin on the small map, registering with no pin — and the database holding her address and directions with no point; a point dropped when the number changed. It reached your iPhone's test build as an update the same night, with nothing to reinstall (*What is on your phone*). The privacy page says her point is kept only if she sets one. What to try: *What only you can judge* → *Wera Cocina → address first*. ⚠️ Your note *"the pin is only indicative"* replaced your 28 October ask for the highest possible precision |
| **10.4g-ii** | **Wera Cocina — the store versions, on Google** | ✅ **Done 3 November, late night.** **Both store versions built from the merged code and read inside**: Android's **version 5** — the file for your closed test, `~/RetailerToolDev/wera-builds/cocina-1.0.0-5-produccion-google.aab` — and the iPhone's **build 4**, which waits for its App Store record (`10.5b`). Each carries Google's real key for its phone, and the same runtime as the test builds on your phones, so every update reaches both. **Nothing to install on your phone**: your test builds already run the same code. **The stores' privacy answers**: on Play, *Precise location* is now answered *Users can choose* — the point is optional since `10.4h`; the App Store's are new, read off Google's privacy files inside the iPhone build (`store/cocina-itacate.md`, sections 4 and 7). **Found on the way:** your Wera command for Android's store version now also carries `8i` (*Before Wera Cocina reaches your testers*, item 5); and every Expo build made from this folder since 21 October carried `.claude/scratch` — old copies of your private research among it — to Expo's servers (private to your account): set aside for these two builds; moving those copies out of the repository's folder is yours to decide. **Neither version has reached anyone**; the order of your steps is in *Before Wera Cocina reaches your testers* — **never send version 4** |
| **10.5-0** | **The postal-code centres, measured before you rule** | ✅ **Done 3 November, night.** **Measured across the whole search zone**: for every restaurant INEGI lists in Mexico City (55,752) and the State of Mexico (89,406), how far its door is from the point its postal code would get from each free source. **INEGI's businesses** — the middle of the businesses INEGI's directory lists in each code — put that point within 1 km of 9 in 10 restaurants in the city and 7.7 in 10 in the State of Mexico. **GeoNames**, the free file the plan first named, manages 5.6 in 10 and 3.4 in 10, because it looks a settlement's name up instead of computing a centre: it puts two of Tláhuac's postal codes in Benito Juárez, 26 km away. The twelve trusted test addresses agree — INEGI's point within 588 m of every door it places. **Never the postal service's own list**: its licence forbids passing it on. My recommendation, INEGI's points and GeoNames' only for a code with fewer than five businesses, and your answer: https://claude.ai/artifact/WxSEFxamNsQUYW9HTW3HqR. Nothing built |
| **10.5-i-a** | **Kitchens' pages and dish photos, in the database** | ✅ **Done 3 November, late night** — the first half of `10.5-i`, split on 3 November so that it did not wait for your postal-code answer. **In the database now:** each kitchen's own page — her sentence (one line, up to 100 characters), her colour out of six, her cover photo, her logo, her Google Maps link — which only her owner or a manager can change, and a photo on each dish she publishes. **Where the photos go:** a private store where a kitchen's owner and managers put pictures in her own folder; anyone signed in can see them, nobody signed out; pictures only, 2 MB at most; nothing replaced or deleted. **Two things decided for you**, each cheap to change: a deleted kitchen's photos stop being visible at once — what your privacy page already promises of a shop's — and her link must be a real Google Maps link, because Itacate will show it as *Ver en Google Maps*. Your Discord line for a new account no longer says *en Wera* (*Wera's alerts on Discord*). **Tested** as the owner, a manager, a cook, a shop's owner, a neighbour, another kitchen's owner and nobody signed in, and against the real photo store; nothing a phone in use calls has changed. **Live on the database your phones use** since 3 November, late night — read back there: the photo store, its rules and the page. **Nothing you can see yet** — your page editor in Wera Cocina is `10.5-ii` |
| **10.5-i-b** | **The door — the kitchens a neighbour sees — and the point each is drawn at** | ✅ **Done 4 November, night**, both halves — the door and Google's point in the live database (`10.5-i-b-i`), and Wera Cocina keeping each kitchen's point, on its test builds (`10.5-i-b-ii`). **Split in two on 4 November, night**: the database first (`10.5-i-b-i`), because a phone may not write to something the live database does not have yet, and its mistakes are silent; then Wera Cocina keeping the point (`10.5-i-b-ii`). Your ruling of that night: each kitchen drawn at Google's point for her address, kept 30 days at a time and used only to draw; for the pilot the database sends every kitchen on offer to the neighbour's phone; no postal-code table |
| **10.5-i-b-i** | **The door and Google's point — in the database** | ✅ **Done 4 November, night — on the live database the same night**, its nightly clean-up scheduled there. Nothing to look at: it is what Itacate's map will read. **In it:** the one function a neighbour's phone asks — every kitchen on offer now or that published in the last 14 days, each with its address, its page, what it offers and a summary of what it usually publishes, and the point to draw: her own pin, else Google's point while under 29 days old. Google's point is written only by her kitchen's owner, cleared when her address changes, and cleared by the database every night once it is 29 days old — the first job this project runs on a schedule. A check in CI makes sure nothing ever filters on it |
| **10.5-i-b-ii** | **Wera Cocina keeps her kitchen's Google point** | ✅ **Done 4 November, night — on Wera Cocina's test builds the same night, your iPhone's included**: merged green, the privacy page live on tu-wera.com, the update sent and seen running on a test Android with that same file (*What is on your phone*). **What changes for a fonda: nothing she has to do.** When she registers or changes her address, Wera Cocina keeps the point the small map shows — where Google places her address — for up to 30 days, with Google's ID for the place if she picked a suggestion; her kitchen's screen draws that stored point instead of asking Google every time the app opens, and once it is a week old the app asks Google once more, by itself, with nothing on screen. If she sets her own point, hers is used and Google's is no longer asked for. **The privacy page says so**, and so does the email you send before Wera Cocina reaches anyone but you (*Before Wera Cocina reaches your testers*, item 4). ⚠️ **One of Play's answers changes**: *Precise location* becomes *Required* (item 3 there). No database change, nothing to reinstall |
| **10.5-ii** | **Your page in Itacate — the editor in Wera Cocina** | ✅ **Done 4 November.** **In Wera Cocina now** (once the update reaches it): on your kitchen's screen, under what you published, ***Tu página en Itacate*** — the page neighbours will see, as they will see it — and *Editar tu página*: a cover photo (*Tomar foto*, or *Elegir* one already on the phone), your colour out of the six, one sentence of up to 100 letters, your logo, your Google Maps link, the page changing as you go, and *Guardar*. **And a photo per dish when you publish**; *Repetir* brings it back. **Nothing left empty looks empty**: a drawing for each of the nine trades on the trade's colour, and your initials — *Fonda Doña Mari* is **DM**, as the proposals page drew it. **Every photo is cut to its shape from its middle, made smaller, and loses where and when it was taken** before it leaves the phone. **Tried on the test Android against a test copy of the database**: choosing a photo opened Android's own picker with no permission asked; the camera was asked for only at *Tomar foto*; a photo carrying its location reached the photo store without it; a dish published with a photo, and *Repetir* reused it without sending it again. **No database change, nothing to reinstall.** **The privacy page now says all this** — and what neighbours will see once Itacate shows kitchens — and both deletion pages say a deleted business's photos are deleted by hand within 30 days, which **a new runbook** does (*Before Wera Cocina reaches your testers* has the email to send first). **Yours to look at on your iPhone** (*What only you can judge*) |
| **10.5-iii** | **Itacate — sign-in and the way out** | ✅ **Done 4 November, night**, every part — Itacate's sign-in and its way out on its Android test build, and the kitchen's own deletion on Wera Cocina's test builds. **Split in two on 4 November**: the sign-in needs nothing of yours, so it goes first (`10.5-iii-a`); the way out, *Eliminar mi cuenta*, waited for your answer on what it shows someone who also owns a kitchen or a shop (`10.5-iii-b`) — ✅ **answered the same day: Wera Cocina's way**. And a row of its own after it, also yours that day: deleting a kitchen while keeping the account (`10.5-iii-c`) |
| **10.5-iii-a** | **Itacate — signing in** | ✅ **Done 4 November — on Itacate's Android test build the same morning**, after your one command: a session sent the update and watched a test Android open the old screen once and *Tu cuenta* the next time. **Built 4 November** — Itacate's sign-in with Google, Apple or email, *¿Olvidaste tu contraseña?* (WhatsApp to you, its message naming Itacate) and *Cerrar sesión*, copied from Wera Cocina's: one login across the three apps, so your Wera account works there too. It opens on *Crear cuenta*; signed in, it shows the same map as before with *Entraste como …* and *Cerrar sesión* under it. **Tried on a test Android against a test copy of the database**: an account made, kept after the app was killed, signed out and in again, a wrong password refused, the WhatsApp link, and a login that owns kitchens and a shop landing on the same screen with its businesses untouched. **The privacy page now says what an Itacate account holds** (its section 10). No store version of Itacate gets the sign-in before its way out: the update command refuses it |
| **10.5-iii-b** | **Itacate — the way out** | ✅ **Done 4 November, evening — on Itacate's Android test build the same evening**: merged green, the update sent and seen running on a test Android with that same file, and Apple's function learning Itacate, read back on the live project. *Eliminar mi cuenta* at the foot of Itacate's screen, **your way of 4 November — Wera Cocina's**: a neighbour who owns nothing just confirms; someone who alone owns a kitchen in Wera Cocina or a shop in Wera sees each one and types its name, and they go with the account. **Tried on a test Android against a test copy of the database**: a neighbour deleted; an owner of a kitchen and a shop deleted with both names typed; and a kitchen made from another phone while the screen was open — refused with *La lista de tus negocios cambió…*, and the list read again. Itacate has its own deletion page (tu-wera.com/eliminar-cuenta/itacate) and the privacy page says how. **Itacate's store version may now carry the sign-in, when you choose** — *Itacate's way out*, below, has your steps |
| **10.5-iii-c** | **Wera Cocina — deleting a kitchen, keeping the account** | ✅ **Done 4 November, night — on Wera Cocina's test builds the same night, your iPhone's included**: *Eliminar esta cocina* at the foot of her kitchen, the database change on the live project, and a way by email that can never delete the account (*If somebody asks to delete only their kitchen*). What to look at: *What only you can judge* → *Wera Cocina → deleting a kitchen, keeping the account*. **Your ruling of 4 November**, after your question that morning: *Eliminar esta cocina* beside *Eliminar mi cuenta*, the kitchen's name typed. Her account — the one she uses in Itacate and Wera too — and anything else she owns stay, and she can register a kitchen again. It also lets you delete a test kitchen without losing your shop. A database change that only adds, so no phone in the field breaks. Right after Itacate's way out |
| **10.5-iv** | **Itacate — the kitchens near you** | **Split in two on 4 November, night**, at your word (*"Yes, follow your recommendation"*): the list goes first (`10.5-iv-a`), since nothing in it waits on you; the map (`10.5-iv-b`) waits for your answer on Google's *listings* clause and then for Google support's written one. If Google says no, Itacate keeps the list alone. **The list split again the same night**, measured too big for one sitting: the list, then the pages (`10.5-iv-a`) |
| **10.5-iv-a** | **Itacate — the kitchens near you, as a list** | ✅ **Done 5 November, evening** — every piece shipped to Itacate's Android test build that day: the list, a kitchen's page and a dish's, and the order you chose on the discussion's page (`10.5-iv-a-iv`). **Split in two on 4 November, night** — measured too big for one sitting (about 5,500 lines by its parts, nearly twice the largest done in one): the list first (`10.5-iv-a-i`), then a kitchen's page and a dish's (`10.5-iv-a-ii`). Nothing in either waits on you. **And a third piece, your word of 5 November**: the list's order, with the list and the map drawn together for it — a discussion with you (`10.5-iv-a-iii`), **and its build** (`10.5-iv-a-iv`) |
| **10.5-iv-a-i** | **Itacate — the list of the kitchens near you** | ✅ **Done 5 November — on Itacate's Android test build the same night**: merged green, the privacy page live on tu-wera.com, the update sent and seen running on a test Android with that same file (*What is on your phone*). **What a neighbour sees:** *Cerca de ti* — a card for each dish on offer (its photo, or the kitchen's drawing on its colour; the kitchen's circle and name; the price, what it is usually worth struck through and the saving; *Quedan 2* or *Último*; the hours to pick it up; how far it is), **nearest first**; a kitchen with nothing on offer now shows faded, with when it usually publishes — *Suele publicar entre semana, hacia las 17:00*, or *Publicó ayer* — as you ruled on 1 November. **Her location is used on her phone alone**, only while the app is open; if she says no, or her phone gives only an approximate location, she types her postal code; outside Mexico City and the State of Mexico, *Itacate aún no llega a tu zona*. *Cerrar sesión* and *Eliminar mi cuenta* moved to *Tu cuenta*, at the top of the list. Since `10.5-iv-a-ii`, the same day, tapping a card opens a dish's page or a kitchen's. **Found, and yours:** ⚠️ Google refused the address search on Android, for Wera Cocina too (*Before Wera Cocina reaches your testers*, item 6) — ✅ **fixed by you on 9 November**, and Google asked again that day as each app: it answers; the question to Google (*A written question to Google, before Itacate's map*) — ✅ sent by you on 5 November, evening; and how the list is ordered — at your word of 5 November, a discussion of its own (`10.5-iv-a-iii`); nearest first until then |
| **10.5-iv-a-ii** | **Itacate — a kitchen's page and a dish's** | ✅ **Done 5 November — on Itacate's Android test build the same day**: merged green, the privacy page live on tu-wera.com, the update sent and seen running on a test Android with that same file (*What is on your phone*). Tapping a dish opens its page — its photo, the kitchen, what it has, its tags, the price and what it is usually worth, the hours, how many are left, where it is and *Cómo llegar* (Google Maps); tapping a kitchen opens hers — her cover, colour, sentence and logo, what she has today or *Hoy no ha publicado* with when she usually publishes, *Lo que suele publicar*, *Ver en Google Maps* and *Cómo llegar*. As proposal B drew them; nothing from you. Two things decided for you: once a kitchen published for today and it ended, her page says *Ya no tiene nada por hoy* — *Hoy no ha publicado* would be false then; and her page's top is drawn as Wera Cocina's preview showed it to the fonda (*Así te ven tus vecinos*). *Cómo llegar* opens Google Maps with her own point, or her address when she has none — never Google's stored point — and Itacate sends nothing of the neighbour's. No *Apartar* yet: reserving waits for your questions 7–10 |
| **10.5-iv-a-iii** | **Itacate — the list's order, and the list beside the map: a discussion with you** | ✅ **Done 5 November — drawn for you: https://claude.ai/artifact/M5kESDfKVSy3mFEyT3g7dy** (open it on claude.ai, on your iPhone). **First, five moments of one Thursday** — lunch near her work, walking home, deciding dinner, with only her postal code, the evening before. **Then a phone you play with**: Itacate's cards as the app draws them, beside a drawn map (not Google's) — change the moment and the hour, walk her home, switch what comes first and the order inside it, tap a pin or a card, try four screens and a filter. **Then every order by what it costs us, what the other surplus and delivery apps do, and six questions**, each with my recommendation and the argument against it. **What it found:** nearest first — what your phone has today — puts a faded kitchen, with nothing to pick up, above food she could have now in four of the five moments. **Your six answers came the same evening** — what she can pick up now first, an *Ordenar*, C for the map, no filter — and `10.5-iv-a-iv` built them that night |
| **10.5-iv-a-iv** | **Itacate — the list's order as you rule it** | ✅ **Done 5 November, evening — on Itacate's Android test build the same night** (*What is on your phone*). **What a neighbour sees:** the list opens on ***Ahora*** — what she can pick up now, then later today, then another day, then the kitchens with nothing; nearest first inside each — and at its top ***Ordenar***, with *Ahora*, *Más cerca* (nearest first, the order until now) and *Más barato* (the cheapest dish first). Nothing else orders it, and nothing costs money. The privacy page says so in the same words. The orders that wait for neighbours to ask are written in the plan, each with what would bring it back. No store review, nothing in the database |
| **10.5-iv-b** | **Itacate — the kitchens on the map** | **Split in three on 8 November**, measured too big for one sitting and with two halves that wait on someone: the map itself, built for both phones and sent to Itacate's Android test build (`10.5-iv-b-i`); Itacate's first iPhone test build, which needs one command of yours (`10.5-iv-b-ii`); and the 1.5 and 3 km limits, which wait for Google's reply (`10.5-iv-b-iii`). ✅ **Your answers of 5 November: C — the map with the list sliding over it, and her location or her postal code, at her pick.** ✅ **Your yes of 6 November: built without waiting for Google's reply** |
| **10.5-iv-b-i** | **Itacate — the map, with the list sliding over it** | ✅ **Done 7 November, night — on Itacate's Android test build the same night** (*What is on your phone*), with a fix found while watching it arrive: a brand-new Itacate no longer asks for your location before you sign in. **What a neighbour sees on *Cerca*:** Google's map, the whole screen, with every kitchen as a circle in its colour and its trade's drawing — faded when it has nothing on offer — wherever she moves the map; kitchens that would overlap shown as one grey circle with how many it holds, until she zooms in (a tap on it comes closer); her dot where she is, or at her postal code's centre; and over the map, the list — *Cerca de ti*, *Ordenar*, *Cambiar* and the cards — half-way up, with Google's logo just above it. She drags it up to read the list, down to see the map; a tap on a kitchen's circle puts its dishes first, under *En el mapa*. Without her location: the city on the map and the postal code's box in the list. **Seen here** on an iPhone simulator with Itacate's own Google key (the pins, a circle of 2, a faded kitchen, the city with a circle of 5, Google's logo) and on a test Android (dragging the list). ⚠️ **What nobody here could try: tapping a pin or a circle** — the Mac's screen was locked, and a build made here draws no pin on Android. Your look: *What only you can judge* → *Itacate → the map*. The privacy page now says Itacate shows a map: Google sees the area of the map she looks at, never her dot. The iPhone's icon becomes the cow on Itacate's blue in its first iPhone build |
| **10.5-iv-b-ii** | **Itacate — its first iPhone build, and the map on your iPhone** | ⚠️ **This is where the next piece of work is** — ✅ **your command ran on 9 November**: Itacate's first iPhone build is made, read inside and signed for your iPhone (*What is on your phone* has its link). **Yours:** install it and look at the map (*What only you can judge* → *Itacate → the map*) — that look is what the plan calls slice 2 validated, before reserving; then a session pins the build in Itacate's tests. Apple's portal step (*Itacate's way out*, A) holds up nothing here: tell a session whether it is done. You hold no Android, so the look is on your iPhone alone |
| **10.5-iv-b-iii** | **Itacate — what Google's reply decides** | Waits for Google's reply to the question you sent on 5 November (paste it to a session when it comes). Then: the 1.5 and 3 km limits on the list (*Ver más lejos*), only if Google allows them; and if Google refuses ordering by its points, what the list is ordered by is yours to rule then |
| **10.4f** | **Wera Cocina — the search covers the State of Mexico too** | ✅ **Done 2 November, late night**, at your word (*"Let's enable it for State of Mexico for now as well"*). **Measured first** on the twenty Mexico City addresses and on eleven town centres of the State of Mexico that the old search could not reach. Widening the area alone found almost none of the towns: most have no colonia, so a street and number matched the wrong town. **What made it work was adding her city or municipality** — the one she wrote in the form — to what she types: on Android the list found 7 of the 11 towns within 300 m, against 1 without it, and Mexico City lost nothing. When nothing is found, the box now says *No encontramos esa calle en la Ciudad de México ni en el Estado de México…*, so a fonda elsewhere doesn't think her address is wrong. The area is a rectangle around the state, so the edges of the states beside it come along (Pachuca, Cuernavaca); the other states come later, as an update. It reaches your iPhone as an update, with nothing to reinstall |
| **10.5** | **Slice 2 — a neighbour finds a kitchen in Itacate** | **Split in four on 3 November**, measured about five sittings, not three: Itacate is still the skeleton of 27 October, so slice 2 is a whole app's sign-in, map, list and pages beside the database and Wera Cocina's page editor. `10.5-i` the database (each kitchen's page, a photo per dish, and the one door that answers what is close to her); `10.5-ii` your page editor in Wera Cocina; `10.5-iii` Itacate's sign-in and *Eliminar mi cuenta*; `10.5-iv` Itacate near her, checked on a phone before slice 3 — split on 4 November, night, at your word: its list first (`10.5-iv-a`), its map after Google answers (`10.5-iv-b`). **Questions it found wait on you** — Itacate's region, what Itacate's *Eliminar mi cuenta* shows someone who also owns a business, Google's *listings* clause, and the open table of postal-code centres (in `10.3`'s row below), measured by `10.5-0` on 3 November (✅ all but Google's clause answered by 4 November, night — the region is Wera Cocina's search zone); the last one blocks the door, so `10.5-i` was split the same night — its kitchens' pages and dish photos (`10.5-i-a`) go ahead, and the door (`10.5-i-b`) starts after your answer. ✅ **Your rulings of 3 November, late:** three ways to find a kitchen — her location (the list within 3 km), her postal code, or browsing the map across the city; pins that overlap shown as one bigger pin with how many kitchens it holds, until she zooms in; and the sort (relevance, availability, closeness) chosen with you when Itacate's list is built. The postal-code table those three rely on is measured first (`10.5-0`) and shown to you before `10.5-i`. Each kitchen's own page (proposal B), what is close to a neighbour from the 2 km square she is in, and quiet kitchens on the map for two weeks — your rulings of 1 November. **The store versions it waited for are built** (`10.4g-ii`, 3 November, night); `10.5-i-a` is done (3 November, late night) and `10.5-ii`, your page editor, on 4 November; `10.5-iii` split the same day — Itacate's sign-in (`10.5-iii-a`) and its way out (`10.5-iii-b`) done that day, and a kitchen deleted without the account (`10.5-iii-c`) that night; and `10.5-i-b`, the door and each kitchen's point, done that night (no postal-code table for the pilot) |
| **10.4d-ii** | **Wera Cocina — the store versions, with its green icon** | ✅ **Done 2 November, night.** **Wera Cocina has its own pictures now**, as you ruled: the icon is Wera's cream cow on Wera Cocina's green, and as it opens, the cow in that green on the cream — both made from the same drawing as Wera's, in Wera Cocina's own folder; nothing of Wera's changed. **Found on the way:** Android phones older than Android 8 draw the icon from the same picture as the iPhone, so on those Wera Cocina had shown Wera's rust icon until now; they get the green one too. **Four versions built from the same code:** the two store versions — Android's, which reaches your testers when you upload it (*Before Wera Cocina reaches your testers*), and the iPhone's, which waits for its App Store record (`10.5b`) — and the two test versions, the iPhone one for you (*What is on your phone*). Both store files are also on this Mac (`~/RetailerToolDev/wera-builds/`), because Expo lists them only until 2 December. **Read inside each one**: the icon and the cow are the right greens to the pixel, and Apple's 1024 icon has no see-through parts, which App Store Connect requires. Seen on a test Android: the icon, the green cow as it opens, then the first screen. **Neither store version has reached anyone.** Nothing changed in Wera or in the database |
| **10.4d-i** | **Wera Cocina — the phone's own search, built** | ✅ **Done 2 November.** **Measured first**, on the same twenty Mexico City addresses as 31 October: **asked as the app asks, Google's search (Android) put the map on her block for 13 of 20 and your iPhone's for 10, where LocationIQ managed 6** — and both phones carried the house number in nearly every answer. So both platforms got it. **Found first:** the piece the plan named (`expo-location`) would have needed a location permission on Android, which you ruled out; Wera Cocina now carries a small piece of its own that asks each phone's search directly and needs none — a decision made for you, and the first native code written in this project, so only a phone build can test it. **What changed for her:** the map opens on her block from the address she typed, and the keyboard's *Buscar* flies the map to the door she typed; the suggestions while she types are LocationIQ's, as before; nothing a search answers is stored. Seen on a test phone: *Insurgentes Sur 1000* found at its door, *Durango 220* on opening, and *Sin conexión* with no signal. **The privacy page says it** (sections 3 and 6: on Android what she types goes to Google, on an iPhone to Apple — a transfer the law allows without a separate consent). Nothing changes in Wera; nothing in the database |
| **10.4d** | **Wera Cocina — the phone's own search, in its release build** | ✅ **Done 2 November**, both parts. **Split that day** in two: the search itself, built and on the test phone (`10.4d-i`); then, after your word on the icon and the launch screen, the store versions with them (`10.4d-ii`, done that night). Your word of 1 November (*"Let's go with your recommendation then"*) |
| **10.4c** | **Wera Cocina — finding her kitchen on the map, as Uber and DiDi do it** | ✅ **Done 31 October**, the same night as your ruling. **Measured first**: twenty real Mexico City addresses (the city's list of its community kitchens) through LocationIQ and through Apple's search on this Mac. **LocationIQ finds the street, rarely the door** — it knew a house number for 4 of its 47 answers — and only with the colonia: with it, 12 of 20 landed within about three blocks, without it 4. Apple's, the search an iPhone uses, put the map on the right block about twice as often (9 against 5, of the 12 addresses whose recorded spot could be trusted). **Built as you ruled, all over the air:** the flat street map; a search box above it whose suggestions add the colonia she gave and only move the map, about five blocks wide; the map opening near the address she typed; **her tap is the pin**, with *¿Es aquí? …* from the phone's own maps on the card. **What is kept is what she typed and where she tapped** — tried on a test phone: after picking a suggestion, the kitchen stored her tap, about a kilometre from the suggestion's point. Wera Cocina's privacy page names LocationIQ and the *¿Es aquí?* lookup (live since 1 November, read back). **Sent over the air the morning of 1 November — to your iPhone's Wera Cocina too** (*What is on your phone*). **Because Apple's search did better, you said yes on 1 November to the phone's own search in Wera Cocina's release build** (`10.4d`, the row above). What to try on your iPhone: *What only you can judge* → *Wera Cocina → finding your kitchen on the map* |
| **10.4b-iv-b** | **Wera Cocina — before it reaches anyone but you** | ✅ **Done 31 October.** **Wera Cocina's privacy page is rewritten** (tu-wera.com/privacidad/cocina-e-itacate, published the moment it merged): what an account, a kitchen and a publication hold, and who sees them — today the kitchen's own people, so her alone, and Wera. **No neighbour sees anything until Itacate shows kitchens; before that, the page will say what they see, and every account gets an email first** — the same promise Wera's page makes. Itacate's part is unchanged. **A deletion page of its own** (tu-wera.com/eliminar-cuenta/cocina), which Play's form asks for. **Play's answers for Wera Cocina are written** (`store/cocina-itacate.md`): *Data safety* — ten kinds of data, the kitchen's pin as *Precise location* and its address as *Address* — and *Sign-in details* with a demo account; **yours to paste, with a demo account you make** (*Before Wera Cocina reaches your testers*). ***¿Olvidaste tu contraseña?* is in Wera Cocina**: WhatsApp to you, *"Hola, olvidé mi contraseña de Wera Cocina. Mi correo es …"*; your number is in Wera Cocina's Expo settings, never in the code. **The deletion asked for by email takes a name for each business** and prints the line to run again — tried ten ways on a test copy of the database, and now checked on every change to the database. **Two things are yours before Wera Cocina reaches your testers**: Play's forms, and your command for Android's store version of Wera. And **slice 1 is validated when you have tried it on a phone** (*What only you can judge*, the *Wera Cocina* rows) |
| **10.4b-iv-a** | **Wera Cocina — she publishes** | ✅ **Done 31 October.** On her kitchen's screen *Publicar lo que te sobra* now comes first. She publishes one to ten lines — each a dish or, with one switch, a **surprise bag**, which may say what it is usually worth (*vale*) — with tags such as *Pica*, and when neighbours may come: *Desde* and *Hasta*, a quarter of an hour a tap. Under the button, **Lo que publicaste**: what is on offer first, then what ended or was withdrawn, each with *Repetir* (the form opens filled in, at the same hours) and, while on offer, *Retirar* (asked once). **Nothing she publishes is shown to anyone yet** — neighbours see it from the next slice, in Itacate. **Tried on a test phone** against a test copy of the database: a dish and a bag published and read back exactly; a missing count refused in Spanish; the times stopping where the database would refuse them; *Repetir* and *Retirar*; and no signal at *Publicar* — *Sin conexión*, nothing written — then one publication, not two, once the signal came back. **Sent over the air the same day** to Wera Cocina's Android test build — on none of your phones yet (*What is on your phone*) |
| **10.4b-iv** | **Wera Cocina — she publishes, and you try slice 1 on a phone** | ✅ **Done 31 October**, both parts — what is left is yours: trying slice 1 on a phone. **Split on 31 October** into two: she publishes (`10.4b-iv-a`, done that day), then what must be true before Wera Cocina reaches anyone but you (`10.4b-iv-b`, done the same evening) — publishing alone was the size of a whole sitting |
| **10.4b-iii-c** | **Wera Cocina — her way out** | ✅ **Done 31 October.** At the foot of both screens a person can be on in Wera Cocina — where a kitchen is made, and her kitchen — *Cerrar sesión* and, quiet under it, *Eliminar mi cuenta*. Open, it names every business she is the only owner of, her kitchen first and a shop of hers in Wera too (*tu tienda en Wera*, with a line saying where to download its month first), and asks each one's name, as you ruled for Wera; someone who owns nothing just confirms. **Tried on a test phone** against a test copy of the database: a kitchen, a shop and a kitchen, a shop alone, nothing at all — each deleted, and read back gone; a name typed without its ñ refused; *Cancelar* deleting nothing; no signal at the tap — *Sin conexión*, nothing deleted; and a kitchen made on another phone after the screen read its list — refused, the list read again with the new kitchen, then deleted. **And the function that tells Apple now knows which app is asking** — Wera or Wera Cocina, and no other — so deleting an account made with Apple in Wera Cocina tells Apple too. **Not seen yet:** that half needs an iPhone build of Wera Cocina, and the first such deletion is the proof of your Apple grouping (*What only you can judge*) |
| **10.4b-iii-b** | **Wera Cocina — she makes her kitchen** | ✅ **Done 30 October.** After signing in, a fonda registers her kitchen on two screens: its **name**, **what it is** (one of the nine kitchens' trades, nothing chosen for her) and its **address** in the same five boxes Wera asks; then **the map** — the satellite view with the streets' names, opening on the city because Wera Cocina never asks for her location. A tap far out brings the map closer where she tapped; once it shows about a block, a tap puts her pin exactly there. Under it, an optional line — *Cómo encontrarte*, say *Portón verde, junto a la farmacia* — and the sentence *Los vecinos verán este punto exacto en el mapa.* Then *Registrar mi cocina*. **Her kitchen's screen** shows its trade, its address, a picture of the satellite view around her pin and her line, with *Cambiar el punto* and *Cambiar giro o dirección*; if any piece did not reach the database, the screen says so in red and offers the button that gives it. **Tried on a test phone** against a test copy of the database: a new account registering a kitchen, every refusal in Spanish, the pin moved, the trade and the number changed, a shop's owner making a kitchen with her shop left untouched, and *Sin conexión a internet* when the connection was cut at the last tap — then one kitchen, not two, once it came back. **Not seen there:** the satellite picture itself and the zoom — the test build has no map key; they are your look (*What only you can judge*). **Sent over the air the same night** to Wera Cocina's Android test build — on none of your phones yet (*What is on your phone*) |
| **10.4b-iii-a** | **Wera Cocina, first part — she signs in** | ✅ **Done 30 October.** Wera Cocina now signs a person in with Google, Apple or email — the same account she has in Wera — and for now tells someone with no kitchen that registering it comes next; someone with a kitchen sees its name. **A shop's owner who signs in to Wera Cocina is not shown her shop**: it stays Wera's. **Tried on a test phone** against a test copy of the database: an account made by email (the privacy box required), a wrong password refused in Spanish, signing out and in, a shop's owner landing on the right screen, a kitchen opening after the app was closed and reopened, and *No pudimos leer tu cocina* with a retry when there was no connection. Google and Apple can only be tried on your phones. **Sent over the air the same day** to Wera Cocina's Android test build, and seen arriving on a test phone — on none of yours yet (*What is on your phone*). Wera Cocina's privacy page, which said these versions have no accounts, was rewritten for them on 31 October (`10.4b-iv-b`) |
| **10.4b-iii** | **Wera Cocina, first half — a fonda signs in and makes her kitchen** | ✅ **Done 31 October**, all three parts. **Split on 30 October** into three, each ending in an update you can try: her sign-in (`10.4b-iii-a`, done), her kitchen (`10.4b-iii-b`, done), and deleting her account (`10.4b-iii-c`, done the night after), which also tells Apple — the first proof of your Apple grouping, once an iPhone build of Wera Cocina exists. The four settings outside the code are made (29 and 30 October; the `10.4b` row below lists them) |
| **10.4b-ii** | **Wera shows your shop alone when the same account also has a kitchen** | ✅ **Done 29 October.** Every list in Wera now reads the shop open in it and nothing else — stores, products, suppliers, people, today's sales, Números and the month's download. Found while building it: such an account could not have sold at all — with two stores Wera did not know which one it was in, and the *Cobrar* slider never appeared. **Tried on a test phone** with one account owning a shop and a kitchen: before, *Hoy* counted the kitchen's $50 sale as the shop's, the kitchen's dish sat among the shop's products, Comprar offered two *Genérico* and there was no slider; after, only the shop's — $16, its own products, one *Genérico*, and the slider. What every phone keeps for working without signal is carried over on its first open after the update, so it still sells offline — tried with the test phone cut off from the database. Nobody has a shop and a kitchen yet, so nothing changes on your screen. **Sent over the air to your phones the same night**, and you opened it in airplane mode: products and slider there (*What is on your phone*). Nothing for you to decide |
| **10.4b-i** | **Deleting an account that has more than one business** | ✅ **Done 29 October.** When deleting an account would delete more than the shop open in Wera — a kitchen in Wera Cocina too — Ajustes lists every business that goes and asks for each one's name, as you ruled; a one-shop account is deleted exactly as before, on the same screen. Someone whose only business is a kitchen, opening Wera, gets the same on the welcome screen. The database checks again: each business needs its own name typed, so an older copy of the app, which asks for one name, can never delete a kitchen it did not name. Tried 21 ways in the database, and over the internet as a phone would, before merging. **Deployed the same night** — read back on the live database, where no kitchen exists yet — and **sent over the air to your phones** (*What is on your phone*). Nothing changes on your screen today: no account has two businesses yet |
| **10.4b** | **Slice 1, the half you see — Wera Cocina's screens**: a fonda signs up as a kitchen with Google, Apple or email, picks her trade, gives her address, puts her exact pin on the satellite view with a line of directions, publishes dishes or a surprise bag for a pickup window, repeats what she published before, and can delete her account | ✅ **Done 31 October**, every part — **slice 1 is validated when you have tried it on a phone** (*What only you can judge*, the *Wera Cocina* rows). **Split on 29 October** into the deletion (`10.4b-i`, done), Wera showing your shop alone (`10.4b-ii`, found and done the same night), and Wera Cocina's screens in two: her sign-in and her kitchen, then publishing, which you try on a phone. **Four settings outside the code, for Wera Cocina's sign-in — all made:** Wera Cocina is on the live sign-in's Apple list and redirect list (your command, 30 October, read back), its Expo project holds the database's address and key (a session, 29 October), and Wera Cocina is grouped under Wera in your Apple developer account (your word, 30 October), so one Apple key covers both and deleting an account made with Apple in Wera Cocina can tell Apple. Before its sign-up reaches anyone but you, one more command of yours for Android's store version of Wera, now that `10.4b-ii` is on the test builds (the first two changes went out on 29 October). It ends with an update to Wera Cocina's test build that you try on a phone before slice 2 |
| **10.4a** | **Slice 1, the half you don't see — the database for a fonda publishing, and Wera opening shops only** | ✅ **Done 29 October.** The database now knows whether an account is a shop or a kitchen (every account today is a shop, and it never changes); keeps the kitchens' own list of trades, which Wera never shows a shop; holds a kitchen's exact pin with its one line of directions; and holds what a kitchen publishes — a window and its dishes or surprise bags, read only by that kitchen's own people. Your Discord alert says *🍲 Nueva cocina en Wera Cocina* for a kitchen. Tried 52 ways as a kitchen and as a shop before merging. **Deployed the same afternoon** and read back on the live database: 16 accounts, all shops. **Wera now opens only shops** — sent over the air to your phones; for everyone today nothing changes, it matters the day someone owns both. Android's store version needs your command (*What is on your phone*) |
| **10.4** | **Slice 1 — a fonda publishes an itacate in Wera Cocina**: she signs up as a kitchen, puts her exact pin on the satellite view with a line of directions, and publishes dishes or a surprise bag for a pickup window; Wera lists only shops | **Split in two on 29 October**: the database and Wera's side, which you don't see (`10.4a`, done), and Wera Cocina's screens, which you try on a phone (`10.4b`, done 31 October) |
| **10.3** | **The marketplace on paper — your one review before slice 1**: everything fondas publish, neighbours reserve and the 3-digit code, drawn for you once — including the exact shop-or-fonda line in each business account — and the check that no change to the database ever breaks an app already on a phone. No table is built yet | ✅ **Done 28 October.** **The check is in CI**: every change to the database is now compared with the one before it, and goes red if anything an app on a phone could call — a function, what it is sent, a column, a right — is gone or changed, unless the change says why no app still uses it. It was broken on purpose 32 ways and caught every one. Measured on the way: since the oldest build still listed (10 October), nothing an app calls has been taken away. **The marketplace is drawn**: https://claude.ai/artifact/J6tJmX3xCVEMLuc5z2ydsy — the situations first, then the tables, who sees what, and ten questions. **Your answers to 1–4 are in**: one kind per account for now; the owner and a manager publish and everyone hands over; the exact spot, visible before reserving (28 October, reversing your ruling of 26 October); and on 29 October proposal B — a dish or a surprise bag, with *Repetir* — and a line of directions beside the pin (https://claude.ai/artifact/CcEDunjkPozCxQ3SEmTJBk). ✅ **Questions 7–10 answered 5 November, late night**, with the family-shell page (https://claude.ai/artifact/5bztU1ZEgXWpnjwPkCzcZf): she picks her hour and how she pays — the method only, no bank account for now — and the fonda gets a notification. ✅ **Nothing is waiting on YOU** in the plan's decisions block: on 6 November you answered both questions — *Lo que vale normalmente* is required when she publishes (`10.5-v-d`), so Itacate's *a mejor precio* is true of every offer, and a shop's offer may run until tomorrow (`10.6a`). ✅ The three more that `10.5`'s estimate found on 3 November are all answered: Itacate's region (before `10.5-iv`; what a neighbour sees when she says no to her location you ruled on 3 November — her postal code, or browsing the map) — ✅ **answered 4 November, night: the same zone as Wera Cocina's search** and how to read Google's *listings or directory* clause for Itacate's map (before `10.5-iv-b` — Itacate's list, `10.5-iv-a`, goes ahead without it, your word of 4 November, night) — ✅ **answered 6 November: read as its heading says, and Itacate's map built without waiting for Google's reply** — the third, what Itacate's *Eliminar mi cuenta* shows someone who also owns a business, you answered on 4 November: Wera Cocina's way; and **the order of Itacate's list** — closeness, what is on offer now, or something else, chosen with you when it was built — ✅ **moved at your word of 5 November to a discussion of its own, after a kitchen's page and a dish's** (`10.5-iv-a-iii`: every way to order it, grouped by what each costs us, and the list and the map drawn together; nearest first until then) — ✅ **drawn and answered on 5 November** (https://claude.ai/artifact/M5kESDfKVSy3mFEyT3g7dy): the list opens on what she can pick up now; an *Ordenar* for *Más cerca* and *Más barato*; nothing that costs money; the map with the list sliding over it (C); her location or her postal code, at her pick; and no filter by tags for now; and one your address-first ruling found the same evening — the open table of postal-code centres that gives a kitchen with no point of her own a rough place, and stands for a postal code a neighbour types (before `10.5-i-b`, the door; measured by `10.5-0` the same night — INEGI's businesses place a code's point within 1 km of 9 in 10 of the city's restaurants, GeoNames 5.6 in 10 — and put to you on https://claude.ai/artifact/WxSEFxamNsQUYW9HTW3HqR) — ✅ **answered 4 November, night: no table for the pilot** — each kitchen is drawn at Google's point for her address, kept 30 days at a time, and the database sends the neighbour's phone every kitchen on offer. You ruled 5 and 6 on 1 November — each kitchen's own page as proposal B, and what is close to a neighbour from the 2 km square she is in (C — and since 3 November, when she says no, her postal code or the map): https://claude.ai/artifact/EaiMkYqn2skPXn7MiKeULu — and that a kitchen with nothing on offer stays on the map for 14 days after each publication, with when and what it usually publishes Two things are yours meanwhile: invite the twelve testers to each new app, and tell a session the day the twelfth joins each — that day starts each app's 14 days. (*Ofrecer* in Merma, `10.0b`, waits for Google's production approval) |
| **10.2b** | **The two new apps' keys, first builds and store records** — the half of the skeletons that needs your accounts: the map key and Firebase's file in Expo, each app's first store build, a new app in Play Console for each with its closed test started (12 testers each, so the 14-day clocks run while the rest is built), and the App Store records | ✅ **Done 28 October** — your keys, Firebase and the two Expo projects; six first builds, checked (the map draws Mexico City with your key on Android); the privacy page on tu-wera.com; both apps sent to Google's review for their closed tests; and the map key locked to the two apps, tried both ways — our builds draw the map, and the same app signed by anyone else gets an empty one. The App Store records wait for the public release (`10.5b`) |
| **10.2a** | **The two new apps, as code** — Wera Cocina (`cocina/`) and Itacate (`itacate/`) beside Wera, with every part each needs inside its first build: the map and notifications in both, the camera in Wera Cocina, the location — only while the app is open — in Itacate | ✅ **Done 27 October** — both apps exist and were built for Android and an iPhone on this Mac; each opens on one screen, its name, *Muy pronto* and a map. Nothing reached your phone and nothing changed in the database. **Found on the way:** installing the new apps' notifications quietly upgraded a part Wera shares with them — merged like that, no fix sent over the air would have reached a pilot phone until new store builds. It was put back, and every change is now checked for it. Their ids are the ones you said yes to on 27 October, `mx.wera.cocina` and `mx.wera.vecino` — permanent from the first upload; the icons are provisional (Wera's cow, green for Wera Cocina, blue for Itacate) |
| **10.2** | **The two new apps' skeletons** — the whole job as first planned | **Split in two on 27 October**: the code, which needed nothing from you (`10.2a`, done), and the half that needs your accounts (`10.2b`, next) |
| **10.1b** | **The live database made to keep those walls** — found by `10.1` on 27 October: on the live database, someone with **no account** can call 27 of the 35 protected functions. What they can actually get is small — the starter catalog, whether a postal code was in the old pickup area, and a person's name if they already hold that person's internal id — because every write checks who is calling. The cause: the live database and the test database hand out permissions differently, so no test could ever see it. One migration takes those permissions back, and a check reads the live database after every deploy | ✅ **Done 27 October** — one migration took back what the live database handed out by default: with no account, nothing can be called or read; a signed-in person can call the 35 functions the apps use and no other — a person's name by id is no longer one of them; and new tables and functions start closed. It also closed a door the measuring found: a cashier could have adjusted stock directly, past the manager-only rule, with a hand-made request (no screen ever did). One query now reads those walls in two places — the tests after every change, and the live database after every deploy. Nothing changes on your phone. **Deployed the same evening**, and the live database read afterwards: no wall open |
| **10.1** | **The architecture written down for the new apps** — ADR-035 amended as you ruled on 27 October: a fonda is a business account like a shop; a buyer signs in and reads through one door; no browsing without an account; notifications sent from the database; and a migration never breaks a build already in someone's hand | ✅ **Done 27 October** — written into the architecture record and into the rules every session reads. Nothing changed on your phone or in the database. Two calls made for you: the buyers' one door is a database function, and what is a buyer's own (her reservations, her phone's notification token) is reached only through functions that check it is her. Measuring on the way found the live database letting people with no account call protected functions — that is `10.1b`, next |
| **10.0a** | **The ecosystem's first step: Wera's pilot version, part 1** — *Te lo compro* hidden with one update over the air, and Merma no longer asks for the address while it is paused (your ruling of 27 October, reversing 21 October's). Step 10 in the plan holds the rest, in order: *Ofrecer* in Merma, Wera Cocina, Itacate and the shared backend | ✅ **Done 27 October** — Merma is *Tirar* for everyone and asks no address; Inicio shows no pickup and no *Rescatado*; the tutorial's Merma card is a new picture of *Tirar*, with no promise. Nothing was deleted: one switch in the code brings it all back. It goes to your phones and Android's store version over the air; the iPhone's store version gets it when Apple approves. **Measured that day:** 12 of 16 stores had no address, so Merma stopped them before *Tirar* — and those 12 had never recorded a write-off |
| **8a** | **The handbook, rewritten short** — this file | ✅ **Done 29 September** — 1,229 lines down to this; the rest moved to the archive |
| **8b** | **The live plan, cut to what is live** | ✅ **Done 29 September** — 5,573 lines to 420 |
| **8c** | **`CLAUDE.md` and `app/CLAUDE.md`, rules only** | ✅ **Done 29 September** — 57 KB to 14 KB |
| **8d** | **Housekeeping** — merged branches, old map snapshots, stale memories | ✅ **Done 29 September** — 17 branches, 50 MB of maps |
| **8e** | **The design map for Wednesday** — every colour, size and animation, and a screenshot of every screen | ✅ **Done 29 September** — https://claude.ai/artifact/4h59q1QEdc1q3ztYnN39EJ |
| **8f** | **The design pass, with you** | ✅ **Done 30 September** — light only; one filled button and one dimmed backdrop everywhere; Precios' cards fixed. On your phone since 10 October |
| **8g** | **Your screen-by-screen review** — headers, the tab colour, sign-in and welcome, and what `8f` left you. **Widened on 12 October to a real first day**: sign up, create the shop, import the starter catalog, first sale | ⏸️ **Paused 27 October for Step 10, at your word; the review resumes when you call it.** Your answers of 21 October on Merma's address (everyone gives it, in Merma or Ajustes) and the Encargado (the role chosen when you let her in, and changed whenever you want) are round 3 of the first day (`8q`), ✅ on your phones since 21 October: Merma asks whoever opens it for a missing address, you choose Empleado or Encargado as you let someone in and change it in *Tu equipo*, and the email invitation is gone. ✅ **21 October: the first day, rounds 1 and 2, on your phones** — the two doors with the cow turning into the logo the first time Wera opens, your account then only your half, *Tu tienda* asking the name and the giros, IVA changed in Ajustes, Merma asking the owner the address; someone who joins lands on Vender and her screen opens by itself when you let her in. ✅ **20 October: Números opens on your month in three colours** — what you sold, bought and threw away, against last month in pesos and words — a new shop's first week, and two discoveries (*¿a qué hora vendes más?*, *tu mejor día*) that open as the shop builds its history. ✅ **The same night, the rest of Números**: *el efecto quincena*, *cada cliente te deja*, *lo que más subió de precio* with your own products, *tu año en cuadritos*, and *Tu semana* — last week as four cards, offered on Inicio Monday to Wednesday. ✅ **20 October: Proveedores as your option A** — each supplier says when she last came and what you bought from her this month; her page has *Llamar*, *WhatsApp* and *Editar* side by side, this month, and what she brings with the last price and how it moved. No captions. ✅ **20 October: the screens' flow, your nine-point review** — a correction now says *Corrigiendo …* on the counter and keeps its original prices, back goes one step at a time, and *Te lo compro* and the forms ask before throwing anything away. ✅ **20 October, evening: *Desperdicio* is *Merma*** everywhere you or a customer reads it — the tab, Inicio, the screen, *Lo último*, both store listings and tu-wera.com; the privacy notice and the deletion page wait for your word. **And a report on what works without signal** (https://claude.ai/artifact/22vhuE6pKP94yUovnEuzm4): the worst, measured, is that **the phone forgets its products after a refresh fails offline**, so a shop offline across two openings cannot sell. ✅ **The same night, your A and B: without signal the phone keeps its products, its sign-in and your role**, and refreshes by itself when the signal returns and when you come back to the app — measured on the Android emulator, and opening offline with an old sign-in no longer shows *Entrar*. And *Cerrar sesión* now really erases the shop's copy from the phone, as the privacy notice says. ✅ **Then, on your *"Do all the fixes"*: *Hoy* counts what you sold without signal** (and never twice when it lands), the *ya se guardaron* message waits until they really are, the *Sin conexión* notice no longer goes quiet after the first hour, a write-off that lands leaves *Sin enviar* by itself, Merma wears a basket, and the privacy notice and the deletion page say *merma*. ✅ **And the last round:** with no signal, anything that needs the server says *Se ve cuando haya señal* instead of spinning or saying "nothing"; *Te lo compro* says *Para pedir que pasemos necesitas internet* at its door, and a request saved without signal waits and sends itself; pull down to refresh on Inicio, Lo último, Números, Productos, Proveedores and Solicitudes (never on Vender, Comprar or Merma); and the first sale and the first outage each explain, once, that Wera works without internet. ✅ **And on your word, every request now has a time limit** — 30 seconds, a minute for the catalog, a minute and a half for a photo going up — so a weak signal ends in *Sin conexión a internet* instead of a screen that waits for ever, and a sale caught in it is sent again by itself. ✅ **And *Agregar del catálogo* now says what it could not add, and why, in one line** — your 17 Pollo products were never added because your *Pollo* aisle holds *Pollo entero* by the piece, and an aisle holds one measure. On your word, *Pollo entero* (by the piece) now has its own aisle and the 17 came in: Pollería is complete in your shop, 59 of 59. **Next: the first day — paste *The First-Day Prompt* (below, *How a working session goes*)** — then the Android users. ✅ **Round 1 done 15 October, with you: Vender and the Carrito in your row B**, and a product with no price gets its price on its first `+`. ✅ **Round 2 done the same night: one header, the cream band, on every screen; on the four tabs your shop's name and a faint drawing of its giro.** **Round 3 ✅ (16 October): only the main action solid, Nunito in the titles, motion as it is.** ✅ **19 October: Lo último as your option A — by day, one line per sale that opens on a tap.** You ruled the same evening that **a correction counts on the day of what it corrects** — that is `8p`. ✅ **19 October: Ajustes as your option B — a menu of squares, each opening its own page — and Solicitudes in cards, with the code to share when nobody waits.** ✅ **Round 4 (16 October): Comprar as your card grid in blue, a cost first, and one Carrito for all three counters. Next: Desperdicio** — your order, the daily screens first (then Inicio, then the rest) — decided on the canvas (https://claude.ai/artifact/JcSTnTSZhMEY2hCHZo5zn9), then built. Paste the review prompt (below, *How a working session goes*), not your main prompt |
| **8m** | **The camera and the aviso for *Te lo compro*** — a photo as evidence, a new app build on both phones, and the aviso de privacidad and the stores' forms. Split off `8l` on 16 October | ✅ **Done 17 October**: the aviso is up on tu-wera.com and the camera build is on your iPhone; the pilot Android installs it from its link (see *What is on your phone*) |
| **8p** | **A correction counts on the day of what it corrects** — your ruling of 19 October. Deleting yesterday's sale today will lower yesterday, everywhere, and leave *Hoy* alone; a corrected sale goes back to its own time. Our side keeps the full history | ✅ **Done 19 October.** Delete Friday's sale on Monday and *Hoy* does not move; Friday drops in Números, *tu mejor viernes*, the streak and *Esta semana*. Press *Corregir* on Friday's sale, fix it, and the new one is Friday's, at its own time. The same for a delivery and a write-off. The monthly export still shows each deletion on the day it was made — that is our side's history. ⚠️ One small thing for the review: correcting a write-off older than *Antier*, the *¿Cuándo lo tiraste?* chips show *Hoy*, though it is saved on its own day |
| **8o** | **Photos in Productos** — Wera's photo on every catalog product (not changeable), your own photo on a product you create, or its initials; two sizes kept on the phone | ✅ **Done 18 October.** Your own photo: *Tomar foto* first on *Nuevo producto*, *Tomar otra foto* and *Quitar foto* on *Editar*. Wera's photo: whatever you put in `~/RetailerToolDev/wera-fotos/` (one folder per giro and aisle, the file named by its `codigo`, `LEEME.md` says what makes a good photo) goes into the app with one command, `bash docs/runbooks/catalog-photos.sh --linked`, and every shop sees it on its next open. Run it again whenever you add photos; it only sends the new ones. A catalog product's name and photo can no longer be changed by a shop — the database refuses it now, not just the screen |
| **8i** | **Pricing at the counter with no signal** — your `+` asks a price, and the price chip changes one | ✅ **Done 1 November**, on your word that night (*"Yes, go with your recommendation"*). With or without signal, *Guardar* closes the sheet at once and every screen shows the new price; the phone sends it when the signal comes back. If someone else changed that price in the meantime, theirs stays and yours is dropped, and nobody sees a message. One database change (a function that closes the old price and opens the new one in one step), so a change can no longer leave a product with no price halfway. Nothing changes for a cashier. The database change is live and the update went to your iPhone and the pilot Android the same night — see *What is on your phone* |
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
| **5R-d-iv-b** | **The Android test itself** — you make the demo account, paste the listing, upload the app and send it to Google; then 12 testers for 14 days | ✅ **Done 9 November** — Google approved the test by 22 October, your twelve testers had joined by 24 October, the 14 days ended on 7 November, and you applied for production on 9 November (*The dates*). Kept for the record: the store file is in your Downloads folder, and nothing waits for Apple sign-in. ⚠️ There are three there since 14 October: upload the one whose name has **`-5-`** (`…-5-giros.aab`). It has the cow, three fewer permissions and the fixes of 14 October, so a tester's very first screen asks only for giros; the `-3-` and `-4-` ones are older builds. Six steps, under *Putting Wera on Google Play's closed test*. You have **all 12** testers since 14 October: their addresses go straight into Play Console. Tell a session the day the twelfth joins |
| **5R-d-iv-c** | **The public listings** — the screenshots and final text for both stores, and the App Store's record | **No longer waits for your review** (your call, 14 October): made from today's screens, and retaken after your review as an update. You applied for production with Wera's Play listing as it stands (9 November); Wera's forms on Play stay as they are while Google reviews, and reading the descriptions again is optional, after Google answers |
| **5R-k** | **Entrar con Apple** on iPhone — Apple asks for it beside Google | ✂️ **Split on 13 October** into the two rows below: what a session could build and check without a phone, and what only your iPhone can show |
| **5R-k-a** | **Apple sign-in, built** — Apple's button on Entrar, the name Apple hands over, and telling Apple when such an account is deleted. Four things you ruled that day: a small server function that stores nothing; a hidden email shows the person's name in *Solicitudes*; you send the aviso's notice yourself; and the first screen gets *Cerrar sesión* and *Eliminar mi cuenta* | ✅ **Done 13 October** — in the app's code, on the site (the aviso and the deletion page now name Apple) and in the architecture record. **Not on any phone, and not switched on**: that takes your five steps |
| **5R-k-b** | **Apple sign-in, working on your iPhone** — your five steps, then a session reads the result with you holding the phone | ✅ **Three of your five steps are done** (read 9 November): the key is in the function, Supabase's Apple switch is on for all three apps, and your iPhone build carried it — and Apple approved Wera with the button. **Left, yours:** step 4's email, only if an account made before 14 October is not yours; and step 6 — one real sign-in with a throwaway account, about five minutes (*Turning on Entrar con Apple*, below) |
| **5R-m** | **Your logo, on the app icon and the site** — the icon, the splash and a restyle of the three web pages | ✅ **You chose the mark on 13 October: the cow's face, option A**, with the W in its fringe. It is the file `brand/wera-mark.svg`, and the three options are still on the canvas: https://claude.ai/artifact/DQFB1T7w62t6DYUnTyJDch. **And its colour the same day: rust, on cream.** **The icon is in since 13 October: a cream cow on a rust square**, with builds of its own, because you asked for it on your phone at once. Each pilot phone installs again after Apple sign-in, keeping its data. What is left for this row is the site: the mark and a restyle of the three pages, after your review |
| **5P-d** | **The pilot's measurements, switched on** for the phones on the test channel — one update, no reinstall | ✅ **Done 13 October** — the switch is a setting on EAS (`piloto-1`) and one fix shipped over the air to both phones. The Android build was made again that day, so a new pilot member's first sign-up has the aviso's box. The store builds never carry the switch, and the shipping command now refuses if they would |
| **5P-b** | **How much each pilot shop uses Wera** — sales, purchases and waste per shop per day, counted from the server. Nothing added to the app | ✅ **Done 13 October** — one command prints it, one row per shop per day for two weeks, with the days nothing was recorded shown as zeros. See *Seeing how much each shop uses Wera*, below. It was checked against your own shop: 3 sales and 2 purchases in the last 14 days |
| **10.5-v-a** | **Both apps — the words**: no word that makes the food sound left over, anywhere a fonda or a neighbour reads, and the two lines you ruled | ✅ **Done 6 November** (your rulings of 5 November, the family-shell page) — **on Wera Cocina's test builds, your iPhone's included, and Itacate's Android test build**, sent over the air the night of 5 November and seen running on a test Android with each same file. **In Wera Cocina** her button is ***Publicar una oferta*** and its screen ***Tu oferta de hoy***; **in Itacate** a quiet kitchen says ***Suele tener ofertas entre semana, hacia las 17:00***, and her page ***Por hoy ya se terminó*** and ***Lo que suele ofrecer***; **each app's first screen** opens on its line — ***Vende hasta el último plato*** and ***La comida del día de tu colonia, a mejor precio***. The privacy page, the terms and tu-wera.com's home page say *tus ofertas del día* (live). **Yours, later:** paste both apps' new *Full description* and Wera Cocina's *App access* note into Play (`store/cocina-itacate.md`, its note at the top). ⚠️ **One question it found**: Itacate's *a mejor precio* is not true of an offer without *Lo que vale normalmente*, which is optional — the plan's decisions block |
| **10.5-v-b** | **Itacate — its tab bar and its look**: *Cerca · Apartados · Mis cocinas · Tú*, each tab arriving with its feature; titles in Nunito, Itacate's blue, and the movements | ✅ **Done 6 November** (ruled 5 November) — **on Itacate's Android test build**, sent over the air that afternoon and seen running on a test Android with that same file (*What is on your phone*); no new store build. **What a neighbour sees:** a tab bar with ***Cerca*** and ***Tú*** (*Apartados* comes with reserving, *Mis cocinas* with the stamp card); on *Cerca*, at the head of the list, *Cerca de ti*, where it is measured from with ***Cambiar***, and ***Ordenar: Ahora***, which opens a sheet from the foot; ***Tú***: who is signed in and how, ***Dónde buscar*** — her location, or a postal code she picks even with her location on (your answer of 5 November) —, the privacy notice, *Ayuda por WhatsApp*, *Cerrar sesión* and *Eliminar mi cuenta*, and *Itacate, de Wera* under the cow; titles in Nunito, every button and link in Itacate's blue, and each screen's first blocks rising into place. *Tu cuenta*, the screen behind the list's link, is gone: *Tú* replaces it. Seen on a test Android against a test copy of the database, every screen and the two movements. The privacy page says the postal-code choice in section 10 (dated 6 November). Then the map (`10.5-iv-b`, your yes of 6 November) goes into *Cerca* as you chose — the list sliding over it, in this row's sheet |
| **10.5-v-c** | **Wera Cocina — its tab bar and *Hoy***: *Hoy · Apartados · Clientes · Mi cocina*; *Hoy* as a hub; her offers in a room of their own; *Mi cocina*; her daily reminder; *Deshacer* | ✅ **Done 7 November, both halves.** **Split in two on 6 November**, measured too big for one sitting: the tab bar, *Hoy* as a hub, *Tus ofertas* and *Mi cocina* first (`10.5-v-c-i`, done 6 November), then her daily reminder and her offers and her page as neighbours see them (`10.5-v-c-ii`, done 7 November) |
| **10.5-v-c-i** | **Wera Cocina — its tab bar, *Hoy* as a hub, *Tus ofertas*, *Mi cocina***: the day with how many are on offer and until when, *Publicar una oferta* with a one-tap *Repetir*, *Tu página* as a door you can close; her offers in a room of their own; *Mi cocina* with what she sets once; *Deshacer* | ✅ **Done 6 November, evening — on Wera Cocina's test builds, your iPhone's included**, sent over the air and seen running on a test Android with that same file (*What is on your phone*). **What a fonda sees:** a bar with ***Hoy*** and ***Mi cocina***; on *Hoy* a card with what is on offer today — *Hoy en Itacate · hasta las 20:00*, *10 porciones en oferta*, a bar for the time left, each dish on a line — which opens ***Tus ofertas*** (today's with *Ya se terminó*, then *Anteriores* with *Repetir*); *Publicar una oferta*, and yesterday's offers as *Repetir* chips, one tap each; *Tu página · 4 de 5* as a door she can close; ***Deshacer*** for 8 seconds after publishing; ***Mi cocina*** with her page, its checklist, where she hands food over, her trade, help and her way out. Titles in Nunito, in Itacate's kitchen and dish pages too. **Found and fixed:** the tab bar's pill squared after the first switch on Android, in both apps |
| **10.5-v-c-ii** | **Wera Cocina — her daily reminder, and *Así la ven***: the reminder asked once after her third offer, at her usual hour, changed or turned off in *Mi cocina*; her offers and her page as neighbours see them | ✅ **Done 7 November, morning — on Wera Cocina's test builds, your iPhone's included**, sent over the air and seen running on a test Android with that same file (*What is on your phone*). **What a fonda sees:** after her third offer, once, under the doors on *Hoy*: *¿Te recordamos a las 16:00, de lunes a sábado?* — her hour and days from her last two weeks — with *Sí, recuérdame*, *Otra hora* and a ✕; then *Recordatorio diario* in *Mi cocina*; at her hour on her days, *¿Qué ofreces hoy?* · *Publica tu oferta en un minuto.*, which opens *Tu oferta de hoy*; ***Así la ven*** on each of today's offers and ***Ver como la ven*** beside *Editar tu página* — Itacate's own pages under a dark bar. The privacy page says the reminder (her phone schedules it; nothing of it reaches us). ⚠️ **Two things only your phone can settle**: on the test Android 7 of 9 taps on the reminder opened *Tu oferta de hoy* (the two misses were early, on a test setup), and on Android it can arrive up to an hour late |
| **10.5-v-d** | **Wera Cocina — publishing and her first run**: the card neighbours will see, filling in as she types; *Lo que vale normalmente* required (your word of 6 November); the first run ending on her first offer | ✅ **Done 7 November, afternoon — on Wera Cocina's test builds, your iPhone's included**, sent over the air and seen running on a test Android with that same file (*What is on your phone*). **What a fonda sees:** every dish and bag asks ***Lo que vale normalmente***, and *Publicar* says so when it is empty — so every card in Itacate shows the saving; under the form, ***Así la verán en Itacate***: Itacate's own card, filling in as she types. **Her first run:** the cow opening on the green with *Vende hasta el último plato*, *Crear cuenta* or *Ya tengo cuenta*, *Paso 1 de 3* (name and trade), *Paso 2 de 3* (address), then ***¿Qué ofreces hoy?*** — her first offer or *Después* — and her page as neighbours see it, then *Hoy*. An old offer's *Repetir* opens the form once, to ask its usual price. ⚠️ Wera's own opening may blink the same way Wera Cocina's did before its fixes — a change to Wera is yours to say yes to |
| **10.6a** | **Wera — *Ofrecer* in Merma**: *Tirar* or *Ofrecer*; her products at her price, her shelf price beside it, the half as a hint she can use; until an hour she picks, today or tomorrow (your word of 6 November); no line on the screen saying what may not be offered (your word of 6 November); her yes, once, to the kitchens seeing her shop's name and address | Ruled 6 November. After the MVP's public releases, and after Google's answer on Wera's production access. It takes in the hand relay that was `10.0b`: no offer goes through you. ⚠️ Two things for when it is taken: Wera's opening may blink as Wera Cocina's did (found 7 November) — copying Wera Cocina's two fixes is recommended, yours to say; and your iPhone runs the App Store Wera since about 7 November, so that session puts the test build back on it first (two minutes over Wi‑Fi, your data kept) |
| **10.6b** | **Wera Cocina — *De las tiendas***: a card on *Hoy*, the shops nearest first with their address and *Cómo llegar*, Wera's photo on each product; reserving several products with one code | Ruled 6 November. After `10.6a` and reserving (`10.5b`) |
| **10.6c** | **Wera — the handover**: *Inicio* lists what to have ready; in Vender the code, the products into the ticket at the offer's price, and *Cobrar*, as any sale, with or without signal | Ruled 6 November. After `10.6b` |
| **5P-e** | **The pilot's start list** — what has to be true before a shop that is not yours signs up: backups, the two security fixes, a health check you can run, and getting the app onto each phone | **Behind the four rows of your family-shell rulings since 5 November.** **Needed before a shop that is not yours signs up — not yet** (your question of 4 November, night). Your order of 15 October put this row's experience half in the design review you paused; what a session can do alone is its estimate's to say. ✅ **Your three answers are built (15 October)**: the two doors are closed; an invitation lets someone in straight away only if they signed in with Google or Apple; a copy of the live database is taken on this Mac every night at 03:30 (*The nightly copy*, below). Your phone is measuring. ✅ Google's sign-in is open to everybody (*In production*, your word of 9 November). Left: a health check you can run, the Samsung install note, one page of what to do once a shop is live |
| **5P-f** | **Wera tells you on Discord** — a line in your channel when somebody makes an account or opens a shop | ✅ **Done 22 October** — your channel got a test line that day. The lines name nobody, on purpose. See *Wera's alerts on Discord* below |
| **5R-l** | **A lawyer reads the aviso** | ⏸️ Parked by you on 12 October — after the pilot, when it is a business |
| **8n** | **Rescatado on Inicio** — what Wera paid the shop, beside *Ahorro en compras* | ✅ **Done 17 October, your answer: what Wera paid.** When you mark a pickup *recogida* in the dashboard, type what you paid in the new `wera_paid` cell — see *Handling a Te lo compro request*, below. The shop's owner and manager see it add up, and a coin drops into the jar |

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
| **8 November** | ✅ **Done 9 November** — you applied for production on Google Play, a day late. The answers drafted with you are in `store/google-play.md`, section 7 | — |
| **16 November** | **Google's answer** on Wera's production access — an email, usually within seven days. Tell a session *"Google approved"*, or paste Google's words. Nothing yet? Tell the session that too, and it moves the date a week | Wera stays off Play's public listing; nothing breaks |
| **4 December** | **Delete the photos of businesses that no longer exist** — a session lists them (*Photos of a shop or a kitchen that no longer exists*); if it names one, you run the deletion. Then every 30 days | Both privacy pages promise it within 30 days |
| **30 April 2027** | **Delete the pilot's measurements** on the live database — the aviso promises it. If the pilot runs longer, change the date on the pages and tell the users first | The aviso says something false about people's data |

Every one of them is in the plan's ⏳ DATES OWED block, which turns the checks red once one passes unticked. The 4 October rebuild is gone: your paid account signed the 9 October build for a year.

---

## How a working session goes

One task per session. Paste the prompt, the session does the work and ends with
what is next and what you need to decide. Then clear the conversation and go again.
Clearing is safe because everything that matters lives in files: `docs/PLAN.md`
says where we are, `CLAUDE.md` tells a fresh session the rules, ADR-035 holds the
architecture. Your private notes, `~/RetailerToolDev/wera-vision/`, hold the ecosystem's
strategy and the business; a Step 10 task reads them first.

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

For a task in Step 10 (Wera's pilot version, Cocina, Itacate, the shared backend), read
~/RetailerToolDev/wera-vision/CLAUDE.md first: my private notes, outside this repo. Copy
nothing from them here: no strategy, fees, prices or research, only what the code needs.
If a ruling or a result changes the ecosystem plan, add it to wera-vision's
negocio/decisiones.md, commit and push there, and tell me.

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

### The Standing Prompt — for a review of where we stand

Use it instead of the main prompt when you want to see everything open outside the code before
the next task: what is yours to do, what Apple or Google owes, what a calendar owes — store
submissions, updates, consoles, keys, emails. The session takes no task and changes no code; it
reads the world, asks you what only a console shows, and leaves the plan and this handbook true.

```
Today is a review of where we stand, not a task: take no row from the plan and change no
code. Start with `bash docs/checks/plan-handover.sh`, then check nothing was left behind:
an unmerged PR, a migration merged and never deployed, an update published and never
installed.

Make ONE list of everything open outside the code — what is mine to do, what Apple or
Google owes, what a calendar owes — from the plan's ⛔ DECISIONS OWED and ⏳ DATES OWED, the
newest status entries' "Waiting on him" lines, every row that waits on my hands, and the
handbook's sections that are mine. Group it by app (Wera, Wera Cocina, Itacate), then what
they share (the database, the site, Google Cloud, Apple, Supabase).

Before calling an item open or done, read the thing that runs: EAS's builds and updates for
each app, `5R-f-schema-deployed.sh`, `5R-k-function-deployed.sh`, `5R-d-ii-site-live.sh`.
What only a console shows (Play Console, App Store Connect, Google Cloud), ask me, one
console at a time, and record my answer as mine. I have just done a round of these, so
ask what I did before telling me what is left.

For each item say: done (and what showed it), mine (and how long it takes), waiting on
someone else (and since when), or no longer needed (and why). Put the list on one page I
can read on my phone, what blocks the most first.

Then bring the plan and the handbook into line with what we found, in one PR, and tell me
which claims you fixed. End with what is mine now, in order, with one recommendation, and
the next task and whether it is gated.
```

### The Review Prompt — for your design review (`8g`)

Use it instead of the main prompt for the design review. It opens with a brainstorm in which
the session interviews you about how Wera should look, move and feel, with pictures to react
to, and only then decides with you where to start: a screen, a set of motifs or geometries, or
the animations. Clear context between days, not between rounds.

```
We are doing 8g, the design review, together and live. Before anything, read docs/PLAN.md's
## Position and the 8g row, run bash docs/checks/plan-handover.sh, and check nothing was left
behind (an unmerged PR, a migration merged and not deployed).

Start by grilling me. Interview me about how I want Wera to look, move and feel: one question
at a time, each with your recommendation and the reason, and keep going until we share a
clear picture of who it is for and how it should feel at a counter; its visual language
(motifs, geometries, colour, type, density); how things move (transitions, feedback,
animations); and what to keep from today. Show, don't only ask: use whichever visual tools
fit the question (a claude.ai canvas with options side by side that I can mark up, motion
studies I can play, real screenshots of today's screens from the simulator or the emulator
against a local test shop). Don't change the app until we have agreed where to start and
why.

Then work in rounds: change, put it on my iPhone (PR, CI read by name, merge, then
docs/runbooks/ship-an-update.sh preview), check Android on the emulator, and record each
ruling in the plan's status log. Stay in JavaScript: a new build, a migration, or a change
to who may see or do what is mine to decide first.

End each sitting with: what we decided, what changed and the check that looked at it, what
to look at on my phone, what you decided on my behalf, and what is next.
```

### The First-Day Prompt — for the first day (`8g`)

Use it for the first day: how a person goes from installing Wera to her first sale, as easy
and quick as possible — whether she opens a shop or joins one. The session walks today's first
day itself before proposing anything, then interviews you, then builds in rounds.

```
We are doing 8g's first day together and live: how a person goes from installing Wera to her
first sale, as easy and quick as possible — the owner who opens a shop and the person who joins
one. Before anything, read docs/PLAN.md's ## Position (the entry that set up the first day says
where it stands and what earlier rulings already fix), the 8g row, run
bash docs/checks/plan-handover.sh, and check nothing was left behind (an unmerged PR, a
migration merged and not deployed).

First, walk today's first day yourself on the Android emulator (and the iPhone simulator if it
builds) against the local test shop with a brand-new account, every screen captured and every
tap and field counted, for each path: an owner opening a shop; a cashier joining with the
shop's code; someone invited by email; Google or Apple instead of email; a phone with no signal
at the start. Show me that on one page I can mark up.

Then interview me, one question at a time, each with your recommendation and the reason: what
comes first (the account or the shop), what to ask now and what to ask later or never, how
someone joining finds her way, and what we can drop. Show options side by side with real
screens or drawings I can react to. Don't change the app until we have agreed the path.

Then work in rounds: change, put it on my iPhone (PR, CI read by name, merge, then
docs/runbooks/ship-an-update.sh preview), check Android on the emulator, and record each
ruling in the plan's status log. Stay in JavaScript: a new build, a migration, anything the
seed or onboard_workspace bakes in, or a change to who may join a shop or see what is mine to
decide first.

End each sitting with: what we decided, what changed and the check that looked at it, what to
look at on my phone, what you decided on my behalf, and what is next.
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
and **write-offs** (Merma) were recorded that day. It counts records, not pesos. Swap
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

## The nightly copy

Until the pilot starts, the live database is copied onto this Mac every night at 03:30, your
ruling of 15 October: every table, into `~/RetailerToolDev/wera-backups/`, one folder per
night, seven nights kept. Supabase's free plan keeps no backups at all. **The day before the
first real shop signs up, move the project to Supabase Pro** (dashboard → *Billing*): it is the
same database upgraded, not moved, and the app does not change.

- **Did it run?** `~/RetailerToolDev/wera-backups/nightly-copy.log` ends with *22 tables, 0
  failed* for each night. The Mac has to be on and awake at 03:30; a night it was asleep is
  simply missing.
- **One now, by hand:** `bash docs/runbooks/nightly-copy.sh` from the repository folder.
- ⚠️ **It is a copy of the shops' records, not of the logins.** If it is ever needed, a
  session puts the rows back by hand and everybody signs in again.

---

## Wera's alerts on Discord

Your Discord server gets one line each time:

- somebody makes an account — *👤 Nueva cuenta (con Google). Ya son 15 cuentas.*
  (*con correo*, *con Google* or *con Apple*: how they signed up);
- somebody opens a shop — *🏪 Nueva tienda en Wera. Ya son 4 tiendas.*
- somebody opens a kitchen in Wera Cocina — *🍲 Nueva cocina en Wera Cocina. Ya son 2 cocinas.*
  (since 29 October; shops and kitchens are counted apart). Since 3 November the account line
  names no app: one login opens Wera, Wera Cocina and Itacate, and the database cannot tell which
  app made it.

**The lines never name the person or the shop.** Your privacy notice does not list Discord as
receiving anyone's data, so a name in a line would mean changing the notice first. To see who it
was, open the Supabase dashboard → *Authentication* → *Users* (newest first), or run
*Seeing how much each shop uses Wera*. Your own test accounts and the store reviewers' count too.

- **Move the alerts to another channel, or after deleting the webhook:** in Discord, the
  channel's ⚙️ → *Integrations* → *Webhooks* → *New Webhook* → *Copy Webhook URL*. Then, from the
  repository folder: `bash docs/runbooks/set-discord-webhook.sh` and paste it. It sends a test
  line and tells you whether Discord took it.
- **Stop them:** delete the webhook in Discord. Nothing in Wera notices.
- **A line never holds up a signup.** If Discord is down or the webhook is gone, the account
  is made anyway; you only miss the line.

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

**From Wera Cocina too** (since 31 October): the same link opens the same chat, and its message
says *Wera Cocina*. It is the same login as Wera, so the same script resets it — for both apps at
once.

---

## Handling a Te lo compro request

⚠️ **Paused since 27 October** (`10.0a`): no shop can make a request or see its own. The seven
already made stay in the table — all yours, from testing (your word, 27 October), so nothing waits
on them — and the steps below still work.

A request arrives as *enviada*, usually with a WhatsApp from the shop. Everything after that is
yours, in the Supabase dashboard: *supabase.com/dashboard → your project → Table Editor →
`collection_request`*, then the request's row.

1. **You will go:** set `status` to `confirmada`. From then on the shop can no longer cancel it.
2. **You will not take it:** set `status` to `rechazada`.
3. **You picked it up:** set `status` to `recogida`, and type **what you paid** in `wera_paid`, in
   pesos (`180`, or `95.50`). Leave it empty if you paid nothing. Either cell can go first.
   That amount is what *Rescatado* adds up on the shop's Inicio (its owner and manager see it),
   and a coin drops into the jar the next time they look. A negative amount is refused.

The shop can cancel only while it is *enviada*.

## If somebody asks to delete their account

Most people do it themselves: in Wera, *Inicio → Ajustes → Tu cuenta → Eliminar mi cuenta*; in
Wera Cocina, *Eliminar mi cuenta* at the foot of her kitchen's screen. The pages at
`tu-wera.com/eliminar-cuenta` (Wera's) and `tu-wera.com/eliminar-cuenta/cocina` (Wera Cocina's)
also offer email, because Google requires a way that does not need the app. **Act only on a
request sent from the account's own address**; if it comes from another one, ask the person to
prove who they are first.

From the repository folder on the Mac:

```
bash docs/runbooks/delete-an-account.sh their@email.com
```

It does exactly what the apps' button does — and one login serves Wera and Wera Cocina, so the
account goes from both. Their login goes, and a shop keeps their name as *(ex-miembro)*. **If they
are the only owner of a shop or a kitchen, it stops and lists each one** — *shop:* and *kitchen:*,
because deleting them deletes those too — **and prints the line to run again, with one `--shop`
for each name**. Write back, make sure they understand, then paste that line. It changes nothing
when the email has no account or a name is wrong. To try it safely first, add `--local`. Then
reply that it is done; the pages promise an answer within 20 business days.

**If they signed in with Apple and hid their email**, their account is under an address Apple
invented, not the one they write from, so the script finds nothing. Ask them for the shop's
name and tell a session: it can find the account's address, and you run the script with that.
⚠️ The script does not tell Apple, which only the app can do. In your reply, add: *"Para que
Wera deje de aparecer en tu cuenta de Apple: en tu iPhone, Configuración → tu nombre → Iniciar
sesión con Apple → Wera → Eliminar."*

### If somebody asks to delete only their kitchen

Since 4 November a fonda can delete her kitchen and keep her account: in Wera Cocina, *Eliminar
esta cocina* at the foot of her kitchen's screen, or by email — Wera Cocina's deletion page says
so (`tu-wera.com/eliminar-cuenta/cocina`, *Eliminar solo tu cocina*). The same rule: **act only
on a request from the account's own address.** From the repository folder on the Mac:

```
bash docs/runbooks/delete-a-kitchen.sh their@email.com
```

It lists every kitchen they alone own and prints the line to run for each — **paste the line
for the kitchen they named.** It does exactly what the app's button does: the kitchen goes with
its address, its page and everything it published; their account, their name and any shop or
other kitchen of theirs stay. ⚠️ It is a different script on purpose: `delete-an-account.sh`
deletes the login, and this one never can — it reads the account back afterwards and says so.
It refuses a shop's name (a shop goes only with its owner's account) and changes nothing when
the email has no account or the name is wrong. `--local` to try it first. Within 30 days, run
`delete-orphan-photos.sh` (*Photos of a shop or a kitchen that no longer exists*), then reply
that it is done.

---

## Putting tu-wera.com up

✅ **Done on 12 and 13 October, and kept as the record.** ✅ Step 7 too: Google's sign-in is
*In production* (your word, 9 November). Still yours: pressing *Verify* in step 2 — a session
cannot see whether it was pressed.

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

✅ **Read 9 November: steps 1, 2, 3 and 5 are done** — the function holds the key, Supabase's switch
is on with all three apps, and your iPhone build carried it; Apple approved Wera with the button.
**Left: step 4, only if an account made before 14 October is not yours, and step 6.** Kept as the record:

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

## Before the two new apps' first builds

Wera Cocina and Itacate (`10.2b`) need two things only your accounts can make, and both go
**inside each app's first store build**, so they come first: **a map key** — Google draws the map
on an Android phone only with one (an iPhone uses Apple's map, which needs none) — and
**Firebase's file**, without which an Android phone never receives a notification from the app.
About half an hour, all in the browser. It should cost nothing: Google's maps inside a phone app
are free and unlimited, but Google wants a card on file before it gives out the key.

⚠️ I have not seen these consoles: the names below are from Google's and Expo's help pages, and a
label may read a little differently.

1. **Billing, in Google Cloud.** console.cloud.google.com → the project with Wera's sign-in (step 7
   of *Putting tu-wera.com up*) → *Billing* → link a billing account, with your card.
2. **The map, switched on.** Same project → *APIs & Services → Library* → **Maps SDK for
   Android** → *Enable*.
3. **The key.** *APIs & Services → Credentials → Create credentials → API key*. Open it, name it
   `Mapa Android — Cocina e Itacate`, and under *API restrictions* choose *Restrict key* and tick
   only **Maps SDK for Android** → *Save*. Leave *Application restrictions* alone: the session adds
   the two apps once Google Play shows their signing fingerprints. One key serves both apps.
4. **Firebase, on the same project.** console.firebase.google.com → *Add project* → choose **the
   same Google Cloud project**, not a new one → Google Analytics **off**. Then *Add app → Android*
   twice: package `mx.wera.cocina`, then `mx.wera.vecino` (skip every step about the SDK).
   Download `google-services.json` **after adding the second** — that copy holds both apps. Keep
   it outside the repository, for example in `~/RetailerToolDev/wera-keys/`; never paste it into a
   chat or a commit.
5. **Both values into Expo.** expo.dev → the organization **wera-app** → *Settings → Environment
   variables* → *Add*, twice:
   - `GOOGLE_MAPS_ANDROID_API_KEY` — the key; visibility *Sensitive*; environments *preview* and
     *production*.
   - `GOOGLE_SERVICES_JSON` — type *File*, upload `google-services.json`; visibility *Sensitive*;
     environments *preview* and *production*.
   Variables of the organization reach every project in it, so the two new apps get them the
   moment they exist. Wera ignores them.
6. **The two apps' projects in Expo.** The session was not allowed to create them in your account.
   Paste these two lines into the conversation (each takes a few seconds):
   ```
   ! cd cocina && npx eas-cli init --account wera-app --non-interactive --force --no-icon
   ! cd itacate && npx eas-cli init --account wera-app --non-interactive --force --no-icon
   ```
   Each creates the app's project under **wera-app** and writes its id into the app's settings,
   which shows as a changed file; the session commits it.
7. **Tell a session.** It checks each step, builds both apps, and walks you through Play Console.

✅ **Steps 1 to 6 were done on 27 October**, and checked that night: the Firebase file lists both
apps, Expo holds both values in both environments (the Firebase one as a file), and the two
projects are `@wera-app/cocina` and `@wera-app/itacate`.

**Then Play Console, once per app** — everything to paste is in
[`store/cocina-itacate.md`](../store/cocina-itacate.md), and the pictures beside it in
`store/cocina-itacate/`:

8. **Create app** (section 1), then *Dashboard → Set up your app*: the listing, the store settings
   and every *App content* form (sections 2 to 4). The privacy link is
   `https://tu-wera.com/privacidad/cocina-e-itacate/`, a page made for these two test versions.
9. **Closed testing → Create new release** and upload that app's `.aab`, which the session puts in
   `~/RetailerToolDev/wera-builds/`. ⚠️ **This makes its id permanent** — `mx.wera.cocina` or
   `mx.wera.vecino`, as you ruled. Accept *Play App Signing*; countries **Mexico**; testers the same
   list as Wera's; then *Send for review*.
10. **App integrity → App signing**: copy the **SHA-1** shown there into the conversation. It is
    not a secret. Then lock the map key to the two apps: Google Cloud → *Credentials* → the key →
    *Application restrictions* → **Android apps** → add four items, each app's package with two
    fingerprints — the one Play just showed, and the one Expo signs the test builds with:
    `mx.wera.cocina` with `4C:38:47:6F:5A:81:5C:5F:D5:7C:65:9F:17:B3:33:1E:CD:77:F1:D0`; `mx.wera.vecino` with `86:EC:1B:C6:D2:B2:69:83:F4:53:4D:F8:71:38:63:9A:A2:21:E2:2F`
    (read off the test builds on 27 October). → *Save*. A session then checks the map still draws. ✅ **Done 28 October** with Play's own two — Cocina `D6:0D:F0:9E:62:2A:12:F8:1B:69:C4:BA:67:0F:35:0A:13:85:C2:C0`, Itacate `E1:D7:F8:DD:1E:86:97:8A:56:9D:1F:74:60:99:DF:AE:35:48:F0:73` — and tried both ways on the emulator.
11. **When Google approves each release**, send the twelve testers that app's link, as you did for
    Wera. If Play asks for twelve testers again for each app — Google does not say, and creating
    the first one shows it — the same people can join each, and each app's 14 days start when
    they do. Tell a session the day the twelfth joins each one: that date goes into the plan.

---

## Before Wera Cocina reaches your testers

Your twelve testers have Wera Cocina's first build from Play — the map and nothing else. **Version 5,
built on 3 November (`10.4g-ii`), brings them everything since** — signing in, the kitchen with its
address, publishing, and Google's map and search — as a new store version, not an update.
**Six things are true before it: 1, 4, 5 and 6 are done; 2 and 3 are yours, in one sitting after `10.5b`** — your
ruling of 9 November: testers are asked once both apps do what we agreed, and `10.5b` changes the privacy forms again
(plans `10.4b-iv-b`,
`10.4d-i`, `10.4g-ii` and `10.5-iv-a-i`):

1. ✅ **The privacy page says what Wera Cocina holds** — published when `10.4b-iv-b` merged, with
   Wera Cocina's own deletion page; since 3 November it says her point on the map is kept only if she sets one,
   and since 4 November her page in Itacate and her photos (`10.5-ii`), what neighbours will see, and — that
   night — that the point where Google places her address is kept up to 30 days (`10.5-i-b-ii`).
2. **A demo account for Google's reviewers**, which must keep working. On a phone with Wera
   Cocina's test build: *Crear cuenta* with an email you control that is not your own (a new Gmail
   works) and a password you keep; register a kitchen — **Cocina Demo**, any trade, any address in
   the city; no point on the map is needed since 3 November. Keep both, and never delete the account.
   Not Wera's demo account: that one owns a shop.
3. **Play Console → Wera Cocina**, pasting from
   [`store/cocina-itacate.md`](../store/cocina-itacate.md): *App content → Data safety* (section 4,
   *Data safety — Wera Cocina*, with the delete link `https://tu-wera.com/eliminar-cuenta/cocina/` —
   ⚠️ since 4 November **eleven** types: *Photos* added (`10.5-ii`), answered *Users can choose*, and the
   other ten *required* — ⚠️ **since 4 November, night, *Precise location* too** (`10.5-i-b-ii`: every kitchen
   now keeps a point, hers or Google's for her address; it was *Users can choose*, so change it if that is
   what you pasted));
   *App content → App access* — Play may call it *Sign-in details* — with the demo account and the
   English line; and *Main store listing → Full description* (section 2: the old one says it shows
   only a map) — ⚠️ **since 6 November (`10.5-v-a`) both apps' descriptions open on their line and say no word of
   leftovers, and the *App access* note names *Publicar una oferta*: paste Itacate's description too**. ⚠️ **Since 5 November (`10.5-iv-a-i`), also *App content → Content rating***: two answers
   change for Wera Cocina — *Users interact or exchange content with other users* **Yes**, and *Shares the user's
   location with others* **Yes** — because Itacate now shows each kitchen, its address and what it publishes
   (section 3 there). Then send the changes for review (*Publishing overview*).
4. ✅ **Done by your word of 6 November** — *"The privacy email: reading it is enough. The only accounts are my own tests."* Nothing to send: anyone who signs up from now on reads the privacy page as it stands. Kept for the record:
   **The privacy page's email — one, for both apps' accounts** (since 5 November: `10.5-ii`, `10.5-i-b-ii` and `10.5-iv-a-i`;
   it replaces the text of 4 November and covers it): the privacy page's section 11 promises every account an email before a
   change about what is used applies, and its section 4 one before Itacate shows a kitchen — since `10.4g-i` Google receives,
   on both phones, what a fonda types while she looks for her address, her address to show it on the map, and the point under
   the pin while she sets one; since `10.5-ii` the app takes photos, which neighbours see; since `10.5-i-b-ii` the point where
   Google places her address is kept up to 30 days; and **since `10.5-iv-a-i` Itacate shows each kitchen to the neighbours who
   sign in to it**, and asks a neighbour for her location (used on her phone alone) or her postal code (asked of Google). Today
   the only accounts are yours — the three kitchens on the live database are your tests (read 5 November) — so send it to them
   (or tell a session it is enough that you read it here). **Before a photo or a kitchen reaches anyone but you**: before Wera
   Cocina's version 5 reaches your testers, and before Itacate's first `production` update. The text, from the address you use
   for Wera:
   > **Asunto:** Cambió el aviso de privacidad de Wera Cocina e Itacate
   >
   > Hola: actualizamos el aviso de privacidad de Wera Cocina e Itacate (tu-wera.com/privacidad/cocina-e-itacate).
   > Desde la próxima versión de las apps:
   >
   > **Google.** Wera Cocina usa los servicios de Google en Android y en iPhone. El mapa es de Google.
   > Mientras escribes tu dirección, le enviamos a Google lo que escribes para sugerirte direcciones; si
   > eliges una, con ella llenamos tu dirección, que puedes corregir. Para mostrar tu cocina en el mapa, le
   > preguntamos a Google por tu dirección y guardamos, hasta 30 días, el punto donde la ubica y, si elegiste
   > una sugerencia, el identificador de ese lugar; una vez por semana, mientras usas la app, se lo volvemos a
   > preguntar y guardamos la respuesta nueva en lugar de la anterior. De lo que Google responde no guardamos
   > nada más. El punto exacto en el mapa es opcional: si lo pones, se usa el tuyo, y cuando dejas de mover el
   > mapa le enviamos a Google el punto que queda bajo el pin, para avisarte si está en otra calle. Guardamos tu
   > dirección como la dejas y, solo si lo pones, el punto donde dejas el pin; si después cambias tu dirección,
   > el punto de Google se borra, y si cambias la calle o el número, también el tuyo. Google lo trata según su
   > propio aviso, y el uso de Google Maps en la app se rige por nuestros términos de uso
   > (tu-wera.com/terminos/cocina-e-itacate). Ya no usamos LocationIQ ni la búsqueda de Apple.
   >
   > **Tu página en Itacate y tus fotos.** Puedes armar la página que verán los vecinos en Itacate: una foto de
   > portada, tu color, una frase, tu logo y tu enlace de Google Maps, y una foto de cada platillo que
   > publiques. Todo es opcional. La app te pide la cámara solo cuando tocas *Tomar foto*, y de tus fotos solo
   > recibe la que eliges; antes de subirlas les quita los datos de dónde y cuándo se tomaron. Se guardan en un
   > almacén privado. Si eliminas tu cocina, sus fotos dejan de estar al alcance de nadie en ese momento y las
   > borramos en un máximo de 30 días.
   >
   > **Lo que ven los vecinos en Itacate.** Itacate, la app de Wera para vecinos, muestra las cocinas que tienen
   > algo publicado, de la más cercana a la más lejana. De tu cocina, los vecinos que entran con su cuenta pueden
   > ver tu página, el nombre de tu cocina, su giro, tu dirección y dónde queda en el mapa —tu propio punto, si lo
   > pusiste, o el punto donde Google ubica tu dirección—, qué tan lejos les queda, lo que publicas mientras está
   > en oferta, con la foto de cada platillo, y tu cocina durante los 14 días que siguen a cada publicación, con
   > cuándo y qué sueles publicar. Si pasan 14 días sin que publiques, tu cocina deja de aparecer.
   >
   > **Si usas Itacate.** Te pide tu ubicación solo mientras tienes la app abierta, y la usa solo en tu teléfono
   > para ordenar las cocinas por cercanía: no nos llega. Si no se la das, puedes escribir tu código postal, y tu
   > teléfono le pregunta a Google dónde está. Para decirte qué tan lejos te queda una cocina sin punto en el mapa,
   > tu teléfono le pregunta a Google por la dirección de esa cocina.
   >
   > Si tienes dudas, escríbenos a privacidad@tu-wera.com. — Wera
5. ✅ **Done by you on 6 November** (both store versions — *When the stores approve Wera*, step 1). Kept for the record:
   **Your command for Android's store version of Wera** — ⚠️ **it now carries two changes, not one**:
   Wera reading the shop open in it alone (29 October), and a price set with or without signal (`8i`,
   1 November), because an update carries everything merged into Wera since the last one. So run it
   after your look at *Vender → a price with no signal* (*What only you can judge*). A session's is
   refused:
   ```
   ! bash docs/runbooks/ship-an-update.sh production "Wera lee solo la tienda abierta, y un precio con o sin señal" --only android
   ```

6. ✅ **Done by you on 9 November** — and asked again the same day as each app: Google answers Wera Cocina and
   Itacate, test builds and store versions alike, and still refuses any other app. Kept for the record:
   **Let Google's Android key answer the search — found on 5 November (`10.5-iv-a-i`).** Asked from this Mac exactly as
   each app asks, **Google's Android key refuses Places and Geocoding — for Wera Cocina and for Itacate**. It gets past the
   app check (with a wrong signature Google answers *API_KEY_ANDROID_APP_BLOCKED*; with each app's own, *API_KEY_SERVICE_BLOCKED*
   — the key's list of services) and then says it may not use those two. The iPhone key answers both apps, which is why your
   iPhone's search works. So **on Android, Wera Cocina's address search has never worked** — and your testers' version 5 is
   Android — and Itacate cannot place a kitchen with no point or a postal code. Step 2 of *Google's search for Wera Cocina*
   (3 November) is not in effect. Two minutes: console.cloud.google.com → *APIs & Services → Credentials* → **Mapa Android —
   Cocina e Itacate** → *API restrictions* → tick **Places API (New)** and **Geocoding API**, keeping **Maps SDK for Android** →
   *Save* (Google may take a few minutes). Leave *Application restrictions* as they are. Then tell a session: it asks Google
   again the same way and records the answer. No new build and no update: the apps already send the key.

**Then version 5 reaches your testers** — after `10.5b` (your ruling of 9 November); the session that takes it says
whether version 5 is still the file. Play Console → **Wera Cocina** → *Closed testing* → its track →
**Create new release** → upload `~/RetailerToolDev/wera-builds/cocina-1.0.0-5-produccion-google.aab` →
the release notes from [`store/cocina-itacate.md`](../store/cocina-itacate.md), section 6 → *Next* →
*Save* → send it for review (*Publishing overview*). No update could bring it instead: the version
your testers have was built before three changes inside the app — Wera Cocina's own search piece
(`10.4d-i`), its icon and launch screen (`10.4d-ii`) and Google's map settings (`10.4g-i`) — so the
update command refuses (*this update would reach no phone*) until they install version 5, and with it
they get everything at once. **My recommendation:** send it after your look at *Wera Cocina → address
first* on your iPhone — your test build runs the same code as version 5 — so your testers never meet
something you would have caught first. Once they have it, later updates go the usual way — your command:
```
! bash docs/runbooks/ship-an-update.sh production "…" --app cocina --only android
```
⚠️ **Never send version 4** (`cocina-1.0.0-4-produccion-verde.aab`, `10.4d-ii`): it searched with the
phone's own geocoder, which Google's replaced. **The iPhone's store version** (build 4,
`cocina-1.0.0-4-produccion-google.ipa`) waits for its App Store record (`10.5b`); its privacy answers
are written ([`store/cocina-itacate.md`](../store/cocina-itacate.md), section 7).

---

## Photos of a shop or a kitchen that no longer exists

Both privacy pages promise it: when a shop or a kitchen is deleted, its photos stop being visible at
once, and **we delete them by hand within 30 days**. The database cannot delete a photo by itself, so
`10.5-ii` wrote the hand: `bash docs/runbooks/delete-orphan-photos.sh` lists every photo whose shop or
kitchen is gone (it deletes nothing), and with `--delete` it deletes them. A session can run the list;
deleting is a write to the shop, so it is yours:
```
! bash docs/runbooks/delete-orphan-photos.sh --delete
```
The plan's dated obligations hold it every 30 days (first: 4 December). On 4 November it found 4 photos,
none of a deleted business. If you would rather nothing ever depend on remembering it, a database change
could delete a business's photos the moment it is deleted — ask a session to draw it for you.

## Itacate's sign-in

✅ **Done 4 November** — you ran it (*both settings hold*), a session read both back with `--check`, and the
update went out the same morning. Kept as the record.

Itacate's sign-in (`10.5-iii-a`) needs two settings outside the code, and a session is not allowed to
make either — so they are **one command of yours**, which changes nothing else and prints no secret:
```
! bash docs/runbooks/set-itacate-sign-in.sh
```
1. **Itacate's Expo project gets the three values its sign-in reads** — the database's address and key,
   and your WhatsApp number for *¿Olvidaste tu contraseña?* — copied from Wera Cocina's project. Without
   them nothing can be sent to Itacate's phones.
2. **Supabase's sign-in settings learn Itacate**, beside Wera and Wera Cocina: without it *Continuar con
   Apple* is refused, and *Continuar con Google* opens Google and never comes back. Everything already
   there stays.

It ends with *both settings hold*. Then tell a session: it sends the update to Itacate's test build and
watches it arrive. Since `10.5-iii-b` *Eliminar mi cuenta* is in Itacate too, so the store version — the
one your closed testers have — may get both, when you choose: *Itacate's way out*, next.

## Itacate's way out

*Eliminar mi cuenta* is in Itacate since `10.5-iii-b` (4 November): a neighbour who owns nothing just
confirms; whoever alone owns a kitchen or a shop types each one's name, as in Wera Cocina. Nothing here
blocks anything; each step is yours because it needs your accounts.

**A. Before Itacate's first iPhone build — Apple's portal, once.** So that deleting an account made with
Apple tells Apple, as Wera Cocina does since you grouped it on 30 October: developer.apple.com/account →
*Certificates, IDs & Profiles* → *Identifiers* → `mx.wera.vecino` → *Sign In with Apple* → *Edit* →
*Group with an existing primary App ID* → `mx.wera.app` → *Save*. If `mx.wera.vecino` is not in the list
yet, Itacate's first iPhone build makes it; do this then. Until it is done, a deletion from an iPhone
still deletes the account — Apple just isn't told, and Wera stays listed in that person's Apple settings.

**B. When you want your closed testers' Itacate to have the sign-in and the way out** — ✅ **your ruling of 9 November:
after `10.5b`, with Wera Cocina's Play steps, in one sitting.** Four steps, in
this order. ⚠️ **Since 5 November (`10.5-iv-a-i`) Itacate shows the kitchens near you**, and Play's form changed with it
(*Data safety — Itacate*: one more type, *Approximate location*; and the content rating) — nothing changes it again before
the map (`10.5-iv-b`). I recommend doing these four after your look at the list on your Android (*What only you can judge*)
and after the privacy page's email (*Before Wera Cocina reaches your testers*, item 4): the list shows your testers the
kitchens on the live database.

1. **The three values for the store version**, the same command as before; it adds only what is missing
   and prints no secret:
   ```
   ! bash docs/runbooks/set-itacate-sign-in.sh
   ```
   It ends with *both settings hold*.
2. **Itacate's demo account for Google's reviewers**: on your Android test build of Itacate, *Crear
   cuenta* with an email of yours that has no shop or kitchen (a new Gmail, or `you+itacate@gmail.com`),
   and a password. ⚠️ Not your own login and not Wera Cocina's demo account: in Itacate, *Eliminar mi
   cuenta* would name their businesses, and a reviewer who deleted it would end that app's way in too.
3. **Play Console → Itacate → App content**: *App access* and *Data safety*, pasted from
   [`store/cocina-itacate.md`](../store/cocina-itacate.md) (*App access — Sign-in details*, Itacate's
   part, with the demo account's email and password, and *Data safety — Itacate*). *Save*; Play may
   review it.
4. **The update to your testers** — yours, as for Wera Cocina:
   ```
   ! bash docs/runbooks/ship-an-update.sh production "Itacate: entra con tu cuenta y elimínala si quieres (10.5-iii-b)" --app itacate
   ```

## A written question to Google, before Itacate's map

✅ **Sent by you on 5 November, evening.** ✅ **And on 6 November you ruled the clause yourself**: read as its heading says, and
Itacate's map built as you chose it (C, `10.5-iv-b`) without waiting for the reply. When Google answers, paste its reply to a
session: if it refuses something, what changes is yours to rule then; the 1.5 and 3 km limits on the list wait for it. What
follows is how it was sent, kept for the record.

For `10.5-iv-b` (Itacate's map) — your word of 4 November, night: before Itacate draws kitchens on Google's map, ask Google
in writing how it reads its *listings or directory* clause, and the two other things the plan's decisions block names.
Itacate's list (`10.5-iv-a-i`) goes ahead meanwhile; the map waits for the answer. **Your hands, in English, about ten
minutes:**

1. **console.cloud.google.com/google/maps-apis/support** (*Google Maps Platform → Support*), signed in with the account that
   owns the project with the map keys. In the top bar, pick that project.
2. **Create case** → an issue type that is not billing (a technical or general question) → the lowest priority (*Low impact
   — service fully usable*).
3. **Subject:** `Terms question: our own registered kitchens on a Google map — caching, drawing and distance`
4. **Description:** the text below, as it is. *Submit*. If a screen offers Email or Chat, pick Email. Keep the case number
   and the emails.
5. **Tell a session what comes back** (paste it): it goes into the plan's decisions block, beside your ruling on the clause.

⚠️ Standard support is free with the billing account and answers within about a day on weekdays, in English only (Google's
*Google Maps Platform Support* page, read 4 November). ⚠️ **Google's own FAQ says its engineers *"are not qualified to offer
legal advice"***, so the answer may be *ask your own counsel* — an answer too, and the decisions block's recommendation
stands without it. A support reply does not change the terms (only an amendment signed by both does), but it is the written
record your word asked for. If the form refuses the text's length (3,457 characters), a session shortens it; if the form
itself fails, Google's web form, support.google.com/cloud/contact/maps_technical_support, takes 1,000 characters per box.

```
Hello,

I build two apps for Mexico City on Google Maps Platform, in this project:
- Wera Cocina, for small kitchens (fondas) that sell their unsold meals. Each kitchen registers with us and types its own business address; Places Autocomplete (New), Place Details (Essentials) and the Geocoding API help her find it, on Google's map (Maps SDK for Android and iOS).
- Itacate, for neighbours, who see the kitchens near them, reserve a meal and collect it in person.

What we do today:
1. For each kitchen we store the latitude/longitude Google returns for that kitchen's own address, with the Place ID when she picked a suggestion, and nothing else from the response. It is a temporary copy: refreshed from the kitchen owner's phone at most once a week while she uses the app, and deleted by a nightly job before it is 30 days old. If she sets her own point on the map, we use hers instead.
2. Itacate shows a neighbour a list, with no map, of the kitchens with something on offer: the straight-line distance from her to each kitchen, computed on her phone (her location never leaves her phone). The list is ordered on her phone: by default what she can pick up now comes first, nearest first within that; she can also sort it by distance alone or by price. A kitchen's position is its own point, else the stored copy from (1), else her phone geocodes the kitchen's address for her alone, kept only while the app is open. A neighbour who does not share her location types her postal code, and her phone geocodes it.

What we plan: draw each kitchen as a marker on a Google map in Itacate (Maps SDK for Android and iOS), at the same point, so neighbours can browse the kitchens across the city, with the list from (2) sliding over the map.

None of the kitchens comes from Google: each is a business that registered with us and gave us its own address. We import nothing about places from Google (no names, ratings, photos or opening hours) and show no Google listings or ads.

Our questions, under the Terms of Service and Service Specific Terms in force today:

Q1. Section 3.2.3(d)(iii) of the Terms prohibits using the Core Services "in a listings or directory service". Is a marketplace of our own registered kitchens, each drawn on a Google map at the point Google geocodes for its own address, a "listings or directory service" in that sense? If it is, is the list in (2), which shows no map, one as well?

Q2. Service Specific Terms 14.3 (Places API) and 6.3.1 (Geocoding API) allow caching latitude/longitude values for up to 30 consecutive calendar days. Does that allow (1), keeping on our server the point for each kitchen's own address for less than 30 days, and sending that cached point to other end users (the neighbours) to draw the kitchen's marker on a Google map and to compute its distance?

Q3. Section 3.2.3(c)(iv) prohibits using latitude/longitude values from the Places API "as an input for point-in-polygon analysis". Does computing on the neighbour's phone the distance from her to each kitchen's point, and ordering the list by it, fall under that prohibition? Would hiding the kitchens more than 1.5 km or 3 km away from her fall under it?

Q4. Is the neighbour's own lookup in (2), her phone geocoding a kitchen's address or the postal code she typed, for her alone, not stored after the app closes and shown in a list with no map, permitted?

We would be grateful for a written answer we can keep with our records.

Thank you.
```

## Google's search for Wera Cocina

✅ **Done 3 November, for `10.4g-i`** — steps 1–5 by you (your word), step 6 by a session the same day: you pasted the iPhone key into the conversation, so it went into Expo from there, and its lock was tried — Google answers it for Wera Cocina and Itacate and refuses it for any other app. Kept as the record. ⚠️ **Measured 5 November (`10.5-iv-a-i`): step 2 is not in effect** — the Android key refuses Places and
Geocoding for both apps, so Wera Cocina's search has never worked on Android (*Before Wera Cocina reaches your testers*,
item 6, has the fix). ✅ **In effect since 9 November** — you ticked the two services, and Google answers both apps on
Android. Your ruling: Wera Cocina on
Google on both phones. Everything is inside the free amounts Google gives each month; the alert and the limits are there so it
can never cost money by surprise. ⚠️ I have not seen these consoles: a label may read a little differently.

**In Google Cloud** (console.cloud.google.com, the same project as Android's map key and Wera's sign-in):

1. **Switch on three services.** *APIs & Services → Library*, search each one and press *Enable*: **Places API (New)** (not the
   one called just "Places API"), **Geocoding API**, **Maps SDK for iOS**.
2. **Let the Android key use two of them.** *APIs & Services → Credentials* → open **Mapa Android — Cocina e Itacate** → under
   *API restrictions* also tick **Places API (New)** and **Geocoding API** (keep Maps SDK for Android) → *Save*. Leave
   *Application restrictions* as they are.
3. **Make the iPhone key.** Same page → *Create credentials → API key* → open it: name **Mapa iPhone — Cocina e Itacate**;
   *Application restrictions* **iOS apps**, adding `mx.wera.cocina` and `mx.wera.vecino`; *API restrictions* → *Restrict key* →
   **Maps SDK for iOS**, **Places API (New)**, **Geocoding API** → *Save*, and copy the key.
4. **The alert.** *Billing → Budgets & alerts → Create budget* → **Alerts only** (not *Spend cap enforcement*: it covers only
   Gemini and Cloud Run) → name **Mapas** → *Next*; leave *Scope* as it comes, every *Savings* box ticked (so Google's free
   amounts don't count as spending) → amount **US$1** (or MXN 20 if it shows pesos) → keep the thresholds and *Email alerts to
   billing admins and users* → *Finish*.
5. **The limits** — worth doing: the iPhone key ships inside the app, and a limit is the only thing that stops spending.
   *Google Maps Platform → Quotas*: **Geocoding API**, *Requests per day* **300** and *per minute* **60**; **Places API (New)**
   has a row per kind of request — *Autocomplete* and *GetPlace* **60** a minute each, and any row that says *per day* **300**.
   At 300 a day no service can pass its free amount in a month (31 × 300 = 9,300); the pilot uses about 10–25 a day.

**In Expo** (expo.dev → **wera-app** → *Settings → Environment variables → Add*):

6. ✅ **`GOOGLE_MAPS_IOS_API_KEY`** — done by a session on 3 November: the iPhone key, *Sensitive*, *preview* and
   *production*, the organization's, as the Android key was on 27 October. An iPhone key ships inside the app anyway, so
   having pasted it is no harm; its lock (step 3) and the limits (step 5) are what protect it.

---

## A free account for Wera Cocina's address search

✅ **Done 31 October; retired 3 November** — Wera Cocina's search is Google's since `10.4g-i`, so
nothing reads the token any more. You may delete `EXPO_PUBLIC_LOCATIONIQ_TOKEN` from Wera Cocina's Expo
settings and close the LocationIQ account whenever you like; nothing breaks either way. Kept as the record.

For `10.4c`, your ruling of 31 October. The search box that suggests addresses as a fonda types
uses **LocationIQ**, a service built on OpenStreetMap's open data, whose terms let us keep what it
answers and which publishes a processing agreement. Its free plan is enough for the pilot.

⚠️ I have not seen this console; a label may read a little differently.

1. **locationiq.com → Sign up**, with your email, on the free plan.
2. **In its dashboard, copy the access token** it made for you.
3. **Paste it into the conversation** when you start `10.4c`'s session. A session puts it in Wera
   Cocina's Expo settings, as it did your support number. It is made to sit inside an app, so it
   is not a password — but it still never goes into this public repository.

---

## Putting Wera on Google Play's closed test

✅ **Done — Google approved the test by 22 October, your twelve testers had joined by 24 October, and you applied
for production on 9 November.** Kept as the record.

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
   `~/Downloads/wera-tienda-1.0.0-7-primer-dia.aab`, the newest store build, made on 21
   October with the first day (it is also on expo.dev under *Builds*, the newest Android one
   marked `production`, until 20 November). ⚠️ Not the `-3-`, `-4-` or `-5-` files beside it,
   which are older builds that today's updates can no longer reach; if you already uploaded
   one of them, make a new release with this one. Accept
   *Play App Signing*. Countries: **Mexico** only. Testers: a list with the Gmail addresses.
5. **Send for review.** When Google approves it, *Closed testing → Testers* shows a link:
   *Copy link*, and send it to each tester. They open it signed in to the Gmail on your list,
   tap *Become a tester*, and install Wera from Google Play.
6. **Tell a session the day the twelfth tester joins.** The 14 days end two weeks after that,
   and the date goes into the plan so nobody has to remember it. Then *Dashboard → Apply for
   production* opens, and Google asks how the test went: section 7 of the same file lists the
   questions, so keep a note of what the testers tell you. ✅ **Twelve on 24 October: it opens
   7 November.**

Add a tester later in *Closed testing → Testers*; nothing restarts for the others. A tester
who leaves and comes back starts their own 14 days again.

---

## Putting Wera on the App Store

Apple reviews each version before anybody can download it, usually within a day or two.
Everything you paste is in [`store/app-store.md`](../store/app-store.md), in the order App
Store Connect asks, and the pictures are in `store/app-store/`. **The store build is made:**
build 3 (EAS `d0246560`, 21 October, from your Terminal), with Sign in with Apple and the
same update runtime as your iPhone's, so a fix sent over the air reaches both.

⚠️ **Apple will refuse Wera until steps 1 to 4 of *Turning on Entrar con Apple* are done.**
The account screen shows *Continuar con Apple* (Apple requires it next to Google's), and until
the key is in, it signs nobody in. Do those first and tell a session; it checks them.

1. **The record.** appstoreconnect.apple.com → *Apps* → **+** → *New App*: iOS, name
   `Wera: tu tienda`, Spanish (Mexico), bundle ID `mx.wera.app`, SKU `wera-mx` (it can never be
   changed), full access. Make it before step 2, or EAS makes one with its own name and SKU.
2. **Upload the build**, in Terminal.app. It asks for your Apple ID and a code, and offers to
   make an App Store Connect key: say yes.

   ```
   cd ~/RetailerToolDev/RetailerManagementTool/app && npx eas-cli submit --platform ios --id d0246560-c3ae-4bcc-b3ad-4d364e01dc29
   ```

   Apple processes it for 5 to 30 minutes, then emails you. ⚠️ **Do not install it on your own
   iPhone through *TestFlight*:** your iPhone is a pilot phone, and like the Play version on a
   pilot Android, the store version replaces the build that takes the pilot's measurements.
3. **The pages**, sections 2 to 8 of `store/app-store.md`: app information, price (free, Mexico
   only), the version page, age rating, app privacy, and review information with the demo
   account's email and password (the same account Google's reviewers get). Pictures, in file
   order, from the folder that matches the box's title: a **6.5-inch** box takes
   `store/app-store/iphone-6.5/`, a 6.9-inch one `iphone-6.9/`, a 6.3-inch one `iphone-6.3/`.
   One large box filled is enough; Apple scales it for the smaller phones. The wrong size is
   refused as *"File dimensions are invalid"*.
4. **The version page → *Build* → choose 3 → *Add for Review* → *Submit for Review*.** Apple
   answers by email. If it refuses something, give a session its words.

---

## When the stores approve Wera

✅ **Apple approved: *Wera: tu tienda* is on the App Store in Mexico since 5 November** (your word of
6 November; Apple's own record read the same day: version 1.0.0, under your name). Google is next:
**Tell a session the words *"Google approved"*** when it writes to you — it knows the rest, from the
plan's `5R-e` row.

1. ✅ **Sent by you on 6 November, evening** (`0b53a0d`, both stores — iPhone group `6872e4aa`, Android
   `357313b0`). Each store version takes it on its second open. Kept for the record: what waited
   went to the store versions in one command, yours (a session's permission check refuses an update to
   the store channel). From a clean `main`, in a terminal:

   ```
   bash docs/runbooks/ship-an-update.sh production "Wera: lo que esperaba la aprobación de Apple — tu tienda sola y precios sin señal (5R-e)"
   ```

   It brings the iPhone's store version up to date — *Conoce Wera*, *Crear Nuevo Proveedor*, the
   pause of *Te lo compro*, Wera opening shops only, *Eliminar mi cuenta* naming every business —
   and gives **both** store versions two changes that no store version has yet: every screen
   reading only the shop open in it, and setting a price without signal. Nobody notices either
   unless an account has a shop and a kitchen, or sets a price offline. A session dry-ran it on
   6 November: both stores' builds take it. Then open the store Wera, close it completely and
   open it again. (Android's store version got the first five as they went out, the last on
   29 October.)
2. **Google:** ✅ **you applied for production on 9 November.** Google answers by email, usually
   within seven days (*The dates*, above). If it approves, tell a session *"Google approved"*: the
   release to everyone is yours in Play Console, Mexico only, and the session walks you through it.
   If it asks for more testing, paste its words; the answers you sent are drafted in
   `store/google-play.md`, section 7.
3. **If a store refuses something**, paste its words to a session.

**Still yours from 21 October, none of them blocking the review:**

- **Sign in with Apple, for real** — the five minutes in *Turning on Entrar con Apple*, step 6.
  The app is public now, so anyone can try it; better that you see it work first.
- **The notice email** of that section's step 4 — only to an account made before 14 October that is not yours (the
  pilot member's, if they made one); if every such account is yours, tell a session and it closes.
- ✅ **Google sign-in for everybody** — *In production* (your word, 9 November).
- **The pilot Android's new install** — not needed until the pilot starts (`5P-e`): no Android has taken a Wera
  test update since October.
- **Supabase Pro** — the day before a shop that is not yours starts keeping its real records.

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
