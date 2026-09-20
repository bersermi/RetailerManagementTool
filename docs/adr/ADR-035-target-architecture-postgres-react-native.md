# ADR-035: Target Architecture — Postgres Ledger + React Native

- **Status:** Accepted
- **Date:** 2026-08-14
- **Decision makers:** Sergio
- **Supersedes:** ADR-003, ADR-004, ADR-007, ADR-008, ADR-009, ADR-010, ADR-012, ADR-013, ADR-014, ADR-015, ADR-018, ADR-019, ADR-021, ADR-022, ADR-025, ADR-026, ADR-027, ADR-028, ADR-029, ADR-030, ADR-031, ADR-032, ADR-033, ADR-034
- **Carried forward in substance:** ADR-001, ADR-002, ADR-005, ADR-006, ADR-011, ADR-016, ADR-017, ADR-020, ADR-023, ADR-024
- **Origin:** Seven-round architecture review, 2026-08-14
- **Revised:** 2026-08-14 — client-stack review. §2.2, §2.6, §2.8, §2.10, §3, §4, §7
  and §8 amended. The client was one table cell in the first draft; this revision
  gives it the same treatment the database got. Amended in place rather than issued
  as ADR-036 because this document had not yet been committed and splitting a
  one-day-old decision across two files makes the thing juniors must read twice as
  hard to read.
- **Revised:** 2026-09-19 — **§2.3 amended**, by the migration that gave one of its
  sentences a mechanism: `0035`, plan task `5b.8-iii-a`, `set_my_display_name(uuid, text)`.
  ⚠️ **Nothing in §2.3 became FALSE, which is why this entry is one sentence and not a
  strikethrough.** The 2026-09-18 amendment above already said the write rule exists *"so
  a re-invite never overwrites a correction a person made about themselves"* — and named
  no way for her to make one. From `5b.8-ii` that gap was live on a screen: a Google
  account that arrived as one word was on the roster in front of the whole shop, and
  `workspace_member_update` (`0001:532`) is owner-only, so a manager or a cashier could
  not repair the row describing her. §2.3 now names the function that does it, and says
  in one line why it is a `security definer` RPC rather than the policy anybody would
  reach for first — **RLS filters rows, not columns**, so *"you may update your own row"*
  also hands every cashier her own `role`, which is the argument §2.7 already makes about
  `cost` on `purchase_line`. ⚠️ **It is workspace-scoped, and that is a decision taken on
  the decision maker's behalf** — recorded in `docs/PLAN.md` `5b.8-iii-a`, in `0035`'s
  header, and measured by check 3.5 of its suite. **The schema change is `0035` and its
  evidence is `supabase/tests/0035_set_my_display_name.sql` — 38 behavioural checks,
  sixteen falsifications, fifteen of them red.**
- **Revised:** 2026-09-18 (second entry this date) — **§2.3 and §2.7 amended**, by the
  migration that made three of their sentences false: `0034`, plan task `5b.8-i`, which
  adds `workspace_member.display_name` and fills it from all four applied membership
  writers. ⚠️ **The paperwork was amended in the same pass as the schema, not after
  it**, which is §9's rule pointed at this document rather than at a migration.
  **§2.3** gains the column on its data-model row and the paragraph that says what it is
  for, that it is nullable, and what the write rule is. **§2.7** loses two sentences to
  strikethrough: *"under normal RLS"* about `create_invite`, which has been `security
  definer` with a manager fence in its body since `0028` and was **never** true of the
  applied schema; and *"`auth.users` is never exposed to anyone"*, which is still true
  of every client role and is no longer true as an absolute — four definer bodies now
  read one field of it and copy that field onto a table members can select.
  ⚠️⚠️ **THE PLAN AND THIS DOCUMENT DISAGREED ABOUT WHERE ONE OF THESE LIVED, AND THE
  ADR WON.** `docs/PLAN.md`'s `5b.8` row said §2.7 *"describes `workspace_member`'s
  columns"*. It does not — §2.7 describes `workspace_invite`'s; `workspace_member`'s are
  in §2.3's table. Nothing about what was built changed, because the same three
  sentences are amended either way; the plan row was corrected rather than followed.
  **The schema change is `0034` and its evidence is `supabase/tests/0034_member_display_name.sql`
  — 28 behavioural checks, thirteen falsifications, twelve of them red.**
- **Revised:** 2026-09-18 — **§3 amended, on the decision maker's instruction**
  (*"amend ADR-035 §3 to say 5h.5"*), with §2.10's one-line reference to the same
  claim brought along. ⚠️⚠️ **THE OBLIGATION DID NOT MOVE AND WAS NOT REDUCED; IT
  TAKES TWO PASSES.** §3 named the `src/api/` **and** `src/ui/` conventions together
  at `5b.5`. `5b.5` ran on 2026-09-18 and wrote the `src/api/` half — `R12` and `R13`
  in `docs/CONVENTIONS.md`, both machine-read — and **could not write the other half,
  because `app/src/ui/` did not exist**: thirty source files, and the only shared
  component among them a placeholder that says a screen is not built yet. Describing
  primitives nobody has drawn is the exact thing the decision maker refused on
  2026-09-13. So the `src/ui/` half is now **`5h.5`**, after the last task that builds
  a primitive and **before step 6**, which is the only ordering §2.10 ever claimed
  (*"about ORDER RELATIVE TO STEP 6, not about the letter"*).
  ⚠️ **This closes a disagreement between this document and `docs/PLAN.md` that the
  plan opened first**, and it is recorded that way deliberately: the plan made the
  split on 2026-09-18 and flagged it as owed here, rather than letting §3 quietly read
  as though a closed task still owed something it had not delivered. **CLAUDE.md says
  the ADR wins — so a session reading §3 literally would have concluded the plan was
  the bug, and un-split it.**
  ⚠️ `docs/CONVENTIONS.md`, `docs/PLAN.md` and this document are three copies of one
  deferral, and `docs/checks/conventions-gate.sh` reads all three: the page names the
  task in its own heading, the plan row names the page, and assertion 0c asserts THIS
  file still names the task the page defers to. **No copy of it is trusted.**
  **No schema change, no app code, and nothing here was built against the old wording.**
- **Revised:** 2026-09-14 — **§2.7 and §2.9 amended, on the decision maker's instruction**,
  after the **área 9 interview** he called for. ⚠️⚠️ **§2.9's FIRST QUESTION IS RETIRED, NOT
  RE-MEASURED.** *"What made me money?"* was *gross margin by product*, and the ruling is
  *"we won't derive the profit so let's ignore margins for now — I'd rather just show total
  revenue."* **Three things forced it and only the first is a preference:** under **C8.6** the
  app cannot attribute a piece's cost to the bird it came from, so per-piece profit is **not
  derivable from anything the ledger stores**; `product_margin_daily` (`0009`) therefore
  returns **100 % margin** on a despiece line today; and the owner does not want the number
  anyway. **The measure that replaces it is quantity and GROSS revenue**, per variant and per
  family. ⚠️ **Revenue is gross of IVA by ruling** — `prices_include_tax` defaults true, so the
  shelf label already includes the tax and gross is the number the shopkeeper reconciles
  against the till; net stays available beside it. ⚠️ **A cashier may see revenue** — ruled
  explicitly rather than inherited, because they already could: `product_velocity_daily`
  carries no cost and is readable by `staff`, which was **measured against the seed**, not
  assumed. §2.7's capability table now says so in a row of its own. ⚠️ **No schema is applied
  by this revision**; plan task `4.6c` was re-scoped and split three ways (`0031`–`0033`) the
  same day, before a line of it was written. ⚠️ **Two older sentences now point at a question
  that no longer exists and are NOT rewritten**: §2.5's reason for a per-line net cites
  margin-by-product — the requirement stands, the example does not — and §3 step 2's gate text
  describes a step that **closed in August**, so it is left as the record of what was actually
  done. **§2.9's waste question is kept and carries a new warning**: its cost half is broken
  under C8.6 in exactly the way the margin question was, and **nobody had written that down
  until 2026-09-13**.
- **Revised:** 2026-09-17 — **§2.8 and §2.11 amended, on the decision maker's instruction**,
  after the **aesthetic round** he called for on 2026-09-15 (plan task *área 13*). The client
  had reached `5b-i` with **no palette, no motion rule and no colour anywhere in twenty-nine
  source files** — §2.11 had settled navigation, server state, money and strings and had never
  settled what the app LOOKS like, and nothing in this document had either. ⚠️⚠️ **§2.8's Home
  row is the one that CHANGES rather than gains**: it said *"No nav panel here — redundant"*
  and Inicio now carries the three work modules as large cards plus rows to Productos and
  Proveedores. **The sentence's intent survives and is restated** — state before doors, the
  day's takings and the 48-hour expiries stay above the modules — but the prohibition does not,
  and it is amended rather than reinterpreted. ⚠️ **§2.11 gains two rows, palette and motion**,
  and the motion row is a performance constraint before it is a taste one: two of the pilot's
  four phones are low-end Android. ⚠️ **No schema, and no app code by this revision** — the
  palette is plan task `5b.6`, which is where `R11` enforces it.
- **Revised:** 2026-09-13 (third entry this date) — **§2.7 and §8 amended, on the
  decision maker's instruction**, because **one sentence of the second entry's own
  amendment went stale within hours of being written.** §2.7 said register #9's eight
  rulings *"freeze when `0027` merges"*. Plan task `4.6a` was then sized `L` and **split
  three ways** — `4.6a-i` / `4.6a-ii` / `4.6a-iii` over **`0027`–`0029`** — so each
  ruling freezes when **its own** migration merges, and `D6`/`D7`/`D8` stay revisable for
  two migrations longer than `D1`–`D5`. ⚠️ **The claim was right and the number was one of
  three**, which is the kind of error that reads as correct forever: nothing in the
  sentence looks wrong unless you know how many files the task became. **It was named in
  `docs/PLAN.md` rather than edited here**, because this document is amended by decision
  and a sizing session is not one; the decision maker then instructed the amendment.
  ⚠️ **No schema is applied by this revision**, and the eight rulings are unchanged — only
  where each of them becomes append-only. ✅ **The claim is now GUARDED across three
  files** (`docs/checks/4.6a-split-coverage.sh`): this document, `docs/PLAN.md` and
  `supabase/README.md` must agree on which task owns `0027`–`0031`, so the next split
  cannot leave this sentence behind a second time.
- **Revised:** 2026-09-13 (second entry this date) — **§2.7 and decision register
  #9 amended, on the decision maker's instruction**, to carry **C11.5 / C11.6**: the
  joiner enters a **workspace code**, **requests** access, and is **approved**, and an
  owner's invite counts as *a request that arrives pre-approved*. **Both paths, one
  table.** This closes the last of the four plan-vs-ADR disagreements the UI/UX
  grill-me of 2026-09-07 opened, and it is the one that had been **blocking plan task
  `4.6a`** — a migration, so a session obeying *"the ADR wins"* literally would have
  written the inverse flow and merged it automatically. Eight sub-decisions were put to
  the decision maker as yes/no rulings and all eight were taken; they are recorded in
  §2.7 below and in `docs/PLAN.md`. ⚠️ **No schema is applied by this revision** —
  `create_invite` and `redeem_invite` were assigned to `0005` and never written, so
  §2.7 has always described functions that do not exist. `4.6a` builds them — ⚠️ **as
  `4.6a-i`–`4.6a-iii` over `0027`–`0029`** since the third revision of this date.
- **Revised:** 2026-08-22 — §2.7 and §2.10 amended, on the decision maker's
  instruction, to close a disagreement between this document and the applied
  schema that plan task 3.1 found. The ADR named a policy `tenant_isolation`;
  no policy in the database is called that, and forty are named `<table>_<verb>`.
  The convention wins and the ADR is the file that moved — the alternative was a
  `drop policy` / `create policy` migration touching every RLS object in the repo
  to buy a word. No schema change. The §2.7 example is also corrected to carry
  `for select` and `to authenticated`, which the applied policies do and the
  example did not.
- **Revised:** 2026-08-26 — §2.5 amended, on the decision maker's instruction, to
  close an ambiguity that plan task 3.5 found and could not settle for itself.
  Rule 2 said the gross unit price is authoritative when `prices_include_tax`,
  which is a property of the WORKSPACE, so read literally it governed deliveries
  as well as sales — while the sentence above it says supplier invoices break tax
  out, and the seed had accordingly been computing purchase lines net-first since
  1.6a. **The decision maker took the third of three readings: direction follows
  the document, and tax stays the residual on both.** Rule 4 therefore keeps its
  universal form and rule 2 gains a scope. No schema change and no seed change —
  all 1 048 seeded delivery lines already satisfy it, because on a net-first line
  the residual and `round(net × rate)` are provably the same number (§2.5, and
  `07_money_and_units.sql` F17).
- **Revised:** 2026-09-03 — §2.6's `record_sale` row gains its FIFTH ARGUMENT,
  `recorded_offline`, written while implementing it as `0016` (plan task 4b-i).
  ⚠️ **This closes an under-specification, not a contradiction**: `sale.recorded_
  offline` is `not null` and this section is the only thing that writes it, the
  offline paragraph below already requires the flag to reach the function, and it
  is what 4c's dormant enforcement path will read to skip a check. The server
  cannot infer it — the same paragraph says an ONLINE call may pass an
  `occurred_at` and have it overridden, so "the client sent a time" means nothing.
  The parameter defaults to false, so the four-argument call this row used to show
  still works verbatim. No schema change: the column has existed since `0003`.

- **Revised:** 2026-09-03 — §2.6's availability paragraph gains the two columns it
  resolves through and the SQLSTATE it raises, written while implementing it as
  `0017` (plan task 4c-i). ⚠️ **`TD002` IS A CLIENT CONTRACT AND IT IS CHEAP TO
  CHANGE ONLY UNTIL A TILL BRANCHES ON IT** — recorded here for the same reason
  `TD001` was. The paragraph already said "built, dormant" and "v1 ships with no
  toggle and open mode always on"; what it did not say is *which* switch, and the
  schema has carried two of them since `0001` and `0002`
  (`workspace_setting.enforce_stock_default`, `product_variant.enforce_stock`).
  **No behaviour change and no schema change**: both resolve to open, so `0017` is
  invisible to every caller — proved over the seed in
  `supabase/checks/0017_enforcement_is_dormant.sql`.
- **Revised:** 2026-09-03 — §2.6 amended, on the decision maker's instruction, to
  close a disagreement THIS DOCUMENT HAD WITH ITSELF, found while splitting build
  step 4 in `docs/PLAN.md` and before any of that step was written. §2.6 counts
  `adjust_stock_delta` among the ten functions of the write surface, which reads as a
  step-4 deliverable; §3 step 4.5 names it, by name, as one of the failure path's.
  **The build-order section wins a build-order question** — it ships in 4.5 — and
  §2.6 is the file that moved, because §2.6 is where the counting happens and a
  reader of its table would otherwise count ten functions in step 4 and find nine.
  No schema change, no renumbering: nothing here has been written yet.
- **Revised:** 2026-09-04 — §2.6 and §2.7 amended, on the decision maker's
  instruction, to settle **what the 15-minute void window measures from on an
  OFFLINE write**, asked while sizing `void_transaction` as `0021` (plan task
  4e-ii) and before any of it was written. §2.6 said the window reads
  `occurred_at`, full stop. On a queued offline sale `occurred_at` is the client's
  time, clamped to `[now() − 72h, now()]`, so **a sale rung up at 09:00 with no
  signal and flushed at 14:00 arrives five hours past its own window** — the
  cashier's fifteen minutes expire before the server ever hears about it, and
  fixing their own slip needs a manager. ⚠️ **The decision maker reports the pilot
  store is offline A LOT**, which turns that from an edge case into the normal
  path and reinstates exactly the friction §2.7 spends a paragraph refusing:
  *"friction here converts into staff quietly not recording things."*
  **The window therefore reads `recorded_at` when `recorded_offline`, and
  `occurred_at` otherwise.** ⚠️ **This changes NOTHING for an online write** —
  §2.6 already overrides `occurred_at` with `now()` there, so the two columns are
  set in the same statement and carry the same instant. **No schema change**: both
  columns have existed since `0003`. ⚠️ **Daily totals are NOT touched and still
  read `occurred_at`** — the amendment splits one sentence that had bound them
  together, and a sale must count on the day it was made whatever the clock did.
  The 15-minute window remains listed **Reversible** in §4.
- **Revised:** 2026-09-05 — §2.6's *Rejected writes* amended **TWICE**, on the
  decision maker's instruction, while build step 4.5b was being sized.
  **(1) THE DOWNGRADE LINK IS REVERSED.** Step 3 said the `failed_write` row stores
  `adjustment_movement_id`, singular. **A downgrade is not singular and cannot be
  made so**: `adjust_stock_delta` takes one `variant_id`, a rejected sale has lines,
  and one line spanning two lots writes two movements by itself. Since this
  document's own next sentence says the link *"is not optional… without it the
  downgrade and any later replay would each remove the same units"*, the link has to
  be COMPLETE rather than representative — a row naming only the first movement is
  one `replay_failed_write` will silently under-compensate. **`stock_movement`
  therefore carries `failed_write_id`**, a real foreign key, and the group is the
  dead letter itself. An `adjustment_group_id` on both tables was weighed and
  refused: it is two columns instead of one, and only the FK can make *"not
  optional"* a CONSTRAINT —
  `check ((adjustment_reason is not distinct from 'failed_write_downgrade') =
  (failed_write_id is not null))`. ⚠️ **Schema change, applied in `0024`**, and
  `0004:320`'s comment asserting the other direction is now wrong and cannot be
  edited (append-only); the column comment says so.
  **(2) ONLY `sale` AND `waste` ARE DOWNGRADED.** This section described the failure
  path entirely through the rejected sale and never said what the other three kinds
  do. They are not the same case. A rejected sale or write-off leaves stock GONE and
  **nobody will re-enter it**, so the downgrade is the only thing that will ever fix
  the ledger. A rejected purchase leaves stock **PRESENT**, with a manager holding
  the delivery note (§2.7 — receiving is not a staff capability) who will re-enter it
  through Comprar: an auto-upgrade would open a **zero-cost lot** and then **double
  the shelf**. A rejected transfer spans two stores, has no document (§2.4), and its
  idempotency already rests on an advisory lock rather than a key. The rule is
  therefore one sentence — **downgrade the kinds where the stock is gone and nobody
  will re-enter it** — and both other kinds still dead-letter in full. ⚠️ **No schema
  change; a function body, so §4's "Reversible" deadline applies unchanged.**
- **Revised:** 2026-09-04 — §2.6's replay caveat CLOSED, on the decision maker's
  instruction, in the same session that opened it. **A replayed write is exempt from
  the offline basis**: its void window is measured from `occurred_at`, so a replayed
  sale never carries a fresh staff self-service window. ⚠️ **Decided on the principle
  the decision maker gave — "whatever implies less responsibility to the owner or
  personnel, if it can be addressed purely on our side"** — and the exemption is the
  side of it that adds no step for anybody: the only person realistically standing
  over a freshly replayed sale is the manager or owner who just replayed it, and they
  are unfenced anyway. The alternative would let a cashier reverse a reconciliation
  unreviewed and move a historical daily total. **No schema change here, but step 4.5
  OWES A MARKER** — nothing distinguishes a replayed document today, so
  `void_transaction` cannot enforce this yet and does not pretend to.
- **Revised:** 2026-09-20 — §2.6's outbox sentence corrected from step `5a` to step
  **`5c`**. ⚠️ **NOT A NEW DECISION, AND DELIBERATELY NOT TREATED AS ONE.** The ruling
  is the decision maker's of 2026-09-13, recorded in the entry directly below this one;
  §3 was rewritten that day and §2.6's one-line restatement of the same claim was
  missed. ⚠️⚠️ **It mattered more than a typo because of `CLAUDE.md`'s own rule** —
  *"if anything disagrees with the ADR, the ADR wins"* — so for seven days this
  document told a cleared session to build the outbox inside a step that closed on
  2026-09-12, and the plan, which was right, would have read as the bug. Found while
  sizing `5c` on 2026-09-20. **No schema change, no deliverable moved, and nothing
  already shipped becomes non-conforming.** ⚠️ It is the ninth stale copy of one claim
  recorded in this repository and the first inside this file, which is the one every
  other file defers to.
- **Revised:** 2026-09-13 — §3's build-order step `5a` and §2.10's closing paragraph
  amended, on the decision maker's instruction (*"do the second pass after 5b"*,
  2026-09-13, and the amendment itself instructed the same day). This closes the **fourth**
  and last of the plan-vs-ADR disagreements found while sizing `5a` on 2026-09-07.
  §3 listed `src/api/`, the `src/ui/` primitives and the `expo-sqlite` outbox as step
  `5a` deliverables; `docs/PLAN.md` had spread the first two across `5d`–`5h` and the
  outbox into `5c`, **and neither file had recorded a decision to do that.**
  ⚠️ **THE RULING IS NOT "THE PLAN WON."** §3's reason for naming them — *"step 6's
  four screens are supposed to arrive to a pattern"* — is accepted in full. What the
  owner rejected is discharging it by building ten primitives against screens nobody
  has drawn. The obligation moves to **`5b.5`**, a new interstitial step in the shape
  of `4.5`/`4.6`, which writes the conventions once `5b` has produced a real pattern
  and **still lands before step 6**, which is all §2.10 ever asked for.
  ⚠️ Two items were struck rather than moved: *"session persistence on a shared till
  device"* and *"how the client resolves its `location_id`"* rest on a shared till,
  and **C1.5/C1.1 established the pilot has none — the staff use personal phones.**
  A deliverable whose premise is false is not deferred; it is withdrawn.
  ⚠️ `docs/PLAN.md` and `docs/CONVENTIONS.md` both assert `5b.5` exists, and
  `docs/checks/conventions-gate.sh` fails if the page and the plan's `5b.5` row stop
  agreeing. **A deferral is the most perishable claim in this repository** — it has
  six recorded stale copies to prove it — so this one is guarded rather than trusted.

- **Revised:** 2026-09-07 — §2.10 and §2.11 amended, on the decision maker's
  instruction, to close a disagreement between this document and `docs/PLAN.md` found
  while sizing build step `5a` and **before a line of app code was written**. §2.11's
  stack table said client tests are *"Skipped, except `packages/money`"*; the plan's
  definition of done for `5a` requires `.github/workflows/app.yml` to run **typecheck
  and unit tests** over the app workspace, and the section that wrote that requirement
  never cited §2.11. ⚠️ **The plan noticed the real problem and this document is the
  file that moved.** §2.10's prose already said *"**broad** client-side testing is
  skipped"* and gave the reason — *"a suite over a thin UI is a poor use of a small
  team's attention when correctness sits one layer below it"* — which is an argument
  against breadth, not against arithmetic. §2.11's one-word summary of that prose lost
  the qualifier, and a table row that contradicts the paragraph it cites is the kind of
  drift §9 exists to catch. **The exception is now stated as a rule with a boundary
  rather than as a single named package**: a unit test is allowed where it asserts a
  value a customer sees or the ledger stores, and is still refused over rendering,
  navigation and layout. ⚠️ **`packages/money` remains not negotiable** and is untouched.
  **No schema change, no test deleted, and nothing already shipped becomes
  non-conforming** — there is no client code yet, which is exactly why it was cheap to
  settle today. The alternative was an `app.yml` whose green meant only *"it compiled"*,
  on the one workspace where §9's *"a file is not evidence"* had never yet applied.
- **Revised:** 2026-08-14 — open-questions review. All thirteen §8 open questions
  answered and moved to settled. Region taken without measurement; provider pricing
  clarified by the decision maker, which removed `price_list.provider_id` rather than
  adding to it.

---

## 1. Context / Problem

The Power Platform alpha existed to validate a data model. It did not.

One of seven modules shipped. Review of that module found it writing `StockBatch`
rows with a blank `QuantityRemaining`, no `ReceivedDateTime` and no `ExpiryDate`;
never populating `Purchase.TotalAmount`; and depending on a `ProviderProductPrice`
table that was never created. Four accepted ADRs described schema with no deployed
counterpart:

| ADR | Claimed | Reality |
|-----|---------|---------|
| ADR-034 | `ProviderProductPrice` table, "Go-Live Ready: Yes" | Not in the solution |
| ADR-023 | Alternate keys on six tables | Zero `EntityKey` definitions |
| ADR-002 | `Role` choice on `WorkspaceMember` | Column absent |
| ADR-011 | `QtyReceived = QtyRemaining = line qty` | Violated on every write |

That gap — decisions recorded as fact and never reconciled against reality — is the
failure this ADR is structured to prevent.

### Decisive facts

| Fact | Consequence |
|------|-------------|
| No operator is using the app today | No migration, no cutover, no compatibility burden |
| All existing Dataverse data is disposable | Seed data regenerated by script, not ETL |
| Target users are Mexico-based small retailers | LFPDPPP not GDPR; IVA is real; CFDI out of scope |
| Selling is dominant, buying is episodic | Tap budget spent on the sell path first |
| Inventory control is irregular in practice | Stock is recorded, not enforced; opening balances need an entry path |

---

## 2. Decision

Rebuild on **PostgreSQL (Supabase) + React Native (Expo)**. The Power Platform
alpha is cancelled — not paused — with nothing carried forward but domain
understanding.

### 2.1 Principles

1. **The database is the application.** Allocation, enforcement, idempotency, tax
   and unit conversion live in Postgres. The client is a thin window. Correctness
   is testable without a UI.
2. **Movements are the truth; balances are projections.** Nothing is updated in
   place. Every quantity change is an append-only row. Any balance can be rebuilt
   from the log and verified against it.
3. **Record everything; block almost nothing.** A system that refuses a real sale
   gets abandoned. Guardrails warn, they do not stop.
4. **Taps are the scarce resource.** Every interaction on the sell path is paid
   hundreds of times a week.
5. **Isolation is enforced by the database, never the client.** App-level filtering
   is UX. RLS is the wall, with no exceptions.
6. **Correctness that cannot be observed does not exist.** Invariants get automated
   tests and a nightly production check, or they are assumptions.

### 2.2 Platform

| Choice | Value | Note |
|--------|-------|------|
| Database | Supabase Cloud, Pro tier | PITR required before real data |
| Region | `us-east-1` | **Settled 2026-08-14 without measurement.** Mexican ISP traffic overwhelmingly transits Dallas and Miami eastward, so network proximity and map proximity diverge — `us-west-1` was the map answer. The cost of being wrong is tens of milliseconds on RPC round-trip, which §2.6 already absorbs by computing the customer-facing total on the device: region latency lands on the confirmation, never on the sale. That is what made this cheap enough to decide rather than test |
| Residency | Cross-border permitted under LFPDPPP | Disclosed in the *aviso de privacidad* |
| Client | React Native (Expo) | iOS first — the pilot store's device. Android follows |
| Client detail | See §2.11 | Router, data layer, state, components, release path |
| Schema changes | Reviewed migration files only | No change reaches production by hand |

**Why native rather than a web app.** The pilot runs on one fixed counter with
measured, stable wifi, and v1 ships no scanner (§6) — so nothing about the *screens*
requires native. The queue does. Safari has no Background Sync API, which means a
PWA can flush the outbox only while its tab is foregrounded; on a till device that
sleeps between customers, that is the queue failing precisely when §2.6 needs it.
`expo-sqlite` on disk has neither constraint. The pilot store is iOS, so this is
decisive rather than theoretical — on an Android-only pilot the argument would not
have held, and a PWA would have been the cheaper answer (§7).

### 2.3 Data model

Nineteen tables. Every business table carries `workspace_id`; every table on the
ledger additionally carries `location_id`.

**Tenancy**

`workspace` is the **tenant** — one business, one owner, one RLS boundary.
`location` is the **store**. In the first draft these were the same row; they are
separated because a second store for the same owner is expected within roughly six
months (confirmed 2026-08-14) and `location_id` on the ledger is a one-way door
(§4).

| Table | Columns of note | Constraints |
|-------|-----------------|-------------|
| `workspace` | `display_name`, `prices_include_tax`, `currency` (MXN), `is_active` | — |
| `location` | `workspace_id`, `name`, `is_active` | unique (workspace, lower(name)); unique (id, workspace) for composite FKs |
| `workspace_member` | `user_id` → `auth.users`, `role` (staff/manager/owner), `is_active`, **`display_name`** | unique (workspace, user); unique (id, workspace); `display_name` not blank when present |
| `member_location` | `workspace_id`, `member_id`, `location_id` | pk (member, location); **composite** FKs on (id, workspace) both sides |
| `workspace_setting` | `use_last_sell_price`, `void_window_minutes` (15), `enforce_stock_default` (false) | unique (workspace) |

Membership resolves on `auth.uid()`. The prior design matched on user display name
(`prov-V1-BUILD-LOG.md` D-06), which is neither unique nor immutable.

⚠️ **AMENDED 2026-09-18 — `workspace_member` CARRIES A PERSON'S NAME (`0034`, plan
task `5b.8-i`).** `display_name` is **not** how membership resolves and never will
be; that is still `auth.uid()`, and the sentence above is the reason. It is a
**copy**, written at the moment a membership is written, of
`auth.users.raw_user_meta_data ->> 'full_name'` — the key Google's provider uses and
the key the email sign-up writes (`5b.7`). It exists because §2.7 does not expose
`auth.users` and a roster still has to be drawable: without it, a shop of four people
is four uuids.

⚠️ **It is nullable, and that is the floor rather than an oversight.** An account
whose provider returned no name is still admitted, and the client falls back to the
role. What the column may not hold is the blank — a name that is present and renders
as a gap — which is a CHECK.

⚠️ **The write rule is the decision maker's, taken 2026-09-18: *"keep what they
typed."*** All four membership writers set it on `insert`, and on `update` only where
the stored value is null, so a re-invite never overwrites a correction a person made
about themselves. ⚠️ **`workspace.display_name` is the SHOP's name and is a different
column on a different table** — the two sit three lines apart inside
`onboard_workspace`, which is why that function names its local for the person.

⚠️ **AMENDED 2026-09-19 — THE CORRECTION ABOVE HAS A MECHANISM, AND IT IS A FUNCTION
RATHER THAN A POLICY (`0035`, plan task `5b.8-iii-a`).** `set_my_display_name(uuid,
text)` is a `security definer` RPC that writes this one column on the caller's own
active membership in the workspace she names, and nothing else: no argument can name
another person, and `role` is not in its `set` list. It is the **fifth** writer of the
column and the **only** one permitted to overwrite a non-null name, because the caller
is the person the name is about and she asked for it — which is the 2026-09-18 ruling
being honoured rather than bent.

⚠️⚠️ **The obvious alternative is refused by name: a policy letting a person update her
own `workspace_member` row.** RLS filters **rows, not columns** — the sentence §2.7
already spends a paragraph on about `cost` on `purchase_line` — so that policy also
lets a cashier set her own `role`. `workspace_member_update` (`0001:532`) stays
owner-only and `0035` moves no policy at all. ⚠️ **The call is workspace-scoped**: it
fixes the name in ONE shop, because `my_workspaces()` is set-returning and an unscoped
write would cross the tenant boundary this schema spends all its effort not crossing. A
scoped call can later fan out; an unscoped write that has already run cannot be un-run.

`member_location` is a join table rather than a `location_id` column on
`workspace_member` because the owner will move a cashier between stores to cover a
shift, and that must not be a role change. Its FKs are composite — carrying
`workspace_id` and referencing `(id, workspace_id)` on both sides — so the database
refuses a member/location pair drawn from two different tenants. Two plain FKs
would accept it.

Catalog, providers and price lists stay workspace-level: **one catalog, separate
shelves**. Stock, movements and documents are location-level.

One location is seeded by `onboard_workspace()`, named after the business unless
the caller overrides it. v1 renders no location picker and costs no extra tap; a
single-store owner is never asked to name a concept that does not yet exist for
them.

**Reference (global, not workspace-scoped)**

```sql
create table unit (
  code            text primary key,        -- 'g','kg','ml','l','pza'
  dimension       text not null,           -- mass | volume | count
  base_code       text not null references unit(code),
  factor_to_base  numeric(14,6) not null   -- kg -> g = 1000
);
```

Conversion factors are physics. Users select; they never define.

**Catalog**

| Table | Columns of note | Constraints |
|-------|-----------------|-------------|
| `product_family` | `name`, `normalized_name`, `default_lifespan_days`, `track_expiry` | unique (workspace, normalized_name) |
| `product_variant` | `base_unit_code`, `purchase_unit_code`, `sell_unit_code`, `price_unit_code`, `pack_size`, `tax_rate` (0), `enforce_stock` (null → workspace default) | unique (workspace, normalized_name) |
| `provider` | `name`, `normalized_name`, `contact_name`, `phone`, `address_line1` | unique (workspace, normalized_name) |
| `price_list` | `variant_id`, `location_id` (null = workspace default), `price_per_base`, `effective_from`, `effective_to` | **Sell prices only.** No overlapping ranges per key — see the exclusion constraint below |

Uniqueness is enforced by constraint, not convention (fulfils ADR-023, which was
never implemented).

**Transactions** — three document pairs of identical shape: `purchase`/`purchase_line`,
`sale`/`sale_line`, `waste`/`waste_line`.

```
id                uuid primary key   -- generated by the CLIENT at cart open
workspace_id      uuid not null
location_id       uuid not null      -- which store; see §2.3
occurred_at       timestamptz not null
total_net         numeric(12,2) not null
total_tax         numeric(12,2) not null
reversal_of       uuid null references <same table>(id)
created_by        uuid not null
recorded_offline  boolean not null default false
```

The client-generated `id` is the idempotency key. A retried request with the same id
returns the existing document rather than erroring or duplicating — the exact
semantics are specified in §2.6, because "a no-op at the database level" was not one:
a duplicate primary key is an error, not a no-op.

Lines carry `qty_base` alongside `qty_display` and `qty_display_unit`, plus
`unit_price_net_per_base`, `tax_amount` and `line_net`. Waste lines additionally
carry `reason` and a cost snapshot.

**Inventory**

| Table | Role |
|-------|------|
| `stock_batch` | One per purchase line. `location_id`, `qty_received_base`, `unit_cost_net_per_base`, `received_at`, `expiry_date`, `provider_id` |
| `stock_movement` | Append-only, signed `qty_base`, `batch_id`, `location_id`, `reason`, source FK, cost snapshot. **The system of record** |
| `batch_balance` | Trigger-maintained projection. `location_id`, `remaining_base`, `expiry_date`. Partial index `(location_id, variant_id, expiry_date) where remaining_base > 0` |

A batch is physically somewhere, so `location_id` sits on the batch and every
movement inherits it. Without that, store A sells store B's inventory and the
ledger is arithmetically perfect and physically false.

**Deleted from the old model:** `StockBatch.QuantityRemaining` as a hand-written
column (never written by any code path); `ProductVariant.LastSellUnitPrice` (a
shared mutable global — one discount became every future prefill);
`ProviderProductPrice` as a cache (derivable from `purchase_line`); `InventoryEvent`
as a separate mechanism (had no quantity column and therefore could not perform the
adjustments ADR-014 promised).

**Two kinds of price, two different mechanisms** (settled 2026-08-14). Conflating
them is what produced `price_list.provider_id` and, with it, the NULL that defeated
the overlap constraint.

| | Sell price | Purchase price |
|---|---|---|
| Nature | **Curated.** Someone decides it | **Remembered.** It is whatever you last paid |
| Home | `price_list` | Derived from `purchase_line` — no table |
| Scope | Per location, `location_id` null = workspace default | Per `(provider, variant)`, workspace-wide |
| Changes | Rarely. Largely static between deliberate revisions | Every purchase, silently |
| Fallback | Workspace default when no location row | **None.** See below |

The purchase side needs no storage because it is already stored: §2.3 deletes
`ProviderProductPrice` "as a cache (derivable from `purchase_line`)", and this is
that derivation made explicit rather than reintroduced. A view over the last purchase
line for a `(provider, variant)` pair cannot drift from what was actually paid, has
no write path anyone can forget, and self-corrects after a void — which a maintained
table does not, since nothing would think to roll back a cached price when its
purchase is reversed. **The view must exclude both reversal documents and the
documents they reverse**, or a voided delivery keeps prefilling its price forever.
Index `(workspace_id, provider_id, variant_id, occurred_at desc)`.

**No fallback across providers.** A price learned from one provider never prefills
another's. Buying the same product from someone new is a blank, required field, and
Comprar renders that as a distinct state (§2.8) rather than an empty box. The reason
is that a supplier price is a fact about a relationship, not about a product;
carrying it across is how the old model's `LastSellUnitPrice` turned one discount
into every future prefill.

**The generic provider.** One per workspace, created by `onboard_workspace`, flagged
`is_generic` and not deletable. It behaves exactly like any other provider — it
accumulates its own per-product price memory, and a product bought generically
prefills nothing for a named provider. It exists so that "I bought this at the market
this morning" is a two-tap purchase rather than a reason to create a fake provider
record, which is what operators do otherwise and what pollutes the directory.

**The overlap constraint** (settled 2026-08-14). With provider prices out of
`price_list`, sell prices are the only rows in it, so the NULL that made an exclusion
constraint silently inert is gone. What remains is the nullable `location_id`, handled
by coalescing to a sentinel:

```sql
EXCLUDE USING gist (
  workspace_id WITH =,
  variant_id   WITH =,
  coalesce(location_id, '00000000-0000-0000-0000-000000000000'::uuid) WITH =,
  valid_period WITH &&
)
```

Requires `btree_gist`. A sentinel rather than a real placeholder row, so there is
nothing to maintain and nothing anyone can delete.

### 2.4 The ledger

One append-only table absorbs purchases, sales, waste, corrections and stock counts.

- A purchase writes positive movements against new batches.
- A sale, waste event or downward count writes negative movements allocated across
  existing batches.
- A void writes compensating movements referencing the original. Nothing is mutated.

**Allocation is server-side and invisible.** The cashier picks a product, a quantity
and — for waste — a reason. They never see a batch. The RPC allocates against
**FEFO** (first-expiring-first-out), which is what perishable retail rotates on;
receipt order is only a tiebreak.

**Allocation is scoped to one location.** The candidate set is
`where location_id = $location and remaining_base > 0`, never workspace-wide.

**Transfers between stores** are a paired movement, not a mutation. Moving stock
writes negative FEFO-allocated movements at the origin and creates **new batches at
the destination carrying `unit_cost_net_per_base` and `expiry_date` forward**, with
positive movements against them. `stock_batch.location_id` is never updated —
mutating it would rewrite history and break the append-only principle. Carrying
cost forward is what keeps store B's margin honest; carrying expiry forward is what
keeps store B's FEFO ordering meaningful. The screen ships later (§6), but the
movement shape is fixed in migration `0004`, because getting it wrong is the same
class of problem as omitting `location_id` in the first place.

This resolves the tension that blocked the waste module: batch selection was dropped
because the *interaction* was too complex, which forfeited batch-level truth.
Allocation being a server concern means the simple interaction and the precise data
are not in conflict.

**The invariant**

```sql
-- must hold for every batch, at all times
select sum(qty_base) from stock_movement where batch_id = $1
  = (select remaining_base from batch_balance where batch_id = $1)
```

Property-tested in CI against randomised sequences, re-checked nightly in production.
The projection is disposable and rebuildable from the ledger.

**Opening balances.** `adjust_stock` lets a manager count real shelf stock and write
the difference as adjustment movements. Without it every batch figure in the first
month is fiction and a correct model looks broken.

### 2.5 Units and money

Supersedes ADR-008 (one unit per variant), which made buying a case and selling
singles unrepresentable.

1. **One variant = one substance = one base unit**, always the smallest practical
   denomination (gram, millilitre, piece). The ledger stores `numeric(14,3)` in that
   unit and nothing else. With kilograms as base, buying 1 kg and selling 100 g ten
   times would never quite close; in grams it closes exactly.
2. **Denominations come from the static `unit` table.**
3. **Measurement and pricing denominations are separate.** A customer asks for a
   quarter kilo, the scale reads 250 g, the price is quoted per 100 g. All three
   recorded.
4. **Display values stored alongside normalised ones.**

```
quantity_display    250        qty_display_unit    'g'
price_display      2.00        price_display_unit  '100g'
------------------------------------------------------------
quantity_base       250        (g)
price_per_base     0.02        numeric(14,6)
line_net           5.00        numeric(12,2)
```

**Tap cost**

| Case | Interface | Extra taps |
|------|-----------|-----------:|
| Count items (cans, pieces) | Stepper only; no denomination control renders | 0 |
| Weighed, usual denomination | Variant remembers kg for buying, 100 g for selling | 0 |
| Weighed, switching | Chip row `kg · ¼kg · 100g · g`; converts the number already typed | 1 |
| Case of 24 | Optional `pack_size` renders a `×24` chip; absent if unset | 1 |

The pack chip exists because the alternative is a mental multiplication repeated at
every delivery, where a dropped factor is a 24× stock error too plausible for any
magnitude check to flag.

**IVA.** Shelf prices in Mexican retail include IVA; supplier invoices break it out.
Capturing both raw overstates margin by up to the tax rate — consistently, plausibly,
invisibly — and the error varies by product, since most unprocessed food is
zero-rated while general goods sit at 16%. That corrupts the ranking in the one
report the business case rests on.

The fix costs nothing at the counter: **one question at workspace setup**
(*¿Tus precios ya incluyen IVA?*) and **one optional field per product**
(`tax_rate`, default 0). The RPC splits net and tax on write.

**Rounding** (settled 2026-08-14 — this is the content of `cases.json`, §2.10):

1. Integer centavos at every layer. No floating point anywhere in the money path.
2. **Direction follows the document.** With `prices_include_tax = true` the
   **gross unit price is authoritative on a SALE** — that is the shelf price, and
   the shelf price is what the customer agreed to. On a **PURCHASE the net is
   authoritative**, because a supplier invoice breaks the tax out and the net is
   the figure printed on it. (Settled 2026-08-26. `prices_include_tax` is a
   workspace flag, so the earlier wording read as though it governed deliveries
   too; it does not.)
3. **Per line**, and which of net or gross is the input is what rule 2 decides:

   | | anchor | derived | tax |
   |---|---|---|---|
   | **sale** | `line_gross = round(unit_gross × qty)` | `line_net = round(line_gross / (1 + rate))` | `line_gross − line_net` |
   | **purchase** | `line_net = round(unit_net × qty)` | `line_gross = round(line_net × (1 + rate))` | `line_gross − line_net` |

   The tax column is the same expression on both rows. That is rule 4, and it is
   what rule 2's scope is arranged to preserve.
4. **Tax is always the residual**, never rounded on its own. That is what makes
   `net + tax = gross` hold exactly, on every line, permanently.

   ⚠️ On a **purchase** this rule costs nothing and forbids nothing: `line_net` is
   already an exact multiple of a centavo, so `round(net × (1 + rate)) − net` and
   `round(net × rate)` are the same number for every net and every rate. The rule
   has teeth exactly where the authoritative figure is the gross and the net is
   reached by **division** — the sell side. Asserted by exhaustion and over the
   seed in `07_money_and_units.sql` F17.
5. **Document total = sum of rounded lines.** The document is never rounded
   independently of its lines.
6. **Half-up, away from zero.** Banker's rounding is defensible statistically and
   surprises every person who checks the arithmetic by hand — which, in a shop, is
   the person who matters.

Per line rather than per document because the line is what the customer sees on the
§2.8 review screen, and a document-level split makes the displayed lines fail to sum
to the displayed total. Per-product reporting (§2.9) also needs a per-line net; deriving
one from a document-level split means re-allocating, which reintroduces exactly the
rounding just performed. ⚠️ **This clause said *margin-by-product* until 2026-09-14**, when
§2.9's margin question was retired. **The requirement is unchanged and the example moved**:
the per-line net is what lets revenue be shown net beside gross, and it is already applied.

`cases.json` seeds with: the three cases named in §2.10, a half-centavo boundary per
tax rate, one multi-line document where per-line and per-document disagree, one
zero-rated line, and one weighed line with a decimal quantity.

⚠️ **The half-centavo boundary goes on `round(unit_price × qty)`, and it cannot go
anywhere else** (found in plan task 3.5, 2026-08-26). Neither tax step can produce a
tie at the two rates this schema carries: no integer-centavo gross divides by 1.16
onto a half-centavo — `50G = 29(2m+1)` has no solution — and no integer-centavo net
multiplied by 0.16 lands on one either, since `8N = 25(2m+1)` has none. At rate 0
there is no rounding at all. Both proved by exhaustion in `07_money_and_units.sql`
F9 and F18. A `cases.json` that puts its boundary in the tax split will contain a
case that discriminates nothing and looks correct.

⚠️ **And it needs a REVERSAL of a boundary case on each side.** Half-up *away from
zero* and half-up *toward positive infinity* — which is what `Math.round` does, and
`packages/money` is JavaScript — agree on every positive number. The sign is the only
place they can be told apart, and the tax steps cannot tie, so the discriminating
shape is a negative line whose `unit_price × qty` lands on a half-centavo. `M8` and
`B6` in the pgTAP suite are those two cases; falsification S23 confirms they are the
only two of twenty that catch it.

### 2.6 The write path

Clients never insert. Ten functions are the entire write surface — seven for the
happy path, one for physical counts in delta form, and two for the failure path
added in the 2026-08-14 client review.

⚠️ **Three of the ten ship in build step 4.5, not step 4** (settled 2026-09-03, and
§3 is the section that says so): `record_failed_write`, `replay_failed_write`, and
**`adjust_stock_delta`**, which exists for `record_failed_write` to call. This table
is the write surface, not the build order: of its ten rows, three are step 4.5's and
`onboard_workspace` has been applied since `0001`, which leaves **six for step 4**.

| Function | Does |
|----------|------|
| `record_sale(id, location_id, lines, occurred_at, recorded_offline)` | Header, lines, FEFO allocation within the location, movements, tax split, balance update — one transaction |
| `record_purchase(id, location_id, provider_id, lines)` | Header, lines, batches with expiry per ADR-017 policy, positive movements |
| `record_waste(id, location_id, lines)` | Header, lines with reason and cost snapshot, negative movements |
| `record_transfer(id, from_location, to_location, lines)` | Negative movements at origin, new batches at destination carrying cost and expiry (§2.4). Screen deferred; shape fixed in `0004` |
| `void_transaction(kind, id, reason)` | Compensating document with `reversal_of` set; never mutates the original |
| `adjust_stock(location_id, variant_id, counted_base, note)` | Opening balances and physical counts. **Absolute** — the counted figure wins |
| `adjust_stock_delta(location_id, variant_id, delta_base, reason, note)` | **Relative.** Moves the balance by a signed amount without reading it first. Required by the failure path below; an absolute count would race any concurrent sale and write a number that was already wrong. ⚠️ **Ships in build step 4.5 with the failure path it serves**, not with `adjust_stock` in step 4 — §3, and the note above this table |
| `onboard_workspace(name, prices_include_tax, location_name)` | `security definer`; workspace, owner membership, settings and first location, atomically |
| `record_failed_write(id, kind, payload, error_code, error_detail)` | Dead-letters a permanently rejected client write and downgrades it, atomically. See **Rejected writes** below |
| `replay_failed_write(failed_write_id)` | Compensates the downgrade and re-runs the original call under its original id, in one transaction |

**Every RPC validates its location as its first statement.**

```sql
if p_location_id is null
   or p_location_id not in (select public.my_locations()) then
  raise exception 'location not accessible' using errcode = '42501';
end if;
```

These functions are `security definer`, which means they are on the far side of the
wall principle 5 describes: **RLS will not catch a bad `location_id` here, because
RLS is not running.** An explicit `workspace_id` parameter is validated the same
way. This is the single most important line in `record_sale`, and it is on the §2.10
review checklist for that reason.

Where a transaction spans locations — only `record_transfer` — *both* are checked,
and both must resolve to the same workspace.

**The one deliberate exception.** `record_failed_write` validates *workspace* and not
location, because the commonest reason a write is permanently rejected is that the
caller's location access was wrong — and a function that refuses the report for the
same reason it refused the write would lose exactly the events it exists to capture.
This asymmetry is intentional, it is the only one in the write surface, and it sits
on the §2.10 review checklist beside the location statement. Anyone reviewing this
function checks that it writes to `failed_write` and to the ledger via
`adjust_stock_delta` and to nothing else.

**What this replaces.** The Canvas purchase flow ran a client-side loop: one lookup
and two writes per line, no transaction. A twelve-line purchase was 37 sequential
round trips. A connection drop at line seven committed a header, seven lines and
seven batches, then reported success. No idempotency key existed, so a retry
produced a duplicate purchase indistinguishable from a real one.

**Availability check — built, dormant.** The RPC contains the enforcement path: lock
the open batches for the variant, evaluate availability, then insert or raise. This
is the irreversible half and it is ~20 lines. **v1 ships with no toggle and open mode
always on.** The pilot decides whether oversales are a real problem before paying for
the UI, the override role and the offline degradation path. Because the check locks
only rows `where remaining_base > 0` — typically one to three batches — its cost is
constant regardless of history size.

It resolves **per line and per variant**, `product_variant.enforce_stock` over
`workspace_setting.enforce_stock_default`, coalescing to **false**: the variant's
explicit `false` is an opinion that beats an enforcing workspace, and a workspace
with no settings row fails OPEN. Both ship open, which is what "dormant" means here
— shipping the path changes nothing a caller can observe. A refusal raises
**`TD002`**, which is neither `22023` (the code every bad *payload* raises — the
payload is fine, the shelf is empty) nor `23514` (Postgres's own, which a client
branching on it would catch from anywhere in the schema). ⚠️ Like `TD001`, it is a
**client contract**, cheap to change until a till branches on it and a coordinated
release afterwards.

⚠️ **Enforcement makes two of `allocate_fefo()`'s three shortfall branches
unreachable** — there is no shortfall left to absorb — so a store that opts in never
re-opens a closed lot and never invents an `adjustment` one. The offline path keeps
all three, which is the point of the sentence below.

**Idempotency semantics** (settled 2026-08-14). Every `record_*` function inserts its
header with `on conflict (id) do nothing`, then checks whether the insert happened.

| Situation | Behaviour |
|-----------|-----------|
| New id | Normal path |
| Id already committed, **same payload** | Return the existing document's summary with `already_recorded: true`. A success, not an error |
| First attempt **still in flight** | The second call blocks on the row lock until the first commits or aborts, then either sees the row or inserts. Stock Postgres behaviour, and the correct outcome — no extra machinery |
| Same id, **different lines** | **Raise, and dead-letter it** |

The header carries `payload_hash` over the normalised lines so the third and fourth
rows can be told apart. The last one is deliberately loud: accepting the first
version silently hides a client bug, accepting the second silently rewrites a
committed sale, and this is precisely the situation `failed_write` exists for.

**Timestamps** (settled 2026-08-14). Two columns, because "when did it happen" and
"when did we find out" are different questions and daily totals need the first while
audit needs the second.

- `recorded_at` — server-set `now()`, non-nullable, never client-supplied.
- `occurred_at` — server **overrides** with `now()` when the write is not
  `recorded_offline`. A till's clock is not worth trusting online and the difference
  is seconds.
- When `recorded_offline`, the client value is accepted but **clamped to
  `[now() − 72h, now()]`**. This rejects nothing and stops a wrong device clock filing
  a sale in 1970.
- `replay_failed_write` is **exempt**: it preserves the `occurred_at` already stored
  on the `failed_write` row, which was clamped at capture. Without this exemption
  every recovered sale is silently re-dated to the moment of recovery, which is the
  precise harm manual replay was chosen to avoid.

Daily totals read `occurred_at`, always — a sale counts on the day it was made.

**The 15-minute void window reads `occurred_at`, EXCEPT on a write flagged
`recorded_offline`, where it reads `recorded_at`** (settled 2026-09-04, on the
decision maker's instruction; §2.7 is where the window's purpose is stated). The
two are the same instant on an online write, because `occurred_at` is overridden
with `now()` there. They are not the same on a queued one: `occurred_at` is the
client's clamped time, so a sale rung up at 09:00 without signal and flushed at
14:00 would otherwise land five hours past a fifteen-minute window and be
un-correctable by the person who made the error. **The window measures the chance
to notice, not the moment of the sale**, and nobody can notice a write the server
has not yet received. The pilot store is offline often enough that this is the
normal path rather than an edge case.

✅ **`replay_failed_write` IS EXEMPT FROM THE OFFLINE BASIS** (settled 2026-09-04, on
the decision maker's instruction). A replayed write preserves its original
`occurred_at` while taking a fresh `recorded_at` at the moment of recovery, so the
rule above, applied blindly, would hand a two-day-old replayed sale a brand-new
fifteen minutes of staff self-service void. **It does not get one: a replayed write's
window is measured from `occurred_at`, exactly as if the amendment did not exist**,
which puts it outside any sane window and therefore in manager territory.

**The reason is that this costs nobody anything, and the alternative costs the owner
attention.** The 15-minute window exists for THE COUNTER — someone scanned twice and
the customer is standing there. A replayed sale is never that: it is two days old,
nobody is waiting, and a manager or owner has already reviewed the dead-letter row and
decided deliberately that it should go back in the books. Replay is manual and
operator-triggered (below), and the dead-letter pile is denominated in unrecorded
REVENUE, which §2.7 puts behind the manager role — **so the only person realistically
standing over a freshly replayed sale is already someone who can void it unfenced.**
The exemption therefore adds no step for anyone, while the alternative would let a
cashier silently reverse a reconciliation nobody asked them to review, and quietly
move a historical daily total — the precise harm manual replay exists to prevent.

⚠️ **THIS IS BINDING ON STEP 4.5 AND IT OWES A MARKER.** Nothing in the schema
currently distinguishes a replayed document from an ordinary offline one — the replay
re-runs the original call under the original id — so `void_transaction` CANNOT enforce
this today and does not try. **`replay_failed_write` must carry that marker when it
ships**, and step 4.5 must enforce the exemption at the same time. Until then no
replayed document exists, so nothing is unenforced in practice.

**Offline.** Queued writes, not offline-first. The client generates the id, writes to
a local queue, renders optimistically, flushes on reconnect; retries are free because
the id makes them idempotent. Reads serve from cache with visible staleness.
Transactions recorded offline set `recorded_offline` and skip enforcement — losing
enforcement is the acceptable cost, losing the sale is not.

The pilot store's connectivity was measured before this was settled (2026-08-14):
stable wifi at seconds-level cadence, with mobile data as a fallback whose **1–2
minute figure is background flush cadence, not single-write latency**. That closes
the question a sync engine would have answered — `expo-sqlite` plus an outbox table
is sufficient, and §6's deferral of offline-first stands.

The outbox has three states — `pending`, `flushing`, `dead` — and it is a named
deliverable of build step **`5c`**, not something a screen acquires along the way.
⚠️ **This sentence said `5a` until 2026-09-20 and that was a stale copy, not a
second opinion** — §3's step `5a` was amended on 2026-09-13, on the decision
maker's instruction, and the outbox moved to `5c` in that pass. Nothing was
re-decided here; the sentence was simply missed. See the revision entry of
2026-09-13 for the ruling, and the one of 2026-09-20 for this correction.

**Rejected writes.** Idempotency makes *retries* free. It does nothing for
*rejection*, and the first draft of this ADR did not distinguish them:

| Class | Example | Handled by |
|-------|---------|------------|
| Transient | Connection dropped mid-flush | Retry. The client uuid makes it safe |
| **Permanent** | `42501 location not accessible` after a membership change; a constraint; a variant deleted between capture and flush | Nothing, until this revision |

A permanently rejected sale already happened in the physical world — cash in the
drawer, goods off the shelf — and no retry will ever record it. The failure is
invisible to §2.10's nightly invariant, because `sum(movements) = batch_balance`
still holds perfectly: the ledger stays internally consistent and externally wrong.
That is the most dangerous shape a defect can take in this system.

The client therefore calls `record_failed_write`, which in one transaction:

1. writes a `failed_write` row — client uuid, workspace, location, kind, the original
   payload as `jsonb`, error code and detail, `failed_at`;
2. **auto-downgrades** via `adjust_stock_delta`, so the stock balance matches the
   shelf within seconds rather than at the next physical count;
3. links every movement it wrote back to that row.

Step 3 is what makes step 2 recoverable, and it is not optional. Without the link,
the downgrade and any later replay would each remove the same units and the ledger
would be short by exactly one sale.

⚠️ **AMENDED 2026-09-05 — THE LINK LIVES ON THE MOVEMENT, NOT ON THE ROW.** This
step read *"stores the resulting `adjustment_movement_id` on the `failed_write`
row"*, and **singular was wrong**: `adjust_stock_delta` takes one `variant_id`, a
rejected sale has lines, and a single line spanning two lots writes two movements
on its own. A row naming only the first is one `replay_failed_write` will
under-compensate — the exact arithmetic the paragraph above forbids. So
**`stock_movement.failed_write_id`** (`0024`), a foreign key, with the group being
the dead letter itself. An `adjustment_group_id` on both tables was weighed and
refused: two columns instead of one, and no constraint could hold it up. The FK
can, and does:

```sql
check ((adjustment_reason is not distinct from 'failed_write_downgrade')
       = (failed_write_id is not null))
```

A downgrade movement must name its dead letter and nothing else may carry one.
⚠️ `is not distinct from` and not `=`: a plain `=` against a NULL
`adjustment_reason` yields NULL, and **a NULL check constraint passes**.

⚠️ **AMENDED 2026-09-05 — STEP 2 RUNS FOR `sale` AND `waste` ONLY.** This section
describes the failure path entirely through the rejected sale, and the other three
kinds are not the same case:

| Rejected | The stock is | Who is standing there | So |
|---|---|---|---|
| `sale`, `waste` | **gone** — in the drawer or the bin | nobody who will ever re-enter it | **downgrade** |
| `purchase` | **on the shelf** | a manager with the delivery note (§2.7) | **dead-letter only** — Comprar records it properly, and an auto-upgrade would open a zero-cost lot and then DOUBLE the shelf |
| `transfer` | moved between two stores | — | **dead-letter only** — no document (§2.4), and its idempotency rests on an advisory lock rather than a key |

The rule is one sentence: **downgrade the kinds where the stock is gone and nobody
will re-enter it.** Both other kinds still dead-letter in full, so §2.10's nightly
check still sees them and `replay_failed_write` can still replay them.

⚠️ **AND `record_failed_write` NEVER RAISES FOR A BAD PAYLOAD** (`0024`). A
malformed payload, a deleted variant, a line whose unit no longer resolves — every
one of those IS a permanent failure, which is to say it is what this table exists
to capture. Raising would lose the event for the same reason the write was lost,
which is the location exception above applied one level in. The row lands, the
downgrade is best-effort per line, and the return value reports how much of it
happened. The workspace check is the only refusal in the body.

**A downgrade is lossy in the dimension §2.9 cares about.** It reconciles quantity.
It carries no revenue, no tax split and no FEFO batch attribution, therefore no cost
basis — so a downgraded sale disappears from *what made me money*. Stock stays true;
margin goes quiet.

**Replay.** Dead letters land with the vendor, not the merchant (§2.8), which is what
makes recovery possible at all: the operator cannot diagnose a `42501`, but whoever
caused it can. Once the root cause is fixed, `replay_failed_write` runs as one
transaction — compensate `adjustment_movement_id`, then re-run the original call
under its original client uuid — so either the real sale lands with its full revenue
and batch attribution, or nothing moves. If replay never happens the adjustment
simply stands, and the loss is bounded at the margin attribution rather than the
stock position.

**Replay is manual, never automatic** (settled 2026-08-14). One row at a time,
triggered by an operator who has seen the peso figure first. A fixed root cause does
not imply the sale should be re-recorded: the write carries its original
`occurred_at`, so an automatic replay three days later silently changes a historical
daily total that someone has already read in Números. Note the objection precisely:
replay *always* rewrites a historical total — that is what recovering the sale means,
and it is correct. What is not acceptable is it happening without a person deciding
to. A number that moves unattended is worse than a number that was always missing,
because only one of the two gets noticed. Two consequences fall out of this and are
deliberate:

- A replayed sale can land already outside the 15-minute void window, since that
  window is measured from `occurred_at`. Correcting a replayed sale therefore means
  `void_transaction`'s compensating-document path, not the fast void — which is the
  correct outcome for a transaction that has already been reconciled once.
- `occurred_at` trust (§8) and replay are the same question wearing two hats. Whatever
  rule the server adopts for overriding client timestamps must leave replayed writes
  alone, or replay silently re-dates every recovered sale to the moment of recovery.

**Monitoring is a number, not an intention.** §2.10's nightly production check reports
dead-letter count *and unrecorded revenue in pesos*, computed from the stored payload
by the same module in §2.11 that priced it on the device. A threshold alerts. The
distinction matters because "we will watch for margin risk" is precisely the class of
statement §1 of this document exists to distrust — a `failed_write` table nobody
queries is the original silent drop with a longer paper trail.

**The number shown to the customer is computed on the device, always, and never
waits for the network.** A cashier cannot stand at the counter while a total
resolves. This is a real concession against principle 1: unit conversion, tax split
and line total exist twice, once in PL/pgSQL and once in TypeScript. The concession
is bounded by making drift a test failure — one shared case table, run against both
implementations, asserting equality to the centavo (§2.10). The TypeScript half lives
in `packages/money`, **outside `app/**` and outside junior ownership**, for the
reason §2.10 gives. The device computes what
is *displayed*; the database remains the only thing that decides what is *stored*.
Sync state is never rendered as confirmed until the RPC returns; an unsynced count
is shown instead.

### 2.7 Access

Supersedes ADR-022 (app-level scoping).

```sql
create function my_workspaces() returns setof uuid
  language sql stable security definer as $$
    select workspace_id from workspace_member
     where user_id = auth.uid() and is_active
  $$;

create policy price_list_select on price_list         -- workspace-level shape
  for select to authenticated
  using (workspace_id in (select my_workspaces()));

create policy sale_line_select on sale_line           -- ledger shape
  for select to authenticated
  using (workspace_id in (select my_workspaces())
     and location_id  in (select my_locations()));
```

Two shapes, and every business table uses exactly one of them. The workspace
predicate in the second is redundant — `my_locations()` already implies
membership — and is kept anyway: it is indexed, it is cheap, and one uniform prefix
is what makes the shape safe to copy without thinking about it. Both are written as
`in (select fn())` rather than a bare call so the planner evaluates them once per
query rather than once per row.

**Policies are named `<table>_<verb>`, not `tenant_isolation`** (settled
2026-08-22). The first draft of this section called both example policies
`tenant_isolation`, and §2.10's coverage row then asked a test suite to look for
that name. `0001`–`0004` had already applied forty policies under the four-verb
convention — `sale_line_select`, `provider_update`, `workspace_member_delete` — so
read literally the ADR's own suite failed on all twenty tables while the schema was
entirely correct. Plan task 3.1 found it; the convention wins because a verb in the
policy name is what makes a Postgres error message say which operation was refused,
and forty policies sharing one name cannot. §2.10 now states the structural
requirement instead, which is what the suite actually asserts.

⚠️ **`for select` and `to authenticated` are part of the shape, not decoration.** A
policy created without a verb defaults to `ALL`, and one created without `TO`
targets `PUBLIC` — which on this schema would hand the predicate to `anon` as well.
`01_rls_coverage.sql` asserts both.

**Staff belong to a location, not to a workspace** (decided 2026-08-14).

```sql
create function my_locations() returns setof uuid
  language sql stable security definer set search_path = '' as $$
    select l.id
      from public.location l
      join public.workspace_member wm on wm.workspace_id = l.workspace_id
     where wm.user_id = auth.uid() and wm.is_active and l.is_active
       and ( wm.role >= 'manager'                    -- every location, by role
          or exists (select 1 from public.member_location ml
                      where ml.member_id = wm.id and ml.location_id = l.id) )
  $$;
```

**Fail-closed, by role — never by absence of rows.** The tempting rule is "a member
with no `member_location` rows sees every location," and it fails in the wrong
direction: one forgotten insert silently shows a cashier the other store's takings,
and nobody reports it. Under the rule above the identical mistake locks someone out
of their own store, which is a support ticket within five minutes. Managers and
owners are granted every location by role, so the join table carries staff rows
only.

Deliberately **not** a JWT claim. A claim is a snapshot: revoke someone's membership
and their existing token keeps working until it expires — full write access to a
workspace they were removed from, for exactly the person you most want cut off. A
live membership read takes effect on the next query.

The policy is set membership, so **many workspaces per user works from day one** even
though every real user has one. Retrofitting that later would touch every screen.

**Roles** — three, not the four in ADR-002. Nobody in a small store has read-only
access to their own operation; *Viewer* would be null forever.

| Capability | Staff | Manager | Owner |
|------------|:-----:|:-------:|:-----:|
| Record sale, purchase, waste | ● assigned locations | ● all | ● all |
| Void own transaction < 15 min | ● | ● | ● |
| Void any transaction, any time | — | ● | ● |
| Edit catalog and prices | — | ● | ● |
| See cost and margin | — | ● | ● |
| See quantity sold and revenue (Números) | ● assigned locations | ● all | ● all |
| Stock counts and adjustments | — | ● | ● |
| Transfer stock between locations | — | ● | ● |
| Members, settings, roles, locations | — | — | ● |

Cost visibility is a real commercial exposure in small retail, and separating it
after the fact means rewriting every query.

**How cost is actually hidden** (settled 2026-08-14). Not column `GRANT`s —
**manager-only views**. Staff hold `select` on views only, never on the base tables
carrying cost; the views are `security_invoker = true` so RLS still governs rows.

RLS filters rows, not columns, so "gated on `has_role`" was never a thing Postgres
does. Column grants are the closest built-in, and they fail here for a specific
reason: `supabase gen types typescript` would still emit the hidden columns, so a
staff-role read of `cost` compiles clean and fails at runtime, in front of a
customer. With views the generated type surface genuinely differs and the build
catches it — which is the same argument that put the types in CI (§2.10).

**Adding a second user** (settled 2026-08-14). `workspace_member.user_id` references
`auth.users`, which an owner cannot read, so as originally specified inviting anyone
was impossible.

`workspace_invite` — `workspace_id`, `email` (citext), `role`, `location_ids`,
~~`invited_by`~~ **`decided_by`** (renamed by `0027`, D4), `token_hash`, `expires_at`
(7 days), `accepted_at`, `accepted_by`. An owner or manager calls
`create_invite(...)` ~~under normal RLS~~ and receives a single-use token. The
recipient signs up through ordinary Supabase auth, then calls `redeem_invite(token)`
— `security definer` — which verifies hash and expiry, writes the `workspace_member`
and `member_location` rows, and marks the invite accepted. ~~`auth.users` is never
exposed to anyone.~~

⚠️ **AMENDED 2026-09-18 — TWO SENTENCES ABOVE WERE FALSE OF THE APPLIED SCHEMA, AND
BOTH ARE STRUCK RATHER THAN DELETED.**

**1. `create_invite` is NOT "under normal RLS."** It is `security definer` with the
manager fence written into its own body (`0028`), and it has been since the day it
was written — `0028`'s own header says so, and `supabase/tests/0028` section 4 is the
measurement. The struck phrase describes a design that was never built: `create_invite`
must read and write `workspace_invite` rows for a workspace the CALLER may be a manager
of rather than an owner, and no policy expressible on that table gives the right answer
for both paths in.

**2. `auth.users` is never exposed to anyone — CORRECT ABOUT THE CLIENT, WRONG AS AN
ABSOLUTE, AND `0034` IS WHY IT HAD TO BE RESTATED.** No client role can read
`auth.users`, then or now, and nothing in `0034` changes that: `auth_full_name(uuid)`
is `security definer` over that table and is granted to **nobody** — `revoke ... from
public`, asserted from `pg_proc.proacl`. What is now true is that **four definer
bodies read one field of it** — `raw_user_meta_data ->> 'full_name'` — and **copy that
one field onto `workspace_member.display_name`**, a column every member of the same
shop can already select. So the guarantee v1 makes is narrower and should be read as
written here rather than inferred from the struck sentence: *a client may never read
`auth.users`; a person's chosen name reaches other members of their own shop, and
nothing else about their account does.*

✅✅ **AND THAT NARROWER GUARANTEE IS RULED, NOT INHERITED — 2026-09-18.** The name is
**member-level**, deliberately. ⚠️ **The screen and the policy are fenced differently, and
they always were**: `workspace_member_select` (`0001:532`) admits **any active member**,
while the roster SHEET is manager-and-above by the ruling of the same date, enforced in
`canSeeRoster`. Before `0034` that gap was harmless because the rows were uuids; after it,
the same read carries names. **The gap did not move — what travels through it did.**
⚠️ **Measured, not argued**: under `set role authenticated`, a cashier reads every name in
her own shop, **and zero rows from any other** (`supabase/tests/0034` 7.1 and 7.2).

⚠️ **It was not fenced because there is no cheap fence.** Postgres has no column-level
RLS, so the three available moves are a **column GRANT** — which this very section argues
against by name, since `supabase gen types typescript` still emits the column and a staff
read then compiles clean and fails at runtime in front of a customer — a **second view**,
which is a second copy of the roster, or **narrowing `workspace_member_select`**, which is
the read behind every member's own role lookup. All three are a migration with blast
radius, bought to hide a coworker's first name from somebody standing at the same counter.
**The boundary that carries the weight is the tenant one, and it holds.**

**Delivery is out of band for v1:** the owner sends the code over WhatsApp. That is
one fewer piece of infrastructure standing between here and the pilot, and it is how
a shop with three staff would do it anyway.

⚠️⚠️ **AMENDED 2026-09-13 — THERE ARE TWO WAYS IN, NOT ONE, AND THE ONE ABOVE IS THE
LESS IMPORTANT OF THEM (C11.5 / C11.6).** The paragraphs above describe an
owner-initiated **push**. The decision maker asked for the **pull** as well: the joiner
is given a **workspace code**, enters it, and **requests** access, which the owner
approves. **An invite is simply a request that arrives pre-approved** — so it is one
table and one lifecycle, not two.

**The eight rulings, taken 2026-09-13, all as recommended:**

| | Ruling |
|---|---|
| **D1** | `workspace_invite` gains **`source`** (`'invite'` \| `'request'`); `invited_by` becomes **nullable**, with a CHECK that it is present exactly when `source = 'invite'`. The invariant is the database's, not a rule the app remembers |
| **D2** | **`token_hash` nullable** under the same CHECK. A self-request has no token *as a matter of concept, not of timing*; a dummy would be a unique, never-redeemable secret stored for nothing |
| **D3** | **The 7-day expiry is kept for both paths.** ⚠️ **And the creating RPC must SUPERSEDE any expired pending row** for that `(workspace_id, email)` — because `workspace_invite_one_pending_idx` is partial on `accepted_at is null`, so an expired row **still occupies the slot** and blocks re-asking forever. It cannot be fixed in the index: `now()` is not `immutable` and may not appear in an index predicate |
| **D4** | ⚠️⚠️ **`invited_by` is renamed `decided_by`** — nullable, set at creation for an invite and at approval for a request — and **`accepted_by` keeps its one meaning: who actually joined.** As written, `accepted_by` meant the **invitee** on one path and the **owner** on the other: a semantic overload that reads as correct until someone asks who approved a membership, and then the answer is not in the schema |
| **D5** | The join code is **8 characters, Crockford base32** (no `I`, `L`, `O`, `U`), normalised case-insensitively, `unique`, generated with retry-on-collision. It is read aloud over WhatsApp and typed by someone standing up |
| **D6** | A code is resolved by a **`security definer` RPC taking the WHOLE code**, and **no policy permits a scan** (C11.6 — workspaces are never listed). ⚠️ Such an RPC is an **enumeration oracle by construction**; 8 Crockford characters are what make guessing impractical, and that — not aesthetics — is the reason for the length |
| **D7** | **The two paths may collide on one person**, and the request path **absorbs the invite rather than erroring**: if a pending invite exists for that email, entering the code **accepts it**. An invite is a pre-approved request, so someone already invited who then types the code is simply let in, and is told none of it |
| **D8** | ⚠️⚠️ **The approval RPC takes `location_ids` and refuses an empty array for `role = 'staff'`.** Staff write only where `member_location` puts them and **RLS enforces it silently** — an approved joiner with no locations opens the app and every write is refused with no message, which looks exactly like the app being broken |

⚠️ **`workspace` gains the join code**; it has no such column today and no migration
adds one. ⚠️⚠️ **AMENDED 2026-09-13 (third entry this date): IT FREEZES ACROSS
`0027`–`0029`, NOT AT `0027`.** Plan task `4.6a` was sized `L` and split three ways on
the day of this ruling, before a line of it was written, and the eight rows above do not
all land in one migration:

| Migration | Plan task | Which of the eight |
|---|---|---|
| `0027` | `4.6a-i` | **`D1`**, **`D2`**, **`D4`**, **`D5`**, and **`D3′`**'s helper — the table, the column and the shared functions |
| `0028` | `4.6a-ii` | The push path: `create_invite` / `redeem_invite`, which call `D3′`'s helper |
| `0029` | `4.6a-iii` | **`D6`**, **`D7`**, **`D8`** — the pull path, its approval, and the joiner's status read `my_access_requests()`, ruled in 2026-09-13 |

**Each row above freezes when ITS migration merges**, and each merges on its own green
run. ⚠️ **So `D6`, `D7` and `D8` stay cheap for two migrations longer than the rest** —
which is worth knowing, and the opposite of what a single number implied.

⚠️ **On an offline write the window is measured from `recorded_at`, not
`occurred_at`** (settled 2026-09-04 — §2.6 carries the rule and the reasoning).
Without that, a shop with poor connectivity has a self-service void that is expired
on arrival, and the row above this one grants a capability nobody can ever exercise.

Corrections are self-service inside the window because the person who made the error
is the only one who reliably knows the right number, and knows it now. Voiding must
be fast and blameless: friction here converts into staff quietly not recording
things, which is the failure mode that destroys the dataset. Reversed lines are
excluded from derived prices and from reports, and remain visible in the audit view.

### 2.8 Screens

Three capture screens that *feel* like distinct modes, sharing one engine underneath.

| Surface | Job | Notes |
|---------|-----|-------|
| **Home** | Today's sales total and count, anything expiring within 48h, **and the way into every module** | ⚠️ **AMENDED 2026-09-17.** Was *"Shows state, not just doors. No nav panel here — redundant."* **State still comes first and that half is unchanged** — the takings and the expiries sit above anything tappable. What changed is the prohibition: Inicio carries **Vender, Comprar and Desperdicio as large cards**, plus rows to **Productos and Proveedores**, because the tab bar is capped at four by C12.1 (icon *and* word, and five Spanish words do not fit 390 px). The redundancy the original sentence feared is real and is paid for on purpose: it buys a fifth and sixth destination that otherwise have no home. Deliberately *not* a place where sync failures surface — see below |
| **Vender** | The dominant loop; persistent primary action, thumb-reachable everywhere | One tap from cold open; two taps to a committed single-item sale |
| **Comprar** | Provider context, price prefill from history, optional expiry | Episodic — not tap-optimised |
| **Desperdicio** | Reason-first waste entry | Feeds the analytics asset |
| **Catálogo** | Product create/edit; units and pack size set once here | Manager+ |
| **Proveedores** | Provider directory | Own screen |
| **Números** | Three questions (§2.9) | Manager+ |
| **Ajustes** | Workspace settings | Sheet, not a screen |

**Comprar has three price states, and they must look different** (settled
2026-08-14, from §2.3's provider pricing model):

| State | Renders as |
|-------|-----------|
| This provider has sold you this product before | Prefilled with the last price paid, editable |
| **New pairing** — you have bought this product, but never from this provider | **Empty and required**, visibly distinct from a prefill. Never the other provider's price |
| Brand-new product | Empty and required, same treatment |

The middle state is the one that matters. A supplier price is a fact about a
relationship, not about a product, so prefilling across providers would be a guess
presented as a memory — and the operator would accept it, because it looks exactly
like the case where the system knows. An empty required field asks a question; a
wrong prefill answers one nobody asked.

**Error prevention.** In open mode with prefilled prices, a cashier meaning 1.5 kg
who types 15 produces a transaction that is syntactically perfect, prices plausibly,
and silently corrupts stock, margin and waste analytics. Three guards, none blocking:

- **Magnitude warning** — flag any quantity or unit price beyond ~3× the trailing
  median for that product. Seeded from *purchase* history rather than sales, so it
  works from day one.
- **Unit-aware input** — stepper for discrete units, decimal keypad for weight and
  volume, unit rendered large beside the field. Never the same control for both.
- **Review before commit** — the commit gesture confirms a line list with totals, not
  a bare number.

Deliberately excluded: confirmation dialogs on every entry. Dismissed reflexively
within a day, then provide only the appearance of a check.

**Where failures surface — the vendor, not the merchant.** The device shows one thing
about sync and one only: an *unsynced count*, never a confirmation the database has
not given (§2.6). Permanent failures do not appear on Home at all. The merchant did
not cause a `42501`, cannot diagnose it, and cannot act on it — a list they cannot
act on becomes furniture within a week, which is the same failure as the confirmation
dialogs rejected above, relocated. Dead letters go to the operator of this system via
§2.10's nightly check, and Home stays single-purpose: today's takings and what is
about to expire.

The corollary is an obligation, not a saving. "It lands on our side" is only true if
someone is on that side. The alerting destination and its owner are §8 follow-ups,
due before the pilot ends — during the pilot the schema owner is standing in the
shop (§5), which conceals the gap for exactly three days.

### 2.9 Analytics

⚠️⚠️ **AMENDED 2026-09-14 on the decision maker's instruction, after the área 9 interview.
THE FIRST QUESTION IS RETIRED RATHER THAN RE-MEASURED**, and the three below are the ones he
asked for in his own words: *"Números is charts and tables about their transactions … it
doesn't have to be very robust nor sophisticated for now."*

| Question | Measure | Why this one |
|----------|---------|--------------|
| What am I selling, and what did it bring in? | **Quantity sold** in the variant's own unit, and **GROSS revenue**, per **variant** and per **family**, daily | The two numbers he named first. Quantity is the one measure C8.6 cannot corrupt: it has no cost in it |
| How have my prices moved? | **Purchase and sale unit price over time, per variant**, with a **% change** card over the current month, 1, 3, 6, 9 months and **YTD** | Both sides of the price, because a shop this size negotiates its purchases and re-marks its shelf in the same week. Read from the **ledger**, not from `price_list` — that table holds the *intended* price |
| What am I throwing away? | Waste **quantity** by product. ⚠️⚠️ **Its COST half is broken under C8.6** — see the warning below | The reorder-quantity signal. Kept as a question, and it gets **its own visual** rather than being folded into any other number |
| ~~What made me money?~~ | ~~Gross margin by product, net of tax~~ | ⚠️⚠️ **RETIRED 2026-09-14.** *"We won't derive the profit so let's ignore margins for now."* Not a preference alone: **under C8.6 the app cannot attribute a piece's cost to the whole item it was cut from**, so per-piece profit is **not derivable from anything the ledger stores**, and `product_margin_daily` (`0009`) returns **100 % margin** on a despiece line while the whole item's cost never enters COGS at all |
| ~~What stopped selling?~~ | ~~Velocity vs trailing average~~ | **Not retired — absorbed.** `product_velocity_daily` (`0013`/`0014`) is the view behind row 1, and its trailing columns still answer this. It survived C8.6 for the reason row 1 does: *"there is no cost column for it to fail open on"* |

⚠️⚠️ **THE WASTE MEASURE IS BROKEN THE SAME WAY THE MARGIN ONE WAS, AND NOBODY HAD WRITTEN IT
DOWN UNTIL 2026-09-13.** *"Waste cost as % of purchases, by product"* fails twice over on a
despiece: the numerator reads `unit_cost_net_per_base` off the movement, which for a shortfall
lot is **zero**, so throwing away a cut piece costs **$0**; and the denominator is purchases
**of that product**, which is also zero, because the shop buys whole items. **The headline is
0 over 0.** The quantity half is sound and is what the visual shows until a decision is taken
about the rest.

**Revenue is GROSS of IVA** (ruled 2026-09-14). `workspace.prices_include_tax` defaults true,
so the price typed into the catalog already contains the tax and gross is the number that
reconciles against the cash in the till. Net stays available beside it — the ledger stores the
per-line split (§2.5), so this is a presentation choice and not a loss of information.

**The grain is DAILY and the client rolls it up** to the Daily / Weekly / Monthly switch he
asked for, and computes the % windows. A period baked into a view is a migration every time
he wants a different card, and *"make a good guess for this initial version, we will improve
it afterwards"* is precisely the answer that changes after a pilot.

**Números also hands over the raw rows.** A download of the transactions breakdown — every
transaction **and the waste** for a given month — is part of the screen, not a later feature:
it is what an owner who has always used a notebook checks the app against.


SQL views over the ledger, so reports cannot drift from transactions. Nightly
materialised rollups per workspace and product, with the current partial day unioned
live. Totals remain as a header strip for reassurance; they are not the product.

**Scope: consolidated by default, with a location filter** (settled 2026-08-14).
These are business questions and the owner owns both stores, so the consolidated view
is the answer to the question actually being asked; per location is the drill-down. A
manager scoped to one location sees only theirs, by RLS rather than by a setting.

**One catalog per workspace, shared across locations** (settled 2026-08-14). Two
stores under one owner carrying different goods is a merchandising difference, not a
catalog difference — and stock is already per location, which covers "we don't carry
that here" without splitting anything. Splitting the catalog would double the owner's
maintenance to express something the ledger already expresses.

**Cross-workspace benchmarking.** The eventual insight product needs to read across
tenants, which is what RLS forbids. Resolution is one deliberate door, never a
weakened policy: a scheduled `service_role` job writes de-identified aggregates into
a separate `analytics` schema — salted surrogate workspace keys, no provider names,
no absolute prices, ratios and medians only. Application clients never touch it. A
**k ≥ 5 floor** applies to every published aggregate; without it the first three
customers can each derive the other two. **Nothing here is built in v1** — what *is*
done now is the one-paragraph data-use clause in the terms.

### 2.10 Tests

| Suite | Asserts | Where |
|-------|---------|-------|
| **RLS coverage** | Structural: every table in `public` has RLS enabled and at least one policy whose predicate is scoped by a tenancy helper (§2.7). Fails the build on a table shipped without one. **The requirement is the structure, not a policy name** — see the naming note in §2.7 | pgTAP |
| RLS isolation | For every table: a user in workspace A reading or writing workspace B gets zero rows and a rejection | pgTAP |
| **Location isolation** | Staff assigned to location A see zero rows from location B; a staff `record_sale` against an unassigned location is rejected; a manager sees both | pgTAP |
| Ledger invariant | `sum(movements) = batch_balance` across randomised purchase/sale/waste/transfer/reversal sequences, per location | pgTAP + nightly prod |
| Money and units | 1 kg in, 100 g × 10 out → exactly 0. Case of 24 at $12 → $0.50/can. 16% inclusive → net to the centavo | pgTAP |
| **Paired arithmetic** | `packages/money/cases.json` — **one data file**, read by both the pgTAP suite and Vitest, asserting equality to the centavo. Not two copies of the same expectations | pgTAP + Vitest |
| **Failure path** | A rejected sale yields exactly one `failed_write` row, one linked compensating movement, and a balance matching the shelf | pgTAP |
| **Replay** | Dead-letter → downgrade → replay produces net movement exactly equal to the original sale, with full revenue and batch attribution, and `sum(movements) = batch_balance` still holding. The replayed row keeps its **original `occurred_at`**, not the replay time — so the recovery lands in the period the sale actually happened | pgTAP |
| Concurrency | Two sessions, last unit, enforcement on → exactly one succeeds. Two identical calls, same id → exactly one row | TypeScript, two connections |

The RLS-coverage suite is structural on purpose: it is ten lines, it needs no
knowledge of the domain, and it catches the single likeliest defect a new
contributor introduces — a table shipped without a policy — without anyone having to
notice it in review.

Broad client-side testing is skipped for v1: a suite over a thin UI is a poor use of
a small team's attention when correctness sits one layer below it. **`packages/money`
is the exception and is not negotiable** — it is not UI, it decides what a customer
is charged, and it is half of the only duplicated logic in the system.

⚠️ **The word doing the work in that sentence is *broad*, and §2.11's table lost it
until 2026-09-07.** The line is not between `packages/money` and everything else; it is
between **a test that pins a value** and **a test that pins a layout**. A unit test is
in scope where it asserts something a customer sees or the ledger stores — the money
formatter and its centavo-hiding rule, unit conversion, the offline outbox's three
states. It stays out of scope over rendering, navigation and appearance, which is where
a UI suite spends the most and earns the least.

**Why the boundary is drawn there rather than at a package name.** `app/**` is the one
workspace §9's rule — *a file is not evidence; a green CI run is* — has never reached,
because neither existing workflow watches it. The workflow that closes that gap ships in
build step `5a`, and **a typecheck alone cannot fail on an app that charges the wrong
amount**: it asks whether the code makes sense to the compiler, not whether it is right.
A green that can only ever mean *"it compiled"* is the shape of reassurance this
architecture was written to distrust.

The case table is a *data file* rather than two test suites that happen to agree.
Duplicated expectations drift silently and each copy looks correct on its own; a
single `cases.json` read by both sides makes drift structurally impossible instead of
merely tested for.

**Review discipline.** One named person owns the schema, and no migration merges
without them reading it. The seven one-way doors (§4) get disproportionate scrutiny;
everything else ships on available confidence. Every RPC review checks the
location-validation statement in §2.6 first.

**When the owner is away** (settled 2026-08-14). There is no second reviewer, and
naming one would be theatre. **If the owner is unavailable beyond 48 hours,
migrations do not merge — the branch waits.** A junior is explicitly *not* the
backup: making them one dissolves the seam the whole structure rests on, and it does
so at the exact moment nobody is watching.

This is affordable because CI is the substantive gate — RLS coverage, isolation,
invariants and `db reset` on every PR — and because migrations are small. The
residual risk is onboarding time for a future second reviewer, mitigated by recording
a 20-minute walkthrough of `0001`–`0004` while the reasoning is still fresh. Revisit
once a junior has six months.

**Team shape** (settled 2026-08-14, revised the same day). One developer, joined by
two juniors hired no earlier than the completion of build-order step **5a**, so they
arrive to a working RPC surface *and an established client pattern* rather than to an
empty repository where the only way to be useful is to invent writes. The original
gate was step 4, which would have delivered the RPCs but left the conventions to be
invented four times in parallel. The
seam is structural, not cultural — juniors cannot be expected to know which files
are dangerous:

| Path | Owner | Contents |
|------|-------|----------|
| `supabase/**` | Schema owner | Migrations, RPCs, policies |
| **`packages/money/**`** | **Schema owner** | The TypeScript half of §2.6, and `cases.json` |
| `app/**` | Juniors | Screens, components, navigation |

**Why `packages/money` is a third line and not part of `app/`.** The seam exists
because juniors cannot be expected to know which files are dangerous — and under a
two-line split, the most dangerous file in the repository sat on their side. A junior
fixing a formatting bug in a money module would land beside the rounding rule, and
the two failing cases that resulted would most naturally be *fixed by updating the
expectations*. The device would then charge one number while Postgres stored another,
in a direction nothing logs — and the mechanism built to detect the drift would have
been edited in the same commit as the drift. Moving it out means the junior opens
`@rmt/money`, finds a package they do not own, and the review routes to the person
who wrote the SQL. The seam stops depending on anyone recognising danger, which was
the entire point of making it structural.

Generating the TypeScript from the PL/pgSQL was considered and rejected: a week of
build tooling to guard ~150 lines that change twice a year, producing a generator
that then needs its own tests.

Enforced by CODEOWNERS as a merge block, with generated TypeScript types
(`supabase gen types typescript`) committed in CI so a schema change breaks the
build rather than the pilot. The owner writes the **foundation and Vender** (steps
5a–5b) as the reference implementation; step 6's four screens are then independent,
pattern-following work. Note that a screen is not a pattern — if step 5 ships only a
screen, step 6 is four copy-pastes of it and step 7 inherits four dialects. What
makes step 6 parallel is `src/ui`, `src/api` and one page of written conventions,
which is why §3 names them as deliverables. ⚠️ **Amended 2026-09-13: the three are
still required and the STEP THEY LAND IN CHANGED.** `src/ui` and `src/api` are built
across `5d`–`5h` against screens that exist, and the conventions describing them are
written at **`5b.5`** (`src/api`, done 2026-09-18) and **`5h.5`** (`src/ui`, once
primitives exist) — both before step 6, which is what this paragraph actually
requires. ⚠️ **Amended 2026-09-18**, and the sentence it replaced named only `5b.5`:
see §3 and the revision entry.
The claim here is about ORDER RELATIVE TO STEP 6, not about the letter `5a`. If a junior ever needs to write a
migration, that is a missing RPC — a design bug, not a permissions problem.

### 2.11 Client architecture

The first draft specified the client as one word. That is how you get four screens in
four dialects and a junior inventing a cache. Settled 2026-08-14:

| Layer | Choice | Why this one |
|-------|--------|--------------|
| Navigation | **Expo Router** | File-based. A junior maps screen to file without a routing lesson |
| Server state | **TanStack Query, exclusively** | Staleness, refetching and invalidation are exactly what hand-rolled fetching gets wrong. §2.6 already requires reads served from cache with *visible* staleness; this provides that flag rather than reinventing it |
| Write path | **`src/api/` — one wrapper per RPC** | Juniors never call `supabase.rpc` directly. The typed client, the outbox enqueue and `record_failed_write` all live behind this boundary |
| Local state | **Zustand, cart only**, persisted to `expo-sqlite` | Survives the app being backgrounded mid-sale. One rule: **if it came from Postgres it lives in Query; if it is not committed yet it lives in the cart store.** Nothing lives in both |
| Components | **~10 hand-rolled primitives in `src/ui/`** | No Tamagui, no gluestack. The unit-aware input and the tap budget in §2.8 are idiosyncratic requirements; a general kit is fought, then worked around, then partially abandoned |
| Strings | **Hardcoded Spanish, centralised in one file** | No i18n runtime in v1. Centralising costs nothing now and makes a second language a refactor instead of an excavation |
| **Palette** | **One file of named ROLES, `src/theme/palette.ts`** — added 2026-09-17 | The twin of C3.18's density scale, and it arrives for the same reason that one did: retrofitting colour onto finished screens is an audit of every file, and the ones it misses are the states nobody looks at. A role has **one job** (`atención` is the unpriced row and nothing else), which is what lets someone who is not a designer add a screen without inventing anything. ⚠️ **No state is ever announced by colour ALONE** — always colour *and* a word, or colour *and* a border: the users are old, the shop is bright, and a hue on its own is not a signal to them. Enforced by `R11` in `docs/checks/conventions-gate.sh`, the shape `R6` already has for sizes |
| **Motion** | **One staggered entrance per screen; `transform` and `opacity` only** — added 2026-09-17 | It is a performance rule before it is a taste one. C1.1 puts **two low-end Androids** among the pilot's four phones; transform and opacity run on the compositor, while animating layout, colour, shadow or blur does not. One orchestrated reveal also beats scattered micro-interactions on a screen someone opens four hundred times a day |
| Money on screen | `Intl.NumberFormat('es-MX')` for **rendering only** | Arithmetic is integer centavos in `packages/money`, always. A formatter never touches a value that will be compared against Postgres |
| Client tests | **Narrow, and bounded by what they assert.** Allowed where a test pins a value a customer sees or the ledger stores — the money formatter, unit conversion, the outbox state machine. Refused over rendering, navigation and layout. `packages/money` is not negotiable | Per §2.10, amended 2026-09-07. A suite over a thin UI is still a poor use of a small team; four assertions over a pure function that decides a displayed price are not that suite, and they are what makes `app.yml`'s green mean something other than *"it compiled"* |

The primitives, roughly: `Screen`, `Field`, `QtyInput` (the stepper/keypad switch
from §2.8), `Money`, `LineList`, `PrimaryAction`, `Sheet`, `ListRow`, `Empty`,
`Banner`. Ten is a target, not a budget; the point is that they exist before step 6
rather than being extracted from Vender afterwards by someone who did not write it.

**The release path is part of the architecture.** Choosing iOS put App Store review
between the team and a fix. §5 commits the schema owner to three days physically
present in the shop watching for errors — a 48-hour turnaround wastes that window,
which is the most expensive observation time in the project. So: Apple Developer
enrolment, EAS Build, TestFlight onto the store's actual device, and an EAS Update
channel **proven end-to-end before pilot day**, with a JS-only fix shipped in under
an hour as the acceptance test. Discovering provisioning friction during the pilot
burns the one thing §5 cannot buy again.

---

## 3. Build order

Pace-independent. Each step gates the next; step 2 is the design gate.

0. **A Postgres you can actually run.** OrbStack plus the Supabase CLI locally;
   `supabase/setup-cli` and `supabase db reset` on every PR in CI. Nothing below
   this line is real until a migration has been applied by a machine (§9).
1. **Migrations and seed script** — schema, RLS, unit table, `location` and
   `member_location`. A seeded fake workspace with **two locations**: a few hundred
   products, three months of purchases, sales, waste, transfers and reversals,
   mixed units, mixed tax rates, packs and weighed items. No app.
2. **The three Insight queries — the gate.** Write §2.9's queries against seeded
   data, **per location and consolidated across locations**. If margin-by-product
   needs a five-way join and a CTE to survive reversals, unit conversion and a
   location rollup, the schema is wrong — known in week two, before any screen.
3. **Test suites** — pgTAP for RLS coverage, RLS isolation, location isolation,
   invariants and money; Vitest for concurrency and paired arithmetic.
   Do not build screens before this passes.
4. **RPCs** — the ten functions in §2.6, including the dormant availability check and
   the location-validation statement in each.
4.5 **The failure path** — `failed_write`, `adjust_stock_delta`,
   `record_failed_write`, `replay_failed_write`, and the pgTAP suites that cover
   them. Before any screen exists, deliberately: a screen written against a write
   path that has no failure path bakes in the assumption that writes succeed, and
   that assumption is invisible until the day it is wrong.
5a. **Foundation** (schema owner). `packages/money` with `cases.json` wired into both
   suites; the Expo Router shell and Supabase session persistence. Plus
   **`CONVENTIONS.md` — one page**. Hiring gates on that file existing, because a
   junior arriving before it does will write the conventions themselves, by accident,
   in four places.

   ⚠️ **Amended 2026-09-13 — three things left this step, and one of them is the
   reason the step exists.** `src/api/` and `src/ui/` move to `5d`–`5h`, and **`5b.5`
   carries the obligation they were here to discharge**: see the revision entry, and
   `docs/PLAN.md`. ⚠️ **Amended again 2026-09-18: that obligation takes TWO passes —
   `5b.5` for `src/api/`, `5h.5` for `src/ui/`** — for the reason written under those
   two entries below. The `expo-sqlite` **outbox moves to `5c`**. *"Session persistence
   on a shared till device"* is struck as a premise, not deferred — **C1.5/C1.1
   established there is no shared till; the pilot uses personal phones** — and *"how
   the client resolves its `location_id`"* went with it, since a phone belonging to
   one person resolves it from membership.

5b.5. **`CONVENTIONS.md`, second pass** — the **`src/api/`** conventions, written once
   `5b` has produced a real pattern. ⚠️ **Done 2026-09-18**: `R12` and `R13` on that
   page, read by `docs/checks/conventions-gate.sh`.

   ⚠️ **Amended 2026-09-18 — THE OBLIGATION IS ONE THING AND IT TAKES TWO PASSES,
   BECAUSE THE TWO DIRECTORIES ARE NOT BUILT AT THE SAME TIME.** This entry named
   `src/api/` and `src/ui/` together at `5b.5`, and on the day `5b.5` ran there was
   no `app/src/ui/` — the client was thirty source files and the only shared
   component in it was a placeholder saying a screen was not built yet. Writing
   primitive conventions there would have been the very thing the decision maker
   refused on 2026-09-13, *"rather than ten primitives guessed at against screens
   nobody has drawn"*, arriving one step later wearing this document's authority.
   **So the `src/ui/` half is `5h.5`, below**, and this paragraph is the amendment
   rather than the plan being the bug — see the revision entry of 2026-09-18.

5h.5. **`CONVENTIONS.md`, third pass** — the **`src/ui/`** conventions, written once
   `5d`–`5h` have produced real primitives, and **before step 6**. ⚠️ **This, with
   `5b.5`, is where step 5a's *"arrive to a pattern"* requirement is actually
   discharged**, and both are load-bearing rather than tidy-ups: skip either and
   step 6's four screens arrive to half a pattern or none, which is the outcome
   §2.10 and this section were both written to prevent. ⚠️ **The claim this section
   makes is ORDER RELATIVE TO STEP 6** (§2.10 says so in its own words), which is
   why moving the pass down the build order upholds it and skipping it does not.
5b. **Vender and Home** — ship the dominant loop, put it in front of a real cashier.
   Written by the schema owner as the reference implementation.
6. **Comprar, Desperdicio, Catálogo, Proveedores.** Four independent screens over an
   established pattern — where the juniors start.
7. **Números.**

Running in parallel from 5a: the release path in §2.11. It is not a step because it
blocks nothing, and it is written down because it is the kind of work that gets done
the week it is needed rather than the week before.

Steps 0–4.5 are the whole system; 5–7 are windows onto it.

Seeding two locations from day one is deliberate: with one, every location bug is
invisible until the second store opens, which is the week it is most expensive.

---

## 4. Risk register

**One-way doors** — change later and you rewrite history or migrate data:

| Decision | Why irreversible |
|----------|------------------|
| Base unit = smallest denomination | Every ledger row is denominated in it |
| Ledger as source of truth | Retrofitting onto stored balances means reconstructing the past |
| Tax stored as net + tax | The split cannot be recovered from a blended historical amount |
| RLS via function, not JWT claim | Touches every table and every query |
| Region | Fixed at project creation. Settled as `us-east-1` (§2.2) |
| Client-UUID idempotency | The identity of every transaction |
| **`location_id` on the ledger** | Backfilling it means inventing a historical value that is genuinely unknowable |

The seventh door was missing from the first draft of this register, and was the one
the design was actually about to walk through. It is listed here because the answer
to "is a second store realistic?" turned out to be yes, within six months — and
because `0001` had never been executed, which made the fix free. Adding
`location_id` to `stock_movement` after a month of trading would not have been.

**Near-one-way, added 2026-08-14.** Not history-rewriting like the seven above, but
expensive enough after trading starts to belong here:

| Decision | Why it hardens |
|----------|----------------|
| `adjust_stock_delta` as a relative operation | Its callers assume they never read a balance first. Converting to absolute later means auditing every call site for a race |
| **`stock_movement.failed_write_id`** — the downgrade link (amended 2026-09-05; was `failed_write.adjustment_movement_id`) | The link is what makes a downgrade reversible. Movements written without it can never be replayed, because nothing records what to compensate — and a movement is append-only, so a link omitted at insert can never be added |
| `record_failed_write` validating workspace but not location | The exception is the point (§2.6). Tightening it later silently drops the failures it exists to catch |

**Reversible:** FEFO vs FIFO ordering, enforcement default, the 15-minute void
window, magnitude thresholds, the analytics layer (views), every screen decision, and
the client stack in §2.11 — router, query library and state store are all replaceable
per-screen, which is precisely why they were worth choosing once rather than four
times.

### Weakest points in this specification

Named deliberately — a spec that does not identify its own soft spots is a longer way
of being wrong.

- **FEFO on approximate balances.** Inventory control is irregular in practice. If
  opening counts are poor, allocation is precise arithmetic over imprecise inputs.
  Mitigated by `adjust_stock`, not solved by it.
- **Magnitude warnings in week one.** Purchase-history seeding makes them functional
  from day one, but weakly. The pilot is when errors are most likely and the guard is
  thinnest.
- **The three Insight questions are a hypothesis.** They are what an owner *should*
  want. Pilot rule 4 tests that rather than assuming it.
- **No payment method.** Deferred deliberately (§5). The cost is that the till cannot
  serve as an independent completeness check, which is why pilot rule 1 uses a manual
  tally instead.
- **Display arithmetic exists twice.** §2.6 requires the device to compute the
  customer-facing total without waiting for the network, so unit conversion and the
  tax split are implemented in both PL/pgSQL and TypeScript. The paired test suite
  turns drift into a build failure, which is containment, not a fix. The honest
  version: principle 1 holds for what is *stored*, not for what is *shown*. The
  2026-08-14 revision moved the TypeScript half out of junior ownership and collapsed
  the two case tables into one data file — both narrow how drift can start, neither
  removes the duplication.
- **The failure path is the least-exercised code in the system.** `record_failed_write`
  and `replay_failed_write` run only when something else has already gone wrong,
  which is the definition of code that is broken when it is finally needed. pgTAP
  covers it; production will not, for months. Deliberate exposure during the pilot —
  revoking a location assignment mid-shift on purpose and watching the whole path
  run — is worth more than another test.
- **A downgrade with no replay is a permanent margin loss.** Replay is only possible
  because dead letters land with the vendor (§2.8), and it only happens if someone
  reads the nightly number. The mechanism produces pesos; the mechanism for *looking*
  is a person, unnamed until the §8 follow-up is closed. Until then this is a paper
  guarantee, and it is the weakest link added by this revision.
- ~~**Three open location questions.**~~ **Closed 2026-08-14.** Per-location sell
  pricing ships as a nullable `price_list.location_id` with no UI (§2.3); the catalog
  is shared workspace-wide (§2.9); Números is consolidated by default with a location
  filter (§2.9). All three were closed while they were still free — the point of
  having listed them.

---

## 5. Pilot rules

Written before the pilot starts, and binding. Otherwise the observation gets
explained away.

One store. Three days physically present — not supporting, watching. The measure is
not satisfaction: it is **completeness**, because every product designed here assumes
the data is whole. Keep a manual tally of real transactions and compare against what
reached the ledger. Instrument RPC latency, taps per transaction, and **abandonment**
(capture screens opened with no commit following) — the silent non-use detector.

| If | Then |
|----|------|
| Completeness below 95% on any pilot day | Stop all feature work. The capture flow is wrong and nothing downstream matters |
| Median taps per sale above 5 | The unit/denomination design failed its central claim. Fix before a second store |
| Oversales exceed ~5% of lines | Enable enforcement for the worst offenders; the dormant check earns its place |
| Owner doesn't open Números unprompted in week two | The three questions are the wrong three. Ask what they checked instead |
| Staff stop recording during rush hours | Latency or tap count on the sell path — not a training problem |

**Latency, defined** (settled 2026-08-14). Rule 5 blamed latency without naming a
number, which makes it unfalsifiable:

| Measure | Budget |
|---------|-------:|
| p95 commit gesture → on-screen confirmation | **300 ms** |
| p95 `record_sale` round trip on wifi | **1 s** |
| p95 cold open → **Vender** interactive | **2 s** |

The first is a render budget, not a network one — §2.6 computes the customer-facing
total on the device, so nothing about the confirmation waits on Postgres. The third
is new and is the one most likely to fail on modest hardware: §2.8 promises "one tap
from cold open", and a tap you wait three seconds to make is not one tap.

Measured with a dev-build overlay during the pilot, not with instrumentation shipped
to production.

**Success, defined in advance:** five consecutive days where recorded transactions
match the independent tally within 5%, with no intervention.

---

## 6. Deferred

| Item | Reason | Cost to add later |
|------|--------|-------------------|
| Barcode scanning | Irregular inventory control; catalog not predominantly barcoded | Low — additive `variant_barcode` table |
| Payment methods and *fiado* | Not a cash-flow tool at this stage | Low — nullable column; history cannot be backfilled |
| Customer entity | Follows payment methods | Low |
| Strict-mode UI and toggle | Enforcement path exists dormant; demand unproven | Low |
| Cross-workspace analytics schema | No customers to anonymise yet; terms clause written now | Medium |
| Collection-partner notifications | When built: `outbox` + Edge Function drain, no external auth, never HTTP inside a transaction | Low |
| Price-list management UI | Seed by SQL until someone asks | Low |
| Transfer screen | `record_transfer` and its movement shape ship in `0004`; the UI waits for the second store | Low — the irreversible half is already built |
| Location picker in the UI | One location until the second store opens; zero taps until then | Low |
| Per-location pricing **UI** | Settled: the column ships now, nullable, null = workspace default (§2.3). Only the UI waits | Low now, medium after trading |
| Android release path | iOS-first (§2.2). Play Console, a second EAS profile and a test device wait until the second store's hardware is chosen (~Nov 2026) | Low — Expo makes the port a build target, not a rewrite |
| CFDI / SAT invoicing | A different product; would consume this one | High — by design |
| Offline-first sync with conflict resolution | Queued writes cover the real connectivity case | High — a quarter of engineering |

---

## 7. Alternatives considered

- **Finish the Canvas alpha, then migrate.** Rejected. Its claimed value was a
  validated data model; the one shipped module demonstrably did not validate it. Six
  more screens of Power Fx would be discarded at the UI layer while validating no
  better. With no live operator, there is nothing to preserve.
- **Stored balance as source of truth.** Rejected. A stored balance with no writer is
  worse than none — it looks authoritative. The ledger-plus-projection pattern keeps
  the audit trail and makes the balance rebuildable and verifiable.
- **JWT `workspace_id` claim** (as proposed in `MIGRATION-BRIEF.md`). Rejected —
  membership revocation does not take effect until token expiry.
- **Strict stock validation as a shipped v1 feature.** Deferred. The irreversible
  half (the in-transaction check) is built; the reversible half (UI, override role,
  offline degradation) waits for evidence that oversales are real.
- **Self-hosted Postgres.** Rejected. Upgrades, pooling, TLS and pager duty are a
  permanent tax on a team whose product is retail insight.
- **A PWA on the till device instead of a native app.** Rejected on one fact, not on
  preference. Nothing in §2.8 needs native — one fixed counter, measured wifi, no
  scanner in v1 — and a PWA would have avoided developer enrolment, provisioning and
  App Store review between a bug and its fix. But the pilot store runs iOS, Safari
  has no Background Sync API, and a queue that can only flush while the tab is
  foregrounded fails on a device that sleeps between customers. Worth recording that
  on an Android-only pilot this decision would have gone the other way.
- **Surfacing sync failures to the merchant.** Rejected (§2.8). It also turns out to
  be the choice that makes `replay_failed_write` possible at all — merchant-side
  resolution could only ever have re-keyed the sale by hand, losing its original id
  and its idempotency.

---

## 8. Follow-ups

- [x] Write this ADR
- [x] Migration `0001` — tenancy, locations, units, RLS foundation *(written, **never executed**)*
- [ ] **Run `0001`.** OrbStack + Supabase CLI locally, `supabase db reset` in CI (§3 step 0)
- [ ] Migrations `0002+` — catalog, transactions, ledger, projections, all location-aware
- [ ] Seed script for a realistic fake workspace **with two locations**
- [ ] The three Insight queries, per location and consolidated (the §3 step-2 gate)
- [ ] pgTAP suites, starting with the structural RLS-coverage test
- [ ] CODEOWNERS on `supabase/**` **and `packages/money/**`**; `supabase gen types typescript` in CI; `CONTRIBUTING.md` — all before the juniors arrive
- [ ] `failed_write` table and the three failure-path functions (§3 step 4.5)
- [ ] `packages/money` + `cases.json`, read by both the pgTAP and Vitest suites
- [ ] Nightly check extended to report dead-letter count **and unrecorded revenue in pesos**, with a threshold
- [ ] `CONVENTIONS.md` — the one page step 6 depends on. Blocks hiring, not just merging
- [ ] Apple Developer enrolment, EAS Build, TestFlight onto the pilot device
- [ ] EAS Update channel proven end-to-end — a JS-only fix shipped in under an hour, before pilot day
- [ ] Add ⛔ superseded banner to the ADRs listed in the header
- [ ] Rewrite `docs/alpha/ALPHA-SCOPE.md` exit criteria (currently describes cancelled work)
- [ ] Data-use clause in terms, before first onboarding
- [ ] Rehearse a PITR restore before real data exists
- [ ] Enable PITR **at the first real operator transaction**, not before — seed data needs no protection
- [ ] `btree_gist`, and the `price_list` exclusion constraint with the coalesced `location_id` sentinel
- [ ] Provider price memory as a **view over `purchase_line`**, excluding reversals and reversed documents; index `(workspace_id, provider_id, variant_id, occurred_at desc)`
- [ ] Generic provider row created by `onboard_workspace`, `is_generic`, not deletable
- [ ] Manager-only views for cost and margin; revoke staff `select` on the base tables that carry cost
- [ ] `workspace_invite` + `create_invite` + `redeem_invite` — ⚠️ **still unbuilt; they were assigned to `0005` and never written.** Plus, from the 2026-09-13 amendment: `workspace.code`, the request path, and its approval RPC (plan `4.6a`, split three ways 2026-09-13: `4.6a-i` / `0027`, `4.6a-ii` / `0028`, `4.6a-iii` / `0029`)
- [ ] `payload_hash` on every transaction header
- [ ] Nightly report pipe: `pg_cron` → Edge Function → WhatsApp/Telegram, sending **daily including green**
- [ ] Record the 20-minute walkthrough of `0001`–`0004`
- [ ] Android emulator smoke test at the end of step 5a

**Decisions settled 2026-08-14.** This section previously listed thirteen open
questions. All thirteen were answered in the open-questions review; each is specified
in the section named, and is repeated here only so the list of what *was* undecided
survives. An unnamed open question becomes an accidental decision — a named and
answered one is just a decision.

| # | Question | Settled as | Where |
|---|----------|-----------|-------|
| 1 | Region | `us-east-1`, **without measurement**. Mexican traffic transits Dallas and Miami eastward; being wrong costs tens of ms on a path the device never waits on | §2.2 |
| 2 | PITR cost | Enable at shortest retention, **on the first real operator transaction** — not before. Everything prior is regenerable seed data. Fallback if prohibitive: daily `pg_dump` to object storage | §8 checklist |
| 3 | Rounding | Integer centavos; gross authoritative; **per line**; tax as residual; document = sum of rounded lines; **half-up** | §2.5 |
| 4 | `price_list` overlap | Dissolved rather than fixed: provider prices left `price_list` entirely, so the NULL that made the constraint inert is gone. Remaining nullable `location_id` coalesced to a sentinel in a `btree_gist` exclusion | §2.3 |
| 5 | Column-level access | **Manager-only views**, not column `GRANT`s — because generated types would not catch a column grant, and do catch a view | §2.7 |
| 6a | Per-location pricing | Column ships now, nullable, null = workspace default. UI deferred | §2.3, §6 |
| 6b | Shared catalog | **Shared.** One catalog per workspace; stock is already per location | §2.9 |
| 6c | Números scope | **Consolidated by default**, location filter as drill-down | §2.9 |
| 7 | Idempotency semantics | `on conflict do nothing` + `payload_hash`. Same payload → `already_recorded`. In flight → block on the lock. **Different lines → raise and dead-letter** | §2.6 |
| 8 | `occurred_at` trust | Server overrides when online; clamped to `[now() − 72h, now()]` when `recorded_offline`; **`replay_failed_write` exempt** | §2.6 |
| 9 | Staff invitation flow | ⚠️ **Amended 2026-09-13 (C11.5/C11.6): BOTH paths, one table.** The joiner enters a **workspace code**, **requests**, and is **approved**; an owner's invite is *a request that arrives pre-approved*. `source`, nullable `token_hash`, `invited_by` → **`decided_by`**, locations required at approval. Token still by WhatsApp; `auth.users` never exposed. **Eight rulings in §2.7** | §2.7 |
| 10 | Schema review continuity | **No deputy.** Beyond 48 h unavailable, migrations wait. A junior is explicitly not the backup | §2.10 |
| 11 | Who reads the nightly report | WhatsApp/Telegram to the owner's phone, **every day including green** | §2.10 |
| 12 | Latency thresholds | 300 ms confirmation · 1 s RPC · **2 s cold open → Vender** | §5 |
| 13 | Android | Defer the release path, keep the code honest. Emulator smoke test at the end of 5a | §2.2, §6 |
| — | Is replay ever automatic | **No.** Manual, per row, operator sees the peso figure first | §2.6 |

Two carry review dates rather than being finished: **Android** (revisit ~Nov 2026,
when the second store's hardware is chosen) and **schema review continuity** (revisit
once a junior has six months).

**The one that changed the schema.** Question 4 was posed as "how do we make the
exclusion constraint fire when `provider_id` is NULL". The answer was that the NULL
should not exist: sell prices are curated and purchase prices are remembered, and
putting both in one table is what created the hole. The decision maker's account of
how provider pricing actually works — memory per provider-product pair, no fallback
across providers, a generic provider that behaves like any other — removed a column
instead of adding a constraint. Worth recording as the pattern: a constraint that is
awkward to express is often a data model saying something.
---

## 9. The rule that prevents a repeat

**Every schema claim in an ADR must be traceable to a migration that CI has applied
and tested.**

The original failure was a decision record with no deployed counterpart. The first
version of this rule said "a merged migration file" — which `0001` satisfied while
having never touched a database, making it the same class of artifact as ADR-034's
`ProviderProductPrice`: a written claim with no executed counterpart. A file is not
evidence. A green CI run against a real Postgres is.
