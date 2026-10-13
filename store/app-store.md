# App Store — every field, in the order App Store Connect asks

Written by plan task `5R-d-iv-a` (2026-10-13). **Nothing here has been entered anywhere**: no
app record exists yet. The record, the screenshots and the submission are `5R-d-iv-c` and
`5R-e`, after your review (`8g`) and the site (`5R-m`). Sign in with Apple (`5R-k`) is built;
it works on a phone once the steps in the handbook's *Turning on Entrar con Apple* are done. Why
each answer is what it is: [`README.md`](README.md), *What each answer stands on*.

⚠️ A block marked `<!-- max:N -->` has a limit of N characters; `<!-- max-bytes:N -->` is
counted in bytes, where an accented letter is two.

---

## 1. New app — the record

| Field | Answer |
|---|---|
| Platform | **iOS** |
| Name | `Wera: tu tienda` |
| Primary language | **Spanish (Mexico)** |
| Bundle ID | `mx.wera.app` |
| SKU | `wera-mx` — never shown to anybody, and **it cannot be changed once the app is added** |
| User access | Full access |

⚠️ **The bundle id is not fixed by creating the record. It is fixed by the first build
uploaded to it** (Apple: *"You can't change this property after you upload a build"*). Ask
before that upload.

## 2. App information

**Name**

<!-- max:30 -->
```
Wera: tu tienda
```

**Subtitle**

<!-- max:30 -->
```
Ventas y compras de tu tienda
```

| Field | Answer |
|---|---|
| Category | Primary **Business**; secondary **Productivity** |
| Content rights | **No**, it does not contain, show or access third-party content |
| Age rating | section 5 below |
| Privacy Policy URL | `https://tu-wera.com/privacidad/` |

## 3. Pricing and availability

| Field | Answer |
|---|---|
| Price | **Free** |
| Availability | **Mexico** only — untick every other country |
| Digital Services Act | ***This is not a trader account*** — Apple asks even when nothing is sold in the EU, and an app sold only outside it is not a trader's |

## 4. The version page

**Promotional text**

<!-- max:170 -->
```
Registra lo que vendes, lo que compras y lo que se echa a perder, también sin señal. Hecha para tiendas pequeñas en México.
```

**Description**

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

Ayuda: ayuda@tu-wera.com
```

**Keywords**

<!-- max-bytes:100 -->
```
tienda,punto de venta,abarrotes,ventas,caja,tiendita,negocio,compras,merma,proveedores,pos
```

| Field | Answer |
|---|---|
| Support URL | `https://tu-wera.com/` |
| Marketing URL | leave empty |
| Copyright | `2026` and your legal name, as the aviso prints it. **Not written in this repository** |
| Screenshots | `5R-d-iv-c`. Required: at least one for *iPhone with Dynamic Island (medium display)*, 1179 × 2556 or 1206 × 2622. Add the large set too (1290 × 2796 or 1320 × 2868): Apple's page still calls it required in one row |

## 5. Age rating

**Step 1, in-app controls and capabilities — select none.** No parental controls, no age
assurance, no unrestricted web access (the only pages Wera opens are its own aviso and
Google's sign-in), no user-generated content shown to the public, no social media, no
messaging or chat, no advertising.

**Step 2, content — *None* for every line, except one:**

| Line | Answer |
|---|---|
| Alcohol, Tobacco, or Drug Use or References | ⚠️ **Infrequent** — the starter catalog for *Abarrotes* names cigarettes by brand and has a *Cerveza y licores* category. Names in a list; no pictures, no use, nothing sold to the user |
| Everything else (profanity, horror, medical, sexuality, violence, weapons, gambling, contests, loot boxes) | **None** |

**Step 3, age categories and override — Not Applicable.**

## 6. App privacy

*Do you or your third-party partners collect data from this app?* **Yes.**

| Data type | Purposes | Linked to the user | Tracking |
|---|---|---|---|
| Contact Info → **Name** | App Functionality | Yes | No |
| Contact Info → **Email Address** | App Functionality | Yes | No |
| Identifiers → **User ID** | App Functionality | Yes | No |
| Identifiers → **Device ID** | App Functionality | **No** | No |
| Purchases → **Purchase History** | App Functionality · **Analytics** | Yes | No |
| Financial Info → **Other Financial Info** | App Functionality | Yes | No |
| User Content → **Other User Content** | App Functionality | Yes | No |

What each one is in Wera is the same as Google's table ([`google-play.md`](google-play.md),
*Data safety*). *Device ID* is the random id each install sends to Expo when it checks for an
update; nothing ties it to an account, so it is not linked. ⚠️ *Analytics* is the daily count
per shop, and comes off if the open question in the plan's ⛔ DECISIONS OWED is ruled the other
way. ⚠️ **`5R-k` changed nothing in this table**: Apple's identifier is a User ID and its relay
address is an Email Address. The code Apple hands over at a deletion is spent in one request
and never stored, so it is not *collected*.

**Not declared, and why:** *Usage Data* and *Diagnostics* — the pilot's measurements are not
in the store build and there is no crash library. *Contacts* means the phone's address book,
which Wera never reads; a supplier's phone is the shop's own record and sits under *Other
User Content*. *Location*, *Photos*, *Health*, *Browsing History*, *Search History*,
*Sensitive Info* — none.

## 7. App Review information

| Field | Answer |
|---|---|
| Sign-in required | **Yes** — the demo account's email and password. You make it in the app; **never write the password here**. It must not expire |
| Contact | your name, phone and email. **Not written in this repository** |

**Notes** (English, for the reviewer):

<!-- max:4000 -->
```
Wera is a point-of-sale and stock-record app for small shops in Mexico. The interface is in Spanish.

The demo account owns a shop with products already loaded. To record a sale: tab "Vender", tap + on a product, open the basket ("Total") and confirm. "Comprar" records a delivery from a supplier and "Desperdicio" records a write-off. "Inicio" has the catalog, the last seven days, suppliers, reports ("Números") and settings ("Ajustes").

Wera processes no payments: it only records sales a shop made in cash. There are no in-app purchases and no ads.

Account deletion is in the app: Inicio > Ajustes > Tu cuenta > Eliminar mi cuenta. Please do not delete the demo account; create a new one with "Crear una" on the sign-in screen to test deletion.

"Entrar con Google" opens Google's sign-in in the system browser sheet. Sign in with Apple is the system button directly under it.

Deleting an account that was made with Sign in with Apple shows Apple's sheet once more, so the app can revoke its Sign in with Apple tokens through Apple's REST API before the account is deleted.
```

⚠️ The last two paragraphs are true only on a build made after `5R-k` merged, **and** once
Supabase's Apple provider is on and the function `apple-revoke` is deployed with its key
(`bash docs/checks/5R-k-function-deployed.sh`). Until then Apple's guideline 4.8 is not met.
⚠️ The button's words are Apple's and follow the phone's language: *Continuar con Apple* on a
phone in Spanish, *Continue with Apple* on a reviewer's.

## 8. Export compliance

*Does your app use encryption?* It uses only HTTPS and hashing, which are exempt.
`ITSAppUsesNonExemptEncryption: false` is in `app/app.json` since `5R-k`, so a build made after
it is not asked the question again.
