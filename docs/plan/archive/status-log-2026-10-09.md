# Status log — the 2026-10-09 working day

⚠️ **Moved by `10.5-iii-b` from `docs/PLAN.md`'s `## Position`, unedited** — the day's four entries, to keep `## Position` under its
1,400-line ceiling. **A later cut of the same day APPENDS here, never a second file for this date.**

✅ **2026-10-09 — `5R-h` IS DONE AND `5R-b` IS THE NEXT TASK (the cloud build and updates over the air).**
**`5R-h`, *¿Olvidaste tu contraseña?* — no migration.** A link under *Entrar*, on the sign-in half only, opens `https://wa.me/<number>` with a prefilled message naming the
address typed above it. `https://wa.me/` opens WhatsApp when it is installed and WhatsApp's web page when it is not, so the fallback needs no native change (`whatsapp://` would need
`LSApplicationQueriesSchemes`). The number comes from `EXPO_PUBLIC_SUPPORT_WHATSAPP` through a fourth `R7` reader, `app/src/lib/supportWhatsapp.ts`; a build without it draws no link.
**His half is `docs/runbooks/reset-a-password.sh <email>`**: one statement looks the account up and sets a bcrypt password through `extensions.crypt`, and it prints a generated
`wera-xxxx-xxxx`. It refuses, changing nothing, an unknown email and **an account with no email identity** (Google only), because a password there would open a second way into a Google account.
**What the estimate found (S, built whole):** (1) **the app half was one link and two pure functions**; the conventions gate had to learn a fourth environment reader. (2) **The real
work was the script's refusals**, which only a database can test. (3) ⚠️ **Found, not built: the app has no *Cambiar contraseña*.** The temporary password is the person's password
until they ask for another. Nothing waits on it.
**Decisions taken for him:** the Spanish, *"¿Olvidaste tu contraseña?"* and the message *"Hola, olvidé mi contraseña de Wera. Mi correo es …"*. The link sits between *Entrar* and
*¿No tienes cuenta?*, underlined. Google-only accounts are refused by the script. The temporary password's shape. All are edits, none is a migration.
**Evidence:** `app/test/support.test.ts` **8 of 8**. The rehearsal ran against the LOCAL stack: an email sign-up, then the script, then a password sign-in. **The new password → 200**, the old
one → 400, the upper-cased email found the same account. An unknown email, a no-identity account and an email containing a quote are each refused with nothing written.
`R7`'s new branch was falsified: a second variable in the new module turns it red. The hosted project answers the script's CSV in the same shape, read-only, and it has `extensions.gen_salt`.
It still has **no** email identities. Vitest **1766/1766 in 55 files**, typecheck clean, `conventions-gate.sh` 18 of 18.
⚠️ **Not looked at:** the link on a phone, and WhatsApp opening from it (R9). It reaches his phone with the next rebuild, **and only if `app/.env.local` carries the number when the bundle is made**.

✅ **2026-10-09 — `5R-c` IS DONE AND `5R-h` IS THE NEXT TASK (*¿Olvidaste tu contraseña?* by WhatsApp, ruled).**
**`5R-c`, account deletion: `0053_account_deletion.sql`** and a *Tu cuenta* section at the bottom of Ajustes. The migration drops the **eleven** foreign keys to `auth.users`
(the row said ten plus `workspace_member`; the database counts eleven) and keeps every column. It adds `workspace_member.left_at`, stamped by a trigger whenever `is_active` goes false.
It adds a trigger so a NEW membership must still name a living login, and `delete_my_account(p_shop_name)`.
**What the estimate found (L, one sitting, built whole):** (1) **the risk the row named first was real but small.** A shop with history can be deleted in one transaction:
the self-referencing `restrict` keys are fine inside single statements, and the deferred receipt check passes at commit. Measured on the seed (660 sales, 2,649 movements).
What refuses is three **triggers** (the ledger's immutability, the generic provider, prebuilt catalog rows). They now step aside only for the one workspace
`delete_my_account` is deleting, behind a transaction-local setting no client can set. (2) **Dropping `workspace_member.user_id`'s key opened a hole the row did not name:** an access
token outlives its deleted account by up to an hour, and with no key it could have opened a new shop. The login-exists trigger closes it (check 3.5). (3) The only place an actor's
name reaches a person today is the month export's *Quién* column, so that is where *"(ex-miembro)"* lands.
**Decisions taken for him:** a sole owner's typed name is checked **on the server too** (`TD007`, minted; `TD008` is next). The name comparison folds case and spacing but **not
accents**, like `normalize_name`. A former member with no stored name gets the login's `full_name` frozen onto the row, else the export says *Ex-miembro*. **Invitations he SENT stay;
those addressed to him go.** Memberships already inactive get `left_at = updated_at` (the hosted project has **none**, measured). The Spanish copy is mine. Its most consequential sentence
is the sole owner's: *"Eres la única persona dueña de {tienda}. Si eliminas tu cuenta, se borra la tienda completa…"*. The export offer opens Números rather than making a file in place.
⚠️ **Found, not fixed:** `workspace_member_delete` still lets an owner **hard-delete** a membership through the API, which would erase that person's pilot readings. No screen does it,
and removing a member is not built. When it is, his ruling says it is the tombstone (`is_active` false), and that is the moment to narrow the policy.
⚠️ **An unsent sale on the phone of somebody deleting their account** is not handled: deletion needs the network, and the network drains the outbox first.
**Evidence:** `supabase/tests/0053_account_deletion.sql` **45 of 45**, after seven falsifications. One falsification found **the suite's own defect**: checks recorded inside a rolled-back
transaction vanished, and the report still said "all passed". It now refuses a short count. Five older suites keep inventories that `0053` correctly changed, and they are updated:
`0026` 1.5, `0027` 7.3, `0035` 6.1, `0037` 5.3 and `0038` 7.2. After a clean `supabase db reset`, all **32** behavioural suites (the `db.yml` log), the **7** pgTAP suites and the **11** seed checks pass (the runners' tallies).
`docs/checks/5R-c-account-deletion-contract.sh` **7 of 7** over HTTP, and its falsifier **3 of 3**. Vitest **1758/1758 in 54 files**, typecheck clean, `conventions-gate.sh` 18 of 18.
⚠️ **Not looked at:** the section itself on a phone (R9). It reaches his phone with the next rebuild.

✅ **2026-10-09 — PLANNING, NO CODE: `5R-c` IS RULED AND IS THE NEXT TASK; THE SIGN-IN GAPS ARE ROWS (`5R-h`, `5R-i`, `5R-j`).**
⚠️⚠️ **HIS RULINGS ON ACCOUNT DELETION, 2026-10-09, after an assessment in-session.** He chose the alternative that **keeps the name**:
(1) **A member who deletes their account loses their LOGIN** (email, password, Google link, sessions, invite emails), but **the shop keeps a former-member record**: the display name,
the role, and when they joined and left. Every sale, void and waste they recorded still reads *"María (ex-miembro)"*. The reasoning: the shop is the data controller of its own staff
records under LFPDPPP, and Wera holds them for it; the books are the merchant's. **The same tombstone covers an owner removing a member.** (2) **A sole owner's deletion deletes
the shop**, after a warning that names who loses access, an offer of the monthly export, and the shop's name typed to confirm. If there is a second owner, they simply leave.
(3) **Immediate**, no grace period. Backups keep it for their retention window, and the aviso says so. (4) **When a shop is deleted, nothing is kept for analytics**, not even
anonymous aggregates. (5) **In-app now**; Google's web request page ships with `5R-d`.
**A phone number, if `5R-i` ever verifies one, is login data and goes with the login. The tombstone keeps the name, never the phone** (the proportionality principle).
⚠️⚠️ **CHEAP NOW, EXPENSIVE LATER — the shape `5R-c` must build:** the ten references to `auth.users` (`sale`, `purchase`, `waste`, `stock_batch`, `stock_movement`,
`failed_write` ×2, `workspace_invite` ×3) are **dropped as constraints, keeping the uuid**, and `workspace_member.user_id` stops cascading. **No ledger row is ever rewritten.**
After the first real deletion those constraints can never return, because the ids they would point at are gone.
**Measured in-session (read-only, hosted):** 3 users, all Google, all with an email, none with a phone. Email + password sign-up is ON with **confirmation OFF** (`mailer_autoconfirm`),
which is his wish for now. No custom SMTP (the built-in sender allows about 2 emails an hour). **The app has no password reset.** **Nobody has ever signed up by email on the hosted project.**
**His ruling on the reset gap, 2026-10-09:** *¿Olvidaste tu contraseña?* opens **WhatsApp to the owner**, and **he resets the password by hand** (`5R-h`). His number is kept OUT of this
public repository: it lives in the gitignored `app/.env.local` and the session's private memory.
**Parked by him, as rows so they are not lost:** phone verification (`5R-i`); email verification with a real mail provider and a self-service reset (`5R-j`).
**The order, set in-session:** `5R-c` (L), then `5R-h` (S), then `5R-b` (M), then `5R-d` (M), then `5R-e`. `5R-c` comes first on his instruction (*"let's have that addressed now"*).
`5R-h` follows because it is small and closes a hole any email user can fall into. `5R-b` and `5R-d` are the rest of the store path. `8g`/`8h` stay parked on his word.

✅ **2026-10-09 — `9j` IS DONE, STEP 9 IS COMPLETE, AND `5R-b` IS THE NEXT TASK.**
**`9j`, the Materias Primas session: `0052_catalogo_materias_primas.sql`**, **139 new products**: 4 new families by the kilo (*Repostería a granel* 19,
*Frutos secos y semillas* 33, *Especias a granel* 11, *Dulces a granel* 5), 6 dried chiles in *Chiles*, 8 branded baking goods in *Básicos* and
57 desechables in *Desechables*. **107 existing rows newly tagged** Materias Primas: all 48 of *Salsas y moles*, the 4 dried chiles, 14 Abarrotes bulk goods, 10 generic
desechables, oils and *Manteca vegetal Inca*, harinas, *Royal*, gelatinas, packaged sugars, condensada and evaporada, salt and McCormick spices,
*Chocolate Abuelita* and *Ibarra*, and *Manteca de cerdo*. Two new categories, *Repostería* and *Frutos secos*. **1,413 products in all; 246 carry `giro-materias-primas`.**
⚠️⚠️ **HIS RULINGS, 2026-10-09:** (1) **Materias Primas is the shop that supplies people who cook for a living**: bakeries, repostería, fondas and home sweet-makers.
It sells mostly in bulk. (2) **Generic for what is weighed and branded for what is packaged**, the Cremería rule. (3) The new dried chiles also carry Abarrotes and Verdulería,
like their siblings. (4) *Dulces a granel* stays here and can expand **if a Dulcería giro is created**. (5) He asked for **more variants of frutos secos and desechables,
by size and type**. (6) **Desechables are sold by the package**: one `pza` is one package, and the names say *paquete*. The count per package is not recorded.
**Decisions taken for him:** the family and category names; the 8 branded baking goods also tagged Abarrotes (the Cremería precedent); *Manteca de cerdo*, packaged sugars
and condensada/evaporada tagged (marked guess, not struck). The 10 generic desechables in Abarrotes (*Vasos desechables*…) stay beside the new sized ones.
⚠️ **That overlap is a known smell**: a shop importing both giros gets *Vasos desechables* and *Vaso de unicel #8 paquete*.
**Guessed and kept unchanged (*"good for now"*):** the unicel, charola and estraza size numbering, the capacillo and domo sizes, the Deiman, Nevada and Arm & Hammer brands,
higo, chabacano, piña, pistache pelado, macadamia, ajonjolí negro, the mix, every *Dulces a granel* row, chile cascabel and piquín seco, cebolla en polvo and paprika.
⚠️ **Cheap now, expensive later:** each desechable's code bakes in its size (`vaso-de-unicel-8-paquete`).
**Next, chosen in-session and not by him:** `5R-b`. It is the only open row whose gate is met and that needs no decision first (`5R-c` needs one; `5R-d` is also open).
Step 8's `8g` and `8h` stay parked on his word.
**Measured locally:** `build.test.mjs` 20 of 20 after `0052`; `--check` matches (45 tags, 42 families, 1,413 products); `supabase db reset`
applies it; all 31 behavioural suites in `supabase/tests/` pass, each run after `_cleanup.sql`.
