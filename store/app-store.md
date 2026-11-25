# App Store — every field, in the order App Store Connect asks

Written by plan task `5R-d-iv-a` (2026-10-13). ⚠️ **Since 2026-10-21 the record exists, and it is
not the one section 1 describes:** `eas submit` of build 3 (`d0246560`) went to the record holding
`mx.wera.app`, Apple ID **`6818418895`**, named *Wera* — while the owner had filled in a second
record, *Wera: tu tienda* (`6825377325`), under another bundle id. The build cannot move, so
`6818418895` is kept (renamed, its primary language set to Spanish (Mexico), its pages filled
again) and the other is removed. Its SKU is **`WERA-IOS-001`**, not `wera-mx` (he read it
2026-10-21) — typed by a person, so the record predates the upload; it cannot change and is
never shown.
⚠️ **Pinned in `app/eas.json` since `5R-o`** (`ascAppId`, so `eas submit` needs no terminal): an
`ascAppId` there CHANGES THE UPDATE RUNTIME (measured 2026-10-21: iOS `d308ba9f…` → `0588fb66…`,
Android `5a4a7a5d…` → `1d7f904c…`), so it went in only with 1.1, whose runtime was moving anyway.
The record, the screenshots and the submission were `5R-d-iv-c` and `5R-e`, after your review
(`8g`) and the site (`5R-m`); the next screenshots are `5R-q`'s. Sign in with Apple (`5R-k`) is built;
it works on a phone once the steps in the handbook's *Turning on Entrar con Apple* are done. Why
each answer is what it is: [`README.md`](README.md), *What each answer stands on*.

⚠️ A block marked `<!-- max:N -->` has a limit of N characters; `<!-- max-bytes:N -->` is
counted in bytes, where an accented letter is two.

---

## 1. New app — the record

| Field | Answer |
|---|---|
| Platform | **iOS** |
| Name | `Wera: tu tienda` when the record was made; `Wera Tienda` from Wera's next version (`13.4`, section 2) |
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
Wera Tienda
```

⚠️ **Was `Wera: tu tienda` until `13.3` wrote this block; the record still shows that name until Wera's next version (`13.4`)** — the owner's naming ruling of 2026-11-22. Read at `13.1`: the field is greyed out while 1.1 is *Ready for Distribution*, so it changes in the next version's *App Information*. Spanish (Mexico) is the record's only localization.

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
Wera Tienda es la app para llevar tu tienda desde el teléfono: lo que vendes, lo que compras y lo que se echa a perder.

Está hecha para tiendas pequeñas en México: pollerías, carnicerías, verdulerías, fruterías, abarrotes, cremerías y materias primas. Pesos, IVA y venta por kilo, por pieza, por litro o por manojo.

VENDER
Busca el producto, pon la cantidad y registra la venta en segundos. Funciona sin señal: Wera Tienda guarda las ventas en el teléfono y las envía cuando vuelve la conexión.

COMPRAR
Registra lo que te entrega cada proveedor y cuánto te costó. En Costos ves cómo ha cambiado lo que pagas por cada producto, y lo puedes compartir en PDF.

MERMA
Anota lo que ya no vas a vender y por qué, para saber cuánto se pierde.

PRODUCTOS
Tu catálogo con sus precios. Para empezar, Wera Tienda te pone los productos de tu giro y tú quitas los que no vendes.

NÚMEROS
Lo que vendiste por día, por semana o por mes, con IVA. Compara el precio de compra y el de venta de cada producto, y descarga el mes en hoja de cálculo o en PDF.

TU EQUIPO
Invita con un código a quien trabaja contigo. Cada persona entra con su cuenta, y la tienda sabe quién registró cada venta, compra o merma.

SI TE EQUIVOCAS
Corrige o elimina una venta, una compra o una merma de los últimos siete días. El registro se conserva.

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
| Screenshots | [`app-store/`](app-store/), six per size, in file order — the folder by the box's title: `iphone-6.9/` (1320 × 2868) for *iPhone with Dynamic Island (large display)*, `iphone-6.5/` (1284 × 2778) for *iPhone with Face ID (large display)*, the 6.5-inch box, which is the required one when no 6.9-inch set is given; `iphone-6.3/` (1206 × 2622) for *Dynamic Island (medium display)*. One large set is enough: Apple scales it down. Taken 2026-10-21 on an invented shop; no real shop's data. ⚠️ **The first of each set, the welcome, retaken 2026-11-23 (`13.4`)**: it says *Wera Tienda* (section 10). ⚠️ **The 6.5-inch box refuses 1320 × 2868 as *"File dimensions are invalid"*** (his upload, 2026-10-21), hence `iphone-6.5/`: the large set scaled to 1284 wide and 6 px cut from top and bottom |

## 5. Age rating

**Step 1, in-app controls and capabilities — select none.** No parental controls, no age
assurance, no unrestricted web access (the only pages Wera opens are its own aviso and
Google's sign-in), no user-generated content shown to the public, no social media, no
messaging or chat, no advertising.

**Step 2, content — *None* for every line, except one:**

| Line | Answer |
|---|---|
| Alcohol, Tobacco, or Drug Use or References | **None** — since `0066` (2026-10-20, the owner's correction) the starter catalog carries no beer, liquor, cigarettes or pet products. Was *Infrequent* while it named cigarettes and *Cerveza y licores* |
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
| User Content → **Photos or Videos** | App Functionality | Yes | No |
| Contact Info → **Physical Address** | App Functionality | Yes | No |
| Contact Info → **Phone Number** | App Functionality | Yes | No |

What each one is in Wera is the same as Google's table ([`google-play.md`](google-play.md),
*Data safety*). *Device ID* is the random id each install sends to Expo when it checks for an
update; nothing ties it to an account, so it is not linked. ⚠️ *Analytics* is the daily count
per shop, which covers every version since the owner's ruling of 2026-10-14 (the aviso's
finalidad 9). ⚠️ **`5R-k` changed nothing in this table**: Apple's identifier is a User ID and its relay
address is an Email Address. The code Apple hands over at a deletion is spent in one request
and never stored, so it is not *collected*.

⚠️ ***Phone Number* is his ruling of 2026-10-21, against the session's advice:** ***"I kept the phone
number, for future additions."*** Today the only phone Wera stores is a supplier's, typed by the
shop (`provider.phone`, under *Other User Content*); accounts carry none. Declared ahead of use,
it is harmless to review; Google's form declares it too, so the two stores agree.

**Not declared, and why:** *Usage Data* and *Diagnostics* — the pilot's measurements are not
in the store build and there is no crash library. *Contacts* means the phone's address book,
which Wera never reads; a supplier's phone is the shop's own record and sits under *Other
User Content*. *Location*, *Health*, *Browsing History*, *Search History*,
*Sensitive Info* — none. *Photos or Videos* is the photo an owner or manager takes of a product the
shop created (since `8o`; optional; its members see it), and *Physical Address* the store's address
(a home, when the shop is in one), given in *Ajustes* when the shop wants to. ⚠️ **Both stay declared
in 1.1 (`5R-o`, read again 2026-11-17):** *Te lo compro*, which also took photos and asked for the
address first, is paused since `10.0a` — paused, not removed, and an update can bring it back — and
both are still collected.

## 7. App Review information

| Field | Answer |
|---|---|
| Sign-in required | **Yes** — the demo account's email and password. You make it in the app; **never write the password here**. It must not expire |
| Contact | your name, phone and email. **Not written in this repository** |

**Notes** (English, for the reviewer):

<!-- max:4000 -->
```
Wera Tienda is a point-of-sale and stock-record app for small shops in Mexico. The interface is in Spanish.

The demo account owns a shop with products already loaded. The first time an account opens its shop on a phone, a one-minute tour ("Conoce Wera Tienda") opens by itself; "Saltar" closes it. To record a sale: tab "Vender", tap + on a product, open the basket ("Total") and confirm. "Comprar" records a delivery from a supplier. "Merma" opens on three doors: "Tirar" records a write-off; the two marked "Próximamente" ("Te lo compro", "Ofrecer a las cocinas") are services we offer to shops later, shown so a shop knows they are coming, and open nothing yet. "Inicio" has the catalog, the last seven days, suppliers, reports ("Números") and settings ("Ajustes").

Wera processes no payments: it only records sales a shop made in cash. There are no in-app purchases and no ads.

To sign in to the demo account: on the first screen tap "¿Ya tienes cuenta? Entrar" (under the two large buttons), then type the email and password.

Account deletion is in the app: Inicio > Ajustes > Tu cuenta > Eliminar mi cuenta. Please do not delete the demo account; to test deletion, make a new account: tap "Abrir mi tienda" on the first screen, create the account, then delete it from the screen that follows ("Eliminar mi cuenta", at its foot) or after creating the shop.

"Continuar con Google" opens Google's sign-in in the system browser sheet. Sign in with Apple is the system button directly under it, on the account screen after either of the first screen's two buttons.

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

## 9. Version 1.1.0 (`5R-o`)

The handbook's *Wera 1.1 in both stores* has the steps. App Store Connect copies the 1.0 version's
description, keywords, promotional text, screenshots and review information into a new version; only
these change.

**What's New in This Version** — the same words as Play's release notes (`google-play.md`, section 9):

<!-- max:4000 -->
```
Novedades de Wera 1.1:
• Quien entra como Empleado ve solo su trabajo: Vender, Comprar, Merma y lo que registró.
• Conoce Wera: un recorrido de un minuto para el dueño y el encargado, y uno más corto para el empleado.
• Los arreglos que nos pidieron las tiendas.
```

**App Review notes:** section 7's, pasted again — since 2026-11-17 they name the tour that opens on a
new phone.

**Read again on 2026-11-17, nothing else changes:** the description, subtitle and keywords name nothing
1.1 no longer does (they never named *Te lo compro*); the privacy answers (section 6) and the age
rating are unchanged. What a reviewer meets that 1.0's reviewer did not: the tour, and the iPhone's
camera question, which since 1.1 reads *Wera usa la cámara para tomar fotos de tus productos.*

## 10. Version 1.2.0 — *Wera Tienda* (`13.4`)

✅ **Sent for review 2026-11-25** (the owner's word), build 1.2.0 (6), automatic release on approval. The handbook's *Wera 1.2 in both stores* has the steps. App Store Connect copies 1.1's description,
keywords, promotional text, screenshots and review information into the new version; these change:

| Where | What |
|---|---|
| *App Information* → **Name** | section 2's block, **`Wera Tienda`** — greyed out while 1.1 alone was live (read at `13.1`); it opens with the new version |
| **Subtitle**, **Keywords**, **Promotional text** | unchanged — none names the app |
| **Description** | section 4's block, rewritten for *Wera Tienda* by `13.3` |
| **Screenshots** | replace the **first** of each set with the new `captura-1-bienvenida.jpg` in `app-store/iphone-6.9/`, `iphone-6.5/` and `iphone-6.3/` — the welcome, retaken from this version's code on 2026-11-23, saying *Wera Tienda*; the other five stay those of 2026-10-21 (new ones, styled, are `5R-q`'s) |
| **What's New** | the block below |
| **Build** | the 1.2.0 build the session names |
| **App Review notes** | section 7's block again — since `13.4` it says *Wera Tienda* and what Merma's doors are |

**What's New in This Version** — the same words as Play's release notes (`google-play.md`, section 10):

<!-- max:4000 -->
```
Novedades de Wera Tienda 1.2:
• Wera ahora se llama Wera Tienda, también bajo el ícono de tu teléfono.
• En Costos ves cuánto ha cambiado lo que pagas por cada producto en 15 días, 1, 3 y 6 meses y 1 año, en pesos y en porcentaje.
• Conoce Wera Tienda ahora también se pasa deslizando el dedo.
• Los arreglos que nos pidieron las tiendas.
```

**What a reviewer meets that 1.1's did not:** the name *Wera Tienda* under the icon and on the first
screen; the camera question, which reads *Wera Tienda usa la cámara para tomar fotos de tus productos.*;
and Merma opening on its doors (`5R-p`), two of them shut under *Próximamente*. ⚠️ **Guideline 2.1 asks
that temporary content be removed before review**, and a reviewer could read those two doors as that —
hence the sentence in the notes. If Apple refuses on it, the switch is one value
(`PROXIMAMENTE` in `app/src/navigation/pausa.ts`), sent over the air, and the version sent again; the
owner decides. The privacy answers (section 6) and the age rating are unchanged — 1.2 adds no library.

