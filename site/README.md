# site/ — the pages at tu-wera.com

Static pages, Spanish, no JavaScript. Written by plan task `5R-d-i`; published by `5R-d-ii`
through `.github/workflows/site.yml` (GitHub Pages), on every push to `main` that touches
`site/`. **This file is not published**: the build leaves it out.

| Page | URL once published | What it is for |
|---|---|---|
| `index.html` | `tu-wera.com/` | Where the *Wera* mark on every page points, and the **support page** the store listings ask for: what Wera is, the two in-app paths (forgotten password, deleting an account) and `ayuda@tu-wera.com` |
| `privacidad/index.html` | `tu-wera.com/privacidad/` | The *aviso de privacidad integral* (LFPDPPP 2025, Art. 15). Its top box, *En resumen*, is the **simplified aviso** of Art. 16.II: the responsable and domicilio, the data, the purposes, how to limit use, and where the integral is |
| `eliminar-cuenta/index.html` | `tu-wera.com/eliminar-cuenta/` | Google Play's account-deletion web resource. It names the listing (*Wera: tu tienda*), the in-app path, the way out without the app, and what is erased and what is kept |
| `estilo.css` | — | The app's palette (`app/src/theme/palette.ts`), light only, as the app is |

## ⚠️ Two placeholders, filled only when the page is published

`{{RESPONSABLE}}` and `{{DOMICILIO}}`, twice each, both in `privacidad/index.html`.
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

- **Apple sign-in on Android**, if it is ever built, needs Apple's web flow: say so under
  *Con quién los compartimos*, where today's sentence describes the iPhone's sheet only.
- **`5R-i` (phone verification)**, if it returns, adds the phone number to the account data
  and to what a deletion erases.
- **A change that affects which data is used, or for what**, is announced by email to every
  account before it applies — the aviso promises that (section 9).
