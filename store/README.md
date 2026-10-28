# store/ — what goes into Play Console and App Store Connect

Written by plan task `5R-d-iv-a` (2026-10-13). Nothing in this folder is built, published or
read by the app: it is the text a person pastes into the two stores' consoles, and the
pictures Google asks for.

| File | What it is |
|---|---|
| [`google-play.md`](google-play.md) | Every Play Console field in the order the console asks: the listing, the store settings, each *App content* form, the closed track and its release |
| [`google-play/`](google-play/) | The 512 px icon, the feature graphic and its source, and six phone screenshots |
| [`app-store.md`](app-store.md) | Every App Store Connect field: the record, the listing text, the age rating, the privacy labels, the review notes. **Nothing in it has been entered anywhere** |
| [`app-store/`](app-store/) | The same six screenshots for the App Store at three iPhone sizes: `iphone-6.9/` 1320 × 2868, `iphone-6.5/` 1284 × 2778 (the 6.9 set scaled, 6 px cut top and bottom) and `iphone-6.3/` 1206 × 2622 |
| [`cocina-itacate.md`](cocina-itacate.md) | Play Console's fields for the **test versions of Wera Cocina and Itacate** (plan `10.2b`): the shared answers once, the two apps' differences side by side |
| [`cocina-itacate/`](cocina-itacate/) | Their provisional 512 px icons and feature graphics, drawn by `render.sh` from Wera's mark; and their phone screenshots |
| `limits.py` | Measures every pasted field against its store's limit |

**Where each stands.** Google Play's closed test has its text, forms and pictures ready; its
first upload is the bundle built with the cow on its icon, by the owner's rulings of 2026-10-13. The handbook's
*Putting Wera on Google Play's closed test* has the steps (`5R-d-iv-b`, the owner's hands). The
public listings — final text, final screenshots, the App Store record — are `5R-d-iv-c`, after
the owner's review (`8g`) and the logo (`5R-m`).

## The limits

`python3 store/limits.py` measures every block to be pasted against the limit written above
it, and names any that is over. On 2026-10-13 all eleven fit: Play's name 15 of 30, short
description 76 of 80, full description 1,543 of 4,000; Apple's name 15 of 30, subtitle 29 of
30, promotional text 123 of 170, description 1,426 of 4,000, keywords 90 of 100 bytes. It is
not in CI: a console refuses an over-long field the moment it is pasted.

## ⚠️ Never in this folder

The repository is public. The demo account's password, the testers' Gmail addresses, the
owner's legal name, phone and address are typed into the consoles and nowhere else.

## What each answer stands on

Change the app and the matching line here goes stale first. Nothing checks these files
against the code: this table is the only link, as `site/README.md` is for the aviso.

| The forms say | It stands on |
|---|---|
| Name, email, user id are collected, for the app to work and to manage the account | `site/README.md`'s first row (sign-up in `app/src/auth/AuthProvider.tsx`; GoTrue's `auth.users` and `auth.identities`) |
| *Developer communications* on the email | The aviso's section 9: a change to which data is used is announced to the account's email |
| The ledger as *Purchase history* and *Other financial info* | `sale`, `purchase`, `waste` and their lines; `price_list` and unit costs. The owner's ruling of 2026-10-10 (*the ledger as purchase/financial history*) |
| *Analytics* on purchase history | `docs/runbooks/engagement.sql` (`5P-b`), which counts every shop's records per day. Covers every version since the owner's ruling of 2026-10-14, and the aviso's finalidad 9 says so |
| The catalog and the suppliers as *Other user-generated content* | `product_family`, `product_variant`, `provider` (name, contact, phone, address). Google's *Contacts* and Apple's *Contacts* both mean the phone's address book, which the app never reads |
| A *Device or other ID* is collected (Apple: *Device ID*, not linked) | `expo-updates` sends a random per-install id to Expo on every update check; the aviso's *Datos técnicos de las actualizaciones* already says so. Google's definition names a *Firebase installation ID* as an example of the type |
| Nothing is *shared* | Supabase and Expo process data on Wera's behalf (the aviso's section 5). Google: a transfer to a service provider is not sharing |
| Encrypted in transit | `app/src/lib/env.ts` refuses a Supabase address that is not `https://`; the manifest of the store build does not allow cleartext (measured below) |
| No usage data, no diagnostics | `EXPO_PUBLIC_PILOT` is not in EAS's `production` environment, and the store build's bundle carries no label (measured below). `app/package.json` has no analytics or crash library |
| No location, contacts or microphone. ⚠️ **Since `8m`: the camera, for *Te lo compro*, and *Photos* and *Address* are declared** (drafted 2026-10-17 for his approval; they apply from the first store build that carries the camera). ⚠️ **Since `8o` the camera also takes a product's photo on Crear and Editar** (`0063`'s bucket `producto`), and the forms say so — ✅ **and since 2026-10-21 `app.json`'s camera sentence says both** (*para tomar fotos de tus productos y de lo que pides que Wera recoja*), changed with the build that follows it | `app.json`'s `expo-image-picker` entry: the camera's sentence, `photosPermission: false`, `microphonePermission: false`. `app/src/capture/photo.ts` opens the camera only, and re-encodes each photo, which drops its metadata (where it was taken). ⚠️ **Not yet measured on a store build**: the build below has no camera |
| No ads, no advertising id | No ad library in `app/package.json`; the store build's manifest has no `AD_ID` permission (measured below) |
| An account can be deleted in the app and by a web page | `5R-c` (*Ajustes → Tu cuenta → Eliminar mi cuenta*) and `tu-wera.com/eliminar-cuenta/` |
| Sign-up by *username and password* and by *OAuth* | Since `8g` (2026-10-21) the first screen is two doors and *¿Ya tienes cuenta? Entrar*; the account screen after them has email and password, and *Continuar con Google* through a browser tab (`signInWithOAuth` + `openAuthSessionAsync`). No Google library is in the build, so Play re-signing the app changes nothing about sign-in |
| References to alcohol and tobacco: **none** since `0066` | `0066_catalogo_sin_alcohol_tabaco_mascotas.sql` (2026-10-20) took the 137 products of `cat-alcohol`, `cat-tabaco` and `cat-mascotas` out of the starter catalog, with their aisles and families; both stores' rating answers say so |
| No financial features | Wera records a shop's cash sales. Nothing in the schema or the app moves money |
| The listing does not say *inventario* | ⚠️ **No screen shows stock on hand** (measured 2026-10-13: `app/src/strings.ts` has no such word, and no screen reads `batch_balance`). The ledger keeps it; nothing draws it. `site/index.html` and the aviso still describe Wera as keeping *inventario* |
| The description's feature list | The handbook's *What the app does today*, checked against `app/src/strings.ts` on 2026-10-13 |

## The store build — the one that goes to Play

EAS build `89de4383` — Android, profile `production`, from commit `204385c` (the first day's
three rounds, `8g`/`8q`, and the camera's new sentence), finished 2026-10-21. Each line below
was read off the bundle itself (`aapt2 dump xmltree` on its manifest, its `assets/`), not off
`app.json`.

| | |
|---|---|
| Package, version | `mx.wera.app`, 1.0.0, version code 7 |
| Target / minimum Android | API 36 / API 24 |
| Permissions | Six requested: the app's own internal receiver permission, `INTERNET`, `ACCESS_NETWORK_STATE`, `ACCESS_WIFI_STATE`, `VIBRATE` and, since `8m`, **`CAMERA`**. No location, microphone, contacts, storage or `AD_ID`. ⚠️ The manifest also names `android.permission.DUMP` — **not requested**: it is the guard on `androidx.profileinstaller.ProfileInstallReceiver`, a library's receiver only callers holding it may reach |
| Update channel | `production`, checked on every launch |
| Runtime | `5a4a7a5d…` (`base/assets/fingerprint`), the same as `main`'s and as the `preview` Android build made with it (`3fd48b8c`) — an over-the-air fix reaches both |
| Pilot's measurements | Off: the bundle holds no `piloto-1` |
| The first day | In its JavaScript: the two doors, Tu tienda with the name and the giros, `set_store_address` |
| Server | The hosted project's address once; the local test proxy's not at all |
| Icon | The cow, unchanged since `018e0e33` |
| Sign in with Apple | Not on Android: the button is drawn on an iPhone only |

It is in the owner's `~/Downloads/wera-tienda-1.0.0-7-primer-dia.aab`, with a copy in
`~/RetailerToolDev/wera-builds/android-89de4383/`; EAS keeps the original until 2026-11-20.
⚠️ **It replaces** `8e4c7544` (version code 5), `1d8b5921` (4) and `018e0e33` (3), whose files
are still in Downloads; if one of them was uploaded, this is a new release on the same closed
track. ⚠️ Not yet re-read: 16 KB page alignment (the native libraries changed with the camera
module of `8m`).

## The pictures

Play refuses a screenshot whose long side is more than twice its short side, so a phone's own
screenshot (1080 × 2400) is not accepted as it comes. These are 1080 × 1920, taken on an
Android emulator set to that size, from a throwaway build of the same commit pointed at the
LOCAL database and its invented shop, *Tienda Doña Lupe*. No real shop's data is in them.

To take them again (`5R-d-iv-c`):

1. `supabase db reset --local`. Give `lupe.owner@tienda.mx` a password in the local database
   (the seed's users have none), and record a few days of sales as her through `record_sale`.
2. Serve the local stack over HTTPS (`@/lib/env` refuses `http://`): a self-signed certificate
   for `127.0.0.1` and a small proxy from `:54443` to `:54321`, then `adb reverse tcp:54443 tcp:54443`.
3. In a separate worktree: `npm ci`, `npx expo prebuild -p android --clean`, add the
   certificate as a trust anchor in a `network_security_config.xml`, switch `expo-updates`
   off in the manifest, and `./gradlew :app:assembleRelease` with `EXPO_NO_DOTENV=1`,
   `EXPO_PUBLIC_SUPABASE_URL=https://127.0.0.1:54443` and the local publishable key. Check
   the bundle holds the local address and not the hosted one before installing it.
4. `adb shell wm size 1080x1920`, SystemUI's demo mode for a clean status bar, sign in by
   `adb shell input`, move with `am start -d mx.wera.app://<route>`, `adb exec-out screencap`.
   Convert to JPEG (`sips`): Play wants no alpha channel.

⚠️ **Retaken 2026-10-21 (`5R-d-iv-c`, after `8g`'s first day), a shorter way that held:** the
emulator's own debug app (JavaScript bundled without dev mode, against the local shop through
the HTTPS proxy) instead of a throwaway release build; an invented shop made through the app's
own functions as its owner (`onboard_workspace`, `import_catalog`, `set_store_address`, then
three days of `record_sale` back-dated through the offline path — the 72-hour clamp — and two
`record_purchase` and one `record_waste`); and **the emulator's clock set to 20:45 of the last
day** (`adb root`, `auto_time 0`, `date`), so *Hoy* shows a working day rather than a midnight.
⚠️ Three traps it found: `adb root` drops the `adb reverse` tunnels (re-add them); a price
written today is not yet valid on a phone set to yesterday (backdate the shop's `price_list`);
and `adb shell input text` into the password box drops characters now and then (type it in two
pieces, or give the account a plain password). Restore `auto_time 1` and `wm size reset` after.

⚠️ **The App Store's twelve, 2026-10-21 (`5R-d-iv-c`), on the iPhone simulator** — the same six
screens at 1206 × 2622 (iPhone 17) and 1320 × 2868 (iPhone 17 Pro Max), from a simulator Release
build of `0246ae6` against the local shop through the same HTTPS proxy (the recipe's iOS half is
the session's memory *screenshot every screen against a local shop*: certificate trusted with
`simctl keychain … add-root-cert`, session written into the app's `ExpoSQLiteStorage` AS TEXT).
What differed, and why:
- **The simulator keeps the Mac's clock**, and at 2 a.m. *Hoy* is empty. So a second invented
  *Abarrotes Lupita* was made whose day is **Pago Pago's (UTC−11)**: sales between 7:30 and 21:30
  of that zone's last three days, the store's own `location.timezone` set to it so the server's
  daily views agree, and the app started in that zone with `simctl spawn <udid> launchctl setenv
  TZ Pacific/Pago_Pago` (the app's *today* is the device's midnight). Status bar: `simctl
  status_bar … override --time 20:45`.
- **No taps.** A tab is reached through the app's own last-screen key (`wera.lastScreen`); any
  other route by a **cold** `simctl openurl` with that key deleted — with the key present the
  restore wins and the link is dropped. The basket on Vender is written into `tienda.cart.v3`.
- ⚠️ **iOS asks *Open in "Wera"?* before a link opens a newly installed app**, and nothing here
  can tap it. The approval lives in the simulator's `com.apple.launchservices.schemeapproval`
  defaults (`com.apple.CoreSimulator.CoreSimulatorBridge-->mx.wera.app` = `mx.wera.app`);
  `simctl spawn <udid> defaults write …` sets it. An alert already on screen stays until the
  simulator restarts.

⚠️ **The seed shop has two stores, and its owner sees both — so on Vender she gets no *Cobrar*
slide** (`useCatalog` picks a store only when exactly one is visible). The 2026-10-13 set took
Vender as the seed's cashier of one store; the 2026-10-21 set used a shop made the app's way,
which has one store, so its owner sees *Cobrar*.

## When something changes

- **A new Android store bundle**: it replaces the one on Play's closed track, and this file's
  section on the store build is replaced by what that bundle says, read the same way.
- **The mark or a colour**: edit `brand/wera-mark.svg` or `brand/render-icons.sh`, run the
  script, and make new builds; an icon cannot go over the air.
- **`8g`** (the owner's review): new screenshots, and the descriptions read again. That is
  `5R-d-iv-c`.
  Google's *account creation methods* stay *OAuth*.
- **The ⛔ question about the daily count**: ruled the other way, *Analytics* comes off the
  purchase history in both stores' forms.
- **A new library in `app/package.json`**: read what it sends before the next store build, and
  read the build's permissions again.
- **A screen that shows stock on hand**: the listing may say *inventario*.
