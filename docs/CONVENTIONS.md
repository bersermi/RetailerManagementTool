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
bash docs/checks/conventions-gate.sh     # reads R1 R2 R4 R5 R6 R7 R8 R10 R11 against app/
```

---

## Where a file goes

```
app/
  src/app/            routes, and only routes — Expo Router maps file to URL
    (auth)/           the signed-out side of the door
    (tabs)/           the signed-in side
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
  copy nobody notices.
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

## ⚠️ What this page does not cover yet — a second pass is owed at `5b.5`

**There are no `src/api/` and no `src/ui/` conventions here.** ADR-035 §3 put
both in step `5a` so that *"step 6's four screens arrive to a pattern"*; this
build spread them across `5d`–`5h` instead, and **the owner ruled on 2026-09-13
that the re-sequencing stands and the pattern gets described once `5b` has
produced a real one** — rather than ten primitives guessed at against screens
nobody has drawn.

⚠️ **UPDATED 2026-09-14: `app/src/api/` NOW EXISTS. `app/src/ui/` STILL DOES
NOT.** This sentence used to read *"because neither directory exists"*, and
`5b-i` made half of it false the hour it shipped — which is this page's own
recorded defect, arriving on the page that exists because of it. The data layer
is five modules, one of which is the only place in the app that may touch
`supabase`; read `app/src/api/workspace.ts` first, because its header is where
the reasoning is. **What is still owed is the WRITTEN convention**, not the
pattern: the pattern is now on disk, and `5b.5` is where it gets described.

⚠️ **THE COLOURS LANDED AT `5b.6` ON 2026-09-17 AND ARE NO LONGER MISSING FROM
THIS PAGE — see `R11` above.** `app/src/theme/palette.ts` holds the eleven roles
and the gate reads them. ⚠️ **The MOTION rule is still only prose**: one staggered
entrance per screen, `transform` and `opacity` only, because those two run on the
compositor and animating layout, colour, shadow or blur does not — C1.1 puts two
low-end Androids in the pilot. ADR-035 §2.11 carries it as a row. **No check can
see it, and no screen animates yet**; the first one that does is `5d`'s, and the
plan says to measure the Inicio morph on the owner's own device before it.

So if you are about to write the second RPC wrapper or the first shared
component: **that is the second pass, and it is plan task `5b.5`.** Read
[`docs/PLAN.md`](PLAN.md) for what it owes, and add the conventions here as you
establish them — do not invent them in four screens, which is the exact accident
§3 wrote this page to prevent.

⚠️ **This section is checked, not merely written.**
`docs/checks/conventions-gate.sh` fails if this page and `docs/PLAN.md`'s `5b.5`
row stop agreeing about whether the second pass is still owed. A deferral that
goes quietly stale is the defect that produced this page in the first place.

---

*Written at `5a-iv-b`. Every rule here was read out of `app/src` rather than
proposed for it — if one of them surprises you, the code is what it describes,
and `docs/checks/conventions-gate.sh` is what keeps that true.*
