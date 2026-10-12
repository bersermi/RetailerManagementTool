# site/ — the pages at tu-wera.com

Static pages, Spanish, no build step and no JavaScript. Written by plan task `5R-d-i`;
published by `5R-d-ii`.

| Page | URL once published | What it is for |
|---|---|---|
| `privacidad/index.html` | `tu-wera.com/privacidad/` | The *aviso de privacidad integral* (LFPDPPP 2025, Art. 15). Its top box, *En resumen*, is the **simplified aviso** of Art. 16.II: the responsable and domicilio, the data, the purposes, how to limit use, and where the integral is |
| `eliminar-cuenta/index.html` | `tu-wera.com/eliminar-cuenta/` | Google Play's account-deletion web resource. It names the listing (*Wera: tu tienda*), the in-app path, the way out without the app, and what is erased and what is kept |
| `estilo.css` | — | The app's palette (`app/src/theme/palette.ts`), light only, as the app is |

## ⚠️ Two placeholders, filled only when the page is published

`{{RESPONSABLE}}` and `{{DOMICILIO}}`, twice each, both in `privacidad/index.html`.
The owner ruled that his full legal name and **home** address go in the aviso (2026-10-10).
This repository is public, so they are not committed here: whoever publishes fills them in
from the session's private memory, and the published page must contain no `{{`.
LIN Vigésimo primero asks for the street, number, colonia, alcaldía, postal code and
entidad — the address on file has all of them.

## What `5R-d-ii` must make true BEFORE these pages go up

1. **Supabase → Authentication → *Write audit logs to the database*: OFF**, and the
   table cleared once (`delete from auth.audit_log_entries`, run by the owner). Measured
   locally on 2026-10-12: deleting an account leaves GoTrue's audit rows behind, each with
   the person's email. With the switch off they live only in Supabase's log storage —
   1 hour on Free, 7 days on Pro (supabase.com/pricing) — which is what *"hasta 7 días"*
   on both pages rests on.
2. **The date** at the top of both pages is the day they are published.
3. **A page at the root** (`tu-wera.com/`): the *Wera* mark at the top of both pages links there. The support page `5R-d-ii` already owes can be it.
4. **The hosting sets no cookies** (*"Este sitio no usa cookies"*). GitHub Pages sets none;
   GoDaddy's parking or forwarding pages do.

## What each claim stands on

Change the code, the hosting or the Supabase plan and the matching line here goes stale
first. Nothing checks these pages against the schema: this table is the only link.

| The pages say | It stands on |
|---|---|
| Account data: name and surname, email, hashed password, Google id + name + email + photo URL, sign-up and last sign-in dates, IP and device per session | `app/src/auth/AuthProvider.tsx` (`full_name` on sign-up); GoTrue's `auth.users`, `auth.identities`, `auth.sessions.ip`/`user_agent` (measured on the local stack, GoTrue v2.197.0). ⚠️ The hosted rows were **not** read: that read was refused in-session |
| A shop's records: display name, role, stores, joined/left; who recorded each operation; invites and requests with email, role, stores, who invited/approved | `workspace_member` (`0001`, `0034`, `0053`), `member_location`, `created_by` on every document (`0003`), `workspace_invite` (`0002`, `0029`) |
| Suppliers: name, contact, phone, address, visible to all staff | `provider` (`0002`); the owner's ruling recorded when `6b` closed — every cashier can open a supplier and read its contact |
| No customer data; no location, contacts, photos, camera or microphone | `sale` has no customer column (`0003`); `app.json` declares no permission plugin |
| Pilot readings: the five kinds, member, shop, store, random device id, build, time; pilot builds only; the shop's owner reads them | `pilot_reading` and its select policy (`0043`); `EXPO_PUBLIC_PILOT` (`app/src/lib/pilotFlag.ts`); rulings 42–45 (ADR-035 header) |
| Counts of sales, purchases and waste per shop per day | `5P-b`, ruled 2026-10-12 |
| Update checks send IP, platform, app version and a random install id to Expo | `expo-updates`' `FileDownloader` sends `EAS-Client-ID` |
| Signing out deletes the phone's copy of the catalog and suppliers | `signOut` in `AuthProvider.tsx` calls `forgetCache` (`6d`) |
| Supabase and Expo, in the United States; no state named | Measured 2026-10-12: the hosted database resolves to AWS **`us-west-2`**, while ADR-035 §2.2 says `us-east-1` — a question in the plan's ⛔ DECISIONS OWED. The pages say only *Estados Unidos*, which is true either way |
| Deleting an account erases the login, sessions and the invitations addressed to it; the name stays as *(ex-miembro)* with role and dates; a sole owner's deletion deletes the shop and everything in it; nothing is kept for analytics | `delete_my_account` (`0053`), `supabase/tests/0053_account_deletion.sql`; the `5R-c` rulings. Re-measured on 2026-10-12 by rehearsing `docs/runbooks/delete-an-account.sh` locally |
| Pilot readings survive the account, on the former member, until **30 April 2027** | Measured in the same rehearsal (the reading outlives the login). The date is a promise held by the plan's ⏳ DATES OWED block |
| *Hasta 7 días* in backups and technical logs | Supabase: Pro backs up daily and keeps 7 days; Free takes no backups (supabase.com/docs/guides/platform/backups); logs as in item 1 above. ⚠️ **Team plan (14 days), PITR longer than 7 days, or the audit switch turned back on would each make it false** |
| Deletion without the app, answered within 20 business days | `docs/runbooks/delete-an-account.sh`, which calls the same `delete_my_account` as the app |
| ARCO: 20 + 15 business days, extendable once; free; complaint to the Secretaría Anticorrupción y Buen Gobierno | LFPDPPP (DOF 2025-03-20) Arts. 28, 31, 34, 40; the authority per Art. 2 XV |

## When something changes

- **`5R-k` (Sign in with Apple)** adds Apple's identifier and, when a person hides their
  address, Apple's relay email to *Qué datos tratamos*, and the Apple link to both lists of
  what a deletion erases.
- **`5R-i` (phone verification)**, if it returns, adds the phone number to the account data
  and to what a deletion erases.
- **A change that affects which data is used, or for what**, is announced by email to every
  account before it applies — the aviso promises that (section 9).
