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

✅ **29 October, late night: Wera reads only the shop open in it, over the air** (*Wera lee solo la tienda abierta: una cocina no se mezcla*). **Nothing changes on your screen** — no account has a shop and a kitchen yet. It went to your iPhone and the pilot Android. **The one thing worth trying, in this order:** with signal, open Wera, wait ten seconds and close it completely (that downloads the update); turn on airplane mode; open Wera — the update's first run, with no signal. Vender must show your products, and with one in the basket the *Cobrar* slider (don't slide it; *Vaciar carrito* after). Turn airplane mode off. If Vender shows no products or no slider, tell a session at once — the update can be undone in two minutes. ✅ **Looked at the same night — *"Opened Wera in airplane mode, products and slider there"*** (your word). Android's store version gets it with your command, before Wera Cocina's sign-up reaches anyone but you.

✅ **29 October, night: *Eliminar mi cuenta* names every business, over the air** (*Eliminar mi cuenta: cada negocio con su nombre*). **Nothing changes on your screen** — no account has a shop and a kitchen yet, so Ajustes → *Tu cuenta* → *Eliminar mi cuenta* looks exactly as before: open it to see, then tap *Cancelar* (never confirm). It matters the day someone owns both: the screen lists the shop and the kitchen and asks for each name. It went to your iPhone and the pilot Android. ✅ **Looked at the same night — *"Opened Wera twice, nothing changed"*** (your word), which covers the entry below too: the update carries both changes. ✅ **Android's store version got both the same night, by your command** (group `338f6217`) — this one and *Wera abre solo tiendas*, below; a tester's phone runs it the second time Wera opens. The iPhone's store version gets both when Apple approves.

✅ **29 October: Wera opens only shops, over the air** (*Wera abre solo tiendas: una cocina es de Wera Cocina*). **Nothing changes on your screen** — every account today is a shop. It matters the day someone owns a shop and a kitchen: Wera opens the shop. Open Wera, close it completely, open it again — twice; it should open your shop exactly as before. If it ever shows *Crea tu tienda* instead, tell a session at once (the update can be undone in two minutes). It went to your iPhone and the pilot Android. ✅ **Android's store version got it the night of 29 October**, with the entry above. The iPhone's store version gets it when Apple approves.

✅ **27 October: *Te lo compro* paused, over the air** (*Te lo compro en pausa: Merma es Tirar para
todos*). Merma opens straight on *Tirar* for everyone and no longer asks for the store's address;
Inicio shows no *Próxima recolección* and no *Rescatado*; the tutorial's Merma card is a new picture
of *Tirar*. Open Wera, close it completely, open it again — twice. It went to your pilot phones and to
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
| **Wera Cocina → finding your kitchen on the map** | New on 31 October, late, once the update reaches **your iPhone's Wera Cocina** (*What is on your phone*) — the first update that reaches it, and Apple's map needs no key, so you see all of it. On your kitchen's screen tap *Cambiar el punto* (or register a kitchen with a test account: the map then opens on the address you typed). **The map is now the flat street map**, Apple's muted one. In the box at the top, type your street and number — *Durango 220*: after a moment it suggests streets *in your colonia* (it adds the colonia you gave). Tap yours: **the map flies there, about five blocks wide** — the search knows streets, rarely the door. Tap near your door to come closer, tap your door: the pin, and on the card ***¿Es aquí? …*** — your iPhone's own name for that spot. **Does the flat map make your door easier to find than the satellite did? Does the search find your street? Does *¿Es aquí?* match where you are?** Under the box, *Search by LocationIQ.com · © OpenStreetMap* — in English, the free plan's required words: acceptable? ⚠️ *Guardar* moves your real kitchen's pin on the live database; *Volver* leaves it as it was |
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
| **Vender → `+` on a product with no price** | Your `+` opens *¿A cómo lo vendes?*; type it, *Guardar y agregar al carrito*, and it is in the sale. Without signal it cannot save yet (`8i`). A cashier's `+` is grey and says who can price it — to see it, sign in as somebody you invited as *Empleado* |
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
and collect, and then the public releases. Each slice reaches the test builds over the air, and the next one starts
after you have tried it.

| Job | What | State |
|---|---|---|
| **10.4c** | **Wera Cocina — finding her kitchen on the map, as Uber and DiDi do it** | ✅ **Done 31 October**, the same night as your ruling. **Measured first**: twenty real Mexico City addresses (the city's list of its community kitchens) through LocationIQ and through Apple's search on this Mac. **LocationIQ finds the street, rarely the door** — it knew a house number for 4 of its 47 answers — and only with the colonia: with it, 12 of 20 landed within about three blocks, without it 4. Apple's, the search an iPhone uses, put the map on the right block about twice as often (9 against 5, of the 12 addresses whose recorded spot could be trusted). **Built as you ruled, all over the air:** the flat street map; a search box above it whose suggestions add the colonia she gave and only move the map, about five blocks wide; the map opening near the address she typed; **her tap is the pin**, with *¿Es aquí? …* from the phone's own maps on the card. **What is kept is what she typed and where she tapped** — tried on a test phone: after picking a suggestion, the kitchen stored her tap, about a kilometre from the suggestion's point. Wera Cocina's privacy page names LocationIQ and the *¿Es aquí?* lookup (live when this merges). **Because Apple's search did better, one question for you** (in the `10.3` row below, with the others that wait on you): the phone's own search in Wera Cocina's release build. What to try on your iPhone: *What only you can judge* → *Wera Cocina → finding your kitchen on the map* |
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
| **10.3** | **The marketplace on paper — your one review before slice 1**: everything fondas publish, neighbours reserve and the 3-digit code, drawn for you once — including the exact shop-or-fonda line in each business account — and the check that no change to the database ever breaks an app already on a phone. No table is built yet | ✅ **Done 28 October.** **The check is in CI**: every change to the database is now compared with the one before it, and goes red if anything an app on a phone could call — a function, what it is sent, a column, a right — is gone or changed, unless the change says why no app still uses it. It was broken on purpose 32 ways and caught every one. Measured on the way: since the oldest build still listed (10 October), nothing an app calls has been taken away. **The marketplace is drawn**: https://claude.ai/artifact/J6tJmX3xCVEMLuc5z2ydsy — the situations first, then the tables, who sees what, and ten questions. **Your answers to 1–4 are in**: one kind per account for now; the owner and a manager publish and everyone hands over; the exact spot, visible before reserving (28 October, reversing your ruling of 26 October); and on 29 October proposal B — a dish or a surprise bag, with *Repetir* — and a line of directions beside the pin (https://claude.ai/artifact/CcEDunjkPozCxQ3SEmTJBk). **Questions 5–10 are waiting on YOU**, but not yet: 5–6 before slice 2 and 7–10 before slice 3 — and, since `10.4c`'s measurement (31 October), whether Wera Cocina's release build uses the phone's own search (recommended: yes), before the release builds. Two things are yours meanwhile: invite the twelve testers to each new app, and tell a session the day the twelfth joins each — that day starts each app's 14 days. (*Ofrecer* in Merma, `10.0b`, waits for Google's production approval) |
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
| **8i** | **Pricing at the counter with no signal** — your `+` asks a price, and today saving one needs signal | ⚠️ **This is where the next piece of work is**: clear the conversation and paste your main prompt. Split off round 1 on 15 October, with a recommendation in the plan's row; one way needs a database change, which is yours to say — the session asks you first |
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
| **5R-k-b** | **Apple sign-in, working on your iPhone** — your five steps, then a session reads the result with you holding the phone | **After your review** (your order of 15 October), and it starts with you: *Turning on Entrar con Apple*, below — steps 1 to 3 can be done in any break. Tell a session when they are done; it checks each one and tells you if one is missing |
| **5R-m** | **Your logo, on the app icon and the site** — the icon, the splash and a restyle of the three web pages | ✅ **You chose the mark on 13 October: the cow's face, option A**, with the W in its fringe. It is the file `brand/wera-mark.svg`, and the three options are still on the canvas: https://claude.ai/artifact/DQFB1T7w62t6DYUnTyJDch. **And its colour the same day: rust, on cream.** **The icon is in since 13 October: a cream cow on a rust square**, with builds of its own, because you asked for it on your phone at once. Each pilot phone installs again after Apple sign-in, keeping its data. What is left for this row is the site: the mark and a restyle of the three pages, after your review |
| **5P-d** | **The pilot's measurements, switched on** for the phones on the test channel — one update, no reinstall | ✅ **Done 13 October** — the switch is a setting on EAS (`piloto-1`) and one fix shipped over the air to both phones. The Android build was made again that day, so a new pilot member's first sign-up has the aviso's box. The store builds never carry the switch, and the shipping command now refuses if they would |
| **5P-b** | **How much each pilot shop uses Wera** — sales, purchases and waste per shop per day, counted from the server. Nothing added to the app | ✅ **Done 13 October** — one command prints it, one row per shop per day for two weeks, with the days nothing was recorded shown as zeros. See *Seeing how much each shop uses Wera*, below. It was checked against your own shop: 3 sales and 2 purchases in the last 14 days |
| **5P-e** | **The pilot's start list** — what has to be true before a shop that is not yours signs up: backups, the two security fixes, a health check you can run, and getting the app onto each phone | ✅ **Your three answers are built (15 October)**: the two doors are closed; an invitation lets someone in straight away only if they signed in with Google or Apple; a copy of the live database is taken on this Mac every night at 03:30 (*The nightly copy*, below). Your phone is measuring. Left: a health check you can run, the Samsung install note, one page of what to do once a shop is live |
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
| **7 November** | **Apply for production on Google Play** — *Dashboard → Apply for production*; twelve testers have been in since 24 October. The form asks how the test went (`store/google-play.md`, section 7); Google answers in about a week | Production waits; the closed test simply runs on |
| **30 April 2027** | **Delete the pilot's measurements** on the live database — the aviso promises it. If the pilot runs longer, change the date on the pages and tell the users first | The aviso says something false about people's data |

All three are in the plan's ⏳ DATES OWED block, which turns the checks red once one passes unticked. The 4 October rebuild is gone: your paid account signed the 9 October build for a year.

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

- somebody makes an account — *👤 Nueva cuenta en Wera (con Google). Ya son 15 cuentas.*
  (*con correo*, *con Google* or *con Apple*: how they signed up);
- somebody opens a shop — *🏪 Nueva tienda en Wera. Ya son 4 tiendas.*
- somebody opens a kitchen in Wera Cocina — *🍲 Nueva cocina en Wera Cocina. Ya son 2 cocinas.*
  (since 29 October; shops and kitchens are counted apart). A kitchen's owner signing up still
  shows as *Nueva cuenta en Wera*: the database cannot tell which app made a login.

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

Your twelve testers have Wera Cocina's first build from Play — the map and nothing else. The first
update to Play's builds brings them everything since: signing in, the kitchen and publishing.
**Four things are true before it, and two of them are yours** (plan `10.4b-iv-b`):

1. ✅ **The privacy page says what Wera Cocina holds** — published when `10.4b-iv-b` merged, with
   Wera Cocina's own deletion page.
2. **A demo account for Google's reviewers**, which must keep working. On a phone with Wera
   Cocina's test build: *Crear cuenta* with an email you control that is not your own (a new Gmail
   works) and a password you keep; register a kitchen — **Cocina Demo**, any trade, any address in
   the city, a pin. Keep both, and never delete the account. Not Wera's demo account: that one owns
   a shop.
3. **Play Console → Wera Cocina**, pasting from
   [`store/cocina-itacate.md`](../store/cocina-itacate.md): *App content → Data safety* (section 4,
   *Data safety — Wera Cocina*, with the delete link `https://tu-wera.com/eliminar-cuenta/cocina/`);
   *App content → App access* — Play may call it *Sign-in details* — with the demo account and the
   English line; and *Main store listing → Full description* (section 2: the old one says it shows
   only a map). Then send the changes for review (*Publishing overview*).
4. **Your command for Android's store version of Wera** — it carries only the 29 October change,
   Wera reading the shop open in it alone (a session's is refused):
   ```
   ! bash docs/runbooks/ship-an-update.sh production "Wera lee solo la tienda abierta: una cocina no se mezcla" --only android
   ```

**Then Wera Cocina's first update to your testers — your command too, whenever you want them to
have it.** My recommendation: after you have tried slice 1 yourself (*What only you can judge*,
the *Wera Cocina* rows), so they never meet something you would have caught first.
```
! bash docs/runbooks/ship-an-update.sh production "Wera Cocina: tu cuenta, tu cocina y lo que publicas" --app cocina --only android
```

---

## A free account for Wera Cocina's address search

✅ **Done 31 October** — the token you gave is in Wera Cocina's Expo settings and on this Mac; you
don't need to paste it again. Kept as the record.

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

Both were sent for review on 21 October: Apple usually answers in a day or two, Google in a few
hours to seven days. Each writes to your email. **Tell a session the words *"Apple approved"* or
*"Google approved"*** — it knows the rest, from the plan's `5R-e` row:

1. **Apple: what is waiting goes to the iPhone store version** — one command: *Conoce Wera*,
   *Crear Nuevo Proveedor* and the pause of *Te lo compro* — and two changes nobody sees until an
   account has a shop and a kitchen: Wera opening shops only, and *Eliminar mi cuenta* naming every
   business. Android's store version got the first three as they went out — *Conoce Wera* on
   22 October, because an update carries everything before it — and the last two on 29 October,
   by your command.
2. **Google:** the twelfth tester joined on 24 October, so *Apply for production* opens on
   **7 November** (*The dates*, above).
3. **If Apple refuses something**, paste its words to a session.

**Still yours from 21 October, none of them blocking the review:**

- **Sign in with Apple, for real** — the five minutes in *Turning on Entrar con Apple*, step 6.
  Apple's reviewer will try it; better that you see it work first.
- **The notice email** of that section's step 4, to every account that is not yours.
- **Google sign-in for everybody** — *Putting tu-wera.com up*, step 7, if you have not.
- **The pilot Android's new install** (*What is on your phone*).
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
