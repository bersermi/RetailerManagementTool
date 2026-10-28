# Google Play — Wera Cocina and Itacate, the test versions

Written by plan task `10.2b` (2026-10-27), on the shape of [`google-play.md`](google-play.md), Wera's.
Paste from here, **once per app**: where the two differ, the field gives both. The handbook's
*Before the two new apps' first builds* is the order of work.

**These are the listings for the CLOSED TESTS** of two skeleton apps: one screen, a map, nothing
else. Only the testers you add see them. The text and pictures are replaced before production
is requested (`10.4`, `10.5`).

⚠️ **The upload in section 6 makes the id permanent**: `mx.wera.cocina` and `mx.wera.vecino`,
the owner's yes of 2026-10-27.

⚠️⚠️ **WHEN A LATER VERSION STARTS COLLECTING ANYTHING ELSE — an account, the location, photos,
notifications — section 4's *Data safety* changes FIRST, with the privacy page, before that
version ships.** An over-the-air update passes no Google review, so nothing else will remind
anyone.

⚠️ A block marked `<!-- max:N -->` has a limit of N characters. After editing one, run
`python3 store/limits.py`.

---

## 1. Create app

| Field | Wera Cocina | Itacate |
|---|---|---|
| App name | `Wera Cocina` | `Itacate` |
| Default language | **Spanish (Latin America) – es-419** | same |
| App or game | **App** | same |
| Free or paid | **Free** | same |
| Declarations | tick both | same |

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
Wera Cocina es la app de Wera para fondas y cocinas.

Esta es una versión de prueba, solo para quienes la están probando: por ahora muestra un mapa y nada más. La iremos llenando con actualizaciones.

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
| Phone screenshots (2 to 8) | `cocina-captura-1.png`, `cocina-captura-2.png` | `itacate-captura-1.png`, `itacate-captura-2.png` |

Provisional, like the apps' icons: Wera's cow on each app's own ground (green, blue). Leave the
tablet, Chromebook and video fields empty.

## 3. Store settings

| Field | Wera Cocina | Itacate |
|---|---|---|
| App category | **Business** | **Food & Drink** |
| Email address | `ayuda@tu-wera.com` | same |
| Website | `https://tu-wera.com/` | same |
| Phone number | leave empty | same |
| External marketing | off | same |

## 4. App content

The same answers for both apps.

### Privacy policy

```
https://tu-wera.com/privacidad/cocina-e-itacate/
```

### App access

**All functionality in my app is available without any access restrictions** — there is no
sign-in yet.

### Ads

**No, my app does not contain ads.**

### Content rating

| Question | Answer |
|---|---|
| Email | `ayuda@tu-wera.com` |
| Category | **All other app types** |
| Violence, blood, fear; sexuality, nudity; offensive language; gambling; drugs; alcohol or tobacco | **No** to all |
| Users interact or exchange content with other users | **No** — not yet |
| Shares the user's location with others | **No** |
| Lets users buy digital goods | **No** |
| Is a web browser or a search engine | **No** |

### Target audience and content

| Question | Answer |
|---|---|
| Target age | **18 and over**, and no other group |
| Could it appeal to children | **No** |

### Data safety

**Data collection and security**

| Question | Answer |
|---|---|
| Does your app collect or share any of the required user data types? | **Yes** |
| Is all of the user data collected by your app encrypted in transit? | **Yes** |
| Account creation | **My app does not allow users to create an account** |

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

⚠️ **What stands behind these answers**: Expo's update check (`expo-updates` sends
`EAS-Client-ID`, as for Wera); Google's *Prepare for Google Play's data disclosure requirements*
for the Maps SDK for Android, read 2026-10-27; Firebase's documentation, which generates a push
token at launch unless told not to. *Collected* rather than *shared* treats Google and Expo as
the apps' service providers, as Wera's answers treat Supabase and Expo; Google's page does not
say which it is for its own SDK. **Not ticked:** location (neither version reads it), personal
info, photos (Cocina's camera is not used yet), financial info, messages, contacts, files, health.

### Government apps · Financial features · Health · Advertising ID

**No** · **No financial features** · **No health features** · **No advertising ID** — neither APK
declares `AD_ID` (read with `aapt2`, 2026-10-27).

## 5. Closed testing — the track

| Field | Answer |
|---|---|
| Track | the default closed track |
| Countries / regions | **Mexico** only |
| Testers | the same email list as Wera's (`Wera – prueba cerrada`) if Play offers it; otherwise the same twelve Gmail addresses. **Not in this repository** |
| Feedback URL or email | `ayuda@tu-wera.com` |

## 6. Closed testing — the release

Upload the app's `.aab`. Accept Play App Signing when it offers. Then *Next → Save → Send for
review*.

**Release notes** (es-419):

<!-- max:500 -->
```
Primera versión de prueba: por ahora, un mapa.
```

**After the first upload:** *Test and release → App integrity → App signing* shows the app
signing key's **SHA-1**. Give it to the session: it goes, with the upload key's, into the map
key's *Application restrictions* in Google Cloud, so the key works only for these two apps.
