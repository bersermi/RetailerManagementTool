# store/ — what goes into Play Console and App Store Connect

Written by plan task `5R-d-iv-a` (2026-10-13). Nothing in this folder is built, published or
read by the app: it is the text a person pastes into the two stores' consoles, and the
pictures Google asks for.

| File | What it is |
|---|---|
| [`google-play.md`](google-play.md) | Every Play Console field in the order the console asks: the listing, the store settings, each *App content* form, the closed track and its release |
| [`google-play/`](google-play/) | The 512 px icon, the feature graphic and its source, and five phone screenshots |
| [`app-store.md`](app-store.md) | Every App Store Connect field: the record, the listing text, the age rating, the privacy labels, the review notes. **Nothing in it has been entered anywhere** |
| `limits.py` | Measures every pasted field against its store's limit |

**Where each stands.** Google Play's closed test is ready to be clicked through: the handbook's
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
| *Analytics* on purchase history | `docs/runbooks/engagement.sql` (`5P-b`), which counts every shop's records per day. ⚠️ Tied to the open question in the plan's ⛔ DECISIONS OWED |
| The catalog and the suppliers as *Other user-generated content* | `product_family`, `product_variant`, `provider` (name, contact, phone, address). Google's *Contacts* and Apple's *Contacts* both mean the phone's address book, which the app never reads |
| A *Device or other ID* is collected (Apple: *Device ID*, not linked) | `expo-updates` sends a random per-install id to Expo on every update check; the aviso's *Datos técnicos de las actualizaciones* already says so. Google's definition names a *Firebase installation ID* as an example of the type |
| Nothing is *shared* | Supabase and Expo process data on Wera's behalf (the aviso's section 5). Google: a transfer to a service provider is not sharing |
| Encrypted in transit | `app/src/lib/env.ts` refuses a Supabase address that is not `https://`; the manifest of the store build does not allow cleartext (measured below) |
| No usage data, no diagnostics | `EXPO_PUBLIC_PILOT` is not in EAS's `production` environment, and the store build's bundle carries no label (measured below). `app/package.json` has no analytics or crash library |
| No location, contacts, photos, camera or microphone | The permissions of the store build, measured below |
| No ads, no advertising id | No ad library in `app/package.json`; the store build's manifest has no `AD_ID` permission (measured below) |
| An account can be deleted in the app and by a web page | `5R-c` (*Ajustes → Tu cuenta → Eliminar mi cuenta*) and `tu-wera.com/eliminar-cuenta/` |
| Sign-up by *username and password* and by *OAuth* | `Entrar`: email and password, and *Entrar con Google* through a browser tab (`signInWithOAuth` + `openAuthSessionAsync`). No Google library is in the build, so Play re-signing the app changes nothing about sign-in |
| References to alcohol and tobacco: yes, mild | `supabase/catalog/products/abarrotes.csv` — the categories *Cigarros* and *Cerveza y licores* |
| No financial features | Wera records a shop's cash sales. Nothing in the schema or the app moves money |
| The listing does not say *inventario* | ⚠️ **No screen shows stock on hand** (measured 2026-10-13: `app/src/strings.ts` has no such word, and no screen reads `batch_balance`). The ledger keeps it; nothing draws it. `site/index.html` and the aviso still describe Wera as keeping *inventario* |
| The description's feature list | The handbook's *What the app does today*, checked against `app/src/strings.ts` on 2026-10-13 |

## The store build of 2026-10-13

EAS build `bb189fea` — Android, profile `production`, from commit `1803044`, finished
15:11 UTC. Each line below was read off the bundle itself (`aapt2 dump xmltree` on its
manifest, its `assets/`, and the ELF headers of its libraries), not off `app.json`.

| | |
|---|---|
| Package, version | `mx.wera.app`, 1.0.0, version code 2 |
| Target / minimum Android | API 36 / API 24. Play asks new apps for 36 since 31 August 2026 |
| Permissions | `INTERNET`, `ACCESS_NETWORK_STATE`, `ACCESS_WIFI_STATE`, `VIBRATE`, `SYSTEM_ALERT_WINDOW`, and `READ_`/`WRITE_EXTERNAL_STORAGE` up to Android 12 only. No location, camera, microphone, contacts or `AD_ID`. ⚠️ The last three come from Expo's template and Wera uses none of them; removing them is on `5R-k`'s row, because it needs a new build |
| Cleartext traffic | Not allowed: the manifest sets neither `usesCleartextTraffic` nor a network security config, and Android's default for this target is off |
| Update channel | `production`, checked on every launch |
| Runtime | `b7937647…`, the same as the `preview` Android builds — an over-the-air fix can reach it |
| Pilot's measurements | Off: the bundle holds no `piloto-1`. It holds `tu-wera.com/privacidad` and the hosted project's address |
| 16 KB pages | All 50 of its 64-bit libraries are aligned to 16 KB |
| Icon | ⚠️ Expo's template icon. The logo is `5R-m` |

A copy is in the owner's `~/Downloads/wera-tienda-1.0.0-2.aab`. EAS keeps the original until
2026-11-12. ⚠️ **The build after `5R-k` and `5R-m` replaces it** on the same closed track.

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

⚠️ **The seed shop has two stores, and its owner sees both — so on Vender she gets no *Cobrar*
slide** (`useCatalog` picks a store only when exactly one is visible). `captura-2-vender.jpg`
was taken as the seed's cashier of one store. A shop made in the app has one store.

## When something changes

- **`8g` and `5R-m`** (the review and the logo): new screenshots, a new icon and feature
  graphic, and the descriptions read again. That is `5R-d-iv-c`.
- **`5R-k`** (Sign in with Apple): the reviewer's notes in `app-store.md` already assume it.
  Google's *account creation methods* stay *OAuth*.
- **The ⛔ question about the daily count**: ruled the other way, *Analytics* comes off the
  purchase history in both stores' forms.
- **A new library in `app/package.json`**: read what it sends before the next store build, and
  read the build's permissions again.
- **A screen that shows stock on hand**: the listing may say *inventario*.
