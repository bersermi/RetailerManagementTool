# Google Play — every field, in the order Play Console asks

Written by plan task `5R-d-iv-a` (2026-10-13). Paste from here; the handbook's *Putting Wera on
Google Play's closed test* says which screen each block goes on. Why each answer is what it is:
[`README.md`](README.md), *What each answer stands on*.

**This is the listing for the CLOSED TEST.** Only the testers you add can see it. The text and
the screenshots are today's look and are replaced before production is requested (`5R-d-iv-c`).
⚠️ **The first upload is the bundle built with the cow on its icon** (the owner's rulings of 2026-10-13); `store/README.md` says which one.

⚠️ A block marked `<!-- max:N -->` has a limit of N characters in Play Console. After editing
one, run `python3 store/limits.py`.

---

## 1. Create app

| Field | Answer |
|---|---|
| App name | `Wera: tu tienda` |
| Default language | **Spanish (Latin America) – es-419** |
| App or game | **App** |
| Free or paid | **Free** |
| Declarations | tick both (Developer Program Policies, US export laws) |

⚠️ **Nothing here fixes the package name.** That happens in step 6, when the app bundle is
uploaded: from that moment `mx.wera.app` belongs to this app for ever.

## 2. Main store listing

**App name**

<!-- max:30 -->
```
Wera: tu tienda
```

**Short description**

<!-- max:80 -->
```
Registra las ventas, compras y desperdicio de tu tienda. Funciona sin señal.
```

**Full description**

<!-- max:4000 -->
```
Wera es la app para llevar tu tienda desde el teléfono: lo que vendes, lo que compras y lo que se echa a perder.

Está hecha para tiendas pequeñas en México: pollerías, carnicerías, verdulerías, fruterías, abarrotes, cremerías y materias primas. Pesos, IVA y venta por kilo, por pieza, por litro o por manojo.

VENDER
Busca el producto, pon la cantidad y registra la venta en segundos. Funciona sin señal: Wera guarda las ventas en el teléfono y las envía cuando vuelve la conexión.

COMPRAR
Registra lo que te entrega cada proveedor y cuánto te costó. En Costos ves cómo ha cambiado lo que pagas por cada producto, y lo puedes compartir en PDF.

DESPERDICIO
Anota lo que se tiró y por qué, para saber cuánto se pierde.

PRODUCTOS
Tu catálogo con sus precios. Para empezar, Wera te pone los productos de tu giro y tú quitas los que no vendes.

NÚMEROS
Lo que vendiste por día, por semana o por mes, con IVA. Compara el precio de compra y el de venta de cada producto, y descarga el mes en hoja de cálculo o en PDF.

TU EQUIPO
Invita con un código a quien trabaja contigo. Cada persona entra con su cuenta, y la tienda sabe quién registró cada venta, compra o desperdicio.

SI TE EQUIVOCAS
Corrige o elimina una venta, una compra o un desperdicio de los últimos siete días. El registro se conserva.

TUS DATOS
Sin anuncios. No vendemos tus datos. Puedes eliminar tu cuenta desde la app cuando quieras.

Wera está en prueba con unas cuantas tiendas. Cuéntanos qué le falta: ayuda@tu-wera.com

Aviso de privacidad: https://tu-wera.com/privacidad/
```

**Graphics** — the files are in [`google-play/`](google-play/):

| Play asks for | File | What it is |
|---|---|---|
| App icon, 512 × 512 PNG | `icono-512.png` | The app's icon since 2026-10-13: a cream cow on a rust square, drawn by `brand/render-icons.sh` |
| Feature graphic, 1024 × 500 | `grafico-1024x500.jpg` | The mark and the word *Wera*, in rust on cream. Its source is `grafico.html` |
| Phone screenshots (2 to 8) | `captura-1-inicio.jpg` … `captura-5-productos.jpg`, in that order | 1080 × 1920, from an Android emulator on the invented seed shop *Tienda Doña Lupe*. No real shop's data |

Leave the tablet, Chromebook and video fields empty.

## 3. Store settings

| Field | Answer |
|---|---|
| App category | **Business** |
| Tags | *Business*, and *Productivity* if offered |
| Email address | `ayuda@tu-wera.com` |
| Website | `https://tu-wera.com/` |
| Phone number | leave empty |
| External marketing | off |

## 4. App content

Play Console lists these under *Policy → App content*. Each has to read *Completed*.

### Privacy policy

```
https://tu-wera.com/privacidad/
```

### App access

**All or some functionality is restricted** → *Add instructions*:

| Field | Answer |
|---|---|
| Instruction name | `Cuenta de demostración` |
| Username | the demo account's email — you make it (handbook, step 2) |
| Password | its password. **Never write it in this repository** |
| No other information is required | tick it |

<!-- max:500 -->
```
Sign in with email and password on the first screen (Entrar). No second factor. The account owns a demo shop with products already loaded. The app is in Spanish.
```

### Ads

**No, my app does not contain ads.**

### Content rating

| Question | Answer |
|---|---|
| Email | `ayuda@tu-wera.com` |
| Category | **All other app types** (not a game, not social or communication) |
| Violence, blood, fear | **No** to all |
| Sexuality, nudity | **No** to all |
| Offensive language | **No** |
| Gambling, real or simulated | **No** |
| Illegal drugs | **No** |
| Alcohol or tobacco | ⚠️ **If it asks about references to them: Yes.** The starter catalog for *Abarrotes* names cigarettes by brand and has a *Cerveza y licores* category. **If it asks about use, promotion or sale to the user: No.** Wera records what a shop sells; it sells nothing |
| Users interact or exchange content with other users | **No** — people in one shop share its records; there is no messaging and nothing public |
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
| Which methods of account creation does your app support? | **Username and password**, and **OAuth** |
| Delete account URL | `https://tu-wera.com/eliminar-cuenta/` |
| Can users ask for some data to be deleted without deleting the account? | **No** — leave the optional link empty |

**Data types** — tick exactly these seven:

| Section | Data type | What it is in Wera |
|---|---|---|
| Personal info | **Name** | The name and surname typed at sign-up, or Google's; the name shown in the shop |
| Personal info | **Email address** | The account's email |
| Personal info | **User IDs** | The account id, and Google's account id for a Google sign-in |
| Financial info | **Purchase history** | Every sale, purchase and write-off the shop records |
| Financial info | **Other financial info** | Prices, costs and the shop's takings |
| App activity | **Other user-generated content** | The catalog, and each supplier's name, contact, phone and address |
| Device or other IDs | **Device or other IDs** | The random id each install sends to Expo when it checks for an update |
| Photos and videos | **Photos** | ⚠️ **Since `8m`:** the photos of a product a shop sends with *Te lo compro* |
| Personal info | **Address** | ⚠️ **Since `8k`:** the store's address, which is a home when the shop is in one; asked for *Te lo compro* |

**For every one of the nine** — ⚠️ the two `8m` rows apply from the first store build that carries the camera:

| Question | Answer |
|---|---|
| Is this data collected, shared, or both? | **Collected** only — Supabase and Expo are service providers — ⚠️ **except Photos: collected and shared.** When Wera offers a product to a buyer it shows the photos with the shop's name (the aviso's section 5, the owner's answer of 2026-10-17) |
| Is this data processed ephemerally? | **No** |
| Is this data required, or can users choose? | **Required** |

**Why it is collected** — tick these purposes:

| Data type | Purposes |
|---|---|
| Name | App functionality · Account management |
| Email address | App functionality · Account management · Developer communications |
| User IDs | App functionality · Account management |
| Purchase history | App functionality · **Analytics** |
| Other financial info | App functionality |
| Other user-generated content | App functionality |
| Device or other IDs | App functionality |
| Photos | App functionality |
| Address | App functionality |

⚠️ ***Analytics* on Purchase history is the daily count per shop** (`docs/runbooks/engagement.sql`),
which counts every shop in the database. It stays: on 2026-10-14 the owner ruled that the count
covers every version, store builds included, and the aviso says so (finalidad 9).

**Not ticked, and why:** location, contacts, files, messages, health, web browsing —
Wera reads none of them and sends none off the phone. Photos are only the ones taken with the
camera for *Te lo compro*; the phone's gallery is never read. *App interactions*, *Crash logs* and
*Diagnostics* — the pilot's measurements are not in the store build, and there is no crash or
analytics library. *Phone number* — a supplier's phone is the shop's record, not the user's.

### Government apps

**No.**

### Financial features

**My app doesn't provide any financial features.** Wera records a shop's own cash sales; it
moves no money, lends nothing and takes no payment.

### Health

**My app does not have any health features.**

### Advertising ID

**No**, the app does not use an advertising ID.

## 5. Closed testing — the track

| Field | Answer |
|---|---|
| Track | the default closed track (*Closed testing – Alpha*) |
| Countries / regions | **Mexico** only |
| Testers | an email list named `Wera – prueba cerrada`, with the testers' Gmail addresses. **Not in this repository** |
| Feedback URL or email | `ayuda@tu-wera.com` |

## 6. Closed testing — the release

Upload the `.aab` (handbook, step 4). Accept Play App Signing when it offers.

| Field | Answer |
|---|---|
| Release name | leave what Play fills in |

**Release notes** (es-419):

<!-- max:500 -->
```
Primera versión de prueba de Wera: vender, comprar, registrar desperdicio, catálogo por giro y números de venta.
```

Then *Next → Save → Send for review*.

## 7. When the 14 days are over — the questions Google asks

Applying for production opens a form about the test. Keep notes during the 14 days so these are
quick to answer: was it easy to find testers; did they use every part of the app; did they use
it the way a shop would; what did they tell you and how did you collect it; what did you change
because of it; and how did you decide it was ready. Google's review of that form usually takes
seven days or less.
