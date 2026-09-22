# Conventions — how code in `app/` is written here

**One page, for the person writing the next file.** ADR-035 §3 puts this page in
step `5a` and says why: *"hiring gates on that file existing, because a junior
arriving before it does will write the conventions themselves, by accident, in
four places."*

Every rule below is **already true of `app/` today** — none of it is aspiration.
Most are read by a machine on every pull request, and the two that are not say so
in their own words. ⚠️ **This sentence used to carry the counts — *"nine rules;
seven of them"* — and it was stale from the day `R10` was added.** A number nothing
checks is a claim nothing keeps; the list in the command below is the count, and
assertion 0d reads it.

**This page is not the architecture.** ADR-035 decides; this page describes how
those decisions are spelled in files. Where the two disagree, **the ADR wins and
this page is the bug** — the same rule `docs/PLAN.md` carries.

| You want | Read |
|---|---|
| Why the client is shaped this way | [`ADR-035 §2.11`](adr/ADR-035-target-architecture-postgres-react-native.md) |
| What is being built next | [`docs/PLAN.md`](PLAN.md) |
| The repository's non-negotiables (migrations, evidence, RLS) | [`CLAUDE.md`](../CLAUDE.md) |
| The tooling and the working loop | [`docs/HANDBOOK.md`](HANDBOOK.md) |
| **How to write the file in front of you** | here |

```bash
bash docs/checks/conventions-gate.sh     # reads R1 R2 R4 R5 R6 R7 R8 R10 R11 R12 R13 against app/
```

---

## Where a file goes

```
app/
  src/app/            routes, and only routes — Expo Router maps file to URL
    (auth)/           the signed-out side of the door
    (tabs)/           the signed-in side
  src/api/            the data layer — one wrapper per RPC (R12, R13)
  src/<area>/         everything that decides something: auth, format,
                      navigation, theme, lib, scaffolding
  test/               the whole suite, .ts only, never beside the source
```

`src/app/` is a **routing table that happens to be made of files.** Anything you
would want to test, explain or reuse belongs in an area module beside it — see
**R3**, which is the rule the whole layout exists to serve.

---

## The rules

### R1 — Imports are written `@/…`, never a relative path that climbs

`@/theme/density`, not `../src/theme/density` and not `../../strings`.

The alias is declared **twice**: `app/tsconfig.json` for Metro and the
typecheck, `app/vitest.config.ts` for the suite. Vitest does not read
`tsconfig.json`, which is why the second copy exists — and a climbing relative
path is the one spelling that can resolve in one and not the other. It fails
loudly rather than silently, but it fails in CI rather than on your machine.

⚠️ `new URL('../app.json', import.meta.url)` in a test is **not** an import and
is not covered by this. A test that reads a file off disk is reading a file off
disk.

**Checked by:** `docs/checks/conventions-gate.sh`, R1.

### R2 — Tests live in `app/test/`, are `.ts`, and never reach a component

No `*.test.ts` beside the source. No `.tsx` in the suite, and no import that
resolves to one.

ADR-035 §2.10/§2.11, **amended by the owner on 2026-09-07**: a unit test belongs
here where it **pins a value a customer sees or the ledger stores** — the money
formatter, unit conversion, the outbox state machine. It is **refused over
rendering, navigation and layout**. `app/vitest.config.ts` collects `test/**`
only, so that boundary is structural rather than remembered; this rule is the
other half, which stops a component arriving through the side door.

**Checked by:** `docs/checks/conventions-gate.sh`, R2.

### R3 — Anything with a right answer is a pure module; the React that acts on it decides nothing

This is the convention the codebase is actually built on, and **R2 is only its
structural half.**

| Decides | Acts |
|---|---|
| `src/lib/env.ts` — which keys are refused | `src/lib/supabase.ts` — builds the client |
| `src/auth/guard.ts` — which side of the door | `src/app/_layout.tsx` — calls `router.replace` |
| `src/navigation/tabs.ts` — the tabs, as data | `src/app/(tabs)/_layout.tsx` — draws them |
| `src/navigation/lastScreen.ts` — where to reopen | `src/app/_layout.tsx` — navigates there |
| `src/api/workspace.ts` — the argument names, the columns, the membership | `src/api/calls.ts` — the three lines that talk to Postgres |
| `src/api/members.ts` — the two column lists, the roster's join, who may see it | `src/app/ajustes.tsx` — draws the section, or does not |
| `src/api/displayName.ts` — the write rule, the refusals, whose name it is | `src/app/ajustes.tsx` — draws the box, or draws the name |
| `src/api/requests.ts` — the two RPCs, the four statuses, which one she may see | `src/app/(onboarding)/bienvenida.tsx` — draws the wait, or draws nothing |
| `src/api/approvals.ts` — the RPC, the six columns, who may look, **and the order of the two lines** | `src/app/solicitudes.tsx` — draws the queue, or draws the empty room |
| `src/theme/densityMemory.ts` — what a stored mode means | `src/theme/DensityProvider.tsx` — reads it, writes it |

The left column is importable by a node suite; the right column is not, and by
§2.11 must not be. So **the decision is where the assertion can reach it.**
A rule written into a `useEffect` is a rule no check in this repository will
ever see.

Two habits follow, and both are visible in the files above: a module takes its
world **as an argument** (`readSupabaseEnv(env)`, `restoreTarget(state)`) rather
than reaching for `globalThis`; and a decision returns **a value** — a route, a
key, a scale — rather than performing an effect.

⚠️ **No machine can check this one.** A guard can see that the suite does not
import a `.tsx`; it cannot see that you wrote the decision inside one anyway.
When you do, say so in the file's header and name the task that will look at it
— which is **R9**.

**Checked by:** a person, at review. R2 covers its structural half only.

### R4 — Every word a shopkeeper reads is in `src/strings.ts`

`ES`, one flat `as const` object. No i18n runtime in v1 (§2.11): centralising
costs nothing now and makes a second language a refactor instead of an
excavation.

Two consequences worth stating, because both are already load-bearing:

- **Error handling maps a code to a KEY of `ES`, never to a sentence.**
  `src/auth/errors.ts` returns `keyof typeof ES.auth.errors`, so a Spanish
  sentence typed in at the call site is a **typecheck failure**, not a second
  copy nobody notices. ⚠️ **`src/api/errors.ts` is the second instance, added
  at `5b-i`, and it is deliberately the same shape** — one habit spelled twice
  is a pattern; two habits spelled once each are two dialects.
- **Developer-facing text is English and is deliberately not in `ES`.**
  `src/lib/env.ts` throws paragraphs of English. `ES` is what the app says to a
  *shopkeeper*; a build misconfiguration is read by whoever ran the build, and a
  shopkeeper can never reach it.

⚠️ **The module names are the domain vocabulary and are never translated.**
Comprar, Vender, Productos, Proveedores, Desperdicio, Números. An English build
of this app still has a `Vender` screen.

⚠️ **What the check misses, stated rather than left to be found:** it recognises
Spanish by its accents, and every *sentence* this app says has one. A single
unaccented word typed in place — `'Entrar'` — is invisible to it. A narrow guard
that says what it misses is worth more than a broad one that is believed.

⚠️⚠️ **And it reads JSX comments as code — found at `5b.7`, 2026-09-18.** The
gate strips full-line comments before applying any rule, precisely so that prose
explaining a trap is not reported AS the trap. That stripper recognises `//`,
`*` and `/*` at the start of a line, and a `{/* … */}` block inside JSX starts
with neither: its continuation lines are indented prose. So a Spanish *example*
in a JSX comment — a customer's name quoted to explain why the code does not
split on spaces — turns R4 red on a file that obeys it. **The failure the gate's
own header warns about, reached by the one comment syntax it did not enumerate**,
and the first screen to write Spanish prose in a JSX comment found it. ⚠️ Nothing
was loosened to make it green: the comment was reworded and the reason moved to
`@/auth/credentials`, which is the cheaper half of *never spell a check's
sentinel in the file it reads*. **Widening the stripper is a change to the gate
and needs a fixture in `conventions-gate-falsify.sh`; it is routed to the next
task that touches either file.**

**Checked by:** `docs/checks/conventions-gate.sh`, R4.

### R5 — Money is integer centavos; `@tienda/money` computes, `src/format/mxn.ts` renders

There is no peso-valued number anywhere in this client. Arithmetic is integer
centavos in `packages/money`, which is **owned by the schema owner** and is not
`app/`'s to edit (§2.10). Rendering is `formatMXN(centavos)`, which takes an
integer and returns a string nothing ever parses back.

So: **no `toFixed`, no division by 100, no `Intl` outside `src/format/mxn.ts`.**
Those are the two spellings of the one bug this whole path exists to prevent —
an exact integer turned into a double somewhere between Postgres and the screen.
`formatMXN` throws on a non-integer rather than rounding it, because the
friendly reading of `formatMXN(11.6)` renders `$0.12`: a wrong price, silently,
in the one place a shopkeeper trusts absolutely.

`src/format/mxn.ts` is exempt from the division because it is the one place that
separates pesos from centavos by **integer** arithmetic, with its reasons
written above it.

⚠️ **AND `src/format/date.ts` IS IN THAT DIRECTORY AND TOUCHES NO `Intl` AT ALL**
(plan `5b-ii-b-1`). It renders one value — when an invite code stops working — from
`Date` arithmetic and a month table in `src/strings.ts`, because the measurement
below is about `Intl.NumberFormat` on Hermes and `Intl.DateTimeFormat` is in the
same family. The rule did not have to bend; the second formatter simply stays on
the side of it that is already known to work.

⚠️⚠️ **THE `no Intl outside mxn.ts` HALF NOW HAS A MEASUREMENT BEHIND IT AND NOT
JUST AN ARGUMENT, AND IT IS NOT THE ONE ANYONE EXPECTED.** Plan task
`5a-iv-c-3`, on a Samsung Galaxy Z Flip 8 bought and used in Mexico
(`ro.csc.country_code=MEXICO`), 2026-09-13:

    new Intl.NumberFormat().resolvedOptions().locale   →   "es-US"

**The device's default locale is Spanish (United States), not `es-MX`** —
`persist.sys.locale=es-US`, and Hermes agrees. So **any `Intl` call that omits
the locale renders US conventions on a Mexican shopkeeper's phone**, silently,
and would pass every test in this repository because node's default locale is
whatever CI's is.

`formatMXN` was unaffected **only because it names `'es-MX'` explicitly** — and
the reason no other module could have got that wrong is this rule. ⚠️ **A rule
whose whole value is that it forbids a call nobody has made yet is the hardest
kind to keep**; this is the evidence that it is worth keeping. Asked for
`es-MX`, that device's ICU returned `es-MX` and formatted C12.2 correctly, so
the data is there — **the default is simply not the country the phone is in.**

**Checked by:** `docs/checks/conventions-gate.sh`, R5.

### R6 — A size a person looks at comes from `useDensity()`, never from a literal

`fontSize`, `height`, `gap`, `padding*`, `margin*`, `borderRadius`,
`lineHeight` — all from `scale`, never a number.

C3.18: *"many users are old; we want to prioritise the visibility of essential
things big and at a glance."* Two modes, normal and `Letra grande`. A literal
`fontSize: 16` is a screen with **one** density that does not say so — and
retrofitting the second mode later is not a theme change, it is an audit of
every hardcoded number in the app, whose misses are exactly the rows an old
customer cannot read.

⚠️ `flex`, `borderWidth`, `opacity` and `zIndex` are **not** sizes and are not
covered. Elder mode does not change them.

⚠️ Density is **size only — no colours, no fonts.** Mixing a palette into
`src/theme/density.ts` would make `elder` a second *theme*, and then every
screen would have to choose between them.

**Checked by:** `docs/checks/conventions-gate.sh`, R6.

### R7 — Two environment variables, both `EXPO_PUBLIC_`, spelled out in full

`process.env` is read in `src/lib/supabase.ts` and nowhere else, as two member
expressions written out in full.

Expo's babel plugin **inlines** `process.env.EXPO_PUBLIC_FOO` where it is
written; it does not build a populated `process.env` for the bundle. So
`readSupabaseEnv(process.env)` typechecks, passes in node, and hands the phone
an empty object. The full spelling is the thing the bundler can see.

Two traps, both already paid for:

- ⚠️ **`NEXT_PUBLIC_` is not a wrong value, it is `no` value.** Supabase's
  Connect dialog hands out the Next.js spelling by default and the owner pasted
  exactly that on 2026-09-11. Expo drops it before the app exists, so nothing in
  the app can tell it from a variable nobody set.
- ⚠️⚠️ **The key is the publishable one.** `sb_secret_…` / `service_role`
  **bypasses RLS entirely** — every policy, every pgTAP suite, every green
  `db.yml` run evaluates to nothing — and the wrong key does not fail, it
  *works*, unfiltered, on a phone in somebody else's shop. `src/lib/env.ts`
  refuses both spellings, including the legacy JWT whose text contains no such
  word.

**Checked by:** `docs/checks/conventions-gate.sh`, R7.

### R8 — Every module outside `src/app/` opens with a header saying why it exists

A `// =====` block at the top: what this module is for, what it deliberately
does **not** do, and which trap the next person would otherwise walk into.

This is the habit that makes `guard.ts` and `mxn.ts` readable by someone who
was not in the conversation. It is not decoration: nearly every header in this
codebase is the record of something that went wrong once.

⚠️ **Routes are exempt, and the exemption is the rule's point.** A file under
`src/app/` that mounts a component has nothing to explain. A module that
*decides* something has.

**Checked by:** `docs/checks/conventions-gate.sh`, R8.

### R10 — The app runs on Hermes; CI runs Node. `Intl` is limited to what has been measured on a phone

In `src/format/mxn.ts` — the only module allowed to touch `Intl` at all (**R5**)
— the permitted surface is **`format()` and `resolvedOptions()`**, and nothing
else.

⚠️⚠️ **This is an allow-list, not a deny-list, and the distinction is the
rule.** The banned names below are not "known missing". They are
**unmeasured** — and on 2026-09-13 an unmeasured one took the app down on
launch:

> `TypeError: undefined is not a function` at `formatMXN`. `Intl.NumberFormat`
> constructs on Hermes and `.format()` returns `$1,234.50` correctly. **`.formatToParts()`
> is not there.** The app terminated on the splash, on the owner's own iPhone,
> the first time it was ever run on a device.

**The twenty-six assertions over `formatMXN` were green throughout.** They run
under Node, which ships full ICU. *"A file is not evidence; a green CI run is"*
still holds — but a green CI run is evidence **about the runtime CI used**, and
that is not the runtime the shopkeeper holds.

So: before using any other ECMA-402 method, **put it on a device and look.**
Then add it here and to the gate's allow-list, with the date you measured it.

⚠️ The same trap is already written down in `src/lib/env.ts`, about `atob`:
*"HAND-ROLLED, AND THE REASON IS THE TWO RUNTIMES."* That warning and
`formatToParts` were written in the same step. Writing the warning is not the
same as taking it.

⚠️⚠️ **AND THE SECOND RUNTIME WAS MEASURED ON 2026-09-13, PLAN TASK `5a-iv-c-2`
— IT DISAGREES WITH THE FIRST, AND THAT IS WHY THIS IS AN INTERSECTION AND NOT
A LIST.** A Release APK on an API-36 emulator, the strings read back out of the
running app's view hierarchy as code points:

| Probe | Android Hermes | Code points |
|---|---|---|
| `format(1)`, currency es-MX/MXN | `$1.00` | `24 31 2e 30 30` |
| `format(-1)` | `-$1.00` | `2d 24 31 2e 30 30` |
| `format(1234.5)` | `$1,234.50` | `24 31 2c 32 33 34 2e 35 30` |
| `resolvedOptions()` | `locale=es-MX currency=MXN useGrouping=true` | |
| `formatMXN(123450)` | `$1,234.50` | `24 31 2c 32 33 34 2e 35 30` |
| `formatMXN(0)` | `$0` | `24 30` |
| `formatMXN(-99)` | `-$0.99` | `2d 24 30 2e 39 39` |

✅ **`format` and `resolvedOptions` now have evidence on BOTH runtimes**, and
C12.2's two promises — comma thousands, point decimals — hold byte-for-byte on
each. No `MX$`, no `U+00A0`, no comma decimal.

⚠️⚠️ **THE FINDING: `Intl.NumberFormat.prototype.formatToParts` IS A FUNCTION ON
ANDROID HERMES.** The name that terminated the app on an iPhone is simply
*there* on the other platform. Hermes gets ECMA-402 from the host — Apple's
Foundation on one side, Android's ICU on the other — so **the surface is a
property of the PLATFORM, not of the engine**, and two devices running "Hermes"
do not agree about what exists.

⚠️⚠️ **SO THE ALLOW-LIST IS THE INTERSECTION OF THE RUNTIMES THE PILOT SHIPS TO,
AND A SINGLE GREEN DEVICE IS NOT A MEASUREMENT — IT IS ONE OF TWO.** Had Android
been measured first, `formatToParts` would have read as present and correct, and
the crash would have shipped to the iPhone half of the pilot (**C1.1**: an
iPhone 11 and an iPhone 15 are two of the four devices). ⚠️ **The date beside a
name below is the date it was measured on the runtime that is WORST about it**,
and a name stays banned while any shipping platform has not been asked.

⚠️ Also measured, and also still banned: `Intl.PluralRules` is `undefined` on
Android Hermes (`new Intl.PluralRules(…)` → *"undefined cannot be used as a
constructor"*, which is the fixture `5a-iv-c-2`'s check was falsified with);
`Intl.DateTimeFormat` and `Intl.Collator` are functions on Android and have
never been asked on iOS. **Present on one platform is not a measurement.**

**Checked by:** `docs/checks/conventions-gate.sh`, R10.

### R11 — A colour a person sees comes from `src/theme/palette.ts`, never from a literal

`backgroundColor`, `color`, `borderColor`, `tintColor` — all from `PALETTE`,
never `'#FFFFFF'`, never `'white'`, never `rgba(0,0,0,.4)`.

Área 13, ruled by the owner on 2026-09-17: *"let's go full B."* **Eleven named
roles, and a role has one job.** `atencion` is the unpriced row and a line
priced `$0.00` — it is not "the orange one". Picking a role means finding the
sentence that matches what you are building; inventing a hex means the app now
has two ambers, and the second one is the state nobody looks at.

⚠️ **It is `R6`'s argument about colour.** The client reached `5b-i` with
twenty-nine source files and **zero colour in any of them** — measured, not
assumed. Retrofitting a palette onto finished screens is an audit of every
file, and its misses are the empty list, the failed write, the row with no
price.

⚠️⚠️ **NO STATE IS EVER ANNOUNCED BY COLOUR ALONE** — always colour **and** a
word, or colour **and** a border. This is the rule that survived from the
rejected direction C, and it is the one thing on this page **no check can
see**: §2.11 bans rendering suites. It is also not politeness. `accion` and
`atencion` are **1.18:1 apart in luminance** (`app/test/palette.test.ts`
asserts it): green-acts and amber-warns are carried entirely by *hue*, and hue
is the channel roughly one man in twelve does not have. **The word is the fix,
and the word is free.**

⚠️ `src/theme/palette.ts` is the one file exempt, exactly as `density.ts` is
exempt from `R6`. Everything else in `src/`, routes included.

⚠️ **Density is size; the palette is colour. Neither file holds the other's
tokens**, or `Letra grande` becomes a second *theme* and every screen has to
choose between them.

**Checked by:** `docs/checks/conventions-gate.sh`, R11.

### R12 — Postgres is reached through `src/api/`, and a screen reaches `src/api/` through a hook

`useMyWorkspaces()`, `useOnboardWorkspace()`. Never `supabase.from` or
`supabase.rpc` in a screen, and never an import of `@/api/calls`,
`@/api/errors` or `@/lib/supabase` from anything under `src/app/`.

§2.11: *"`src/api/` — one wrapper per RPC. Juniors never call `supabase.rpc`
directly."* The layer `5b-i` built is five modules over one boundary; `5b-ii-a`
added a sixth on the pure side of it and `5b-ii-b-2` an eighth; `5c-i` added a
ninth plus the first two modules on the far side that are not Postgres at all;
`5c-ii-a` added a tenth and the module that binds its ports; `5c-ii-b-2` added an
eleventh and the module that owns the connectivity import;
the boundary is the rule:

| Module | What it is | Can a node suite load it? |
|---|---|---|
| `src/api/workspace.ts` | the contract — the RPC's name, its argument names, the column list, and every decision about them | **yes**, and `app/test/api-workspace.test.ts` does |
| `src/api/members.ts` | the roster's contract — two column lists, the join PostgREST cannot do, and who may see the list of people | **yes**, and `app/test/api-members.test.ts` does |
| `src/api/invites.ts` | the invite's contract — the RPC's name, its four `p_` arguments, the `location` column list, and the copies of `0028`'s own refusal rules | **yes**, and `app/test/api-invites.test.ts` does |
| `src/api/redeem.ts` | the redemption's contract — the RPC's name, its one `p_` argument, the normaliser, and the **two lengths** that decide which credential a person is holding | **yes**, and `app/test/api-redeem.test.ts` does |
| `src/api/displayName.ts` | a person's own name — the RPC's name, its two `p_` arguments, and the **marker** that separates `0035`'s two `42501`s. ⚠️ Both SQLSTATEs it raises mean something different here than they do app-wide | **yes**, and `app/test/api-display-name.test.ts` does |
| `src/api/requests.ts` | asking to join — two RPC names, one `p_` argument, the four statuses `0029` answers and the four states it computes. ⚠️ It reads `42501` as **the code and not the session**, which is a screen-local judgement argued in the file and measured by `docs/checks/5b-iii-b-request-contract.sh` | **yes**, and `app/test/api-requests.test.ts` does |
| `src/api/approvals.ts` | who is waiting to be let in — the RPC's name, its one `p_` argument, the six columns `0037` returns, and the `owner` fence that has to be asked **before** the call because a refusal and an empty queue are the same answer on the wire. ⚠️⚠️ It also holds `linesOf`, and that is deliberate: §2.11 keeps rendering out of scope, so the owner's ruling of 2026-09-19 — **the email is the header, the name is the subtitle** — is a pure function a test can read rather than a paragraph in a screen | **yes**, and `app/test/api-approvals.test.ts` does |
| `src/api/errors.ts` | a Postgres or PostgREST code mapped to a **key** of `ES.api.errors` | **yes** |
| `src/api/outbox.ts` | the offline queue's contract — the four kinds `0024` allows, the three states §2.6 names, the shop each write belongs to, and the transition function that is the whole of what the queue decides. ⚠️ It is the one `src/api/` module whose subject is NOT an RPC: §2.11 names the outbox state machine among the three things a client unit test may pin, so this suite is its whole instrument rather than a second opinion beside a contract check. ⚠️⚠️ Its payload is `failed_write.payload`'s shape — arguments keyed by name, **no `p_` prefix** — because `replay_failed_write` reads it directly | **yes**, and `app/test/api-outbox.test.ts` does |
| `src/api/flush.ts` | what a flush DOES — the drain order, single-flight, `recorded_offline`, the RPC each kind is sent to, and the branch that dead-letters. ⚠️⚠️ **The one module here whose `p_` argument names are BUILT rather than written**: `0024` stores `failed_write.payload` keyed by argument name with no prefix and `0026` reads it that way, so the prefix is added at the call and the prefix rule IS the contract. ⚠️ It decides nothing about WHEN a flush runs — that is `5c-ii-b` | **yes**, and `app/test/api-flush.test.ts` does, with all five ports injected |
| `src/api/deadletter.ts` | transient against permanent — `record_failed_write`'s name and its seven `p_` arguments, the allow-list of codes that mean no retry will ever work, and which kinds the server downgrades. ⚠️⚠️ **It is the only module in this app that can change the LEDGER**, and it does so silently by design (C10.5): a downgrade reconciles quantity and carries no revenue, no tax split and no batch attribution. ⚠️ `42501` is read here as **the membership and not the session**, the opposite of app-wide, and the distinction is measured rather than argued — an expired token is `PGRST301` and never reaches the function body | **yes**, and `app/test/api-deadletter.test.ts` does; `docs/checks/5c-iii-dead-letter-contract.sh` is what puts the codes in front of a real database |
| `src/api/calls.ts` | the only module that says `supabase.rpc` or `supabase.from`. Three lines per call | **no** — it imports the live client, which runs side effects at module scope |
| `src/lib/outboxDb.ts` | the only module that opens the queue's SQLite database — the table, the `PRAGMA user_version` migration, and the marshalling. ⚠️ A table on the PHONE, not a migration | **no** — `expo-sqlite` is native |
| `src/lib/ids.ts` | where a client uuid comes from, and the only place it does | **no** — `expo-crypto` is native |
| `src/lib/flushRunner.ts` | the only module that binds the flush's five ports to the real queue and the real client — and the app's ONE flusher, which is what makes single-flight mean anything | **no** — it reaches both native halves |
| `src/api/connectivity.ts` | WHEN a flush runs — the debounce over the handover blip, the de-duplication of a repeated payload, the app-state wake, and the retry ladder designed to straddle the **90 seconds** `5c.5` measured the auth layer can spend refusing from cache. ⚠️ Its subject is not an RPC either: it is the trigger `src/api/flush.ts` deliberately does not own | **yes**, and `app/test/api-connectivity.test.ts` does — it is the whole instrument for that task |
| `src/lib/connectivityMonitor.ts` | the only module in this app that imports a connectivity library, and the first caller of the flusher. ⚠️⚠️ **Everything else READS THE SIGNAL, NEVER THE LIBRARY** — `subscribe()` is how `5c-iv`'s notice will, and a second `expo-network` import is a banner and a drain that can disagree | **no** — `expo-network` and `AppState` are native |
| `src/api/hooks.ts` | what a screen may ask, over TanStack Query | no |
| `src/api/QueryProvider.tsx` | one `QueryClient` per mount, never at module scope | no |

Three habits follow, and each is the record of a way this goes wrong:

- **A wrapper throws; it does not return `{ data, error }`.** supabase-js never
  rejects, and TanStack Query decides `isError`, retries and invalidation from
  a **rejected promise**. A wrapper that resolved with an error object is one
  every caller has to remember to unpack — and the one that forgets caches a
  success holding a failure.
- **A screen is handed a Spanish sentence or nothing, never a PostgREST error.**
  `useOnboardWorkspace().create()` returns `string | null`. Hand the error to
  the screen and there are as many opinions about what it means as there are
  screens.
- **If it came from Postgres it lives in Query.** Not in a `useState` beside it.
  A second copy of a row is a second answer to *"is this still true?"*, and only
  one of the two is invalidated when the write lands.

⚠️ **The read is disabled while there is no session, and that is correctness,
not economy.** `workspace_select` is `id in (select public.my_workspaces())`
over `auth.uid()`, so an anonymous read **succeeds and returns zero rows** — it
would cache a truthful-looking *"belongs to no shop"* against the next person to
sign in on that phone.

⚠️ **Two instruments, and they watch different halves.** The gate reads the
**screen** side — a route that reaches past the hooks. `app/test/auth-errors.test.ts`'s
*"the library has exactly one caller"* block pins the **inner** side as an exact
list: `supabase.rpc`/`supabase.from` in `api/calls.ts` and nowhere, and
`@/lib/supabase` imported by `api/calls.ts` and `auth/AuthProvider.tsx` only.
That list growing a third entry is the boundary going, and it goes the way it
always goes: one screen, in a hurry, reading one table for itself.

⚠️⚠️ **THAT BLOCK NOW PINS FIVE LISTS, AND FOUR OF THEM ARE THE ONLY INSTRUMENT
THEIR RULE HAS.** As of `5c-ii-b-2` it also holds **`expo-network` to
`lib/connectivityMonitor.ts`**, **`@/api/connectivity` to one driver**, **`AppState`
to two owners** (the session store's auto-refresh and the monitor's wake — different
subjects over one core API, so it is pinned as an equality at two rather than argued
down to one), and **`@/lib/flushRunner` to one caller**, because the app's one flusher
is what makes `@/api/flush`'s single-flight gate mean anything. Each was falsified by
grafting the import onto a module that does not own it; each turns exactly its own
assertion red.

**Checked by:** `docs/checks/conventions-gate.sh`, R12 — the screen side. The
suite pins the other, in `app/test/auth-errors.test.ts`.

### R13 — An RPC's name, its `p_` arguments and the columns it asks for are written once, in a module the suite can read

`supabase.rpc(ONBOARD_WORKSPACE, onboardArgs(input))`, never
`supabase.rpc('onboard_workspace', { p_display_name: name })`. And never
`select('*')`.

⚠️⚠️ **PostgREST matches an RPC BY ITS PARAMETER NAMES, and no typecheck has
ever read a migration.** Send `display_name` where `0027` declared
`p_display_name` and the call does not fail — it **fails to find the function**:
`PGRST202`, HTTP 404, *"Could not find the function
public.onboard_workspace(display_name) in the schema cache"*. Measured against
the applied schema on 2026-09-14, not recalled. The bundler, the typecheck and
the suite all pass over it, which is why the names live in one module and
`docs/checks/5b-i-api-contract.sh` — **a real HTTP round trip against a reset
database** — is what asserts they are still the ones the database answers to.

⚠️ **`select('*')` is a promise to keep parsing whatever a later migration
adds**, and it ships every column of the row to a phone, including ones added
for a report nobody on that screen may see. Name the columns, once, beside the
RPC's name.

⚠️⚠️ **AND ON ONE TABLE IT IS THE ONLY THING STANDING BETWEEN A SECRET AND A
PHONE.** `workspace_invite_select` is `has_role(workspace_id, 'manager')` — a
manager may read the WHOLE row, `token_hash` included. `src/api/members.ts` asks
for `email,accepted_by` and the policy would have given it more. So the named
column list is not tidiness there, it is the fence; `docs/checks/5b-ii-a-roster-contract.sh`
asserts the hash is readable **and** that it never comes back on the read the
app actually makes, because a `*` contains no word a string-matching check could
have caught.

**Checked by:** `docs/checks/conventions-gate.sh`, R13.

### R9 — A deliverable no check can see is written down as such, and routed to the task that can see it

When you build something this repository's checks cannot reach — a label that is
*rendered*, a redirect that actually *fires*, a session that survives the app
being *closed* — **say so in the file's header, and name the task that will look
at it.**

§2.11 refuses suites over rendering, navigation and layout, so this is not a
gap to be fixed; it is a permanent property of the client, and the only defence
is that each instance is **written down at the moment it is created** rather
than discovered later as an untested claim.

It has already been paid for twice. `5a-ii`'s falsification F14 set
`tabBarShowLabel: false` — icons with no words, the one thing C12.1 forbids —
and **nothing turned red.** `5a-iv` exists as a task because six deliverables
across four tasks accumulated in exactly this way, and it was re-sized from
`S/M` to `L` when someone counted them.

Look at the headers of `src/auth/guard.ts`, `src/navigation/tabs.ts` and
`src/navigation/lastScreen.ts` for the shape. Each names its unseeable half and
hands it to the owner's phone.

⚠️ **No machine can check this**, by construction: a check that could see the
claim would be the check whose absence is the claim.

**Checked by:** a person, at review — and by `docs/PLAN.md`, which is where the
named task ends up.

---

## Two things that are not conventions, and are not yours to change

- **`packages/money` is owned by the schema owner** (§2.10). `app/` imports it.
  A centavo of its arithmetic reimplemented in a screen is the seam gone.
- **`app/**` ships no migration, ever.** Step 5 ships no schema change by
  design; that property is what makes a screen cheap to get wrong. If you need
  a column, it is a plan task, not an edit.

---

## ⚠️ What this page does not cover yet — the `src/ui/` conventions, owed at `5h.5`

**There are no `src/ui/` conventions here, because there is no `app/src/ui/`.**
Measured, not assumed: the app is thirty source files and the only shared
component in it is `src/scaffolding/Pendiente.tsx`, which exists to say a screen
is not built yet.

ADR-035 §3 put `src/api/` and `src/ui/` in step `5a` so that *"step 6's four
screens arrive to a pattern"*; this build spread them across `5d`–`5h`, and
**the owner ruled on 2026-09-13 that the re-sequencing stands and the pattern
gets described once `5b` has produced a real one** — rather than ten primitives
guessed at against screens nobody has drawn.

✅ **THE `src/api/` HALF IS WRITTEN, AT `5b.5` ON 2026-09-18 — see `R12` and
`R13` above, and the row added to `R3`.** `5b-i` produced the real pattern the
ruling was waiting for. ⚠️ **The `src/ui/` half is unchanged by that**: the
primitives are built at `5d`–`5h`, against screens that will exist, and
describing them today would be the exact thing the owner refused. So the
obligation moves down the same ladder it moved down before — to **`5h.5`**,
after the last screen that builds a primitive and **before step 6**, which is
all ADR-035 §2.10 ever asked for (*"the claim here is about order relative to
step 6"*). ✅✅ **AND ADR-035 §3 SAYS SO IN ITS OWN WORDS, AS OF THE OWNER'S
RULING OF 2026-09-18** — a `5b.5.` entry for `src/api/` and a `5h.5.` entry for
`src/ui/`. **The ADR is not merely compatible with this page; it names the same
task**, and the gate asserts it still does.

⚠️ **THE COLOURS LANDED AT `5b.6` ON 2026-09-17 — see `R11` above.**
`app/src/theme/palette.ts` holds the eleven roles and the gate reads them.
⚠️ **The MOTION rule is still only prose**: one staggered entrance per screen,
`transform` and `opacity` only, because those two run on the compositor and
animating layout, colour, shadow or blur does not — C1.1 puts two low-end
Androids in the pilot. ADR-035 §2.11 carries it as a row. **No check can see it,
and no screen animates yet**; the first one that does is `5d`'s, and the plan
says to measure the Inicio morph on the owner's own device before it.

So if you are about to write **the second RPC wrapper**: the pattern is `R12`
and `R13` above, and `app/src/api/workspace.ts`'s header is where the reasoning
is. If you are about to write **the first shared component**: there is no rule
here yet, so write it down at `5h.5` rather than inventing it in four screens,
which is the exact accident §3 wrote this page to prevent.

⚠️ **This section is checked, not merely written.**
`docs/checks/conventions-gate.sh` reads the task named in the heading above,
finds that row in [`docs/PLAN.md`](PLAN.md), and fails if it is closed, missing,
or if the plan owes this page a pass the heading does not name. ⚠️ **The task id
is READ rather than hardcoded, as of `5b.5`** — the earlier spelling named
`5b.5` in the script, and a deferral that moves to a task the script has never
heard of is a check that goes quietly green on both halves at once. A deferral
is the most perishable claim in this repository, which is why this one is the
only kind that has an instrument.

---

*Written at `5a-iv-b`; second pass — the `src/api/` rules — at `5b.5`. Every
rule here was read out of `app/src` rather than proposed for it: if one of them
surprises you, the code is what it describes, and
`docs/checks/conventions-gate.sh` is what keeps that true.*
