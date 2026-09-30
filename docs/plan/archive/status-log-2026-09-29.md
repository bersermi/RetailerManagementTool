# Status log — the 2026-09-29 working day, first cut

⚠️ **Moved by `8c` from `docs/PLAN.md`'s `## Position`, unedited** — the day's two oldest entries.
The day was still running; **a later cut APPENDS here, never a second file for this date.**

✅ **`8a` IS DONE, 2026-09-29 — `8b` was next.** The handbook is **299 lines / 15.9 KB, from 1,229 / 265 KB** (`wc -lc`): what the app does, what is on his phone, the screens only he can judge, the day's jobs, the dates, both prompts verbatim. The old file moved **whole** to `docs/plan/archive/handbook/` (see the `8a` row for why a subfolder). `handbook-agreement.sh` 5 of 5 and its falsifier 11 of 11. Two struck 2026-09-27 headers went to that day's archive.

⚠️⚠️ **`8a` was the next task, AS OF 2026-09-29 — THE OWNER TURNED THE PROJECT FROM *BUILD* TO *BETA*,
AND 2026-09-29 IS A CLEANING DAY.** His words, after midnight: *"We have an Alpha already then, I want
to start improving the App design and the overall UI … to get to a beta and publish our MVP afterwards
both in iOS and Android"* — design work is booked for **Wednesday 2026-09-30**, and *"for this whole day
(September 29th) let's focus on cleaning our progress and leave everything ready for our next moves."*
⚠️ **`5P-c` IS DEFERRED BY HIM, NOT CANCELLED**: asked who keeps the pilot's hand tally, he answered
*"I'm not concerned on this at all. At this point my main interest is to improve the user experience."*
Its row keeps its size and gate; it simply stopped being next. ⚠️ **The plan for the day, the diagnosis
it rests on and the prompt he pastes are in `## Step 8`** — this entry is the pointer, not a copy.
✅ **Measured before writing, from the things that run:** `npm --prefix app test` **1,719 tests across 52
files**, green; `5R-f-schema-deployed.sh` **6 of 6** (41 migrations on the hosted project); the hosted
shop holds **24 sales, 10 deliveries, 2 write-offs, 28 products** (`supabase db query --linked`), so every
screen reads and writes the real database. ⚠️ **This entry also removed twenty blank lines** a
previous cut had left here.

---

⚠️ **Second cut, appended by `8d`** — the forty-sixth ruling and `8b`'s closing entry, unedited.

✅✅ **THE FORTY-SIXTH RULING — 2026-09-29: *"Retire the split-coverage guards as recommended."*** The
row `8b` parked against `8d` is closed and the block above is empty again. **Retired** (`git rm`, 26
files / 3,116 lines): `split-coverage.sh`, `split-coverage-falsify.sh`, `specs/` (21 splits),
`5a-split-coverage.sh`, `4.6a-split-coverage.sh` and its falsifier, and their five steps and nine path
entries in `app.yml`. **Kept**: `plan-handover.sh` and `handbook-agreement.sh`. ⚠️ **What he accepted**:
nothing now catches a task row stated twice across the live plan and the archive — *move, never copy*
is held by reading. ✅ **`handbook-agreement-falsify.sh` now builds its own rows** (id `8z`, which
exists nowhere) instead of editing real ones — 13 fixtures, 13 behave — so the seven closed `5b` rows
it pinned here moved to `steps-4.6-to-7.md` and the handbook dropped its three. **Nothing a shopkeeper
sees changed.** `8c` is still next.

✅ **`8b` IS DONE, 2026-09-29 — `8c` was next.** `docs/PLAN.md` went from
**5,573 lines / 830 KB to 420 / 73 KB**, `## Position` from **1,283 lines to 71** (`wc -lc`,
`plan-handover.sh`). **Nothing was edited, only moved** — every non-blank line of the old file is in
the live plan or one of three new archives (checked by line multiset, zero missing, no row doubled):
`steps-4.6-to-7.md` (the closed step prose and rows), `position-history-through-2026-09-29.md`
(rulings 1–45, the ticked dates, cuts 1–27) and `status-log-2026-09-28.md`. ⚠️ **2026-09-27 got no
append**: it was already whole in its archive. ⚠️ **One guard edited, not weakened**:
`4.6a-split-coverage-falsify.sh` copied `docs/PLAN.md` and mutated Step 4.6's text; it now copies the
corpus, and its eleven fixtures behave. The one decision it parked was ruled the same day (above).

---

⚠️ **Third cut, appended by `8e`** — `8c`'s closing entry, unedited.

✅ **`8c` IS DONE, 2026-09-29 — `8d` was next.** `CLAUDE.md` **28,876 →
9,336 bytes**, `app/CLAUDE.md` **29,433 → 4,713** (`wc -c`; target 12 KB each): rules and pointers only,
and every count replaced by the command that measures it (a new one lists CI jobs by name). ⚠️ **Two
stale claims found and not carried over**: *no module queries `product_velocity_daily`* (`sales.ts` and
`prices.ts` both do) and `db.yml`'s filter as described (it also fires on root `package*.json` and
`app/src/lib/supabase.ts`). The day's two oldest entries moved to `status-log-2026-09-29.md`.

⚠️ **And `8d`'s closing entry, in the same cut.**

✅ **`8d` IS DONE, 2026-09-29 — `8e` was next.** Listed first, then only the
list deleted. **Remote branches 10** (every one's tip = its merged PR's head): `0004-inventory`,
`0005-allocation`, `5d-ii-productos`, `5e-ii-agregar`, `5e-ii-search-first`, `5f-iii-b-slide-and-first-write`,
`ci-cleanup-not-reset`, `docs-handbook-looking-around`, `task-4e-ii-void-fence`,
`working-agreement-automerge`; **local 7**, the same names that existed here. ⚠️ **Kept on purpose**:
`5e-iii-a-catalog-edit` — its tip `cb0e29a` (*Editar is drawn*) is closed PR #185's head, not merged #184's,
so it holds work `main` never took — and `docs/adr-035-client-stack-review`, which has no PR (it is an
ancestor of `main`, so deleting it would lose nothing; the owner's call). **Graph backups 34 of 35**
(`graphify-out/2026-08-14`…`2026-09-28`, 50 MB, written by graphify before each rebuild and read by
nothing); today's kept as the restore point. **Graph: 4,352 nodes, 8,580 edges, 1,500 from `docs/`**
(`graph.json`, current, no node from a deleted file). **Memory 85 → 84**: deleted
`fixture-must-edit-the-non-owning-row` (its only subject was a retired harness); corrected seven that
named retired checks or stale numbers. The 2026-09-29 ruling and `8b` entries moved to the day's archive.

⚠️ **Fourth cut, appended by `8f`** — `8e`'s closing entry, unedited.

✅ **`8e` IS DONE, 2026-09-29 — `8f` IS THE NEXT TASK, AND IT IS UNGATED.** The map is a private page:
https://claude.ai/artifact/4h59q1QEdc1q3ztYnN39EJ. **Healthy**: no screen types its own colour, size or spacing (108 files scanned, comments
stripped). **For Wednesday**: sign-in and bienvenida are outside the palette; the active tab is iOS blue
(no tint set); two header styles; **a bug — `Precios`' period cards break words ("cambi / o")**; no dark
palette although `app.json` says `automatic`; the three drifted shapes; an unnamed small size
(`bodySize * 0.85`, 33 uses); busy opacity 0.6 vs 0.5; cart timings typed per screen. **`8f` sized `L`,
`XL` if dark mode is built — decide that Wednesday and build it separately.** ⚠️ **Screenshots came from a
Release simulator build pointed at a LOCAL copy of the seed shop** (an HTTPS proxy, build-time env only; no
source changed, production untouched). The iPhone 17 simulator now carries that build, and the local
seed owner has a password until the next `supabase db reset`.
