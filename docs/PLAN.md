# Build plan

The live status of the build. Update this file as steps close — it is the one
place that answers "where are we?" after a context clear.

**Architecture:** [`docs/adr/ADR-035`](adr/ADR-035-target-architecture-postgres-react-native.md).
Where this file and the ADR disagree, the ADR wins and this file is the bug.

**New here, or not a developer?** [`docs/HANDBOOK.md`](HANDBOOK.md) explains the
tooling, the working loop, and where Claude is likely to be wrong.

**Stack:** Postgres (Supabase) + React Native (Expo). Mexico-based small retailers,
MXN, IVA. Spanish module names are the domain vocabulary: Comprar (buy), Vender
(sell), Productos (catalog), Proveedores (providers), Desperdicio (waste),
Números (reports).

**Not the stack:** Power Apps Canvas + Dataverse. That era stopped 2026-08-14 and
lives in [`archive/power-platform/`](../archive/power-platform/README.md), excluded
from the knowledge graph. Nothing there describes the system being built.

---

## Position

### ⛔ DECISIONS OWED BY THE OWNER

⚠️ **THIS BLOCK EXISTS SO NOBODY HAS TO REMEMBER ANYTHING.** Every session reads
`## Position` first, and the working prompt ends by asking what decision is needed — so a
decision parked here is re-offered **every session, automatically**, until it is ruled on.
⚠️ **It is the ONE home for open owner decisions**, and `docs/checks/plan-handover.sh`
refuses a second one, refuses a row that does not say what it blocks, and ⚠️⚠️ **refuses to
let a blocked task be marked as the next task.**

| Decision | Blocks | The brief, already written |
|---|---|---|
| **Your Expo login, and whose phone takes the first cloud build** (parked 2026-10-10 by `5R-b-i`) | `5R-b-ii` — the cloud builds and the over-the-air proof | `5R-b-ii` needs two things only you can give. **(1) An Expo account, logged in on this Mac.** In a session, type `! npx eas-cli login`. If you have no account, make the free one at expo.dev first; it takes Google. The project lives under that account, in your own name, like `5R-a`'s. **(2) A phone that is not yours.** ✅ **Recommendation: the Android of somebody who will be in the pilot.** Two of the four pilot phones are Androids, and a preview Android build installs from a link with no registration (they allow *install unknown apps* once). An iPhone that is not yours must be registered with Apple first: that person opens a link and installs a profile, which is one more step for someone who is not you. The session does the rest: the project id, the three values on EAS, the build, and the update, timed from merge to that phone |

⚠️ **Rulings 1–45 and their briefs moved 2026-09-29 (`8b`) to
[`docs/plan/archive/position-history-through-2026-09-29.md`](plan/archive/position-history-through-2026-09-29.md).**
A decision ruled is removed from the table and its record goes to the status log.

### ⏳ DATES OWED — what a calendar owes, and no person is holding

⚠️⚠️ **THIS BLOCK EXISTS BECAUSE THE DECISIONS BLOCK DID NOT COVER DATES, AND ON 2026-09-13
THERE WERE THREE LIVE ONES HELD ONLY BY PROSE.** A decision waits until someone rules; **a
date passes whether or not anyone looked**, and a missed reading is not recoverable by
trying harder afterwards — it is recoverable only by starting the clock again.

⚠️ **A DATE IS NOT A TASK.** It carries no next-task marker, it is not sized, and it must
never be what a cleared session "takes" — the next task is always in the tables below.

⚠️⚠️ **AND THIS BLOCK HAS TEETH THE DECISIONS BLOCK DOES NOT: `plan-handover.sh` FAILS once
a due date is in the PAST and its row is not ticked.** A red here blocks every merge, which
is deliberate and is the only reason a date survives a context clear — **and the exit is ten
seconds: tick the box and write what was read.** ⚠️ It fires only on dates **strictly
before** today (UTC), so a due-today row is never a false red on a timezone.

| Due | What | Why it cannot simply be moved | Done |
|---|---|---|---|
| **2026-10-04** | ⚠️⚠️ **RE-DEPLOY WERA TO THE IPHONE — THE SUCCESSOR TO THE 2026-09-27 ROW, AND IT NOW CARRIES THE PREREQUISITE THAT ROW DISCOVERED.** Profile `ad8112ec` expires **2026-10-04T14:28:16Z**, and when it does **the app stops launching in his hand** — measured on 2026-09-27, when he said *"I can't open the app in my phone, looks like the profile already expired"* within minutes of the moment. ⚠️⚠️ **THE TWO THINGS THAT MUST BE TRUE BEFORE A RENEWAL CAN WORK, BOTH LEARNED THE EXPENSIVE WAY ON 2026-09-27:** **(1) the build must run ON or AFTER the expiry** — `-allowProvisioningUpdates` REUSES a valid profile and RENEWS only an expired or missing one, which seven early re-deploys demonstrated; and **(2) an Apple ID must be signed into Xcode** (*Xcode → Settings → Accounts*), because renewing talks to Apple and reusing does not. **Check (2) BEFORE spending ten minutes on a build**: `ls ~/Library/Developer/Xcode/UserData/Provisioning\ Profiles/ \| wc -l` and `security find-identity -v -p codesigning`. ⚠️ **AND THE OWNER MUST TAP TRUST AFTERWARDS, EVERY TIME** — *Settings → General → VPN & Device Management* — because a new PROFILE requires it even when the certificate is unchanged. That is the 2026-09-27 correction and it is not optional. ⚠️ **A free personal team signs for seven days**, so this row will have a successor, and the 2026-10-13 reading below needs the last one to land inside the seven days ending on that date. ⚠️⚠️ **AND A THIRD PREREQUISITE WAS LEARNED ON 2026-09-27 BY `6a-ii-a`, WHICH BUILT SUCCESSFULLY AND COULD NOT INSTALL: THE PHONE HAS TO BE REACHABLE, AND THE ERROR FOR *not reachable* IS NOT THE ERROR FOR *locked*.** `devicectl` reads `unavailable` and every install answers **`com.apple.dt.CoreDeviceError 1011`** — *unable to locate a device matching the requested device identifier* — where the passcode answers `kAMDMobileImageMounterDeviceLocked` or `CoreDeviceError 3`. **A retry loop written for the lock spins on `1011` for ever**, which is what twenty attempts over five minutes demonstrated. ⚠️ **Check it BEFORE spending ten minutes on a build**: `xcrun devicectl list devices` must read `available (paired)`, and `ping iPhone-de-Bernie.coredevice.local` must answer | ⚠️⚠️ **THE APP STOPS LAUNCHING WHEN IT PASSES, AND HE IS USING IT DAILY.** ⚠️ The data container survives a re-install — proved three times — so the cost is the trust tap and ten minutes, not his session | ☑ **DONE LATE, 2026-10-09** — missed on the day (the `9i` session found the profile expired and not renewed). Re-deployed 2026-10-09 **as `mx.wera.app`**, `5R-a`'s id, after the owner confirmed nothing was recorded offline before the old build stopped opening. `app/ios` was regenerated by `expo prebuild --clean`. ✅ **The embedded profile now expires 2027-10-09**: it was signed by the paid individual account (team `RGWA74UM3G`), so **the seven-day re-deploy is retired** and this row has no successor. It installed over WiFi and launched without a Trust prompt. The old `mx.bserafin.wera` stays on the phone as a dead icon until he deletes it |
| **2026-10-13** | ⚠️⚠️ **`5a-iv-d` day-30 reading — ON ONE INSTRUMENT NOW, NOT TWO, AND THE OWNER TRADED THE OTHER ON 2026-09-22 KNOWING WHAT IT COST.** ***"Override anything related to the 30 day session check. I want to keep working from my device."*** **The iPhone half is spent**: he is using the app daily, so its session is refreshed on every open and it can no longer answer *how long does a session survive untouched*. ⚠️ **The reading is still worth taking and still free, because the second instrument was sealed for exactly this**: the AVD `wera-reading-5a-iv-d`, a **different Google account**, no provisioning clock, powered down since 2026-09-21 — which is why a second instrument existed at all. **A one-device reading is a weaker claim than a two-device one, and it is the claim this project now has.** ⚠️ The iPhone row above is no longer part of this measurement. ⚠️⚠️ **AND IT NO LONGER MEASURES THIRTY DAYS — SAY SO NOW RATHER THAN DISCOVER IT THEN.** The day-8 reading of 2026-09-21 refreshed both sessions by opening both apps, which is what that reading IS; so this one measures **22 days** from 2026-09-21, not 30 from day 0. ⚠️ **That is not a defect and the row is still worth taking** — C1.4's claim is unbounded, and 22 untouched days is a longer gap than 8 — but *"day 30"* is now a name rather than an interval, and a session reporting it as thirty days since sign-in would be stating something false | C1.4 claims persistence *"until an explicit log-out"*, which is unbounded; **eight days can only fail to disprove it.** Both devices are sealed already, so this costs a glance. ⚠️ **The iPhone half also needs the 2026-09-27 re-deploy to have been TRUSTED** — see the row above. ⚠️⚠️ **AND THE ANDROID HALF MAY REFUSE TO BOOT: the sealed AVD was hard-killed on 2026-09-21 and left `hardware-qemu.ini.lock` and `multiinstance.lock` behind** in `~/.android/avd/wera-reading-5a-iv-d.avd/`. A stale lock reads as *"another emulator instance is running"* on the next boot — **which is this date, the one day it is expensive.** ✅ **The fix is to delete those two files and boot again**; the app's data is on the disk image and is not affected. ⚠️ **Do NOT launch Wera to check — booting the emulator is safe, opening the app is the reading** | ☐ |

⚠️ **The ticked rows (2026-09-20, -21, -27) and this block's notes moved 2026-09-29 to the same
position-history archive.** A row leaves the table once its Done cell is written.

✅ **2026-10-10 — `5R-b` IS SPLIT, `5R-b-i` IS DONE, `5R-b-ii` WAITS ON THE OWNER, AND `5R-d` IS THE NEXT TASK (the listing and the aviso).**
**`5R-b-i`, everything the cloud build and over-the-air updates need that no Expo account does — no migration, nothing a shopkeeper sees.** `expo-updates` 57.0.25;
`runtimeVersion: { policy: 'fingerprint' }` in `app.json` and `app/fingerprint.config.js`; `app/eas.json` with `preview` (internal, an Android APK) and `production`
(auto-incremented build numbers, kept on EAS); and `docs/runbooks/ship-an-update.sh <channel> "<message>" [--check]`, the one command that ships a fix.
**What the estimate found (`M` as written, split for two non-size reasons):** (1) **the native risk came first and was small.** EAS runs a fresh `prebuild` and a **default**
`pod install`, which is not how `app/ios` on this Mac was made (the simulator needs RN from source). A clean prebuild with default pods **compiled for an iPhone**
(`xcodebuild` Release, `generic/platform=iOS`, unsigned, `** BUILD SUCCEEDED **` in 237 s) **and for Android** (`assembleRelease`, `BUILD SUCCESSFUL`; the first attempt's
Gradle daemon died while both builds ran at once, and a rerun finished it). (2) ⚠️⚠️ **The real work was the fingerprint, and without it every update would have reached
nobody.** eas-cli computes the runtime on the Mac that runs it; the cloud builder computes it again on a fresh install and **throws** if they differ (`@expo/build-tools`
24.12.1: *"Runtime version calculated on local machine not equal to runtime version calculated during build"*). And `eas update` **never compares its runtime with any build**
(read in eas-cli 24.12.1's source): one computed wrong publishes to a runtime no phone has and reports success. Three things moved the hash with no edit by anyone:
**`version`/`buildNumber`** (EAS's auto-increment would have split identical builds), **a local Android build rewriting `@react-native-masked-view`'s `AndroidManifest.xml` inside
`node_modules`**, and **Kotlin's `.kotlin/` session files**. The config skips the first and ignores the other two. **Measured after the fix:** a fresh `npm ci` checkout and this Mac's
`node_modules` (rewritten by weeks of local builds) give the **same hash on iOS and Android**. With the manifest ignore removed they split again (the falsifier).
(3) **Two halves, one of them invisible here:** the login, the cloud build, another person's phone and a timed update are `5R-b-ii`, gated on the decisions block.
⚠️ **Corrected in-session:** I first read the rewritten manifest as a hand edit made on 2026-09-21. It is not one: the clean checkout's copy was rewritten at 00:34 by this session's own Gradle run.
**Decisions taken for him, all edits, none a migration:** the fingerprint policy and its skips; the channel names `preview`/`production`, each bundled from the EAS environment
of the same name (`app/test/release.test.ts` holds that); build numbers kept on EAS; `preview` Android as an APK. Updates use the `expo-updates` default: **a phone runs a fix
on its second cold start after publishing, with no message, and never waits for the network to open** (`EXUpdatesLaunchWaitMs` 0, read off the built `Expo.plist`).
The runbook refuses a dirty tree, a commit not on `origin/main`, a missing `EXPO_PUBLIC_` value on EAS, and an update no finished build can run. No `.easignore` (18 MB tracked).
No Node pin on EAS, because its default could not be read without an account.
**Evidence:** Vitest **1771/1771 in 56 files** (`release.test.ts` 5 of 5, red when `preview`'s environment is renamed), typecheck clean, `conventions-gate.sh` 18 of 18. The runbook's
seven local refusals were run, ending at *"not logged in to Expo"* on a clean `origin/main` checkout. ⚠️ **Not tested: its EAS-side refusals**, which need the login.
**Nothing to look at on a phone and nothing to rebuild**: no screen changed, and the 9 October build on his iPhone has no updates URL, so it receives nothing until `5R-b-ii` rebuilds it.

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

✅ **2026-10-05 — `9i` IS DONE AND `9j` IS THE NEXT TASK, WITH THE OWNER (Materias Primas, the Catalog Prompt).**
**`9i`, the Cremería session: `0051_catalogo_cremeria.sql`**, **79 new products** in 3 new families (*Quesos a granel* 13 and *Carnes frías a granel* 16,
by the kilo; *Cremas a granel* 4, by the litro), plus 17 branded cheeses and butters in *Lácteos*, 12 bulk moles and pickles in *A granel*, and 17 branded moles and salsas
in *Salsas y condimentos*. **73 existing rows newly tagged** Cremería: 38 packaged dairy, 11 packaged cold cuts, 2 eggs, *Chorizo* and *Longaniza*,
and 20 moles and table sauces. That makes 1,274 products in all; 152 carry `giro-cremeria`. ⚠️⚠️ **HIS RULINGS, 2026-10-05:**
(1) **Cremería is generic for what it weighs and branded for what is packaged.** The packaged half was already in Abarrotes and is tagged, not duplicated.
(2) **Crema, crema ácida, crema de rancho and jocoque are sold by the litro.** **Butter is sold by the piece, and it is brand-sensitive**: there is no bulk butter row.
(3) ⚠️ **A new category, *Salsas y moles*, for every giro that cooks.** It holds bulk moles, branded moles, adobo, achiote and the table sauces (*Valentina*,
*Herdez*, *El Yucateco*…). It is tagged **Abarrotes, Cremería, Pollería and Carnicería**, and Materias Primas should get it when `9j` is written. The old *Salsas y condimentos* category is
**relabeled *Condimentos y especias*** (`cat-salsas`, code unchanged). It keeps salt, spices, bouillon, catsup and mayonnaise. Canned chiles stay *Enlatados*.
(4) **A new category, *Quesos***, on bulk cheese (*Quesos a granel*) and packaged cheese (*Lácteos*) alike. (5) **He accepted the guessed brands *"for now"***.
**Decisions taken for him:** the family names; Leche Nido ×4, evaporada and condensada NOT tagged Cremería (shelf-stable); the new packaged cheeses and
butters also tagged Abarrotes, like the packaged dairy beside them; *Achiote La Anita* moved into *Salsas y moles* alongside bulk achiote; *Aceitunas a granel* tagged Cremería
and *Enlatados* only; *Nata* dropped. ⚠️ **Found while building:** Abarrotes already had five Herdez salsas (*casera chica/grande, verde, taquera, ranchera*), so the draft's
two Herdez rows were dropped and those five were moved into *Salsas y moles* instead. The generator caught one of them by name; the other was a duplicate in all but name.
**Guessed and kept unchanged:** most cheese varieties beyond the obvious seven, the cold cuts marked guess, every packaged cheese/butter brand and size, and every mole brand.
A wrong size is a `name` edit in a later snapshot, and the code stays the same.
**Measured locally:** `build.test.mjs` 20 of 20 after `0051`; `--check` matches (43 tags, 38 families, 1,274 products); `supabase db reset`
applies it; all 31 behavioural suites in `supabase/tests/` pass, each run after `_cleanup.sql`.

✅ **2026-10-02 — `9h` IS DONE AND `9i` IS THE NEXT TASK, WITH THE OWNER (Cremería, the Catalog Prompt).**
**`9h`, the Abarrotes session: `0050_catalogo_abarrotes.sql`**, **1,017 new products** in 24 new families and 22 new category tags,
plus **10 newly tagged** Abarrotes: *Huevo blanco/rojo*, and *Jitomate saladet, Cebolla blanca, Papa blanca, Limón con semilla,
Chile serrano, Chile jalapeño, Ajo, Aguacate*. The 4 dried chiles were already tagged. That makes 1,195 products in all. ⚠️⚠️ **HIS RULINGS, 2026-10-02:**
(1) ⚠️⚠️ **ABARROTES CARRIES BRANDS: the Catalog Prompt's no-brands rule is lifted for this giro**, because *"Abarrotes is very brand
sensitive"*. A product is brand + product + presentation (*Coca-Cola lata 355 ml*, *Marías Gamesa tubo*). Bulk goods stay generic and by the
kilo (*Arroz a granel*). Pollería, Carnicería, Verdulería and Frutería stay generic. (2) **No IVA on anything for now**: every row is 0, and the
16% question is deferred, not answered. (3) He asked for **every presentation** in Refrescos, Pan (Oroweat included), Galletas, Botanas,
Enlatados and Cerveza/licores. (4) **He accepted the last proposal whole** (*"close enough"*) without row edits. ⚠️ **The review page could
not save**: it was opened through `/artifacts`, on the artifact's own host, where the `db` capability resolves `null`. The page showed
*Connecting…* for ever and kept his edits only in the tab. A review page must be opened on claude.ai, and it must say *not saving* rather than *connecting*.
(5) **Frutería correction, in the same snapshot**: *Fresa por charola* is new, and *Frambuesa, Zarzamora, Arándano* are renamed *… por charola* (codes unchanged).
**Decisions taken for him (his "accept" covers them, but they were mine):** the 24 family names and 22 category labels; bulk *croquetas*
tagged *Mascotas* and bulk sugar tagged *Azúcar*; naming *X a granel* / *X en bolsa* (which breaks Frutería's plain-name-is-kilo rule, because *Arroz
por pieza* reads wrong); presentations written as words (*individual*, *grande*, *tubo*, *Familiar*) where the grammage was not known.
⚠️⚠️ **661 OF THE 1,017 ROWS WERE MARKED GUESS IN THE DRAFT AND SHIPPED UNCORRECTED** — mostly presentations and sizes, not brands.
A wrong size is a `name` edit in a later snapshot, and the code stays. ⚠️ **Cheap now, expensive later:** each code bakes in the presentation
(`coca-cola-lata-355-ml`), and a shop's copy remembers it for ever. A rename keeps a code that no longer matches its name.
⚠️ **Found, not fixed: the import's untick list (`app/src/app/catalogo.tsx`) renders every product in a plain `ScrollView`.** That was fine at 177;
at 1,031 Abarrotes rows it is unvirtualized, and every tick re-renders all of them. **Not measured on a phone** — it belongs to whoever next looks at that
screen on a device.
**Measured locally:** `build.test.mjs` 20 of 20 after `0050`; `--check` matches (41 tags, 35 families, 1,195 products); `supabase db reset`
applies it (1,031 rows carry `giro-abarrotes`); every behavioural suite in `supabase/tests/` passes, each run after `_cleanup.sql`.

✅ **2026-10-02 — `9g` IS DONE AND `9h` IS THE NEXT TASK, WITH THE OWNER (Abarrotes, the Catalog Prompt).**
**`9g`, the Frutería session: `0049_catalogo_fruteria.sql`**, **46 new products** in 2 new families: *Frutas* 37, by the kilo,
and *Frutas por pieza* 9, by the piece. **6 newly tagged** Frutería: *Limón* ×3 and *Aguacate*, plus *Jícama* and *Pepino*. That makes
177 products in all, plus 1 new category tag, *Frutas*. No new unit. ⚠️⚠️ **HIS RULINGS, 2026-10-02:** (1) **Melón, Sandía,
Papaya maradol, Piña and Pitaya are each TWO products**: the plain name is sold by the kilo, and *… por pieza* is sold by the piece. He accepted that naming
(it follows *Verdolaga en manojo*). (2) **Three pears**: *Bartlett*, *Bosc*, *roja*. He dropped the other two the draft proposed.
(3) **Fruta picada is not included for now.** The other prepared items (jugos, cocteles) were proposed for parking and went unchallenged.
(4) Coco, Frambuesa, Zarzamora and Arándano are by the piece only; Fresa is by the kilo. *Naranja para jugo* is its own row.
**Decisions taken for him:** the family names and the *Frutas* category. The six tagged rows keep their *Verduras*
category; they get the giro tag only. ⚠️ **The berry names went in WITHOUT the draft's "(charola)"** (*Frambuesa*,
not *Frambuesa (charola)*), because the unit already says it is counted. A rename is a `name` edit, and the code stays the same.
**Guessed and kept unchanged:** Fresa by the kilo and berries by the piece; *Naranja para jugo* as a separate row; Jícama and
Pepino tagged; the variety lists (plátano ×3, manzana ×3, mango ×3, uva ×2); IVA 0 on everything.
**Parked:** fruta picada, jugos and cocteles. A cup of fruit is a recipe, and a jugo by the litro needs an `l` family.
**Measured locally:** `build.test.mjs` 20 of 20 after `0049`; `--check` matches; `supabase db reset` applies it (177
template rows, 46 in the fruit families, 6 others carrying `giro-fruteria`); every behavioural suite in `supabase/tests/`
green, each run after `_cleanup.sql`.

✅ **2026-10-02 — `9f` IS DONE AND `9g` IS THE NEXT TASK, WITH THE OWNER (Frutería, the Catalog Prompt).**
**`9f`, the Verdulería session: `0047_unit_manojo.sql` and `0048_catalogo_verduleria.sql`**, **53 new products** in 4 new
families: *Verduras* 29 and *Chiles* 9, by the kilo; *Verduras por pieza* 6, by the piece; *Hierbas* 9, by the **manojo**.
Nothing was newly tagged, because no Verdulería product was already in the template. That makes 131 in all, plus 4 new
category tags (*Verduras*, *Chiles*, *Chiles secos*, *Hierbas*). ⚠️⚠️ **HIS RULINGS, 2026-10-02:** (1) **Herbs are sold by the
manojo, so `0047` adds the unit `manojo`** (count, factor 1 to `pza`, display order 15). Stock counts bunches. (2) **Verdolaga
is two products**: *Verdolaga* by the kilo and *Verdolaga en manojo* (the wording is the assistant's). (3) **Ajo is sold by the
head**, under *Verduras por pieza*. (4) **Limón is three products**: *con semilla*, *sin semilla*, *amarillo*. (5) **Dried chiles
are tagged Verdulería AND Abarrotes** (*ancho, guajillo, pasilla, de árbol*), so `9h` tags them and never adds them again.
(6) ⚠️⚠️ **`caja` WAS ASKED FOR AND IS PARKED, NOT AS A TASK BUT AS CONTEXT, by the owner, until there is feedback.** What
was measured: `record_purchase` (`0018`/`0025`) converts by `unit.factor_to_base` alone and **never reads `pack_size`**,
which the app only shows and edits. So a box of 24 recorded as *2 cajas* would add 2 to stock, not 48. A `caja` unit would
also need one weight for every product, and a box from the Central varies by product and by delivery. **Every purchase unit
here stays `kg` or `pza`.** ⚠️ **Two migrations, not one**: the generator writes the whole catalog file and `--check`
compares it byte for byte, so the unit cannot live inside it. ⚠️ **What `manojo` touched outside the catalog:** `ES.units`
(*manojo*), `MEASURED_IN` (a bunch is counted, never a pack, so the field reads *3 manojo*, not *3 pza*), the unit
fixtures in `api-catalog-write`/`cart-quantity`, and `5d-i-catalog-contract.sh`'s unit count, which goes from 10 to 11. ⚠️ **And `07_money_and_units`, found by CI, not locally:** its U-block asserted *factor 1 if and only if base*, which is stricter than `0001`'s constraint. It now asserts one direction only (a base is at 1), with `manojo` named; the F-block's *exactly three bases* still refuses a fourth. 193 of 193.
**Decisions taken for him:** the *Chiles secos* category; family names; display order 15. **Guessed and kept unchanged:**
Brócoli, Coliflor and Nopal by the kilo; Lechuga orejona, Apio and Poro by the piece; *Limón amarillo* as the third limón;
IVA 0 on everything, dried chiles included. **For `9g`:** *Limón* ×3 and *Aguacate* already exist, so Frutería TAGS them.
**Measured locally:** `build.test.mjs` 20 of 20 after `0048`; the `0042` (25), `0044` (36) and `0018` (82) suites pass;
`5d-i` 12 of 12 with eleven units; Vitest 1741/1741 in 53 files; typecheck clean.

✅ **2026-10-01 — `9a`–`9e` ARE DONE AND `9f` IS THE NEXT TASK, WITH THE OWNER (Verdulería, the Catalog Prompt): the starter catalog by giro, `## Step 9`.** The owner parked `8g`
(*"I'm in talks with a Graphic and UI designer that might be able to help me with the redesign"*) and asked
for the default catalog he described on 2026-09-23 — seven giros, imported in bulk at onboarding and later,
offline, tagged, each product to carry a picture some day. Planned with him the same hour; the rows are
`9a`–`9j`. The same day `5R-a` closed its accounts half in another session: both store accounts exist, and the app id is now `mx.wera.app` (see its row).
**`9a` built `0044` the same day**: the `catalogo` schema, `template_code`, `catalog_template()` and `import_catalog()`.
⚠️ **What the estimate found that the plan had not said:** (1) `_cleanup.sql` sweeps `public` only, so template rows
**survive between suites**. The suite therefore owns a `zz0044-` fixture, and no suite may count the whole template.
(2) `0042`'s fence means **an imported product can never be retired**, so `p_exclude` is not a nicety; it is the only
way to say no to a product. That question is now on `9d`'s row. (3) The shop's dimension trigger reads only columns the
template names identically, so it is **reused, not copied**. **36 checks in `supabase/tests/0044_starter_catalog.sql`,
falsified twice** (role fence weakened to staff → 4.15 red; C8.5 skip removed → 4.8, 4.10, 4.17 red). All 31 behavioural
suites, all 7 pgTAP suites (`01_rls_coverage` untouched) and the `5d-i`/`6c` contract checks are green locally. No content
yet: the template is empty until `9c`.
**`9b` built the authoring path the same night**: `supabase/catalog/` (`tags.csv` holding the seven giros he named,
`families.csv`, `products/polleria.csv` with a header only, a README) and `build.mjs` with `--write` and `--check`.
⚠️ **What the estimate found:** (1) **each content migration has to be a SNAPSHOT of the whole catalog**, because a
later giro TAGS a row an earlier giro's file holds, and a per-giro insert would miss that tag. (2) **Units are parsed
out of the migrations**, never copied, so there is no second list. (3) **`--check` comes almost free** because the
output is deterministic, and it catches a CSV edited without regenerating. ⚠️ **A defect found by its own suite:** on
macOS `/var` is `/private/var`, so the entry-point test never matched, and **the CLI exited 0 having checked
nothing**. It is fixed with real paths. **20 of 20 in `build.test.mjs`**, each refusal asserted by its reason. Two
generated snapshots were applied to the local database and rolled back: a rename onto a removed product's name, a
family move and a family deletion all landed, and a picture path survived the second snapshot. In CI it runs as the
first step of `supabase db reset`. **The Catalog Prompt** is in the handbook, beside the main prompt.
**`9c`, the Pollería session with the owner, the same night: `0045_catalogo_polleria.sql`**, generated, with 24 products in
2 families (*Pollo* 22, *Huevo* 2), every one by the kilo and at IVA 0, plus 4 category tags. ⚠️⚠️ **HIS RULINGS, 2026-10-01:**
(1) ***"Agree on families"*: a FAMILY IS WHAT THE PRODUCT IS** (*Pollo*, *Huevo*) and keeps one measure (C8.5); the
section a shop browses by (*Pollo fresco*, *Menudencia*, *Preparados*) is a **category tag**. ⚠️ His pilot shop uses
Familia as a section, and its *Pollo* and *Verduras* each mix pieces and kilos, so **importing Pollería into the pilot
shop would land only the 2 eggs**. Every chicken row would be skipped by the C8.5 rule; his rows are untouched either
way. (2) **Pollo entero by the kilo; Huevo by the kilo.** (3) **Every guessed row kept as drafted**, including *Nuggets* and
*Hamburguesa de pollo* by the kilo, and IVA 0 on the marinated ones. **Left out:** *Pollo rostizado* (16%, a rosticería's),
*Gallina*, and turkey cold cuts. Lifespans are blank, since he was not asked. **Measured locally:** a fresh shop imports
24 of 24; a second import imports 0 and skips 24; an import by `cat-menudencia` alone finds its 6 already in;
`0044`'s and `0042`'s suites still pass with the content present; `01_rls_coverage` is 97 ok.
(4) ⚠️⚠️ **`9d`'s import screen, ruled the same night: PICK GIROS, THEN AN UNTICK LIST, THEN *Importar*.** Products are
grouped by family and all ticked, and unticking sends `p_exclude`. He chose it over giro-only and over loosening `0042`'s
fence, because an imported product can never be retired.
**`9d`, the import in the app, built the same night.** `@/api/starterCatalog` (pure: the RPC names and `p_` args, the
wire shape, the giros offered, the untick list by family, "already in your shop" by `template_code` or folded name, and
`choiceFrom`), two `calls.ts` wrappers, `useStarterCatalog` and `useImportCatalog`, `src/ui/SelectorCatalogo` (drawn by
two files, R14), and *¿Qué vendes?* as the third question on `bienvenida`. **The import runs inside the create mutation,
BEFORE the membership read is invalidated**, so the guard moves her to Inicio only once the products exist. The route
`catalogo.tsx` is reached from Productos (*Agregar del catálogo*, for managers and the owner). `VARIANT_COLUMNS` gains
`template_code`, and `CACHE_SHAPE` goes from `v1` to `v2`. ⚠️ **What the estimate found:** (1) **a picker screen after
*Crear* would RACE the guard**, which moves a new member out of onboarding on its own, so the picker lives ON the onboarding
screen. (2) **The template is NOT persisted**, a change from the plan: the import needs signal, so a stored picker could
only offer a button that fails. Offline, it says so. (3) The `5d-i` check reads `VARIANT_COLUMNS` with a one-line `sed`,
so the constant must stay on one line. ⚠️ **Decisions for the owner:** a failed import at onboarding does not fail the shop
and shows no error, because *Agregar del catálogo* is the same import. On the onboarding screen the shop's own *Crear mi
tienda* is the import button: no giro chosen means *Omitir*. After a later import the route goes back, and Productos is
the confirmation. **Evidence:** Vitest **1741/1741 in 53 files** (the runner's tally); `conventions-gate.sh` 18 of 18;
`9d-starter-catalog-contract.sh` **10 of 10** over HTTP, run after `6c` the way CI orders them; its falsifier **4 of 4**,
each red for its reason; typecheck clean after regenerating the typed routes. **Looked at** on the iPhone 17 simulator
(Release, local shop, bundle checked to hold the local URL and no production ref): onboarding offers *Pollería · 24
productos*; Lupe's Productos shows the entry; her picker offers 23, because one product is already hers by name. ⚠️ **NOT
looked at: the untick list itself.** Reaching it takes a tap, and macOS refuses synthetic input to this terminal, so it
is **the owner's phone, R9**, together with the list's length and whether *Volver* should ask before discarding a choice.
No migration. **It reaches his phone with the next rebuild**: 4 October, or the paid-team build.
**`9e`, the Carnicería session with the owner, the same day: `0046_catalogo_carniceria.sql`**, generated, **54 new products**
in 3 new families (*Res* 29 and *Cerdo* 24, by the kilo; *Tuétano* 1, by the piece) plus *Huevo blanco* and *Huevo rojo*
**newly tagged** Carnicería. That makes 78 in the template, and 3 new category tags (*Cortes*, *Embutidos*, *Manteca*). ⚠️⚠️ **HIS RULINGS, 2026-10-01:**
(1) **A carnicería sells eggs, not chicken.** (2) **Grades are products**: *Molida de res* and *Molida de cerdo* each in
**90/10, 85/15, 80/20, 75/25, 70/30, lean first**, and *Bistec* and *Milanesa* of both animals *de primera* and *de segunda*.
They replace the plain rows. (3) **IVA 0 on everything**, the marinated and *embutidos* included. (4) **Tuétano is sold by the
piece, so it is a family of its own**, because C8.5 keeps one measure per family. *Pata de res* and *Manitas de cerdo* are by the kilo.
(5) Chorizo and Longaniza go under *Embutidos*, and *Manteca de cerdo* has a category of its own. ⚠️ **Names carry the animal**
(*Hígado de res*, *Pierna de cerdo*) because `product_variant_name_unique` is shop-wide, and Pollería already holds *Hígado*,
*Pierna*, *Retazo*. **Guessed and kept unchanged:** *Sirloin* and *Rib eye* as names, and every unit except Tuétano's.
**Left out:** carnero, borrego and other meats (*"not by the moment"*). Lifespans are blank. **Measured locally:** a fresh
shop imports 56 of 56, then 0 a second time (56 skipped); Pollería afterwards imports 22 and skips only the 2 eggs, so no
name collides across giros; `cat-embutidos` alone finds its 2 already in. All 31 behavioural suites pass with the
content present; `build.test.mjs` is 20 of 20 after the new migration.

☑️ **`8f` IS DONE, 2026-09-30** — and `8g` was then the next task, the owner's screen-by-screen review. His four rulings (asked, not decided): **light only** (`app.json`); **majority wins** for
the drifted pieces; **Precios' value under its word**; and headers, the tab colour and the first two screens
**are his, screen by screen** — so `8f` did not touch them. Built: `src/ui/BotonLleno` (**13** hand-drawn
filled buttons in 11 files, not the 9 on record — the three *Cancelar* gained the border the other ten had)
and `src/ui/Velo` (**13** veils in 6 files, now always fading in — six used to appear at once); the chosen
pill's 3 on bienvenida is 2 like the other five (Familia had none — the map was wrong there); busy fades 0.6
everywhere; `smallSize` names the 33 `bodySize * 0.85`; the cart timings live in `theme/pulse.ts`.
⚠️ **The empty band above *Hoy* was NOT removed, though the question offered it** — it is the dead-letter
banner's reserved room (`bannerRoom`), a ruling of its own. **Vitest 1719/1719 in 52 files;
`conventions-gate.sh` 18 groups, R14 counting 13 components; its falsifier 35/35.** **Looked at** on the iPhone 17
simulator (Release, local seed shop, production untouched): Precios at both sizes — no word breaks — and
Ajustes' filled buttons. The veil's fade and the *Cancelar* border are the owner's phone's to judge. No migration.

## Steps 0 through 4.5 — closed, and moved out of this file ✅

⚠️ **ARCHIVED 2026-09-19 to [`docs/plan/archive/steps-0-to-4.5.md`](plan/archive/steps-0-to-4.5.md)** —
6,361 lines, unedited. Steps 0, 1, 2 (`✅` in their own headings), 3, 4 and 4.5
(densely `✅` throughout, 41 / 50 / 31 completion marks) were closed and still being
carried in a file that had grown past a context window at ~313k tokens.

⚠️ **EVERY PLAN CHECK STILL READS THOSE ROWS.** `docs/checks/plan-corpus.sh`
assembles this file plus the archive directory and hands the result to each check,
so archiving is invisible to all of them — the lookups are content-addressed
(`| **task** |`), never by line number. `bash docs/checks/plan-corpus.sh --list`
shows what it assembles.

⚠️ **THE ARCHIVE IS *CLOSED*, NOT *WRONG*.** It is not
`archive/power-platform/`, which describes a system nobody is building. Everything
in it describes this system. The file's own header says how to move a section back
if work genuinely reopens — **move it, never copy it**, or the split guards will
count the row twice, which is what they are for.

---

## Steps 4.6 to 7, and the closed rows of 5R and 5P — moved out of this file ✅

⚠️ **ARCHIVED 2026-09-29 by `8b` to [`docs/plan/archive/steps-4.6-to-7.md`](plan/archive/steps-4.6-to-7.md)**,
unedited: the ADR-disagreement gate of 2026-09-07 (resolved), all of Step 4.6, Step 5's prose
and its closed rows, Step 6 whole, and the rows `5R-f`, `5R-g`, `7a`, `7b`, `7d`, `5P-a`.
`plan-corpus.sh` reads it, so every guard resolves those rows as before.

---

## Step 5 — the client (§2.8): what is still live

Everything else in Step 5 is closed and archived (above).

| Task | What it is | Size | Gate |
|---|---|---|---|
| **5a-iv-d** | **The eight-day reading**, and nothing else — C1.4's persistence, measured. ⚠️ **On the owner's iPhone 15** — the Android routing was withdrawn 2026-09-12; see the correction in the sizing section. ⚠️⚠️ **AND THE IPHONE HALF WAS TRADED AWAY BY THE OWNER ON 2026-09-22, WITH THE DAY-8 READING ALREADY IN HAND AND THE DAY-30 ONE STILL PENDING.** ***"Override anything related to the 30 day session check. I want to keep working from my device."*** He is using the app daily now, so that phone refreshes its session on every open and can no longer answer the question. **What survives is the sealed AVD** — a different Google account, no provisioning clock — **which is the whole reason a second instrument was sealed**; the 2026-10-13 row in the ⏳ block carries it. ⚠️ **The day-8 answer is unaffected and already recorded: the session survived eight days on both instruments.** | `XS` in effort, **longest lead time in step 5** | ⚠️⚠️ **A DATE, NOT WORK — it is not the next task, it is a diary entry.** ⚠️⚠️ **THE DATE IS SET BY A `5a-iv-a` BUILD: DAY 0 IS 2026-09-13, THE READING IS DUE 2026-09-21.** ✅ The `5a-iv-a` day-0 pre-check passed, so this is free. ⚠️⚠️ **The profile expires `2026-09-20T06:19:32Z` — BEFORE the reading.** Re-deploy first (`xcodebuild … -allowProvisioningUpdates`, then `devicectl install`), *then* open and look. **Do not open Wera before then.** ✅✅ **A SECOND, CLOCK-FREE INSTRUMENT WAS SEALED 2026-09-13 18:23 CST** — the AVD `wera-reading-5a-iv-d`, Google-signed-in on a **different account**, seal-tested and powered down. ⚠️ **Do not boot it; use `wera-android-36` for design and testing** — opening the app restarts the clock. ✅ **Session config READ (a report, not a measurement): time-box `0`, inactivity `0` — nothing expires a session**; reuse detection **On** at a `10s` interval, which is where the real risk now sits. ⚠️ **Day 8 is a CHECKPOINT, not the answer — look again on 2026-10-13 (day 30).** |
| **5f-iv** | ⚠️⚠️ **OUT OF THE PILOT — RULED 2026-09-24, AND THE ANSWER TO THE QUESTION THIS CHILD EXISTED TO ASK IS *NO*.** ~~gated on a decision the owner owes~~ — ⚠️ **struck in lower case deliberately, the rule `5b.8-i`'s row records.** *"Let's not do those discount controls part of the pilot yet, we will need to understand the interactions before creating anything like that. Any money 'knock-off' happens in her head and is out of the scope of the app for now."* ⚠️⚠️ **IT KILLED MORE THAN THE QUESTION ASKED, AND THE OWNER MAY NOT HAVE NOTICED — SO IT IS WRITTEN DOWN HERE RATHER THAN ACTED ON QUIETLY: C3.16's SETTING IS THE SAME AFFORDANCE.** *Reset-after-each-transaction* is a sale-only override expressed as a switch rather than as a tap, so *"any money knock-off happens in her head"* answers both, and **the discreet Home banner goes with it** — it existed only to announce that setting. ⚠️ **What survives untouched:** a price change persists, because there is now no other kind; `Editar` is where one is made; and C3.17's manager fence is unchanged. ⚠️⚠️ **THE ROW IS NOT DELETED, AND THAT IS `5d-iv-b`'s AND PROVEEDORES' REASON:** *"we will need to understand the interactions"* is a deferral with a condition on it, and the condition is watching the shop use Vender. **This row is what the answer comes back to**, and it opens by owing the word — the shape `Costos` already has. ⚠️ **Nothing is drawn for it**, and `5f-ii` draws no `...` rather than a dead one, because nobody has seen this affordance and there is nothing to preserve. **Deferred, not dropped.** ~~**The `...` quick actions: the price change and its persistence setting.** C3.15 — *prices are changed from the `...`, in two taps, at the counter, on both screens* — and **C3.16**, which is the half that reaches the shop rather than the screen: **a price change PERSISTS BY DEFAULT**, so the change made at the counter becomes the shop's price; a setting flips it to reset-after-each-transaction; and **while that setting is off, Inicio carries a discreet banner saying so**, because a shopkeeper who changed a price on Monday is otherwise surprised on Tuesday. ⚠️ **That banner is the SECOND thing Inicio has been asked to carry conditionally** — `5d-iv-b` already reserves room for the first — and two banners arguing about the top of one screen is the shape §2.8's Home ruling exists to prevent. ⚠️⚠️ **AND THE QUESTION THIS CHILD EXISTS TO ASK BEFORE IT DRAWS ANYTHING: does the `...` offer a cashier a price override FOR THIS SALE ONLY — one that never writes `price_list`?** The C3.17 ruling of 2026-09-23, *"leave the fence as is"*, settled who may change the SHOP's price and deliberately said nothing about a discount on one line. ⚠️ **A child that drew the control without asking would ship a button a cashier taps while nothing happens**, and not visibly: her PATCH is not refused, the row is simply invisible to her, so PostgREST answers **200 with an empty array** — measured by `5e-iii-a`, not inferred. ⚠️ **The write itself is already built and is not this child's**: `5e-iii-a`'s `editPlan` closes the row in force and opens the new one, in that order, because `price_list_no_overlap` allows no other. **It ships no migration** — widening the fence WOULD be one, and an append-only migration that merges automatically is exactly why this question was parked in front of the work rather than inside it~~ | `M` | ⏸️ **Deferred out of the pilot 2026-09-24** — it returns on the owner's word, after he has watched the shop use Vender |
| **5i** | ⚠️ **DEFERRED OUT OF `5a-iii` ON 2026-09-11 — THE v2 PILOT'S SIGN-IN.** **Facebook.** One `signInWithOAuth({provider:'facebook'})` on the shell `5a-iii` already built, **plus the `linkIdentity()` path for the accounts that exist by then** and `enable_manual_linking` (`supabase/config.toml:188`, `false` today). ⚠️ **The code is the smallest part of this task.** | `S` code, `M` everything else | ⚠️⚠️ **A PUBLIC `aviso de privacidad` PAGE.** Facebook Live mode needs it, Google publishing needs it, and LFPDPPP owes it regardless — **one page unblocks all three.** Plus the Facebook app and a Business portfolio ⚠️⚠️ **AND TWO PILOT-DAY INSTALL FINDINGS, PROMOTED FROM PROSE 2026-09-13 — neither is about sign-in, both block getting the app ONTO a pilot phone.** ⚠️ **Samsung's Auto Blocker can refuse a sideloaded install**, and C1.1 puts a Samsung among the four devices while there is no Play listing until this step — measured on a borrowed Galaxy Z Flip 8, where it also held the USB-debugging toggle shut. ⚠️ **The Release APK is signed with Expo's DEBUG keystore**; an app later signed with a real one cannot update an install made with this one — it must be uninstalled first, which costs a shop its local data. **Same family as the provisional bundle id: free now, not free once a pilot phone holds an outbox.** |

---

## Step 5R — the release path, and it is now a STEP (§2.11)

⚠️⚠️ **PROMOTED FROM PROSE TO TASKS ON 2026-09-21, ON THE OWNER'S INSTRUCTION, AND THE
TARGET CHANGED WITH IT.** §2.11 carries the release path as a paragraph and says *"it
is not a step because it blocks nothing"*. **That was true when the pilot's output was
a measurement. It is false now that the pilot's output is also a thing shown to
investors and partners** — the owner ruled on 2026-09-21 that the app ships to **both
public stores**, not to TestFlight and Play internal testing alone.

⚠️ **The recommendation on file was internal distribution only**, on the grounds that
App Store review sits inside §5's three-day observation window. **The owner overrode
it with a reason the recommendation had not weighed: a public listing is evidence to a
partner, and this pilot exists to raise money as well as to measure completeness.**
Recorded here rather than argued again.

⚠️ **§2.11's acceptance test survives the change and is not optional:** an over-the-air
JS-only fix shipped to a real device in under an hour, proven **before** pilot day.
Public review governs binaries; it does not govern OTA updates, so this is what keeps
a 48-hour review out of the observation window.

⚠️⚠️ **THE IDS ARE `5R-x` AND `5P-x` RATHER THAN `R1`/`P1`, AND THAT IS A CORRECTION MADE
THE SAME DAY.** They were first written `R1`–`R5` and `P1`–`P3`, and **every one of the
eight collided with a row that already existed** — `R1`–`R13` are `docs/CONVENTIONS.md`'s
RULE names (`R12` and `R13` are cited across the plan and read by
`conventions-gate.sh`), and `P1`–`P3` are falsification fixtures in the `5a-iv` tables.
⚠️ **A grep for `R3` returned a store gate and an empty-env-var fixture**, which is the
one-identifier-two-meanings defect this file has recorded several times. The `5` prefix
also says something true: §2.11 puts the release path *"running in parallel from 5a"*.

| Task | What it is | Size | Gate |
|---|---|---|---|
| **5R-a** | **The accounts, and the one-way door inside them.** Apple Developer Program enrolment and Google Play Console. ⚠️⚠️ **SUBMISSION IS WHAT MAKES THE BUNDLE ID PERMANENT** — `mx.bserafin.wera` has been provisional since `5a-iii-a` and stops being so the day a store accepts it. Anything about the name, the vendor prefix or the Spanish/English spelling is free today and a new app listing afterwards. ✅ **2026-10-01: BOTH ACCOUNTS EXIST — individual, in the owner's own name (no company for at least three months), fees paid. AND THE ID IS NOW `mx.wera.app`**, by his ruling, before any upload: bundle id, Android package and deep-link scheme together (`identity.test.ts` holds them equal). ⚠️ **Two consequences, both his to act on:** (1) ✅ **done 2026-10-01 by the owner** — the Supabase dashboard's Redirect URLs now also list `mx.wera.app://**` (the old entry stays); the hosted project's display name became *Wera Project* the same day — the project ref and URL are unchanged, so nothing in this repository moves; (2) a phone that has the old build keeps it as a SEPARATE app — open it with signal so its outbox is empty, then use the new one and sign in again. ⚠️ **Google: a personal account opened after 13 Nov 2023 must run a closed test with ≥12 testers for 14 continuous days before production** — that clock, not code, sets the earliest public Android listing | `S` | ⚠️ **Nothing technical. Enrolment latency is outside our control, which is why it is first** |
| **5R-b** | ⚠️⚠️ **NO LONGER TAKEABLE — SPLIT 2026-10-10 into `5R-b-i` (done) and `5R-b-ii`.** Split at `M` for two reasons that are not size: the second half is gated on the owner (an Expo login, and a phone that is not his), and its failures cannot be seen from this Mac (a cloud build, another person's phone, a timed update). **Third in the order set 2026-10-09, after `5R-c` and `5R-h`.** ⚠️ The seven-day treadmill it was to retire went first, on 2026-10-09: the paid account now signs the local build for a year. **EAS Build, and the update channel proven end to end.** A cloud build replacing the local Xcode path, installed on a phone that is not the owner's, plus §2.11's acceptance test: **a JS-only fix shipped over the air in under an hour** | `M` | `5R-a` |
| **5R-b-i** | ✅ **DONE 2026-10-10 — see the status log.** **Everything that needs no Expo account.** `expo-updates` with `runtimeVersion: { policy: 'fingerprint' }` and `app/fingerprint.config.js`; `app/eas.json` with two channels, `preview` (installed from a link) and `production`, each bundled from the EAS environment of the same name; `docs/runbooks/ship-an-update.sh`; and the evidence that a clean prebuild with default pods, which is what EAS runs, compiles for an iPhone and for Android | `S` | `5R-a` |
| **5R-b-ii** | **The cloud builds and the over-the-air proof, with the owner.** (a) His Expo login. Then `eas init` writes the project id and owner into `app.json`, and `eas update:configure` writes the updates URL. (b) The three `EXPO_PUBLIC_` values on EAS, in `preview` and `production`. The WhatsApp number goes there and never into this repository. (c) `eas build -p android --profile preview`, installed from its link on a phone that is not his. (d) §2.11's acceptance test: a JS-only change merged, shipped with the runbook, and seen on that phone, **timed from merge to seen, under an hour**. Then shipped back. (e) An iOS cloud build on his iPhone (ad hoc), which needs his Apple ID and its 2FA once. ⚠️ **His iPhone gets no update until it is rebuilt**: the 9 October build has no updates URL. If a local Xcode build is still made after this, it needs `updates.requestHeaders` naming a channel, because only EAS Build sets one. ⚠️ Run `bash docs/runbooks/ship-an-update.sh preview "…" --check` before the first real update; its EAS refusals have only been tested logged out | `M` | ⛔ The decisions block: his Expo login, and whose phone takes the first cloud build |
| **5R-c** | ✅ **DONE 2026-10-09 — `0053_account_deletion.sql` and *Tu cuenta* on Ajustes; see the status log.** Ruled by the owner the same day. **Account deletion, in-app** — a store gate for both stores. **What to build:** (a) one migration: drop the ten constraints from ledger and admin tables to `auth.users`, keeping each uuid; `workspace_member` becomes a tombstone on deletion (`user_id` no longer cascades; it keeps `display_name` and `role`, and gains a left-at stamp); `pilot_reading` survives a removed member; a former member appears in no member list and passes no fence. (b) `delete_my_account()`, a `security definer` function: it leaves every shop; a **sole owner's** call deletes the shop; it erases invite emails and then the login itself. ⚠️ **Deleting a shop with history is the risk to measure FIRST**: `stock_movement`, `failed_write` and the line tables carry `on delete restrict`, so a cascade from `workspace` may be refused. (c) Behavioural tests under `set role authenticated`, never as superuser. Cover a cashier deleting, a sole owner deleting, a co-owner deleting, a former member's sales still naming them, and a former member's uuid passing no fence. (d) The app: *Eliminar mi cuenta* where the account lives, the sole-owner warning with the export offer and the typed shop name; former members read *"Name (ex-miembro)"* wherever an actor is shown. (e) An ADR-035 paragraph, because the ledger's actor stops being a constraint | `L` | Nothing — ruled 2026-10-09 |
| **5R-d** | ⚠️⚠️ **THIS IS THE NEXT TASK, AS OF 2026-10-10 (after `5R-b-i`; `5R-b-ii` waits on the owner).** **The listing, and the law.** `aviso de privacidad` at a public URL (LFPDPPP, §2.2's cross-border disclosure), ⚠️⚠️ **and, since rulings 43–44 of 2026-09-28, the pilot's readings: `pilot_reading` (`0043`) stores what each named member did on Vender, Comprar and Desperdicio — times, taps and screens left — and the notice must say so before a shop the owner does not run carries a pilot build**, Apple privacy labels, Google Data Safety, screenshots, descriptions, age rating, test credentials for review. ⚠️ **One risk checked and probably already retired**: Apple requires *Sign in with Apple* only where an app uses third-party login **exclusively** — `5a-iii-a` shipped email sign-in beside Google, which is what should exempt us. **Verify against the current guideline before submitting rather than discovering it in review** ⚠️⚠️ **Since `5R-c`'s rulings (2026-10-09) the aviso must also say that a deleted account's NAME stays in the shop's records of the operations that person made** (*"si eliminas tu cuenta, el comercio conserva tu nombre en los registros de operaciones que hiciste"*), and that backups hold data for their window. **And Google's web deletion-request page lives here**: a page at the aviso's public URL with an email address, fulfilled by hand. ⚠️ **Have a Mexican privacy lawyer read the aviso before it is published** | `M` | `5R-a` |
| **5R-e** | **Submit, survive review, and be listed in both stores.** | `S` | `5R-b`–`5R-d`, and a build worth reviewing |
| **5R-h** | ✅ **DONE 2026-10-09 — the link on *Entrar* and `docs/runbooks/reset-a-password.sh`; see the status log.** **Second in the order set 2026-10-09.** ***¿Olvidaste tu contraseña?* — by WhatsApp to the owner, reset by hand.** His ruling: a link on *Entrar* opens WhatsApp (`https://wa.me/52<number>` with a prefilled message naming the email), falling back to the web if WhatsApp is not installed. ⚠️ **His number must NOT enter this public repository**: read it from `EXPO_PUBLIC_SUPPORT_WHATSAPP` in the gitignored `app/.env.local` (and an EAS secret once `5R-b` lands); the session's private memory holds it. Hide the link when the variable is unset. **The back-end half is his**: a script that sets a temporary password for one email on the hosted project and refuses any email not found. Writes to the hosted database are gated, so he runs it. The handbook says how, and that he confirms who is asking before he resets anything | `S` | Nothing — ruled 2026-10-09 |
| **5R-i** | ⏸️ **PARKED BY THE OWNER 2026-10-09 — returns on his word.** **Phone verification** (SMS or WhatsApp OTP through Supabase Auth's phone provider; costs money per message). Asking existing users to verify later is a prompt, not a migration. ⚠️ The number lives with the login and **is erased by `5R-c`'s deletion; the tombstone never keeps it** (ruled 2026-10-09) | — | ⏸️ Parked |
| **5R-j** | ⏸️ **PARKED BY THE OWNER 2026-10-09 — *"sometime in the future we'll need to perform verification, for now we're fine."*** **Email verification, a real mail provider and a self-service reset.** Turning `mailer_autoconfirm` off strands every unconfirmed account unless mail works, and the built-in sender allows about 2 emails an hour, so it needs custom SMTP first. The self-service *reset password* email belongs here and would replace `5R-h`'s WhatsApp path | — | ⏸️ Parked |

---

## Step 6 — closed ✅

Every row (`6a`–`6d`) is done; the section moved whole to `steps-4.6-to-7.md`.

---

## Step 7 — Números, and the read the tier-2 business runs on

⚠️ **WRITTEN 2026-09-21. §3 carries step 7 as the single word *"Números"*.** It is the
surface the BI half of the business model is sold on, and every view it reads is
already applied: `0031` purchases and gross revenue, `0032` price over time, `0033`
the month export. ⚠️ **Área 9 settled its content on 2026-09-14** — *"charts and
tables about their transactions … it doesn't have to be very robust nor
sophisticated for now"* — so this is three questions, not thirty.

| Task | What it is | Size | Gate |
|---|---|---|---|
| **7c** | ⚠️⚠️ **WHAT AM I THROWING AWAY — and the honest half is QUANTITY.** §2.9 records the cost half as broken under C8.6: on a despiece the numerator reads a shortfall lot's cost of **zero** and the denominator is purchases of a product the shop buys whole, so **the headline is 0 over 0**. Quantity by product is sound and is what ships. ⚠️ **Pricing waste properly is its own modelling decision and is not folded in here** | `M` | ✅ **UNGATED as of 2026-09-27** — ~~`6a` — there is no waste data until that screen exists~~. ⚠️ **Re-pointed from `6a` to `6a-i` and then cleared, because `6a` split that day and *a gate naming a row nobody can take is a gate nobody can clear*** — the trap `5h`'s and `5h.5`'s splits both recorded. `6a-i` closed 2026-09-27, so the screen exists. ⚠️ **What it still wants is DATA rather than a row**: a pilot shop that has actually thrown things away for a while |
| **7e** | ⚠️⚠️ **WHAT IS AT RISK OF BECOMING WASTE — DERIVED, NOT TYPED IN. REWRITTEN 2026-09-21 WHEN THE OWNER RULED OUT CAPTURING EXPIRY DATES.** ~~stock inside its last days, read from a captured `expiry_date`~~. **Three numbers per variant, all of them computed from records the shop already produces:** **shelf age** (how long the stock on hand has been sitting — `stock_batch.received_at`, which is `not null` and always present, against `batch_balance`); **days of cover** (what is on hand ÷ recent daily velocity, over `product_velocity_daily`, which `0013`/`0014` already ship); and **observed time-to-waste** (for each variant, how many days typically pass between receiving and writing off — read from `waste` against the batches it consumed). ⚠️ **A variant with more days of cover than its own observed time-to-waste is the buy-it-now candidate**, and that is the tier-2 signal without a single new field. ⚠️⚠️ **WHAT IT COSTS, AND IT IS THE REASON THE DEFERRED DECISION IS NOT FREE: a derived shelf life NEEDS WEEKS OF WASTE RECORDS BEFORE IT SAYS ANYTHING.** A typed expiry date answers on day one; this answers once the pilot has run long enough to have thrown things away. **That is a pilot-duration cost, not an engineering one**, and it is the owner's deliberate trade — see ⛔ DECISIONS OWED, área 7 | `M` | ⚠️ **`6a-i` and `5g` — RE-POINTED 2026-09-27**, because `6a` split that day and a gate naming a split parent is one nobody can clear. ✅ **Both screens now exist** (`5g-ii` 2026-09-25, `6a-i` 2026-09-27). ⚠️⚠️ **What is left in this gate is TIME and it cannot be hurried**: a derived shelf life needs weeks of waste records, and the clock started 2026-09-27 |

---

## Step 5P — the pilot itself, instrumented

⚠️ **WRITTEN 2026-09-21.** §5 defines the pilot and binds it; what it has never had is
a task that BUILDS the instrument. ⚠️⚠️ **And the owner's pilot is not quite §5's
pilot** — §5 says *"one store, three days physically present"* and measures
completeness; the owner needs **retailer engagement across two or three shops** and a
waste-pattern read he can take to investors. Both are recorded, and they are not the
same instrument.

| Task | What it is | Size | Gate |
|---|---|---|---|
| **5P-b** | ⚠️⚠️ **ENGAGEMENT ACROSS SHOPS THE OWNER IS NOT STANDING IN — and it is a DECISION before it is a task.** §5's overlay works because the schema owner is in the room; two or three shops over weeks is a different question. ⚠️ **The cheap answer needs no telemetry at all**: recording *is* engagement, so `sale`, `purchase` and `waste` row counts per shop per day already measure it, from the server, with nothing added to the client and nothing to disclose. ⚠️⚠️ **Anything beyond that — screen opens, session length, feature taps — is behavioural telemetry on identified merchants and engages LFPDPPP and the `aviso de privacidad` `5R-d` ships.** The recommendation is the server-side read, and the decision is the owner's | `S` for the read; unsized if telemetry is wanted | `5h`, and a shop with rows |
| **5P-c** | ⏸ **DEFERRED BY THE OWNER 2026-09-29** — *"I'm not concerned on this at all"*; the project turned to the beta (`## Step 8`). ~~this is the next task, as of 2026-09-28~~ — ⚠️ **struck in lower case deliberately, the rule `5b.8-i`'s row records.** **Completeness, the number the pilot is graded on.** The manual-tally comparison §5 requires, and the daily read that shows it — *"five consecutive days within 5%"* is a query, and running it by hand each evening is how a bad day gets explained away | `S` | `5P-a` |

---

## Step 8 — from alpha to beta: the cleaning day (2026-09-29) and the design day (2026-09-30)

**Written 2026-09-29, after midnight, at the owner's request** — *"make a diagnosis of the current
status of the way you're progressing, the graph and any other thing we leverage. And establish a one
day plan for us to tidy it along with its own Cleaning Prompt."* The prompt is in `docs/HANDBOOK.md`,
beside the main prompt, because that is the file he reads. **This section is the plan; the handbook
holds only the prompt and the pointer.**

### The diagnosis — every number measured 2026-09-29 00:30 CST, and the tool that gave it

**What is healthy — the product.**
- `npm --prefix app test`: **1,719 tests across 52 files, all green.** The last 40 CI runs
  (`gh run list`) were all green except one `db` failure on the `5P-a` branch, fixed before merge.
- `5R-f-schema-deployed.sh`: **6 of 6** — all 41 migrations applied to the hosted project.
- The hosted shop (`supabase db query --linked`): **24 sales, 10 deliveries, 2 write-offs,
  1 supplier, 28 products.** Every screen reads and writes that database; no screen runs on sample
  data (checked by searching `app/src/app` for mock, fake, sample or TODO: none).
- **The owner calls it an alpha, and that is accurate.** Selling, buying, waste, catalog, suppliers,
  corrections, Números, Precios, the month export and offline selling are built and connected.

**What is unhealthy — the process has outgrown the product** ([[process-must-not-outgrow-product]]
in the assistant's memory says he trades rigor for speed when a guard protects a document, not a shop).
- **The documents** (`wc -lc`): `docs/PLAN.md` **5,517 lines / 821 KB** — about 200k tokens, more than
  a session can read; `## Position` was at **1,298 of its 1,400 cap**. The archive is **11 files /
  18,955 lines**. `docs/HANDBOOK.md` is **1,193 lines / 263 KB** for a reader who is not a developer,
  and its catch-up contradicts itself (§2 mentions *"one of the four parked decisions"*, §3 says there
  are none; *What you are building* still calls Desperdicio an empty tab). `CLAUDE.md` **35 KB** +
  `app/CLAUDE.md` **29 KB** load into sessions, and most of it is the history of corrections to its own
  numbers. The warning sign appears **994 times** in the plan, **186** in the handbook and **70** in
  `CLAUDE.md` (`grep -c`) — when everything is flagged, nothing is.
- **The checks**: **75 shell scripts, 27,177 lines** in `docs/checks/`, against **42,483** lines of
  app source and **18,554** of app tests. A large share hold documents in agreement with each other,
  and `split-coverage` with its falsifier takes about six minutes.
- **The graph** (`graphify-out/graph.json`): **4,349 nodes, 8,592 edges, every one `_origin: ast`**,
  current as of `8d8758c` (built the same minute it merged). **1,500 of the nodes are `docs/`** —
  headings of the plan, mostly noise for a code question. No semantic layer (no API key), so it answers
  *where*, never *what was decided*. **34 dated snapshot folders, 105 MB**, nothing reads them.
- **Git**: **198 remote branches** — squash-merged PR heads nobody deleted — and **9 stale local**.
- **The assistant's memory**: **85 files**. Some describe one-off instruments (the sealed emulator,
  the 8-day reading) that expire with the dates block.

**What actually stands between the alpha and a beta — distribution, not code.**
- The app is installed with a free Apple account: **it stops opening every 7 days** (next: 4 October,
  14:28 UTC) and only this Mac can reinstall it. ⚠️ **No longer true since 2026-10-09**: the paid
  account signs the build for a year (see the dates block). A second person's phone cannot live like that.
  `5R-a` (Apple Developer Program + Play Console, **his** action) and `5R-b` (EAS / TestFlight) fix it.
- `5R-c` account deletion (a store requirement, ~~still needs a decision~~ **ruled and built
  2026-10-09, `0053`**) and `5R-d` the *aviso de privacidad* are the other two store gates. **No CI compiles the native app.**
- **Design readiness is unmeasured** — nobody has counted where colours, type sizes and animations
  live, or what the conventions gate will refuse when they change. That is `8e`.

### The day, in order — one row per session, the Cleaning Prompt takes the next one

⚠️ **Nothing a shopkeeper sees changes today**: no migration, no screen, no access rule. Each row
comes out **smaller** and says by how much. **Order matters**: `handbook-agreement.sh` looks up the
handbook's task rows in `docs/PLAN.md` itself, NOT in the corpus, so the handbook sheds its rows
before the plan archives them.

| Task | What it is | Size | Gate |
|---|---|---|---|
| **8a** | ✅ **DONE 2026-09-29** — 1,229 lines / 265 KB to 299 / 16 KB; the old file moved whole to `docs/plan/archive/handbook/handbook-through-2026-09-29.md` (a subfolder: in `docs/plan/archive/` itself `plan-corpus.sh` would read its task rows as second copies and `split-coverage` goes red — measured). **The handbook, rewritten for its reader.** One short file: what the app does today, what is on his phone, what is waiting on him, how a session goes (both prompts), the dates. The stale catch-up goes; the history moves to `docs/plan/archive/handbook-through-2026-09-29.md` — a MOVE. Keep `handbook-agreement.sh` green (its three sentinels stay, each exactly once). **Target: under 300 lines.** | `S/M` | — |
| **8b** | ✅ **DONE 2026-09-29** — 5,573 lines to 420, Position 1,283 to 71; see the status log. **The live plan, cut to what is live.** ⚠️ **The handbook still names `5b-ii-b-2`, `5b.8` and `5b.8-iii`** because `handbook-agreement-falsify.sh` hard-codes them, and `handbook-agreement.sh` looks them up in `docs/PLAN.md`, not the corpus — **archive those three rows and it goes red**; keep them, or make the retargeting of that falsifier part of the recommendation. Take the 2026-09-27 and 2026-09-28 status-log days out of `## Position` (APPEND to `status-log-2026-09-27.md`; open `status-log-2026-09-28.md`), and move closed step prose (4.6, the closed parts of 5, 5R-f/g, 6, 7a/b/d) to an archive file. Keep the two obligation blocks, every open row, Step 8 and the working agreement. `plan-corpus.sh`, `split-coverage.sh` and their falsifiers stay green. **Then list every guard that protects only a document from another document, with its runtime, and park ONE recommendation in ⛔ DECISIONS OWED about which to retire — retire nothing yet.** **Target: under 2,000 lines, Position under 600.** Update `CLAUDE.md`'s archive table by listing the directory | `M` | `8a` |
| **8c** | ✅ **DONE 2026-09-29** — 57 KB to 14 KB across both files. **`CLAUDE.md` and `app/CLAUDE.md`, rules only.** Keep what a session must obey (the non-negotiables, migrations, deploy, merge rule, domain words, graphify rules) and the pointers; drop the story of each number's corrections. Numbers that decay are replaced by the one-liner that measures them. **Target: each under 12 KB.** | `S` | `8b` |
| **8d** | ✅ **DONE 2026-09-29** — 17 branches, 34 graph backups (50 MB), 1 memory; see the log. **Housekeeping outside the documents.** Delete remote branches whose PR is MERGED (from `gh pr list --state merged`, never a guess) and the stale local ones; prune `graphify-out/` snapshot folders; run `graphify update .` and record the node count; read the assistant's memory index and delete or correct memories that are no longer true. **List first, then delete only what was listed.** | `S` | `8c` |
| **8e** | ✅ **DONE 2026-09-29** — https://claude.ai/artifact/4h59q1QEdc1q3ztYnN39EJ. **The design inventory for Wednesday — READ-ONLY.** Where every colour, font size, spacing value, radius and animation lives (`app/src/ui/` and every literal outside it), how many screens use each, what `conventions-gate.sh` refuses, light/dark handling, and a screenshot of every screen from the iOS Simulator. Published as a private page he can open on his phone. **It changes no code** — it is the map Wednesday starts from | `M` | `8d` |
| **8f** | ✅ **DONE 2026-09-30** — see the status entry above. **The design pass — Wednesday 2026-09-30, with the owner.** Colours, layout, animations and details, taken screen by screen from `8e`'s map. ⚠️ **What a shopkeeper sees is his call** — so the session walks him through the situations first, asks, then builds. **Sized by `8e`** (its entry) | `L`; `XL` with dark mode | `8e` |
| **8g** | ⏸️ **PARKED 2026-10-01 by the owner** — *"I'm in talks with a Graphic and UI designer that might be able to help me with the redesign of my screens."* Returns on his word, possibly as the designer's brief. **The owner's screen-by-screen review** — *"I will address this separately, will review screen by screen."* Carries what `8f` left for him: **one header style or two** (the four tabs draw iOS's white centred header, every other screen the cream `banda` with the title left); **the active tab's colour** (iOS blue — no tint is set in `(tabs)/_layout.tsx`); **sign-in and bienvenida outside the palette**; the chosen pill's subtitle, which drifted 1–1 (`ajustes`: body size, `tintaApagada`; `producto/nuevo`: `smallSize`, 600, `tinta`) so no count settles it; the veil inside the three **slide** sheets (carrito, Comprar's and Desperdicio's), which still rises with the sheet; and `bodySize * 0.9`, twice (`comprar`, `Deslizador`). ⚠️ **Walk him through each screen's situation before showing a design** | `M` | `8f` |
| **8h** | ⏸️ **Deferred 2026-09-30 by the owner — *"Light only, for now."*** **A dark palette**: all twelve roles and the five chart colours, re-held to the 4.5:1 contrast test, and `app.json`'s `userInterfaceStyle` back to `automatic`. Returns on his word | `XL` | `8f` |

⚠️ **Not in the day, and on purpose**: `5R-a` is the owner's to do (enrolment), and the
**4 October re-deploy** in ⏳ DATES OWED — ✅ done late on 2026-10-09 as `mx.wera.app`, signed for a year by the paid account, so the seven-day treadmill is gone without waiting for `5R-b`.

---

## Step 9 — the starter catalog by giro (planned 2026-10-01, with the owner)

**The ask, in his words:** *"create a default catalog that the users can get access to depending on the
business they run, this will allow them to import products in bulk depending on which business or
categories they're interested in … for both the onboarding stage and the additional steps"*, for **Pollería,
Carnicería, Verdulería, Frutería, Abarrotes, Cremería and Materias Primas**. *"There might be intersections
between catalogs and each product could have tags … each product is intended to have it's picture at some
point and once the user imports the products, he should be able to have access to them offline as well. We
don't need to enrich the front end for now in terms of filters or tags, but the feature should be enabled with
minimum controls to design UI later on."*

**What is already settled and not reopened:** ADR-035 §2.9 — a shop STARTS from a catalog we maintain, the
rows are COPIED into the workspace, never referenced across tenants; `0042` minted `is_prebuilt` and the fence
for exactly this import. **Offline is already solved for imported rows**: they are ordinary `product_variant`
rows and reach the phone through the persisted `['catalog','variants']` read. **Pictures stay C8.14/C8.15**:
this step adds the column and nothing else.

**The design, and the decisions made for the owner** (each reported in its PR):
1. **The template lives in a schema of its own, `catalogo`, that PostgREST does not expose**, reached only through
   two `security definer` RPCs in `public` — `catalog_template()` (read) and `import_catalog()` (copy). Putting it
   in `public` would widen the RLS guard's ONE exemption (`unit`, F3/F5); a private schema leaves the guard as it is.
2. **Giro is a tag kind, not a table.** Overlaps are one product carrying several tags (*Huevo*: Abarrotes,
   Cremería, Pollería), so a later giro's session tags an existing code rather than duplicating it.
3. ⚠️ **`product_variant.template_code` — cheap now, expensive later.** Without it an imported row can never be
   traced to its template again: no picture assignment, no tags on a shop's products, no "already imported".
4. **No prices in the template.** An imported product reads *sin precio* until the shop prices it.
5. **A re-import, or a name the shop already has, is skipped silently** (users don't do bookkeeping).
6. **Content is authored as one CSV per giro and GENERATED into a numbered migration** (`9b`); corrections are new
   migrations, so the append-only rule holds.

| Task | What it is | Size | Gate |
|---|---|---|---|
| **9a** | ✅ **DONE 2026-10-01** — see the status entry. **`0044`: the template schema and the import.** `catalogo.tag`, `.family`, `.product` (with `image_path`, nullable), `.product_tag`; one dimension per template family, enforced by trigger (C8.5, which the shop's own tables do not enforce); `product_variant.template_code` with a per-workspace partial unique index; `catalog_template()` and `import_catalog(workspace, tags, exclude)`; a behavioural suite (an import as manager, the staff refusal under `set local role authenticated`, a second import importing nothing, a name collision skipped, a second workspace untouched); the ADR §2.9 paragraph and the README row. **No content** — the template is empty until `9c` | `M` | Nothing — the design was planned with the owner |
| **9b** | ✅ **DONE 2026-10-01** — see the status entry. **The authoring format and its generator.** `supabase/catalog/<giro>.csv` and `build.mjs`: refuses an unknown unit, a family across two dimensions, a duplicate code or name, an undeclared tag — with the reason — and writes the upsert migration | `S` | `9a` — the generator writes into its tables |
| **9c** | ✅ **DONE 2026-10-01** — `0045`, 24 products; see the status entry. **Content session — Pollería, with the owner.** First because the pilot shop sells chicken. Drafted by the assistant, corrected by him row by row: family, name, units, IVA, tags | `M` | `9b` — the generator the content goes through |
| **9d** | ✅ **DONE 2026-10-01** — see the status entry. **The app, minimum controls.** A giro picker after the shop is created, ✅ **then the untick list the owner ruled on 2026-10-01** (grouped by family, all ticked, unticking sends `p_exclude`), then *Importar* / *Omitir*, one entry on Productos to import more, the template persisted for offline, `CACHE_SHAPE` bumped, a contract check over both RPCs, screenshots against a local shop. ~~owed to the owner first: whether the picker needs a preview with unticking~~ — ✅ **ruled 2026-10-01: it does** | `M` | `9a` — the RPCs it calls, and `9c` — something to import |
| **9e** | ✅ **DONE 2026-10-01** — `0046`, 54 new products and 2 newly tagged; see the status entry. **Content session — Carnicería, with the owner** | `M` | `9b` — the generator the content goes through |
| **9f** | ✅ **DONE 2026-10-02** — `0047` (`manojo`) and `0048`, 53 new products; see the status entry. **Content session — Verdulería** | `M` | `9b` — the generator the content goes through |
| **9g** | ✅ **DONE 2026-10-02** — `0049`, 46 new products and 6 newly tagged; see the status entry. **Content session — Frutería** | `M` | `9b` — the generator the content goes through |
| **9h** | ✅ **DONE 2026-10-02** — `0050`, 1,017 new products with brands, 14 tagged, and the Frutería berry correction; see the status entry. **Content session — Abarrotes** | `M` | `9b` — the generator the content goes through |
| **9i** | ✅ **DONE 2026-10-05** — `0051`, 79 new products, 73 newly tagged, and the new *Salsas y moles* category; see the status entry. **Content session — Cremería** | `M` | `9b` — the generator the content goes through |
| **9j** | ✅ **DONE 2026-10-09** — `0052`, 139 new products and 107 newly tagged; Step 9 is complete; see the status entry. **Content session — Materias Primas** | `M` | `9b` — the generator the content goes through |

**Questions the content sessions will raise, not this plan:** which products carry 16% IVA; count units the
`unit` table lacks (*docena*, *manojo*, *caja* — a case of 24 is already `pza` × `pack_size` 24, and a new unit
is a migration, so each gets a ruling); and what Materias Primas means. ✅ *manojo* ruled and added in `0047` (`9f`).
⚠️ **`caja` is parked by the owner as context, not a task** (2026-10-02): purchases ignore `pack_size` today; see `9f`'s status entry.

---

## The other edges — what the pilot must LEARN, and it builds nothing

⚠️⚠️ **WRITTEN 2026-09-21 BECAUSE IT WAS MISSING, AND THE OWNER HAD TO ASK TWICE.**
His brief of 2026-09-21 had five numbered points; the realignment earlier that day
answered four of them and **silently dropped 4.5** — *"understand the needs for the
other edges (Monitoring, Couriers, Restaurants) to ask for more funding."* He then
asked, in terms, whether the prompt had been read. It had not been read closely
enough. This section is that point, and it is also the answer to his point 1 —
*"the plan … doesn't have the focus of continuous integration for the other things I
mentioned."*

⚠️ **NOTHING HERE IS A TASK AND NOTHING HERE SHIPS.** It is a register: what the pilot
must **observe** so that the next round's engineering can be specified from evidence
instead of from imagination. Every answer below comes out of WhatsApp, a spreadsheet
and a notebook — **the owner already has the retailers and one courier**, so the
observations can start before the app can capture anything.

⚠️⚠️ **THE ONE ARCHITECTURAL FACT THAT SHOULD NOT ARRIVE AS A SURPRISE LATER: every
edge below is a SECOND TENANCY MODEL.** This schema has `staff`, `manager` and
`owner`, and all three live *inside one shop*; RLS is built so that one workspace can
never read another's rows, and there is a test suite whose only job is proving it. **A
courier who sees several shops' pickups, or a restaurant that sees a retailer's
surplus, is the exact inverse of that** — see §6's *"cross-workspace analytics schema"*
and *"collection-partner notifications"*, the two deferrals that touch this. **It is
not a screen on this app. It is the largest single decision the funding round buys**,
and the register below is what makes that decision cheap when it comes.

| Edge | What the pilot must come back with | Why it cannot be specified now |
|---|---|---|
| **Couriers** | Runs completed per day by one person; minutes per pickup and per drop; the route actually walked or driven; **cost per run against gross margin per run**; how often a pickup fails and why; whether anything needed cold chain; how the courier is paid and settled | **Capacity is the whole scaling model.** Every projection for 10 couriers multiplies a number nobody has measured once. One courier for three weeks produces it |
| **Restaurants** | What they will actually buy and what they refuse; **the discount that closes a sale**; how much lead time they need and by what hour of the day; typical order size; repeat rate across weeks; who in the kitchen decides; payment terms they expect | **A marketplace is worthless if the demand side is thin**, and nothing in the retailer's data can tell you what a chef will buy. Four or five relationships over a month answers it |
| **Retailers** *(supply side)* | The discount they will accept to move stock **before** it is waste; how much notice they need; whether they will hold something aside; **and the acquisition question — did the waste offer bring them in, and did they stay for the numbers?** | This is the hook's central claim and it is currently an assumption. The app measures whether they RECORD; only conversation measures whether they SELL |
| **Monitoring** | ⚠️ **AMBIGUOUS IN THE BRIEF AND DELIBERATELY NOT GUESSED AT.** Two readings: (a) the OPERATOR console — the owner watching which shops have surplus today, what moved, which runs happened; or (b) SYSTEM monitoring — uptime, failed writes, dead letters, whether a shop stopped recording. **Both are real needs and they are different products** | ⚠️ **Reading (b) partly exists already and nobody has said so:** §2.10 specifies a nightly check, `failed_write` is a vendor-side surface by §2.8, and `5c-iv`'s dead-letter banner is its merchant-facing half. **Reading (a) is the operator console and is genuinely unbuilt.** ⚠️⚠️ **This is a question for the owner, and it is NOT in ⛔ DECISIONS OWED because it blocks nothing today** — it blocks the funding ask, not the pilot |

**How to use this register.** Add to it as the pilot runs — one line per observation,
dated. ⚠️ **It is deliberately a REGISTER and not a status board**: nothing here has a
state, a size or a gate, because nothing here is being built. When the funding ask is
written, this section is the evidence; when the next architecture decision is taken,
this section is the input it was missing.

⚠️ **The honest sequencing point, repeated here because it is the one that decides
whether the money arrives:** three of the four rows above can be filled in **starting
this week**, with no app at all, and none of them gets faster by waiting for the build.
The engineering queue and the observation register should run in parallel, or the
three-to-four weeks of operating evidence lands *after* the software instead of
alongside it.

---

## Working agreement

One task per session. Before starting, estimate difficulty. Update this file when a
task closes — a plan that lags the code is the failure ADR-035 §9 names.

⚠️⚠️ **AMENDED BY THE OWNER 2026-09-24 — AN `M` OR AN `L` IS ONE SITTING NOW:**
*"we'll make an ammendment now that we have Claude Max, if a task is M or L, let's do
it at once, we have enough usage and space to do it."* **The old rule split anything
large; this one splits `XL` and above.**

⚠️ **THE PREMISE OF THE OLD RULE WAS A BUDGET AND IT HAS CHANGED, WHICH IS WHY THIS IS
AN AMENDMENT AND NOT A LOOSENING.** *"so the work survives a usage limit or a context
clear"* — the splitting was never about the work being clearer in halves, it was about
half-finished work being lost. A plan is a poor place to carry a subscription tier's
constraint after the tier has moved.

⚠️⚠️ **WHAT DOES NOT CHANGE, AND IT IS THE HALF THAT PAID FOR ITSELF: THE SIZING PASS
STAYS.** Sixteen of the seventeen splits in this project were preceded by an estimate
that **found something the row did not say**, and the finding — not the split — is what
those sessions were worth. `5f`'s sizing found the cart store §2.11 had already chosen,
the quantity control's contradiction with the ADR, and a commit payload that would have
hard-coded a gross/net identity. `5f-iii`'s, the same morning, found that the basket
sheet is the screen §2.5 rule 5 is written about. **None of those needed a split to be
worth taking; they needed somebody to look before writing.** So: estimate first, write
down what the estimate found, and then build the whole row.

⚠️⚠️ **AND A SPLIT MAY STILL HAPPEN AT `M` OR `L` — FOR A REASON THAT IS NOT SIZE, AND
IT MUST SAY SO IN ITS OWN WORDS.** Three survive the amendment, because none of them is
about how long a sitting is:

1. **A GATE.** Half the row is blocked on a decision the owner owes or an ADR amendment
   he has not made, and the other half is not. `5f-ii` was gated and `5f-i` was not;
   splitting is what let the unblocked half ship the same day.
2. **TWO FAILURE CLASSES IN ONE ROW, one of which nothing here can see.** This is
   `5c-iv`'s, `5d-iv`'s, `5e-iii`'s and `5f-iii`'s argument, and it is the strong one:
   when a row carries work whose mistakes cost a glance AND work whose mistakes are
   silent — the ledger, the queue — one row means **the invisible half rides in on the
   back of the visible one**, and it is reviewed as though somebody had looked at it.
3. **THE DEFERRAL TEST BELOW**, which already splits a row whose look-questions cannot
   be answered yet from the half that can be built today.

⚠️ **A size-only split at `M` or `L` is now the thing to refuse**, and a session that
wants one is asking for the old rule back. ⚠️ **`XL` still splits on size alone** —
`5f` listed twenty deliverables across a store, two screens and a question the owner
owed, and no premise about usage made that one row.

Every schema claim must be traceable to a migration CI has applied. A file is not
evidence; a green CI run is.

⚠️⚠️ **AND ITS COUNTERPART, RULED BY THE OWNER 2026-09-22: A ROW WHOSE ONLY
INSTRUMENT IS HIS EYES WAITS UNTIL THERE IS SOMETHING TO LOOK AT.**
*"If it's better for us to build something that needs to be looked at after we have
what's needed to actually look at it, let's keep it deferred."*

`R9` already routes a deliverable no check can see to the task that can see it. This
is the ordering half of the same sentence, and it was ruled the day `5c-iv-b`
demonstrated the gap: that task shipped a banner whose look is fenced out of every
suite by §2.11 — so the owner's phone is its whole instrument — **and nothing in this
app enqueues anything until `5f`, so the outbox is always empty and the banner never
draws.** It was reported as *"goes to the owner's phone"* when it could not.

**The test is two questions, and BOTH must be yes to defer:**

1. Is every judgement left in this row one no check here can make — rendering,
   navigation, layout (§2.11)?
2. Is the state it draws **unreachable today**, because the thing that produces that
   state has not been built?

⚠️ **One yes is not enough, and conflating them would stop the wrong work.** `5d` and
`5e` draw the catalog, which already exists: they answer *yes* to (1) and *no* to (2),
and they are takeable the moment they come up — the owner can open the app and look.
⚠️ **A row with real arithmetic in it is not deferred for the half that has a suite**;
`5c-iv-b`'s pricing was falsifiable here and 29 assertions read it. **What defers is
the part only an eye can settle.**

⚠️ **This is NOT a reason to revert `5c-iv-b`.** It is merged, green and correct, and
throwing away checked work buys nothing when the alternative is the same code written
later. **What it changes is where the look-questions are answered**: they move onto
`5f`'s row rather than being put to the owner blind, and they are listed there.
