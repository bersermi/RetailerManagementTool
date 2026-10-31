# site/ — the pages at tu-wera.com

Static pages, Spanish, no JavaScript. Written by plan task `5R-d-i`; published by `5R-d-ii`
through `.github/workflows/site.yml` (GitHub Pages), on every push to `main` that touches
`site/`. **This file is not published**: the build leaves it out.

| Page | URL once published | What it is for |
|---|---|---|
| `index.html` | `tu-wera.com/` | Where the *Wera* mark on every page points, and the **support page** the store listings ask for: what Wera is, the two in-app paths (forgotten password, deleting an account) and `ayuda@tu-wera.com`; since `10.4b-iv-b` a paragraph for Wera Cocina, the *Website* its Play listing gives, with its aviso and deletion page |
| `privacidad/index.html` | `tu-wera.com/privacidad/` | The *aviso de privacidad integral* (LFPDPPP 2025, Art. 15). Its top box, *En resumen*, is the **simplified aviso** of Art. 16.II: the responsable and domicilio, the data, the purposes, how to limit use, and where the integral is |
| `privacidad/cocina-e-itacate/index.html` | `tu-wera.com/privacidad/cocina-e-itacate/` | The aviso of **Wera Cocina** and of **Itacate's test version** — the link both Play listings and Wera Cocina's sign-in give. Written for the skeletons by `10.2b` (no accounts); **rewritten by `10.4b-iv-b`** for Wera Cocina's account, kitchen and publications and who sees them, with its own *En resumen* (Art. 16.II) and Itacate's section unchanged in substance. `10.5` rewrites both apps' parts: what neighbours see, and Itacate's account |
| `eliminar-cuenta/index.html` | `tu-wera.com/eliminar-cuenta/` | Google Play's account-deletion web resource. It names the listing (*Wera: tu tienda*), the in-app path, the way out without the app, and what is erased and what is kept — since `10.4b-iv-b` a kitchen of hers too, and a link to Wera Cocina's page |
| `eliminar-cuenta/cocina/index.html` | `tu-wera.com/eliminar-cuenta/cocina/` | **Wera Cocina's** account-deletion web resource (`10.4b-iv-b`): the link its Play Data safety form gives, which Google requires to name the app as its listing does. The in-app path (the foot of her kitchen's screen, or of the one that registers it), the way out by email, and what is erased — every business she alone owns, her kitchen and a shop in Wera — and what is kept |
| `estilo.css` | — | The app's palette (`app/src/theme/palette.ts`), light only, as the app is |

## ⚠️ Two placeholders, filled only when the page is published

`{{RESPONSABLE}}` and `{{DOMICILIO}}`, in both avisos: `privacidad/index.html` and
`privacidad/cocina-e-itacate/index.html` (the build prints how many times it filled each).
The owner ruled that his full legal name and **home** address go in the aviso (2026-10-10).
This repository is public, so they are not committed here. **They are the repository
secrets `RESPONSABLE` and `DOMICILIO`**, set by the owner, and
`docs/checks/5R-d-ii-site-build.sh` fills them in at build time. It refuses to build when
either is missing, when any `{{` is left, when a page loads anything from another site, or
when an internal link does not resolve (`5R-d-ii-site-build-falsify.sh` proves each refusal).
LIN Vigésimo primero asks for the street, number, colonia, alcaldía, postal code and
entidad — the address on file has all of them.

**To change either value**: change the secret (GitHub → Settings → Secrets and variables →
Actions), then *Actions → site → Run workflow*. No commit is needed.

## What had to be true BEFORE these pages went up (`5R-d-ii`)

1. **Supabase → Authentication → *Write audit logs to the database*: OFF**, and the
   table cleared once (`delete from auth.audit_log_entries`, run by the owner). Measured
   locally on 2026-10-12: deleting an account leaves GoTrue's audit rows behind, each with
   the person's email. With the switch off they live only in Supabase's log storage —
   1 hour on Free, 7 days on Pro (supabase.com/pricing) — which is what *"hasta 7 días"*
   on both pages rests on.
2. **The date** at the top of both pages is the day they are published.
3. **A page at the root** (`tu-wera.com/`): the *Wera* mark at the top of both pages links
   there. It is `index.html`, and it is also the support page.
4. **The hosting sets no cookies** (*"Este sitio no usa cookies"*). GitHub Pages sets none;
   GoDaddy's parking or forwarding pages do. `docs/checks/5R-d-ii-site-live.sh` asserts it
   on every page, against the live domain.

## What each claim stands on

Change the code, the hosting or the Supabase plan and the matching line here goes stale
first. Nothing checks these pages against the schema: this table is the only link.

| The pages say | It stands on |
|---|---|
| Account data: name and surname, email, hashed password, Google id + name + email + photo URL, sign-up and last sign-in dates, IP and device per session | `app/src/auth/AuthProvider.tsx` (`full_name` on sign-up); GoTrue's `auth.users`, `auth.identities`, `auth.sessions.ip`/`user_agent` (measured on the local stack, GoTrue v2.197.0). ⚠️ The hosted rows were **not** read: that read was refused in-session |
| Apple: its identifier, the name, and the email or the relay address that hides it; never Apple's password | `signInWithApple` in `AuthProvider.tsx` asks Apple for the name and email scopes and nothing else, and writes the name to `full_name` (`5R-k`). ⚠️ **Not measured on a real account**: what GoTrue stores from Apple's token was read in its source, not off a row, because a sign-in needs a token Apple signed. Read `auth.identities` after the first real one |
| Deleting from the app tells Apple; nothing of that confirmation is kept; a deletion by email does not | `supabase/functions/apple-revoke` and `docs/checks/5R-k-apple-revoke-contract.sh` (it stores nothing: it has no table and no database credential); `docs/runbooks/delete-an-account.sh` never calls it. ⚠️ **True on the hosted project only while `docs/checks/5R-k-function-deployed.sh` is green** |
| The iPhone path *Configuración → tu nombre → Iniciar sesión con Apple → Wera → Eliminar* | Apple's own page in Mexican Spanish, read 2026-10-13: support.apple.com/es-mx/102571 |
| A shop's records: display name, role, stores, joined/left; who recorded each operation; invites and requests with email, role, stores, who invited/approved | `workspace_member` (`0001`, `0034`, `0053`), `member_location`, `created_by` on every document (`0003`), `workspace_invite` (`0002`, `0029`) |
| Suppliers: name, contact, phone, address, visible to all staff | `provider` (`0002`); the owner's ruling recorded when `6b` closed — every cashier can open a supplier and read its contact |
| No customer data; no location, contacts, photos, camera or microphone | `sale` has no customer column (`0003`); `app.json` declares no permission plugin |
| Pilot readings: the five kinds, member, shop, store, random device id, build, time; pilot builds only; the shop's owner reads them | `pilot_reading` and its select policy (`0043`); `EXPO_PUBLIC_PILOT` (`app/src/lib/pilotFlag.ts`); rulings 42–45 (ADR-035 header) |
| Counts of sales, purchases and waste per shop per day, **in every version** (finalidad 9) | `5P-b`, ruled 2026-10-12; `docs/runbooks/engagement.sql` counts every shop in the database. ⚠️ **Since 2026-10-14 the aviso says every version, store builds included** (the owner's ruling that day, which moved it out of the pilot's list): nothing records which version a shop installed, so this sentence is the one that matches the query |
| Update checks send IP, platform, app version and a random install id to Expo | `expo-updates`' `FileDownloader` sends `EAS-Client-ID` |
| **Wera Cocina's account** is Wera's: the same login, the same data (name, email, password, Google's or Apple's) | One `auth.users` for both apps (ADR-035 §2.7); Cocina's `AuthProvider.tsx` writes the name under Wera's key (`cocina/test/auth-rules.test.ts` reads `app/src/auth/credentials.ts`) |
| **A kitchen holds** its name, giro, address (five boxes), exact pin and line of directions, and her name as its owner | `workspace` (`kind`, `giro_principal`), `location` (`0058`'s address, `0072`'s `pin_lat`/`pin_lng`/`directions`), `workspace_member`; written by `cocina/src/api/registro.ts` (`10.4b-iii-b`) |
| **A publication holds** each line's name, description, tags, price, count and usual price, the window, who published it and when, and when it was withdrawn | `listing` and `listing_line` (`0072`); `cocina/src/api/listing.ts`, held by `10.4b-iv-a-listing-contract.sh` |
| **Who sees a kitchen and what it publishes: its own people — today, her alone — and Wera.** No neighbour yet | `listing_select` and `listing_line_select` are `my_workspaces()` and `my_locations()` (`0072`), `location_select` is `my_locations()` (`0001`); Wera Cocina has no invitation, and Wera opens shops only (`10.4a`), so nobody else joins a kitchen. ⚠️ **`10.5`'s door changes this sentence**: the aviso promises to say what neighbours see, and an email to every account, before Itacate shows anything |
| Neighbours will see a kitchen's **exact pin** | The owner's ruling 4 of 2026-10-28; Cocina's map says *Los vecinos verán este punto exacto en el mapa.* (`cocina/src/strings.ts`) |
| Wera Cocina asks no location, contacts, camera, photos or microphone; the pin is tapped | `cocina/app.json` blocks the location permissions; no screen calls a permission (`expo-image-picker` is in the build, unused until `10.6`) |
| Wera Cocina keeps only the session on the phone, and signing out deletes it | No persisted cache (`cocina/CLAUDE.md`); the session lives in `expo-sqlite` (`cocina/src/lib/supabase.ts`), and `signOut` in `AuthProvider.tsx` removes it, by hand when the library cannot |
| *¿Olvidaste tu contraseña?* in Wera Cocina opens WhatsApp with the email | `cocina/src/auth/support.ts` (`10.4b-iv-b`), Wera's `5R-h` copied; the number is EAS's `EXPO_PUBLIC_SUPPORT_WHATSAPP` |
| Deleting from Wera Cocina deletes the login and every business she alone owns, each name typed; by email, the same | `delete_my_account` (`0073`); `cocina/src/api/account.ts` (`10.4b-iii-c`); `docs/runbooks/delete-an-account.sh`, one `--shop` per business, rehearsed by `docs/checks/10.4b-iv-b-delete-by-email-rehearsal.sh` (CI: `db.yml`'s `delete-by-email`) |
| The iPhone path *Configuración → tu nombre → Iniciar sesión con Apple → **Wera** → Eliminar* holds for Wera Cocina | ⚠️ **Not measured**: Wera Cocina is grouped under Wera's App ID (the owner, 2026-10-30), so Apple should list one entry, Wera's. No iPhone build of Wera Cocina exists yet to look |
| **Itacate's test version** asks for nothing: no account, location, camera or notification | `itacate/src/app/index.tsx`: one screen, a map and three lines, no call to a permission (plan `10.2a`) |
| Their map's tiles come from Google on Android and Apple on iPhone; on Android Google's map also sends the phone's model and version, its own random id, map gestures and crash reports | `react-native-maps` with no provider set: Google Maps SDK on Android, MapKit on iOS (`10.2a`); what the SDK collects is Google's *Prepare for Google Play's data disclosure requirements* for the Maps SDK for Android, read 2026-10-27 (page dated that day) — re-read it when the SDK is upgraded |
| On Android they register with Firebase Cloud Messaging at launch | Firebase's own documentation: an FCM token is generated automatically at start-up and its identifier uploaded, unless `firebase_messaging_auto_init_enabled` is false; neither app sets it (`10.2a`). `google-services.json` reaches only EAS builds (`eas-pre-install.sh`) |
| Signing out deletes the phone's copy of the catalog and suppliers | `signOut` in `AuthProvider.tsx` calls `forgetCache` (`6d`) |
| Supabase and Expo, in the United States; no state named | Measured 2026-10-12: the hosted database resolves to AWS **`us-west-2`**. ADR-035 §2.2 said `us-east-1` until the owner ruled the same day to keep the project where it is, and now says `us-west-2`. The pages say only *Estados Unidos*. ⚠️ **Until `5R-d-ii`, section 5 of the aviso said *"en el este de Estados Unidos (Virginia)"***, which was false; this row already claimed otherwise |
| Mail to `privacidad@` and `ayuda@` reaches a Gmail account through a forwarding service | The owner's forwarding (ImprovMX, recommended by `5R-d-ii` because GoDaddy no longer includes free forwarding with a new domain) and his Gmail. `5R-d-ii-site-live.sh` asserts the domain has MX records; only a test email proves the forwarding. The aviso names no forwarding service, so changing it changes no page |
| Deleting an account erases the login, sessions and the invitations addressed to it; the name stays as *(ex-miembro)* with role and dates; a sole owner's deletion deletes the shop and everything in it; nothing is kept for analytics | `delete_my_account` (`0053`), `supabase/tests/0053_account_deletion.sql`; the `5R-c` rulings. Re-measured on 2026-10-12 by rehearsing `docs/runbooks/delete-an-account.sh` locally |
| Pilot readings survive the account, on the former member, until **30 April 2027** | Measured in the same rehearsal (the reading outlives the login). The date is a promise held by the plan's ⏳ DATES OWED block |
| *Hasta 7 días* in backups and technical logs | Supabase: Pro backs up daily and keeps 7 days; Free takes no backups (supabase.com/docs/guides/platform/backups); logs as in item 1 above. ⚠️ **Team plan (14 days), PITR longer than 7 days, or the audit switch turned back on would each make it false** |
| Deletion without the app, answered within 20 business days | `docs/runbooks/delete-an-account.sh`, which calls the same `delete_my_account` as the app |
| ARCO: 20 + 15 business days, extendable once; free; complaint to the Secretaría Anticorrupción y Buen Gobierno | LFPDPPP (DOF 2025-03-20) Arts. 28, 31, 34, 40; the authority per Art. 2 XV |

## When something changes

- **`5R-e` (the listings go live)** adds the App Store and Google Play links to `index.html`.
- **`10.5` (Itacate shows kitchens)** rewrites Wera Cocina's section 4 — what neighbours see of a
  kitchen and what it publishes — and Itacate's section, for its account. ⚠️ **The Cocina aviso
  promises an email to every account before that applies** (its section 11), as Wera's does.

- **Apple sign-in on Android**, if it is ever built, needs Apple's web flow: say so under
  *Con quién los compartimos*, where today's sentence describes the iPhone's sheet only.
- **`5R-i` (phone verification)**, if it returns, adds the phone number to the account data
  and to what a deletion erases.
- **A change that affects which data is used, or for what**, is announced by email to every
  account before it applies — the aviso promises that (section 9).
