# Google Play — Wera Cocina and Itacate, the test versions

Written by plan task `10.2b` (2026-10-27), on the shape of [`google-play.md`](google-play.md), Wera's.
Paste from here, **once per app**: where the two differ, the field gives both. The handbook's
*Before the two new apps' first builds* is the order of work.

**These are the listings for the CLOSED TESTS.** Only the testers you add see them. Itacate is
still the skeleton — one screen, a map, nothing else. **Wera Cocina makes accounts since `10.4b-iii`**
(sign-in, her kitchen with its pin, publishing), so its section 4 answers changed with `10.4b-iv-b`
(2026-10-31), and they go into Play Console **before** the first update that brings sign-in to the
closed testers' builds. The pictures are replaced before production is requested (`10.5b`).

⚠️ **The upload in section 6 makes the id permanent**: `mx.wera.cocina` and `mx.wera.vecino`,
the owner's yes of 2026-10-27.

⚠️⚠️ **WHEN A LATER VERSION STARTS COLLECTING ANYTHING ELSE — an account, the location, photos,
notifications — section 4's *Data safety* changes FIRST, with the privacy page, before that
version ships.** An over-the-air update passes no Google review, so nothing else will remind
anyone. Google: *"Your Data safety form responses must remain accurate and complete at all
times"* (Play Console Help, answer 10787469, read 2026-10-31).

⚠️ A block marked `<!-- max:N -->` has a limit of N characters. After editing one, run
`python3 store/limits.py`.

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
Wera Cocina es la app de Wera para fondas y cocinas: publica lo que te sobró del día para que los vecinos pasen por ello.

Esta es una versión de prueba, solo para quienes la están probando. Por ahora puedes crear tu cuenta, registrar tu cocina con su punto exacto en el mapa y publicar platillos o bolsas sorpresa, con el horario en que pueden pasar. Los vecinos todavía no ven lo que publicas: lo verán en Itacate, la app de Wera para vecinos.

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
Itacate es la app de Wera para vecinos.

Esta es una versión de prueba, solo para quienes la están probando: por ahora muestra un mapa y nada más. La iremos llenando con actualizaciones.

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

Provisional, like the apps' icons: Wera's cow on each app's own ground (green, blue). The
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

**Itacate:** Play asks ***Is any part of your app restricted?*** → **No** — there is no sign-in,
nothing to pay and nothing locked. ⚠️ It becomes **Yes** when `10.5` adds Itacate's sign-up.

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
On the first screen tap "¿Ya tienes cuenta? Entrar" (under the "Crear cuenta" button), then sign in with the email and password. No second factor. The account owns a demo kitchen, so the app opens on it; "Publicar lo que te sobra" publishes dishes. Nothing a kitchen publishes is shown to anyone yet. The app is in Spanish.
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
| Users interact or exchange content with other users | **No** — not yet: what a kitchen publishes reaches nobody until `10.5`, which answers it again for both apps |
| Shares the user's location with others | **No** — not yet: a kitchen's pin is shown to neighbours from `10.5` |
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
| Can users ask for some data to be deleted without deleting the account? | **No** — leave the optional link empty |
| *Can users login to your app with accounts created outside of the app?* | **Yes** — one login serves Wera and Wera Cocina (ADR-035 §2.7): an account made in Wera opens Wera Cocina |

**Data types** — tick exactly these ten:

| Section | Data type | What it is in Wera Cocina |
|---|---|---|
| Personal info | **Name** | The name and surname typed at sign-up, or Google's; her name as her kitchen's owner |
| Personal info | **Email address** | The account's email |
| Personal info | **User IDs** | The account id, and Google's account id for a sign-in with Google |
| Personal info | **Address** | Her kitchen's address — a home when the kitchen is in one |
| Location | **Precise location** | Her kitchen's pin, tapped on the map and kept to six decimals. ⚠️ Not the phone's location — the app has no location permission — but Google's definition is the *"user or device physical location within an area less than 3 square kilometers"*, and the pin may be her home; Google's page says nothing of a place the user picks, so both this and *Address* are declared |
| App activity | **Other user-generated content** | What she publishes — each dish or surprise bag, its description, tags, price, count and usual price, and the pickup window — and her kitchen's name and line of directions |
| Device or other IDs | **Device or other IDs** | The random install id sent to Expo with each update check; the Maps SDK's own pseudonymous id; Firebase's installation id and push token (Android) |
| App activity | **App interactions** | The map's panning and zooming, which Google's Maps SDK reports |
| App info and performance | **Crash logs** | The Maps SDK's stack traces when it crashes |
| App info and performance | **Diagnostics** | The Maps SDK's crash metrics and request metadata (phone model, Android version) |

**For every one of the ten:**

| Question | Answer |
|---|---|
| Is this data collected, shared, or both? | **Collected** — Supabase, Expo and Google are the app's service providers, and nothing is shown to another user yet. ⚠️ `10.5` answers it again: neighbours see a kitchen's pin and publications, which Google may count as a transfer *"based on a specific user-initiated action, where the user reasonably expects the data to be shared"* (not sharing) |
| Is this data processed ephemerally? | **No** |
| Is this data required, or can users choose? | **Required** — a kitchen cannot be registered without its address and pin |

**Why it is collected:**

| Data type | Purposes |
|---|---|
| Name | App functionality · Account management |
| Email address | App functionality · Account management · Developer communications |
| User IDs | App functionality · Account management |
| Address | App functionality |
| Precise location | App functionality |
| Other user-generated content | App functionality |
| Device or other IDs | App functionality · Analytics |
| App interactions | Analytics |
| Crash logs | Analytics |
| Diagnostics | Analytics |

*Developer communications* on the email: the aviso promises an email before any change to which
data is used, or for what (its section 11) — before Itacate shows a kitchen to neighbours, first.

**Not ticked, and why:** *Phone number* — no account carries one, and a kitchen's phone is not
asked (Wera declares one ahead of use by the owner's ruling of 2026-10-21 for Wera; nothing ruled
it for Wera Cocina). *Financial info* — a price she sets for her own dish is her offer, written
under *Other user-generated content*; nothing is paid in the app and no card or bank detail is
asked (Google: *"Other financial info: … such as user salary or debts"*). *Photos* — the camera is
in the build and not used yet (`10.6`). Approximate location, contacts, files, messages, health,
web browsing — none read.

### Data safety — Itacate

**Data collection and security**

| Question | Answer |
|---|---|
| Does your app collect or share any of the required user data types? | **Yes** |
| Is all of the user data collected by your app encrypted in transit? | **Yes** |
| Account creation | **My app does not allow users to create an account** |
| *Can users login to your app with accounts created outside of the app?* | **No** — there is no login at all yet. ⚠️ **Yes** once `10.5` adds sign-in: one login serves all three apps (ADR-035 §2.7) |

**Data types** — tick exactly these four. None comes from something the person types: they are
what the update check, Google's map and Firebase send on their own.

| Section | Data type | What it is |
|---|---|---|
| Device or other IDs | **Device or other IDs** | The random install id sent to Expo with each update check; the Maps SDK's own pseudonymous id; Firebase's installation id and push token (Android) |
| App activity | **App interactions** | The map's panning and zooming, which Google's Maps SDK reports |
| App info and performance | **Crash logs** | The Maps SDK's stack traces when it crashes |
| App info and performance | **Diagnostics** | The Maps SDK's crash metrics and request metadata (phone model, Android version) |

**For every one of the four:**

| Question | Answer |
|---|---|
| Is this data collected, shared, or both? | **Collected** |
| Is this data processed ephemerally? | **No** |
| Is this data required, or can users choose? | **Required** |

**Why it is collected:**

| Data type | Purposes |
|---|---|
| Device or other IDs | App functionality · Analytics |
| App interactions | Analytics |
| Crash logs | Analytics |
| Diagnostics | Analytics |

⚠️ **What stands behind the technical answers, in both apps**: Expo's update check
(`expo-updates` sends `EAS-Client-ID`, as for Wera); Google's *Prepare for Google Play's data
disclosure requirements* for the Maps SDK for Android, read 2026-10-27; Firebase's documentation,
which generates a push token at launch unless told not to. *Collected* rather than *shared* treats
Google and Expo as the apps' service providers, as Wera's answers treat Supabase and Expo; Google's
page does not say which it is for its own SDK. **Not ticked for Itacate:** location (it does not
read it), personal info, photos, financial info, messages, contacts, files, health.

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

## 6. Closed testing — the release

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
