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

**STEP 1 IS CLOSED. STEP 2 — the three Insight queries, the design gate — IS CLOSED.
STEP 3 — THE TEST SUITES — IS CLOSED AS OF 2026-09-02. STEP 4, THE WRITE SURFACE OF
§2.6, IS UNDER WAY — SPLIT INTO 4a–4f ON 2026-09-03, BEFORE ANY OF IT WAS WRITTEN.
**4a — RECEIPT COMPLETENESS, `0015` — IS DONE AS OF 2026-09-03. `4b`, `record_sale`,
WAS SIZED AGAINST §2.6 THE SAME DAY AND SPLIT INTO 4b-i / 4b-ii**, on nearly the seam
this file named in advance — the function is WHOLE in `0016` and 4b-ii is evidence, not
schema. ⚠️ **The tidier seam — document in one migration, ledger in the next — was
REFUSED**, because it puts a `record_sale` on `main` that sells goods and moves no
stock, and §2.4's invariant cannot see that. Reasoning under *Settled in sizing 4b*.
✅ **4b-i — `record_sale`, `0016` — IS DONE AS OF 2026-09-03.** 63 behavioural
checks, eleven falsifications, and §2.10's location-isolation
WRITE half is closed — the first row of §2.10 that step 3 could not write and step 4
now has. ⚠️⚠️ **TWO OF THE ELEVEN FALSIFICATIONS FOUND DEFECTS IN THE SUITE RATHER
THAN IN THE FUNCTION**, and the second is the more serious: `where not passed` in the
report block of EVERY behavioural suite does not count a check whose condition was
NULL, so a file could print a `FAIL` row and exit 0 on *"all N checks passed"*. That is
the THIRD way a failing suite exits 0 in this repository, after 3.3's disarmed pgTAP
exception and 3.6a's empty Vitest workspace. Closed in all six suites on the same
commit. ⚠️ **The first is why: a cashier writes a ledger they CANNOT READ** —
`stock_movement_select` is gated on manager — so two checks written inside
`set local role authenticated` were claims about visibility, not about writes.
⚠️⚠️ **ONE DECISION IS CHEAP NOW AND DEAR LATER AND NEEDS THE OWNER: `TD001`**, a new
application SQLSTATE for §2.6's *"same id, different lines"*. Nothing consumes it yet;
the moment a client branches on it, changing it costs a coordinated release. Findings
below.
✅ **4d IS DONE — BOTH HALVES — AS OF 2026-09-04.** `0018` `record_purchase` (82
checks, ten falsifications) and `0019` `record_waste` (67 checks, ten
falsifications). **Four of step 4's six functions are now applied.**
⚠️⚠️ **`4e` WAS SIZED AGAINST §2.6 ON 2026-09-04 AND SPLIT INTO `4e-i`
(`record_transfer`, `0020`) AND `4e-ii` (`void_transaction`, `0021`), BEFORE ANY OF IT
WAS WRITTEN.** It is an `L`, not the `M` the step-4 table estimated, and the seam is
4d's — two whole functions cannot share one unapplied migration across two sessions.
**That cost a SECOND renumbering: 4f to `0022`, the failure path to `0023`**, free
today and fixed the moment `0020` is green. ⚠️ **4e reserves exactly two numbers and no
more**: if `void_transaction` overflows one session the overflow takes 4b-ii's
test-breadth seam and ships no migration, decided now so a third renumbering never
arises. Reasoning and the before/after table under *Settled in sizing 4e*.
⚠️⚠️ **ONE DECISION WAS MADE ON THE OWNER'S BEHALF IN THE SIZING: the transfer's
idempotency hash is RECOMPUTED from the movements, not stored.** A transfer has no
document table (§2.4, deliberately), so there is no header to carry `payload_hash` —
and the cheap answer, matching on `transfer_group_id` alone, cannot raise `TD001` and
would make the transfer the one RPC whose idempotency contract is weaker than the other
three's. Reasoning under *Decided in sizing 4e*.
✅ **4e-i — `record_transfer`, `0020` — IS DONE AS OF 2026-09-04 AND MERGED (#47) 2026-09-05, AND `4e-ii`
(`void_transaction`, `0021`) IS THE NEXT TASK.** 76 behavioural checks and TWELVE
falsifications; **five of step 4's six functions are now applied.**
⚠️⚠️ **ITS HEADLINE FINDING IS A HOLE IN THE SUITE, NOT IN THE FUNCTION: F8 pointed the
enforcement block at the DESTINATION'S shelf instead of the origin's and NOT ONE of 74
checks went red.** Every enforced case in the file was short at BOTH stores, so the two
readings agreed — and a destination is EXPECTED to be empty, so that error would have
refused every FIRST shipment to a new store. Checks 6.7 and 6.8 close it and F8 now
kills the file. ⚠️⚠️ **AND A SECOND OWED ROW THAT DID NOT EXIST BEFORE THIS TASK:
§2.6's third idempotency row rests ENTIRELY on an advisory lock here**, because
`transfer_group_id` is a plain column that cannot be unique — and **F9 deleted that lock
and turned NOTHING red**. A concurrently re-sent transfer is unproved on `main` today;
`supabase/vitest/test/idempotency.test.ts` is the home for it and **the owner's call is
whose task it belongs to**. ⚠️ **ONE DECISION IS CHEAP NOW AND DEAR LATER AND NEEDS THE
OWNER: the default denomination is `sell_unit_code`**, and 4d-ii's direction rule did
not decide it — a transfer moves stock BOTH ways, so the rule is silent for the first
time. F5 is what getting it wrong looks like: ten times the stock, applying clean.
Findings below.

✅✅ **4e-ii-a — `void_transaction`, `0021` — IS DONE AS OF 2026-09-04, AND WITH IT
ALL SIX OF STEP 4's FUNCTIONS ARE APPLIED.** 64 behavioural checks and SIXTEEN
falsifications; the gate now runs **eleven suites and 637 checks** plus 29
two-connection assertions. **`4e-ii-b` (test breadth, NO migration) IS THE NEXT
TASK**, and after it only `4f` (`adjust_stock`, `0022`) remains in step 4.
⚠️⚠️ **F2 IS THE HEADLINE AND IT IS A CLEAN ONE: forcing the window basis back to
`occurred_at` — the exact rule the owner's amendment replaced — turns check 7.2 RED
AND NOTHING ELSE.** The amendment is the only reading the suite admits.
⚠️⚠️ **F12 FOUND A REAL HOLE IN THE SUITE: the location wall is written out THREE
TIMES, once per document kind, and section 2 watched only the `purchase` copy** —
deleting the scoping from the `sale` or `waste` lookup turned NOTHING red until
2.4b and 2.4c were written. The same shape as 4e-i's F8: a branch nobody looked at.
⚠️⚠️ **AND A NEW OWED ROW: F6 — the basis forced to `recorded_at` for EVERY write —
turned nothing red, AND NOTHING IN THE DATABASE CAN TURN RED FOR IT TODAY.** §2.6
overrides `occurred_at` with now() online, so no online document exists where the two
differ; **the first that will is a REPLAYED one**, and `replay_failed_write` ships in
step 4.5. Half of `0021`'s `case` is unfalsifiable until then, and **4.5 is where the
check belongs** — it is NOT one of §2.10's nine.
⚠️⚠️ **A SIXTH SHAPE OF MISLEADING GREEN, FIXED IN `_cleanup.sql` RATHER THAN IN ONE
SUITE**: a suite that ABORTS never reaches its own `drop function`, so its helper
survives into the NEXT suite of the same CI job and every one after it dies on
"function already exists" instead of on its own defect. Five falsifications in a row
reported the harness error rather than the defect they injected before this was found.
`_cleanup.sql`'s own header had predicted exactly this gap and asked for the fix.

✅⚠️⚠️ **4e-ii IS SIZED AND UNBLOCKED, 2026-09-04, AND CLOSING IT AMENDED THE ADR.**
Sizing turned up the first plan/ADR disagreement of step 4 that was about BEHAVIOUR
rather than a migration number: this file's *done when* said *"§2.7's void window is
enforced in the body"*, and **§2.7's roles table says the window is a ROLE BOUNDARY, NOT
A DEADLINE** — staff void their OWN inside 15 minutes, **manager and owner void ANY
transaction, ANY TIME**. Written as this file had it, `0021` would have refused a
manager's void of a 21-minute-old sale and made §2.6's replayed sale permanently
uncorrectable. **The owner confirmed §2.7's reading.**
⚠️⚠️ **AND THE SECOND ANSWER CHANGED ADR-035 ITSELF, WHICH IS A FIRST FOR STEP 4.** §2.6
said the void window reads `occurred_at`; on a queued OFFLINE sale that is the client's
clamped time, so a 09:00 sale flushed at 14:00 lands five hours past its own window and
the cashier cannot fix their own slip. **The owner: *"the store is offline a lot, use
`recorded_at` for offline writes."*** §2.6 and §2.7 were **amended on the decision
maker's instruction** rather than implemented around. ⚠️ **Daily totals still read
`occurred_at`** and were deliberately left alone. ⚠️ **`TD003` for a refused void was
taken ON THE OWNER'S BEHALF** — cheap now, a coordinated release later.
⚠️ **4e-ii is ALSO an `L`** and was split into 4e-ii-a / 4e-ii-b on the seam 4e
pre-committed — **`0022` and `0023` DO NOT MOVE.** All of it under *CLOSED BY THE OWNER —
the void fence* and *Settled in sizing 4e-ii* below.

⚠️⚠️ **THE QUESTION 4c-i LEFT OPEN IS CLOSED. THE OWNER SETTLED IT 2026-09-04:
`record_waste` GETS NO AVAILABILITY CHECK AND RECORDS UNCONDITIONALLY** — the
loss already happened, and refusing a write-off because the shelf already reads
zero discards the only record that the stock ever existed. `supabase/tests/0019`
section 6 is that decision made falsifiable, and its PAIR is the argument: same
variant, same store, same quantity, enforcement ON — the SALE is refused with
`TD002` and the WRITE-OFF is recorded, so nothing but the document kind can
explain the difference.

⚠️ **READ *Found in 4d-i* BEFORE WRITING ANOTHER SUITE.** A verdict recorded
inside a transaction that ends in `rollback` VANISHES from the report rather than
failing, and 4d-i lost eighteen checks to it while reporting a clean pass. Both
4d suites now end their refusal blocks in `commit` and assert their own check
count against a literal. ⚠️⚠️ **`4d` WAS RE-SIZED
`L` AND SPLIT INTO `4d-i` (`record_purchase`, `0018`) AND `4d-ii` (`record_waste`,
`0019`) ON 2026-09-04, BEFORE ANY OF IT WAS WRITTEN** — and unlike the 4b and 4c
splits **this one moved migration numbers**: 4e to `0020`, 4f to `0021`, the failure
path to `0022`. That is free today and fixed the moment `0019` is green. Reasoning and
the full before/after table under *Settled in sizing 4d*. 4c-ii shipped no migration,
by the split:
`supabase/vitest/` goes from two suites to three and from 16 tests to 29, and
**ADR-035 §2.10's concurrency row is CLOSED** — both clauses, after 3.7a carried the
idempotency half alone since 2026-09-01. ⚠️⚠️ **ITS HEADLINE FINDING IS THAT §2.10's
CLAUSE, WORDED LITERALLY, IS NOT THE WHOLE PROPERTY.** *"Two sessions, last unit,
enforcement on → exactly one succeeds"* is ALSO satisfied by a path that refuses every
concurrent second sale whether or not the shelf could serve it — which is what `for
update **skip locked**` produces, one word from what `0017` ships and the idiom a
reviewer reaches for around a contended row. **Falsification W-F5 applies it and all
four of the last-unit race's outcome assertions stay GREEN**; what catches it is a
SECOND race with two units on the shelf, where both tills must be served. A one-race
suite would have merged it, and `0017`'s 35 single-connection checks are green under it
too. ⚠️⚠️ **AND A FIFTH SHAPE OF VACUOUS GREEN: a Vitest suite that dies in `beforeAll`
reports `numFailedTests: 0`** with the full `numTotalTests` — so two of `db.yml`'s
three guards on that step wave it through and only `if (!r.success)` catches it. Said
at that line in the workflow now. ✅ **The anti-vacuity guard was itself falsified**:
W-F4 makes the race not race and NINE of the thirteen tests stay green. **No defect was
found in `0017`** — it stands exactly as it merged, and no migration was written.
✅ **4c-i — THE AVAILABILITY CHECK, `0017` — IS DONE AS OF 2026-09-03.** 4c was sized against §2.6 and §2.10 the same day and **split into
4c-i / 4c-ii** — it is an `L`, not the `M` the step-4 table estimated, and the seam is
4b-ii's: the function is whole in `0017` and 4c-ii is §2.10's concurrency clause in a
second language. 35 behavioural checks, 9 over the seed, **eight falsifications on the
function and three on the seed check**. ⚠️⚠️ **ITS HEADLINE FINDING IS A PREDICTION
THIS FILE GOT WRONG: `0016` CHECK 6.2 DID NOT GO RED.** *Decided in 4b-ii* said that
when 4c landed "an oversale is refused and check 6.2 goes red — that is the correct
outcome and 4c-i owns the edit". It does not, and nothing was edited: 6.2 sells a
variant that never opts in, and §2.6 ships v1 with open mode always on, so `0017`
resolves enforcement to false for it and the oversale records exactly as before.
`supabase/tests/0016` is UNCHANGED by this task and still reports all 89. The
prediction assumed 4c would switch enforcement on; "built, dormant" means it does not.
⚠️⚠️ **F6 IS THE FALSIFICATION THAT MATTERS AND IT WENT NOWHERE: deleting the
enforcement `for update` turns NOT ONE of the 35 checks red.** That is the measured
case for 4c-ii rather than an argument for it — a single connection cannot see a lock,
and §2.10's concurrency row stays owed. ⚠️⚠️ **A SECOND APPLICATION SQLSTATE NEEDS THE
OWNER ALONGSIDE `TD001`: `TD002`**, *not enough stock*. Nothing consumes it yet; the
moment a till branches on it, changing it costs a coordinated release. ⚠️ **AND 4b-i's
VACUOUS-GREEN FIX HAD STOPPED AT `supabase/tests/`** — all SEVEN files in
`supabase/checks/` still carried `where not passed`, at two guard sites each. Closed in
all seven on this commit; no counts changed. Findings below.
✅ **4b-ii — THE ARITHMETIC AND ALLOCATION BREADTH OF THE SAME FUNCTION — IS DONE AS
OF 2026-09-03.** No migration, by the split: the suite goes
from 63 checks to **89**, and seven falsifications were run by hand. ✅ **IT FOUND NO
DEFECT IN `record_sale`** — `0016` stands exactly as it merged, and nothing is folded
into 4c's `create or replace`. What it found is in the SUITE and in what the suite
could not previously see: a line that spans two lots, both shortfall branches that
leave the adjustment lot alone, mixed rates in one document, and the residual identity
asserted over every line in the database rather than over one hand-checked sale.
⚠️⚠️ **CHECK 6.2 PINS BEHAVIOUR 4c IS GOING TO CHANGE ON PURPOSE, AND IT IS THE ONE
THING TO CARRY OUT OF THIS TASK**: today an oversale RECORDS and the debt shows as a
negative `batch_balance`, because §2.6's availability check is dormant until 4c. The
check asserts that, so 4c will turn it red — which is the point, and is why it is
named here rather than discovered as a broken test. ⚠️ **A fourth shape of
badly-shaped red was found too**: a bare scalar subquery check DIES on `21000` instead
of printing a FAIL row when a defect splits one line into two. Section 6 is counted
rather than read; sections 1–5 are not, and the reason is stated. Findings below.
✅ **4a shipped the rule before the functions that have to satisfy it**, which is what
the ordering argument was for: three `deferrable initially deferred` constraint
triggers, 30 behavioural checks, 10 over the seed and six falsifications run by hand.
⚠️ **AND IT IS THE FIRST TASK IN THIS BUILD THAT CHANGED FILES OUTSIDE ITS OWN** — a
fixture in `supabase/tests/0004_inventory.sql` and two lines in
`supabase/pgtap/06`, both because the new rule is real. Findings below. ✅ **The numbering is settled: the
pieces take `0015`–`0021` and the `0006` / `0007` reservation is retired** (owner,
2026-09-03), which DELETES the five-versus-six-argument `allocate_fefo` trap
`supabase/README.md` has carried since `0010` rather than documenting it a second
time. ⚠️ **"Do not build screens before this
passes" is NOT satisfied by step 3 alone** — three of ADR-035 §2.10's nine rows need
tables steps 4 and 4.5 create, and they are named under *What step 3 does NOT ship*
rather than quietly counted as done.
**Step 3 was split into 3.1 / 3.2a / 3.2b / 3.3 / 3.4 / 3.5 / 3.6 / 3.7 on 2026-08-22**,
**and 3.6 split again into 3.6a / 3.6b on 2026-09-01**, also before it was written,
before any of it was written — nine suites over two languages is the largest thing left
before the RPCs. See *Step 3* below. **3.1 — the pgTAP harness and the structural
RLS-coverage suite — is done.** ⚠️ **Three of ADR-035 §2.10's nine suites cannot be
written in step 3 at all** — failure path, replay, and the `record_sale` half of
location isolation all need tables and functions that steps 4 and 4.5 create, and §3
already files them there. Named in *What step 3 does NOT ship* so they are not lost.
**3.2a — RLS isolation on reads — is done**, and it is the first suite in this repo to
make the tenant claim by reading rows rather than catalogs: 106 tests, both directions,
every tenant table, under `set role authenticated`. ⚠️ **It writes a fixture and rolls
it back**, because `workspace_invite` is the one tenant table the seed leaves empty and
an isolation claim over zero rows is a claim about nothing. Decision below.
**3.3 — LOCATION ISOLATION ON READS — IS DONE**: 84 tests and twelve falsifications,
and it is the first suite to measure the STORE wall rather than the tenant one — both
actors inside one workspace, so the tenant wall is held open and every refusal it
measures is the store wall or it is nothing. ⚠️ **Its central finding is that the ten
location policies split 5/5, and the halves need different actors** — five are also
gated on `has_role(…, 'manager')`, so a cashier's zero there is a ROLE refusal and
proves nothing about locations, while nobody who clears that gate is location-restricted
at all. ⚠️ **The second five are observable only by CLOSING A STORE**: `my_locations()`
excludes inactive locations and the workspace predicate beside it does not, so
`is_active` is the one lever the location clause answers to and the tenant clause
ignores. Closing one store is what makes those five policies testable, and it proves the
fail-closed rule too — the stranded cashier sees nothing rather than everything.
⚠️⚠️ **3.3 ALSO FOUND A HOLE IN THE pgTAP HARNESS, AND IT WAS NEVER 3.3'S ALONE** —
`finish(exception_on_failure := true)` is DISARMED by a plan that does not match the
number of tests run, so a suite can print `not ok` and exit 0. That is the vacuous green
ADR-035 §9 refuses, it applies to 01, 02, 03 and 04 exactly as much as to 05, and it is
now closed in CI for all five. Findings below.
**3.4 — THE LEDGER INVARIANT OVER RANDOMISED SEQUENCES — IS DONE**: 99 tests and thirteen
falsifications, and it is the first suite whose subject is arithmetic rather than access —
400 generated writes on top of the seed, through the real allocators, measured after every
run and per location. ⚠️ **Its finding is a LIMIT OF §2.4 ITSELF, not of the suite**:
deleting the receipt movement from a purchase — a real defect — leaves every §2.4
assertion GREEN, because an empty lot agrees with its empty movement set. The invariant
sees a movement that was never *projected*, never one that was never *made*. ✅ **SETTLED
2026-08-26 — it becomes a deferred constraint in `0006`**, not a step-3 suite and not a
task of its own; the predicate is specified and verified under *What step 3 does NOT
ship*. ⚠️ **3.4 also found that the per-file plan guard 3.3
shipped in 05 was itself wrong** — it compared the file's own arithmetic instead of
pgTAP's number, so `plan(planned + 1)` sailed through it. Corrected, and now carried by
all six suites, which discharges 3.3's instruction about 01–04. Findings below.
**3.5 — MONEY AND UNITS — IS DONE**: 155 tests and eighteen falsifications, and it is
the first suite that is openly half specification — because rules 2–4 of ADR-035 §2.5
have no SQL implementation to test yet. The tax split is `0006`, and step 3 ships no
migration. What IS real: rule 1 as a build failure (**no float column anywhere in
`public`**, plus a scale check per money column), rule 5 over all 1 086 seeded
documents, the residual identity over all 3 448 seeded lines, and §2.10's kilogram
sentence run as ten tickets through the real `allocate_fefo()` to a balance of exactly
zero.
✅ **THE ONE DECISION IT OPENED IS ALREADY CLOSED — SETTLED BY THE OWNER 2026-08-26,
SHIPPED 2026-08-27.** 3.5 found that the seed computes a delivery line net-first with
`tax = round(net × rate)`, which §2.5 rule 4 appears to forbid, while a sale line is
gross-first with tax as the residual — and the sentence above rule 2 says supplier
invoices break tax out, so the seed was defensible. **The owner took reading 3:
direction follows the document, tax stays the residual on both.** ADR-035 §2.5 rules
2–4 are the files that moved. ⚠️ **And the wording this plan first gave that reading
was CIRCULAR** — it re-derived the forbidden `round(net × rate)` and called it a
residual; corrected below, and recorded rather than quietly fixed. ✅ **It cost
nothing: on a net-first line the two spellings are provably the same number, so all
1 048 seeded delivery lines already satisfy it** (F17). No migration, no seed change.
Six buy-side cases and two fixed tests now assert it — 07 stands at **181 tests and
twenty-five falsifications**.
⚠️⚠️ **3.5 ALSO FOUND THAT §2.5 ASKS `cases.json` FOR A HALF-CENTAVO BOUNDARY THAT
CANNOT EXIST** — `gross/1.16` never lands on one, provably and by exhaustion, so the
rule-6 tie-break is reachable only at `round(unit_gross × qty)`. That is a correction to
§2.5's description of `cases.json` and it is binding on 3.6.
⚠️ **And `round(float8)` is banker's while `round(numeric)` is half-up**, which makes
rule 1 the precondition for rule 6 rather than hygiene — with a JavaScript corollary for
3.6: `Math.round` is half-up toward +∞, and **M8, the reversal case, is the only one of
the fifteen that catches it.**
**3.7b — THE `.sh`, AND THE LAST TASK IN STEP 3 — IS DONE, AND THE DECISION WAS TO
PORT AND RETIRE**: `supabase/tests/0005_allocation_concurrency.sh` is deleted, its
claim is 7 Vitest tests in `supabase/vitest/test/allocation-race.test.ts`, and the
workspace stands at 16. **Five falsifications, all five run LOCALLY** — which is the
argument that decided it ([CI green on PR #37](https://github.com/bersermi/RetailerManagementTool/actions/runs/33672536563), read from the job log: *16
two-connection assertions*, and the 39 / 54 / 55 / 46 the retired `.sh` left behind it
unchanged): the `.sh` needed `psql`, the schema owner's machine has
none, and a suite about `allocate_fefo()` that only CI can run is a suite nobody
consults while changing `allocate_fefo()`. **Step 4 changes it next.** ✅ **The port
made one assertion STRONGER, and that was not foreseen when 3.7 was written**: the
`.sh` could see only that its second backend sat in *some* lock wait — true whether or
not the locking clause was there, which its own header admits and which let an early
draft pass green with the clause deleted. Two separate round trips let the wait be
observed **while only the allocation `select` is outstanding**, so deleting
`for update of bb` now returns an EMPTY `pg_blocking_pids()` and turns three of the
seven red (W1). ⚠️ **The `.sh`'s own discriminator is kept** — which lot session 2
ends up with — because a block observed in the right place is still not the property;
re-reading after it is. ⚠️ **It is NOT §2.10's concurrency row**, it is task 1.3b's,
and the two assert OPPOSITE outcomes: §2.10's enforcement clause refuses the loser,
the allocator makes the loser wait and take the next lot. Three files say so. ⚠️ **A
cost was taken, not avoided: 3.7a's V6 is weaker.** With two files in the workspace,
deleting one no longer trips "No test files found". Findings below.
**3.6b — THE ONE DATA FILE — IS DONE, AND §2.10's PAIRED-ARITHMETIC ROW IS NOW
TRUE**: 07 builds its case tables from `packages/money/cases.json` with
`jsonb_array_elements`, the hand-written fork 3.5 declared is deleted, and the suite
stands at **192 tests** with F19–F21 added. ✅ **The claim was proved rather than
asserted**: one value edited in the data file turns BOTH suites red, three times over.
✅ **M10 and M11 shipped on the owner's decision** (2026-09-01) and close 3.6a's two
findings — the table can now fail for a float, and rule 4 no longer rests on M9 alone.
⚠️ **`pg_read_file()` could not be used and this is the constraint to remember**: it
runs in the SERVER, and the server is a container with no view of the repository. psql
reads the file CLIENT-SIDE, relative to the working directory — which made
`packages/money/cases.json` an input to `db.yml` and its `paths:` filter a correctness
concern rather than a speed one. ⚠️ **One measurement is worth carrying forward**:
neither tax step can disagree with float arithmetic, on either side, over every value
from one centavo to $20 000 — so the multiplication is the only place ANY of the three
discriminator groups can live. Findings below.
**3.6a — `packages/money`, `cases.json` AND THE VITEST HALF — IS DONE**: 105 tests and
thirteen falsifications, and it is the first TypeScript, the first `package.json` and
the first CI workflow that is not `db.yml`. All twenty-one cases were lifted from 07
**by id**, every literal verified identical mechanically, and every expectation
re-derived in Postgres `numeric` against a fresh reset — so the data file already is
the shared truth and 3.6b is a re-point, not a re-derivation. ⚠️ **It is HALF of
§2.10's sentence and the files say so**: until 3.6b moves 07 onto the same file, the
fork 3.5 declared is still a fork and the Vitest green is not yet the paired-arithmetic
claim. ⚠️⚠️ **Its finding is a LIMIT OF `cases.json` ITSELF, the same shape as 3.4's
limit of §2.4** — no case in the table can fail for a float, because its four
boundaries are ties IEEE754 holds exactly, while 436 shop-sized lines that WOULD catch
one sit outside it. Recorded, not patched: a new case has to land in both readers on
one commit, which is 3.6b. ⚠️ **Rule 4 on the sell side rests on exactly one case
(M9)** where the seed measures it over 118 lines. ✅ **Vitest cannot go vacuously
green — but `npm run test --workspaces --if-present` can**, so the workflow names the
workspace and asserts the count. Findings below.
**3.2b was split into 3.2b-i / 3.2b-ii on 2026-08-22, and BOTH ARE NOW DONE** — 151
tests and twelve falsifications for the first, 43 tests and twelve falsifications for
the second. ⚠️ **Two of 3.2b-i's falsifications found holes in the suite rather than in
the schema**, and the finding is that **the tenant wall on writes is held by the
`_select` policies**: Postgres reads a row before it updates it, so a leak in a write
policy is invisible from across the wall. The write policies are only observable from a
staff user inside its own workspace. ⚠️ **3.2b-ii is the exception to that, and it is
the good news**: an INSERT reads no existing row, so nothing shadows the eight
`_insert` policies and a cross-tenant insert is refused *by them* — opening
`provider_insert` to `with check (true)` turns the new suite red where the same
experiment on `provider_update` left the whole of 3.2b-i green. **The writing half of
ADR-035 §2.10's second row is now complete.** Findings below. ⚠️ **§2.10's `tenant_isolation`
naming disagreement, open since 3.1, is CLOSED** — the owner took the cheap side and
ADR-035 §2.7 and §2.10 are the files that moved. No schema change.
Tasks 1.1, 1.2, 1.3a, 1.3b, 1.4, 1.5, 1.6a, 1.6b, 1.6c, 1.7 and 1.8 are all done.
**Step 2 was split into 2.1 / 2.2 / 2.3 on 2026-08-20**, before any of it was written —
one task per question, because the three read three different corners of the ledger.
**2.1 — margin by product — 2.2 — waste as a share of purchases — 2.4 — the shop
timezone — and 2.3 — velocity against a trailing average — are all done.**
**⚠️ THE GATE'S VERDICT IS A PASS, THREE OF THREE**: ADR-035 §2.9's three questions
are each answerable in one statement over the applied schema, and no schema change is
owed to any of them. See *Step 2* below. **2.2 found that the division at the end of a
waste report fails three ways and not one** — recorded, not patched, because it is a
property of the ledger rather than a defect. **The timezone finding 2.1 raised and 2.2
doubled is FIXED**: `location.timezone` is a column, all three views read it, and the
day boundary is testable for the first time.

✅ **2.3's finding is FIXED, and it needed no schema change** — `0014`, task 2.5, done
2026-08-22. The velocity spine now starts at the earlier of a pair's first sale and its
first **stock receipt**, so all 71 delivered-and-never-sold pairs are reported and the
shop can be told "*Pepino* has been on your shelf 63 days and has never once sold".
⚠️ **2.3 prescribed a new table and was wrong to**: ADR-035 §2.9 settled on 2026-08-14
that *"stock is already per location, which covers 'we don't carry that here'"*, and it
was right. **No schema change is owed anywhere in step 2.** See *Fixed in 2.5* below.

⚠️ **One adjacent fact is genuinely unrecorded and is the owner's call: DELISTING.**
"When did we start carrying this" is answerable from the ledger; "when did we decide to
stop" is an intention, and the ledger records events.
**1.6 was split into 1.6a / 1.6b / 1.6c on 2026-08-18** with the owner's approval,
before any of it was written — it was the last **L** in step 1. The nineteen tables
of ADR-035 §2.3 that step 1 owed are applied, the seed writes three months of two
shops through the real allocator, and **the §2.4 invariant is asserted in CI over
that seed** rather than only over a fixture.
**Both findings the seed turned up are now fixed.** The owner's instruction on
2026-08-19 was to fix them immediately rather than fold them into the RPC migration, and
`0010` (task 1.8, below) is that fix: the allocators take the moment an event happened
instead of the moment it was written, and purchase-price memory decides its prefill from
the data instead of from a uuid. **Every finding in this file is now closed**, step 1's
and step 2's alike.
**Every open decision in this file is closed again** — the purchase-side rounding direction 3.5 found was settled by the owner on 2026-08-26 and shipped the next day. Two
modelling choices made while building 1.3b, and three from 1.4, are listed below and
are the owner's to confirm or overturn. A fourth from 1.4 — who gets the purchase
price prefill — was **confirmed on 2026-08-18** and is closed. All five that remain
open are function bodies or a view definition, so revising any of them is a
`create or replace` in a new migration with no data to migrate — see the corrected
deadline under *Confirmed by the owner* below.

| Step | What | Status |
|------|------|--------|
| 0 | A Postgres you can actually run | **Done** — CI green |
| 1 | Migrations and seed script | **Done** |
| 2 | The three Insight queries — *the design gate* | **Done** — three of three, plus the timezone column 2.1 and 2.2 asked for and the spine fix 2.3 found |
| 3 | Test suites (pgTAP, Vitest) | **Done** — split into 3.1–3.7 on 2026-08-22, 3.6 and 3.7 split again on 2026-09-01; **all ten pieces closed 2026-09-02**. ⚠️ Three of §2.10's nine rows are owed by steps 4 and 4.5, named under *What step 3 does NOT ship* |
| 4 | RPCs — the write surface of §2.6 | **NEXT** — split into 4a–4f on 2026-09-03, one migration each, **`0015`–`0022`** (4d re-split 2026-09-04, 4e re-split the same day). `4a` — the receipt-completeness constraint — is first |
| 4.5 | The failure path | Not started — **`0023`**, and per ADR-035 §3 it carries `adjust_stock_delta` too |
| 5a | Client foundation — **hiring gate** | Not started |
| 5b | Vender and Home | Not started |
| 6 | Comprar, Desperdicio, Catálogo, Proveedores | Not started |
| 7 | Números | Not started |

Steps 0–4.5 are the whole system; 5–7 are windows onto it (ADR-035 §3).

---

## Step 0 — a Postgres you can actually run ✅

OrbStack + Supabase CLI 2.114.0. `supabase db reset` applies `0001` clean.
All six confirmations in [`supabase/README.md`](../supabase/README.md) pass,
including RLS isolation run under `set role authenticated` — the `postgres`
superuser bypasses RLS and would pass vacuously.

CI gate: [`.github/workflows/db.yml`](../.github/workflows/db.yml). **Per ADR-035
§9 the local pass is not the bar — the green CI run is.** Confirmed: the workflow has
been green on every migration since it merged, and as of 1.2 it also runs every file
in `supabase/tests/` after the reset, so it asserts behaviour and not just that the
DDL parses.

*Corrected 2026-08-17.* This paragraph, and the matching one in
[`supabase/README.md`](../supabase/README.md), claimed CI had never run. It had —
three times, green, starting the moment the workflow merged, because it triggers on
push to `main` and not only on pull requests. Nobody had looked at the Actions tab.
The lesson is the one ADR-035 §9 is about and it cuts both ways: a status line is
never evidence, and that includes a pessimistic one.

---

## Step 1 — migrations and seed script ✅

Nineteen tables total (ADR-035 §2.3). `0001` delivered six; thirteen remain, plus
a seed. Migration numbering is fixed in [`supabase/README.md`](../supabase/README.md).

| # | Task | Size | Done when |
|---|------|------|-----------|
| ~~1.1~~ | ~~`0002` catalog~~ — **done** 2026-08-16. `db reset` green; zero cross-workspace leakage on all five tables under `set role authenticated`; generic provider undeletable and undemotable; price overlap, cross-dimension units and normalized-name duplicates all rejected | M | ✅ |
| ~~1.2~~ | ~~`0003` transactions~~ — **done** 2026-08-17, [CI green on PR #1](https://github.com/bersermi/RetailerManagementTool/actions/runs/32002904624). 39 behavioural checks pass in `supabase/tests/0003_transactions.sql`, now wired into the CI gate. Reversal self-FK rejects a void across a store or a tenant, a self-reversal and a second void of the same document; `on conflict (id) do nothing` leaves the committed totals alone; documents are append-only even to the superuser; staff read no cost; `waste_reason` is a closed vocabulary | M | ✅ |
| ~~1.3a~~ | ~~`0004` inventory~~ — **done** 2026-08-17, [CI green on PR #2](https://github.com/bersermi/RetailerManagementTool/actions/runs/32043051234). 54 behavioural checks pass in `supabase/tests/0004_inventory.sql`, now in the CI gate; `0003`'s 39 still pass. The §2.4 invariant holds across a reversal and a deliberate oversale; `rebuild_batch_balance()` reproduces every row exactly from `stock_movement` alone, and the check is shown able to fail. Batches and movements are append-only to the superuser; a batch cannot be relocated; cost is manager-only on both while `batch_balance` — which carries none — is member-level | M | ✅ |
| ~~1.3b~~ | ~~`0005` allocation~~ — **done** 2026-08-17, [CI green on PR #3](https://github.com/bersermi/RetailerManagementTool/actions/runs/32097844689). 52 behavioural checks in `supabase/tests/0005_allocation.sql` and 9 more in `supabase/tests/0005_allocation_concurrency.sh` (⚠️ **retired 2026-09-02 by task 3.7b** — the same claim is now 7 tests in `supabase/vitest/test/allocation-race.test.ts`), both in the CI gate at the time; `0003`'s 39 and `0004`'s 54 still pass. FEFO order proven on all three keys; the candidate set never leaves the location; two concurrent allocations do not oversell one batch, shown against two real connections; a transfer carries cost and expiry forward, opens one destination lot per origin lot, and never moves a batch | M | ✅ |
| ~~1.4~~ | ~~`0008` purchase-price view~~ — **done** 2026-08-18, [CI green on PR #7](https://github.com/bersermi/RetailerManagementTool/actions/runs/32191899904). 44 behavioural checks in `supabase/tests/0008_provider_price_memory.sql`, now in the CI gate; `0003`'s 39, `0004`'s 54, `0005`'s 52 and the concurrency file's 9 still pass. A voided delivery stops prefilling and falls back to the delivery that still stands; a pair whose only delivery was voided has no row rather than a zero; no fallback across providers; `explain` confirms both indexes and `purchase_one_reversal_idx`, with no sequential scan | S | ✅ |
| ~~1.5~~ | ~~Seed skeleton~~ — **done** 2026-08-18. `supabase/seed.sql`: two merchants, three stores, **316 variants** for A and 25 for B, 390 sell prices, six people, eight providers. 12 assertions run inside the seed at reset time, and `supabase db reset` **exits non-zero** when one raises — confirmed by falsifying three of them | M | ✅ |
| ~~1.6a~~ | ~~Seed the deliveries~~ — **done** 2026-08-18. `supabase/seeds/10_deliveries.sql`: **110 deliveries, 1 025 lines, 1 025 batches, 1 025 receipt movements** over 88 days; 330 remembered prices; merchant B holds 16.7% of lines. 24 assertions, six of them falsified to prove they discriminate. The seed is **byte-identical across resets**, verified over three | M | ✅ |
| ~~1.6b~~ | ~~Seed the consumption~~ — **done** 2026-08-18. `supabase/seeds/20_consumption.sql`: **904 sales / 2 251 lines, 65 waste documents / 134 lines, 5 transfer shipments, 3 473 movements.** Invariant clean; FEFO obeyed, asserted and falsified; two deliberate oversales exercise shortfall branches one and three. Reproducible to the peso over three resets | M | ✅ |
| ~~1.6c~~ | ~~Seed the reversals~~ — **done** 2026-08-19, [CI green on PR #14](https://github.com/bersermi/RetailerManagementTool/actions/runs/32298215918). `supabase/seeds/30_reversals.sql`: **3 voided deliveries / 23 lines, 3 voided tickets / 12 lines, 1 voided write-off / 3 lines, 41 compensating movements.** Invariant clean across every void; 16 (provider, variant) pairs fall back to an older delivery and 1 disappears entirely. 33 assertions, seven of them falsified. Reproducible over three resets in every seeded table, and — after `0010`, task 1.8 — in `provider_price_memory` too. `0003`'s 39, `0004`'s 54, `0005`'s 52, the concurrency file's 9 and `0008`'s 44 all still pass, read from the job log | S | ✅ |
| ~~1.8~~ | ~~`0010` — the two defects the seed found~~ — **done** 2026-08-19, [CI green on PR #15](https://github.com/bersermi/RetailerManagementTool/actions/runs/32314886842), taken out of order at the owner's instruction because both were `create or replace` fixes with no data to migrate and both get dearer once a pilot exists. `allocate_fefo()` takes a **required** `p_occurred_at`; `allocate_transfer()` stamps its destination lot with the moment it already had; `provider_price_memory` breaks its tie on price, tax rate and display unit. Four falsifications. Suites now 39 / 54 / **55** / 9 / **46** | S | ✅ |
| ~~1.7~~ | ~~Assert the invariant in CI~~ — **done** 2026-08-19, [CI green on PR #16](https://github.com/bersermi/RetailerManagementTool/actions/runs/32316689915). `supabase/checks/seed_invariant.sql`, run from its own step in `db.yml` **between the reset and the suite loop**, because `_cleanup.sql` would otherwise have emptied the seed first. **18 checks**: eight are a pre-flight that refuses to run the other ten until it can see a populated two-tenant ledger; then the invariant over 1 041 batches and 3 514 movements, the rebuild reproducing every row from `stock_movement` alone at that scale, and `rebuild_batch_balance(workspace)` shown to respect its argument — a claim no single-tenant fixture could make. It corrupts the projection and repairs it on **every run**, so green is never green from a check that cannot go red. Four falsifications. Read from the job log: *all 18 seed invariant checks passed*, *1 seed invariant file(s) ran*, and `0003`'s 39, `0004`'s 54, `0005`'s 55, the concurrency file's 9 and `0008`'s 46 all still pass | S | ✅ |

Order is forced by foreign keys: 1.1 → 1.2 → 1.3a → 1.3b; 1.4 after 1.2; 1.6 after
1.3b + 1.5, and within it 1.6a → 1.6b → 1.6c, because you cannot sell stock that was
never delivered or void a document that does not exist. **Nothing in step 1 is
outstanding.**

**1.3 was split on 2026-08-17.** It was the one **L** task in the schema half of
step 1, and it grew a second time when the allocator moved into it (decision below).
The split is by migration file, so each half is separately reviewable and separately
verified — which is the same reason every migration header in this repo starts by
narrowing its own scope.

### The 1.5 seed shape, fixed by the owner 2026-08-18

Asked whether the seed needed a realistic provider spread, the owner's answer was no:
the minimum that exercises the rules, not a simulation of a real shop.

- **Two merchants — two workspaces.** Merchant A has **two locations**, merchant B has
  one. This is the owner's call and it is the right one for a reason worth writing
  down: *a single-tenant seed makes every isolation check vacuous.* A query that
  forgot its `workspace_id` predicate returns the correct answer when there is only
  one workspace, and step 2's queries are exactly where that would hide. 1.4 hit the
  smaller version of the same problem — its performance fixture was single-tenant, so
  `workspace_id` selected every row and the planner's choices could not be trusted as
  evidence.
- **Three or four named providers per merchant, plus the generic one** that
  `onboard_workspace()` already creates. **No long tail.** The generic provider is not
  a dumping ground; it is there because "I bought this at the market this morning" has
  to be a two-tap purchase (§2.3), and the seed should show it being used that way a
  few times, not hundreds.
- **~300 products in merchant A**, which is the catalog the design gate at step 2 is
  judged against. **Merchant B stays small** — enough catalog and ledger to prove
  isolation is real, not a second full dataset. B is a control, not a customer.
- **Mixed on purpose**, because these are what break: units across dimensions
  (`pza`, `kg`/`g`, `l`/`ml`), tax at both 0 and 0.16, `pack_size > 1` for packs, and
  weighed items whose base unit is `g` or `ml` while they are bought by `kg` or `l`.
- **The seed inserts its own `auth.users` rows.** Every document carries
  `created_by uuid not null references auth.users (id)`, so the seed cannot write a
  purchase without a user to attribute it to.
- **Workspaces are created through `onboard_workspace()`**, not by hand — it is the
  tested path and it is what seeds the settings row and the generic provider. The
  second location of merchant A is a plain insert.

**An input to 1.6, recorded here so it is not rediscovered:** if merchant B holds only
a token amount of the ledger, `workspace_id` is still effectively non-selective on
`purchase_line` and plan evidence stays weak. B should carry a real minority share of
the transactions — not a matching half, but not ten rows either.

### 1.6 was split on 2026-08-18, before it was written

It was the one **L** left in step 1, and 1.3 had already shown what an L costs when it
is discovered mid-flight. The split is by *what writes what*, so each piece is
separately reviewable and separately verifiable against the §2.4 invariant:

| | Writes | Cannot be checked until it exists |
|---|---|---|
| **1.6a** | `purchase`, `purchase_line`, `stock_batch`, positive movements | Nothing consumes stock yet, so the invariant is trivially true — the real check is provenance: every batch traces to a line, every line to a document |
| **1.6b** | `sale`, `waste`, transfers, and the negative movements | The invariant becomes load-bearing here, and FEFO order becomes observable |
| **1.6c** | Reversal documents and compensating movements | The invariant across a void, and `provider_price_memory` falling back |

**Merchant B carries roughly 20% of the ledger.** Proposed and approved 2026-08-18.
Enough that `workspace_id` is a genuinely selective predicate on `purchase_line` —
which is exactly what 1.4's performance evidence lacked, its fixture being
single-tenant — without doubling how long a reset takes.

**Each piece gets its own seed file.** `supabase/seed.sql` became
`supabase/seeds/00_skeleton.sql` in 1.6a, and `config.toml` now lists the files
explicitly rather than globbing, so the order is stated and not inferred. Three more
sections appended to one file would have made a 1 700-line seed that no one reviews;
the same instinct that keeps migrations narrow applies here, and unlike a migration a
seed file is not append-only, so this costs nothing to undo.

### Fixed 2026-08-19 in `0010` — both of the seed's findings, on the owner's instruction

Asked whether the two defects should be fixed now or wait for the RPC migration, the
owner said fix them now. Both were a `create or replace` with no data to migrate today
and a fix-forward against live data later, so this is the cheap end of that trade.

**It takes the next free number, not `0006`.** `0006`, `0007` and `0009` are reserved
and unwritten; renumbering planned work to make a correction look tidy is the more
confusing choice. ⚠️ **`0006` will therefore apply BEFORE `0010` on a fresh reset and
must still be written against the six-argument `allocate_fefo`** — plpgsql resolves the
functions a body calls at call time, so `record_sale` written against the old signature
applies clean and fails at the first till.

- **`allocate_fefo()` takes a REQUIRED `p_occurred_at`, and required is the decision.**
  A default of `now()` would have kept every existing call site compiling and would have
  reproduced the defect the first time a caller held a real `occurred_at` and did not
  think to pass it — and that caller is `record_sale`, which is the next thing written.
  The cost is that all twenty call sites moved in one commit, which is the point rather
  than the price. Adding an argument is a drop and a create, not a replace; no role held
  execute, and the revoke is re-issued.
- **Of two prices paid the same morning, the view now offers the HIGHER.** That is the
  one key in `0010` expressing a preference rather than an order. A prefill is a number
  an operator accepts without reading; quoting high overstates cost and understates
  margin, which is the direction someone notices. Quoting low flatters the margin report.
  Tax rate and display unit follow, and express nothing — they are there so that
  everything the view hands back is a function of the data.
- **The id keys stay.** `distinct on` needs a total order, and two deliveries can agree
  on every column above. What is left arbitrary is which *document* an identical price is
  attributed to, and those columns are informational.

**⚠️ THE FIX MADE TWO DISHONEST DATES IN `20_consumption.sql` VISIBLE, AND BOTH ARE
CORRECTED.** While the allocators stamped `now()`, any lot they opened sorted after every
movement in the seed, so the arrival test skipped it and the question never arose. Given
real dates, the seed's FEFO and running-balance assertions both failed — correctly:

- the **transfers** were dated fortnightly across the window but *written* after every
  sale, so a destination lot dated 10 June sat in front of lots the Mercado had sold in
  June. That was a FEFO violation in the data and it had been there since 1.6b. They are
  now dated the five days after the last sale, which is when they were actually written;
- the **oversales** were dated 14 August but written after the transfers, so the overdraw
  they exist to cause landed on a *transfer* instead — replayed in date order the
  oversale left the lot at 1 and the transfer took it to −2, on a movement nobody had
  marked as designed.

The rule underneath both is worth stating once: **every section of `20_consumption.sql`
picks its quantities from the balances as they stand when it runs, so date order must
agree with write order.** The headline counts are unchanged — 904 sales / 2 251 lines,
65 waste / 134 lines, 5 shipments, 3 473 movements — because only dates moved.

**Falsified, four ways, each caught by the check written for it:** reverting the
destination lot to `now()` (*"12 lot(s) of any origin were received after a movement
against them"*), reverting the shortfall lot (*"the lot is received AT THE MOMENT GIVEN"*
in the `0005` suite), and deleting the price key from the view — which trips `0008`'s
check 23 (*"the higher PRICE, not the higher document id"*) and the seed's own
*"6 pair(s) where the view's prefill is not the one the data keys imply"*.

That last one is worth reading closely. **The seed's first version of that assertion was
green with the fix reverted**, because it asked whether the *data* settled every tie and
deleting a sort key does not change the data. It now also compares the view's answer
against one derived from the data keys alone. An assertion about a view that never reads
the view is the shape this repo keeps finding.

### ⚠️ Found in 1.6c — `provider_price_memory` breaks its tie on a uuid — FIXED in `0010`

`0008` orders by `occurred_at desc, recorded_at desc, p.id desc, pl.id desc`. The two
tail keys were added for determinism and they do not deliver it, because **ids are not
stable data**:

- purchase price memory is **workspace-wide**, and 1.6a delivers to both of merchant A's
  stores from one provider on the same morning at the same hour, with `recorded_at`
  equal to `occurred_at`;
- so two documents tie on every key that is not an id, and `gen_random_uuid()` picks the
  winner. **14 (provider, variant) pairs are decided this way.**

Three resets agree on every count and every total in all four seed files and **disagree
on the sum of the prefills**. That is how it was found; nothing before 1.6c had measured
the view across resets, and 1.4's fixture was single-tenant and single-store.

**It is not a correctness bug.** Both tied rows are prices the shop genuinely paid that
morning, so no prefill is ever *wrong*. It is arbitrary — and arbitrary in production
too, where the ids come from the client at cart open, and where a chain with two branches
on one delivery round produces this tie every week.

**Not patched, for the reason 1.6b did not patch `received_at`**: the seed must not work
around the object it exists to exercise, and `0008` is applied and therefore closed. The
seed **bounds** it instead — every tie must be between two *stores* of one workspace, and
there must be no more than thirty. A tie inside one store would be a worse fact: one
delivery recorded twice, with the view choosing between the copies by uuid.

**The cheap fix, if the owner wants one:** put `pl.unit_price_net_per_base desc` ahead of
the id keys in a `create or replace`. It makes the view a pure function of the data, and
it offers the higher of two prices paid the same morning, which is the safe direction to
be arbitrary in when the number is a prefill an operator will accept without reading.
**Owner's call**, and cheap now — a view with no data to migrate.

### Settled in 1.7, and binding on step 2 and on the nightly production check

- **The seed's own assertions and this check are different questions, and both are
  kept.** Each seed file asks *did I write what I meant to*, raises inside the reset
  and needs no workflow wiring at all (settled in 1.5). `supabase/checks/` asks *does
  the projection agree with the ledger across all four files at once* — after the last
  one has run, from outside the seed, where it also notices a seed file that stopped
  being listed in `config.toml` and took its assertions with it.
- **A NEW DIRECTORY, `supabase/checks/`, AND ITS CONTRACT IS THE ORDER IT RUNS IN.**
  Files here run against the **seeded** database, in their own `db.yml` step between
  `supabase db reset` and the suite loop. `supabase/tests/` is the opposite: every
  suite there is preceded by `_cleanup.sql`, owns an empty database and writes its own
  fixture. The two could not share a directory, and `tests/_seed_invariant.sql` was
  rejected because `_` already means *harness, not a suite* and this is neither.
- **⚠️ THE PRE-FLIGHT IS THE LOAD-BEARING HALF, AND IT IS FATAL ON ITS OWN.** Eight of
  the eighteen checks assert only that there is a ledger worth checking — both tenants,
  three stores, over a thousand batches, negative movements as well as positive, every
  reason the invariant leans on, paired transfers, compensating movements. If any fails
  the file **raises and the remaining ten never run**. `batch_balance_violations()` over
  an empty database returns zero rows and passes, which is what 1.5 warned this task
  would walk into; without the pre-flight the day someone moves this file into `tests/`
  is a day CI goes green while checking nothing.
- **The falsification runs on every CI run, not once by hand.** The file corrupts the
  projection two ways — a wrong number and a deleted row — confirms both are named,
  then rebuilds and confirms the repair. A check that has never been seen to fail is a
  claim; this one demonstrates its own teeth every time, and it costs about a second.
- **`rebuild_batch_balance(p_workspace_id)` is verified to respect its argument, and
  that was previously unverifiable.** `0004`'s fixture holds one workspace, so an
  implementation that ignored the parameter passed it. Over the seed the check rebuilds
  the smaller tenant and asserts every row of the larger is untouched **including
  `updated_at`**. This matters because the ADR's nightly production re-check is
  per-tenant: a rebuild that ignored its argument would delete every other tenant's
  projection nightly and rebuild only one. Falsified with exactly that implementation —
  two checks went red.
- **Floors and shapes, not the seed's row counts.** The pre-flight asserts *at least*
  500 batches and 2 000 movements, not 1 041 and 3 514. The seed files already pin their
  exact totals; restating them here would mean editing a CI-adjacent file every time a
  truck changes, and the question this file asks is "is there enough here to falsify the
  invariant", not "is the seed unchanged".
- **Containment, not equality, on the movement reasons — and the first draft got this
  wrong.** It asserted `count(distinct reason) = 5` and went red during falsification
  the moment an `adjustment` movement appeared. `adjustment` is a legal sixth reason
  that `adjust_stock` writes in `0006` and that the seed will one day carry. The claim
  worth making is that the five the invariant leans on are all present.
- **⚠️ THIS FILE STILL DOES NOT ASSERT THAT NO LOT IS NEGATIVE**, per 1.6c. It asserts
  the opposite — that the seven designed negatives **survive**. Falsified by topping
  every negative lot back up with a legitimate `adjustment` movement: the ledger stayed
  perfectly consistent, `batch_balance_violations()` stayed at **0**, and only that one
  check went red. Which is the point — the invariant cannot see the seed losing the
  cases that make its shortfall branches real, and something has to.

### Settled in 1.6c, and binding on 1.7 and on `0006`

- **The compensating movement belongs to the REVERSAL document, not the original.**
  `sale_id` on it is the void's id; `reversal_of_movement_id` points at the movement it
  cancels. This was not 1.6c's decision — `0004`'s suite fixed it before any of it was
  seeded — but 1.6c is the first thing that depends on it at scale, and
  `void_transaction` in `0006` must do the same. Falsifying it in the seed was caught,
  though **by a neighbouring assertion** rather than the one written for it: a
  compensator carrying the original's id becomes itself a movement of a voided document
  with nothing compensating it.
- **One voided delivery had already been sold through, deliberately.** A reversal against
  an intact lot can only return a balance to where it started, which exercises the
  projection at its easiest point. This one takes back units that are gone and drives
  **five lots negative** — legal, recorded and not enforced (§2.6). The delivery is named
  in the seed's own scaffolding so the running-balance assertion can tell that designed
  deficit from an accidental one, exactly as 1.6b named its oversales.
- **⚠️ SEVEN LOTS IN THE SEED ARE LEGITIMATELY NEGATIVE — two from 1.6b's oversales and
  five from the voided delivery above. 1.7 must not assert that no balance is below
  zero.** The invariant is `batch_balance_violations()`, which asks whether the
  projection agrees with the movements, and it is clean. "No lot is negative" is a
  different claim, it is false, and it is false on purpose.
- **Below zero, not merely lower.** The first draft of the running-balance check compared
  each lot's low-water mark before and after the voids and raised on all eighteen lots of
  the two intact deliveries. Voiding an intact delivery *does* lower a lot's minimum,
  from everything it received down to nothing, and that is the correct outcome. The claim
  worth asserting is about the sign.
- **The void is filed by whoever filed the original.** Cashiers void their own tickets
  minutes later, inside `void_window_minutes`, which is asserted; deliveries and
  write-offs stay with the manager or owner who recorded them, because `purchase_line`
  and `waste_line` carry cost and are manager-and-above.
- **Every pick is a rule over the data, and `payload_hash` is the tiebreak.** It is an
  md5 over a name-derived key — the one stable identifier a document has once ids are
  off the table. No date and no id appears in any selection in the file.

### ⚠️ Found in 1.6b — `allocate_transfer()` stamps `received_at` with `now()` — FIXED in `0010`

**Neither allocator sets `received_at` on a lot it opens**, so the column default
`now()` applies:

- `allocate_transfer()` takes `p_occurred_at`, uses it for all four movements, and
  **does not pass it to the destination lot**;
- `allocate_fefo()` shortfall branch three opens its adjustment lot the same way.

At a till this is invisible and correct — `occurred_at` *is* `now()`. It is wrong in
exactly two places:

1. **Backdated history**, which is why the seed found it. The transfer destination
   lots and the one adjustment lot are stamped the day of the reset while their own
   movements are dated weeks earlier.
2. **`recorded_offline`, which is a real production path.** `occurred_at` is accepted
   from the client and clamped to `[now() − 72h, now()]` (`supabase/README.md`). So a
   transfer recorded up to three days late opens a destination lot that sorts as
   *received today* — up to 72 hours later than the truth. `received_at` is the second
   FEFO key, so this reorders lots received within days of each other, which is
   precisely the perishable case FEFO exists for.

**Not patched in 1.6b, deliberately**: the seed must not work around a function it
exists to exercise, and `0005` is applied and therefore closed. The seed instead
**bounded** the exception: only allocator-opened lots could be affected, and never more
than forty.

**Fixed 2026-08-19 in `0010`**, on the owner's instruction — see *Fixed 2026-08-19*
above. The bound is now an absolute check: no lot of any origin may be received after a
movement against it. Fixing it is also what exposed the two dishonest dates in
`20_consumption.sql`, which the bound had been hiding along with the defect.

### Settled in 1.6b, and binding on 1.6c

- **Backdated history cannot spend stock that had not arrived, and nothing enforces
  that but the seed.** `batch_balance` has no notion of time, so by the time
  consumption runs every lot from all thirteen weeks is on the shelf and a May sale
  could eat an August lot — `allocate_fefo()` would hand it over, correctly, because
  it allocates from what is open. Each withdrawal is therefore capped at the FEFO
  prefix that had actually arrived, **stopping at the first future lot rather than
  skipping past it** — skipping would reach a lot the shop could not have touched,
  because FEFO order is not receipt order. Asserted, and falsified: removing the cap
  produced 635 movements consuming lots received after them.
- **FEFO obedience is asserted, and that assertion is what makes the
  one-allocator decision enforceable.** For every withdrawal, no earlier-sorting lot
  that had already arrived is still open at the end. Replacing `allocate_fefo()` with
  a hand-written newest-lot-first pick trips it **908 times**. Without this check,
  "the seed and `record_sale` must not diverge" is a comment rather than a rule.
- **A running-balance replay catches what the invariant cannot.** A lot that dips
  negative mid-history and recovers is invisible to `batch_balance_violations()`,
  which only sees the end state. The seed replays every batch's movements in order.
- **Every pick that ends in `LIMIT` needs a total order, and the tiebreak must be a
  NAME.** Two resets produced identical row counts and different revenue, because the
  oversale chose "the smallest balance" and ties resolved arbitrarily. Ids are
  regenerated each reset, so they can never be the tiebreak. Three resets now agree to
  the peso.
- **Cashiers sell; managers and owners receive deliveries and write off waste.**
  `waste_line` carries cost and is manager-and-above, so a cashier authoring one
  describes a person who cannot read back what they wrote. Asserted both ways.
- **The two allocators divide the work differently, and 1.6c must not confuse them.**
  `allocate_fefo()` decides and returns the split — *the caller writes the movements*.
  `allocate_transfer()` does the entire paired write — *the caller writes nothing*.
- **Foreign keys force document → lines → movements.** `stock_movement.waste_id`
  points at a document that must already exist, but the header's totals come from the
  lines and the lines' cost comes from the allocation. So the allocation is staged and
  replayed as movements after the header lands. `record_waste` in 0006 needs the same
  shape.

### Settled in 1.6a, and binding on 1.6b and 1.6c

- **⚠️ THE SEED MUST BE DETERMINISTIC, AND IT WAS NOT AT FIRST.** The line generator
  originally hashed `purchase_id` and `variant_id` to decide what each truck carried.
  Those are `gen_random_uuid()`, so **two consecutive resets produced 1 071 and 1 064
  batches** — caught only because a falsification run printed both numbers side by
  side. Every hash now keys off a `doc_key` built from provider name, location name
  and week, plus the product *name*. Three resets now produce identical counts,
  totals and quantities to the peso. **1.6b and 1.6c must do the same**: never hash a
  uuid. A seed that differs between runs makes "it failed in CI but not locally"
  unanswerable and lets an assertion threshold flicker into a false red.
- **A green `batch_balance_violations()` means almost nothing in 1.6a**, and the file
  says so. Nothing has been withdrawn, so every balance is just its own receipt and
  the check would pass with the allocator absent. **It becomes load-bearing in 1.6b**,
  which is the first point where the invariant can actually be violated.
- **The receipt is a movement, not the batch row.** One positive `purchase` movement
  per lot, asserted one-for-one against `stock_batch`. Falsified both ways — omitting
  it (*"1025 batches but 0 receipt movements"*) and writing it twice (*"1025 batches
  but 2050"*). `record_purchase` in 0006 must do exactly this.
- **Headers cannot be patched after the fact**, so totals must be right in the
  INSERT. `purchase` carries the append-only trigger — there is no "insert the header,
  add the lines, then update the totals". The lines are staged first and the header is
  built from their sums. **0006's `record_purchase` faces the identical constraint**,
  and this is the shape it needs.
- **A lineless delivery never becomes a document**, because the header insert
  inner-joins to the line totals. No DELETE is needed and none is written; an explicit
  one would be dead code dressed as a safeguard.
- **Providers do not carry the whole catalog, on purpose.** Each named provider is
  assigned whole families, one of merchant B's three providers **never delivers at
  all**, and the generic provider takes a thin slice of produce that overlaps another
  provider. Without those gaps every `(provider, variant)` pair would have a price and
  "no fallback across providers" — the rule 1.4 exists for — would never be exercised
  by the seed. Asserted: some provider has no history, and some variant is bought from
  two providers at different prices.
- **Merchant B's line density is higher than A's, and that is deliberate.** B's
  catalog is 25 products against A's 316, so matching A's density left B at **3.5%**
  of the ledger rather than the ~20% the owner fixed. It is also the more honest
  shape: a corner shop restocks most of its range weekly. B now holds 16.7%.
- **Cost is derived from the sell price**, per family margin, with a ±5% drift per
  delivery. The drift is what gives the price memory something to remember other than
  one constant — without it "what did we last pay" and "what do we always pay" are the
  same question, and step 7 exists to separate them.

### Settled in 1.5, and binding on 1.6

- **The seed asserts itself, and `supabase db reset` fails when it raises.** Confirmed
  the hard way rather than assumed: an assertion was deliberately falsified and the
  reset exited **1** with the assertion's own message, `LegacyMigrationSeedError`. So
  the twelve checks at the end of `seed.sql` are a CI gate on every push, with no
  workflow wiring at all. Two more were falsified to be sure they discriminate — a
  family-name typo (caught: *"staged 341 catalog rows but 330 variants exist"*, because
  the insert is an inner join and a mismatch drops products silently) and a ledger row
  written into 1.5 (caught).
- **⚠️ SEED DATA DOES NOT SURVIVE INTO ANY TEST FILE, and 1.7 has to plan around it.**
  `supabase/tests/_cleanup.sql` runs before *every* suite and `TRUNCATE`s each table
  but `unit` — so by the time the first suite starts, the seed is gone. That is correct
  and deliberate (suites assert absolute counts and must own the database), but it
  means **1.7 cannot be a file in `supabase/tests/`**. The invariant check over seed
  data has to run in `.github/workflows/db.yml` in its own step, between
  `supabase db reset` and the suite loop. Discovered while building 1.5; it would
  otherwise have been found by writing 1.7 and watching it assert over an empty
  database — which passes.
- **The seed writes no ledger, and an assertion enforces it.** Purchases, sales, waste,
  batches and movements are 1.6's, allocated through `allocate_fefo()`. The guard is
  there because the moment the seed writes a movement by hand, step 2 is judged on data
  the real system never produces — which is the whole reason the allocator moved into
  `0005`.
- **Ids are looked up by name, not fixed.** `onboard_workspace()` generates the
  workspace id and the seed uses the function rather than hand-inserting, because it is
  the tested path and it is what writes the settings row and the generic provider.
  `seed.sql` is plain SQL with no psql meta-commands — the CLI executes it directly and
  `\gset` is not available — so ids cross statements through a scaffolding table that
  is **dropped at the end**. 1.6 should look them up by name the same way rather than
  depend on a table no migration created.
- **Merchant B's names deliberately collide with merchant A's.** `Arroz superextra
  1 kg` exists in both. `product_variant_name_unique` is per workspace, so this is
  legal — and it means a query that lost its `workspace_id` predicate finds a plausible
  twin instead of nothing, which is the failure that actually needs catching.
- **Sucursal Mercado charges 8% more for produce.** 46 location price overrides exist
  so that "the price at this store" and "the workspace price" are *different numbers*
  somewhere. If they agreed everywhere, a query that ignored `location_id` would return
  the right answer and step 2 would certify it.
- **Three prices are superseded**, with `effective_to` set, so the `[)` range and the
  overlap exclusion constraint have something to be right about.

### Traps in step 1

- **1.3a and 1.3b are the biggest piece.** `stock_movement` is the system of record;
  `batch_balance` is a disposable projection rebuildable from it. The transfer
  movement shape is fixed before the screen ships at step 6 — getting it wrong is the
  same class of error as omitting `location_id` (ADR-035 §2.4). **Settled while
  building 1.3a:** the *shape* went into `0004` and the *mechanics* stay in `0005`.
  ADR-035 §2.4 fixes the shape "in migration `0004`", meaning the ledger migration,
  which after the renumbering is the inventory one; the alternative was an `ALTER` in
  `0005` adding columns to a table `0004` had just defined, leaving `0004` unable to
  represent one of the four things the ledger does. So `transfer_in`/`transfer_out`,
  `transfer_group_id` and `stock_batch.source_batch_id` exist and are constrained
  now; `allocate_fefo()` and the paired write are still 1.3b's.
- **1.4 was small and easy to get wrong, and it was got wrong once.** The view must
  exclude **both** reversal documents **and** the documents they reverse. It does —
  but the first draft of the *test* could not tell those two apart, and deleting one
  of them from the view left the whole suite green. See *Settled in 1.4* below.
- **No price fallback across providers.** A price learned from one provider never
  prefills another's. That is a fact about a relationship, not about a product.

### Settled in 1.2, and binding on what comes after

- **A document is reversed at most once**, by a partial unique index on
  `reversal_of`. `void_transaction` (0006) must therefore treat a double tap as an
  idempotent no-op and not as a second compensating document.
- **Documents are append-only, enforced by trigger** on all six tables, not only by
  the missing grant. Every RPC in 0006 is `security definer` and so is outside RLS
  and grants; the trigger is what stops one of them "correcting" a committed sale.
  If an RPC ever needs to update a document, that is a design error to raise, not a
  trigger to drop.
- **`purchase`, `purchase_line` and `waste_line` are manager-only reads**, per
  ADR-035 §2.7. The staff-facing `security_invoker` views without the cost columns
  are owed by whichever screen needs them first — Comprar and Desperdicio, step 6.
- **`tax_rate` is snapshotted on every line.** Reports never re-derive tax from the
  variant's current rate, so correcting a product does not restate last quarter.
- **The purchase-price index in ADR-035 §2.3 is not creatable as written.**
  `(workspace_id, provider_id, variant_id, occurred_at desc)` spans two tables —
  `provider_id` and `occurred_at` are on the header, `variant_id` is on the line.
  `0003` ships the two-index equivalent instead; **1.4 must confirm it against a real
  `explain`** rather than assume it. Denormalising the header columns onto the line
  was rejected: it buys an index and sells the guarantee that they agree.

### Confirmed by the owner, 2026-08-17, at the 1.3a merge

Three modelling choices were put to the owner in plain language alongside the merge,
because CI can prove the schema is internally consistent and cannot prove it matches
the shop. No objection or change was requested on any of them.

*Deadline corrected 2026-08-18.* This paragraph said they were cheap to revise "until
1.6 writes seed data against them, and expensive afterwards". That is wrong, and it
was repeated into the 1.3b notes before anyone checked it. **Seed data is regenerated
by `supabase db reset` and is never precious.** What is actually expensive is fixed by
two other things: a change to **schema shape** — a column, a constraint, an enum value
already in use — because migrations are append-only; and **real pilot data**, because
`stock_movement` is immutable by trigger, so a movement written under a wrong rule can
be compensated but never restated. The first applies to the waste vocabulary below.
Neither applies to a function body. Real pilot data arrives when Vender ships at step
5b, not at 1.6.

- **The waste vocabulary** — the five `waste_reason` values below. Adequate as shipped.
- **Stock may go negative.** A sale the system thinks it cannot cover is *recorded*,
  not blocked. v1 records stock and does not enforce it (ADR-035 §2.6).
- **Cost is manager-and-above; quantity is everyone.** A cashier sees what is on the
  shelf and never what it cost.

### Settled in 1.3a, and binding on what comes after

- **A batch never changes, and neither does a movement.** Both carry the same
  append-only trigger the documents carry, so `0005`–`0007` cannot "correct" a lot
  from inside a `security definer` function. `stock_batch` has no
  remaining-quantity column at all — what is left lives only in `batch_balance`.
- **`batch_balance` is opened at zero when the batch is created,** and the receipt
  itself is a movement. `record_purchase` must therefore write both the batch and a
  positive movement; writing only the batch leaves stock at zero, and seeding the
  balance with `qty_received_base` would double the delivery.
  ⚠️ **3.4 PROVED THIS RULE IS UNGUARDED, and that §2.4 CANNOT GUARD IT** (2026-08-25).
  Deleting the receipt movement leaves the lot at zero and its movement sum at zero, so
  the ledger invariant agrees with itself and stays green over all 64 assertions — the
  shop received nothing and nothing says so. §2.4 sees a movement that was never
  *projected*, never one that was never *made*. **The enforcement is owed by `0006`**
  and is specified under *What step 3 does NOT ship* below. Settled by the owner
  2026-08-26: it is a constraint in `0006`, not a step-3 suite and not a task of its
  own.
- **A reversal movement keeps the reason it cancels** and sets
  `reversal_of_movement_id`; there is no `'reversal'` value in `movement_reason`.
  Otherwise every report that asks "how much did we sell" has to remember to union
  two reasons. The compensating movement is scoped to the **same batch** by the FK,
  and a movement can be reversed at most once — the movement-level analogue of the
  document rule from 1.2, and needed separately because `adjust_stock_delta` and
  `replay_failed_write` write movements without writing documents.
- **A negative `remaining_base` is legal and must stay legal.** v1 records stock and
  does not enforce it (ADR-035 §2.6). A `>= 0` constraint would turn a permitted
  oversale into an exception at the counter, in front of a customer.
- **`batch_balance_violations()` and `rebuild_batch_balance()` are the §2.4 invariant
  in executable form.** No role holds execute; they are for CI, for the nightly
  production check, and for an operator who has decided to throw the projection away.
  1.7 wires the first over seed data.
- **The FEFO ordering is servable from one index.** `batch_balance` copies
  `expiry_date` and `received_at` from the batch, and
  `(location_id, variant_id, expiry_date, received_at) where remaining_base > 0` is
  partial on the open lots. 1.3b's allocator should not need to join `stock_batch`.

### Settled in 1.3b, and binding on what comes after

- **The shortfall has to name a batch, so the allocator decides which one.**
  `stock_movement.batch_id` is not nullable and v1 records an oversale rather than
  raising at the counter (§2.6), so `allocate_fefo()` answers in three branches: the
  lot FEFO ran out on; failing that the most recently received lot at that store,
  open or not, at the cost the shop actually paid; failing that — a product never
  stocked there — **a new adjustment lot at zero cost**. Zero rather than a borrowed
  estimate, because 100% margin on those units is visibly wrong and gets asked
  about, where a plausible invented cost is invisibly wrong and is what §2.9 would
  then be built on. `adjust_stock` is how an operator resolves it. Raised with the
  owner 2026-08-18; not critical, and revisable by `create or replace` until real
  pilot data exists at 5b, since movements are immutable once written.
- **`batch_id` is a third FEFO sort key**, after `expiry_date` and `received_at`.
  §2.4 names only the first two, and they are not enough to be deterministic: two
  lines of one delivery share a `received_at` because `now()` is fixed for the whole
  transaction, and they can share an expiry. Without a final key the seed and
  `record_sale` could allocate the same request differently, which is the one
  divergence `0005` exists to prevent. It costs an incremental sort within ties.
  **Owner's call to confirm.**
- **`allocate_fefo()` takes the locks and the caller holds them.** The row locks on
  `batch_balance` last until the *caller's* transaction ends, so calling the
  allocator, committing, and writing the movements afterwards is the one way to use
  it wrongly. Branch three also *writes* a lot, so a speculative call is not free.
- **Neither function validates `my_locations()`, deliberately.** They are ledger
  primitives with no execute grant for any role; the wall is `0006`'s, as §2.6
  requires, and a reviewer looking for the location check in `0005` is looking in
  the right place for the wrong file. What `0005` does guarantee is structural: a
  location outside the named workspace and a transfer to its own origin are refused.
- **A transfer carries cost and expiry forward but not `received_at`.** §2.4 names
  cost and expiry only; expiry is the FEFO sort key and store B genuinely received
  the goods today. `provider_id` is null on a transfer lot, which is the documented
  meaning of that column.
- **The CI gate now runs `.sh` test files as well as `.sql`.** "Two concurrent
  allocations cannot oversell one batch" cannot be asserted from one connection, and
  a single-session test of the locking clause would pass just as green with it
  deleted — the same vacuous pass `supabase/README.md` warns about for RLS run as
  superuser. This was confirmed the hard way: the first draft of the concurrency
  test asserted that the second session *blocks*, and it passed with the lock
  removed, because the projection trigger's `on conflict do update` blocks the
  second writer by itself. What discriminates is **what session two allocated after
  it waited**, and that is what the file asserts now.

### Confirmed by the owner, 2026-08-18 — the catalog is the merchant's

Stated at the 1.4 merge and checked against the schema the same day:

> The catalog is centralized to the merchant, not to each provider. If a merchant
> ever buys a *lata de frijoles*, that family + variant is enabled in the merchant's
> catalog, and he can then purchase it from any provider — but only the provider he
> has actually bought it from has a price history, and therefore a price to display.

**This is what is built**, verified rather than assumed: `product_family` and
`product_variant` carry no `provider_id` and no provider FK of any kind. The column
exists only on `purchase` (which provider the delivery came from), on `stock_batch`
(which provider that lot came from, null on a transfer lot) and on the derived
`provider_price_memory`. Nothing in the catalog is scoped to a provider, and nothing
has to be "enabled per provider" before it can be bought.

**One part of the same sentence is NOT built, and it is not a defect.** The merchant
also wants to see *"the price history at which he has purchased the product, globally
or per provider"*. `provider_price_memory` answers neither: it is the **last** price,
not a series, and it is strictly per provider with no global roll-up. That is correct
for what it is for — prefilling a delivery — and the missing piece is **reporting**,
which lands in `0009` and Números (step 7).

Nothing needs to change in the schema for it. Every historical price is already in
`purchase_line`, immutably, with `tax_rate` snapshotted per line — which is precisely
why ADR-035 §2.3 made this derived instead of cached. A cache would hold only the
latest and the history would have been thrown away.

**Do not conflate the two when `0009` is written.** "No fallback across providers" is
a rule about the **prefill**: a price learned from one provider must never prefill
another's, because a supplier price is a fact about a relationship. It is *not* a rule
about reporting — "you paid $18 at Proveedor A and $21 at Proveedor B" is exactly the
comparison the merchant asked for and is the point of having the history. The failure
mode to guard against is a reporting view being wired into Comprar's prefill because
it happened to be convenient.

### Settled in 1.4, and binding on what comes after

- **The memory is manager-and-above, and that is inherited rather than restated.**
  The view is `security_invoker = true`, so `purchase` and `purchase_line` apply
  their own policies — and both already gate on `has_role(workspace_id, 'manager')`
  because both carry cost. **A staff member recording a delivery therefore gets no
  prefill**, and sees the same blank required field Comprar shows for a provider
  never bought from. §2.7 lets staff record purchases and denies them cost, and those
  two looked to be in tension the moment a cashier accepts a delivery.

  **Confirmed by the owner, 2026-08-18: the cashier is not who accepts deliveries.**
  The tension does not exist in the shop. Receiving is a manager-or-owner job, and
  they get the prefill. Nothing to change, and the alternative that was on the table —
  a second, narrower view exposing the remembered *unit* but not the price — is not
  owed to anyone and should not be built.

  Two things follow for step 6. **Comprar's receiving flow does not need to be
  reachable by a staff session at all**, so do not spend the step building one. And
  §2.7's grant of "record purchase" to staff at their assigned locations is broader
  than the shop uses — that is the ADR's grant and unused breadth costs nothing, so
  leave it alone, but do not design *for* it.
- **A fourth sort key, and the last three are about determinism, not time.** §2.3
  names `occurred_at` alone and it does not pick a single row: `occurred_at` is
  server `now()` for a whole transaction, so two deliveries recorded together share
  it, and one delivery can carry two lines for the same variant. The view orders by
  `occurred_at desc, recorded_at desc, purchase.id desc, line.id desc`. Same argument
  that put `batch_id` third in `allocate_fefo()`. **Owner's call to confirm**, and
  the same one already confirmed there.
- **A negative line is never a remembered price**, even on a live document. 0003
  permits one — a return to the supplier is exactly that — and it is a correction,
  not what the shop pays for the goods.
- **`0008` shipped before `0006` and `0007` exist**, because 1.4 depends only on
  `0003` and the seed wants the prefill. Files apply in name order so a reset is
  unambiguous; the cost is that a hosted database would need
  `supabase db push --include-all` to accept `0006`/`0007` later, and none exists yet.
- **The analytics views and nightly rollups became `0009`.** `supabase/README.md`
  had them sharing a line with this view. Bundling them would have put something
  Comprar depends on behind a review three times its size, which is the same reason
  every migration here is narrow. Numbering authority is `supabase/README.md`.
- **No index was added for the provider-wide prefill.** A lookup by provider without
  a variant cannot use `purchase_line_by_variant_idx`, and on the test fixture the
  planner takes a sequential scan for it. That fixture is single-tenant, so
  `workspace_id` selects every row and the estimate is not evidence of a production
  problem — it is a shape to re-measure when Comprar exists. Speculative indexes on
  a guess are how the last model got `ProviderProductPrice`.

### A check that rolls back deletes its own results — the lesson of 2.4

`chk()` records a verdict by INSERTING into `_verify`. A section wrapped in
`begin … rollback` therefore throws its results away, and the file still prints *all N
checks passed* with a quietly smaller N. `0012`'s check file shipped with exactly that
for one draft: four access checks vanished between 23 and 28, and the summary said 28
rather than 32. Nothing failed. Nothing looked wrong.

It was caught by **reading the printed table instead of the summary line** — the same
discipline the working agreement demands of a green CI tick, one level down, and the
same failure mode: an assertion that never ran looks exactly like an assertion that
passed.

The fix is structural. `_verify.n` is a serial and a sequence is non-transactional, so
a rolled-back `chk()` burns its number and leaves a gap; `max(n) = count(*)` catches
it. All three analytics check files now carry that assertion as their last check.

### The test was wrong before the view was, and that is the lesson of 1.4

The migration was right on the first draft. **The suite was not**, and it was green
the whole time. Three separate clauses of the view could be deleted with all checks
still passing:

- `p.reversal_of is null` — every reversal in the fixture carried a negative line,
  so `qty_base > 0` was quietly doing that exclusion's job. Fixed by adding a voided
  **return**, whose compensating line is *positive*.
- `recorded_at desc` — nothing in the fixture had two deliveries at the same instant.
- `purchase.id desc` — the tie pair's line ids were random, so the check passed on a
  coin toss and would have failed on some future run for no reason anyone could find.

Each was found by deleting the clause and watching for red, not by reading the file.
Every clause has now been deleted or inverted in turn, and the count of checks each
one breaks is recorded in `supabase/README.md`. **Do this for `0009` and for every
RPC in `0006`.** A suite that has never been shown to fail is a suite with no
demonstrated relationship to the code, and this repo already has a folder full of
those.

### Decided 2026-08-17 — the waste vocabulary

`waste_line.reason` is a Postgres enum, `public.waste_reason`, shipped in `0003`:

    caducado · dañado · merma de preparación · robo o faltante · error de captura

Free text does not survive contact with the analytics asset — three cashiers spell
*caducado* four ways and "why are we losing stock" becomes worthless. The enum is
global rather than a per-workspace reference table, because comparing loss causes
across shops is the point of the asset and a list each shop edits makes that
comparison meaningless.

`robo o faltante` is deliberately **one** value: a count cannot tell theft from a
miscount, and asking the operator to choose produces a fiction that reads as data.

Adding a value later is a one-line migration; removing one is not. The list is short
on purpose, and each entry names a cause an owner would act on differently. The
owner's call, 2026-08-17: adequate, and changeable either way in future.

### Decided 2026-08-17 — the seed's FEFO allocation (was: blocks 1.6)

**Option A. One allocator, `allocate_fefo()`, owned by the ledger.** It lands in
`0005` — its own migration rather than inside `0004`, so each half of the old 1.3
stays reviewable — and both the seed (1.6) and `record_sale` / `record_waste` /
`record_transfer` (0006) call it. Nothing allocates stock by hand, anywhere.

The alternatives and why they lose:

| Option | Trade |
|--------|-------|
| **A. One allocator in `0005`**, called by the seed and later by the RPCs | Inserts a migration and shifts `0005`–`0007` down by one. One implementation, no divergence. **Chosen** |
| B. Seed allocates naively | Fastest; validates the design gate on fiction, since margin is cost attribution and cost attribution *is* the allocation |
| C. Move the seed after step 4 | Follows the ADR's letter; delays the design gate, which the ADR most wants early |

The deciding argument is step 2. It is the design gate, and it turns on whether
margin-by-product survives reversals, unit conversion and a location rollup. Margin
is produced by which batches a sale consumed — so if the seed picks batches
differently from `record_sale`, the gate passes on data the real system never
produces, and the schema is judged on a fiction in exactly the week the ADR wanted it
judged honestly.

This is also the reading most faithful to the ADR rather than least: ADR-035 §2.4
already fixes the *transfer movement shape* in the ledger migration even though the
screen ships at step 6, on the grounds that ledger mechanics belong with the ledger.
FEFO allocation is the same kind of thing. What stays in `0006` is what genuinely
belongs to the RPCs — location validation, the tax split, idempotency, the dormant
availability check.

**Cost, recorded honestly:** `0005`–`0007` shift down by one, and `0002` — already
applied, therefore not edited — still calls the RPC migration `0005` in two comments.
[`supabase/README.md`](../supabase/README.md) is the authority on numbering.

## Step 2 — the three Insight queries, the design gate ✅

ADR-035 §3 step 2: *"Write §2.9's queries against seeded data, **per location and
consolidated across locations**. If margin-by-product needs a five-way join and a CTE
to survive reversals, unit conversion and a location rollup, the schema is wrong —
known in week two, before any screen."*

This is the gate the whole build order exists to reach early. It is not a reporting
feature; it is the moment the schema is judged, and the only artefact that can judge
it is a query written against the seed and read by a person.

**Split into 2.1 / 2.2 / 2.3 on 2026-08-20, before any of it was written.** Step 2 is
three independent questions over three different corners of the ledger — margin reads
`sale_line` against `stock_movement`, waste reads `waste_line` against `purchase_line`,
velocity reads `sale_line` against itself over time. One session that tried all three
would produce a migration nobody reviews and a verdict nobody can attribute to a
query. 1.3 and 1.6 both taught this the expensive way; this one is split before it is
written, as 1.6 was.

| # | Task | Size | Done when |
|---|------|------|-----------|
| ~~2.1~~ | ~~`0009` — **what made me money**: gross margin by product, net of tax~~ — **done** 2026-08-20, [CI green on PR #17](https://github.com/bersermi/RetailerManagementTool/actions/runs/32375602999). `product_margin_daily`, plus **34 checks** in `supabase/checks/0009_product_margin.sql`, now in the CI gate. **The gate's answer is two aggregates over one grain, joined once** — no five-way join and no CTE. Reversals cancel themselves, unit conversion never appears, and the location rollup is a `group by` the caller drops. Five falsifications, **two of which the seed cannot discriminate and which say so**. `0003`'s 39, `0004`'s 54, `0005`'s 55, the concurrency file's 9, `0008`'s 46 and 1.7's 18 all still pass, read from the job log | M | ✅ |
| ~~2.2~~ | ~~`0011` — **what am I throwing away**: waste cost as % of purchases, by product~~ — **done** 2026-08-20, [CI green on PR #18](https://github.com/bersermi/RetailerManagementTool/actions/runs/32409705126). `product_waste_daily`, plus **55 checks** in `supabase/checks/0011_waste_share_of_purchases.sql`, now in the CI gate. **Same shape as 2.1 — two aggregates over one grain, joined once** — and the same three fears fall the same way. ⚠️ **The view does not divide**, because waste and the delivery it is measured against are different documents days apart: 136 of 137 day-grain waste buckets have no delivery that day, so a row-level rate would be null 99.3% of the time. ⚠️ **The division fails three ways and not one**, and only the first is a zero — the guard is `> 0`, not `nullif`. Seven falsifications, **two of which the seed cannot discriminate and which say so**. `0009`'s 34, 1.7's 18, `0003`'s 39, `0004`'s 54, `0005`'s 55, the concurrency file's 9 and `0008`'s 46 all still pass, read from the job log | M | ✅ |
| ~~2.4~~ | ~~`0012` — **a trading day is local**: `location.timezone`~~ — **done** 2026-08-20, [CI green on PR #19](https://github.com/bersermi/RetailerManagementTool/actions/runs/32418028025), **taken before 2.3 at the owner's instruction**, because 2.3 would have been a third view hardcoding the constant and a third chance to move only two of them. One column on `location` (NOT NULL, defaulted to the literal 2.1 and 2.2 hardcoded, so **applying it moves no bucket** — asserted), one trigger refusing a name `pg_timezone_names` does not carry, and `create or replace` on both views. **35 checks** in `supabase/checks/0012_location_timezone.sql`. ⚠️ **The day boundary is testable for the first time**: moving Centro to `America/Hermosillo` moves 6 delivery buckets, moves nothing at the other stores, and conserves every centavo. Five falsifications, read from the job log | M | ✅ |
| ~~2.3~~ | ~~`0013` — **what stopped selling**: velocity vs trailing average~~ — **done** 2026-08-22, [CI green on PR #20](https://github.com/bersermi/RetailerManagementTool/actions/runs/32582552739). `product_velocity_daily`, plus **51 checks** in `supabase/checks/0013_velocity_vs_trailing_average.sql`, now in the CI gate. ⚠️ **The silence IS the answer, and it is a generated day spine**: 22 129 of the view's 24 268 rows exist to say nothing happened. ⚠️ **It does not divide, for a different reason from 2.2's** — there are TWO honest denominators and they disagree by 17.9% at a store that shut for five days. ⚠️ **The one schema finding of step 2**: 71 (store, product) pairs were delivered and never sold, and the view cannot see them. Six falsifications attempted, **five caught and one that the seed cannot make and which says so**. `0009`'s 36, `0011`'s 56, `0012`'s 35, 1.7's 18, `0003`'s 39, `0004`'s 54, `0005`'s 55, the concurrency file's 9 and `0008`'s 46 all still pass, read from the job log | M | ✅ |
| ~~2.5~~ | ~~`0014` — **what NEVER started selling**: the spine reads the stock ledger~~ — **done** 2026-08-22, [CI green on PR #21](https://github.com/bersermi/RetailerManagementTool/actions/runs/32584197118), taken at the owner's instruction to fix 2.3's finding before moving on. `create or replace` of `product_velocity_daily`, plus **30 checks** in `supabase/checks/0014_velocity_spine_reads_stock.sql`. ⚠️ **2.3's finding needed NO schema change** — ADR-035 §2.9's "stock is already per location" had already decided it. Invisible pairs 71 → **0**; 510 pairs, 30 472 rows. `batch_balance` not `stock_batch`, because **a cashier reads 454 rows of one and 0 of the other**. `0013`'s file re-measured to 49 checks | S | ✅ |

Order is not forced by foreign keys — all three read applied tables — but it is forced
by cost attribution. **2.1 is first because margin is the hard one**: it is the only
one of the three whose answer comes from `stock_movement` rather than from a document
table, and it is the one the ADR names when it says "if margin-by-product needs a
five-way join, the schema is wrong". If the schema is wrong, 2.1 is where it shows.

### Numbering, and what step 2 does NOT ship

`0006` and `0007` are reserved and unwritten ([`supabase/README.md`](../supabase/README.md)
is the authority). **2.1 took `0009`, 2.2 took `0011`, 2.4 took `0012` and 2.3 took
`0013`** — the next free number each time, because migrations are append-only
once applied and tasks that merge separately cannot share one file. This is the same
rule `0010` followed. ⚠️ **2.3 moved from `0012` to `0013` on 2026-08-20** when the
owner took the timezone column ahead of it, **and 2.5 took `0014`** on 2026-08-22 to
fix what 2.3 found.

Two things `supabase/README.md` currently files under `0009` are **not** in step 2,
and both are named here so they are not silently dropped:

- **The nightly materialised rollups and the live partial-day union** (§2.9). They are
  a latency answer, not a correctness answer, and they need a scheduler this project
  has not chosen yet. The gate asks whether the questions are *answerable and legible*,
  not whether they are fast. Every view in step 2 is written at a grain that
  materialises as `select * from` it — day × location × variant — so adding the rollup
  later is additive rather than a rewrite. **Owner's call to pull it forward.**
- **The price history** — global and per provider — that the README says `0009` owes
  the merchant. It is not one of §2.9's three questions and it answers a different
  person's question; it belongs with Números (step 7) or with a task of its own.
  **Owner's call.**

### The gate's verdict, from 2.3 — **the schema passes, three of three, and step 2 is closed**

2.3 asked §2.9's third question and the schema answered it. The measure leg is
`sale_line → sale`, which is **bit for bit `product_margin_daily`'s revenue leg** —
asserted both directions, so neither view holds a bucket the other lacks. Reversals
still cancel by being summed, unit conversion still never appears, and the location
rollup is still a `group by` the caller drops.

**ADR-035 §3 step 2's bar is met for all three questions, and no schema change is owed
to any of them.** Step 2 is closed.

⚠️ **AND THIS VIEW IS LITERALLY "A FIVE-WAY JOIN AND A CTE", WHICH IS THE SHAPE THE
ADR NAMES AS FAILURE — SO THE DECOMPOSITION IS ON THE RECORD RATHER THAN GLOSSED.**
The gate's words are *"if margin-by-product needs a five-way join and a CTE to survive
**reversals, unit conversion and a location rollup**, the schema is wrong"*. Not one
of those three is why anything in `0013` is complicated. Of its five tables,
`product_variant` and `product_family` are the name lookup `0009` and `0011` also
carry and `location` is the timezone lookup `0012` gave all three; strip those and the
measure is two tables and one join. Everything above that is **the day spine**, and
the spine is not a property of this schema — no ledger holds a row for a sale that did
not occur. The verdict is a pass; the sentence describing the query is longer, and for
a reason that belongs to the question.

### ⚠️ Found in 2.3, FIXED in 2.5 — and the fix was not the one 2.3 prescribed

**FIXED 2026-08-22 in `0014` (task 2.5), on the owner's instruction, and it turned out
to need no schema change at all.** The finding below is left standing because the
observation was correct and worth keeping; ⚠️ **what was wrong was the prescription**,
and that is recorded in *Fixed in 2.5* immediately after it.

`product_velocity_daily`'s day spine starts on the first day a store put a product on
a ticket, because that is the earliest date the **sale** ledger can prove the store
carried it. So a product that was delivered and never once sold has no spine, no row,
and is invisible to a report called "what stopped selling". In the seed that is **71
(store, product) pairs** — asserted, not estimated — and it is not a matter of late
arrivals: **397 pairs were delivered before their first sale**, so the inferred start
is systematically later than the shop's truth rather than occasionally.

⚠️ **§2.9 asks what STOPPED selling, which presupposes it started, so the question as
written IS answered.** "What never started" is the adjacent question, and for a small
retailer it is arguably the more valuable of the two: a case of something nobody wants
is money on a shelf, and it is exactly what no report currently names.

**Three things 2.3 said about the fix. The first two were right; ⚠️ the third was
wrong, and `0014` is what it should have said:**

- **Widening the spine with `purchase_line` is the tempting move and it is wrong.** It
  drags two **manager-gated** tables into a view that is otherwise entirely
  member-level, which would make a cashier and a manager see different numbers of rows
  for the same store; and it still misses stock that arrived by **transfer** — 1 pair
  in this seed sold goods it was never delivered. Both pinned as checks.
- **`price_list` is the near-miss and does not do it.** It is per location and dated,
  which looks right, but its `location_id` is **nullable** for a workspace-wide price
  and its RLS is workspace-scoped rather than `my_locations()`-scoped. It answers
  "what may this be sold for", not "does this store stock it".
- ~~**The honest fix is a fact nobody records**: a per-(location, variant) "carried
  from" date.~~ ⚠️ **WRONG, and ADR-035 §2.9 said so on 2026-08-14.** The fact is
  already in the ledger: `stock_batch` (`0004`) carries `location_id`, `variant_id`
  and `received_at`, and its `origin` spans purchase, **transfer** and adjustment — so
  it answers the transfer objection above for free. 2.3 reached for a new table
  because it was reasoning about `purchase_line` and `price_list`, and never asked
  what the stock ledger already knew.

### ✅ Fixed in 2.5 — `0014`, and the lesson is that the ADR knew

Task **2.5**, taken 2026-08-22 on the owner's instruction to fix 2.3's finding before
moving on. One migration, `0014_velocity_spine_reads_stock.sql`: a `create or replace`
of `product_velocity_daily` adding one CTE and one column. **No table, no policy, no
function, no new grant** — the whole thing is the reversible half.

**What changed.** The day spine used to start at a pair's first **ticket**. It now
starts at `least(first sale day, first stock receipt day)`, the receipt read from
`batch_balance`. The gap closes completely: **delivered-and-never-sold pairs invisible
to the view goes from 71 to 0**, the spine grows from 439 pairs to 510 and from 24 268
rows to 30 472, and the one pair that sold goods it was never *delivered* — the
transfer case 2.3 named as the reason `purchase_line` alone would not have sufficed —
is visible too, because `stock_batch.origin` spans purchase, transfer and adjustment.

⚠️ **THE LESSON: THE ADR HAD ALREADY DECIDED THIS AND 2.3 DID NOT LOOK.** ADR-035 §2.9,
settled 2026-08-14: *"One catalog per workspace, shared across locations… stock is
already per location, which covers 'we don't carry that here' without splitting
anything."* A per-location assortment table was considered and rejected there, on
exactly the grounds that made it unnecessary. 2.3 reasoned from `purchase_line` and
`price_list`, concluded a new table was owed, and flagged it as the expensive
append-only decision — when the cheap answer was one CTE away. **The finding was real;
the prescription was not checked against the ADR.** That is the failure mode CLAUDE.md
names — *if anything disagrees with the ADR, the ADR wins* — arriving from the
direction nobody watches, a plan proposing to *add* what the ADR already refused.

**`batch_balance`, not `stock_batch`, and the difference is measured rather than
argued.** 2.3's objection to widening the spine was that it would drag manager-gated
tables into a member-level view. Right about `stock_batch`, whose policy adds
`has_role(manager)`. `batch_balance` is the same evidence with **`sale_line`'s own
predicate, character for character**, and no cost column at all. ⚠️ **A cashier reads
454 rows of `batch_balance` and 0 of `stock_batch`** — so the gated table would have
built the till's spine out of nothing, and their never-sold products would have
vanished while a manager saw them. Asserted, not described.

**`least`, not "the stock day instead".** The spine start can only ever move *earlier*.
No pair's history shortened, no pair starts later than its first sale or its first
delivery, and not one unit, peso or line moved — all asserted. A report quietly losing
rows is the failure that would be hardest to notice, and `least` makes it impossible
rather than unlikely.

**`days_carried` is what makes the new rows a sentence.** Beside a NULL
`days_since_last_sale` it says *Pepino at Sucursal Mercado has been on the shelf 63
days and has never once sold*. It is an age, so it rolls up as a **max** — and that,
like `days_since_last_sale`'s min, is on the column comment because step 7 will be
tempted to sum it.

**30 checks** in `supabase/checks/0014_velocity_spine_reads_stock.sql`; `0013`'s file
re-measured against the view as it now is and down to **49**, its three "cannot see"
checks replaced by one asserting the gap is closed. Three mutations run: reverting to
the sale-only spine goes red on 21 checks across the two files, reading `stock_batch`
on 5 — **and one the seed cannot catch, recorded rather than papered over**.

### ⚠️ Still open after 2.5, and the owner's call — DELISTING

`0014` fixed "when did this store start carrying it", which the ledger knew. It did
**not** fix "when did the store decide to stop", because that is an intention and the
ledger records events. A product stocked once and deliberately dropped keeps generating
silence rows until the store stops trading.

Nothing regressed — the spine has always ended at the store's last trading day — but
this is a genuinely new fact and no table holds it. A check asserts that no column
anywhere carries it, so the day one is added this stops being true loudly. ⚠️ Unlike
2.3's mistaken prescription, **this one really would be a schema change**, and the ADR
does not already answer it: §2.9's "stock is already per location" covers *carrying*,
not *ceasing to carry*. **Owner's call, and it is cheaper before a pilot than after.**

### Settled in 2.3, and binding on step 7's Números screens

Every one of these is a **view body** — no data to migrate, nothing the seed bakes
in — so all are the owner's to overturn at the ordinary price.

- **⚠️ THE ANSWER IS AN ABSENCE, SO THE VIEW GENERATES ITS OWN DAYS.** `0009` and
  `0011` aggregate rows that exist, and a day on which nothing happened is simply not
  in either view. That costs them nothing, because "what made me money" and "what am I
  throwing away" are questions about events. **"What stopped selling" is not**: the
  product the owner needs naming is precisely the one with no `sale_line` today. So
  `0013` cannot be an aggregate over `sale_line` alone — it builds a day spine and
  reports what did or did not land on it. **22 129 of its 24 268 rows exist to say
  nothing happened**, and that density is the answer rather than waste. The
  falsification is unambiguous: ending the spine at the product's last sale instead of
  the store's last trading day **deletes 8 496 rows** — the view would fall silent
  about a product exactly when the product fell silent.

- **⚠️ THE SPINE ENDS AT THE STORE'S LAST TRADING DAY AND NOT AT `current_date`.** A
  view whose row set moves with the calendar cannot be checked reproducibly, grows
  rows on a database nobody has written to, and makes CI's answer depend on the day it
  ran. **The price is stated: if a whole STORE stops selling, its spine stops with it**
  and the silence that matters most becomes invisible. A check pins the seed's
  precondition — no store has a delivery or a write-off after its last selling day — so
  the day that stops being true it goes red.

- **⚠️ THE VIEW DOES NOT DIVIDE — 0011's CONCLUSION, REACHED BY A DIFFERENT ROAD.**
  `0011` withheld its rate because numerator and denominator are different documents
  days apart. Here both numbers are on every row, and the reason is instead that
  **there are two defensible denominators and the view must not pick one**:
  `trailing_days` (calendar) and `trailing_traded_days` (days the till rang). They are
  not a rounding apart. Doña Lupe Centro records no sale at all for five consecutive
  days (2026-08-16…08-20); on 08-21 every product there with a full window shows
  `trailing_days = 28` and `trailing_traded_days = 23`, so a calendar-denominator
  average is **17.9% lower for every line in the shop on a day no product changed**. A
  report using it would announce that the whole catalogue slowed down over a long
  weekend. Measured at that store on that day: `avg()` of the per-product rates is
  **21.548254**, the shop's actual rate per traded day is **16.508404**, and per
  calendar day **13.370757**. Two of the three are honest and the first is not.

- **⚠️ EVERY MEASURE ADDS ACROSS A ROLLUP; THE TWO NON-MEASURES DO NOT, AND THAT IS
  WRITTEN ON THE COLUMNS.** `store_traded` rolls up as a `bool_or` and
  `days_since_last_sale` as a `min` — a product last sold 3 days ago at one store and
  40 at another has not been silent for 43 days anywhere. Summing either is
  meaningless, and step 7 will be tempted to.

- **`days_since_last_sale` IS THE COLUMN THE QUESTION IS ACTUALLY ASKING FOR.** The
  trailing window alone cannot tell a product silent for 29 days from one silent for
  79: both have a trailing sum of zero and only one is news. It counts calendar days,
  including days the store was shut, which is why `store_traded` is on the row beside
  it. **NULL is a third answer and not a missing one** — this pair has never had a day
  of positive net movement here.

- **⚠️ 0011's "NO ROW" VS "A ROW THAT NETS TO NOTHING", AT SALE GRAIN — the shape 2.1
  predicted this task would meet, and it did.** *Jugo de naranja 1 l* at Sucursal
  Mercado appeared once, on 2026-06-07, as a sale and its own same-day void:
  `line_count` 2, `qty_base_sold` 0, `days_since_last_sale` NULL for the eight days
  until it first really sold. `line_count` is on the row because it is the only column
  that separates the two.

- **THE 28-DAY WINDOW IS A CONSTANT AND DELIBERATELY NOT A COLUMN.** Four whole weeks,
  so a weekday rhythm cancels; a 7-day window makes one public holiday look like a
  collapse. `0012` made the timezone a column because a trading day is a fact **about a
  shop**; a trailing window is a parameter of a **report** and belongs to the caller.
  A caller wanting a different one needs no migration: every row carries
  `qty_base_sold` on a gapless spine, so any window is a window function away over
  this very view. **Owner's call, cheap in both directions.**

- **`store_traded` IS DEFINED FROM SALES ALONE — THE TILL, NOT THE DOOR.** Nine days
  in the seed took a delivery or a write-off without a sale and are counted as not
  traded. Reading `purchase` and `waste` to answer "was someone there" would add two
  base tables for a judgement the ledger does not actually make, so the column is
  named for what it measures and the nine are pinned.

- **NO `has_role` PREDICATE, AND THE PREDICTION IN *Settled in 2.1* HELD EXACTLY.**
  Every base table is member-level and nothing costed is reachable, so inheritance is
  simply **right** here rather than open (`0009`) or closed (`0011`) — the third of
  the three cases. Asserted with the strong form rather than "the cashier sees
  something": **the cashier's 12 602 rows are byte-identical to the manager's Centro
  rows**, so inheritance narrows the view without distorting it. A gate would only
  take a number away from the person standing at the till.

### Two falsifications 2.3's seed cannot make, recorded rather than papered over

Six mutations of the shipped view were run against the checks. **Five went red** —
ending the spine at the product (11 checks), hardcoding the timezone (4), including
today in the trailing window (5), dropping `location_id` from the window partition
(8), and replacing the outer join with an inner one, which is the naive
aggregate-over-`sale_line` view (19). The two that no check caught are here, in the
same spirit as 2.1's and 2.2's pairs:

- **`RANGE` weakened to `ROWS`.** Identical over this seed, because the spine is
  **gapless by construction** — asserted — so "the previous 28 days" and "the previous
  28 rows" are the same set on every row. `RANGE` is still right: it states the frame
  in days, so it survives a spine that ever acquires a gap. The precondition is pinned
  at 0 instead;

- **`trailing_sold_days` counting `<> 0` instead of `> 0`.** `0011` found that a
  window can net **negative** when a void lands later than its original. At day grain
  over **sales** that never happens here, because 2.1 established that every sale void
  in this seed lands minutes after its original on the same local day — so no day
  bucket and no trailing sum is negative, and the two spellings agree. Both bounds are
  pinned at 0, so the day the seed grows an evening trade or a late void, the `> 0`
  guard starts earning its keep and this goes red.

### The gate's verdict, from 2.1 and 2.2 — **the schema passes, twice**

2.2 asked §2.9's second question of the same schema and got the same answer: two
aggregates over one grain, joined once, with the ADR's three fears falling for the
three reasons 2.1 gives below. Nothing in `0011` is owed a schema change either.
**The gate is 2 of 3.**

⚠️ **2.2's finding is about the REPORT, not about the schema.** The ledger answers
"what am I throwing away" exactly; what it cannot do is make the *ratio* a property
of a row, because waste and the delivery it is measured against are different
documents days apart. That is a fact about retail, not a defect in the model — and
it is the reason `0011` ships a numerator and a denominator and lets the caller
divide. See *Settled in 2.2* below.

### The gate's verdict, from 2.1 — **the schema passes**

ADR-035 §3 step 2 set the test: *"If margin-by-product needs a five-way join and a CTE
to survive reversals, unit conversion and a location rollup, the schema is wrong."*
It needs neither. The whole query is:

    revenue   sale_line  →  sale                    (what the customer paid)
    cost      stock_movement where reason = 'sale'  (what those units cost us)
    -----------------------------------------------------------------------
    margin    full outer join on (workspace, location, variant, day)

And the reason each of the ADR's three fears did not materialise was decided in an
earlier migration, not in this one — which is the outcome the gate was placed early to
find out about:

- **Reversals need no exclusion at all**, because a void is a negated document
  (`0003`) and margin is a **sum**. This is the exact opposite of `0008`, which must
  exclude both the void and the document it voids — because "the last price paid"
  *picks a row*, and a picked row cannot cancel. Two views, two correct answers, from
  the same ledger shape.
- **Unit conversion never appears in the query**, because §2.5 already did it at write
  time. A product bought by the kilo and sold by the gram is grams on both sides of
  the join, and money is money. The ADR's worry was real and the answer was paid for
  three migrations ago.
- **The location rollup is a `group by` the caller drops.** Consolidated and per-store
  are the same statement, and they agree to the centavo — asserted, not assumed.

**Verdict: the schema answers §2.9's first question in one statement, and no change is
owed to it.** 2.2 and 2.3 remain to be written, and either could still find something —
this verdict covers what 2.1 could see.

### Settled in 2.2, and binding on 2.3

Every one of these is a **view body** — a `create or replace` in a new migration,
with no data to migrate and nothing the seed bakes in. They are the owner's to
overturn at the ordinary price, and none of them gets dearer with a pilot.

- **⚠️ THE VIEW DOES NOT DIVIDE, AND THAT IS THE TASK'S REAL FINDING.** `0009` puts
  `margin_rate` on the row because a sale's revenue and that sale's cost are the same
  event — one document, one day, always. Waste and the delivery it should be measured
  against are **different documents on different days**, usually weeks apart: **136 of
  137 day-grain waste buckets in the seed have no delivery of that product at that
  store on that day.** A row-level rate would therefore be null in 99.3% of the rows
  that have any waste in them, and the rest would be a coincidence of the delivery
  schedule. `0011` carries an additive numerator and an additive denominator and the
  caller divides once, at the window they asked about. **Ratios do not add; pesos do**
  — asserted, not assumed: `avg()` of the per-bucket shares is 0.415% where the shop's
  actual share is 0.306%.

- **⚠️ THE DIVISION FAILS THREE WAYS AND NOT ONE, AND `nullif` SURVIVES ONLY TWO.**
  This task's "done when" anticipated a single division by zero. The seed has three
  distinct failures at month grain, and only the first is a zero:

  | | `purchases_net` | `purchase_line_count` | In the seed |
  |---|---|---|---|
  | Never bought in the window | 0, coalesced from null | **0** | 40 buckets |
  | Bought and cancelled inside the window | **exactly 0** | 2 | 11 buckets |
  | Bought before the window, voided inside it | **negative** | 2 | 1 — *Cebolla blanca*, Centro, June, −270.43 |

  So the guard is **`sum(purchases_net) > 0`**, not `nullif(..., 0)`: `nullif` passes
  the negative through and the report prints a negative waste percentage, which reads
  as un-wasting onions. The first two are both zero and are **not the same fact** —
  one shop never ordered the goods, the other ordered them and cancelled — which is
  why `purchase_line_count` is a column. **2.3 will meet the same shape**: its whole
  question is about absence, and "no row" and "a row that nets to nothing" will need
  telling apart there too.

- **COST COMES FROM THE LEDGER, NOT FROM THE DOCUMENT'S OWN SNAPSHOT.** Unlike
  `sale_line`, `waste_line` *does* carry `unit_cost_net_per_base`, so 2.2 had a choice
  2.1 did not. It takes `stock_movement`, because **the two analytics views must agree
  on what a peso of cost is** — COGS and waste cost are the two halves of "what did
  the stock that left this shelf cost us", somebody will add them, and they must
  reconcile against the ledger. The line's cost is also a quantity-weighted mean
  rounded to six decimals where the movement's is per lot: over the seed they agree to
  **0.00011 pesos** and are **not identical**, and both facts are checked.

- **THE GRAIN CARRIES NO `waste_reason`, AND THAT IS A FAN-OUT AND NOT AN OVERSIGHT.**
  §2.8 makes "what are we losing, and why" the asset Desperdicio feeds. It is not
  answerable in this view: putting `reason` in the grain fans the **denominator** out
  across five reasons, so every peso of purchases would be counted five times. A
  reason breakdown is a second view over `waste_line` alone, with no denominator, and
  it belongs with the Desperdicio screen at step 6. Nothing in the schema is missing
  for it.

- **NO `has_role` PREDICATE, AND THE ANSWER GENUINELY DIFFERED FROM 2.1's.** 2.1 said
  this was worth checking rather than assuming, and it was: both of `0011`'s
  aggregates read manager-gated tables, so a cashier reads zero rows from both sides
  and inheritance fails **closed** — `0008`'s situation and `0008`'s answer. The check
  asserts the outcome *and the reason*, reading both base tables as that cashier, so a
  future migration that relaxes either policy turns it red.

- **COUNTS, NOT A BOOLEAN.** 2.1's `cost_attributed` is right there because a bucket
  with revenue and no cost is a **defect** and `bool_and` must hold everywhere. Here a
  bucket with no delivery is **ordinary** — it is 136 of 137 — so a boolean carries no
  signal and does not survive a rollup. `waste_movement_count` and
  `purchase_line_count` answer both the honesty question and 2.1's "a sum-only
  reconciliation cannot see a dropped document", and they add up.

- **The denominator is net of tax, same store, same window.** IVA on a delivery is
  recoverable and never was the cost of the goods; a gross denominator is flattering
  by up to 16% and never the other way. Falsified.

### Settled in 2.4, and binding on 2.3

**2.3 must not hardcode a timezone.** It joins `location` and reads
`location.timezone`, exactly as `0009` and `0011` now do. The check that used to
compare two literals now asserts that **no** analytics view carries one, and 2.3's
view will be added to it. ✅ **Discharged 2026-08-22**: `product_velocity_daily` reads
the column, and the guard in
[`supabase/checks/0011_waste_share_of_purchases.sql`](../supabase/checks/0011_waste_share_of_purchases.sql)
now names all three views and asserts a count of 3, so a fourth analytics view added
without registering it fails the count rather than passing silently. ⚠️ And 2.3 made
the boundary visible in a way `0009` and `0011` cannot: moving a store's zone moves
its first and last **trading day**, so the generated spine changes size — 12 602 rows
at Centro become 12 624 at UTC+14.

- **The column is on `location`, not on `workspace_setting`.** The store is the thing
  that has a trading day, and ADR-035 §2.3 makes confusing the two a one-way door. The
  case the column exists for *is* the case that separates them: one merchant with a
  shop in Hermosillo (UTC−7) and one in Guadalajara (UTC−6). `workspace_setting` gets
  no default-for-new-locations companion — the column default covers a new store
  without a second row anyone can edit, and two places to write one fact is how a NULL
  got into the overlap constraint.

- **The default is the literal the two views hardcoded, so applying it moves nothing.**
  Asserted twice rather than claimed: both views' buckets are recomputed with the old
  constant and shown identical. That is the property that made this safe to do now
  rather than at the first pilot. It also meant `onboard_workspace()`, both seeds and
  every fixture in `supabase/tests/` needed no change — all of them insert a location
  naming only `(workspace_id, name)`.

- **A trigger, not a `CHECK`, and it demands the canonical name.** No honest timezone
  validation is `IMMUTABLE` — the tz database ships with the server. The trigger
  refuses `america/mexico_city` as well as `Mars/Olympus_Mons`, and refuses the fixed
  offset `-06:00`, which cannot follow daylight saving. Scoped `update of timezone`, so
  renaming a store pays nothing.

- **Moving a boundary is an owner act**, inherited from `location_update` (§2.7) with
  no new grant. A manager reads it; an owner moves it. The boundary decides what every
  report in the shop means, and it changes when the shop moves.

- **⚠️ IT COSTS THE GATE ONE JOIN, AND THAT IS SAID RATHER THAN GLOSSED.** Each
  aggregate in both views now reads three tables instead of two. ADR-035 §3 step 2's
  bar was about surviving *reversals, unit conversion and a location rollup*, and none
  of those is why the join is there — it is a primary-key lookup of one text column. It
  cannot drop a row (`location_id` is NOT NULL with a composite FK) or narrow one under
  RLS (`location_select` is the same `my_locations()` predicate the ledger tables
  already apply). Both asserted. **The verdict is unchanged; the sentence describing
  the query is longer by one join.**

### ⚠️ FIXED in 2.4 — the day boundary is a column, and it is testable at last

This closes the finding 2.1 raised and 2.2 doubled. The two entries below are left in
place because the reasoning that deferred the fix twice was correct both times, and
what changed was the price rather than the argument.

**What the column buys that the constant could not.** 2.1 and 2.2 both recorded the
day boundary as **untestable over this seed** and pinned a bound at zero instead. It
was untestable because it was a constant in a view body — nothing in the repo could
move it. It is a column now, so a check can:

- **`America/Hermosillo`, the real Sonora case, is visible in this seed.** Not through
  sales or write-offs — they sit at 09:00–20:40 UTC and cannot straddle a midnight one
  hour away — but through the **early-morning deliveries** at 06:00–07:00 UTC, which
  cross back over midnight at UTC−7. Moving Centro alone moves **6 delivery documents**
  into different buckets, moves **nothing** at the other two stores, and changes not
  one centavo of any total. Then it is put back and asserted identical to a baseline.
- **⚠️ The limitation that remains is now itself a check.** No Mexican zone moves a
  *sale* in this seed, because sales sit in a window no such zone can straddle. That is
  check 19 of `0012`, pinned — so the day the seed grows an evening trade, it goes red.
  Proving `product_margin_daily` reads the column therefore needs an absurd zone
  (UTC+14, where 380 of Centro's 413 sales move). It proves the view reads the column;
  it does not pretend to be a customer.

**And the drift 2.2 could only guard against is now caught by numbers.** Reverting one
view to the constant and leaving the other — the exact failure 2.2 named — was
invisible to every arithmetic check in the repo and caught only by comparing view
*text*. It now fails three behavioural checks.

⚠️ **Still not fixed, and still the owner's call: the seed trades in UTC office
hours.** Fixing it means rewriting every timestamp in `20_consumption.sql` and
therefore every hash-derived quantity — 1.6b's territory, a task of its own. It is **no
longer urgent**: the boundary no longer has to come from the seed's clock.

### ⚠️ Found in 2.2 — two views now hardcode the shop timezone, and nothing arithmetic can see them drift

*(FIXED in 2.4 — see above. Kept because the reasoning was right at the time.)*

2.1 recorded that the day boundary is a hardcoded `America/Mexico_City` and that no
table records a shop's timezone. **`0011` carries the same constant, and that makes
the finding worse rather than merely repeated.** If a fix moves one view and not the
other, the margin report and the waste report bucket the same shop's days
differently — and **no arithmetic check anywhere would notice**, because the seed
trades in UTC office hours so both bucketings agree over it.

What 2.2 did about it, and what it did not: one check reads the timezone literal out
of **both shipped view definitions** and asserts there is exactly one distinct value
across the two. It is the only thing that caught the UTC falsification — every
arithmetic check stayed green. It is a drift guard, not a fix.

⚠️ **The fix is still `location.timezone`, and it is still cheaper now than at any
later point** — and now there are two `create or replace`s to do rather than one, plus
a third for 2.3. **Owner's call**, unchanged from 2.1, and the price has gone up.

### Two falsifications 2.2's seed cannot make, recorded rather than papered over

Both are `create or replace` mutations of the shipped view that **no check caught**,
in the same spirit as 2.1's pair:

- **the waste day taken from `stock_movement` instead of from `waste`.** Every waste
  movement in the seed carries exactly its document's `occurred_at`. Taking it from
  the document is still right — it *guarantees* a loss and its cost land in one bucket
  rather than leaving that to a convention every future writer must honour — but the
  seed cannot prove it. This is the same mutation 2.1 could not falsify;

- **`location_id` dropped from the join key.** It should fan a write-off at one store
  out across another store's deliveries. Over this seed it changes nothing: no
  `(product, day)` pair has a delivery at one store and a write-off at another. A
  check pins that precondition at **zero**, so the day the seed can tell them apart it
  goes red and someone reads this.

A third bound is pinned for the same reason: **transferred stock is bought at one
store and can be wasted at another**, which inflates the destination's share and
deflates the origin's while leaving the consolidated number exact. Every variant
wasted at the Mercado stall was also delivered there, so the seed cannot show it.

### ⚠️ Found in 2.2 — a void lands on its own day, and here that is visible

Every void in the sale data lands minutes after its original on the same local day, so
2.1's day buckets never see half a cancellation and 2.1 could only tell "cancels" from
"erases" with a **count**. Not here: all four voids that touch `0011` land on a
**later** local day than the document they cancel — up to nine days later.

Over the whole window the money is exactly what it would be if the voided pairs had
never been written. **At day grain the buckets differ**, and both are asserted. And
one product — *Papas fritas con jalapeño caja 24 bolsas*, whose only delivery was
voided — keeps a **row at zero** where a ledger with the pairs deleted has nothing at
all. That is 2.1's rule visible as a row rather than as a count, and it is why a
report that windows tightly must expect a negative denominator.

This is not a defect and nothing is owed. It is written down because **step 7's
screens will meet it**: a month view of a shop that voided a May delivery in June has
a real, correct, negative purchases figure in June.

### Settled in 2.1, and binding on 2.2 and 2.3

- **⚠️ A VIEW THAT JOINS MEMBER-LEVEL DATA TO MANAGER-ONLY DATA MUST STATE ITS OWN
  ROLE PREDICATE, AND `0008`'S RULE IS THE WRONG ONE TO COPY.** `0008` deliberately
  does not restate §2.7's predicate and is right not to: both tables it reads are
  manager-gated, so `security_invoker` inheritance fails **closed**. `0009` reads a
  mix — `sale` and `sale_line` are member-level, `stock_movement` is manager-and-above
  — so inheritance fails **OPEN**: a cashier would read every revenue row, no cost
  rows, and be told the shop's margin equals its revenue. Demonstrated in the check
  rather than described: the ungated copy of the query returns **216 rows to the
  seeded cashier at Centro, every one reporting zero cost**. 2.2 joins `waste_line`
  (manager) to `purchase_line` (manager) and inherits safely; **2.3 joins `sale_line`
  to nothing costed and does not need the gate at all** — which is worth checking
  rather than assuming, because the answer differs per view.
  *Confirmed by 2.2, with one correction to the prediction:* `0011` inherits safely
  as expected, but it reads `stock_movement` rather than `waste_line`, because cost
  comes from the ledger (see *Settled in 2.2*). Both are manager-gated, so the
  conclusion holds and the reason is one table over.
- **The gate must not lock out the callers RLS never filtered.** Written as
  `has_role(...) or not row_security_active('public.stock_movement')`. `auth.uid()` is
  null for the superuser and for `service_role`, so a bare `has_role` returns **zero
  rows** to the two callers that need them most: §2.9's nightly rollup is a scheduled
  `service_role` job, and every file in `supabase/checks/` runs as the superuser. A
  property of the caller, not a list of role names.
- **A void CANCELS its original; it does not ERASE it — and only a COUNT can tell.**
  Excluding voided documents and their voids left all 32 of the first draft's checks
  green, because the pair sums to zero either way. The two implementations differ only
  in **which day** the cancellation lands on, and every void in the seed happens
  minutes after its original. Two checks were added that count instead of summing:
  every `sale_line` and every sale movement appears in exactly one bucket. 2.2 and 2.3
  need the same pair — a sum-only reconciliation cannot see a dropped document.
- **Report figures are not rounded, and §2.5 does not govern them.** §2.5's half-up
  per-line rule decides what a customer is **charged**. COGS is derived from
  `qty_base × unit_cost_net_per_base` and rounding it at every grain would make two
  correct rollups disagree by centavos. Round once, at the edge.
- **Names are joined from the catalog, money is snapshotted on the line.** A renamed
  product is renamed in last month's ranking too, which is what a person asking "what
  made me money" means. Money never moves.
- **The grain is day × location × variant**, chosen so §2.9's deferred materialised
  rollup is `select * from` the view rather than a rewrite.

### ⚠️ Found in 2.1 — nothing records a shop's timezone, and the seed trades in UTC

*(Finding 1 FIXED in 2.4 — `location.timezone`. Finding 2, the seed's UTC office
hours, is still open and is still the owner's call. Kept because the reasoning that
deferred the column twice was right both times.)*

Two findings, one cause, and **neither is patched** — for the reason 1.6b and 1.6c did
not patch what they found.

**1. The day boundary is a hardcoded `America/Mexico_City` in `0009`.** `occurred_at`
is `timestamptz` and a trading day is local; bucketing in UTC pushes an evening's
takings onto tomorrow — silently, and consistently enough to look plausible. Neither
`location` nor `workspace_setting` has a timezone column. `0009` does not add one
**on purpose**: a column is append-only and a view is `create or replace`, so the
constant is the reversible half and the schema change is not. The day a customer signs
in Sonora or Baja California (UTC−7 and UTC−8, no DST, against this constant's UTC−6)
the fix is `location.timezone` defaulted to this value. ⚠️ **It stays cheap only until
a materialised rollup is keyed on `day`** — after that, moving the boundary restates
history. **Owner's call, and it is cheaper now than at any later point.**

**2. The seed cannot test it, because the seed's shop trades 03:00–14:40.**
`20_consumption.sql` builds every timestamp as `v_day + interval '9 hours'` in a UTC
session, so the seeded trading day is 09:00–20:40 **UTC** — which is 03:00–14:40 in
Mexico City. Nothing crosses midnight in either zone, so local and UTC bucketing
produce identical rows and the constant in `0009` is inert over the seed. The check
says so in the two places it matters: one check proves the expression is local by
construction, and check 33 pins the bound at **zero** documents whose local day
differs from their UTC day — so the day the seed grows a realistic evening trade, it
goes red and someone reads this. **The fix would be a change to `20_consumption.sql`
that moves every timestamp and therefore every hash-derived quantity in the seed** —
which is 1.6b's territory and a task of its own, not a line in a step 2 session.
**Owner's call.**

### Two falsifications 2.1's seed cannot make, recorded rather than papered over

Both of these are `create or replace` mutations of the shipped view that **no check
caught**, and both are recorded because a falsification table with only successes in it
is the more misleading artefact:

- **the day taken from `stock_movement` instead of from `sale`.** Every sale movement
  in the seed carries exactly its document's `occurred_at`, so the two agree on every
  row. Taking it from the document is still right — it *guarantees* a sale's revenue
  and its cost land in one bucket rather than leaving that to a convention every future
  writer must honour — but the seed cannot prove it;
- **`full outer join` weakened to `join`.** Every bucket in the seed has both sides. The
  outer join is there for two failures that must never be silent: revenue with no cost,
  which reads as 100% margin, and cost with no revenue, which is stock that left the
  shelf against a ticket that never charged for it. `cost_attributed` exists so the
  first cannot hide inside a `sum()`.

### ⚠️ Margin per ticket LINE is not derivable, and 2.2 and 2.3 do not change that

`stock_movement` carries `sale_id` and `variant_id` but no `sale_line_id`, deliberately:
one line can be satisfied from three lots, so the movement grain is (line × lot) and no
column pairs them. Per **product** margin is exact, and per **ticket** margin is exact.
Per **line** would need the allocation split persisted with a line reference — a column
on `stock_movement` and a migration, not a query. §2.9 asks for by-product, so nothing
is owed today. It is written down here because the screen that will want it is Vender
(step 5b), and by then the migration is against live data.

---

## Step 3 — test suites (pgTAP, Vitest)

ADR-035 §3 step 3: *"Test suites — pgTAP for RLS coverage, RLS isolation, location
isolation, invariants and money; Vitest for concurrency and paired arithmetic.
**Do not build screens before this passes.**"* The suites themselves are the nine
rows of ADR-035 §2.10.

**Split into 3.1 / 3.2a / 3.2b / 3.3 / 3.4 / 3.5 / 3.6 / 3.7 on 2026-08-22, before
any of it was written**, and **3.2b split again into 3.2b-i / 3.2b-ii the same day**,
also before it was written — see below. **3.6 split again into 3.6a / 3.6b on
2026-09-01**, on the same rule and for the same reason, and **3.7 into 3.7a / 3.7b
the same day**, where reading the ADR against the file it was meant to move showed
the `S` was wrong and the two were never the same claim. **Every piece is now closed** — both
halves of 3.2b, then 3.3, 3.4, 3.5, 3.6a, 3.6b, 3.7a and, on 2026-09-02, **3.7b, the
last task in step 3**. Step 3 was nine suites over two languages and it was the
largest thing between here and the RPCs. One session that tried it whole would
produce a harness nobody reviews and a green nobody can attribute to a claim. 1.3,
1.6 and step 2 each split for that reason; this one splits before it is written, as
1.6 and step 2 did.

**Step 3 ships no migration.** Every task below writes tests and CI wiring only, so
migration numbering is untouched and `0006` / `0007` stay reserved for the RPCs and
the failure path. ⚠️ **3.3 is the first task to use the "CI wiring" half of that
sentence** — it changed `.github/workflows/db.yml`, and not for its own sake: the
harness fix it carries is what makes 01–04's greens mean what they say. Decision below. If a suite finds a schema defect, that defect gets its own
fix-forward number the way `0010` and `0014` did — it is not patched into step 3.

| # | Task | Size | Done when |
|---|------|------|-----------|
| ~~3.1~~ | ~~**The pgTAP harness, and RLS coverage**~~ — **done** 2026-08-22, [CI green on PR #22](https://github.com/bersermi/RetailerManagementTool/actions/runs/32586859359). `supabase/pgtap/` with `_setup.sql`, `_teardown.sql` and `01_rls_coverage.sql`, plus a CI step of its own **between the reset and the seed checks**. **91 tests**: 11 fixed, 2 per table, 1 per policy, on a **computed plan** so a future table is covered the day it lands. **Seven falsifications**, each confirmed to exit non-zero. ⚠️ **pgTAP is not a migration and does not replace `supabase/tests/`** — both decisions are below. ⚠️ **Two findings**: ADR-035 §2.10 names a policy that does not exist, and `public`'s default privileges hand `authenticated` a TRUNCATE that bypasses RLS on every new table | M | ✅ |
| ~~3.2a~~ | ~~**RLS isolation — reads**~~ — **done** 2026-08-22, [CI green on PR #23](https://github.com/bersermi/RetailerManagementTool/actions/runs/32590909747). `supabase/pgtap/02_rls_isolation_reads.sql`, picked up by the existing loop with no workflow edit. **106 tests**: 10 fixed, **4 per tenant table** (each direction, plus "sees all of its own" — which is what a deleted policy turns red), 1 per table for the signed-out caller, on a **computed plan**. **Eight falsifications**, each confirmed to exit non-zero. ⚠️ **Nineteen tenant tables, not twenty** — the count below included `unit`, which is the exempt one. ⚠️ **The suite opens a transaction and rolls it back**; both decisions are below | L | ✅ |
| ~~3.2b-i~~ | ~~**RLS isolation — writes, the three refusals that need no fabricated row**~~ — **done** 2026-08-22, [CI green on PR #24](https://github.com/bersermi/RetailerManagementTool/actions/runs/32597616265). `supabase/pgtap/03_rls_isolation_writes.sql`, picked up by the existing loop with no workflow edit. **151 tests**: 19 fixed, one per grant-wall pair, per cross-tenant measurement, per positive control, per move, per staff probe and per append-only probe, on a **computed plan**. **Twelve falsifications**, each confirmed non-zero. ⚠️ **Two of them found holes in the SUITE, not the schema** — and the finding below is the important one: the tenant wall on writes is held by the `_select` policies, and the write policies are a second layer that crossing the wall cannot see | M | ✅ |
| ~~3.2b-ii~~ | ~~**RLS isolation — writes, inserting a NEW row into workspace B**~~ — **done** 2026-08-23, CI green on PR #26. `supabase/pgtap/04_rls_isolation_writes_inserts.sql`, picked up by the existing loop with no workflow edit. **43 tests**: 11 fixed, one per measurement, on a **computed plan** — eight tables × two target workspaces × two callers. **Twelve falsifications**, each confirmed to exit non-zero. ⚠️ **The pairing is stronger than the done-when asked for**: not the same payload but the SAME STATEMENT TEXT, accepted for the owner of the workspace it names and refused for the other, so the two runs differ in nothing but who is asking (F7). ⚠️ **The finding is the good one** — the `_insert` policies are the one write-policy family a cross-tenant caller can observe directly. ⚠️ **It writes an `auth.users` fixture and rolls it back**; both decisions are below | M | ✅ |
| ~~3.3~~ | ~~**Location isolation**~~ — **done** 2026-08-24, CI green on PR #29. `supabase/pgtap/05_location_isolation_reads.sql`, picked up by the existing loop with no workflow edit. **84 tests**: 14 fixed, on a **computed plan** — 4 per cashier-observable table, 2 per role-gated table, 2 per table for the manager, 2 per table for the closed-store block. **Twelve falsifications**, each confirmed to exit non-zero. ⚠️ **The ten policies split 5/5 and the halves need different actors** — a cashier reads five of them and is refused the other five BY ROLE, so pointing a cashier at a `purchase` proves the role wall twice and the store wall not at all. ⚠️ **The other five are observable only by CLOSING A STORE**, which is the finding this suite was built around. ⚠️⚠️ **AND IT FOUND A HOLE IN THE HARNESS ITSELF, affecting 01–04 as much as 05**: a computed plan that misses turns `exception_on_failure` OFF, silently. Fixed in `.github/workflows/db.yml`. Findings below | M | ✅ |
| ~~3.4~~ | ~~**Ledger invariant over randomised sequences**~~ — **done** 2026-08-25. `supabase/pgtap/06_ledger_invariant_randomised.sql`, picked up by the existing loop with no workflow edit. **99 tests**: 14 fixed, 5 for the C-block, and per run one whole-database measurement, one per location and one anti-vacuity guard, on a **computed plan** — 16 runs x 25 operations = 400 writes on top of the seed. **Recorded seed `0.20260824`**, printed as a diagnostic and overridable with `-v gen_seed=`. **Thirteen falsifications**, each confirmed to fail CI. ⚠️ **The finding is a LIMIT OF THE INVARIANT ITSELF**: deleting the receipt movement from a purchase — a real defect — left all 64 §2.4 assertions GREEN. Sec 2.4 sees a movement that was never *projected*, never one that was never *made*. ⚠️ **It also found the per-file plan guard 3.3 shipped in 05 was itself wrong**, and fixed it in all six files. Findings below | M | ✅ |
| ~~3.5~~ | ~~**Money and units, in pgTAP**~~ — **done** 2026-08-26. `supabase/pgtap/07_money_and_units.sql`, picked up by the existing loop with no workflow edit. **155 tests**: 16 fixed, 1 per unit denomination, 1 per withdrawal, 4 per money case, 3 per document case, 2 per pack case and 2 per money column, on a **computed plan**. **Eighteen falsifications**, each confirmed to fail the CI step. ⚠️ **The suite is half verification and half specification, and the header says which is which** — rules 1, 5 and 6 are asserted over the applied schema and all 3 448 seeded lines; rules 2–4 have no SQL implementation to test, because that is `0006`. ⚠️ **§2.5 asks `cases.json` for a half-centavo boundary per tax rate and the tax division has none — provably.** ⚠️ **`round(float8)` is banker's**, so rule 1 is the precondition for rule 6 rather than a style preference. ✅ **The purchase side is net-first where §2.5 read gross-first — put to the owner and SETTLED 2026-08-26: direction follows the document, tax stays the residual on both.** ADR-035 §2.5 rules 2–4 amended; no migration and no seed change, because on a net-first line the two spellings are provably the same number. Follow-up shipped 2026-08-27 — **181 tests, twenty-five falsifications**, six buy-side cases, F17 and F18. Findings below |
| ~~3.6a~~ | ~~**`packages/money` and `cases.json`, and the Vitest half**~~ — **done** 2026-09-01. The first TypeScript in the repo: a root npm workspace, `packages/money/{cases.json,src/money.ts,src/cases.ts,test/cases.test.ts}` and `.github/workflows/money.yml`, the first CI workflow that is not `db.yml`. **105 tests** over all twenty-one cases, lifted from `07` **by id** with every literal verified identical and every expectation re-derived in Postgres `numeric` on a fresh reset. **Thirteen falsifications**, each confirmed to exit non-zero. ⚠️⚠️ **The finding is a LIMIT OF THE CASE TABLE**: no case in it can fail for a float — its boundaries are ties IEEE754 happens to hold exactly, and 436 shop-sized lines that would catch one are all outside the table. ⚠️ **Rule 4 on the sell side is carried by exactly one case (M9).** ✅ **Vitest has no vacuous green**, but the workspace loop above it does, and the workflow guards it. Findings below | M | ✅ |
| ~~3.6b~~ | ~~**Re-pointing `07_money_and_units.sql` at `cases.json`**~~ — **done** 2026-09-01. 07's M, B, D and P blocks are built with `jsonb_array_elements` from `packages/money/cases.json`; the hand-written fork is deleted, not duplicated. **192 tests** (from 181), on the same computed plan, with **F19–F21** added as the discriminator guards. **Ten falsifications**, each confirmed to fail. ✅ **§2.10's sentence is now true**: one file, two readers — proved by editing one value three times and watching BOTH suites go red. ✅ **M10 and M11 added on the owner's decision** (2026-09-01), closing 3.6a's two findings: the table can now fail for a float, and rule 4 no longer rests on M9 alone. ⚠️ **`pg_read_file()` is unusable** — it runs in the server, which is a container that cannot see this repo — so psql reads the file client-side, and `db.yml`'s `paths:` filter had to grow the path. Findings below | M | ✅ |
| ~~3.7a~~ | ~~**The two-connection TypeScript harness, and the idempotency half of §2.10's concurrency row**~~ — **done** 2026-09-02, [CI green on PR #36](https://github.com/bersermi/RetailerManagementTool/actions/runs/33597446943). `supabase/vitest/` as a second npm workspace (`@tienda/db-concurrency`), driving real connections through `pg`, plus the `setup-node` / `npm ci` wiring `db.yml` has never had. **9 tests**: three races over each of `sale`, `purchase` and `waste` — the retry that blocks then inserts nothing, the one rejected with `23505` without `on conflict`, and the abort branch where the waiter inserts. **Seven falsifications**, each confirmed to exit non-zero, **all seven run locally** — the first DB suite in this repo the schema owner's machine can run, because node-postgres needs no `psql`. ✅ **The guard names the blocker**: `pg_blocking_pids(b) = [a]`, where the `.sh` could only count that some lock wait existed. ⚠️ **Half of §2.10's concurrency row is owed by step 4** — the enforcement clause lives in `record_sale`. ⚠️ **This is the first `db.yml` step that empties the database**, so its position at the end is load-bearing. Findings below | M | ✅ |
| ~~3.7b~~ | ~~**The `.sh`, and what §2.10's concurrency row still owes**~~ — **done** 2026-09-02, [CI green on PR #37](https://github.com/bersermi/RetailerManagementTool/actions/runs/33672536563). **PORTED AND RETIRED**: `supabase/tests/0005_allocation_concurrency.sh` is deleted and its claim is `supabase/vitest/test/allocation-race.test.ts`, **7 tests** on the 3.7a harness — the workspace now stands at **16**. **Five falsifications**, each confirmed to fail, **all five run locally**, which the `.sh` never was. Read from the job log: *16 two-connection assertions ran against the reset database*, *4 behavioural suite(s) ran* from the loop the `.sh` left, and `0003`'s 39, `0004`'s 54, `0005`'s 55 and `0008`'s 46 all still pass beside *7 pgTAP suite(s) ran* and *6 seed check file(s) ran*. ✅ **The port is not a transliteration — one assertion got stronger.** The `.sh` could only see that its second backend sat in *some* lock wait, which its own header admits discriminates nothing; separate round trips let the wait be observed **while only the allocation `select` is outstanding**, so deleting `for update of bb` now empties `pg_blocking_pids()` (W1). ⚠️ **The `.sh`'s own discriminator is kept** — WHICH LOT session 2 ends up with — because a block in the right place is still not the property. ⚠️ **This is NOT §2.10's concurrency row and the files say so in three places**: it is task 1.3b's claim, and it asserts the OPPOSITE outcome to §2.10's enforcement clause. ⚠️ **`db.yml`'s behavioural loop lost its `.sh` branch and gained a counter**; 3.7a's V6 is weaker as a result. Findings below | S | ✅ |

Order is forced by the harness, not by foreign keys. **3.1 is first because nothing
else in step 3 can be evidence until a failing pgTAP assertion is proven to fail the
build** — a suite that cannot go red is the vacuous green ADR-035 §9 exists to
refuse, and it is exactly what a `select ok(false)` printed to stdout under plain
`psql` looks like. 3.6 comes after 3.5 because writing `cases.json` first and the
SQL assertions second would let the data file be shaped to whatever the SQL already
does, which is the drift the file exists to prevent.

### 3.7 was split on 2026-09-01, before it was written — and it was NOT an `S`

**3.7 was sized `S` on the assumption that the concurrency suite already exists in
bash and the task is to move it.** Reading ADR-035 §2.10 against
`supabase/tests/0005_allocation_concurrency.sh` before writing anything shows that
assumption is false in both directions, so the row is re-sized and split.

⚠️ **THE `.sh` IS NOT §2.10's CONCURRENCY SUITE. IT NEVER WAS.** The two files make
different claims about different code, and the `.sh` says so in its own header — it
cites **`docs/PLAN.md` task 1.3b**, not §2.10:

| | Claim | Outcome asserted |
|---|---|---|
| `0005_allocation_concurrency.sh` | *"two concurrent allocations cannot oversell one batch"* | **BOTH sessions succeed.** S1 takes lot P, S2 waits, re-reads, takes lot Q. 200 asked, 200 delivered |
| ADR-035 §2.10, concurrency | *"two sessions, last unit, enforcement on → exactly one succeeds"* | **ONE session succeeds and one is refused** |

They are not the same test with a different runner. The `.sh` proves
`allocate_fefo()`'s `for update of bb` re-reads after it unblocks; §2.10's first
clause proves the **availability check refuses the loser**, and that check is
`record_sale`'s, in `0006`. "Port and retire" would therefore delete a falsified,
working assertion that §2.10 never asked for and that nothing else in this repository
makes — which is why 3.7b is a decision taken *after* the harness exists, and not a
foregone conclusion in a done-when.

⚠️ **AND ADR-035 AND THIS PLAN DISAGREED ABOUT THE RUNNER — THE ADR WINS.** §2.10's
`Where` column for concurrency reads **"TypeScript, two connections"**. 3.7's
done-when as written offered *"or it stays"* as an equal option, which is permission
to leave §2.10's row in bash forever. Per `CLAUDE.md`, when the plan and the ADR
disagree the ADR wins and the plan is the bug, so **the §2.10 concurrency suite is
TypeScript** and 3.7a builds it. What 3.7b still genuinely gets to decide is the
fate of the **1.3b allocator suite**, which §2.10 does not govern.

**So the seam is the same one 3.6 split on: 3.7a bootstraps a harness and ships one
standalone claim; 3.7b changes an already-green, already-falsified suite.**

- **3.7a bootstraps a second language *into `db.yml`*.** 3.6a introduced TypeScript,
  but into a workflow with no database — `money.yml` boots nothing. Nothing in this
  repository has ever run Node against the reset Postgres: `db.yml` has no
  `setup-node`, no `npm ci`, and every one of its four steps reaches the database
  through `psql`. 3.7a adds that path and proves it can go red.
- **3.7b changes a load-bearing file.** The `.sh` is 203 lines of two-session
  synchronisation with no sleeps, and its own header spells out an earlier draft that
  **passed green with the locking clause deleted**. Rewriting it is not a
  transliteration; it is re-deriving why each wait is observed rather than assumed.

Written as one task, a context clear in the middle leaves a half-built harness and a
half-ported race, and the second is worse than either.

### ⚠️ Found before 3.7a was written — MOST OF §2.10's CONCURRENCY ROW IS OWED BY STEP 4, NOT BY STEP 3

§2.10's last row is two sentences, and they are not both writable against the applied
schema. This is the same shape as the failure-path and replay rows already recorded
under *What step 3 does NOT ship* — named here so 3.7a's green is not read as the
whole row.

| Clause | Writable now? | Why |
|---|---|---|
| *"Two identical calls, same id → exactly one row"* | ✅ **Yes** — this is 3.7a | The mechanism is `id uuid primary key` with no default plus `on conflict (id) do nothing`, and both halves are in `0003`. All three document headers carry it |
| *"Two sessions, last unit, **enforcement on** → exactly one succeeds"* | ❌ **No** | The enforcement path is inside `record_sale` — ADR-035 §2.6, *"the RPC contains the enforcement path: lock the open batches for the variant, evaluate availability, then insert or raise"* — and `record_sale` is `0006`, **step 4**. `workspace_setting.enforce_stock_default` exists in `0001` and defaults `false`; there is nothing today for it to switch on |

⚠️ **Two further idempotency behaviours are `0006`/`0007`, not `0003`.** §2.6's table
has four rows; the schema can carry two of them. *Same id + same payload →
`already_recorded: true`* is a return value, and a table has no return value. *Same
id + different lines → raise and dead-letter* needs `failed_write`, which is `0007`
(**step 4.5**). `payload_hash` is on all three headers already, so the column the
discriminator reads exists — the discriminator does not.

**So 3.7a asserts the platform behaviour §2.6 decision 7 bet on, and step 4 owes the
rest.** The bet is worth measuring on its own: §2.3 records that *"a duplicate primary
key is an error, not a no-op"* was the reason the semantics had to be specified at
all, and §2.6 asserts that a second call arriving mid-flight *"blocks on the row lock
until the first commits or aborts"*. Both are claims about Postgres under a real race
that no single-connection suite can make.

### ✅ Found in 3.7a — `pg_blocking_pids()` NAMES THE BLOCKER, AND THE `.sh` COULD ONLY COUNT WAITS

The `.sh` observes its race with

```sql
select count(*) from pg_stat_activity where pid = $S2 and wait_event_type = 'Lock'
```

which is true of *any* lock wait by that backend — an autovacuum truncate, a
concurrent index build, the observer's own transaction. `pg_blocking_pids($waiter)`
returns the pids actually blocking it, so the guard here is an equality:

```ts
expect(await blockedBy(observer, b.pid)).toEqual([a.pid]);
```

**This is the assertion the whole suite rests on**, because every other line in it is
*also* true of two calls that never overlapped: the second would find the row already
committed, insert nothing under `on conflict do nothing`, and "exactly one row" would
come out identical. Falsification **V2** is exactly that — commit the first call
before the second starts — and it goes red on all three headers with `[] ≠ [a.pid]`.
Falsification **V5** points the same assertion at the wrong backend and all nine go
red, which is what makes the *identity* of the blocker part of the claim rather than
decoration.

### ✅ Found in 3.7a — THE ABORT BRANCH IS THE ONLY THING THAT TELLS A RETRY FROM A REFUSAL

ADR-035 §2.6's third row reads *"blocks on the row lock until the first commits **or
aborts**, then either sees the row or **inserts**"*. Both halves matter and only the
second is discriminating. An implementation that returned "0 rows inserted"
unconditionally — a table with a `before insert … return null` trigger, say — passes
race 1 and race 2 on every header. Race 3 rolls the first call back and asserts the
waiter **inserts**, and that the surviving row carries the **second** call's
`payload_hash`. Falsification **V4** commits where race 3 expects a rollback; three
tests go red and the other six stay green, which is the shape a discriminator should
have.

### ⚠️ Found in 3.7a — THIS IS THE FIRST STEP IN `db.yml` THAT EMPTIES THE DATABASE, AND ITS POSITION IS NOW LOAD-BEARING

Every suite in `supabase/tests/` is preceded by `_cleanup.sql` **by the workflow**.
This one runs the same file **itself**, from inside the suite, because it has no
`psql` to run it with — and that moves the truncate from the workflow's control into
the suite's. So the step must be **last**, below the seed checks and below the
behavioural checks, or those steps measure an empty database.

⚠️ **They would go red, not quiet — checked, not assumed.** Every file in
`supabase/checks/` opens with a pre-flight block that raises unless the seed still
holds what the file is about, and pgTAP 02–07 assert absolute counts over the seed.
That is a property those files already had for their own reasons, and it is what makes
this step's position safe to state rather than merely hope for. **It is still stated**,
on the step, because the redness it produces reads like a schema defect rather than a
misordered workflow, and the next person to reorder these steps should not have to
work that out from a failing margin reconciliation.

### ✅ Found in 3.7a — THE SCHEMA OWNER CAN RUN THIS ONE, AND THAT WAS NOT TRUE OF THE `.sh`

`docs/PLAN.md` records under 3.1 that `supabase/tests/0005_allocation_concurrency.sh`
**has never been run outside CI**: it shells out to `psql`, `psql` is not installed on
the schema owner's machine, and its 9 checks fail with `command not found` on every
one. node-postgres speaks the wire protocol directly, so this suite needs no Postgres
client at all — it was run locally against a fresh `supabase db reset`, green, and
every one of the seven falsifications below was run locally too.

⚠️ **That is a fact about 3.7b, not just a nicety.** "Port the `.sh` and retire it"
would turn a suite nobody can run locally into one anybody can — which is an argument
*for* porting that did not exist when 3.7 was written, and it should be weighed
against the argument below for leaving it alone.

### Settled in 3.7a, and binding on 3.7b

Seven decisions made on the owner's behalf. None needs a migration and none is
expensive to overturn, but each shapes 3.7b and the step-4 suites that inherit this
harness.

**1. 3.7 was re-sized from `S` and split into 3.7a / 3.7b.** The `S` assumed the suite
already existed in bash and the task was to move it. It did not: the `.sh` and §2.10's
concurrency row are different claims about different code, and neither half of §2.10's
row was written anywhere. Reasoning in full above.

**2. ⚠️ THE ADR WON A DISAGREEMENT WITH THIS PLAN. §2.10's concurrency suite is
TypeScript.** 3.7's done-when offered *"or it stays"* as an equal option, which is
standing permission to leave that row in bash. §2.10's `Where` column says *"TypeScript,
two connections"*, and `CLAUDE.md` says the ADR wins and the plan is the bug. **What
3.7b still decides is the fate of the 1.3b ALLOCATOR suite**, which §2.10 does not
govern — a genuinely open question, not a formality.

**3. It lives in `supabase/vitest/`, not under `packages/`.** ADR-035 §2.10's team-shape
table splits ownership by path: `supabase/**` is the schema owner's, `app/**` is the
juniors'. A suite about row locks and primary keys is schema-owner work, so putting it
under `supabase/` routes review correctly with the CODEOWNERS lines the ADR already
specifies, instead of needing a fourth. It also lands inside `db.yml`'s existing
`supabase/**` paths filter, so a change to it runs the workflow that owns its database.

**4. Its npm script is `test:db`, not `test`.** The root manifest runs
`npm run test --workspaces --if-present`, so a script named `test` here would make a
bare `npm test` fail on every machine with no database up — which is every machine that
has only ever touched `packages/money`. `typecheck` keeps its ordinary name, because it
needs nothing. ⚠️ **The cost is that `npm test` at the root is no longer "run
everything"**, and the README says so in both places.

**5. Every connection is the `postgres` superuser, and the suite makes NO RLS claim.**
Row locking and primary-key conflict resolution are neither created nor removed by a
policy, and an isolation claim made as superuser passes vacuously — the trap
`supabase/README.md` opens with. Isolation belongs to pgTAP 02–05 under
`set role authenticated`, and this file says so in its header rather than leaving a
reader to wonder whether it was an oversight.

**6. `db.yml` installs Node 22 only, where `money.yml` runs a 22/24 matrix.** The matrix
exists in `money.yml` because integer arithmetic *should* be engine-independent and
"should" is the class of claim ADR-035 §1 distrusts. Nothing here is arithmetic: the
property under test is Postgres-side, the client only observes it, and `db.yml` is
already a ten-minute job that boots a database. Doubling it to re-measure a wire
protocol buys nothing.

**7. `db.yml`'s `paths:` filter grew `package.json` and `package-lock.json`.** The
workflow now runs `npm ci`, so the lockfile decides what it installs — and without
these lines a dependency bump could turn the concurrency suite red on `main` having
passed no PR. Same argument that put `packages/money/cases.json` in this filter at 3.6b.

### Seven falsifications, run by hand before 3.7a was committed

A race that does not race is the easiest kind of green to write, and it looks exactly
like a real one. Each of these was introduced, the suite run, the failure read by name,
and the change reverted. **All seven ran locally**, which is itself new — see the
finding above.

| Falsified | Result |
|---|---|
| **V1** `alter table public.sale drop constraint sale_pkey cascade` | 9 red — *"there is no unique or exclusion constraint matching the ON CONFLICT specification"* |
| **V2** the first call **commits before the second starts**, so there is no race | 3 red on the guard alone: `[] ≠ [a.pid]`. The other six untouched, which is the point — every count assertion still passed |
| **V3** `on conflict (id) do nothing` → `do update set payload_hash = excluded.payload_hash` | 9 red. §2.6 decision 7's verb is load-bearing |
| **V4** race 3's `rollback` → `commit` | 3 red, 6 green. The abort branch is the discriminator |
| **V5** the guard asserts `[observer.pid]` instead of `[a.pid]` | 9 red. The blocker's identity is part of the claim |
| **V6** the suite file removed | `No test files found, exiting with code 1` — the failure mode that is otherwise silent |
| **V7** `DB_URL` unset | exit 1, *"DB_URL must be set"*. The harness refuses rather than reaching for a default |

### ✅ Found in 3.7b — THE PORT WAS NOT A TRANSLITERATION: ONE ASSERTION BECAME A DISCRIMINATOR

The `.sh` observed its race with two statements queued into a single psql script, so
the only thing it could ask was whether backend S2 sat in *some* lock wait at some
point. **Its own header admits that discriminates nothing** — without
`for update of bb` the second session still blocks, just later, inside the projection
trigger whose `on conflict (batch_id) do update` collides with the first session's
uncommitted row — and it records that an early draft *passed green with the locking
clause deleted*.

Two connections in TypeScript are two separate round trips, so the wait is observed
**while only the allocation `select` is outstanding and before session 2 has written
anything**. That changes the question from *did it wait* to *did it wait HERE*:

| | With `for update of bb` | Without it |
|---|---|---|
| `pg_blocking_pids(b)` while the `select` is in flight | `[a.pid]` | **`[]`** — the select returns at once, the wait moves to the movement insert |

So the assertion the `.sh` could only make as decoration is a discriminator here.
**Measured, not argued: W1 deletes the clause and three of the seven tests go red**,
and the oversell prints as `-100/100` — a lot 100 units in debt while a whole lot sat
untouched. ⚠️ **The `.sh`'s own discriminator is kept beside it** — WHICH LOT session
2 ends up with — because a block in the right place is still not the property, and
W5 below is what proves that sentence rather than asserting it.

### ⚠️ Found in 3.7b — THE §2.4 INVARIANT IS GREEN IN THE OVERSOLD WORLD, WHICH IS THE THIRD TIME THIS SHAPE HAS APPEARED

Under W1 both sessions allocate lot P, the shop sells 200 units of a lot that held
100, and `batch_balance_violations()` **reports nothing**: the movements and the
projection agree perfectly about a number that should never have been written. The
suite asserts the invariant anyway — a race that broke the projection would be a
second and worse defect — but the plan should not read that green as evidence about
overselling.

This is the same limit 3.4 found (§2.4 sees a movement that was never *projected*,
never one that was never *made*) and the same shape as 3.6a's limit of `cases.json`.
**It is why this claim is a race and not a check.**

### ⚠️ Found in 3.7b — WAITING IS NOT THE PROPERTY, AND ONE FALSIFICATION SEPARATES THEM CLEANLY

W5 leaves `for update of bb` intact and simply has session 1 **allocate without
writing its withdrawal**. Session 2 still blocks, and the blocker is still session 1 —
that test stays green — but session 2 re-reads a ledger in which nothing was taken,
takes P again, and the lots end `0/100`. Two tests red, and neither of them is the
wait.

That is the `.sh`'s design argument reproduced as a measurement: the mechanism under
test is the **re-read after the unblock**, and a suite that asserted only the wait
would be measuring the one thing both worlds share.

### ⚠️ Decided in 3.7b — 3.7a's V6 IS WEAKER NOW, AND THE COUNT IS DELIBERATELY NOT PINNED

3.7a's V6 was *"the suite file removed → `No test files found`, exit 1"*. With two
files in the workspace, deleting one leaves the other and the step goes green on 9
tests. **The shrink gap named in `db.yml`'s comment is now reachable by deleting a
file, not only by deleting tests.**

It is recorded rather than closed, and the reason is the precedent `money.yml` set:
the count is printed from the JSON reporter for a reviewer to read (**16** as of
3.7b), and pinning a minimum would make every added test an edit to a workflow. That
trade was made once already and this task does not re-open it — but the loss is real
and it belongs in this file rather than in nobody's head.

⚠️ **The other half of the same concern went the other way.** `db.yml`'s behavioural
loop had **no counter at all**, and this task takes a file out of the directory it
scans. A glob that matched nothing there would print nothing and exit 0 — the vacuous
green ADR-035 §9 refuses — so the loop now counts what it ran and fails at zero, the
same guard the pgTAP and seed-check loops have had since 3.1 and 1.7.

### Settled in 3.7b

Four decisions made on the owner's behalf. The first is the task's whole subject.

**1. THE `.sh` IS PORTED AND RETIRED.** 3.7's done-when left this genuinely open and
3.7a sharpened both sides of it. It went this way on the argument 3.7a turned up:
`supabase/tests/0005_allocation_concurrency.sh` needs `psql`, the schema owner's
machine has none, and **it has never once been run outside CI**. A suite that only CI
can run is a suite nobody consults while changing the function it is about — and
`allocate_fefo()` is what **step 4's `record_sale` calls**, so that is about to matter
more than it ever has. Against that: rewriting 203 lines of falsified two-session
synchronisation risks a subtly weaker test. **That risk was paid down rather than
argued away** — five falsifications, including the one the `.sh` was built around
(delete `for update of bb`), all run locally.

**2. The claim keeps its own file and its own name — `allocation-race.test.ts`, not a
third block inside `idempotency.test.ts`.** It is a different claim about a different
mechanism, owed to task 1.3b and not to §2.10, and it asserts the OPPOSITE outcome:
both sessions succeed. Filing it under §2.10's file would have made the suite's own
name a lie about half its contents. Three files say which is which — the suite header,
`supabase/vitest/README.md`, and the step comment in `db.yml`.

**3. The race runs ONCE, in `beforeAll`, and each claim is a test over what it
recorded.** The idempotency suite beside it runs a fresh race per test, which is right
for three independent two-statement races and wrong for one seven-observation
sequence: re-racing seven times to assert seven things about it would make a
mid-sequence failure take every later test with it. The cost is that a failure in the
race itself surfaces as a hook error, which is loud and names the line.

**4. `db.yml`'s behavioural loop lost its `.sh` branch.** A `.sh` added to
`supabase/tests/` now fails on the `unrecognised test file` branch instead of running.
That is deliberate: the two-connection home in this repository is the Vitest
workspace, and a second one would split the harness. Reversing it is three lines.

### Five falsifications, run by hand before 3.7b was committed

A ported race that quietly stopped racing would look exactly like the original.
Each of these was introduced, the suite run against a fresh `supabase db reset`, the
failure read by name, and the change reverted. **All five ran locally, on a machine
with no `psql`** — which is the whole argument for the port, exercised on the day it
landed.

| Falsified | Result |
|---|---|
| **W1** `for update of bb` deleted from `allocate_fefo()` (`create or replace` over the live function) | **3 red.** `pg_blocking_pids()` returns `[]`, session 2 takes P, and the lots print `-100/100` — the oversell, with the §2.4 invariant still green beside it |
| **W2** session 1 **commits before session 2 begins**, so there is no race | **2 red**, and the other five green — `[] ≠ [a.pid]`, and the movement count reads 3 where a live race reads 2. Every lot assertion still passes, which is exactly why the guard exists |
| **W3** the guard asserts `[observer.pid]` instead of `[a.pid]` | **1 red.** The blocker's identity is part of the claim |
| **W4** the fixture's expiry dates inverted, so **Q** expires first | **3 red**, including the fixture test itself — added in response to this falsification, which the first draft's `100/100` check sailed through. The premise is now asserted on the allocator's own three keys |
| **W5** session 1 allocates but **never writes its withdrawal** | **2 red**, and the wait is not one of them: session 2 blocks, re-reads a ledger nothing was taken from, takes P again, and the lots end `0/100`. The re-read is the mechanism, not the wait |

### 3.6 was split on 2026-09-01, before it was written

**3.6 was the last `L` in step 3, and it is two jobs wearing one number.** The seam is
not the file boundary — it is what each half can go red for.

- **3.6a bootstraps a language.** There is no `package.json`, no lockfile, no
  `tsconfig`, no test runner and no second CI workflow in this repository today. It
  also writes the arithmetic itself, in a language that has *neither* of the two
  things §2.5 rule 6 depends on: `Math.round` is half-up toward **+∞**, not away from
  zero, and `0.073 * 5` is not `0.365` in IEEE754. A green here means the TypeScript
  half computes all twenty-one cases to the centavo.
- **3.6b changes an already-green suite.** 07 stands at 181 tests and twenty-five
  falsifications; re-pointing its four case blocks at a JSON file on disk means
  getting that file into `psql`, deleting ~140 lines of hand-written fixture, and
  proving the twenty-five falsifications still fail afterwards. Nothing it touches is
  new; everything it touches is load-bearing.

Written as one task, a context clear in the middle leaves a half-built package and a
half-re-pointed suite, and the second is worse than either. **3.6a ships something
that stands on its own** — a Vitest suite green in CI over a data file — and 3.6b is
then a single-purpose change to one SQL file. The done-when of the pair is still
§2.10's sentence: **one data file, read by both sides.** 3.6a writes the file and one
reader; 3.6b moves the second reader onto it. ⚠️ **Until 3.6b lands, the fork 3.5
declared is still a fork** — 3.6a shrinks the drift window, it does not close it, and
this plan says so rather than letting the Vitest green read as the whole claim.

### ✅ SETTLED BY THE OWNER, 2026-09-01 — TWO CASES ADDED, AND WHY NOT FOUR

3.6a found two ways the case table was thinner than it looked. Both were put to the
owner at the 3.6a merge and answered the same day: **add exactly two cases, in 3.6b,
on the one commit where both readers are edited together.** Shipped.

| Id | What | Catches |
|----|------|---------|
| **M10** | 250 g at $13.90 the kilo, 16% — `gross 3.48 / net 3.00 / tax 0.48` | IEEE754. `0.0139 × 250 × 100` is `347.49999999999994`, so a double says **3.47** |
| **M11** | a $2.50 shelf line, 16% — `gross 2.50 / net 2.16 / tax 0.34` | §2.5 rule 4. The forbidden `round(net × rate)` says **0.35** |

**M10 is not a new kind of case — it is M5 chosen for a second property.** A weighed
quarter kilo landing on a half centavo is a shape the table already had; M5's tie
(6.465) simply happens to be one a double holds exactly. ⚠️ **And it discriminates on
the TypeScript side only** — Postgres computes the anchor in `numeric` and answers
3.48 either way, so in `07` it is an ordinary boundary. It earns its place in the
shared file because it is the only thing standing between `packages/money` and a float
rewrite.

**M11 errs in the OPPOSITE direction from M9**, and that is the point of a second one:
M9's forbidden spelling is a centavo low (1.65 against a residual of 1.66), M11's is a
centavo high (0.35 against 0.34). A broken split off by a consistent sign would pass a
table of same-direction cases. Rule 4 disagrees on **2 759 of 20 000** sell grosses, so
this is common rather than exotic.

**Two and not four, for two separate reasons.** No buy-side `residual_tax` case is
*writable* — on the purchase side `round(net × (1 + rate)) − net` and
`round(net × rate)` are the same number for every net and rate (§2.5 rule 4's own
warning, asserted in F17). And a buy-side float case would exercise the same shared
`round(unit_price × qty)` expression M10 already covers. The table is **23 cases**, not
25.

### ✅ Found in 3.6b — NEITHER TAX STEP CAN DISAGREE WITH A FLOAT EITHER, WHICH IS WHY ONE CASE IS ENOUGH

The reason M10 alone closes the float gap, measured rather than argued. Every value
from one centavo to **$20 000** was run through both tax steps twice, once in exact
integer arithmetic and once in doubles:

```
sell tax DIVISION,       exact vs float, over 2M centavo grosses :  0 disagreements
buy  tax MULTIPLICATION, exact vs float, over 2M net values      :  0 disagreements
```

**Zero, on both sides.** It follows from 3.5's F9 and F18: the tax steps cannot produce
a half-centavo tie at the two rates this schema carries, and float only ever differs
*at* a tie — every one of the 436 float disagreements found in 3.6a's sweep sits on an
exact tie.

✅ **So all three discriminator groups live in `round(unit_price × qty)`, and that is a
result rather than a convention.** §2.5 already says this of the rounding direction
(the ⚠️ added after 3.5). It is equally true of the float, for the same reason, and
`cases.json` now says so where both readers can see it. **F20 asserts it** — every
rounding discriminator's anchor is on a half centavo, or the build goes red.

### ⚠️ Found in 3.6b — `pg_read_file()` IS UNUSABLE HERE, AND THE `paths:` FILTER BECAME A CORRECTNESS CONCERN

The obvious way to get a JSON file into a pgTAP suite is `pg_read_file()`. It cannot
work: **it runs in the server, and the server is a Docker container with no view of
this repository** — `docker inspect` shows one mount, the data volume. So psql reads
the file **client-side**, with `\set cases_json `cat …``, relative to the caller's
working directory.

Three consequences, all recorded in the suite header and `supabase/README.md`:

1. **The default path assumes the repo root**, which is what CI does and what every
   invocation the README documents does. A run from elsewhere passes `cases_path`.
2. **A machine with no host `psql` needs the third form** — `-v cases_json="$(cat …)"`
   through `docker exec`. This machine is one, which is how the constraint was found.
3. ⚠️⚠️ **`packages/money/cases.json` had to enter `db.yml`'s `paths:` filter**, and
   that line is not a convenience. Without it, editing the case table would not run the
   SQL half of §2.10's claim — the one commit most likely to break it would test only
   one side. The same file is now an input to both workflows, named explicitly in both.

⚠️ **A file that cannot be read used to fail with `ERROR: invalid input syntax for
type json` four hundred lines later** — true, non-zero, and useless to a reader. The
suite now checks `length(:'cases_json') = 0` up front and prints the three invocations
before raising. The raise is a `do $$ … $$` block that mentions no variable, because
**psql does not interpolate inside a dollar-quoted body** and there is no other way to
fail a plain SQL statement on purpose.

### ✅ Found in 3.6b — THE ONE-FILE CLAIM IS TESTABLE, AND WAS TESTED

§2.10 asks for *"one data file, read by both … asserting equality to the centavo. Not
two copies of the same expectations."* That is a claim about what happens when the file
changes, so it was falsified that way rather than by inspection — one value edited,
both readers run:

| Edit to `cases.json` | pgTAP | Vitest |
|---|---|---|
| `M5` net `5.58` → `5.59` | exit 3, 1 `not ok` | exit 1, 3 failed |
| `M9` tax `1.66` → `1.65` | exit 3, 1 `not ok` | exit 1, 2 failed |
| `B6` gross `-0.43` → `-0.42` | exit 3, 1 `not ok` | exit 1, 2 failed |

Under the fork this table was impossible to write: an edit to `cases.json` moved
nothing in `07`, and an edit to `07` moved nothing in Vitest. **That is the whole
difference between drift being structurally impossible and merely tested for**, and it
is now a measurement.

⚠️ **The other five falsifications are the vacuity ones**, and they matter because a
data file is a new way for a suite to assert nothing: `M8` deleted (F19 red, exit 3),
`M11` deleted (F21 red, exit 3), `M10`'s expectation drifted (1 `not ok`), the `lines`
block emptied (**zero tests run**, exit 3, caught by the load guard rather than by a
failing assertion), and the whole `discriminators` block deleted (F19/F20 red). Ten in
all, counting the three above and the two file-access ones.

### ⚠️⚠️ Found in 3.6a — NOTHING IN `cases.json` CAN FAIL FOR A FLOAT, AND THAT IS NOT A GAP SOMEBODY FORGOT

§2.5 rule 1 — *no floating point anywhere in the money path* — is the precondition
for rule 6, which is 3.5's finding and is why `packages/money` holds no fractions at
all. **The case table cannot see it.**

IEEE754 does lose these ties, and at ordinary shop magnitudes:

```
0.00026 * 250 * 100  =  6.499999999999999     -- 250 g at $0.26 the kilo
0.000575 * 1000 * 100 = 57.49999999999999     -- 1 kg at $0.575 the kilo
```

Half-up sends the exact value to 7 centavos and the double to 6. A sweep of 1.6
million shop-sized `unit_price × qty` combinations found **436 such lines**.

⚠️ **Not one of them is in `cases.json`.** The four boundaries the table carries —
0.365, 6.465 and their reversals — are ties a double happens to hold *exactly*:
`0.073 * 5 * 100` is 36.5 on the nose, and `0.02586 * 250 * 100` is 646.5. So a
naive float implementation with the RIGHT rounding direction reproduces all
twenty-one cases. Measured, not assumed: the only two the table catches are M8 and
B6, and they fail for `Math.round`, not for the float.

**This is the same shape as 3.4's finding about §2.4** — the table sees the rounding
that was performed, never the type it was performed in. Recorded rather than patched,
for the reason the ordering rule exists: **a new case must land in `cases.json` and in
`07` on the same commit**, or the drift the file exists to prevent is created while
closing it. ⚠️ **Binding on 3.6b, which is where both readers are edited at once.**
The candidate is named and costs nothing: a sell line at `0.000260 × 250.000`, rate
0.16, expecting a gross of `0.07`. Rule 1 is meanwhile defended where it actually
bites — `07` F5 over `information_schema`, the integers in `money.ts`, and one direct
measurement in the Vitest suite that does not go through the table.

### ⚠️ Found in 3.6a — RULE 4 ON THE SELL SIDE IS CARRIED BY EXACTLY ONE CASE

Falsification V3 replaced the sell-side residual with the spelling §2.5 rule 4
forbids — `tax = round(net × rate)`, net backed out of it. **Two tests went red, and
both were M9.** The other eight sell cases agree with the forbidden spelling to the
centavo.

That is a thin margin for the rule the owner spent 3.5's decision on. It is not
wrong — one discriminating case is enough to fail a build — but it is worth saying
that the seed measures the same rule over **118 disagreeing sale lines of 2 263**
(`07` F8), and the case table measures it over **one of nine**. The two readers are
not equally sharp here, and a future edit that dropped M9 as "redundant with M1"
would leave rule 4 unasserted on the sell side of `cases.json` with everything still
green. ⚠️ **Binding on 3.6b and on `0006`**: M9 belongs in the discriminator note
beside M8 and B6, on its own rule.

### ✅ Found in 3.6a — VITEST HAS NO VACUOUS GREEN, AND THE WORKSPACE LOOP DOES

The question this repo asks of every new harness — 3.1 asked it of pgTAP, 3.3 found
the answer was worse than it looked — is whether a suite that asserted nothing can
exit 0. **Vitest cannot**, and all four ways were checked by hand:

| | What was done | Exit |
|---|---|---|
| V6 | every decimal in `cases.json` turned into a JSON number | **1** — the reader throws during collection |
| V11 | the test file deleted | **1** — `No test files found, exiting with code 1` |
| V12 | the `lines` block emptied | **1** — the reader refuses an empty block |
| V13 | one expectation drifted by a centavo (M5 net `5.58` → `5.59`) | **1** — three tests red |

⚠️ **But the workspace loop above it can.** `npm run test --workspaces --if-present`
exits 0 with a straight face if the package is gone or its `test` script renamed —
which is the "loop that matched nothing" hazard `db.yml` already guards for suites
and checks. So `money.yml` names the workspace explicitly and asserts the test count,
failing if it is absent or zero. A count that goes *down* is something a reviewer can
see in the log; a tick is not.

⚠️⚠️ **And the first spelling of that guard failed its own first CI run, on a suite
that was GREEN.** It grepped Vitest's `Tests  105 passed` summary line; Vitest wraps
that line in ANSI colour codes, so `^ *Tests` never matched, the count came back empty
and the guard fired on itself. The direction was right — it refused rather than
assumed — but **a guard that can only be trusted while a reporter's formatting holds
still is not a guard**, and this one would have gone quiet the moment somebody piped
it somewhere that stripped the escapes. It now reads `--reporter=json`, which is a
contract, and asserts `success`, `numTotalTests > 0` and `numFailedTests === 0`
separately. Re-falsified against V11, V12 and V13 after the change: all three are
caught by the report itself, not only by npm's exit code.

### ✅ Found in 3.6a — THE LIFT IS EXACT, AND POSTGRES AGREES WITH ALL TWENTY-ONE

Two checks were run by hand against a fresh `supabase db reset`, and both are the
evidence that 3.6b is a re-point rather than a re-derivation:

1. **Every literal in `cases.json` is identical to `07`'s**, by id — all 21 ids
   present, no value different, compared mechanically rather than by eye.
2. **The rule as spelled in Postgres `numeric` reproduces all 21 expectations** —
   fifteen line cases (gross, net and residual tax), three documents (per-line,
   per-document, and whether they agree) and three packs (per-unit and whether it
   multiplies back), run on the applied database. Sixty-three `t`s.

So the data file already *is* the shared truth; what 3.6b changes is which file `07`
reads, not what either side believes.

### ✅ SETTLED BY THE OWNER, 2026-08-26 — DIRECTION FOLLOWS THE DOCUMENT, TAX STAYS THE RESIDUAL

**This was the one decision 3.5 could not make for itself.** It was put to the owner
at the 3.5 merge and answered the same day: **reading 3 of the three below.** The
history is kept because the reasoning is what binds `0006`, not the verdict alone.

§2.5 rule 2 says: *"With `prices_include_tax = true` the **gross unit price is
authoritative**."* `prices_include_tax` is a column on `workspace`, and both seeded
workspaces have it `true`. Read literally, that rule governs every line of every
document those workspaces write — sales and **deliveries alike**.

The seed does not read it that way, and the sentence directly above rule 2 is why:
*"Shelf prices in Mexican retail include IVA; **supplier invoices break it out**."*
So `10_deliveries.sql` computes a purchase line **net-first**:

```sql
line_net   = round(qty_base * unit_price, 2)
tax_amount = round(round(qty_base * unit_price, 2) * tax_rate, 2)   -- tax rounded ALONE
```

and `20_consumption.sql` computes a sale line **gross-first**, tax as the residual.
Measured on a fresh reset:

| Table | Lines | Differ from `round(net × rate)` | Satisfy `net = round((net+tax)/(1+rate))` |
|-------|------:|-------------------------------:|------------------------------------------:|
| `purchase_line` | 1 048 | **0** — every one takes the forbidden spelling | 1 048 |
| `sale_line` | 2 263 | **118** — the residual and the forbidden spelling disagree | 2 263 |
| `waste_line` | 137 | **4** | 137 |

⚠️ **Nothing is broken today, and that is what makes this easy to miss.** F8 asserts
the residual identity over all 3 448 lines and it holds — a net-first line still lands
on a net its own gross divides back down to, at these magnitudes. `net + tax = gross`
is exact on every seeded row either way.

⚠️ **But §2.5 rule 4 says tax is "never rounded on its own", and the purchase side
rounds it on its own.** The two spellings differ by a centavo whenever the tax lands on
a half, and the ledger is append-only: a delivery written the wrong way is not an edit
away from the right one.

**What is needed is one sentence in §2.5, and it is the owner's to write.** Three
readings, all defensible:

1. **Gross-first everywhere**, because `prices_include_tax` is a workspace fact.
   Simplest rule, one code path in `0006` — but it means treating a supplier invoice's
   broken-out net as if it were a shelf price, which is not what an invoice is.
2. **Direction follows the document**, which is what the seed already does and what
   the sentence above rule 2 implies: sales gross-first, purchases net-first,
   `tax = round(net × rate)` on the purchase side and residual on the sell side.
   Matches the paper the shop is holding. Costs `0006` two code paths.
3. **Direction follows the document, but tax stays the residual on both.** Keeps
   rule 4 universal at the cost of one more line of arithmetic.

**3.5 assumed nothing and asserted nothing about which is right.** F8 is written to
pass under all three, deliberately, so it did not quietly ratify one of them.

#### ✅ THE OWNER TOOK READING 3, 2026-08-26

**Tax is always `gross − net`. What varies by document kind is which of the two is the
INPUT.** ADR-035 §2.5 rules 2, 3 and 4 are amended to say so; rule 2 gains a scope and
rule 4 keeps its universal form.

| | anchor | derived | tax |
|---|---|---|---|
| **sale** | `line_gross = round(unit_gross × qty)` | `line_net = round(line_gross / (1 + rate))` | `line_gross − line_net` |
| **purchase** | `line_net = round(unit_net × qty)` | `line_gross = round(line_net × (1 + rate))` | `line_gross − line_net` |

⚠️ **AND THE WORDING THIS FILE FIRST GAVE READING 3 WAS CIRCULAR — corrected above.**
It read *"net-first on a purchase, then `gross = net + round(net × rate)` once and
`tax = gross − net`"*. Substitute the first into the second and the tax is
`round(net × rate)` — the spelling rule 4 forbids, re-derived and called a residual.
The honest form anchors the rounding on the **gross**: `gross = round(net × (1 + rate))`.
Recorded rather than quietly fixed, because it is the sort of error that reads as
settled and is not.

✅ **AND THE TWO FORMS ARE THE SAME NUMBER ANYWAY, WHICH IS WHY THIS COST NOTHING.**
`line_net` is already an exact multiple of a centavo, so adding it cannot shift the
fractional part the rounding is deciding:

> `round(net × (1 + rate)) − net` **=** `round(net × rate)`, for every net and every
> rate. Verified by exhaustion over all 400 001 centavo nets from −$2 000 to $2 000 at
> both applied rates, and over the 1 048 delivery lines the seed wrote. **F17.**

So **rule 4 has no teeth on the buy side at all** — it bites exactly where the
authoritative figure is the gross and the net is reached by **division**, which is the
sell side and is what F8 measures. **No migration, no seed change, and the seed was
never wrong — only under-specified.**

⚠️ **The decision is still expensive to reverse, and F17 is why it is cheap to hold.**
Nothing written so far has to move. The point of no return is unchanged: the first
`record_purchase` a pilot runs.

#### ⚠️ BINDING ON THE RPC MIGRATIONS — THE TWO LINES `record_purchase` AND `record_sale` MUST CARRY

*(Written when the RPCs were `0006`. That number is retired — this binds `0016` and
`0018`, plan tasks 4b and 4d-i.)*

```sql
-- record_sale        the shelf price is the anchor
line_gross := round(p_unit_gross * v_qty_base, 2);
line_net   := round(line_gross / (1 + v_rate), 2);
line_tax   := line_gross - line_net;

-- record_purchase    the invoice net is the anchor
line_net   := round(p_unit_net * v_qty_base, 2);
line_gross := round(line_net * (1 + v_rate), 2);
line_tax   := line_gross - line_net;
```

`waste` follows the **sale** shape: `waste_line` carries `line_net` as the retail value
of the loss (`0011`'s header says so), and a retail value is a shelf price.

#### ✅ Asserted now, in `07_money_and_units.sql`

Six buy-side cases, `B1`–`B6`, beside the nine sell-side ones, all on the same
`kind`-tagged table so 3.6 lifts them together. Plus two fixed tests the decision
created:

- **F17** — the two spellings coincide, by exhaustion and over the seed's 1 048
  delivery lines
- **F18** — the rule-6 tie is unreachable on the **buy** side too, at both applied
  rates, so the tie lives in `round(unit_price × qty)` on **both** sides of the ledger

⚠️ **`B6` is the buy side's `M8`, and `B4` is not.** `B4` is a reversal, but its anchor
(−13.13) is not a tie, so away-from-zero and toward-+∞ agree on it and it discriminates
nothing. `B6` — the void of `B5`, anchor −0.365 — is the only buy-side shape that can
catch `Math.round`. Falsification S23 confirms it: pointed at toward-+∞ rounding, **M8
and B6 are the only two of twenty cases that go red.** S24 confirms the converse —
dropping `B6` leaves F13 green with `B4` still present, which is exactly the hole F13's
new clause now closes. **3.6 must carry both across.**

### ⚠️⚠️ Found in 3.5 — §2.5 ASKS `cases.json` FOR A HALF-CENTAVO BOUNDARY THE TAX DIVISION CANNOT PRODUCE

§2.5's last paragraph specifies the contents of `cases.json`: *"the three cases named
in §2.10, **a half-centavo boundary per tax rate**, one multi-line document where
per-line and per-document disagree, one zero-rated line, and one weighed line with a
decimal quantity."*

Read beside rule 6 — *half-up, away from zero* — "a half-centavo boundary per tax
rate" reads as a tie in the **tax division**, `net = round(gross / (1 + rate))`. There
is no such tie, and there cannot be.

> `gross` is an integer number of centavos, `G/100`. At 16%, `net = G/116`. For that
> to be an exact half-centavo — `(2m+1)/200` — needs `200G = 116(2m+1)`, i.e.
> `50G = 29(2m+1)`. 29 is prime, so `29 | G`; put `G = 29j` and it reduces to
> `50j = 2m+1` — an even number equal to an odd one. **It never happens.**

**F9 is that claim by exhaustion** over every gross from one centavo to two hundred
pesos, which is every ticket a corner shop writes: zero ties. Confirmed separately over
two million centavo values — up to $20 000 — also zero. At rate 0 there is no division
at all, so there is no tie there either.

✅ **So the rule-6 tie-break is reachable at exactly one place: `round(unit_gross ×
qty, 2)`.** That is where 3.5 put its boundaries, and it is where `cases.json` must
put them:

| Case | What it is | Raw | Half-up | Banker's |
|------|-----------|-----|---------|----------|
| M4 | 5 × $0.073, counted | 0.365 | **0.37** | 0.36 |
| M5 | 250 g at $25.86 the kilo, weighed | 6.465 | **6.47** | 6.46 |
| M6 | the same tie at rate 0 — the other tax rate | 0.365 | **0.37** | 0.36 |
| M8 | the reversal of M4 | −0.365 | **−0.37** | −0.36 |

⚠️ **Binding on 3.6: this is a correction to §2.5's own description of `cases.json`,
not an addition to it.** A `cases.json` that puts its boundary in the tax split will
contain a case that cannot discriminate anything, and it will look correct.

### ⚠️⚠️ Found in 3.5 — `round(float8)` IS BANKER'S, SO RULE 1 IS THE PRECONDITION FOR RULE 6

§2.5 rule 1 — *"Integer centavos at every layer. No floating point anywhere in the
money path"* — reads like hygiene. It is not. It is what makes rule 6 true.

```
round(2.5::numeric)   = 3     round(2.5::float8)   = 2
round(3.5::numeric)   = 4     round(3.5::float8)   = 4
round(646.5::numeric) = 647   round(646.5::float8) = 646
```

**`round(numeric)` is half-up away from zero. `round(double precision)` is
half-to-even.** Same function name, same expression, one cast — and the answer changes
by a centavo, on the tie, which is the case nobody checks by hand. F3 and F4 assert
both halves, so the divergence is on the record and a future Postgres that changed
either one turns the build red.

✅ **F5 turns rule 1 into a build failure** rather than a paragraph: zero columns of
type `double precision` or `real` in any base table in `public`, counted from
`information_schema`, so a float column added by a future migration fails on the day it
lands. **F6 and the column block do the same for the scales** — `numeric(12,2)` for
money, `numeric(14,6)` for a per-base price, `numeric(14,3)` for a base quantity,
one test per column, twenty-one columns today. A money column at scale 4 is exact and
still wrong: it represents a tenth of a centavo, which is a number no shop can charge.

⚠️ **Binding on 3.6 and on `packages/money`.** JavaScript has neither. `Math.round`
is half-up **toward positive infinity**, not away from zero — `Math.round(-0.365 × 100)
/ 100` is `−0.36` where §2.5 rule 6 says `−0.37`. And `0.073 * 5` in IEEE754 is not
0.365. The TypeScript half needs an integer-centavo representation and its own rounding
helper; it cannot use the language's.

### ✅ Found in 3.5 — M8, THE REVERSAL, IS THE ONLY CASE THAT CATCHES `Math.round`

Falsification S6 replaced the rule's rounding with half-up toward positive infinity —
JavaScript's semantics, in SQL. **Only two of 155 tests went red, and both were M8.**
M4, M5 and M6 stayed green: they are positive, and toward-infinity and away-from-zero
agree on positive numbers.

Falsification S14 makes the same point from the other side. Dropping M4, M5 and M6
left F13 — the discriminator guard — **green**, because M8 alone still distinguished
half-up from banker's. Only dropping M8 as well turned it red.

⚠️ **So the reversal case is not a nice-to-have and it is not redundant with the other
three.** A void must be its original's mirror to the centavo or `void_transaction`
leaves a peso behind on every tie, and the sign is the only place the two wrong
roundings can be told apart. **3.6 must carry M8 across, and Vitest must run it first.**

### ⚠️ Found in 3.5 — `0001`'s REASON FOR THE GRAM BASE IS A FLOAT ARGUMENT, AND THE LEDGER IS `numeric`

`0001`'s header, and ADR-035 §2.5 rule 1 with it, justify the smallest-unit base like
this: *"With kilograms as base, buying 1 kg and selling 100 g ten times would never
quite close; in grams it closes exactly."*

**That is true of floating point and false of `numeric`.** F11 asserts both:

```
1000.000::numeric(14,3) - 10 * 100.000::numeric(14,3)  =  0      -- grams
   1.000::numeric(14,3) - 10 *   0.100::numeric(14,3)  =  0      -- kilograms
```

The kilogram counterfactual closes exactly too, because `numeric` is exact decimal and
0.100 is representable in it. The sentence describes a defect that `numeric` already
prevents.

✅ **The decision is right and nothing changes. The stated reason is not the one that
holds.** What the gram base actually buys is **resolution**: at `numeric(14,3)`, half a
gram is `0.500` in grams and rounds away to a whole gram in kilos — a thousandfold
difference in what the ledger can represent, at the same column scale. F11 asserts that
too. Recorded rather than patched: it is a comment in an applied migration, and
migrations are append-only.

### ✅ Found in 3.5 — THE PLAN GUARD 3.4 CORRECTED PAID FOR ITSELF ON ITS FIRST NEW FILE

3.3 found that `finish(exception_on_failure := true)` is disarmed by a miscounted plan;
3.4 corrected the per-file guard to read pgTAP's own number rather than the file's
arithmetic. **07's first run printed `# Looks like you planned 153 tests but ran 155`
and the guard raised**, because two behavioural pack tests had been counted as
per-case tests when there is one real delivery, not one per case row.

Under the pre-3.3 harness that run would have printed `not ok` nowhere, exited 0, and
gone green. Under 3.3's spelling of the guard it would have passed, because
`curr_test` matched the file's own `planned`. It was caught by 3.4's spelling and by
the CI grep, on the first file written after both landed. S16 reproduces it
deliberately.

### Settled in 3.5, and binding on 3.6

**1. The M-block is a DELIBERATE, TEMPORARY FORK of `cases.json`, and the case ids are
the join.** `supabase/README.md` says *"do not fork it into a SQL fixture"* and §2.10
asks for one data file read by both sides — which is 3.6's done-when, not 3.5's. 3.5
comes first on purpose: writing `cases.json` first would let the data file be shaped to
whatever the SQL already does, which is the drift the file exists to prevent. Every
case carries an `id` (`M1`–`M9`, `D1`–`D3`, `P1`–`P3`) so 3.6 lifts them by name.

**2. The file says out loud which half is verification and which is specification.**
Rules 1, 5 and 6 are asserted over the applied schema and applied data. Rules 2–4 have
no SQL implementation in this repo — the tax split is `0006` — so the M-block asserts
that the rule spelled in SQL reproduces expectations worked out by hand, and the header
refuses to let a reader take that for more than it is.

**3. The three §2.10 sentences are measured over REAL objects wherever one exists.**
"1 kg in, 100 g × 10 out" runs ten tickets through `allocate_fefo()` and reads the
balance the projection trigger maintains — 06's rule, for 06's reason. "A case of 24 at
$12" is asserted on a real `purchase_line` (F15) against a real `pack_size` (F16), not
only in arithmetic. Only "16% inclusive" has no applied code to run against.

**4. The fixture is written and rolled back** — the fifth suite to do so. One family,
three variants, one delivery, ten tickets. F14 asserts §2.4 still holds across it, so a
units suite cannot report an exact zero from a projection it broke.

**5. P2 and P3 exist to stop P1 being a coincidence.** A case of 24 at $12 divides to
$0.50 exactly; a pack of 3 at $10 divides to $3.333333 and multiplies back to $9.999999.
Without the second, "the pack division is exact" would be a claim about the number 24.
With it, the claim is the right one: `unit_price_net_per_base` is a **display** figure
and `line_net` is the authority — §2.5 rule 3's *per line*, again.

**6. D3 is a control and is not padding.** D1 and D2 assert that per-line and
per-document totals disagree. A rule that *always* disagreed would satisfy both and be
a different defect wearing the same green, so D3 asserts a document where the two agree.

### Twenty-five falsifications — eighteen before 3.5 was committed, seven more for the owner's decision

Each was applied to `07_money_and_units.sql`, run through the same three gates CI uses
— psql exit code, `Looks like you planned`, `^ *not ok` — and reverted. **All eighteen
failed the build.** Two had to be re-aimed first, and both re-aimings are findings in
their own right.

| # | The lie | Caught by |
|---|---------|-----------|
| S1 | The tenth withdrawal takes 99 g, so the kilo does not close | F12, U draw 10 |
| S2 | The kilo's receipt movement is never written; the lot opens empty | all ten U draws |
| S3 | M1's hand-computed net is off by one centavo | M1 net |
| S4 | Rule 4 broken — tax rounded on its own instead of taken as the residual | F13, M9 tax, M9 identity |
| S5 | Rule 6 broken — one `float8` cast turns half-up into banker's | F13, M4/M5/M6 gross |
| S6 | Rule 6 broken — half-up toward +∞, which is `Math.round` | **M8 only** |
| S7 | A `double precision` column lands on `sale_line` | F5 |
| S8 | A future table ships `line_net` at `numeric(12,4)` | the column block |
| S9 | Rule 5 broken in applied data — one sale total drifts from its lines | F7 |
| S10 | The residual identity broken on one applied line | F7, F8 |
| S11 | An ounce joins `unit` at 28.349523 g | U `oz` |
| S12 | The delivered case holds 25, not 24 | F16 |
| S13 | The money case table is emptied — the M-block asserts nothing | F13 |
| S14 | Every half-centavo tie dropped, M8 included | F13 |
| S15 | F9 aimed at 60%, a rate where the ties DO exist | F9 |
| S16 | `plan()` called with `planned + 1` — 3.3's disarmed exception | the per-file guard |
| S17 | Both zero-rated cases dropped — the second tax rate goes unmeasured | F13 |
| S18 | Rule 5 broken in the spec — the document rounds independently of its lines | D1, D2 |
| S19 | Reading **1** instead — the buy side treats the invoice net as a shelf price | B1, B2, B4, B5 |
| S20 | B2's hand-computed gross is off by one centavo | B2 gross |
| S21 | One seeded delivery line stops satisfying the owner's rule | F7, F8, **F17** |
| S22 | F18 aimed at 10%, a rate where the buy-side ties DO exist | F18 |
| S23 | Half-up toward +∞ — `Math.round` — applied to every case | F13, **M8 and B6 only** |
| S24 | B6 dropped, leaving B4 as the buy side's only reversal | F13 |
| S25 | Buy-side tax kept at three decimals — `net + tax` stops being the gross | B2, B4, B5, B6 |

⚠️ **S2 was re-aimed once.** The first version deleted the batch as well as its
movement and died on `stock_batch_purchase_line_fk` — the build failed, but on a
foreign key rather than on an assertion, which proves nothing about the suite. Aimed at
the movement alone it opens a lot that never receives, which is **3.4's defect shape**,
and here all ten draws go red because the balance starts at zero rather than a kilo.

⚠️ **S14 was re-aimed once, and that is the M8 finding above.** Dropping M4, M5 and M6
left F13 green.

⚠️ **S23 is the one that earns B6 its place, and S24 is the one that proves B4 could
not have.** Pointed at JavaScript's rounding, exactly two of the twenty money cases go
red — `M8` and `B6`, one per side, both negative, both with an anchor on a half
centavo. Every positive case agrees under both roundings, and F18 says the tax steps
can never tie, so that shape is the only one that discriminates. S24 removes `B6` and
F13 goes red **with `B4` still in the table** — which is what the new `kind`-scoped
clauses in F13 exist to catch.

⚠️ **S15 is the one that keeps F9 honest.** A test asserting "this search finds
nothing" passes just as well when the search is broken. Pointed at 60% — where
`gross/1.6` *does* land on half-centavos, `G = 4` giving `0.025` — F9 goes red. So its
zero at 16% is a measured zero.

### ⚠️⚠️ Found in 3.4 — THE INVARIANT CANNOT SEE A MOVEMENT THAT WAS NEVER WRITTEN

**This is 3.4's finding and it is about ADR-035 §2.4 itself, not about the suite.** It is
the reason the suite ships an anti-vacuity floor beside every green.

Falsification S2 deleted the receipt movement from the generator's purchase branch — the
`insert into stock_movement` that fills a lot after a delivery opens it. That is a real
defect, the exact shape of a `record_purchase` RPC that forgot half its job. **All 64
§2.4 assertions stayed GREEN.**

They have to. The lot opens at zero (`stock_batch_open_balance`), no movement is ever
written, so `sum(qty_base)` is 0 and `remaining_base` is 0 and the two agree perfectly.
The ledger says the shop received nothing; the shelf disagrees; **the invariant is
silent**, because it compares the projection against the movements and both are empty.

⚠️ **So §2.4 detects a movement that was never PROJECTED, and never one that was never
MADE.** Those are different defects. The first is a broken trigger and this suite finds
it in every run (falsifications S1 and S3, the latter a 0.01% drift caught at
`worst disagreement 0.002`). The second is a broken *caller*, and nothing in
`batch_balance_violations()` can reach it — it is not a weakness in the function, it is
what the function means.

What caught S2 was **F2**, the floor asserting the 400 generated operations wrote more
than 400 movements. That is the whole defence, and it is a suite-level one.

✅ **SETTLED BY THE OWNER, 2026-08-26: a CONSTRAINT in `0006`, not a suite and not a
task of its own.** Three reasons, and the first is the one that decided it:

1. **The rule was already recorded**, under *Settled in 1.3a, and binding on what comes
   after* — *"`record_purchase` must therefore write both the batch and a positive
   movement"*. 3.4 did not find a missing requirement; it found an **unenforced** one. A
   second record of it in this section would be two half-accounts of one rule, so the
   1.3a bullet carries the finding and this section points at it.
2. **A step-3 suite could not go red for the reason that matters.** The only purchases
   that exist are the seed's, they are correct, and `10_deliveries.sql` §9 already
   asserts its own writes. A suite written now would assert a true thing about data that
   cannot break, aimed at a function nobody has written — the vacuous green §9 refuses,
   wearing a new name.
3. **A constraint beats a test here**, and it is this repo's established move: the
   composite FKs, `stock_movement_sign_follows_reason` and the one-reversal partial
   indexes all make a bad state unrepresentable rather than merely detected.

The predicate is specified and **verified against the applied seed** under *What step 3
does NOT ship* below.

### ⚠️ Found in 3.4 — THE PER-FILE PLAN GUARD 3.3 SHIPPED WAS ITSELF WRONG

3.3 closed the disarmed-`finish()` hole in two places: a backstop in
`.github/workflows/db.yml`, and a per-file guard in `05`. **The per-file half did not
work**, and 3.4 found it by falsifying the guard rather than the suite.

05's guard compared `tap._get('curr_test')` against the file's **own** `loc_plan.planned`
column. That asks only *"did the loops emit what the arithmetic said"*. It misses the
other half — **`plan()` being CALLED with a different number**:

```sql
select plan((select planned from loc_plan) + 1);   -- pgTAP is told 85; 84 run
```

`curr_test` is still 84 and `planned` is still 84, so **the guard passes**, pgTAP prints
`Looks like you planned 85 but ran 84`, and psql **exits 0** — which is precisely the
failure the guard was written to catch. Confirmed against `06`: with 3.3's spelling,
exit 0; with the corrected one, exit 3.

**The fix is to compare pgTAP's own two numbers and nothing of the file's:**
`tap._get('plan')` is what `plan()` was actually given, `tap._get('curr_test')` is what
ran. `05` and `06` additionally compare that against the file's computed number, so the
arithmetic stays honest too.

✅ **All six suites now carry it**, which also discharges 3.3's instruction that whoever
wrote 3.4 should take the guards for 01–04. For 01–04 the guard needs nothing from the
file it sits in — that is what the correction bought — so it is the same block in each.

⚠️ **CI was never blind to this**, and that is worth saying plainly: the workflow greps
for `Looks like you planned` and would have failed the job. The per-file guard is for the
file run by hand, which is how every suite here is written and falsified.

### ✅ Found in 3.4 — WHAT A RANDOMISED LEDGER REACHES THAT THE SEED DOES NOT

The seed is large but **fixed**: the same deliveries in the same order every reset.
`supabase/checks/seed_invariant.sql` calls itself *"the closest thing this repo has to
the randomised sequences the ADR asks for"*, and 3.4 is what closes that gap. What the
generator reaches that three months of seed does not:

- **Oversales in volume.** The variant is drawn uniformly from the whole catalog, so most
  generated sales sell something the store does not stock. Shortfall branches two and
  three of `0005` §2 fire hundreds of times per run; **the seed has exactly two**. F8
  asserts the branch was reached, so the greens are over a hard ledger — 74 lots driven
  negative in a representative run, against the seed's seven.
- **Voids interleaved with everything.** Reversals are weighted to ~12%, against a real
  rate nearer 1%, because a void is the only write that carries a sign its `reason`
  forbids and is therefore the branch most likely to break the invariant.
- **A voided delivery whose lots have since moved**, which drives a lot negative through
  a *purchase* movement. 1.6c produced one of these on purpose; the generator produces
  them by accident, which is the point.

⚠️ **The runs are CUMULATIVE and that is deliberate.** Each run appends to the ledger the
last one left. Resetting between runs would make sixteen independent trials of one thing
instead of one deepening ledger, and could never test a sale against a lot a transfer
created three runs earlier.

⚠️ **The recorded seed reproduces the OP SEQUENCE, not the ALLOCATION.** `setseed()`
governs `random()`; it does not govern `gen_random_uuid()`, and FEFO's third sort key is
`batch_id` (`0005` §2). Two lots tying on expiry *and* `received_at` — which the seed
produces, because `now()` is fixed for a transaction — can be consumed in a different
order on a replay. That is honest rather than convenient: **the invariant must hold
whichever lot it was**, and a property that depended on the tiebreak would be a property
of the tiebreak.

### Settled in 3.4, and binding on 3.5

**1. The suite builds on the SEED, not on a synthetic fixture.** A generator that also
created its own workspace, units, products and lots would prove the invariant over a
ledger written by the same code that asserts it. Running on top of the seed means a
generated sale can consume a batch the seed opened in June.

**2. It writes through the REAL allocators.** Every withdrawal goes through
`allocate_fefo()` and every transfer through `allocate_transfer()` — the same functions
the seed calls and the 0006 RPCs will call. A generator writing its own movements would
be balancing the books it then audits.

**3. Every location is measured, including the tenant nothing touched.** §2.10's word is
"per location". A transfer that credited the destination against the *origin's* batch
would net to zero across the workspace and be invisible to a total, which is why the
per-location form is asserted and not only the whole-database one. F5 asserts the
out-of-scope stores did not move, so their zeros mean something.

**4. It voids only its OWN documents.** Voiding a seed sale would leave
`supabase/checks/seed_invariant.sql` describing a ledger that no longer matches it, two
CI steps later.

**5. F5 is a backstop, not the primary wall — and one falsification says so.** S10 pointed
the generator at another tenant's store and the run died on
`purchase_location_fk`, not on F5: the composite FKs refuse a cross-tenant write
structurally, before any assertion is reached. F5 earns its place on the other half — an
in-scope store that stopped growing.

⚠️ **S13 did NOT go red, and it should not have.** Forcing the generator to pick a single
store left both stores growing anyway, because `allocate_transfer()` writes to the other
one. Recorded because it looks like a hole in F5 and is not.

### ⚠️⚠️ Found in 3.3 — `finish(exception_on_failure := true)` IS DISARMED BY A MISCOUNTED PLAN

**This is the most serious thing step 3 has found, and it is not about locations.** It
is about whether any of the five suites' greens mean anything, and it applies to 01, 02,
03 and 04 exactly as much as to 05.

Every suite in `supabase/pgtap/` ends with `finish(exception_on_failure := true)`. That
call is the *single* mechanism converting a red assertion into a non-zero exit — task
3.1 exists because a pgTAP file under plain `psql` prints `not ok` and exits 0, and this
is the fix 3.1 adopted. From pgTAP's own `_finish`:

```
IF curr_test <> exp_tests THEN
    RETURN NEXT diag('Looks like you planned … but ran …');
ELSIF num_faild > 0 THEN
    IF raise_ex THEN RAISE EXCEPTION …
```

**The two branches are an `ELSIF`.** A plan that disagrees with the number of tests
actually emitted takes the first, the exception in the second is never reached, and psql
exits **0** with failing assertions in its output.

⚠️ **Found by falsification, not by reading.** S5 below restricted 05's measurement loop
to five of the ten tables. Three tests went red — F1, F8 and F14, exactly as designed —
and **the file exited 0**. Reproduced outside any suite in four lines: `plan(3)`, one
passing test, one failing test, `finish(true)` → no exception, exit 0. Change the plan
to `2` and the identical file raises.

⚠️ **Every suite here computes its plan from what it measured, and that is the right
shape — it is not the bug.** A computed plan is why a table added by a future migration
is asserted the day it lands. The bug is that the arithmetic going wrong is *quiet*, and
the arithmetic is exactly what a future edit is most likely to get wrong.

**Fixed in two places, and the split is deliberate:**

- **`.github/workflows/db.yml` — the backstop for all five.** The step now captures each
  suite's output and fails on `Looks like you planned`, and separately on any `not ok`
  that survived to be printed. One edit, covering the four suites that merged before
  this was known, needing no change to them. It also now checks each `psql` exit code
  explicitly rather than relying on the pipeline's.
- **`05_location_isolation_reads.sql` — a per-file guard.** The planned number is kept in
  a temp table and compared against `tap._get('curr_test')` after `finish()`. So the file
  defends itself when run by hand, which is how it was written and falsified.

⚠️ ~~**01–04 did NOT get the per-file guard, and that was a decision.**~~ **TAKEN IN 3.4**,
as this line asked. All six suites now carry it — and 3.4 found that the guard as 3.3
wrote it was itself wrong, so 05's was corrected rather than copied. See *Found in 3.4*
below. 3.4's own suite carried the guard from the start.

⚠️ **What this does NOT retract.** The falsifications recorded for 3.1, 3.2a, 3.2b-i and
3.2b-ii were each *confirmed* to exit non-zero at the time, so those claims stand as
made. What was not true is the implicit claim that they could not have been quiet — and
from now on they cannot be.

### ⚠️ Found in 3.3 — THE TEN LOCATION POLICIES SPLIT 5/5, AND THE HALVES NEED DIFFERENT ACTORS

The plan's done-when reads *"staff assigned to location A see zero rows from location B;
a manager sees both"*. Pointed at all ten policies that is half wrong, and the half that
is wrong is green.

| | Policies | Who can observe the store wall |
|---|---|---|
| **Not role-gated** | `location_select`, `sale_select`, `sale_line_select`, `waste_select`, `batch_balance_select` | a cashier — this is the plan's sentence, and it works |
| **Also role-gated** | `purchase_select`, `purchase_line_select`, `waste_line_select`, `stock_batch_select`, `stock_movement_select` | **nobody, directly** |

The second five carry `and public.has_role(workspace_id, 'manager')` beside the location
clause — `0003` §6 and `0004` §9, *"cost is hidden by ROLE, not by column grants"*. So a
cashier reads **zero** rows there, and the zero has nothing to do with locations. Banking
it as location isolation would be a suite green about the wrong wall, which is the same
error 3.2b-ii's F5 was built to catch on inserts.

⚠️ **And the obvious repair does not exist.** Anyone who clears `has_role(…, 'manager')`
is handed **every** location by `my_locations()`, which grants managers and owners all
locations in their workspaces by role. There is no actor in this schema who is
simultaneously manager-enough to read a purchase and location-restricted enough to be
refused one. The two predicates cannot both bite on the same caller.

**The suite records the zero under its own name, `R-zero`, and says what it is.** The
attribution is structural rather than asserted: the *same* cashier, in the *same*
session, reads their own store's rows in full from the other five tables — that is what
`L-own` proves — so the refusal on these five is the role clause and can be nothing else.

⚠️ **That makes `R-zero` a ROLE claim living in a location task, and it is a decision
made on the owner's behalf** — the same shape as 3.2b-i's `T-role`, and made for the same
reason. It is there because leaving the zero unnamed would let a reader take it for the
store wall. **Cheap to overturn: it is ten tests in a file that ships no migration.**

### ✅ Found in 3.3 — CLOSING A STORE IS THE ONLY WAY TO OBSERVE THE OTHER FIVE

`my_locations()` excludes **inactive** locations. `workspace_id in (select
my_workspaces())`, sitting beside it in all ten policies, does not. So `is_active` is the
one lever the location clause answers to and the tenant clause ignores — and it is the
only observation of `purchase_select`, `purchase_line_select`, `waste_line_select`,
`stock_batch_select` and `stock_movement_select` available to anything behavioural.

This is not a technicality. It is a real rule the reporting layer already works around:
`0008`, `0009`, `0011` and `0013` each record that their views read **wider** than RLS
precisely because `my_locations()` is fail-closed on closed stores.

So the suite closes one store, re-measures all ten tables, and reopens it:

- **`D-mgr`** — with Mercado closed, the manager's whole-table count is Centro's rows
  exactly. On `sale` that repeats a wall the cashier tests already reach; on `purchase`
  and `stock_movement` it is **the only evidence in the repo that the location clause on
  those policies does anything at all**.
- **`D-staff`** — the cashier stranded at the closed store sees **zero**, not everything.
  That is `my_locations()`'s fail-closed rule, and the direction its own comment argues
  the mistake must fall in: *"one forgotten insert silently shows a cashier the other
  store's takings, and nobody reports it… under this rule the same mistake locks them out
  of their own store, which is a support ticket within five minutes."*

⚠️ **Falsified, and this is the one that matters**: removing `and l.is_active` from
`my_locations()` — a change nothing else in the repo would notice — turns **all ten**
`D-mgr` tests red plus F10. Without the closed-store block, that edit ships green.

⚠️ **The suite writes to the applied schema and undoes it**, which is the third time
(02's invite fixture, 04's `auth.users` row). One `is_active = false`, reopened
explicitly so F11 can assert the restore rather than trusting the rollback, and the whole
file is still one transaction ending in `rollback`. Confirmed after a full run: zero
inactive locations, and every `supabase/checks/` step still green.

### Settled in 3.3, and binding on 3.4

**1. The measured table set is discovered from the catalog, with a NAMED floor.** The ten
tables come from `pg_policies` — a policy added by a future migration is measured and
asserted the day it lands, and nothing is edited for that to happen. But a suite that
discovers its subjects from the very predicate it is testing has a blind spot: a policy
that **loses** its location clause does not fail, it *leaves*, and the tests that would
have caught it are never generated. F1 counts, which is enough only while the total is
ten. **F14 lists the ten by name** and is the one hardcoded list in the file —
deliberately, as a floor and never as the plan. ⚠️ Falsified: stripping the location
clause from `sale_select` turns F14 red **naming `sale`**, where F1 alone said only that
a number moved.

**2. The stores are resolved from the CASHIERS' ASSIGNMENTS, never by display name.** The
claim under test is about a user's reach, so the user is what the fixture is keyed on —
02's rule, and it means renaming a store cannot silently re-point the suite. F5 refuses
to proceed unless each cashier holds exactly one assignment and the two differ.

**3. Both actors are inside ONE workspace, which is what holds the tenant wall open.** 02
used two owners and held the *store* wall open to make a claim about tenancy alone; this
file does the exact opposite. A cashier in workspace B seeing none of A's rows is the
tenant wall and 02 owns it — repeating it here would blur which wall a failure names.

**4. F13 does not catch the mutation it looks like it catches, and says so.** `alter
function public.my_locations() security invoker` never reaches F13: the function reads
`public.location`, whose `location_select` policy calls the function, and the two recurse
until Postgres raises `stack depth limit exceeded`. The build goes red — which is what
matters — but on stack depth, not on F13. F13's real subject is the quieter half: a
`security definer` lost where the recursion happens not to close, and a `search_path`
left unpinned.

⚠️ **F13 also failed on its first run against a completely correct schema**, because
`set search_path = ''` is stored in `proconfig` as `search_path=""` — the empty string
keeps its quotes. The value is now unquoted before comparison. Recorded because the
obvious spelling of that test is wrong and someone will write it again.

### Twelve falsifications, run by hand before 3.3 was committed

Every one confirmed to exit non-zero, and each named test confirmed to be the one that
went red. Seven mutate the applied schema and are undone; five mutate a copy of the suite.

| # | Mutation | Turns red |
|---|---|---|
| M1 | `sale_select` loses its location clause | F1 and **F14, naming `sale`** — the table leaves the measurement rather than failing in it |
| M2 | `location_select` dropped | F1 and F14, naming `location` |
| M3 | `batch_balance_select` opened to `… or true` — mentions the helper, admits everything | six tests: `L-cross` ×2, `L-own` ×2, `D-mgr`, `D-staff`. **This is the leak 01's catalog test cannot see** |
| M4 | a `with check` clause added that mentions `my_locations()` | F7 — the 3.3 scope guard |
| M5 | `and l.is_active` removed from `my_locations()` | F10 and **all ten `D-mgr`** — the closed-store block's whole subject |
| M6 | `my_locations()` made `security invoker` | the build, via `stack depth limit exceeded` — **not F13**; see decision 4 |
| M7 | the manager given `member_location` rows | F6 — `M-both` would still pass, for the wrong reason |
| S1 | the `set role authenticated` dropped from the cashier's pass | F3, plus sixteen measurements |
| S2 | the explicit reopen removed from the D-block | F11 |
| S3 | the closure never applied | F10, F11 and every `D-mgr` |
| S4 | both cashiers pointed at the same store | F5, plus twenty-four measurements |
| S5 | the measurement loop restricted to the five cashier-observable tables | F1, F8, F14 — ⚠️ **and it exited 0**, which is how the harness hole above was found. With the guard, it exits non-zero |

⚠️ **S5 is the falsification that changed something outside its own file.** It was written
to check that the role-gated half could not be quietly dropped. It found instead that a
suite could fail three tests and pass the build.

### ⚠️ Found before 3.3 was written — THE LOCATION WALL IS A READ WALL, AND THE LEDGER HAS NO WRITE SURFACE YET

Established by reading `supabase/migrations/**` directly — `CREATE POLICY` is not in the
knowledge graph, so the graph cannot answer this and was not asked to — **and then
confirmed by asking the applied database**, which is the check that makes it evidence
rather than a grep:

```
select count(*) from pg_policies where schemaname='public';                        -- 40
select count(*) filter (where qual       like '%my_locations%'),                   -- 10
       count(*) filter (where with_check like '%my_locations%')                    --  0
  from pg_policies where schemaname='public';
```

All ten are `cmd = SELECT`. `authenticated` holds `SELECT` and nothing else on all six
ledger tables (`information_schema.role_table_grants`), and `pg_proc` holds **zero** of
`record_sale`, `record_purchase`, `record_waste`, `record_transfer`, `adjust_stock`.

Re-run against a **fresh `supabase db reset`** on 2026-08-24 (all migrations applied,
`0005` → `0008` in the log, all four seeds): `total_policies 40`, `using_loc 10`,
`withcheck_loc 0`, `nonselect 0`, six ledger tables `SELECT`-only with `0` write grants,
and `0` of the five RPCs present.

⚠️ **No CI run covers this PR** — `.github/workflows/db.yml` filters on `supabase/**`,
and this change is docs-only, so no check will ever report. That is the workflow working
as designed, but it means the evidence here is the database queries above, run against a
local reset, not a green tick.

**1. `my_locations()` is a `using` predicate and never a `with check` one.** Across the
repo's **40 policies** it appears in exactly **ten** places, all of them the `USING`
clause of a `for select` policy:

| Migration | Policies |
|---|---|
| `0001` | `location_select` |
| `0003` | `purchase_select`, `purchase_line_select`, `sale_select`, `sale_line_select`, `waste_select`, `waste_line_select` |
| `0004` | `stock_batch_select`, `stock_movement_select`, `batch_balance_select` |

Zero `with check` clauses anywhere in the schema mention location.

**2. The reason is not an oversight — the six ledger tables have no write policies at
all.** `0003` grants `authenticated` **`select` and nothing else** on `purchase`,
`purchase_line`, `sale`, `sale_line`, `waste` and `waste_line`, and defines only
`_select` policies. This is `0003:25` stating ADR-035 §2.6 outright: *"CLIENTS NEVER
INSERT. Ten `security definer` functions are the entire write surface."*

**3. Those ten functions do not exist yet.** `0006` and `0007` are **reserved and
unwritten** (`supabase/README.md:68`). The migration sequence runs `0001`–`0005`, then
`0008`–`0014`.

**So the location wall on writes cannot be tested, and the reason is stronger than
3.2b-i's.** For tenancy, the write policies exist and are merely unobservable from the
far side of the wall — shadowed by `_select`. For location there is nothing to shadow:
no write grant, no write policy, and no RPC. A cross-location write is refused today by
the **grant wall**, which is 3.2b-i's subject and already tested, not by
`my_locations()`.

### ⚠️ BINDING ON THE RPC MIGRATIONS — THE RPCs MUST CHECK `my_locations()` THEMSELVES

*(Written when the RPCs were `0006`. That number is retired — this binds `0016`–`0021`,
plan tasks 4b through 4f.)*

This is the part that is cheap now and expensive later, so it is flagged by name. When
`0006` lands, `record_sale`, `record_purchase`, `record_waste`, `record_transfer` and
`adjust_stock` will be `security definer`, and **`0003:60` already says what that
means: grants and RLS do not constrain them.** Every location guarantee the ten
`_select` policies make on reads will be enforced on writes only if each RPC body
checks `location_id in (select public.my_locations())` itself.

Nothing in the schema will catch its absence. A `0006` that omits the check compiles,
applies, and passes every suite step 3 currently plans — including 3.3, which asserts
reads. **The test for it belongs with `0006`, over the RPC, and is not an RLS test.**

#### ✅ SETTLED BY THE OWNER, 2026-08-24 — HARD REFUSE, NO OVERRIDE

Asked directly, because this is shop fit and not schema consistency: *reassigning a
cashier between stores to cover a shift — is it fast enough in practice that an RPC can
refuse an unassigned location outright?* **The owner's answer was yes.**

So `0006` is bound to the strict form:

- Every ledger RPC — `record_sale`, `record_purchase`, `record_waste`,
  `record_transfer`, `adjust_stock` — **checks `location_id in (select
  public.my_locations())` in its own body and raises on failure.**
- **No override path, no manager bypass, no "ring it up at the other store and fix the
  paperwork later" flag.** The mechanism for covering a shift is already
  `member_location` (`0001:221-223` — the owner moves a cashier between stores, and that
  must not be a role change). Shift cover is a reassignment, not an exception.
- The RPC's refusal must be **its own**, not a side effect of RLS or grants, which as
  `0003:60` records do not constrain a `security definer` function.

This closes the question 3.3 could not answer. It does not change 3.3's scope — 3.3
still asserts reads — but it means the write half is a **specified, testable
requirement waiting on `0006`**, not an open modelling question. The suite that proves
it belongs with `0006` and is behavioural over the RPC.

### ✅ Found in 3.2b-ii — THE `_insert` POLICIES ARE THE ONE WRITE FAMILY THE TENANT WALL CAN SEE

3.2b-i's central finding was that a cross-tenant `update` or `delete` never reaches its
write policy: Postgres must read a row before it writes it, the SELECT policy hides the
other workspace's rows from that read, and the statement matches nothing. Forty policies
stand behind a wall that nothing crossing it can observe.

**An INSERT is the exception, and it is the only one.** There is no existing row for a
SELECT policy to hide, and with no `returning` clause Postgres does not apply the SELECT
policy to the new row either. So the refusal comes from `<table>_insert`'s `with check`
and from nowhere else.

⚠️ **Falsified in both directions, and this is the contrast worth keeping.** Opening
`provider_insert` to `with check (true)` turns `T-cross provider` red in both
directions. The identical experiment on `provider_update` left **all 151 tests of
3.2b-i green**. Same table, same suite family, opposite result — because one verb reads
first and the other does not.

**F6 is what keeps the attribution honest**: exactly one *permissive* insert policy per
table, granted to `authenticated`, carrying a `with check` and no `using`. Permissive
policies are OR-ed, so a second one arriving on any of these eight tables would make the
refusal unattributable — and it turns F6 red on purpose. Confirmed by adding one.

### ⚠️ Found in 3.2b-ii — A PAYLOAD IS REFUSED BY THE FIRST WALL IT MEETS, AND THAT IS NOT ALWAYS THE POLICY

The reason 3.2b split at all was that an insert `authenticated` *is* granted has to
survive long enough to reach the policy. What the suite had to be built around is the
order Postgres checks things in, which is not the order anyone reads a table definition
in:

| Fires | What |
|---|---|
| **Before the policy** | `not null`, `check` constraints, and **BEFORE ROW triggers** — `product_variant_units_same_dimension_trg` is one |
| **The policy** | the `with check` predicate of the INSERT policy |
| **After the policy** | unique indexes, exclusion constraints, and foreign keys (they are AFTER triggers) |

⚠️ **So a malformed payload is refused by arithmetic and the suite would be green about
the wrong wall.** Falsified: giving the `product_variant` payload a `price_unit_code` of
`kg` against three `pza` columns makes the dimension trigger refuse it — the policy is
never consulted, and both directions come back identical. F5 catches it, because a
constraint refusal is not sqlstate 42501 with an RLS message and lands `unclassified`.

⚠️ **And the constraints that fire AFTER the policy cannot preempt it, but they can
still fail the control** — which is the same failure wearing the other hat. Falsified by
building `member_location`'s payload from the *other* workspace's member: the cross-wall
attempt is still refused by the policy and looks perfect, while the positive control
dies on the composite foreign key. `T-own` is what says so.

**Neither of these is a schema defect.** They are the reason the pairing exists, and the
reason the payloads resolve every id from the workspace they are aimed at rather than
being written out as literals.

### Settled in 3.2b-ii, and binding on 3.3

**1. The control is not a matching payload — it is the SAME STATEMENT.** The plan's
done-when asked for "an accepted same-payload insert". What the suite runs is one string
per (table, workspace), executed twice: once by the owner of that workspace, once by the
owner of the other. One inserts exactly one row, the other is refused. **The two runs
differ in nothing whatsoever except who is asking**, and F7 asserts that from the text
recorded in the measurements rather than from the file's promise. F8 covers the other
axis — the payload aimed at A and the payload aimed at B are identical once their uuids
are masked out, so neither direction is being asked an easier question than the other.

**2. Payloads are RESOLVED from the target workspace, and built before any role switch.**
Every id a payload names — family, variant, location, member — is looked up in the
workspace the row is aimed at, as `postgres`. Resolving workspace B's family id while
acting as owner A would return null, because 3.2a proved B's rows are invisible to A,
and the suite would then measure a `not null` violation and call it isolation. The
lookups also refuse to build a payload at all if any of them comes back null, rather
than emitting a statement that cannot mean what it says.

**3. The eight tables are computed from `has_table_privilege`, and a ninth fails NAMING
itself.** This is what discharges 3.2b-i's F17, which could only count the deferral. F1
asks the catalog which tables `authenticated` may insert into and fails if any has no
payload here — or if a payload exists for a table it may *not* insert into, which would
be measuring the grant wall, and that is 3.2b-i's claim rather than this one. ⚠️ **Both
files must be visited when a ninth arrives**: 04 needs a payload written by hand, and
03's F17 needs its number moved to nine. 03 says so at F17.

**4. The suite inserts one `auth.users` row as a fixture.** `workspace_member`'s payload
needs a `user_id` that is not already a member of the workspace being written to, and
all six seed users belong to one workspace or the other. The alternative was to fabricate
a cross-tenant membership from an existing user, which is a confusing thing to leave in a
suite about tenancy. F9 asserts the id was absent, exactly as 3.2a's `workspace_invite`
fixture does, so a future seed that adds it turns the suite red instead of quietly
borrowing somebody else's row.

**5. Both directions, per 3.2b-i's rule.** `denied-check` depends on which workspace the
caller belongs to, so a policy accidentally written against a hardcoded workspace passes
one direction and fails the other. Sixteen refusals, sixteen controls.

**6. ⚠️ The role wall on inserts is NOT asserted, and that is deliberate.** An owner is
used throughout, because five of the eight policies gate on `manager` and three on
`owner`, and only an owner can supply the accepted half of all eight pairs. "Staff may
not insert a provider" is a role claim, 3.2b-i's `T-role` is the only one step 3 makes
so far, and the staff-versus-location question is 3.3. Cheap to add later — it is one
more actor in a file that ships no migration.

### Twelve falsifications, run by hand before 3.2b-ii was committed

Every one confirmed to exit non-zero, and each named test confirmed to be the one that
went red. Five mutate the applied schema and are undone; seven mutate a copy of the
suite.

| # | Mutation | Turns red |
|---|---|---|
| M1 | `provider_insert` opened to `with check (true)` | `T-cross provider`, both directions — **the one 3.2b-i could not get** |
| M2 | `location_insert` dropped | `T-own location` both directions, and F6 |
| M3 | RLS disabled on `provider` | `T-cross provider`, both directions |
| M4 | `insert on workspace_setting` granted to `authenticated` — a ninth table | F1, naming it, and F6 |
| M5 | A second permissive insert policy added to `provider` | F6, and `T-cross provider` |
| S1 | `product_variant`'s four unit codes made to span two dimensions | F5 (`unclassified`), plus that table's four measurements |
| S2 | `member_location`'s payload built from the other workspace's member | F5 and `T-own member_location` |
| S3 | `pg_temp.attempt()` made `security definer` | F3, and every `T-cross` — the whole suite measures nothing |
| S4 | The two workspaces given different payloads | F8 |
| S5 | The stranger made to run a slightly different statement | F7 |
| S6 | The per-write undo removed from `attempt()` | F11 |
| S7 | The `provider` payload deleted | F1 and F4 |

⚠️ **S6 corrected something the file claimed about itself.** The first draft of the
header argued that without the per-write undo the stranger's insert would collide with
the owner's on a unique index. It would not — the stranger is refused by the policy long
before it reaches an index. What the undo actually buys is that the sixteen accepted rows
do not survive their own measurement into the next one and into the next CI step. The
header now says that, because it is what the falsification showed.

### ⚠️ Found in 3.2b-i — THE TENANT WALL ON WRITES IS HELD BY THE `_select` POLICIES

This is the most useful thing the write suite found, and it was found by falsification
after the suite was already green.

**Postgres must READ a row before it can update or delete it.** So on every
update/delete path the SELECT policy filters the statement *before* the update policy
is consulted. Confirmed: opening `provider_update`'s USING clause to
`has_role(workspace_id,'manager') or true` — a leak in the write policy — left **every
tenant assertion in the file green**, because the cross-tenant rows were never visible
to the read that the update depends on.

⚠️ **So the `_update` and `_delete` policies are a second layer, and crossing the
tenant wall cannot see them at all.** A suite that only ever wrote across the wall
would be unable to say those forty policies do anything.

**The fix is a staff user writing inside its OWN workspace.** Staff is a member, so the
SELECT policy admits it and the rows are genuinely visible — F19 asserts that, naming
`workspace_invite` as the one known-vacuous exception — while every write policy on
these tables gates on `has_role(…, 'manager')` or `'owner'`, which staff is not. The
refusal is then attributable to the write policy and nothing else. That is `T-role`,
and it catches the leak above.

⚠️ **This is a role claim living in a tenancy task, and that was a decision made on the
owner's behalf.** It is here because without it the suite's central mode is
unattributed, not because 3.2b-i grew an appetite for role testing. **Which locations a
staff user may write is a different wall and is still 3.3.** Cheap to overturn — it is
one loop and twelve tests in a file that ships no migration.

### ⚠️ Found in 3.2b-i — THE `with check` CLAUSES ARE SHADOWED, AND NOTHING BEHAVIOURAL CAN OBSERVE THEM

All eight update policies are written with USING and WITH CHECK as the **same
expression**. That makes the WITH CHECK unreachable as a first cause of refusal:

- if USING fails, no row is selected, so there is nothing to check — the result is
  `filtered`, and a staff user updating its own workspace was confirmed to land there;
- if USING passes, the caller holds the role on that workspace, so the only new row
  image the WITH CHECK would reject is one that has **moved** to another workspace —
  and that image is also invisible to the SELECT policy, which Postgres applies to the
  post-update row and which refuses it **first**.

Confirmed both ways: `alter policy provider_update … with check (true)` leaves the whole
suite green and the move still refused; open the SELECT policy as well and the refusal
that finally arrives is a **unique violation**, not a policy one.

⚠️ **Nothing is owed here — the schema is correct, and defence in depth is the right
shape.** What changed is that the ADR's "gets zero rows and a rejection" is now known to
be delivered by a *different predicate* than the obvious reading suggests, and the suite
says so rather than taking the credit. **F18 asserts the two conditions that make the
shadowing true**, so a migration that makes USING and WITH CHECK differ turns the suite
red and whoever is there re-derives what `T-move` is entitled to claim.

### Settled in 3.2b-i, and binding on 3.2b-ii and 3.3

**1. A write suite undoes each write as it measures it, not just at the end.**
`pg_temp.attempt()` runs the statement, records mode / row count / sqlstate, then raises
a private sqlstate `TU001` to roll back its own subtransaction — plpgsql variables
survive, database changes do not. The file is still one transaction ending in
`rollback`, but that alone was not enough: the positive controls really do delete 365
price-list rows, and a suite whose later measurements read a ledger its earlier ones
changed is a suite whose results depend on their own order. **F15 proves the ledger came
back**, per table, from counts taken before anything ran.

**2. `attempt()` is SECURITY INVOKER and must stay that way.** `security definer` would
run every statement as the function owner — `postgres`, which bypasses RLS — and the
whole file would pass while measuring nothing. Falsified: it turns F3 red, because
`role_seen` is recorded from *inside* the function rather than from what the caller
believed it had set.

**3. The grant wall is measured once, the tenant walls twice.** A table privilege is
held by the ROLE: `authenticated` either has `insert on public.sale` or it does not, and
both owners meet the identical ACL, so measuring it from both would be duplication
rather than a second claim. F14 asserts the two actors really do share one role.
`filtered` and `denied-check` depend on which workspace the caller belongs to, so those
are measured in both directions.

**4. The three modes are told apart by MESSAGE TEXT, because two share sqlstate 42501.**
That is fragile on purpose rather than by accident: anything matching neither pattern is
recorded as `unclassified` and F11 fails on it, so a Postgres rewording turns the suite
red instead of silently collapsing two different facts into one.

### 3.2b was split on 2026-08-22, before it was written

3.2b was sized L for one reason and it turned out to be the wrong one. The estimate
assumed the expense was breadth — 20 tables × 3 verbs is 60 write attempts. It is not:
58 of those 60 need no knowledge of the domain at all, because **Postgres checks the
GRANT before it forms the row**, so `insert into public.sale default values` under
`set role authenticated` returns `42501 permission denied for table sale` and never
reaches a NOT NULL, a foreign key, or a policy. Confirmed by probe before the split
was written.

The expense is the other two: **an insert that must be valid enough to reach the WITH
CHECK.** For the eight tables `authenticated` may insert into, a rejected insert
proves nothing unless the same payload is accepted into the caller's own workspace —
otherwise "rejected" may mean a missing `provider_id`, and the suite is green about
the wrong wall. Eight hand-built payloads, each with a positive control, is the whole
of the remaining work, and it is unrelated to everything else in the task.

So the split is along that seam, and the first piece is the one that needs no
fixtures:

- **3.2b-i** — the grant wall, the filter, the WITH CHECK reached by *moving* a row,
  and the append-only triggers. Payload-free from end to end.
- **3.2b-ii** — the eight insert payloads and their positive controls.

⚠️ **The probe found a THIRD rejection mode, and the plan's done-when named two.**
The row said "rejected because no policy exists" versus "rejected by a predicate".
The schema actually rejects a cross-tenant write in three distinguishable ways:

| Mode | What happened | Looks like |
|---|---|---|
| `denied-grant` | `authenticated` holds no privilege; **RLS is never consulted** | `42501 permission denied for table <t>` |
| `filtered` | The USING predicate made B's rows invisible; the statement **succeeds** | no error, `row_count = 0` |
| `denied-check` | The WITH CHECK predicate refused the new row image | `42501 new row violates row-level security policy for table <t>` |

⚠️ **Two of the three share sqlstate 42501**, so the mechanism can only be told apart
by the message text. 3.2b-i classifies on the message, and records `unclassified` for
anything that matches neither — which is what a future Postgres rewording turns red,
rather than silently collapsing two different facts into one.

⚠️ **`filtered` is the mode with no error at all, and it is the dangerous one.** A
cross-tenant `update` on `provider` is *accepted* and changes nothing. That is correct
behaviour and it is indistinguishable from a statement that did nothing for any other
reason — which is why every filtered pair carries a positive control: the identical
statement aimed at the caller's own workspace must affect more than zero rows.

### ⚠️ Found in 3.2a — THE SEED LEAVES ONE TENANT TABLE EMPTY, AND `workspace_invite` IS IT

Eighteen of the nineteen tenant tables hold rows in **both** workspaces in the seed —
2 649 stock movements for merchant A against 865 for merchant B, and so on down. The
nineteenth does not. **`workspace_invite` is empty in both.** Nobody has ever been
invited to either shop.

That matters more than it sounds. "A user in workspace A sees none of workspace B's
invites" is trivially true when B has no invites, and it stays true if the policy is
deleted, if RLS is switched off, and if the table is granted to `anon`. It is a green
test that measures nothing — the vacuous pass ADR-035 §9 exists to refuse, arriving
through the fixture rather than through the role.

**So the suite writes one invite per workspace and rolls the whole file back**, and F7
asserts per table that both workspaces held rows *at the moment they were measured*, so
this can never happen again quietly to a different table.

⚠️ **The alternative was to fix the seed, and it is the owner's to overturn.** It would
be the better home for the row — `workspace_invite` is a real part of onboarding and the
seed models everything else about it — but the seed is read by 203 behavioural checks and
six seed-check files that assert **absolute counts** over it, and this is a test-suite
task that ships no migration. Adding two rows there is cheap to do and not cheap to be
wrong about. **If the seed grows invites later, F9 goes red on purpose** and whoever is
there decides whether the fixture is still wanted, rather than the suite silently
measuring somebody else's rows.

### Settled in 3.2a, and binding on 3.2b and 3.3

**1. A behavioural suite may write, if it rolls back — and 3.2a is the first to.**
`01_rls_coverage.sql` reads catalogs and needs no transaction. This one needs the
`workspace_invite` fixture above, so the file is `begin` … `rollback`, and
`_teardown.sql`'s promise still holds: the database the seed checks read next is byte
for byte what `supabase db reset` produced, asserted by running the full CI sequence
locally afterwards. A failing suite never reaches the `rollback` — psql stops on the
exception `finish(exception_on_failure := true)` raises and drops the connection, which
rolls it back anyway. **3.2b will need this more than 3.2a did**, since a write suite is
mostly rejected writes and a few accepted ones.

**2. Two owners, not two cashiers.** The seed's fixed uuids `…0001` (Tienda Doña Lupe)
and `…0005` (Abarrotes El Roble). An owner sees every location of their own workspace,
so "sees exactly its own rows and nothing else" is a claim about the **tenant** wall with
the store wall deliberately held open. The store wall is 3.3, and `my_locations()` is the
predicate under test there — 3.3 should use the cashiers `…0003`, `…0004` and `…0006`,
each of whom the seed assigns to exactly one store.

**3. "Sees all of its own" is asserted beside "sees none of theirs", and both are
load-bearing.** The first alone passes on a table nobody can read at all — which is what
a *deleted* policy produces, since RLS with no policy denies everything. The second alone
passes on a table everybody can read. **The plan's done-when for 3.2a — "a policy deleted
from any one table fails the suite" — is satisfied by the first of the pair**, and
falsification F-a confirmed it by dropping `sale_line_select`.

**4. The signed-out caller is asserted too, and the refusal is named.** Every table in
`public`, `unit` included, is refused to `anon` — and the suite records *which* refusal:
a missing `GRANT`, not a policy. On this schema anon never reaches RLS at all, because
every migration opens with `revoke all … from anon, authenticated`. 01's F9 and F11 make
both halves of that claim from the catalog; this makes it by asking. **The distinction is
3.2b's whole subject** arriving early: *rejected because no policy exists* and *rejected
by a predicate* are different facts about a schema.

### Eight falsifications, run by hand before 3.2a was committed

A suite that reads rows is harder to fool than a structural one, and easier to write so
that it passes for the wrong reason. Each of these was introduced, the suite run, the
failure read by name, and the change reverted. **All eight exited non-zero.**

| Falsified | Caught by |
|---|---|
| `drop policy sale_line_select on public.sale_line` | `T-all sale_line`, both directions — the count collapsed to 0 |
| `using (workspace_id in (select public.my_workspaces()) or true)` on `provider` — **a leak that mentions a tenancy helper, so `01` passes it** | `T-read provider` and `T-all provider`, both directions |
| `alter table public.provider disable row level security` | the same four |
| `grant select on public.sale to anon` | `T-anon sale` — mode became `read`, not `denied` |
| `create table public.leaky (note text)` — untenanted, unclassifiable | F6, naming it |
| Owner A given a membership in workspace B | F5, plus 19 `T-read` failures that were correct |
| **The `set role authenticated` removed** — every count measured as the session user | F3, plus every `T-read` in the file |
| **The fixture written for one workspace only** | F7, naming `workspace_invite` |

The last two are the ones worth keeping. They are failures of the harness rather than of
the schema, and both are invisible to any test that trusts its own setup: the seventh is
the vacuous green `supabase/README.md` warns about, and the eighth is the same green
arriving through an empty table instead of a superuser.

### ✅ Found in 3.1, CLOSED 2026-08-22 by the owner — §2.10 NAMED A POLICY THAT DOES NOT EXIST

ADR-035 §2.10's first row asks for *"at least one `tenant_isolation` policy"*. **No
policy in this schema is called that.** The applied migrations name policies
`<table>_<verb>` — `sale_line_select`, `provider_update`, `workspace_member_delete` —
forty of them, and the ADR's name appears on none.

Read literally, the ADR's own suite fails on all twenty tables while the schema is
entirely correct. So `01_rls_coverage.sql` asserts the **structure** §2.10 describes
and not the **name** it happened to use, and says so in its header.

⚠️ **This is a real disagreement between the ADR and the applied schema, and the ADR
wins by the rule in `CLAUDE.md` — so one of the two should move, and it is not this
file's call.** Two ways to close it, and they cost differently:

- **The migrations' convention wins**, and §2.10's sentence is amended to describe the
  structure rather than a name. Costs one edit to the ADR. Nothing in the database
  moves.
- **The ADR's name wins**, and every policy is renamed. That is `drop policy` /
  `create policy` × 40 in a new migration — no data moves, but it touches every RLS
  object in the repo at once, and the four-verb convention (`_select`, `_insert`,
  `_update`, `_delete`) is genuinely more useful in an error message than forty
  policies all called `tenant_isolation`.

**The recommendation is the first**, and it is the cheaper one, which is why it is
flagged now rather than after 3.2a and 3.2b have written assertions against forty
policy names.

**✅ CLOSED 2026-08-22: the owner took the first, and ADR-035 is the file that moved.**
§2.10's coverage row now states the structural requirement — a policy whose predicate
is scoped by a tenancy helper — instead of a policy name, which is what
`01_rls_coverage.sql` was already asserting. **No schema change; no migration.**

⚠️ **The fix was extended to §2.7, and that was a decision made on the owner's behalf.**
The instruction named §2.10, but §2.10 was downstream: §2.7's worked example is where
the name `tenant_isolation` actually originates, and amending only §2.10 would have left
the ADR still showing a name the database does not use — and a future reader copying the
example would recreate the disagreement. §2.7 now names its two example policies
`price_list_select` and `sale_line_select`, and carries a short note recording why the
convention won.

⚠️ **Two words were added to that example beyond the rename — `for select` and `to
authenticated` — and they are a substantive correction, not tidying.** The example
created its policies with neither. A policy with no verb defaults to `ALL`; a policy with
no `TO` targets `PUBLIC`, which on this schema would hand the predicate to `anon`. The
applied migrations do both correctly and `01_rls_coverage.sql`'s F11 asserts the second,
so the ADR's own example would have failed the ADR's own suite. **Cheap to overturn — it
is prose, and no policy in the database changed.**

### ⚠️ Found in 3.1 — A NEW TABLE IN `public` IS BORN WITH `TRUNCATE` GRANTED TO `authenticated`

This one is not a naming quibble, and it is the reason F9 and F10 are in the suite.

`alter default privileges … in schema public` on this project grants `Dxtm` —
**TRUNCATE**, REFERENCES, TRIGGER, MAINTAIN — to `anon`, `authenticated` and
`service_role` on every table created there. It is Supabase's default and no
migration in this repo set it. **TRUNCATE ignores row-level security entirely**: it
is not a `delete` with a policy applied to it, it is a relation-level operation that
RLS does not see.

The twenty applied tables are clean, and they are clean **only** because every
migration opens with `revoke all on <table> from anon, authenticated;` before it
grants. That line is easy to read as boilerplate. It is not: the first migration
that omits it ships a table any signed-in cashier can empty across the tenant
wall — and nothing in the migration file would show it, because the grant does not
appear there.

Confirmed by falsification: `create table public.leaky (...)` with nothing else at
all turns F9 and F10 red on the next run, naming the table.

⚠️ **Nothing is owed here — the schema is correct today.** What changed is that it is
now *asserted* rather than *conventional*, and the assertion arrived before `0006`,
which is the next migration to create tables.

### Settled in 3.1, and binding on 3.2a through 3.7

Four harness decisions, all made on the owner's behalf. None of them is expensive to
overturn — no migration, no data — but each shapes every suite that comes after, so
they are named rather than left in a file header.

**1. pgTAP is installed per CI run, not by a migration.** It is roughly a thousand
functions plus two views. Migrations are append-only, so a `0015_pgtap.sql` would put
a test framework in every production database with no way back. `_setup.sql` installs
it, `_teardown.sql` drops it, and the database the next CI step reads is byte for
byte what the reset built — asserted, not assumed.

**2. It goes in its own schema `tap`, not `public`.** The default is `public`, and
`public` is precisely what the coverage suite makes claims about — `create extension
pgtap` there adds `tap_funky` and `pg_all_foreign_keys` beside the twenty tables. A
coverage suite that has to special-case its own framework is a coverage suite with a
hole in it.

**3. pgTAP ADDS TO `supabase/tests/`; it does not replace it.** ⚠️ Both
`.github/workflows/db.yml` and `supabase/README.md` said *"ADR-035 §3 step 3 replaces
supabase/tests/ with pgTAP"* — **that is a reading the ADR does not make**, and both
files are corrected. §3 step 3 names the suites pgTAP is the home of and says nothing
about the 203 behavioural checks already standing, every one of which has been
falsified at least once. Rewriting working, falsified assertions into a second
framework would risk a great deal to buy tidiness. **Owner's call to overturn, and
it stays cheap** — it is a directory, not a schema.

**4. Every suite ends with `finish(exception_on_failure := true)`.** ⚠️ **A pgTAP file
under plain `psql` exits 0 when its tests fail.** It prints `not ok` to stdout and
stops; nothing in the process status distinguishes it from a clean run, which is the
silently-skipped-step failure `CLAUDE.md` warns about, arriving through a different
door. `finish(exception_on_failure := true)` raises so `ON_ERROR_STOP` can work. Note
the spelling: pgTAP 1.3.3 has no `finish(exception := …)` — the form upstream
documentation shows errors out, which at least fails in the safe direction.

### Seven falsifications, run by hand before 3.1 was committed

A structural suite is the easiest kind to write so that it cannot go red — it reads
catalogs, and catalogs are almost always in the state you expect. Each of these was
introduced, the suite run, the failure read by name, and the change reverted:

| Falsified | Caught by |
|---|---|
| `create table public.leaky (workspace_id uuid, note text)` — no RLS, no policy | F3, F9, F10, `T-rls leaky`, `T-pol leaky` |
| The same table with RLS enabled and no policy written | F3, F9, F10, `T-pol silent` |
| `create policy sale_line_open … using (true)` on a real ledger table | F5, `T-scope sale_line.sale_line_open` |
| A correctly-scoped policy created without `to authenticated`, so it targets `PUBLIC` | F11 |
| `grant truncate on public.sale to authenticated` | F10 |
| `alter table public.stock_movement disable row level security` | `T-rls stock_movement` |
| The suite run **after** `seed_invariant.sql` instead of before it | F2, plus one `T-rls` per scaffolding table |

Every one exited non-zero. The last is the one worth keeping: it means the CI step's
position is a claim the suite makes about itself, so moving it turns the job red
rather than quiet.

### ⚠️ The concurrency suite could not be run locally for 3.1, and CI is the evidence

✅ **CLOSED BY 3.7b on 2026-09-02 — this is the paragraph that decided that task.**
The file below is retired and its claim is `supabase/vitest/test/allocation-race.test.ts`,
which needs no `psql` and was run locally, green, with all five of its falsifications.
The rest of this section is left as written, because it records what was true of the
run it cites and because it is the evidence the port was worth making.

`supabase/tests/0005_allocation_concurrency.sh` shells out to `psql`, and `psql` is
not installed on the schema owner's machine — everything else in this repo reaches
the database through the container. Its 9 checks failed locally with
`psql: command not found` on every one, which is an environment fact and not a
regression: the file is untouched since `0010`, and the CI runner has `psql`.
The other five suites and all six seed-check files were run locally and passed.
**The green CI run linked in the 3.1 row is what makes the claim**, per ADR-035 §9,
and that is the point of the rule.

### What step 3 does NOT ship, and where those rows went

Three of ADR-035 §2.10's nine rows cannot be written yet, **and half of a fourth**,
and they are named here so they are not silently dropped:

- **Failure path** (*"a rejected sale yields exactly one `failed_write` row, one
  linked compensating movement, and a balance matching the shelf"*) — `failed_write`
  and `record_failed_write` are `0007`, which is **step 4.5**. The ADR already files
  the suite there: §3 step 4.5 says *"and the pgTAP suites that cover them"*.
- **Replay** (dead-letter → downgrade → replay, keeping the original `occurred_at`) —
  same table, same step, same sentence in §3.
- **The `record_sale` clause of location isolation** — *"a staff `record_sale`
  against an unassigned location is rejected"*. `record_sale` is `0006`, **step 4**.
  3.3 asserts the read half now, over the predicate the RPC will inherit, and the
  write half is owed by step 4.

- ⚠️ **HALF OF THE CONCURRENCY ROW, found in 3.7a.** *"Two sessions, last unit,
  **enforcement on** → exactly one succeeds"* is the availability check inside
  `record_sale` — §2.6, *"the RPC contains the enforcement path: lock the open batches
  for the variant, evaluate availability, then insert or raise"* — so it is `0006`,
  **step 4**. `workspace_setting.enforce_stock_default` has existed since `0001` and
  defaults `false`; there is nothing today for it to switch on. 3.7a ships the row's
  other clause, *"two identical calls, same id → exactly one row"*, which the applied
  schema does carry. ⚠️ **And two of §2.6's four idempotency behaviours go with it**:
  `already_recorded: true` is a return value and a table has no return value, and the
  `payload_hash` discriminator dead-letters into `failed_write`, which is `0007`,
  **step 4.5**. The column is on all three headers already — the discriminator is not.

And one row §2.10 does **not** name, which 3.4 found and the owner settled on 2026-08-26:

- ⚠️ **RECEIPT COMPLETENESS — a deferred constraint trigger, owed by `0006`.** A lot that
  opens and never receives is invisible to §2.4 (see *Found in 3.4* above and the 1.3a
  bullet). `0006` must make it unrepresentable rather than merely tested, **deferred to
  commit** because the batch and its movement are necessarily separate statements:

  > for every `stock_batch` with `origin in ('purchase', 'transfer')`, the sum of its
  > **live receipt movements** — `reason = 'purchase'` or `'transfer_in'`, with
  > `reversal_of_movement_id is null` — equals `qty_received_base`.

  ⚠️ **`reversal_of_movement_id is null` IS LOAD-BEARING.** Without it a voided delivery
  breaks the constraint, and a voided delivery is legitimate — `30_reversals.sql` writes
  one on purpose and 1.6c's is still in the seed. The filter is what lets the rule
  survive a void.

  ⚠️ **`origin = 'adjustment'` MUST BE EXCLUDED, and the reason is not tidiness.** An
  adjustment lot from `allocate_fefo()`'s shortfall branch three never received anything
  — it is opened so that an oversale of a never-stocked variant has a `batch_id` to land
  on. The seed's single one carries `qty_received_base = 2.000` against one `sale:
  -2.000` movement and nothing else, so **its `qty_received_base` is a fiction that
  `stock_batch_qty_positive` forces it to invent**. A constraint written over all three
  origins fires on it the day it ships.

  ✅ **Verified against a fresh `supabase db reset` on 2026-08-26**: zero violations
  across all 1 041 seeded lots for `purchase` and `transfer`, and exactly the one
  expected `adjustment` lot outside the rule. That is the evidence the predicate is
  right, not a green tick — no CI check covers a docs-only change (`db.yml` filters on
  `supabase/**`).

⚠️ **So "do not build screens before this passes" is satisfied by 3.1–3.7 plus the
step 4.5 suites, not by 3.1–3.7 alone.** Reading §3 step 3 as the whole of §2.10
would have this step blocked on a table that step 4.5 creates.

---

## Step 4 — the write surface (§2.6)

*"Clients never insert. Ten functions are the entire write surface"* (ADR-035 §2.6).
`onboard_workspace` is applied already, in `0001`. **Three** belong to build step 4.5
— `record_failed_write`, `replay_failed_write` and, per ADR-035 §3 rather than §2.6,
`adjust_stock_delta` (see the note below). **Six remain, and they are step 4.**

**Split into 4a / 4b / 4c / 4d / 4e / 4f on 2026-09-03, before any of it was
written** — six functions, six migrations, on the same rule 1.3, 1.6, step 2, 3.2b,
3.6 and 3.7 split under. ⚠️ **The
tasks are LETTERED, not numbered, because ADR-035 §3 already owns "step 4.5"** — a
task numbered 4.5 would collide with the build step that ships `failed_write`, and the
two are referenced side by side throughout this file.

⚠️ **THE SPLIT IS FORCED BY APPEND-ONLY, not merely advised by it.** A migration is
closed once CI has applied it, merging is automated, and every task here merges
separately — so six functions cannot share one unapplied file across six sessions.
Each task is therefore its own numbered migration, and the numbering below is the one
decision in this section that is expensive to revise.

### ✅ Settled by the owner 2026-09-03 — the pieces take `0015`+, and the `0006` / `0007` hold is retired

`supabase/README.md` reserved `0006` for the RPCs and `0007` for the failure path.
**Both reservations are now retired and those two numbers are permanent holes.** The
owner was asked because the choice is fixed the moment the first step-4 PR merges.

The reason is the trap `supabase/README.md` has flagged by name since `0010`: a
migration numbered `0006` **applies before `0010` on a fresh reset**, when only the
five-argument `allocate_fefo` exists. plpgsql resolves the functions a body calls at
call time, so a `record_sale` written against either signature applies clean — and the
wrong one fails **at the first till**, with no compiler to say so. Numbering every
piece above `0014` deletes that trap instead of documenting it: each function is
written against the final applied schema, and the six-argument allocator is the only
one that has ever existed at that point in the order.

**Nothing depended on the RPCs applying early.** No view in `0008`–`0014` calls one,
the seed calls the allocators directly rather than the RPCs, and `supabase/seeds/`
runs after every migration. The cost is cosmetic — two holes in the sequence, and a
reservation table in `supabase/README.md` that becomes a historical note. Both are
recorded there rather than quietly overwritten.

| # | Task | Migration | Size | Done when |
|---|------|-----------|------|-----------|
| 4a ✅ | **Receipt completeness — the deferred constraint 3.4 found.** The rule before the functions that must satisfy it | `0015` | S | **DONE 2026-09-03.** Three `deferrable initially deferred` constraint triggers; 30 behavioural checks, 10 over the seed, six falsifications. The seed's 1 041 lots pass, the one `adjustment` lot is outside the rule, and a deleted receipt is refused at commit with the immutability guard lifted by name |
| 4b-i ✅ | **`record_sale`, the whole function, and its contract** — header, lines, FEFO within the location, movements, the tax split, balance update, one transaction; plus the three rules that are the RPC's OWN rather than the schema's: the location wall, idempotency, and the timestamps | `0016` | M | **DONE 2026-09-03.** 63 behavioural checks and ELEVEN falsifications. §2.10's location-isolation WRITE half is closed. Two of the eleven found defects in the SUITE rather than the function — a vacuously green check and a vacuously green report block, the latter present in all six suites and fixed in all six |
| 4b-ii ✅ | **The arithmetic and allocation breadth of the same function** — no migration | *(none)* | M | **DONE 2026-09-03.** `supabase/tests/0016` goes 63 → 89 checks, seven falsifications. Multi-lot FEFO within one line; BOTH shortfall branches reachable with stock on the shelf (the third is check 3.7's); mixed rates in one document; a weighed decimal at a half-centavo boundary; the residual identity over every line in the database, anchored to the price the till sent. **No defect found in `0016`** |
| 4c-i ✅ | **The availability check — built, dormant**, and the psql evidence for it | `0017` | M | **DONE 2026-09-03.** 35 behavioural checks, 9 more over the seed, eight falsifications on the function and three on the seed check. ⚠️ **Check 6.2 did NOT need to move and did NOT go red** — see the finding below. ⚠️ **F6 — the lock deleted — turned NOTHING red**, which is the measured case for 4c-ii |
| 4c-ii ✅ | **§2.10's first concurrency clause** — no migration | *(none)* | M | **DONE 2026-09-04.** `supabase/vitest/test/availability-race.test.ts`: THREE races, 13 tests, six falsifications. The suite goes 16 → 29 and **§2.10's concurrency row is CLOSED**. ⚠️⚠️ **W-F5 — `for update skip locked` — leaves ALL FOUR of the last-unit race's outcome assertions GREEN**, and only the second race catches it. The clause as §2.10 words it is not the whole property |
| 4d-i ✅ | **`record_purchase`, the whole function, and its contract** — header, lines, one lot per line with expiry by ADR-017, the positive receipt movement; the tax split NET-first; the location wall, the provider wall, idempotency, the timestamps | `0018` | M | **DONE 2026-09-04.** 82 behavioural checks and TEN falsifications. ⚠️⚠️ **A FIFTH SHAPE OF VACUOUS GREEN, and it cost 18 checks**: a verdict recorded inside a transaction that ends in `rollback` VANISHES from the report, and the file said *all 62 checks passed* while the whole location wall, the provider wall and the entire payload ladder asserted nothing. ⚠️ **One defect found IN `0018`** by the suite — `qty_display` is `numeric(14,3)` too, so the ladder needed a second arm |
| 4d-ii ✅ | **`record_waste`** — header, lines with reason and a quantity-weighted cost snapshot, FEFO within the location, negative movements, the tax split on the SALE shape | `0019` | M | **DONE 2026-09-04.** 67 behavioural checks, ten falsifications. ⚠️⚠️ **THE OPEN QUESTION IS CLOSED BY THE OWNER: waste records UNCONDITIONALLY**, no availability check — the loss already happened, and refusing it discards the only record of it. Section 6 is the PAIR that proves it: same variant, same quantity, enforcement ON, the SALE refused `TD002` and the write-off recorded. ⚠️ **F10 turned NOTHING red** and the suite grew two checks because of it |
| 4e-i | **`record_transfer`, the whole function, and its contract** — TWO location walls and the one-workspace comparison §2.6 requires, the line ladder, `allocate_transfer()` per line, idempotency with no header to store it on, the timestamps | `0020` | M | **DONE 2026-09-04.** 76 behavioural checks and TWELVE falsifications. ⚠️⚠️ **F8 — the enforcement block reading the DESTINATION's shelf — turned NOTHING red on 74 checks**, and closing it took the only variant shape the two readings disagree about (6.7/6.8). ⚠️⚠️ **F9 — the advisory lock deleted — turned nothing red either**, and that one is still open: it is a NEW owed row, not one of §2.10's nine. ✅ No defect found in `0020` itself. Original criteria: both locations validated and both resolving to ONE workspace; one `transfer_group_id` over every leg; the destination lots carry cost and expiry forward and NOT `received_at` or `provider_id` (`0005`); a re-sent id returns `already_recorded` and a changed payload under the same id returns `TD001` |
| 4e-ii-a ✅ | **`void_transaction`, the whole function** — a compensating document with `reversal_of` set, over all three kinds, and the §2.7 fence | `0021` | M | **DONE 2026-09-04.** 64 behavioural checks and SIXTEEN falsifications. ⚠️⚠️ **F2 — the basis forced back to `occurred_at`, the exact rule the amendment replaced — turns check 7.2 RED AND NOTHING ELSE**, so the owner's decision is not merely implemented, it is the only reading the suite admits. ⚠️⚠️ **F12 FOUND A HOLE: the wall is written out THREE times, once per kind, and only the `purchase` copy was watched** — deleting it from the `sale` or `waste` lookup turned nothing red until 2.4b/2.4c existed. ⚠️⚠️ **F6 TURNED NOTHING RED AND CANNOT TODAY** — a NEW owed row, see below. ⚠️ **F11 turned nothing red and is honestly recorded as redundant by construction.** ⚠️⚠️ **A SIXTH SHAPE OF MISLEADING GREEN, and it is fixed in `_cleanup.sql`**: a suite that ABORTS never reaches its own `drop function`, so a helper leaks into the next suite of the same CI job. ✅ No defect found in `0021` itself
| 4e-ii-b | **Test breadth over the same function** — the per-kind matrix and the falsifications — no migration | *(none)* | M | ⚠️ **Split 2026-09-04 in sizing, on the seam 4e PRE-COMMITTED**, so `0022` and `0023` do NOT move. Reasoning under *Settled in sizing 4e-ii* |
| 4f | **`adjust_stock`** — opening balances and physical counts, absolute | `0022` | S | CI green; the counted figure wins; the location wall is the RPC's own. ⚠️ **`adjust_stock_delta` is NOT here — ADR-035 §3 ships it in step 4.5**, see below |

Order is forced, and not by foreign keys this time:

- **4a is first because a constraint is cheaper to satisfy than to retrofit.** Every
  function after it that opens a lot is written under a rule already in force, rather
  than the rule arriving later and having to be true retroactively of code already
  merged. It also closes the one finding this plan has left open since 3.4 — receipt
  completeness is **unguarded on `main` today**.
- **4b-ii after 4b-i, and it moves no schema.** The function is whole when `0016`
  merges; 4b-ii is the evidence for the paths 4b-i's suite does not walk. The seam is
  test breadth, NOT function completeness — see the sizing section below for why the
  other candidate seam was refused.
- **4c after 4b-ii** — there is nothing to make dormant inside a function that does not
  exist. It is a separate migration rather than 4b's last twenty lines because §2.6
  calls the enforcement path *"the irreversible half"*, and the review it deserves is
  not the review a 400-line function's first version gets. ⚠️ **4c was itself sized
  and split into 4c-i / 4c-ii on 2026-09-03, before any of it was written** — it is an
  `L`, not the `M` this table first estimated. Reasoning under *Settled in sizing 4c*.
- **4c-ii after 4c-i, and it moves no schema.** The enforcement path is whole when
  `0017` merges; 4c-ii is §2.10's concurrency clause in a second language. Same seam
  as 4b-ii, and expressly NOT the document/ledger seam 4b refused.
- **4d after 4b** — `record_purchase` inherits the location wall, the idempotency
  block and the timestamp rules 4b establishes. Writing them twice in parallel is how
  two spellings of one rule get merged. ⚠️ **4d was itself sized and split into 4d-i /
  4d-ii on 2026-09-04, before any of it was written** — it is an `L`, not the `M` this
  table first estimated, and unlike 4b and 4c **the seam is the FUNCTION, which cost a
  renumbering**. Reasoning under *Settled in sizing 4d*.
- **4d-ii after 4d-i, and it is not the test-breadth seam 4b and 4c used.** Two whole
  functions cannot share one unapplied `0018` across two sessions — the same
  append-only argument that forced the six-way split in the first place, applied one
  level down.
- **4e after 4d**, because `void_transaction` covers all three document kinds and two
  of them do not exist until then. ⚠️ **4e was itself sized and split into 4e-i /
  4e-ii on 2026-09-04, before any of it was written** — it is an `L`, not the `M`
  this table first estimated, and the seam is 4d's rather than 4b's: two whole
  functions, so **a second renumbering**. Reasoning under *Settled in sizing 4e*.
- **4e-ii after 4e-i, and it is not the test-breadth seam 4b and 4c used** — same
  append-only argument as 4d-ii. ⚠️ **If `void_transaction` overflows one session
  the overflow takes 4b-ii's seam and ships NO migration**, decided in sizing so
  that a third renumbering never arises. ✅ **IT DID, AND THAT SEAM WAS TAKEN ON
  2026-09-04**: 4e-ii is an `L`, split into **4e-ii-a** (`0021`, the whole function)
  and **4e-ii-b** (test breadth, no migration). **`0022` and `0023` do not move** —
  pre-committing the seam is what bought that. **4f last**, and it is the smallest.

### ✅⚠️⚠️ CLOSED BY THE OWNER 2026-09-04 — WASTE RECORDS UNCONDITIONALLY, AND `0019` HAS NO AVAILABILITY CHECK

4c-i left this open BY NAME rather than settling it by writing the code first,
and `0018` could not settle it either — a delivery adds stock, so the question
never arose there. **The owner answered it before 4d-ii was written.**

> The loss already happened. Refusing to record spoilage because the shelf
> already reads zero does not put the carton back — it discards the only record
> that the stock ever existed, and *"what am I losing, and why"* (§2.8) is the one
> question Desperdicio is for. A shop whose books already disagree with its shelf
> is precisely the shop that most needs the write-off recorded.

`record_waste` therefore performs **no availability check and no enforcement
lookup at all** — not a check that resolves to false, an ABSENT one. The debt
stays visible as a negative `batch_balance` (§1, *stock is recorded, not
enforced*), which is the same answer §2.6 already gives for an offline sale and
for the same reason: the event is in the past and the database is being told
about it, not asked permission for it.

⚠️ **THE PAIR IS THE ARGUMENT, and section 6 of `supabase/tests/0019` is it:**

| | Document | Variant | On the shelf | Quantity | Enforcement | Outcome |
|---|---|---|---|---|---|---|
| 6.2 | `record_sale` | `var_enf` | 1 | 3 | **on** | **refused, `TD002`** |
| 6.3 | `record_waste` | `var_enf` | 1 | 3 | **on** | **recorded** |

Same variant, same store, same quantity, same enforcement, one statement apart.
**Nothing but the document kind differs, so nothing else can explain the
difference** — which is the shape 4c-ii's R2 established for enforcement on/off
and 4b-ii's mixed-rate ticket established for the tax split.

Three consequences, all asserted rather than assumed:

- **Both of `allocate_fefo()`'s shortfall branches are reachable here, always.**
  Branch 1 overdraws the existing lot (6.4, 6.5 — the shelf goes to −2 and NO
  adjustment lot is invented); branch 3 opens an `adjustment` lot for a variant
  the store never held (6.6), at **zero cost**, which 6.7 asserts as an honest
  *"we do not know what this cost"*.
- **An adjustment lot is outside `0015`'s rule** (6.8), which is why a write-off
  may open one with no receipt to fill it. That exclusion was settled in 4a and
  this is the first function that depends on it.
- **Turning the WORKSPACE default on changes nothing** (6.9). 6.2 vs 6.3 shows the
  outcome differs; 6.9 shows the mechanism is absent, because switching on the
  cheapest thing that would make a check fire does not make one fire.

### ⚠️⚠️ Found in 4d-ii — F10 TURNED NOTHING RED, AND THE CLAMPED TIME IS WHY

Nine of ten falsifications turned `supabase/tests/0019` red or killed it. **F10
changed `allocate_fefo(…, v_at)` to `allocate_fefo(…, now())` and not one of the
file's 65 checks moved.**

It matters on exactly one path, and nothing in the file reached it.
`p_occurred_at` is what STAMPS the `received_at` of a lot the allocator OPENS on a
shortfall, and `received_at` is FEFO's tiebreak (§2.4). **A backdated write-off
that opens a lot stamped `now()` puts a lot dated today at the back of the queue
when it belongs at the front**, and every later sale of that variant then consumes
the wrong one. `0016` states this reasoning at its own call site; nothing asserted
it anywhere until now.

Section 6 could not catch it — 6.6 opens a lot too, but ONLINE, where `v_at` and
`now()` are the same instant. Section 8 backdated three write-offs but all on a
variant WITH stock, so no lot was opened. **The gap needed both properties at
once**, and the suite grew checks 8.6 and 8.7 to have them. F10 re-run against the
closed gap turns 2 red.

⚠️ **BINDING ON 4e AND 4f.** `record_transfer` opens lots at the destination and
`adjust_stock` opens them outright. Both take an `occurred_at`, and neither is
covered by anything that exists today.

### ⚠️ Found in 4d-ii — THE RESIDUAL IDENTITY IS NOT THE SAME IDENTITY ON BOTH SIDES

`supabase/tests/0019` check 3.7 was first written by copying `0018`'s identity —
`net + tax = round(net × (1 + rate), 2)` — and it went **red on the 16% line**.

That is correct, and it is worth recording because the two files look alike. On
the BUY side the net is the anchor and that identity holds. On the SELL side the
GROSS is the anchor and the net is reached by DIVISION, so the algebra runs the
other way: `net = round((net + tax) / (1 + rate), 2)`. On the fixture's numbers
`round(20.09 × 1.16, 2)` is **23.30** and the document's gross is **23.31** —
§2.5 rule 4 doing its job, and it only has teeth on the side where the net is
divided out. 3.5 in `supabase/tests/0016` says the same thing about the sale.

### Settled in 4d-ii, and binding on 4e and 4f

- **The default denomination follows the DIRECTION of the document, not the table.**
  `record_waste` reads `sell_unit_code` — stock is leaving — where `record_purchase`
  reads `purchase_unit_code`. Check 4.4 is `0018`'s check 4.1 read backwards, on the
  same variant, so the pair is legible across the two files.
- **`reason` is in the payload hash**, because Desperdicio's whole output is grouped
  by it: the same stock written off as `robo o faltante` rather than `caducado` is a
  different document (7.4). Same argument as `0018`'s `expiry_date`.
- **A cost that spans lots is the QUANTITY-WEIGHTED MEAN**, rounded to
  `numeric(14,6)`. This was already `0011`'s documented shape and
  `supabase/checks/0011` already reconciles it against the movements' exact per-lot
  costs — 4d-ii is the first function that had to obey it. F5 (first lot's cost) and
  F6 (unweighted mean) each turn three checks red.
- ⚠️ **THE ALLOCATION IS TAKEN ONCE, INTO AN ARRAY.** The line cannot be written until
  the lots are known, and the document tables are immutable (0003), so there is no
  second pass — `record_waste` allocates FIRST, which is the reverse of `0016`.
  Calling `allocate_fefo()` twice would not re-read the same lots: the first call has
  already moved the balances it locked.
- **A cashier writes a ledger they cannot read, and it is asserted (9.1–9.4).** §2.7
  makes `waste` readable by every member and `waste_line` manager-and-above, because
  the header carries value and the line carries cost. ⚠️ **Check 9.4 is the half that
  matters**: without it, "the cashier sees no line" and "no line was written" are
  indistinguishable. 4b-i found the same shape on the sell side.

### Ten falsifications, run by hand before 4d-ii was committed

Against the APPLIED schema — `create or replace` over `0019`, the suite re-run, the
function restored.

| # | The change | What went red |
|---|---|---|
| F1 | the location wall deleted | **7 of 67** |
| F2 | the *reason is required* arm deleted | 1 — 2.3. The enum still refuses an UNKNOWN cause; what this arm buys is the ABSENT one |
| F3 | the default unit read as `purchase_unit_code` — `0018`'s | 2 — 4.1 and 4.4 |
| F4 | the tax split done NET-first — `0018`'s shape on a waste document | **5**, including the gross-first identity |
| F5 | the cost taken from the FIRST lot instead of the weighted mean | 3 — 5.3, 5.4, 5.6 |
| F6 | the cost taken as the UNWEIGHTED mean of the lots | 3 — the same three. ⚠️ 5.4 names 2.00, 5.00 and 3.50 as wrong answers precisely so both of these are caught |
| F7 | `reason` dropped from the payload hash | 1 — 7.4 |
| F8 | **an availability check ADDED — the owner's decision reversed** | ⚠️⚠️ **THE SUITE DIES.** Section 6's write-offs are meant to SUCCEED, so under `ON_ERROR_STOP=1` psql stops where it stands. Red by exit code, and the same shape as 4c-ii's W-F3 |
| F9 | the movements written POSITIVE | ⚠️ **THE SUITE DIES** — `stock_movement_sign_follows_reason` raises inside the first successful call |
| F10 | the allocator called with `now()` instead of the clamped time | ⚠️⚠️ **NOTHING.** See the finding above; the suite grew 8.6 and 8.7, and F10 re-run turns 2 red |

### ⚠️⚠️ Found in 4d-i — A FIFTH SHAPE OF VACUOUS GREEN: A CHECK THAT NEVER APPEARS AT ALL

**The first run of `supabase/tests/0018` reported *"all 62 checks passed"*. The file
contained 80 checks.** Eighteen of them — **every check in sections 1, 2 and 3, which
is the entire location wall, the entire provider wall and the whole payload ladder,
plus the three `TD001` rows** — had been silently discarded, and nothing said so.

`chk` records its verdict by INSERTING into `public._verify`. The refusal blocks
wrapped their calls in `begin … rollback`, copying a shape from 0016 and 0017 where
the enclosing transaction exists to scope `set local role authenticated`. **The
rollback threw the verdicts away with everything else.** The `serial` gaps in the
report were the only trace: n jumped 5 → 8, 11 → 22, 61 → 65.

⚠️ **THIS IS A DIFFERENT ANIMAL FROM THE FOUR ALREADY RECORDED, AND THE EXISTING
GUARDS CANNOT SEE IT.** Every one of those catches a check that RAN and asserted
nothing:

| | The shape | What catches it |
|---|---|---|
| 4b-i | a condition that is always true | reading the check, and falsification |
| 4b-i | `not passed` misses a NULL verdict | `passed is not true` in the report block |
| 4b-ii | a scalar-subquery check DIES where it should fail | `21000` surfaces as red |
| 4c-ii | a Vitest file dies in `beforeAll` — `numFailedTests: 0` | `!r.success` in `db.yml` |
| **4d-i** | **the verdict is rolled back — the row never exists** | **nothing. A report cannot miss what was never inserted** |

The fix is two lines of policy and one check:

- **The refusal blocks end in `commit`, not `rollback`, and the file says why at the
  first one.** Nothing in them writes anything — that is exactly what checks 1.4, 2.6,
  3.12 and 10.3 assert — so the commit keeps the verdicts and nothing else.
- **Check 10.7 asserts the file's own check count against a LITERAL.** Deliberately a
  literal and not anything derived: a count computed from the file would agree with the
  file whatever the file did. Adding a check means changing the number, which is the
  point — two places have to know, and a check that silently stops running cannot keep
  both happy.

⚠️ **BINDING ON 4d-ii THROUGH 4f, AND WORTH A LOOK BACKWARDS.** Every suite in
`supabase/tests/` that wraps a `chk_raises` in a rolled-back transaction has this bug.
0016 and 0017 were read for it during this task and are clean — their refusal blocks
either commit or never open a transaction — but **that was luck rather than a rule, and
the count guard is now the rule.**

### ⚠️ Found in 4d-i — `qty_display` IS `numeric(14,3)` TOO, AND ONE ARM DID NOT COVER IT

The one defect the suite found in `0018` itself. The validation ladder refused a
quantity that rounds to zero **in the base unit**, which is the gate 0016 needs. It is
not the only gate here: `purchase_line.qty_display` is `numeric(14,3)` as well, and on
any unit COARSER than the base the two disagree. **0.0004 kg is 0.4 g — comfortable in
the base unit, and zero in the denomination it was keyed in.**

The line therefore priced, reached `purchase_line`, and was refused there by
`purchase_line_qty_display_agrees` with **`23514` and a constraint name** — where the
ladder exists precisely so an operator is told which number they keyed is too small.
Check 3.11 caught it by asserting the SQLSTATE; a check that only demanded *"it
raises"* would have been green against the broken version. Fixed in `0018` with a
second arm, before it was ever applied.

⚠️ This is the same family as 3.2b-ii's *a payload is refused by the first wall it
meets, and that is not always the policy* — one level down, and on the buy side.

### ⚠️ Decided in 4d-i — EXPIRY RESOLVES IN THE STORE'S LOCAL DAY, AND THE SEED DISAGREES

ADR-017's tier 2 adds `product_family.default_lifespan_days` to the received date.
**`0018` computes that date in `location.timezone`, not in UTC.** A delivery signed for
at 21:00 in Mexico City is already tomorrow in UTC, so a UTC spelling is off by one for
every evening delivery a shop takes — and every one of them lands on the FEFO ordering.

⚠️ **`supabase/seeds/10_deliveries.sql` HARDCODES UTC** (`(occurred_at at time zone
'UTC')::date + lifespan`). It predates `0012`, which put the column on the table, and
`0013`, which established the `at time zone l.timezone` spelling the views now use. The
seed is a FIXTURE and is not the rule; it was left alone rather than corrected, because
changing seeded expiry dates would move the FEFO order every other suite asserts
against. **If the two ever need to agree, correcting the seed is the change, not
correcting `0018`.**

Checks 6.5–6.7 are the evidence, and 6.6 is what makes them worth having: the fixture
is built at 03:00 UTC precisely so the two spellings CANNOT agree. For most of the day
they do, and the check would pass under either.

### ⚠️ Decided in 4d-i — FOUR CALLS MADE ON THE OWNER'S BEHALF, AND ALL FOUR ARE CHEAP TODAY

None of these is settled by ADR-035 or by an earlier task. All four are recorded here
because merging is automated and the checkpoint that used to catch them is gone.

- **An INACTIVE provider is ACCEPTED** (check 2.5). A supplier is retired the day after
  a delivery arrives from them at least as often as the day before, and a shop cannot
  refuse to file paperwork for stock already on the shelf. ⚠️ **This is a shop-truth
  question and the owner may want the opposite** — it is one `if` either way, today.
- **The provider is compared in the idempotency guard** (check 8.6), which `record_sale`
  has no counterpart for. The same basket filed against a different supplier returns
  `TD001`, not `already_recorded`: §2.3 derives purchase-price MEMORY from these lines
  in `0008`, so accepting it would attribute the cost to whichever provider the client
  sent first and no report would ever disagree with itself.
- **`expiry_date` is IN the payload hash** (check 8.7). Two deliveries identical but for
  a use-by date are two different deliveries — the lots they open sort differently under
  FEFO. A corrected retry must not return `already_recorded` while the shelf keeps the
  first date.
- **The grant does NOT encode who may receive a delivery.** The owner settled that a
  cashier never accepts one, but that is a ROLE rule and this wall is a LOCATION wall.
  Putting a role test in the body would be a second spelling of an authorisation the RPC
  does not own. ⚠️ **If receiving is to be role-gated it is a policy question**, and it
  belongs where the other forty policies are.

### Settled in 4d-i, and binding on 4d-ii through 4f

- **The three contract rules are RE-SPELLED per function, not shared.** plpgsql has no
  mixin, and a helper holding the location check would put it back on the far side of
  the wall §2.6 names. `0018` repeats `0016`'s four lines verbatim.
- **`TD001` is REUSED, not re-invented.** One sqlstate for §2.6's *same id, different
  payload* across the whole write surface — a client branches on it once. 4d-ii, 4e and
  4f inherit that, and a second code would make the contract per-function.
- **The default denomination is the variant's own for the DIRECTION of the document.**
  `record_purchase` reads `purchase_unit_code`; `record_sale` reads `sell_unit_code`.
  ⚠️ **This is the error here that applies clean, prices correctly, and books a tenth of
  the stock** — F3b turns six checks red, and F3 (the label alone) turns only one.
- **No allocator runs in a function that CREATES lots**, so `record_purchase` takes no
  `batch_balance` lock at all. Check 7.10 asserts the absence rather than assuming it.
  ⚠️ **4d-ii is the opposite case** — `record_waste` removes stock and MUST call
  `allocate_fefo()` inside its own transaction (task 1.8).

### Ten falsifications, run by hand before 4d-i was committed

Against the APPLIED schema — `create or replace` over `0018`, the suite re-run, the
function restored. `0018` was not yet merged, so the one real defect (F0 below, found by
the suite rather than by a falsification) was fixed in the file itself.

| # | The change | What went red |
|---|---|---|
| F1 | the location wall deleted | **7 of 82.** 1.1–1.5, and 10.1/10.3 — the refused documents recorded instead |
| F2 | the provider workspace check deleted | 1 — 2.2. ⚠️ Only one, and correctly: `purchase_provider_fk` still refuses the row, so what the RPC's check buys is the SQLSTATE (`22023`, not `23503`), which is what 2.2 asserts |
| F3 | the stored `qty_display_unit` label read from `sell_unit_code` | ⚠️ **1 — 4.2 alone.** The label moved; the conversion did not. This is the narrow case, and 4.2 is the only check that can see it |
| F3b | **the whole conversion** read from `sell_unit_code` | **6** — 4.1, 4.2, 4.4, 4.5 and two in section 5. ⚠️ F3 was written first and its single red was mistaken for weak coverage; F3b is the falsification that was meant, and section 4 has teeth |
| F4 | the tax split done GROSS-first, the sale's shape | 3 — 5.1, 5.2, 5.4. The mixed-rate document is what makes 5.2 discriminate |
| F5 | expiry tier 1 gated behind `track_expiry` | 2 — 6.4 and 8.7. ADR-017 orders manual FIRST and unconditionally |
| F6 | expiry tier 2 resolved in UTC | 2 — 6.5 and 6.7, and only because the fixture is built at 03:00 UTC |
| F7 | `expiry_date` dropped from the payload hash | 1 — 8.7 |
| F8 | the provider dropped from the idempotency comparison | 1 — 8.6 |
| F9 | the receipt movement never written | ⚠️⚠️ **THE SUITE DIES AND REPORTS ZERO FAILURES.** `0015` is DEFERRED, so it raises at COMMIT — under `ON_ERROR_STOP=1` psql dies at the first successful call, the report never renders and the DROPs never run. Red by exit code alone, which is 4c-ii's W-F3 in a second language and why `create or replace` on the suite's own helpers is load-bearing |

⚠️ **F0, and it is not in the table because no falsification produced it: the SUITE
found a real defect in `0018`** — the `qty_display` rounding gate above. Nine of the ten
below confirm checks that were already right; F0 is the one that changed the function.

### ✅⚠️⚠️ CLOSED BY THE OWNER 2026-09-04 — THE VOID FENCE, AND AN ADR AMENDMENT THE OFFLINE STORE FORCED

**All three questions below were put to the owner before a line of `0021` was written.
Two were answered; the third was delegated and is recorded as taken on their behalf.**

✅ **1. THE FENCE IS §2.7's TWO-TIER RULE.** The owner confirmed the reading this file
had wrong. Staff void their OWN document inside the window; **manager and owner void
anything, at any time, unfenced.**

✅⚠️⚠️ **2. THE WINDOW READS `recorded_at` ON AN OFFLINE WRITE — AND THIS ONE AMENDED
ADR-035.** The owner's words: *"the store is offline a lot, use `recorded_at` for
offline writes."* §2.6 previously said the window reads `occurred_at`, full stop, and
that is a rule this task could NOT simply implement around — so **ADR-035 §2.6 and §2.7
were amended on the decision maker's instruction** (revision entry dated 2026-09-04),
rather than `0021` being written against an authority that contradicted it. ⚠️ **This is
the first time in step 4 that a task has changed the ADR rather than obeyed it**, and the
route matters: the owner is the decision maker the ADR names, and §4 already lists the
15-minute window as **Reversible**. ⚠️ **Daily totals were explicitly NOT touched** — the
amendment splits one sentence that had bound them to the window; a sale still counts on
the day it was made.

⚠️⚠️ **3. `TD003` — TAKEN ON THE OWNER'S BEHALF, AND IT IS THE CHEAP-NOW-DEAR-LATER ONE.**
The owner did not answer the sqlstate question and it was offered as delegable. **A void
refused by the fence raises a NEW `TD003`, not `42501`.** The reasoning: `42501` already
means *"this is not your store"*, which is a bug to report; *"you are past your window,
ask your manager"* is a WORKFLOW, and a till that cannot tell them apart either shows a
wrong message or pattern-matches on error text. It costs nothing today and a coordinated
release once a client branches on it — the same warning `TD001` and `TD002` carry.
**Reverse it now if it is wrong.**

---

**The original finding, kept because it is the reasoning the answers rest on:**

### ⚠️⚠️ FOUND WHILE SIZING 4e-ii, 2026-09-04 — THE PLAN'S VOID-WINDOW CLAUSE CONTRADICTED ADR-035 §2.7, AND THE ADR WON

**Found while sizing 4e-ii, before a line of `0021` was written.** This is the first
time in step 4 that this file and the ADR have disagreed about *behaviour* rather than
about a migration number, and `CLAUDE.md` settles who wins: the ADR is authoritative and
**this file is the bug**. It is recorded here rather than fixed silently because the
contract is cheap to change today and a fix-forward migration the moment `0021` merges.

**What this file said** (4e-ii's *done when*, written 2026-09-04 in the 4e sizing):

> *"§2.7's void window is enforced in the body, because a `security definer` RPC is on
> the far side of every policy that could carry it"*

**What ADR-035 §2.7 actually says** — the roles table, and it is not a deadline:

| Capability | Staff | Manager | Owner |
|------------|:-----:|:-------:|:-----:|
| Void **own** transaction **< 15 min** | ● | ● | ● |
| Void **any** transaction, **any time** | — | ● | ● |

⚠️⚠️ **The window is a ROLE ESCALATION BOUNDARY, NOT A TIME LIMIT ON VOIDING.** A
manager or an owner voids anything, at any time, and no window applies to them. Only a
staff member is fenced, and by *two* conditions at once — the document must be **theirs**
(`created_by = auth.uid()`) **and** inside `void_window_minutes`.

**Read literally, this file's clause is a function that refuses a manager's void of a
21-minute-old sale** — which §2.7 grants in as many words.

⚠️ **§2.6 does not merely permit the ADR reading, it DEPENDS on it.** The replay note:

> *"A replayed sale can land already outside the 15-minute void window, since that window
> is measured from `occurred_at`. Correcting a replayed sale therefore means
> `void_transaction`'s compensating-document path, not the fast void — which is the
> correct outcome for a transaction that has already been reconciled once."*

A bare window in the body makes **every replayed sale permanently uncorrectable**, which
inverts the sentence: §2.6 reaches for `void_transaction` *because* the window has already
passed. A path that refuses on exactly that condition cannot be the path §2.6 names.

✅ **`0001` HAS HAD THE RIGHT READING SINCE THE FOUNDATION MIGRATION**, and it is applied:

> `-- ADR-035 §2.7 — self-service void window. Beyond it, manager role required.`
> — `0001_foundation_tenancy_and_units.sql:272`

and the settings policy says why the client can read it at all — *"the client needs
`use_last_sell_price` and `void_window_minutes` **to render correctly**"* (`0001:561`).
The setting exists so the **UI** can decide whether to offer the fast, blameless
self-service void. That is the *"fast void"* §2.6 names and never specifies: **an
affordance over this same RPC, not an eleventh function.** §2.6's ten-row write surface
has no other candidate.

⚠️ **THE RULE THIS IMPLIES IS A FIRST FOR THE WRITE SURFACE.** `void_transaction` would
be the **only RPC in step 4 that reads a role at all** — the other five validate a
location and stop. `has_role(workspace_id, 'manager')` (`0001:381`) and `created_by`
(`0003:98`, `:258`, `:375`) both exist, so nothing is owed schema-side:

```
if not has_role(workspace_id, 'manager') then      -- staff
    require original.created_by = auth.uid()
    and    now() - original.occurred_at <= void_window_minutes
end if                                              -- manager/owner: unfenced
```

⚠️⚠️ **THE OWNER'S CALL, AND IT IS CHEAP NOW AND DEAR LATER.** Three things ride on it and
all three bake into `0021`: whether the fence is the two-tier role rule above; whether a
refusal gets its own sqlstate (`TD003`?) or reuses `42501` like the location wall; and
whether *"own"* really means `created_by`, which is the only column that can carry it.

✅ **ONE ADJACENT QUESTION NEEDS NO DECISION — the ADR already answered it.** Voiding a
**purchase** whose stock has since been sold drives `batch_balance.remaining_base`
negative. `0004:429` permits that deliberately, in the same breath as the permitted
oversale: *"a negative balance is a true statement about a disagreement between the ledger
and the shelf, and `adjust_stock` is how it gets resolved."* So the void records
unconditionally and does **not** check availability — the same shape the owner chose for
`record_waste`, and for the same reason.

### ⚠️⚠️ Settled in sizing 4e-ii, 2026-09-04 — IT IS AN `L`, AND THE SEAM WAS PRE-DECIDED, SO NO RENUMBERING

4e-ii was estimated `M` in the 4e sizing. **That estimate was made before `0020` was
written**, and every step-4 function so far has cost more than its first estimate: 4b was
one function and took two `M` sessions, 4c was one function's enforcement path and took
two, 4d was re-sized `L`, 4e was re-sized `L`. **4e-ii is THREE document kinds in one
function**, and it is an `L`.

The three kinds share the fence and nothing else:

| | void a `purchase` | void a `sale` | void a `waste` |
|---|---|---|---|
| Line table | `purchase_line` — cost, expiry, provider | `sale_line` — the gross-first tax anchor | `waste_line` — reason + cost snapshot |
| Stock direction | the original **opened** lots → the void **consumes** them | the original **consumed** lots → the void **returns** to them | as `sale` |
| Can go negative | ⚠️ **yes** — stock already sold on; permitted by `0004:429` | no | no |
| Tax shape | net-first (`0018`) | gross-first (`0016`) | gross-first (`0019`) |

**One kind cost `0018` 614 migration lines and a 1206-line suite.** Three kinds plus a
role fence that no other RPC has is not one session.

✅ **THE SEAM WAS ALREADY DECIDED AND COSTS NOTHING**, in the 4e sizing, precisely so this
moment would not produce a third renumbering:

> *"If `void_transaction` overflows one session the overflow takes 4b-ii's seam and NOT
> 4d's: the function lands whole in `0021` and the second half is a test-breadth task that
> ships no migration."*

| Task | Ships | Migration |
|---|---|---|
| **4e-ii-a** | `void_transaction` **whole** — all three kinds, the fence, the core suite | **`0021`** |
| **4e-ii-b** | test breadth over the same function — falsifications, the per-kind matrix | ⚠️ **none** |

⚠️ **`0022` (4f) and `0023` (step 4.5) DO NOT MOVE.** That is the whole point of having
pre-committed the seam, and it is why the second renumbering was the last one.


### ⚠️⚠️ Found in 4e-ii-a — THE LOCATION WALL IS WRITTEN THREE TIMES AND TWO COPIES WERE UNWATCHED

**F12, and it is 4e-i's F8 wearing different clothes.** `void_transaction` takes no
location: the location is a property of the DOCUMENT, so the wall is folded into the
lookup — and there are THREE lookups, one per kind, each carrying its own copy of
`and <alias>.location_id in (select public.my_locations())`.

Section 2 as first written tested **only the `purchase` copy**. Deleting the scoping
from the `sale` lookup turned **nothing** red. Deleting it from `waste` turned nothing
red. Both are total tenant-isolation failures on their branch, and the suite said
*all 62 checks passed*.

Checks **2.4b** and **2.4c** close it, and they needed a fixture that did not exist: a
sale and a write-off **at `loc_2`**, which the cashier is not assigned to. With those in
place each of the three walls is now independently falsifiable:

| Falsification | Red |
|---|---|
| wall dropped, `purchase` branch | 2.1, 2.3, 2.4 |
| wall dropped, `sale` branch | **2.4b** |
| wall dropped, `waste` branch | **2.4c** |

⚠️ **The lesson generalises past this file.** A rule copied once per branch needs a check
once per branch, and *"the wall is tested"* is not a claim a single check can carry when
the wall has three implementations. **`0021` is the only RPC on the write surface with
this shape** — the other five take a `location_id` parameter and validate it once.

### ⚠️⚠️ Found in 4e-ii-a — A SIXTH SHAPE OF MISLEADING GREEN, AND IT IS IN THE SHARED HARNESS

**Not a vacuous pass this time — a MASKED one, and it spans suites.**

A suite that ABORTS mid-file never reaches its own `drop function` at the bottom. The
helper it created survives the psql session, `_cleanup.sql` does not know about it, and
**the NEXT suite in the same CI job dies on `function "…" already exists`** — as does
every suite after it. What a reviewer reads is a cascade of identical harness errors
with the real defect nowhere in the log.

It was found the hard way: five falsifications in a row reported *"function already
exists"* instead of the defect they had injected, and the first of them had genuinely
been caught. **The falsification pass was measuring itself.**

⚠️ **The fix belongs in `_cleanup.sql`, not in the suite**, and that file's own header had
already predicted it: *"The known gap is non-table objects: a suite that creates a TYPE
or a standalone SEQUENCE would leak it, so add it to the explicit drops below if that day
comes."* That day came. `chk_succeeds` is dropped there now, alongside `chk` and
`chk_raises`.

⚠️ **`0019` has the same latent bug with `chk_message`** — dropped at the end of its own
file and absent from `_cleanup.sql`, so an abort in `0019` would poison `0020` and `0021`
in the same job. It has never fired because `0019` has never aborted. **Left alone rather
than fixed silently**, and named here so the next person who touches that file knows.

### ⚠️⚠️ Found in 4e-ii-a — HALF OF THE AMENDED WINDOW BASIS IS UNFALSIFIABLE UNTIL STEP 4.5

**F6: force the basis to `recorded_at` for EVERY write, online or offline. Nothing goes
red — and nothing in this database CAN.**

The amended rule is `case when recorded_offline then recorded_at else occurred_at end`.
F2 proves the OFFLINE arm: forcing it to `occurred_at` turns 7.2 red alone. The ONLINE
arm has no witness, because §2.6 **overrides `occurred_at` with `now()`** on an online
write — the two columns are set in the same statement and hold the same instant, so no
document exists that can tell the readings apart.

⚠️ **The first document that will is a REPLAYED one.** `replay_failed_write` preserves
the `occurred_at` stored on the `failed_write` row and takes a fresh `recorded_at` at the
moment of recovery — the one case where an online write has two different timestamps. It
ships in **step 4.5**.

So three things are true at once and all three are recorded rather than reconciled:

- `0021`'s `case` is **correct** — it implements what the owner decided;
- **half of it is untested**, and no check written today could change that;
- **step 4.5 owes the check**, because 4.5 is what creates the document that needs it —
  and it also owes the DECISION, which ADR-035 §2.6's amendment already flags as open:
  a replayed offline sale would be handed a brand-new fifteen minutes.

**This is a new owed row, not one of §2.10's nine**, and it is in the owed table above.

### ⚠️⚠️ Found in 4e-i — A FALSIFICATION FOUND THE ENFORCEMENT BLOCK READING THE WRONG SHELF

`0020`'s availability check is `0017`'s, re-spelled against the ORIGIN. **F8 pointed
it at the DESTINATION instead and not one of the suite's 74 checks went red.**

The reason is the shape of every enforced case the file had: `var_enf` holds ONE unit
at the origin and NONE at the destination, so a shipment of three is refused whichever
shelf the block reads, and the two readings agree on every check that existed. **A
destination is EXPECTED to be empty — that is what a transfer is for** — so the error
would have refused every FIRST shipment to a new store, which is precisely the case the
owner opened a second store to serve.

Closing it needed a variant the two readings DISAGREE about: `var_enf2`, enforcement on,
**TEN at the origin and NONE at the destination**, shipped successfully. Checks 6.7 and
6.8 are that, and 6.8 is the half that matters — without it, *"the destination was
empty"* and *"the destination was never checked"* are indistinguishable. **F8 re-run
against the closed gap KILLS the suite**, because 6.7's shipment is meant to succeed.

⚠️ **This is 4d-i's F3b in a second language** — an error that applies clean, prices
nothing wrong, and enforces against the wrong stock. It is also the second time a
falsification has found a hole in coverage rather than in a function, after 4b-i's two.

### ⚠️⚠️ Found in 4e-i — §2.6's THIRD IDEMPOTENCY ROW RESTS ON AN ADVISORY LOCK, AND F9 PROVES NOTHING WATCHES IT

`record_sale`, `record_purchase` and `record_waste` get §2.6's *"first attempt still in
flight → the second call blocks on the row lock"* for free: `insert … on conflict (id)
do nothing` against a primary key, and 3.7a names the blocking pid on all three tables.

⚠️⚠️ **`record_transfer` HAS NO KEY TO COLLIDE ON.** `transfer_group_id` is a plain
column and **cannot** be unique — one shipment writes many rows under one id, which is
the entire point of it. Two concurrent calls with the same id would both find no
movements, both proceed, and **ship the van twice**: double stock at the destination, a
double withdrawal at the origin, and nothing in the schema to refuse either.

`0020` closes that with `pg_advisory_xact_lock(hashtextextended(p_id::text, 0))`, taken
BEFORE the ledger is read. **⚠️⚠️ F9 DELETED IT AND TURNED NOT ONE OF THE 76 CHECKS
RED**, which is 4c-i's F6 finding in a third language and is measured rather than
assumed: one connection cannot block on its own lock.

⚠️ **THIS IS A NEW OWED ROW AND IT DID NOT EXIST BEFORE THIS TASK.** It is NOT one of
§2.10's nine — 4c-ii closed the concurrency row and 3.7a closed idempotency for the
three document tables. **A transfer re-sent concurrently is unproved on `main` today.**
The home for it is `supabase/vitest/test/idempotency.test.ts`, which already opens two
connections and already names the three document tables; a fourth case would add the
transfer. It is NOT in 4e-ii's *done when*, and the owner's call is whether it goes
there, into 4f, or into a task of its own.

### Twelve falsifications, run by hand before 4e-i was committed

Against the APPLIED schema — `create or replace` over `0020`, the suite re-run, the
function restored and re-verified green.

| # | The change | What went red |
|---|---|---|
| F1 | the ORIGIN location wall deleted | **7 of 76** — 1.5b, 1.9, 2.12, 8.1, 8.2, 9.1, 9.2 |
| F2 | the DESTINATION location wall deleted | **7** — 1.5a, 1.9, 2.12, 8.1, 8.4, 9.1, 9.2. ⚠️ The pair is the point: the wall is spelled TWICE and each spelling has its own red |
| F3 | the workspace COMPARISON deleted, the workspace derived from the origin as `0016` does | 2 — 1.4 and 1.6. ⚠️ **1.6 is the only check in the repository that needs a caller holding stores in TWO workspaces**, and without that fixture both access walls pass and stock crosses a tenant boundary green |
| F4 | the duplicate-variant rule deleted | 6 — 2.10, 2.12, 8.1, 8.4, 9.1, 9.2 |
| F5 | the default denomination read as `purchase_unit_code` — `0018`'s | 2 — 4.1 and 4.2, which are the two checks that exist for it. `var_kg` is base `g`, purchase `kg`, sell `100g`, so the error ships ten times the stock and applies perfectly cleanly |
| F6 | **the CHEAP idempotency — match on the id alone, never compare the payload** | 3 — 5.6, 5.7, 5.8. ⚠️ It passes 5.1–5.5. This is the falsification that justifies recomputing the hash: without those three the weaker contract is invisible |
| F7 | the availability check deleted — `record_waste`'s shape, the owner's decision reversed | 4 — 6.3, 6.4, 6.5, 9.1 |
| F8 | **the enforcement block resolved against the DESTINATION** | ⚠️⚠️ **0 of 74 — AND THAT IS THE FINDING ABOVE.** Against the closed suite it now **KILLS the file**: 6.7's shipment is meant to succeed, so psql stops where it stands under `ON_ERROR_STOP=1` |
| F9 | **the advisory lock deleted** | ⚠️⚠️ **NOTHING. 0 of 76**, and it is the second finding above rather than an argument against the lock |
| F10 | `now()` passed to the allocator instead of the shipment's moment | 2 — 7.3 and 7.4. ⚠️ This is 4d-ii's finding arriving where it was predicted: `received_at` is FEFO's tiebreak, so the destination store rotates wrong |
| F11 | the same-location refusal deleted | 1 — 1.8. Correctly only one: `allocate_transfer()` still refuses it (`0005`), so what this arm buys is the caller's vocabulary rather than the ledger primitive's |
| F12 | the offline skip removed — an offline shipment enforced too | ⚠️ **THE SUITE DIES.** 6.6's offline shipment is meant to succeed. Red by exit code, the same shape as `0019`'s F8 |

✅ **NO DEFECT WAS FOUND IN `0020` ITSELF.** Eleven of the twelve confirmed checks that
were already right; **F8 found a hole in the SUITE**, and it is the only one that
changed a file.

### ⚠️ Decided in 4e-i, and it is the cheap-now-dear-later call of this task

**The default denomination is `sell_unit_code`, and 4d-ii's rule did NOT decide it.**
That rule is *"the DIRECTION of the document, not the table"* — `record_purchase` reads
`purchase_unit_code` because a delivery arrives, `record_waste` reads `sell_unit_code`
because stock leaves. ⚠️ **A transfer does both, so the rule is silent**, and this is
the first time it has been.

`sell_unit_code` was taken because the quantity is measured, allocated and locked at the
ORIGIN, where stock is leaving, and the destination lots are cut from what the origin
gave up. **It is one `coalesce` either way and nothing in the seed depends on it** —
but the moment a client sends a transfer with no explicit unit, changing it re-scales
every quantity silently. F5 is what that looks like: ten times the stock, applying
clean. ⚠️ **Flagged for the owner by name**, beside `TD001` and `TD002`.

### ⚠️⚠️ Settled in sizing 4e, 2026-09-04 — IT IS AN `L`, AND THE SEAM IS 4d's, WHICH COSTS A SECOND RENUMBERING

4e was estimated `M` on 2026-09-03 as *"`record_transfer` and `void_transaction`"*, one
migration. **That estimate is wrong in the same way 4d's was and for the same reason:
every size in the step-4 table was written before any of step 4 existed.** Each task
re-sized against the APPLIED schema since has come back larger — 4b was one `M` that
took two sessions, 4c was `M` re-sized `L`, 4d was `M` re-sized `L`. **4e is TWO whole
functions and one of them is the widest row in §2.6's table.** It is an `L`.

⚠️⚠️ **THE SEAM IS THE FUNCTION AGAIN, NOT TEST BREADTH.** 4b and 4c both split by
evidence — the migration lands whole in the first session, the second adds checks and
ships no migration. That seam cannot be used here for exactly the reason 4d could not
use it: **two whole functions cannot share one unapplied `0020` across two sessions**,
which is the append-only argument that forced the six-way split in the first place,
applied one level down. 4b's refused seam — a function's internals across two
migrations — stays refused.

The two functions share the boilerplate and nothing else:

| | `record_transfer` (4e-i) | `void_transaction` (4e-ii) |
|---|---|---|
| Document | ⚠️ **NONE.** A transfer is a pair of movements (§2.4, shape fixed in `0004`) | one NEW document per kind, `reversal_of` set, original never mutated |
| Kinds | one | ⚠️ **THREE** — `purchase`, `sale`, `waste`, each with its own line table, its own tax anchor and its own movement shape |
| Location wall | ⚠️ **TWO**, plus *both must resolve to ONE workspace* (§2.6) — the case 4b-i named as the one it cannot derive | one, read off the document being voided |
| Stock | `allocate_transfer()`, applied since `0005` and already exercised by the seed | compensating movements against **the same batch** (`stock_movement.reversal_of_movement_id`, `0004`) |
| Idempotency | ⚠️ **has no `payload_hash` column to live in** — see below | the compensating document's own client id, on the ordinary header |
| Role | none of its own | ⚠️ **§2.7's void window** — `workspace_setting.void_window_minutes`, and a `security definer` RPC is on the far side of every policy that might have carried it |
| Reporting | none | ⚠️ **`0008` must ignore what a void reverses** (§2.3) or a voided delivery prefills its price forever |

**That table is the argument.** A 4e-i that shipped `0020` with both functions complete
would have done all of the expensive work already, and a 4e-ii that only added tests
would have split the cheap half — 4d's finding, and it holds harder here.

⚠️⚠️ **THE COST IS A SECOND RENUMBERING, AND IT IS THE ONE THING IN THIS SECTION THAT
IS EXPENSIVE LATER.**

| Task | Was | Now |
|---|---|---|
| 4e-i — `record_transfer` | `0020` | `0020` — unchanged |
| 4e-ii — `void_transaction` | *(shared `0020`)* | **`0021`** |
| 4f — `adjust_stock` | `0021` | **`0022`** |
| Step 4.5 — failure path, `adjust_stock_delta` | `0022` | **`0023`** |

⚠️ **This is free TODAY and unrepeatable after `0020` merges** — the same trade 4d took
on the same reasoning. None of those numbers has been applied by CI, so today it is an
edit to two Markdown files; the moment `0020` is green they are fixed the way
`0015`–`0019` now are. **`supabase/README.md` carries the same table** and was updated
in the same commit — it is the file the numbering rule says is authoritative.

⚠️⚠️ **4e RESERVES EXACTLY TWO NUMBERS AND NO MORE, AND THAT IS DECIDED HERE RATHER
THAN DISCOVERED LATER.** `void_transaction` may well not fit in one session either —
three document kinds is three of everything in the table above. **If it does not, the
overflow takes 4b-ii's seam and NOT 4d's**: the function lands whole in `0021` and the
second half is a test-breadth task that ships no migration. A third renumbering is
ruled out now, while ruling it out still costs nothing.

**ADR-035 does not object, and was checked.** §2.6 lists `record_transfer` and
`void_transaction` as two separate rows of the write-surface table and **pins no
migration number to either**. §2.4 fixes the transfer's movement shape in `0004` and
§2.7 fixes the void window; neither says when the RPC that uses them ships. `0006` and
`0007` stay permanent holes.

### ⚠️⚠️ Decided in sizing 4e, on the owner's behalf — the transfer's idempotency is RECOMPUTED, not stored

**A transfer has no document table, so §2.6's idempotency contract has nowhere to
live.** `record_sale`, `record_purchase` and `record_waste` each store a `payload_hash`
on the header and compare it, and that comparison is what makes *"same id, different
lines"* a `TD001` rather than a duplicate-key error. `stock_movement` has no such
column — it has `transfer_group_id`, which pairs the legs of one shipment and carries
nothing about what was on the van (`0004`).

Three answers were available. **4e-i takes the second.**

1. **Add a column** — a `transfer` header, or a hash on the movement. ⚠️ **Refused.**
   §2.4 says a transfer has no document table *deliberately*, and `0004`'s comment on
   `transfer_group_id` says so at the column. Changing that is an ADR question, not a
   migration, and this task has no mandate to ask it.
2. ✅ **Recompute the hash from the movements already written** under that
   `transfer_group_id` and compare it to the incoming payload's. **No schema change,
   and it is the only answer that keeps the contract.** The `transfer_out` legs at the
   origin sum, per variant, to exactly the normalised line 4b-i defined — canonical
   base-unit quantities, ordered by content, taken after unit conversion — because the
   allocator wrote them from it.
3. **Detect the id alone** — any movement with this `transfer_group_id` means
   `already_recorded`, lines uncompared. Cheapest. ⚠️ **Refused: it cannot raise
   `TD001`**, which would make the transfer the one RPC in the write surface whose
   idempotency contract is weaker than the other three's, discoverable only by a client
   that sends a corrected retry and gets a success for the first version.

⚠️ **4d-i's rule is what forces this:** *"`TD001` is REUSED, not re-invented — one
sqlstate for §2.6's same id, different payload across the whole write surface, and
4d-ii, 4e and 4f inherit that."* A function that cannot raise it has not inherited it.
**This is cheap to reverse only until a client branches on it**, which is the same
warning `TD001` and `TD002` already carry.

### ⚠️⚠️ Settled in sizing 4d, 2026-09-04 — IT IS AN `L`, AND THE SEAM COST A RENUMBERING

4d was estimated `M` on 2026-09-03 as *"`record_purchase` and `record_waste`"*, one
migration. **That estimate was made before 4b and 4c were written, and both of those
were re-sized upward once they were.** 4b was ONE function and took two `M` sessions;
4c was ONE function's enforcement path, estimated `M`, re-sized `L`, and took two.
**4d is TWO functions, each carrying the whole inherited contract.** It is an `L`.

⚠️⚠️ **THE SEAM IS THE FUNCTION, AND THAT IS A DEPARTURE.** 4b and 4c both split by
TEST BREADTH — the migration lands whole in the first session and the second adds
evidence. 4b expressly REFUSED a seam that would split a function's internals across
two migrations. **Neither precedent fits here, and applying 4b's would buy nothing**:
a 4d-i that ships `0018` with both functions complete has done all of the expensive
work already, and a 4d-ii that only adds tests would have split the cheap half. The
seam has to fall where the work does.

The two functions are independent in every way that costs effort:

| | `record_purchase` (4d-i) | `record_waste` (4d-ii) |
|---|---|---|
| Stock | **opens** batches, positive movements | **consumes** them, FEFO, negative movements |
| Tax | **net-first**, tax the residual | the **sale** shape — gross-first (owner, 2026-08-26) |
| Extra argument | `provider_id`, validated to ONE workspace | none |
| Availability check | ⚠️ **NO** — settled by 4c-i, it constrains taking stock OUT | ⚠️⚠️ **OPEN — 4d-ii must decide it** |
| 4a's constraint | satisfies it directly — it opens lots | inherits it; opens none |

They share only the boilerplate 4b-i already settled: the location wall, idempotency,
the timestamps. **That is the cheap half, and it is the half a shared session would
have shared.**

⚠️⚠️ **THE COST IS A RENUMBERING, AND IT IS THE ONE THING HERE THAT IS EXPENSIVE
LATER.** Two functions in two sessions need two migrations, so `record_waste` takes
`0019` and **everything after it moves up one**:

| Task | Was | Now |
|---|---|---|
| 4d-i — `record_purchase` | `0018` | `0018` — unchanged |
| 4d-ii — `record_waste` | *(shared `0018`)* | **`0019`** |
| 4e — `record_transfer`, `void_transaction` | `0019` | **`0020`** |
| 4f — `adjust_stock` | `0020` | **`0021`** |
| Step 4.5 — failure path, `adjust_stock_delta` | `0021` | **`0022`** | *(moved again by 4e — now `0023`)*

⚠️ **This is free TODAY and unrepeatable after `0019` merges.** None of those numbers
has been applied by CI, so today the renumbering is an edit to two Markdown files.
The moment 4d-ii's `0019` is green, `0020`–`0022` are fixed the way `0015`–`0018` now
are, and a later objection to this split is a hole in the sequence, not a rename.
**`supabase/README.md` carries the same table** — it is the file the numbering rule
says is authoritative, and it was updated in the same commit.

**ADR-035 does not object, and was checked.** §2.6 lists the ten functions and §3
names *"step 4.5"* as a BUILD STEP; **neither pins a migration number**, so nothing in
the renumbering contradicts the authority. `0006` and `0007` stay permanent holes —
reusing them would re-open the five-argument `allocate_fefo` trap that retired them.

### ⚠️ Left open BY 4d-i, and it is 4d-ii's to answer — DOES WASTE GET THE AVAILABILITY CHECK?

4c-i left this by name rather than settling it by writing the code first, and 4d-i does
not settle it either: `record_purchase` puts stock IN, so §2.6's check does not apply to
it under any reading. **`record_waste` takes stock out and is not a sale**, which is the
whole of the question. It is a shop-truth decision, not a lookup — see the note the
owner has already made on this file's kind of question — and 4d-ii is where it lands.

### ⚠️⚠️ Found in 4c-ii — §2.10's CLAUSE IS NOT THE WHOLE PROPERTY, AND `skip locked` IS THE PROOF

ADR-035 §2.10 words the row *"two sessions, last unit, enforcement ON → exactly one
succeeds"*. Written literally, as one race, that sentence is **also satisfied by an
enforcement path that refuses every concurrent second sale whether or not the shelf
could serve it.**

That is not a hypothetical wrong implementation. It is `for update **skip locked**` —
the idiom a reviewer reaches for the moment they see a contended row, and one word
away from what `0017` ships. Falsification **W-F5 applies it and the last-unit race
stays green in all four of its outcome assertions**: exactly one sale, the loser
refused with `TD002`, the shelf at zero, no orphan header. Every one of them.

**The suite therefore races THREE times, and the two extra races are not padding:**

| | Enforcement | On the shelf | Outcome | What it is for |
|---|---|---|---|---|
| R1 | on | 1 | one sale; loser refused `TD002`; shelf 0 | §2.10's clause, verbatim |
| R2 | off — the shipped default | 1 | **both** record; shelf **−1** | the PAIR: `enforce_stock` is the only difference |
| R3 | on | 2 | **both** record; shelf 0 | the loser WAITED and was SERVED |

R3 is what `skip locked` fails. ⚠️ **A one-race version of this file would have merged
it**, and `supabase/tests/0017`'s 35 single-connection checks are green under it too —
so nothing else in the repository would have objected either. Recorded in
`supabase/tests/0017` section 7 as well, because the wrong answer lives in that file's
`for update` and not in the suite that found it.

R2 is the answer to *"is the refusal `0017`, or is it just what racing looks like?"*:
same fixture, same quantities, same two connections, same lock, same blocking pid, and
the opposite outcome. It is `supabase/tests/0016` check 6.2 raced — ADR-035 §1's
*"stock is recorded, not enforced"*, with the debt landing on the shelf as −1 on the
lot that was already there (`allocate_fefo()` branch 2, asserted, so branch 3 wearing
the same negative number cannot pass for it).

### ⚠️⚠️ Found in 4c-ii — A SUITE THAT DIES IN `beforeAll` REPORTS **ZERO** FAILING TESTS

`db.yml`'s node block guards the Vitest step three ways: `!r.success`, a floor on
`numTotalTests`, and `numFailedTests > 0`. **Only the first of the three catches this
suite failing.**

The three races run in `beforeAll`, so a schema defect that makes the FIRST session's
own call raise takes the file down before one assertion executes. Measured under
W-F3 (the boundary widened `<` → `<=`, which refuses the exact fit that opens every
race): the reporter returns `success: false`, `numTotalTests: 29` and
**`numFailedTests: 0`**. The count guard passes — 29, the full number, because the
skipped tests are still counted — and the failure guard passes on zero. A step that
had only those two would have gone GREEN on a database where §2.10's clause was
broken.

This is the **fifth** shape of vacuous green this build has found, after 3.3's
disarmed pgTAP exception, 3.6a's empty Vitest workspace, 4b-i's `where not passed`
over a NULL, and 4c-i's seven `supabase/checks/` files carrying the same. `db.yml`
now says at that line that it is load-bearing rather than belt-and-braces. ⚠️ **It is
also the fourth appearance of badly-shaped red in a task that calls a function BARE
because the call is meant to SUCCEED** — `0016`'s F3/F4, 4b-ii's `21000`, 4c-i's
F2–F5, and now this. No attempt was made to smooth it over: the suite must be red, and
it is, but a reader should know which of CI's guards is the one doing the work.

### ✅ Found in 4c-ii — THE ANTI-VACUITY GUARD IS EARNING ITS PLACE, MEASURED

W-F4 breaks the race in the SUITE rather than the schema: session A commits before
session B is fired, so the two calls never overlap. **Nine of the thirteen tests stay
green.** The shelf still empties, the loser is still refused with `TD002`, R2 still
oversells, R3 still serves both, the counts still come out exactly right — because a
second call that finds an empty shelf already committed refuses for the same reason.

The four that go red are the three `blockedBy()` assertions and the *"blocked before
either call committed"* guard beside them. Without those four this file would be a slow
re-statement of `supabase/tests/0017`, and 3.7a's `pg_blocking_pids` decision is what
makes them evidence: they name session A's pid, not merely that some wait occurred.

### Settled in 4c-ii, and binding on 4d through 4f

- **`authenticate()` is now harness, not fixture.** `record_sale` reads `auth.uid()`
  and validates against `my_locations()`, so a session that calls an RPC needs a claim
  — which the two 3.7 suites never did, because they INSERT as the superuser with
  `created_by` supplied. It lives in `supabase/vitest/src/harness.ts` because 4d, 4e
  and 4f all call RPCs on two connections and a second spelling of it would drift.
  ⚠️ **`is_local` is FALSE and that is load-bearing** — a transaction-local claim
  vanishes at the `commit` ending each race, and the next call on that connection is
  then refused by the location wall, which reads as a defect in the wall.
- ⚠️ **IT BUYS NO RLS CLAIM, and the header says so.** The connection is still the
  `postgres` superuser and RLS is still bypassed. It supplies an identity to functions
  that ASK for one; it does not put a policy between the suite and a row.
- **A race belongs in `beforeAll` and the assertions belong in `test`s** — 3.7b's
  shape, for 3.7b's reason, and now with the cost named above. Re-racing per assertion
  would race nine times to ask nine things about three sequences.
- ⚠️ **A REFUSED SESSION MUST BE `rollback`ed, NOT `commit`ted.** Postgres treats
  `commit` on an aborted transaction as a silent rollback, so both spellings pass —
  which is exactly why the suite says which it means rather than relying on that.

### Six falsifications, run by hand before 4c-ii was committed

Five against the APPLIED schema — `create or replace` over `0017`'s function, the
suite re-run, the function restored — and one against the suite itself. `0017` is
append-only and was not edited; nothing below is a migration.

| # | The change | What went red |
|---|---|---|
| W-F1 | **the `for update` deleted from the enforcement CTE** — 4c-i's F6, which turned NOTHING red on one connection | **5 of 13.** R1 sells twice and the shelf goes to −1. This is the whole reason the task exists |
| W-F2 | the enforcement block made unreachable | 5 of 13 — the same five. Identical to W-F1 from the outside, which is the point: on one connection the lock was invisible, here the *lock* and the *block* fail alike |
| W-F3 | the boundary widened `<` → `<=` | ⚠️ **the FILE dies in `beforeAll`** — session A's own opening sale is refused. Red, but `numFailedTests: 0`. See the finding above |
| W-F4 | **the race, unraced** — A commits before B is fired (a change to the SUITE, not the schema) | ⚠️ **only 4 of 13.** The three `blockedBy` assertions and the guard beside them. Nine stay green |
| W-F5 | **`for update` → `for update skip locked`** | ⚠️⚠️ **5 of 13, and NOT the four that state §2.10's clause.** R3 is what catches it — see the finding above |
| W-F6 | the resolution reads the WORKSPACE only, ignoring the variant (4c-i's F2, raced) | 5 of 13 — R1's variant never opts in, so enforcement resolves false and the last unit sells twice |

⚠️ **W-F1 and W-F2 leave R1's two anti-vacuity assertions GREEN**, and that is correct
rather than a gap: without the enforcement lock session B still blocks, one statement
later, on `allocate_fefo()`'s own `for update of bb`. The wait is real in both worlds.
**What discriminates is the ANSWER, not the block** — which is the same lesson 3.7b
recorded when it found that waiting is not the property and re-reading after it is.

### ✅ Settled in sizing 4c, 2026-09-03 — IT IS AN `L`, AND THE SEAM IS 4b-ii's AGAIN

4c was read against ADR-035 §2.6 and §2.10 before a line of it was written, which is
the job the step-4 split leaves to the session that takes the task. **The table above
called it an `M`, and that was measured against the enforcement path alone — twenty
lines. It is wrong about the task, because the task is not the twenty lines.**

Three pieces, in two languages:

- **`0017` re-emits the WHOLE function.** plpgsql has no partial replace, so a
  twenty-line addition is a ~500-line migration and every line of `0016` is back on
  the review surface.
- **The psql evidence is a MATRIX, not a check.** Enforcement resolves through two
  columns — `product_variant.enforce_stock` over `workspace_setting.enforce_stock_default`
  — and §2.6's offline paragraph skips it entirely, so the grid is off/on ×
  null/true/false × online/offline, each against an exact fit and a shortfall.
  ⚠️ **And check 6.2 is a REWRITE, not an addition** — see the finding below.
- **§2.10's concurrency clause is TypeScript on two live connections**, which is the
  weight 3.7b carried as a whole task of its own.

**So it splits: `0017` and its psql evidence are 4c-i, §2.10's concurrency clause is
4c-ii.** The function is whole when `0017` merges and 4c-ii moves no schema — 4b-ii's
shape exactly.

⚠️ **THE ONE OBJECTION IS THAT 4c-i MERGES AN UNRACED LOCK**, and it is answered by
the default rather than waved off. A refusal proved from ONE connection is not proof
that two sessions cannot both clear it — that is precisely the gap
`allocation-race.test.ts` exists to close for the allocator. Two things make the
window narrow enough to take:

- **The lock discipline is not new, and it is already raced on `main`.** §2.6's *"lock
  the open batches for the variant"* IS `allocate_fefo()`'s `for update of bb`
  (`0010`), and `allocation-race.test.ts` proves it under two connections today. 4c-i
  evaluates availability inside that same transaction and the same lock scope rather
  than inventing a second one. What 4c-ii adds is that the REFUSAL rides on that lock
  — not that the lock is there.
- **The path merges DORMANT on every workspace that exists.** `enforce_stock_default`
  is `false` in `0001` and `product_variant.enforce_stock` is null throughout the
  seed, so no caller behaves differently between the two merges. That is what "built,
  dormant" means, and it is why this seam is cheap where 4b's was not: **4b's refused
  seam would have shipped a function whose DEFAULT behaviour was wrong.**

### Settled in 4c-i, and binding on 4d through 4f

- **Enforcement resolves PER LINE and PER VARIANT, variant over workspace, coalescing
  to false.** `coalesce(product_variant.enforce_stock, ws.enforce_stock_default, false)`.
  ⚠️ **A variant's explicit `false` is an OPINION, not an absence** — it beats an
  enforcing workspace, which is check 2.3 and the one cell the whole coalesce exists
  for. A resolution reading only one of the two columns passes half the grid:
  falsifications F2 and F3 each break exactly one direction.
- **A workspace with no settings row fails OPEN, and it is the only deliberate
  fail-open in the system.** Refusing a sale because a settings row is missing shuts a
  till for a reason the cashier cannot act on, and the shelf is recorded either way.
  Said in the migration in those words so it is not copied as a pattern.
- **The boundary is `<`, not `<=`.** Selling the shelf empty is the commonest correct
  sale a shop makes. Check 3.2, and F5 widens it by one character and turns the exact
  fit into a refusal.
- **The check is PER LINE, and a ticket for the same variant twice still adds up.**
  `batch_balance` is projected by an `after insert` trigger on `stock_movement`
  (`0004`), so line 2 reads a shelf line 1 has already emptied — 6 + 6 against ten is
  refused on the SECOND line, and the good first line is not recorded on its own
  (checks 5.2, 5.3). ⚠️ **An up-front pass aggregating the whole ticket by variant was
  REFUSED**: it names every short variant at once, which is a nicer error, at the cost
  of a lock ordering no other statement in this system uses.
- ⚠️ **THE LOCK IS `allocate_fefo()`'s PREDICATE AND ORDER, VERBATIM (`0010`).** The
  enforcement statement takes exactly the rows the next statement was already going to
  take, in the same order, one statement earlier. **`0017` therefore introduces no new
  lock and no new lock ordering** — which is the argument that made 4c-i safe to merge
  ahead of the race, and it is stated in the migration where a reviewer will meet it.
- **Enforcement makes `allocate_fefo()`'s shortfall branches 2 and 3 UNREACHABLE**, and
  that is asserted rather than assumed (checks 6.2, 6.3). There is no shortfall left to
  absorb, so an enforced store never re-opens a closed lot and never invents an
  `adjustment` one. ⚠️ **The same sale OFFLINE still reaches branch 3** (check 6.4),
  which is the pair that shows enforcement is the only difference between them.
- **Offline SKIPS enforcement, and this is the part 4d–4f must not quietly drop.**
  §2.6 is explicit and the reason is not squeamishness: the sale already happened at a
  till that could not ask this database anything, and refusing it on reconnect discards
  a transaction the customer has paid for. The overdraw stays VISIBLE as a negative
  balance. F4 removes the exemption and the offline write is refused.
- ⚠️ **`record_purchase` (4d) DOES NOT GET THIS CHECK.** Availability is a constraint on
  taking stock OUT. `record_waste` (4d) is the open question — it removes stock and is
  not a sale — and it is 4d's to answer, not something 4c-i should have settled by
  writing the code first.

### ⚠️⚠️ Found in 4c-i — F6: THE LOCK IS INVISIBLE TO A SINGLE CONNECTION, MEASURED

Eight falsifications were applied to the APPLIED schema and the suite re-run. Seven
turned it red. **F6 deleted the `for update` from the enforcement CTE and NOT ONE of
the 35 checks moved.**

That is not a hole in the suite — it is the property the suite cannot have. One session
cannot block on its own lock, so every single-connection spelling of *"two sessions,
last unit → exactly one succeeds"* is green with the locking gone. It is the same trap
`supabase/tests/0005_allocation_concurrency.sh` was written for and the reason 3.7b
moved that claim into `supabase/vitest/`.

✅ **So the seam sized before the work was written is the seam the evidence confirms**,
and 4c-ii is not a tidiness exercise: §2.10's concurrency row is the ONLY thing standing
between `0017` and a locked path nobody has ever raced. `supabase/tests/0017` section 7
says this at the point a reader might take its green for the whole claim, and
`supabase/vitest/README.md` now says it in the cell that used to read `0006`.

| # | The change | What went red |
|---|---|---|
| F1 | the whole enforcement block deleted | 22 of 35 |
| F2 | the resolution reads the WORKSPACE only, ignoring the variant | red, messily — the opt-out variant is refused and psql dies on the raise |
| F3 | the precedence reversed, workspace before variant | red, messily — same shape as F2 |
| F4 | the offline exemption removed | red, messily — the offline write of check 4.1 is refused |
| F5 | the boundary widened from `<` to `<=` | red, messily — the exact fit of check 3.2 is refused |
| F6 | **the `for update` deleted from the enforcement CTE** | ⚠️⚠️ **NOTHING.** See above |
| F7 | the check made unreachable inside the line loop | 21 of 35 |
| F8 | `TD002` replaced by `22023` | 7 — exactly the seven sqlstate assertions |

Three more were run against `supabase/checks/0017_enforcement_is_dormant.sql`: one
variant opting in (checks 4 and 5 red), the workspace default flipped (3 and 5 red), and
**`0016`'s `record_sale` re-applied over `0017`'s** (check 8 red, *TD002 ABSENT*) — which
is the one that stops the dormancy file being equally green on a database where `0017`
never applied.

⚠️ **F2–F5 die on the raise rather than printing a FAIL row**, because sections 3, 4 and
6 call `record_sale` BARE — those calls are meant to SUCCEED, so wrapping them in
`chk_raises` would assert the opposite of the claim. Same shape `0016` records for its
own F3 and F4, and no attempt was made to smooth it over. ⚠️ **It did cost two
falsification runs**: every function a suite invents must be `create or replace`, because
a file that dies mid-run never reaches its own `drop` statements and the NEXT run then
dies on *"function already exists"* — a second, meaningless red on top of the real one.
`chk_message` was plain `create` until F5 found it; fixed, and the reasoning is in the
file beside the helper.

### ⚠️⚠️ Found in 4c-i — 4b-i's VACUOUS-GREEN FIX HAD STOPPED AT `supabase/tests/`

4b-i found that `where not passed` in a suite's report block does not count a check
whose condition was NULL, so a file can print a `FAIL` row and exit 0 on *"all N checks
passed"*. It recorded the fix as *"closed in all six suites"*. **Those six were the six
in `supabase/tests/`. Every one of the seven files in `supabase/checks/` still carried
the defective guard, at TWO sites each** — a mid-file pre-flight guard and the final
report — and they are the files that run over the seed, where an aggregate over nothing
is the likeliest way to produce a NULL in the first place.

Closed in all seven on this commit — `0009`, `0011`, `0012`, `0013`, `0014`, `0015`,
`seed_invariant` — following the precedent 3.4 set when it found 3.3's plan guard was
itself wrong, and 4b-i set when it found this. The files are unchanged in every other
respect and **their counts are unchanged**: 36 / 56 / 35 / 49 / 30 / 10 / 18.

⚠️ **The lesson is about the SHAPE of the earlier note, not about the miss.** "Closed in
all six suites" named a count, not a directory, and a count cannot be checked against
the repository. The `supabase/checks/` files were never in scope and nothing said so.

### ⚠️⚠️ Decided in 4b-ii — CHECK 6.2 PINS AN OVERSALE AS CORRECT, AND 4c IS MEANT TO BREAK IT

`allocate_fefo()` does not refuse a shortfall. With 1 kg across two lots and a 1.2 kg
sale, it takes both and **overdraws the lot it ran out on** (`0010` branch 1), so the
document records, the ledger balances, and `batch_balance` goes to **−200 g**. §2.4 is
perfectly green over that state, which is exactly why it needs saying out loud.

Check 6.2 asserts it — the two movements, the negative balance, and that **no
`adjustment` lot was opened**, which is the one count separating branch 1 from branch 3.

⚠️ **THIS IS TODAY'S BEHAVIOUR, NOT A RULE.** §2.6's availability check is 4c's and is
dormant until then; when it lands, *"with `enforce_stock_default` on, an oversale is
refused"* and check 6.2 goes red. **That is the correct outcome and 4c-i owns the edit.**
It is recorded here rather than left to be discovered, because a suite that goes red on
the task that was supposed to change it reads like a regression for as long as it takes
somebody to open this file.

⚠️⚠️ **CORRECTED 2026-09-03, IN 4c-i — THE PARAGRAPH ABOVE WAS WRONG AND IS KEPT SO THE
CORRECTION IS READABLE. `0017` APPLIED AND CHECK 6.2 IS STILL GREEN.** Nothing was
edited and `supabase/tests/0016` still reports all 89. The error was in the conditional:
6.2's variant NEVER OPTS IN, and 4c-i does not switch enforcement on for anybody,
because §2.6 says *"v1 ships with no toggle and open mode always on."* Enforcement
resolves `coalesce(product_variant.enforce_stock, workspace_setting.enforce_stock_default,
false)` and both ship open, so 6.2's oversale takes the identical path it took under
`0016`. **The prediction was right about the mechanism and wrong about the default** —
it read "4c builds the check" as "4c turns it on". The lesson is the narrower one: a
plan may predict a red, but it must name the CONFIGURATION that produces it, and this
one did not.

⚠️ **The offline path is the part that does NOT change.** §2.6 says an offline write
SKIPS enforcement, so an overdraw stays reachable after 4c through `recorded_offline`,
and 6.2 has an obvious home there. 4c-i decides; 4b-ii only insists the case not be
deleted.

### ⚠️ Found in 4b-ii — A FOURTH SHAPE OF BAD RED: A SCALAR SUBQUERY CHECK *DIES* WHERE IT SHOULD FAIL

`select chk('…', (select line_net = 64.66 from sale_line where sale_id = X))` is exactly
right while that sale has one line. The moment a defect gives it two, the bare scalar
subquery raises **`21000` — "more than one row returned by a subquery used as an
expression"** — and psql dies on the spot. The file never prints its table, and the
reviewer sees a stack trace where a FAIL row belongs.

✅ **MEASURED — falsification G5**, which moves the `sale_line` insert inside the
allocation loop so a two-lot line becomes two lines. Before: the file died at check 6.1
with `21000` and printed nothing. After: **six FAIL rows and an orderly exit 3**,
including *"a line spanning two lots is still ONE line on the ticket"*, which is the
sentence that names the defect.

⚠️ **It is NOT the vacuous-green family — it is red either way**, and that is why it is
a smaller finding than 3.3's disarmed exception, 3.6a's empty workspace or 4b-i's
`not passed`. It is recorded because the fix is cheap and the shape recurs: **count the
rows, do not read one.** `(select count(*) from sale_line where sale_id = X and
line_net = 64.66 …) = 1` asserts the value AND the cardinality, and cannot die.

⚠️ **ONLY SECTION 6 WAS CHANGED, AND THAT IS DELIBERATE.** Every sale in sections 1–5 is
single-lot by construction — section 7's closing count is what makes that a fact rather
than an assumption — so their scalar subqueries cannot be handed a second row by any
defect this suite can express. Rewriting forty working, falsified assertions to buy
uniformity is the trade 3.1 refused when it declined to port `supabase/tests/` into
pgTAP, and the same answer applies at this scale. **Binding on 4d through 4f: a check
over a document that CAN have several lines is counted, not read.**

### ✅ Found in 4b-ii — MIXED RATES ARE THE ONLY PLACE A DOCUMENT-LEVEL SPLIT IS VISIBLE

§2.5 rule 5 says the header is the sum of the ROUNDED lines. The tempting alternative —
split the document total once — is not merely wrong, it is **undetectable on a
single-rate ticket**: for one line at 16%, `round(gross / 1.16, 2)` and the sum of the
lines are the same number, and every check in 4b-i's section 4 stays green.

Falsification G4 replaced the header aggregate with a document-level split. It went red
on **exactly two checks, both of them 4b-ii's**: 6.4's *"the header is 64.60 + 2.90"*
(the split gives 58.19 + 9.31, a 6.41 error on a 67.50 ticket) and 6.6's *"every header
is the sum of its own rounded lines"*. **Nothing in the 63 checks 4b-i shipped moved.**

⚠️ **So the mixed-rate ticket is not one more case, it is the discriminator**, and the
zero-rated line is what makes it one: 16% beside 0% is an ordinary Mexican basket
(§2.5 — most unprocessed food is zero-rated, general goods are 16%), and it is the
cheapest fixture that can tell the two implementations apart. **Binding on 4d**:
`record_purchase` needs a mixed-rate document for the same reason, net-first.

### ✅ Found in 4b-ii — THE RESIDUAL IDENTITY CANNOT SEE WHICH DIRECTION THE SPLIT WENT

Check 6.6 asserts, over every line in the database, that `line_net =
round((line_net + tax_amount) / (1 + tax_rate), 2)`. It looks like the whole of §2.5
rules 2–4 and it is not: **a net-first implementation satisfies it too.**
`round(net × (1 + rate))` and `round(gross / (1 + rate))` are mutually consistent, so
the stored row is self-describing whichever end it was computed from.

The direction is only visible against **the price the till sent**, and `sale_line`
does not store it — the table keeps `unit_price_net_per_base` and has no gross column
at all (§2.5: the gross unit price is authoritative on a sale, and 0016 takes it from
the client). So the suite records the sent prices in a scratch table beside the sales
that used them, and check 6.6 asserts `line_net + tax_amount = round(unit_gross ×
qty_base, 2)` over all fourteen lines, with a join-coverage guard in front of it
because a `not exists` over a join that matched nothing is true.

✅ **MEASURED — falsification G1**, a genuine net-first pricing block: 13 checks red,
including 6.6's anchored one. ⚠️ **And the unanchored one, 6.6's quotient check, stayed
GREEN under it** — which is the finding, and it is why both are in the file with the
limit written above the second one.

### ✅ Found in 4b-ii — THE SHORTFALL HAS THREE BRANCHES, AND THE SUITE NOW WALKS ALL THREE

`allocate_fefo()` (`0010`) does three different things when it cannot fill a line, and
until this task the suite reached one of them:

| Branch | Reached when | Where it is asserted |
|---|---|---|
| 1 — overdraw the lot it ran out on | some stock is open, not enough | **6.2**, new |
| 2 — blame the most recent lot this store held | nothing open, but it HAS held this variant | **6.3**, new |
| 3 — open an `adjustment` lot | never stocked here at all | 3.7 (4b-i), because it is a *timestamp* claim |

⚠️ **BRANCH 1 AND BRANCH 3 ARE TOLD APART BY ONE COUNT AND NOTHING ELSE.** Both move
the same quantity and leave the same total on the shelf; only *"no new `adjustment` lot
exists"* separates them, and getting it wrong puts a fictional zero-cost lot with no
expiry into the FEFO order of every later sale. Falsification G7 made branch 1 open a
lot and check 6.2 caught it.

⚠️ **BRANCH 2 ORDERS ON `received_at desc`, WHICH IS THE OPPOSITE END OF THE FEFO
ORDER**, so the fixture's three lots have expiry and receipt dates that ascend together:
the lot the loop would reach LAST is the lot the fallback blames FIRST. A fixture where
the two orderings agreed would call branch 2 green on an allocator that had simply
re-run FEFO.

### ✅ Found in 4b-ii — THE PER-LOT COST IS THE ONE THING ONLY A MULTI-LOT LINE CAN CHECK

§2.4 snapshots onto every movement *"what the units consumed by THIS movement cost"*,
and §2.9 divides revenue against it. On a single-lot sale that is one number and any
implementation gets it right by accident.

Falsification G3 stamps the FIRST allocated lot's cost on every movement of the line —
correct on every sale 4b-i wrote, wrong on a line that spans two lots at 0.008 and
0.012. It went red on **exactly one check in the repository**, 6.1's *"TWO movements,
one per lot, each with that lot's own cost"*, and every other suite stayed green.

⚠️ **That is the clearest single measurement of what 4b-ii buys**, and it is the same
argument the split was made on: the function was whole, the evidence was not.

### Seven falsifications, run by hand before 4b-ii was committed

Each was applied to the APPLIED schema — `create or replace` over the real `0016`, or
over `0010`'s `allocate_fefo()` for G7 — the suite was run, and the schema was restored
and re-verified green at 89. Five of the seven are invisible to every check that
existed before this task.

| # | The change | What went red |
|---|---|---|
| G1 | pricing NET-FIRST: `net = round(unit × qty)`, tax on top | 13 checks, incl. 6.6's price-anchored one — **and 6.6's quotient check stayed green**, which is why both exist |
| G2 | one movement per line, the whole quantity on the first lot | 6.1, 6.2, 6.3 and section 7's movement count (14, not 16) |
| G3 | the FIRST lot's cost stamped on every movement of the line | **6.1 alone — one check in the whole repository** |
| G4 | the header split at the DOCUMENT level | **6.4 and 6.6 alone** — nothing 4b-i shipped moved |
| G5 | one `sale_line` per LOT instead of per line | 6 checks, incl. *"a line spanning two lots is still ONE line"*. ⚠️ Before section 6's checks were counted rather than read, this one **died on `21000`** and printed no table — see the finding above |
| G6 | the gross computed in `float8` | 6.5's half-up boundary (15.42, not 15.43) and 6.6's anchor — §2.5 rule 6 observed from the arithmetic end rather than the column end |
| G7 | shortfall branch 1 OPENS a lot instead of overdrawing | 6.2's three checks, 6.3's two, and section 7's movement count |

⚠️ **NONE OF THE SEVEN IS A DEFECT IN `0016`.** They are deliberate breakages of a
function that passed all seven; the task found nothing to fix, and `0016` is unchanged.

### ⚠️⚠️ Found in 4b-i — A CASHIER WRITES A LEDGER THEY CANNOT READ, AND TWO CHECKS WERE VACUOUS BECAUSE OF IT

`stock_movement_select` and `stock_batch_select` (`0004`) are both gated on
`has_role(workspace_id, 'manager')`. `batch_balance_select` is not. So **the actor
who empties the shelf cannot see the movements that emptied it** — which is §2.3's
*"a sale carries price, not cost"* working exactly as designed, and which nothing in
this plan had noticed is a hazard for TESTS.

Two checks in the first draft of `supabase/tests/0016` were written inside
`set local role authenticated` and were therefore claims about VISIBILITY rather than
about writes:

- *"every movement carries the header's `occurred_at`"* — a `not exists` join over
  `stock_movement`. The cashier's join returned nothing, and `not exists` over nothing
  is **true**.
- *"none of the wall's five refusals wrote a document"* — the refused writes were all
  at stores the cashier cannot read, so the answer is the same whether the write was
  refused or committed.

✅ **THE FIRST ONE WAS CAUGHT BY A FALSIFICATION, NOT BY REVIEW.** F10 stamped every
movement with `now()` instead of the document's moment and **the suite stayed green**.
Both checks now run outside the role block, and the movement one counts its subjects
before asserting the absence.

⚠️ **THE GENERAL FORM IS BINDING ON 4b-ii AND ON EVERY RPC SUITE AFTER IT: a NEGATIVE
EXISTENCE CHECK UNDER A RESTRICTED ROLE PROVES NOTHING.** The role that writes and the
role that can verify the write are different roles in this schema, and for the ledger
tables they are different by design. Assert the refusal as the restricted actor;
assert what is on disk as somebody who can see the disk.

### ⚠️⚠️ Found in 4b-i — A THIRD WAY A FAILING SUITE EXITS 0, AND IT WAS IN ALL SIX

Every file in `supabase/tests/` ends with the same block:

```sql
select count(*) into v_failed from public._verify where not passed;
if v_failed > 0 then raise exception '% behavioural check(s) FAILED' …
```

**`not passed` does not count a check whose condition was NULL.** `not null` is null,
a null `where` keeps no rows — while the report table above it renders the same row as
`FAIL`, because `case when passed then 'PASS' else 'FAIL' end` sends null to the else.
So a suite can print a FAIL line and then print *"all N checks passed"* directly under
it, and exit 0.

A NULL condition is not exotic: it is a subquery that matched no rows, an aggregate
over nothing, or a comparison against a nullable column — and the vacuous check the
finding above describes produced one on its first run, which is how this was found.

✅ **MEASURED — falsification F11.** One probe check reading a row that does not exist,
run twice against the same suite: with `passed is not true` the file exits 3 on *"1
behavioural check(s) FAILED"*; with `not passed` the identical file prints the FAIL row
and exits **0** on *"all 64 checks passed"*.

⚠️ **It is the same shape as 3.3's disarmed `finish(exception_on_failure := true)` and
3.6a's empty Vitest workspace, and it is the third of them.** Corrected in ALL SIX
suites on this commit — `0003`, `0004`, `0005`, `0008`, `0015` and `0016` — following
the precedent 3.4 set when it found the plan guard 3.3 shipped was itself wrong. The
five older files are unchanged in every other respect and their counts are unchanged:
39 / 54 / 55 / 46 / 30.

### ⚠️ Decided in 4b-i — `record_sale` TAKES A FIFTH ARGUMENT, AND ADR-035 §2.6 IS THE FILE THAT MOVED

§2.6's table wrote the function as `record_sale(id, location_id, lines, occurred_at)`.
It now reads `(…, recorded_offline)`, with a revision line saying so.

`sale.recorded_offline` is `not null`, has existed since `0003`, and §2.6 is the only
thing that writes it. **The server cannot infer it**: the same section says an ONLINE
call may pass an `occurred_at` and have it overridden, so *"the client sent a time"*
is not evidence of anything — inferring the flag that way would make every online
client that fills the field in silently backdate its own sales. The flag also decides
more than the clamp: §2.6's offline paragraph says such writes SKIP ENFORCEMENT, which
is **4c-i's dormant availability check reading this same parameter**.

⚠️ **This is an under-specification closed, not a contradiction overruled**, and the
parameter defaults to `false` so the four-argument call §2.6 used to show still works
verbatim. Recorded here and in the ADR because it was decided on the owner's behalf.

### ⚠️ Decided in 4b-i — THE PRICE COMES FROM THE CLIENT, AND `price_list` IS NOT CONSULTED

`record_sale` receives `unit_price_gross_per_base` on every line and does not look the
price up. The table is right there and using it would be wrong twice:

- §2.5 rule 2 makes the gross unit price authoritative on a sale *"because that is the
  shelf price, and the shelf price is what the customer agreed to"*. The customer
  agreed to the number the till displayed.
- §2.6's offline queue flushes on reconnect, possibly days later. A re-priced replay
  restates a sale that has already been paid for, and `price_list` is exactly the kind
  of row a shopkeeper edits on a Monday.

**PER BASE UNIT**, because that is the only price denomination the ledger has:
`price_list.price_per_base` and `sale_line.unit_price_net_per_base` are both per base
and `sale_line` has no price-display columns at all. ⚠️ **`tax_rate` is the opposite
call and for the opposite reason** — it is read from the variant at write time and the
client's value is ignored, because the catalog is the authority on what a product is
taxed at and a till that can send its own rate is a till that can understate IVA.
Asserted, check 4.6.

⚠️ **BINDING ON 4d.** `record_purchase` takes the invoice NET per base by the same
argument reversed, and its rate comes from the same place.

### ⚠️⚠️ Decided in 4b-i — `TD001`, A NEW SQLSTATE, AND IT IS A CLIENT CONTRACT

§2.6's fourth idempotency row — same id, different lines — must be told apart from
every other failure, because it is the one the client DEAD-LETTERS rather than
retries. `0016` raises SQLSTATE **`TD001`** for it. Classes beginning `5`–`9` or
`I`–`Z` are reserved for application use, so `TD` is ours.

The two alternatives lose: `23505` is what Postgres itself raises for an ordinary
duplicate key, so a client branching on it would dead-letter unrelated conflicts, and
`P0001` is what every bare `raise` in this schema already produces.

⚠️⚠️ **THIS IS THE ONE THING IN 4b-i THAT IS CHEAP TODAY AND DEAR LATER**, and it is
flagged by name for that reason. Nothing consumes it yet. The moment a client ships a
branch on it, or step 4.5's `record_failed_write` keys off it, changing it costs a
coordinated release. **If the owner wants a different code — a PostgREST `PT409`, which
maps to an HTTP status, or plain `23505` — the edit is one line in `0016`'s successor
and it should happen before step 5.**

### ✅ Found in 4b-i — TWO OF THE ELEVEN FALSIFICATIONS FAIL MESSILY, AND IT IS WORTH KNOWING WHICH

F3 and F4 break idempotency itself, and the checks that catch them are ordinary
`select record_sale(…)` calls rather than `chk_raises` — because on a healthy schema
they are meant to SUCCEED. So the suite does not print a FAIL row: psql dies on the
raise, exits 3, and the report table never renders.

It is red either way and no attempt was made to smooth it over — the same call `0015`
made about its own F1. It is recorded so a reviewer who breaks the hash and sees
`ERROR: duplicate key value violates unique constraint "sale_pkey"` knows they are
looking at F3 and not at a broken fixture.

### Settled in 4b-i, and binding on 4c through 4f

- **The location wall is four lines and it is the RPC's, verbatim from §2.6.** Nothing
  in the schema catches its absence: F1 deleted it and every suite steps 1–3 shipped
  stayed green, **including 05, which asserts the location wall on reads**. Check 1.7
  is the shape of evidence that separates the two — the caller BYPASSES RLS (a
  superuser-equivalent, so no policy is running) while `auth.uid()` still names an
  unassigned cashier, and the refusal survives. Every RPC after this needs its own
  1.7, not a copy of 1.2.
- **The workspace is DERIVED from the location, never a parameter.** §2.6 permits an
  explicit `workspace_id` validated the same way; deriving it from a location the
  caller has already been proved to hold is strictly stronger, because there is no
  second value that can disagree with the first. ⚠️ **`record_transfer` (4e) cannot
  do this** — it has two locations and §2.6 requires both to resolve to ONE workspace,
  which is a comparison and not a derivation.
- **The idempotency comparison is `payload_hash` AND `workspace_id` AND `location_id`.**
  `sale.id` is a global primary key: without the last two, the same id sent to a second
  store returns `already_recorded` together with a summary describing a document at a
  store the caller did not name. Asserted, check 2.8.
- **The hash is over NORMALISED lines and nothing else** — canonical base-unit
  quantities, ordered by content, taken after unit conversion. `2` and `2.00` agree,
  `750 g` and `0.750 kg` agree, and a retry whose `occurred_at` was clamped to a
  different second still reads as the same sale. Checks 2.3 and 2.4.
- **Validate every line BEFORE pricing any of it.** The pricing query joins
  `product_variant` and `unit`; an inner join with nothing in front of it DROPS a line
  that resolves to neither and records a shorter ticket than the customer paid for.
  F9 removed the pre-flight and the count guard behind it and the suite recorded a
  one-line sale from a two-line ticket. This is the same shape as 3.2b-ii's *"a payload
  is refused by the first wall it meets"*, except that here there is no wall unless the
  RPC is it.
- **A negative line is not a sale.** `record_sale` refuses a non-positive quantity with
  `22023` and names `void_transaction` in the message. `allocate_fefo()` would refuse
  it anyway (`0010`), with a message about allocation rather than about what the caller
  did wrong.
- **`recorded_at` is never backdated, on either table.** It is left to its `now()`
  default. `occurred_at` is the one that moves.
- ⚠️ **§2.6's third idempotency row is still not this file's.** *"First attempt still
  in flight → the second call blocks on the row lock"* cannot be made from one
  connection; it is `supabase/vitest/test/idempotency.test.ts` (task 3.7a), which names
  the blocking pid on all three document tables and is what makes `0016`'s
  `on conflict (id) do nothing` safe to rely on. Said out loud in the suite as well, at
  check 2.9.

### Eleven falsifications, run by hand before 4b-i was committed

Each one was applied to the APPLIED schema — `create or replace` over the real
`0016` — the suite was run, and the schema was restored and re-verified green. A
function that has never been seen to refuse anything is the vacuous green ADR-035 §9
exists to reject.

| # | The change | What went red |
|---|---|---|
| F1 | the location wall deleted | checks 1.2–1.7, and 6 on the closing count — **every other suite in the repository stayed green** |
| F2 | the wall checks `my_workspaces()` instead of `my_locations()` | 1.2, 1.4 and 1.7 — and **1.3 stayed GREEN**, which is the whole difference between the tenant wall and the store wall |
| F3 | `on conflict (id) do nothing` removed | 2.1, messily — the file dies on `23505` |
| F4 | the hash taken over the raw client json | 2.3, messily — the file dies on `TD001` for a legitimate retry |
| F5 | the `payload_hash` comparison dropped | 2.5, 2.6, 2.7, 2.8 |
| F6 | online no longer overrides the client `occurred_at` | 3.1 |
| F7 | the offline clamp made one-sided (lower bound only) | 3.4 — **and 3.3 stayed green**, which is why both ends are asserted |
| F8 | `allocate_fefo()` passed `now()` instead of the document's moment | 3.7, the shortfall lot's `received_at` — the second FEFO key |
| F9 | the line pre-flight AND the count guard behind it both removed | 5.4–5.14, twelve checks, including *"the good first line was not recorded on its own"* |
| F10 | the movement stamped `now()` instead of the header's `occurred_at` | **NOTHING, on the first run** — the check was vacuous. 3.6 after it was moved out of the cashier's role. See the finding above |
| F11 | the report guard reverted to `where not passed`, with one NULL check | **NOTHING — the file printed a FAIL row and exited 0.** See the finding above |

### ✅ Settled in sizing 4b, 2026-09-03 — THE SPLIT IS BY TEST BREADTH, AND THE OTHER SEAM WAS REFUSED

4b was read against ADR-035 §2.6 before a line of it was written, which is the job the
split left for this session. **It is an `L` and it splits.** The measurement: the
function is the seed's `20_consumption.sql` sale loop — header, lines, per-line FEFO,
one movement per lot — plus four things the seed does not do at all (the location wall,
the four idempotency rows, the two timestamp rules, and a returned summary). Against
`0015`'s 334-line migration and 593-line suite, and `0005`'s 402 and 629, that is two
sessions of work and one of them is the suite.

⚠️ **THE OBVIOUS SEAM WAS REFUSED, AND REFUSING IT IS THE DECISION WORTH READING.**
Splitting a 400-line function by *what it does* — 4b-i the document (header, lines,
money, wall, idempotency, timestamps), 4b-ii the ledger (FEFO and the movements) —
gives two complete migrations and looks tidier than splitting by test breadth. It is
the wrong seam twice over:

- It puts a `record_sale` on `main` that **sells goods and moves no stock**. §2.4's
  invariant cannot see that — a sale with no movements leaves `sum(movements) =
  batch_balance` perfectly true — so the defect would be *internally consistent and
  externally wrong*, which is the shape §2.6 names as "the most dangerous a defect can
  take in this system". Shipping it on purpose for one PR is not a smaller risk for
  being deliberate.
- It costs a migration number, and `0017` is 4c-i's. Renumbering 4c–4f and step 4.5 to
  buy a half-function is the expensive half of a trade whose cheap half is bad.

**So the seam is the one this file named in advance: the function is WHOLE in `0016`,
and 4b-ii is evidence rather than schema.**

⚠️ **ONE RULE MOVED ACROSS THE SEAM: `recorded_offline` IS 4b-i's, not 4b-ii's.** The
candidate seam filed the offline clamp with the multi-lot and mixed-rate cases. The
clamp is five lines of function that ship in `0016` whichever task tests them, and
`occurred_at` is the column daily totals and the 15-minute void window read (§2.6). A
migration that merges with an untested clamp is a rule that only *looks* enforced —
the vacuous green §9 refuses. The three timestamp checks cost 4b-i almost nothing and
they belong beside the wall and the idempotency block, because those three are the
RPC's own contract and the rest of the function is arithmetic the seed already proves
elsewhere.

⚠️ **§2.10's location-isolation write half is 4b-i's, for the same reason.** *"A staff
`record_sale` against an unassigned location is rejected"* is a test of the wall, and
the wall is in 4b-i. The §2.10 table above says so.

⚠️ **4b-ii SHIPS NO MIGRATION, AND WHAT HAPPENS IF IT FINDS A DEFECT IS DECIDED NOW
RATHER THAN LATER.** A correction to `0016` cannot take `0017` without renumbering
4c–4f. It does not need to: **4c-i IS a `create or replace record_sale` in `0017`**, so
anything 4b-ii finds is folded into the replace 4c-i already writes, and 4c-i is the
very next task. If 4c-i should somehow merge first, the fix takes the next free number above
step 4.5's `0022`. This is recorded because the alternative — discovering it while
holding a red suite — is how a numbering decision gets made badly.

### ⚠️⚠️ Found in 4a — THE RULE REFUSED A FIXTURE THIS REPOSITORY HAS SHIPPED SINCE `0004`

**`supabase/tests/0004_inventory.sql` went red the moment `0015` applied**, and it was
right to. Its fixture opens `batch_1` — a lot with `origin = 'purchase'` — as one
top-level statement and writes the receipt movement ninety lines later as another.
Under psql's autocommit those are two transactions, so the first one **commits a
purchase lot with no receipt against it**: precisely the state 3.4's falsification S2
produced and precisely what `0015` exists to refuse.

The file was corrected rather than exempted, and the correction is one `begin` and one
`commit` around the batches and their receipts. ⚠️ **That is not a workaround, it is the
fixture learning the rule**: a delivery IS one transaction, and `record_purchase` in
`0018` will write it as one. 54 checks before, 54 after.

⚠️ **THE GENERAL FORM IS BINDING ON EVERYTHING AFTER THIS, and it is the thing to
carry out of 4a**: a `purchase` or `transfer` lot and the movement that fills it must
now be written in ONE transaction, by anything — an RPC, a seed file, a fixture, a
hand-typed `psql` session. Nothing catches the omission at review time; it applies,
it passes every other suite, and it fails at the commit.

### ⚠️ Found in 4a — `06` COULD NOT `ALTER TABLE` ANY MORE, AND NOTHING ABOUT THAT IS OBVIOUS

`06_ledger_invariant_randomised.sql` disables `stock_movement_project_balance_trg`
mid-transaction — probe C1, which is how it proves the oracle catches an unprojected
movement. With `0015` applied it stopped running at all:

> `ERROR: cannot ALTER TABLE "stock_movement" because it has pending trigger events`

**Postgres refuses `ALTER TABLE` on a table with DEFERRED trigger events queued in the
current transaction**, and every movement the generator writes queues one. The suite
had written four hundred of them by that line.

The fix is two statements before each `alter`: `set constraints all immediate` fires the
queue and empties it, `set constraints all deferred` puts the mode back so the rule
still reaches the END of the transaction. 99 tests before, 99 after. ⚠️ **The flush is
not a silencing** — the ledger is complete at that point, so those checks pass, and one
failing there would be a real finding.

⚠️ **This is a cost of deferral that nothing in the design discussion predicted**, and
it will be paid again by any future suite that disables a trigger on `stock_movement`
after writing to it. It is recorded here rather than only in `06`, because the next
person to hit it will be reading a stack trace, not that file's comments.

### ⚠️ Found in 4a — THE SEED SURVIVES ONLY BECAUSE ONE SEED FILE IS ONE TRANSACTION

`10_deliveries.sql` opens all 1 025 purchase lots in its section 7 and writes all 1 025
receipts in section 8 — **two separate top-level statements**. Under autocommit that is
two transactions and `0015` refuses the first. It does not fire, because
`supabase db reset` sends each seed file to the server as ONE batch, so the file is a
single implicit transaction and the rule is checked once, at the end of it.

✅ **MEASURED, NOT ASSUMED — this is falsification F6.** Making the three triggers
`not deferrable` and re-running the reset fails inside `10_deliveries.sql` with
`lot e736d2b7… opened as purchase for 29000.000 but its live receipt movements sum to
0 (SQLSTATE 23514)`, on the same file that is green one line above. The boundary is
real and it is where this says it is.

**The seed was NOT wrapped in an explicit `begin`/`commit` to harden it**, and that is a
decision rather than an omission. The CLI version is pinned in `db.yml` — "so a CLI
release cannot turn a green schema red without a commit saying why" — and if the
behaviour ever did change, `0015` makes the reset fail **loudly on the first delivery**
rather than quietly seeding a shop whose lots are all empty. An explicit `begin` inside
a file the client already wraps would also warn on every run and commit the outer
transaction early, which is worse than the dependency it removes.

### ✅ Found in 4a — A TRIGGER NOTHING CAN FALSIFY IS NOT EVIDENCE, AND ONE OF THE THREE WAS THAT

`0015` ships three constraint triggers: one on `stock_batch` for the lot that opens and
never fills, one on `stock_movement` inserts, one on `stock_movement` delete-or-update.
**The first draft of the suite could not tell the second one from nothing.**

Every falsification it had — no receipt, a short receipt, a doubled receipt, a receipt
against the wrong lot — happens INSIDE the transaction that opens the lot, and the
`stock_batch` trigger sees all four of them at that commit whether the movement trigger
exists or not. Dropping `stock_movement_receipt_complete_ins_trg` left the suite green.

The defect only that trigger can see is a receipt arriving in a **LATER** transaction,
against a lot that was already complete — the shape a retry leaves when it gets past the
header's idempotency key and reaches the ledger a second time. Check 4b is that, and
dropping the trigger now turns exactly it red.

⚠️ **The same question was then asked of the other two and both answered**: dropping the
batch trigger kills checks 2 and 10, dropping the delete-or-update trigger kills check
11. Each of the three is named by the check that dies without it.

### Settled in 4a, and binding on 4b through 4f

- **A lot and its receipt are ONE transaction.** Every RPC that opens a `purchase` or
  `transfer` lot writes the movement that fills it before it returns. `record_purchase`
  (`0018`) and `record_transfer` (`0020`) are the two that do this directly;
  `void_transaction` (`0020`) must keep it true, which it does by writing a
  compensating movement rather than removing the receipt.
- **A reversal is not a receipt, and a receipt is not a reversal.** The predicate counts
  `reason in ('purchase','transfer_in') and reversal_of_movement_id is null`. A void
  that "corrected" a delivery by deleting the original movement instead of compensating
  it is refused at the commit — which is the behaviour `0020` should want anyway.
- **`origin = 'adjustment'` is outside the rule, and `adjust_stock` (`0021`) is the
  reason the exclusion has to survive.** An opening balance or a physical count opens a
  lot whose quantity is asserted by a human. It receives nothing from anybody, and a
  rule spanning all three origins refuses it — measured on the seed's single one, which
  is `allocate_fefo()`'s shortfall lot.
- **`receipt_completeness_violations()` is granted to nobody**, following
  `batch_balance_violations()`: `security definer`, sees every tenant, so an operator
  and CI tool only. A cashier calling it gets `42501`, asserted.
- ⚠️ **The rule cannot be observed from a transaction that rolls back.** `06` and `07`
  build their fixtures inside `begin … rollback`, so deferred triggers never fire there
  and never will. The evidence for 4a is therefore `supabase/tests/0015`, which commits
  on purpose, and `supabase/checks/0015` over the seed — not the pgTAP suites.

### Six falsifications, run by hand before 4a was committed

Each one was applied to the applied schema, the affected suite was run, and the schema
was restored. A constraint that has never been seen to refuse anything is the vacuous
green ADR-035 §9 exists to reject.

| # | The change | What went red |
|---|---|---|
| F1 | `stock_batch_receipt_complete_trg` dropped | `tests/0015` — check 2, the lot with no receipt at all, now commits; the file then dies at check 10 on the missing constraint name |
| F2 | `stock_movement_receipt_complete_ins_trg` dropped | `tests/0015` — check 4b, and only 4b: a receipt added to an already-complete lot |
| F3 | `stock_movement_receipt_complete_chg_trg` dropped | `tests/0015` — check 11, the receipt deleted with the immutability guard lifted by name |
| F4 | `reversal_of_movement_id is null` removed from the predicate | `checks/0015` — **23 of the seed's own lots** become violations, which is the number the filter exists for |
| F5 | `origin = 'adjustment'` folded back into the rule | `checks/0015` — **exactly 1** violation, the seed's shortfall lot |
| F6 | the three triggers made `not deferrable` | **`supabase db reset` itself**, inside `10_deliveries.sql`, on the first lot of 1 025 |

⚠️ **F1 is the only one that fails messily**, and it is worth knowing why: with the
constraint gone by name, check 10's `set constraints … immediate` raises
`undefined_object` rather than the `check_violation` its handler catches, so the file
stops before printing its table. It is red either way; it is not red in the shape a
reviewer expects, and no attempt was made to smooth that over.

### ✅ CLOSED 2026-09-03 — `adjust_stock_delta` IS STEP 4.5's, AND §2.6 IS THE FILE THAT MOVED

Caught while checking this split against ADR-035 §3, before any of it was written.
**§2.6 counts `adjust_stock_delta` among the ten functions that are the write
surface**, which is what put it in step 4 in the first draft of this section. **§3
step 4.5 names it as a deliverable of the failure path**, alongside `failed_write`,
`record_failed_write` and `replay_failed_write`:

> 4.5 **The failure path** — `failed_write`, **`adjust_stock_delta`**,
> `record_failed_write`, `replay_failed_write`, and the pgTAP suites that cover them.

`CLAUDE.md` is unambiguous about what to do when a file disagrees with the ADR, and
here it is the ADR disagreeing with itself — so the **build-order section wins on a
build-order question**: `adjust_stock_delta` ships in **`0023`, step 4.5**, and 4f is
`adjust_stock` alone. That is also the reading that costs least, because §2.6's own
gloss on the function is *"Required by the failure path below"* — it exists for
`record_failed_write` to call, and shipping it a migration earlier buys nothing.

✅ **PUT TO THE OWNER AND SETTLED THE SAME DAY: amend §2.6.** ADR-035 now carries a
2026-09-03 revision line and §2.6 says, above its own table, that three of the ten
ship in 4.5 — with the row for `adjust_stock_delta` saying it too. The table is the
write surface, not the build order; of its ten rows three are 4.5's and
`onboard_workspace` has been applied since `0001`, **which leaves six for step 4**.

⚠️ **§3 was NOT touched.** It was already right, and the disagreement was never about
what should happen — only about which section a reader counts from. Amending the
section that does the counting is the smaller edit and the one that stops the next
reader making the same mistake this split nearly did.

✅ **4b WAS READ AGAINST §2.6 ON 2026-09-03 AND IT DID SPLIT** — into 4b-i and 4b-ii,
on very nearly the candidate seam this file named in advance. One rule moved across it
and one candidate seam was refused outright; both are recorded in *Settled in sizing
4b* below, because a seam chosen under pressure is the thing naming it early was meant
to prevent.

⚠️ **`0006` IS WRITTEN ALL OVER THIS REPOSITORY AND IT WILL NEVER EXIST.** Eight
applied migrations and eight suites say things like *"the wall is `0006`'s"* or
*"`record_purchase` in `0006` must do exactly what this file does"*. **They are still
correct about the obligation and wrong about the number**: read `0006` as *the RPC
migration* — now `0015`–`0022` — and `0007` as *the failure path*, now `0023`. Those
files are NOT being edited to say so. Applied migrations are append-only, and
rewriting sixteen files to renumber a forward reference would touch far more than it
clarifies. This note is the mapping.

### What step 4 inherits — five obligations already settled, and none of them optional

These were decided in step 1, 2 or 3 and recorded in the sections above. They are
collected here because the sessions that wrote them will not be the sessions that
implement them.

| Obligation | Settled | Where the reasoning is |
|---|---|---|
| **Every ledger RPC checks `location_id in (select public.my_locations())` in its OWN body, and hard-refuses.** No override, no manager bypass — shift cover is a reassignment | Owner, 2026-08-24 | *⚠️ BINDING ON `0006` — THE RPCs MUST CHECK `my_locations()` THEMSELVES* |
| **The tax split: `record_sale` gross-first, `record_purchase` net-first, tax the residual on both.** `record_waste` follows the sale shape | Owner, 2026-08-26 | *⚠️ BINDING ON `0006` — THE TWO LINES `record_purchase` AND `record_sale` MUST CARRY* |
| **Receipt completeness as a deferred constraint**, excluding `origin = 'adjustment'`, with `reversal_of_movement_id is null` load-bearing | Owner, 2026-08-26 | *What step 3 does NOT ship* — predicate verified against a fresh reset |
| **`allocate_fefo()` must be called inside the caller's transaction** and takes a required `p_occurred_at`; its locks last until that transaction ends | `0010`, task 1.8 | Step 1, the `0005` / `0010` notes |
| **Idempotency: `on conflict (id) do nothing`, then check whether the insert happened.** Same id + same payload → `already_recorded: true`; same id + different lines → raise and dead-letter, which needs step 4.5 | ADR-035 §2.6, 2026-08-14 | *Found before 3.7a was written*, and 3.7a's suite asserts the platform half |

⚠️ **Nothing in the schema catches the first one's absence.** A migration that omits
the location check compiles, applies, and passes every suite steps 1–3 shipped —
including 3.3, which asserts reads. **The test for it belongs with the RPC and is not
an RLS test.**

### The §2.10 rows step 3 could not write, and which task now owes each

Step 3 closed with three of §2.10's nine rows unwritten, because they need tables and
functions steps 4 and 4.5 create. They are named under *What step 3 does NOT ship*;
this is where they land.

| §2.10 row | Owed by |
|---|---|
| ~~Concurrency, clause 1 — *"two sessions, last unit, enforcement on → exactly one succeeds"*~~ | **4c-ii — DONE 2026-09-04**, `supabase/vitest/test/availability-race.test.ts` |
| ~~Location isolation, the write half — *"a staff `record_sale` against an unassigned location is rejected"*~~ | **4b-i — DONE 2026-09-03**, `supabase/tests/0016` check 1.2 |
| ⚠️ **Transfer re-send, concurrent** — *"two sessions, one `transfer_group_id`, both in flight → the van ships ONCE"*. **NOT a §2.10 row** — found in 4e-i and owed since 2026-09-04, because `record_transfer` has no primary key to collide on and rests on an advisory lock F9 proved nothing watches | **UNASSIGNED** — `supabase/vitest/test/idempotency.test.ts` is the home; the owner's call is whose task |
| ⚠️⚠️ **The void window on a REPLAYED write** — *"a replayed sale keeps its original `occurred_at` and takes a fresh `recorded_at`, so the amended basis hands it a NEW fifteen minutes — is that right?"*. **NOT a §2.10 row** — found by falsification F6 in 4e-ii-a and owed since 2026-09-04. ⚠️ **It cannot be written today**: no online document exists where `occurred_at` and `recorded_at` differ, so F6 turns nothing red and nothing can make it. `replay_failed_write` is the first thing that creates one | **STEP 4.5**, with the failure path it belongs to — recorded in ADR-035 §2.6's amendment as explicitly open |
| **Failure path** — *"a rejected sale yields exactly one `failed_write` row, one linked compensating movement, and a balance matching the shelf"* | **Step 4.5** (`0023`) |
| **Replay** — dead-letter → downgrade → replay, keeping the original `occurred_at` | **Step 4.5** (`0023`) |

**So ADR-035 §3's *"do not build screens before this passes"* is satisfied at the end
of step 4.5, not at the end of step 3.** That sentence has been read as step 3's alone
in earlier drafts of this file, and it never was.

---

## Working agreement

One task per session. Before starting, estimate difficulty; if it is large, split it
here first so the work survives a usage limit or a context clear. Update this file
when a task closes — a plan that lags the code is the failure ADR-035 §9 names.

Every schema claim must be traceable to a migration CI has applied. A file is not
evidence; a green CI run is.
