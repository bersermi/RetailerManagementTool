# Wera Cocina and Itacate — Google Play's test versions, and Wera Cocina's App Store privacy answers

Written by plan task `10.2b` (2026-10-27), on the shape of [`google-play.md`](google-play.md), Wera's.
Paste from here, **once per app**: where the two differ, the field gives both. The handbook's
*Before the two new apps' first builds* is the order of work. Section 7, the App Store's privacy
answers for Wera Cocina, was added by `10.4g-ii` (2026-11-03) and waits for `10.5b`'s App Store record.

**These are the listings for the CLOSED TESTS.** Only the testers you add see them. **Itacate's
store version is still the skeleton** — one screen, a map, nothing else — but its test build signs
people in since `10.5-iii-a` and deletes an account since `10.5-iii-b`, and the store version gets
both with its first `production` update: ⚠️ **section 4's Itacate answers go into Play Console
BEFORE that update** (*App access* and *Data safety — Itacate*, rewritten by `10.5-iii-b`).
**Wera Cocina makes accounts since `10.4b-iii`**
(sign-in, her kitchen with its address — her own point on the map optional since `10.4h` — and
publishing), so its section 4 answers changed with `10.4b-iv-b` (2026-10-31) and again with `10.4g-ii`
(2026-11-03), and they go into Play Console **before** the store version that brings sign-in to the
closed testers (version 5, section 6). The pictures are replaced before production is requested (`10.5b`).

⚠️ **The upload in section 6 makes the id permanent**: `mx.wera.cocina` and `mx.wera.vecino`,
the owner's yes of 2026-10-27.

⚠️⚠️ **WHEN A LATER VERSION STARTS COLLECTING ANYTHING ELSE — an account, the location, photos,
notifications — section 4's *Data safety* changes FIRST, with the privacy page, before that
version ships.** An over-the-air update passes no Google review, so nothing else will remind
anyone. Google: *"Your Data safety form responses must remain accurate and complete at all
times"* (Play Console Help, answer 10787469, read 2026-10-31).

⚠️ A block marked `<!-- max:N -->` has a limit of N characters. After editing one, run
`python3 store/limits.py`.

⚠️ **Since `10.5-v-a` (2026-11-06) no word here makes the food sound left over** (the owner's ruling of
2026-11-05): both full descriptions open on the app's line — *Vende hasta el último plato.* and *La
comida del día de tu colonia, a mejor precio.* — Wera Cocina's says *ofrece tu comida del día a mejor
precio*, the reviewers' note names the button *Publicar una oferta*, and version 5's release notes say
*tus ofertas del día*. Play still shows the old text until the owner pastes both descriptions
(*Main store listing → Full description*, each app) and section 4's *App access* note.

---

## 1. Create app

| Field | Wera Cocina | Itacate |
|---|---|---|
| App name | `Wera Cocina` | `Itacate` |
| **Package name** | **`mx.wera.cocina`** | **`mx.wera.vecino`** |
| Default language | **Spanish (Latin America) – es-419** | same |
| App or game | **App** | same |
| Free or paid | **Free** | same |
| Declarations | tick both | same |

If the form asks for the **package name**, type it exactly as above — lowercase, with the dots. If it does
not, the first upload (section 6) fixes it from the `.aab`, which carries these same two (read with `aapt2`,
2026-10-27). Either way it can never change afterwards.

## 2. Main store listing

### Wera Cocina

**App name**

<!-- max:30 -->
```
Wera Cocina
```

**Short description**

<!-- max:80 -->
```
Versión de prueba de la app de Wera para fondas y cocinas.
```

**Full description**

<!-- max:4000 -->
```
Vende hasta el último plato.

Wera Cocina es la app de Wera para fondas y cocinas: ofrece tu comida del día a mejor precio para que los vecinos pasen por ella.

Esta es una versión de prueba, solo para quienes la están probando. Por ahora puedes crear tu cuenta, registrar tu cocina con su dirección —y, si quieres, su punto exacto en el mapa— y publicar platillos o bolsas sorpresa, con el horario en que pueden pasar. Lo que publicas lo ven los vecinos en Itacate, la app de Wera para vecinos, que también está en prueba.

Usa la misma cuenta que Wera: tu tienda.

No tiene anuncios y no vende datos.

¿Dudas? ayuda@tu-wera.com

Aviso de privacidad: https://tu-wera.com/privacidad/cocina-e-itacate/
```

### Itacate

**App name**

<!-- max:30 -->
```
Itacate
```

**Short description**

<!-- max:80 -->
```
Versión de prueba de Itacate, la app de Wera para vecinos.
```

**Full description**

<!-- max:4000 -->
```
La comida del día de tu colonia, a mejor precio.

Itacate es la app de Wera para vecinos.

Esta es una versión de prueba, solo para quienes la están probando. Te muestra las cocinas cercanas que tienen algo publicado —primero lo que puedes recoger ahora, y de la más cercana a la más lejana—, con lo que ofrecen, su precio y a qué hora pasar por ello. Tu ubicación se usa solo en tu teléfono; si no quieres darla, escribe tu código postal. La iremos llenando con actualizaciones.

No tiene anuncios y no vende datos.

¿Dudas? ayuda@tu-wera.com

Aviso de privacidad: https://tu-wera.com/privacidad/cocina-e-itacate/
```

**Graphics** — the files are in [`cocina-itacate/`](cocina-itacate/):

| Play asks for | Wera Cocina | Itacate |
|---|---|---|
| App icon, 512 × 512 PNG | `cocina-icono-512.png` | `itacate-icono-512.png` |
| Feature graphic, 1024 × 500 | `cocina-grafico-1024x500.png` | `itacate-grafico-1024x500.png` |
| Phone screenshots (2 to 8) | `cocina-captura-1.jpg`, `cocina-captura-2.jpg` | `itacate-captura-1.jpg`, `itacate-captura-2.jpg` |

Wera's cow on each app's own ground (green, blue) — **Wera Cocina's ruled by the owner on 2026-11-02**, as its app icon; Itacate's still provisional. The
screenshots are each app's `preview` build on the Android emulator, 2026-10-27, its map drawn
with the real key — the city centre, then panned — cut to 1080 × 2160 (Play refuses a phone
screenshot more than twice as tall as it is wide). Leave the tablet, Chromebook and video fields empty.

## 3. Store settings — the app's category, and *Store listing contact details*

| Field | Wera Cocina | Itacate |
|---|---|---|
| App category | **Business** | **Food & Drink** |
| Email address | `ayuda@tu-wera.com` | same |
| Website | `https://tu-wera.com/` | same |
| Phone number | leave empty | same |
| External marketing | off | same |

## 4. App content

Where the two apps answer alike, once; where they differ, each app's own.

### Privacy policy

The same page for both:

```
https://tu-wera.com/privacidad/cocina-e-itacate/
```

### App access — *Sign-in details*

**Itacate** (since `10.5-iii-b`, for its store version's first sign-in — paste it before that
update; until then Play holds **No**, true of version 3): **All or some functionality is restricted**
→ *Add instructions*, as Wera Cocina's is below. Everything in Itacate is behind its sign-in.

| Field | Answer |
|---|---|
| Instruction name | `Cuenta de demostración` |
| Username | the Itacate demo account's email — **an account that owns nothing**, which you make in Itacate itself (*Crear cuenta*, on your Android test build) with an address of yours. Not Wera's or Wera Cocina's demo account: in Itacate, *Eliminar mi cuenta* would name their shop or kitchen, and a reviewer who deleted it would end that app's way in too |
| Password | its password. **Never write it in this repository** |
| No other information is required | tick it |

<!-- max:500 -->
```
On the first screen tap "¿Ya tienes cuenta? Entrar" (under the "Crear cuenta" button), then sign in with the email and password. No second factor. The account owns nothing, so the app opens on its one screen: a map and a note that this is a test version. Nothing else is shown to anyone yet. The app is in Spanish.
```

⚠️ **Keep the demo account.** Deleting it, or changing the password without changing it here,
breaks Google's way in.

**Wera Cocina** (since `10.4b-iii`): **All or some functionality is restricted** → *Add
instructions*, as Wera's is (`google-play.md`, *App access*). Google: *"you must provide the
necessary information for our team to log in and access all app functionality"* — *"an active
demo account … for a pre-configured account"* — and the details must be *"accessible at all
times, reusable"* and *"provided in English"* (answer 15748846, read 2026-10-31).

| Field | Answer |
|---|---|
| Instruction name | `Cuenta de demostración` |
| Username | the Wera Cocina demo account's email — you make it, with its demo kitchen (the handbook, *Wera Cocina's demo account for Google*). Not Wera's demo account, which owns a shop |
| Password | its password. **Never write it in this repository** |
| No other information is required | tick it |

<!-- max:500 -->
```
On the first screen tap "¿Ya tienes cuenta? Entrar" (under the "Crear cuenta" button), then sign in with the email and password. No second factor. The account owns a demo kitchen, so the app opens on it; "Publicar una oferta" publishes dishes. Nothing a kitchen publishes is shown to anyone yet. The app is in Spanish.
```

⚠️ **Keep the demo account and its kitchen.** Deleting either, or changing the password without
changing it here, breaks Google's way in.

### Ads

**No, my app does not contain ads.** Both.

### Content rating

The same answers for both:

| Question | Answer |
|---|---|
| Email | `ayuda@tu-wera.com` |
| Category | **All other app types** |
| Violence, blood, fear; sexuality, nudity; offensive language; gambling; drugs; alcohol or tobacco | **No** to all |
| Users interact or exchange content with other users | ⚠️ **Yes, both, since `10.5-iv-a-i`** (was *No*): what a kitchen publishes, her page and her photos reach the neighbours who sign in to Itacate, and Itacate shows them. Neither app has messages or comments; reserving is `10.5b`'s |
| Shares the user's location with others | ⚠️ **Wera Cocina: Yes, since `10.5-iv-a-i`** (was *No*) — her kitchen's address and its point (hers, or where Google places her address) reach the neighbours, and a kitchen may be her home. **Itacate: No** — her location never leaves her phone |
| Lets users buy digital goods | **No** |
| Is a web browser or a search engine | **No** |

### Target audience and content

| Question | Answer |
|---|---|
| Target age | **18 and over**, and no other group |
| Could it appeal to children | **No** |

### Data safety — Wera Cocina

Since `10.4b-iii` it makes accounts, a kitchen and publications. What each answer stands on is
the aviso (`site/privacidad/cocina-e-itacate/`, section 3) and `site/README.md`'s table.

**Data collection and security**

| Question | Answer |
|---|---|
| Does your app collect or share any of the required user data types? | **Yes** |
| Is all of the user data collected by your app encrypted in transit? | **Yes** |
| Which methods of account creation does your app support? | **Username and password**, and **OAuth** (Google — the Android app has no Apple button) |
| Delete account URL | `https://tu-wera.com/eliminar-cuenta/cocina/` — it names Wera Cocina, as Google requires (*"reference the app or developer name … as it appears on your store listing"*, answer 13327111, read 2026-10-31) |
| Can users ask for some data to be deleted without deleting the account? | **Yes** since `10.5-iii-c` — her kitchen, alone (*Eliminar esta cocina*, or by email): give `https://tu-wera.com/eliminar-cuenta/cocina/#solo-la-cocina`. ⚠️ Until 2026-11-04 this row said **No**; if that is what was pasted, change it the next time the form is open — it understates what the app does, so nothing waits on it |
| *Can users login to your app with accounts created outside of the app?* | **Yes** — one login serves Wera and Wera Cocina (ADR-035 §2.7): an account made in Wera opens Wera Cocina |

**Data types** — tick exactly these eleven (*Photos* since `10.5-ii`):

| Section | Data type | What it is in Wera Cocina |
|---|---|---|
| Personal info | **Name** | The name and surname typed at sign-up, or Google's; her name as her kitchen's owner |
| Personal info | **Email address** | The account's email |
| Personal info | **User IDs** | The account id, and Google's account id for a sign-in with Google |
| Personal info | **Address** | Her kitchen's address — a home when the kitchen is in one. ⚠️ Since `10.4g-i` the whole search is Google's (LocationIQ and the phone's own geocoder until then): what she types in the address search and the map's box — with the colonia and city she gave, in the map's box — goes to Google's Places API for suggestions, and a suggestion she picks fills her address, which she can correct and which is what is kept; the address she wrote goes to Google's Geocoding as the map opens, and what she searches with the keyboard's search key. ⚠️ Since `10.4h` (address first) her address also goes to Google's Geocoding to show it on the small map as she fills it. ⚠️ **Since `10.5-i-b-ii` the point where Google places it, and Google's ID for the place she picked, are kept up to 30 days** (declared under *Precise location*), and asked again — the ID to Place Details, else her address to Geocoding — when the app opens and the copy is over 7 days old; her kitchen's screen no longer asks Google each time it opens. Nothing else Google answers is kept |
| Location | **Precise location** | ⚠️ **Since `10.5-i-b-ii`, the point where Google places her kitchen's address** — kept up to 30 days for every kitchen with no pin of her own, refreshed weekly while she uses the app, cleared every night at 29 days and whenever her address changes — the point Itacate will draw her at. And her kitchen's pin — ⚠️ **optional since `10.4h`** (address first): kept only if she sets her own point, and cleared when her street or number changes; since `10.4e` the middle of the map once she has moved the map under it (before, where she tapped) — kept to six decimals; since `10.4g-i` sent to Google's Geocoding each time it settles, for the street under it, which the card compares with hers — shown, never kept (the phone's own geocoder answered it from `10.4c`). ⚠️ Not the phone's location — the app has no location permission — but Google's definition is the *"user or device physical location within an area less than 3 square kilometers"*, and the pin may be her home; Google's page says nothing of a place the user picks, so both this and *Address* are declared |
| App activity | **Other user-generated content** | What she publishes — each dish or surprise bag, its description, tags, price, count and usual price, and the pickup window — her kitchen's name and line of directions; and since `10.5-ii` her page's sentence, colour and Google Maps link |
| Photos and videos | **Photos** | Since `10.5-ii`: her page's cover and logo and each dish's photo — taken with the camera, or ONE photo she picks in the phone's own picker (the app has no photo-library permission) — cut to its shape, made smaller and stripped of where and when it was taken before it is uploaded; kept in a private store, seen by nobody outside her kitchen until Itacate shows kitchens (`10.5-iv`) |
| Device or other IDs | **Device or other IDs** | The random install id sent to Expo with each update check; the Maps SDK's own pseudonymous id; Firebase's installation id and push token (Android) |
| App activity | **App interactions** | The map's panning and zooming, which Google's Maps SDK reports |
| App info and performance | **Crash logs** | The Maps SDK's stack traces when it crashes |
| App info and performance | **Diagnostics** | The Maps SDK's crash metrics and request metadata (phone model, Android version) |

**For every one of the eleven:**

| Question | Answer |
|---|---|
| Is this data collected, shared, or both? | **Collected** — Supabase, Expo and Google (since `10.4g-i` the whole search too; LocationIQ from `10.4c` until then) are the app's service providers, and nothing is shown to another user yet. Re-read for `10.4d` (2026-11-02): Android's own geocoder is Google's, already the map's provider, and it answers a search she makes — Google's own exception for a transfer *"based on a specific user-initiated action"* — so the ticks stay; the aviso, under Mexican law, calls it a *transferencia* (its section 6), a different test. ⚠️ `10.5` answers it again: neighbours see a kitchen's pin and publications, which Google may count as a transfer *"based on a specific user-initiated action, where the user reasonably expects the data to be shared"* (not sharing) |
| Is this data processed ephemerally? | **No** |
| Is this data required, or can users choose? | **Required** for ten of the eleven — a kitchen cannot be registered without its address, and the rest come with the account and the map. ⚠️⚠️ ***Precise location*: Required since `10.5-i-b-ii`** (2026-11-04) — **it was *Users can choose* from `10.4g-ii` (2026-11-03), and if that is what was pasted, change it before Wera Cocina's `production` update carrying `10.5-i-b-ii` reaches anyone**: every kitchen now keeps a point — her own, or Google's for her address, which she cannot decline while she has an address. Google allows *optional* only when every user, on any device, can decline it, and *required* when the app's primary function needs the data (answer 10787469, read 2026-11-03) — her kitchen on the map is that function. ✅ ***Photos*: Users can choose** (`10.5-ii`): every photo is optional — a page and a dish without one wear her trade's drawing — and none is asked for to register or to publish |

**Why it is collected:**

| Data type | Purposes |
|---|---|
| Name | App functionality · Account management |
| Email address | App functionality · Account management · Developer communications |
| User IDs | App functionality · Account management |
| Address | App functionality |
| Precise location | App functionality |
| Other user-generated content | App functionality |
| Photos | App functionality |
| Device or other IDs | App functionality · Analytics |
| App interactions | Analytics |
| Crash logs | Analytics |
| Diagnostics | Analytics |

*Developer communications* on the email: the aviso promises an email before any change to which
data is used, or for what (its section 11) — before Itacate shows a kitchen to neighbours, first
(`10.5-iv-a-i` built Itacate's list; the email is the handbook's *Before Wera Cocina reaches your testers*).

**Not ticked, and why:** *Phone number* — no account carries one, and a kitchen's phone is not
asked (Wera declares one ahead of use by the owner's ruling of 2026-10-21 for Wera; nothing ruled
it for Wera Cocina). *Financial info* — a price she sets for her own dish is her offer, written
under *Other user-generated content*; nothing is paid in the app and no card or bank detail is
asked (Google: *"Other financial info: … such as user salary or debts"*). *Videos* — the camera and
the picker are asked for images only. Approximate location, contacts, files, messages, health,
web browsing — none read.

### Data safety — Itacate

⚠️ **Rewritten by `10.5-iii-b` for the store version's first sign-in**: an account — Itacate's
sign-in (`10.5-iii-a`) and its *Eliminar mi cuenta* (`10.5-iii-b`). ⚠️ **And by `10.5-iv-a-i` for
its list of the kitchens near her**: one more type, *Approximate location* — the postal code she
types when she gives no location, which her phone sends to Google's address search. **Paste it
before the first `production` update to Itacate**: an update passes no Google review, and the
answers must be true of what testers run. Version 3, the skeleton with no sign-in, ticked the last
four types alone. What each answer stands on is the aviso (`site/privacidad/cocina-e-itacate/`,
section 10) and `site/README.md`'s table.

**Data collection and security**

| Question | Answer |
|---|---|
| Does your app collect or share any of the required user data types? | **Yes** |
| Is all of the user data collected by your app encrypted in transit? | **Yes** |
| Which methods of account creation does your app support? | **Username and password**, and **OAuth** (Google — the Android app has no Apple button) |
| Delete account URL | `https://tu-wera.com/eliminar-cuenta/itacate/` — it names Itacate, as Google requires (*"reference the app or developer name … as it appears on your store listing"*, answer 13327111, read 2026-10-31 for Wera Cocina's) |
| Can users ask for some data to be deleted without deleting the account? | **No** — leave the optional link empty |
| *Can users login to your app with accounts created outside of the app?* | **Yes** — one login serves Wera, Wera Cocina and Itacate (ADR-035 §2.7): an account made in either opens Itacate |

**Data types** — tick exactly these eight: the three of the account, her postal code, and the four
the update check, Google's SDKs and Firebase send on their own.

| Section | Data type | What it is in Itacate |
|---|---|---|
| Personal info | **Name** | The name and surname typed at sign-up, or Google's |
| Personal info | **Email address** | The account's email |
| Personal info | **User IDs** | The account id, and Google's account id for a sign-in with Google |
| Location | **Approximate location** | ⚠️ Since `10.5-iv-a-i`: the postal code she types when she gives no location, or her phone gives only an approximate one — sent by her phone to Google's Geocoding to find where it is, and forgotten when the app closes; Wera never receives it. ⚠️ **Her location itself is not declared**: it is used on her phone alone and never leaves it (Google: data *"only processed locally on the user's device"* is not collected — its *Data safety* page, read 2026-11-01) |
| Device or other IDs | **Device or other IDs** | The random install id sent to Expo with each update check; the Maps SDK's own pseudonymous id; Firebase's installation id and push token (Android) |
| App activity | **App interactions** | The map's panning and zooming, which Google's Maps SDK reports |
| App info and performance | **Crash logs** | The Maps SDK's stack traces when it crashes |
| App info and performance | **Diagnostics** | The Maps SDK's crash metrics and request metadata (phone model, Android version) |

**For every one of the eight:**

| Question | Answer |
|---|---|
| Is this data collected, shared, or both? | **Collected** — Supabase, Expo and Google are the app's service providers, and nothing of a neighbour is shown to another user: no kitchen or shop learns who signs in (the aviso's section 10) |
| Is this data processed ephemerally? | **No** — ⚠️ but **Yes for *Approximate location***: her phone sends the postal code to Google's address search for the one answer, keeps it in memory while the app is open, and nobody stores it on Wera's side (Google's own handling is under its terms, the aviso's section 10) |
| Is this data required, or can users choose? | **Required** — the account is the way in, and the rest comes with the map and the update check — ⚠️ but **Users can choose** for *Approximate location*: it is typed only by a neighbour who gives no location, and she may type none |

**Why it is collected:**

| Data type | Purposes |
|---|---|
| Name | App functionality · Account management |
| Email address | App functionality · Account management · Developer communications |
| User IDs | App functionality · Account management |
| Approximate location | App functionality |
| Device or other IDs | App functionality · Analytics |
| App interactions | Analytics |
| Crash logs | Analytics |
| Diagnostics | Analytics |

*Developer communications* on the email, as Wera Cocina's: the aviso promises an email before any
change to which data is used, or for what (its section 11). ⚠️ **Since the owner's ruling of
2026-11-04, night, nothing of her location reaches the door** — no square, as `10.5` once planned —
so her location is not declared at all, and the postal code is the one location type. `10.5-iv-b`
(Google's map in Itacate) reads this section again.

⚠️ **What stands behind the technical answers, in both apps**: Expo's update check
(`expo-updates` sends `EAS-Client-ID`, as for Wera); Google's *Prepare for Google Play's data
disclosure requirements* for the Maps SDK for Android, read 2026-10-27; Firebase's documentation,
which generates a push token at launch unless told not to. *Collected* rather than *shared* treats
Google and Expo as the apps' service providers, as Wera's answers treat Supabase and Expo; Google's
page does not say which it is for its own SDK. **Not ticked for Itacate:** *Precise location* —
her location never leaves her phone (`10.5-iv-a-i`); phone number, photos — the kitchens' photos
are theirs, and Itacate asks for no camera or picture of hers —, financial info, messages,
contacts, files, health.

### Government apps · Financial features · Health · Advertising ID

**No** · **No financial features** · **No health features** · **No advertising ID** — neither APK
declares `AD_ID` (read with `aapt2`, 2026-10-27). The same for both.

## 5. Closed testing — the track

| Field | Answer |
|---|---|
| Track | the default closed track |
| Countries / regions | **Mexico** only |
| Testers | the same email list as Wera's (`Wera – prueba cerrada`) if Play offers it; otherwise the same twelve Gmail addresses. **Not in this repository** |
| Feedback URL or email | `ayuda@tu-wera.com` |

## 6. Closed testing — the releases

### The first — both apps, version 3 (`10.2b`, sent 2026-10-28)

Upload the app's `.aab` — `~/RetailerToolDev/wera-builds/cocina-1.0.0-3-produccion.aab` for Wera Cocina,
`itacate-1.0.0-3-produccion.aab` for Itacate. Accept Play App Signing when it offers. Then *Next →
Save → Send for review*.

| Field | Answer |
|---|---|
| Release name | leave what Play fills in from the upload — **`3 (1.0.0)`**, the build's version code and version. Only you see it |

**Release notes** (es-419):

<!-- max:500 -->
```
Primera versión de prueba: por ahora, un mapa.
```

**After the first upload:** *Test and release → App integrity → App signing* shows the app
signing key's **SHA-1**. Give it to the session: it goes, with the upload key's, into the map
key's *Application restrictions* in Google Cloud, so the key works only for these two apps.

### Wera Cocina's second — version 5 (`10.4g-ii`, built 2026-11-03)

Everything since the first: the account, her kitchen with its address, publishing, and Google's map
and address search on both phones. ⚠️ **Version 4 (`10.4d-ii`) was never sent and never will be** —
it searched with the phone's own geocoder, which Google's replaced. Play only needs each upload's
version code to be higher than the last one it received (3), so the unused 4 changes nothing.
**Before it, the handbook's *Before Wera Cocina reaches your testers***:
this file's section 4 goes into Play Console first, because this version brings the account.

Play Console → **Wera Cocina** → *Closed testing* → its track → **Create new release** → upload
`~/RetailerToolDev/wera-builds/cocina-1.0.0-5-produccion-google.aab` → *Next* → *Save* →
*Publishing overview* → send the changes for review.

| Field | Answer |
|---|---|
| Release name | leave what Play fills in from the upload — **`5 (1.0.0)`** |

**Release notes** (es-419):

<!-- max:500 -->
```
Ya puedes crear tu cuenta, registrar tu cocina con su dirección y publicar tus ofertas del día: platillos o bolsas sorpresa, con el horario en que pueden pasar por ellos. El mapa y la búsqueda de direcciones ahora son de Google. Los vecinos todavía no ven lo que publicas.
```

**The map key needs nothing new.** Play re-signs version 5 with the same app signing key as
version 3, already on the key's list (`10.2b`); and the search's requests name the upload key's
fingerprint (`cocina/src/lib/google.ts`, `FIRMA_ANDROID`), the other one on it — the key `10.4g-ii`
read off this bundle's signature.

## 7. The App Store — Wera Cocina's privacy answers (for `10.5b`'s record)

**Nothing here has been entered anywhere.** Wera Cocina has no App Store record yet: `10.5b` makes
it, with the public release. These answers describe the iPhone store version `10.4g-ii` built —
1.0.0 build 4, EAS `e1f09169`, kept as `~/RetailerToolDev/wera-builds/cocina-1.0.0-4-produccion-google.ipa`
— and they change before then if a later build collects anything else. ✅ **Photos came with `10.5-ii`**
(2026-11-04) as an update to the same build — the camera and the picker were in it — and are declared below.
Apple's definitions are its *App privacy details* page, read 2026-11-03. Privacy Policy URL:
`https://tu-wera.com/privacidad/cocina-e-itacate/`.

*Do you or your third-party partners collect data from this app?* **Yes.**

| Data type | Purposes | Linked to the user | Tracking | What it is in Wera Cocina |
|---|---|---|---|---|
| Contact Info → **Name** | App Functionality | Yes | No | The name at sign-up, or Apple's or Google's; her name as her kitchen's owner |
| Contact Info → **Email Address** | App Functionality | Yes | No | The account's email — Apple's relay address included |
| Contact Info → **Physical Address** | App Functionality | Yes | No | Her kitchen's address — a home when the kitchen is in one — and what she types to find it, which goes to Google for suggestions and to place it on the map |
| Location → **Precise Location** | App Functionality | Yes | No | Since `10.5-i-b-ii` the point where Google places her kitchen's address, kept up to 30 days and refreshed weekly while she uses the app; her own point on the map, only if she sets one (six decimals); and the point under the pin sent to Google while she sets it |
| Identifiers → **User ID** | App Functionality · Analytics | Yes | No | The account's id, and Apple's or Google's for their sign-in; and the user id Google's map declares, for its analytics |
| Identifiers → **Device ID** | App Functionality · Analytics | Yes | No | The random id each install sends to Expo with its update check (not linked), and the Maps SDK's own, which one of its two manifests calls linked |
| User Content → **Other User Content** | App Functionality | Yes | No | What she publishes — each dish or bag, its price, count and pickup window — her kitchen's name and its line of directions; her page's sentence, colour and Google Maps link (`10.5-ii`) |
| User Content → **Photos or Videos** | App Functionality | Yes | No | Since `10.5-ii`: her page's cover and logo and each dish's photo, taken with the camera or picked in the system picker, cut, made smaller and stripped of where and when it was taken; kept with her kitchen |
| Usage Data → **Product Interaction** | Analytics | No | No | Google's map: how it is used |
| Diagnostics → **Crash Data** | Analytics | No | No | Google's map: its crash reports |
| Diagnostics → **Performance Data** | Analytics | No | No | Google's map |
| Other Data → **Other Data Types** | Analytics | Yes | No | Google's map — its manifest names nothing more |

**What the Google rows stand on:** the build carries the Maps SDK for iOS with two privacy manifests,
`GoogleMapsPrivacy.bundle` and `GoogleMapsResources.bundle/GoogleMaps.bundle`, read inside build 4
(2026-11-03). Between them: crash data, performance data and product interaction, not linked; a user
id and "other data", linked; a device id, for analytics and the app's function — linked in one and not
in the other, so declared linked; everything for analytics; neither declares tracking or a tracking
domain. The other fourteen manifests in the build (React Native's, Expo's) declare no data. Apple:
*"You need to identify all of the data you or your third-party partners collect"*, and
none of Google's meets the optional-disclosure criteria — it is collected each time the map is used,
not in an optional form she fills in. Google's own pages point to the manifest. Expo's update id is
in the app's own *Device ID* row.

⚠️ **Apple's form asks nothing about *optional*.** Her kitchen's point is declared because it is a latitude
and longitude to six decimals and her kitchen may be her home — the reason Play's form declares it
(section 4), where it is answered *Required* since `10.5-i-b-ii` (*Users can choose* before it).

**Not declared, and why:** *Search History* — what she searches for is her own address, declared as *Physical
Address*, as Play's *Address* covers it (Play's *In-app search history* is not ticked either). *Coarse
Location* — the app reads no location and has no permission for it (`Info.plist` holds no location key,
read inside build 4). *Phone Number* — no account or kitchen carries one. *Purchases*, *Financial Info*
— nothing is paid in the app; her price is her offer, under *Other User Content*. *Contacts*, *Health*,
*Browsing History*, *Sensitive Info*, *Other Diagnostic Data* — none.

**For the App Review notes, when `10.5b` writes them** (English, first line): *"No widgets and no widget
extension: WidgetKit is linked only by Expo's UI library (pulled in by expo-router), unused."* — build 4's
binary links `WidgetKit.framework` and has no `PlugIns/` folder, as Wera's did when Apple's first review
of Wera stopped on *"Does the app include widgets?"* (2.1, 2026-10-31).
