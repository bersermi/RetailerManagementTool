# Archived status log — the 2026-09-21 working day

⚠️ **THIS IS PART OF THE PLAN, NOT A BACKUP OF IT**, and it is **closed, not wrong**
— the same distinction as [`steps-0-to-4.5.md`](steps-0-to-4.5.md),
[`status-log-through-2026-09-18.md`](status-log-through-2026-09-18.md),
[`status-log-2026-09-19.md`](status-log-2026-09-19.md) and
[`status-log-2026-09-20.md`](status-log-2026-09-20.md), and the opposite of
`archive/power-platform/`, which describes a system nobody is building. Every entry
here was true when it was written and still describes this system.

Cut out of `## Position` in `docs/PLAN.md` on 2026-09-22, the **fourth** cut of that
section, when `plan-handover.sh` assertion 7 found Position at **1,405 lines against a
1,400 ceiling**. **Nothing was edited, summarised or reordered** — these are the
original lines in their original order, and the split was verified by rebuilding the
source file and confirming it came back **byte-identical**.

⚠️ **THE DAY-8 READING IS THE WHOLE OF THIS DAY**, and it is the one entry here that a
later session may need: C1.4's *"the session persists until an explicit log-out"*,
measured on two instruments. ⚠️ **The iPhone half of its successor was traded away by
the owner on 2026-09-22** — he took the phone back to work on — so the day-30 reading
of 2026-10-13 stands on the sealed AVD alone. See the ⏳ block in the live plan.

---

✅✅ **THE `5a-iv-d` DAY-8 READING WAS TAKEN ON 2026-09-21, ON BOTH INSTRUMENTS,
AND C1.4 HOLDS: THE SESSION SURVIVES EIGHT DAYS.** ⚠️ **A DATE, NOT A TASK** — no
code changed, nothing was built, and `5c-ii-b` remains the next task. What this
entry records is a measurement and three findings that came with it.

**The answer, and why it is a diff rather than an impression.** Both stores were
pulled **before** either app was launched and again after, so the verdict rests on
what changed rather than on what a screen looked like:

| | iPhone 15 | sealed AVD |
|---|---|---|
| account | `09bfc47e…` | `eb963741…` — **a different Google account**, so the two instruments are genuinely independent |
| access token before | dead **8 d 7 h** | dead **7 d 14 h** |
| after launch | new, valid 1 h | new, valid 1 h |
| refresh token | **rotated** | **rotated** |
| `last_sign_in_at` | **unchanged** `2026-09-13T06:47:53Z` | **unchanged** `2026-09-14T00:20:05Z` |

⚠️⚠️ **`last_sign_in_at` NOT MOVING IS THE WHOLE FINDING.** A new access token could
mean a fresh sign-in; an unchanged sign-in timestamp cannot. The session was
**restored** from the stored refresh token with no human action but opening the app —
which is exactly C1.4's *"persists until an explicit log-out"*. ✅ **The Android half
also has a screenshot** — Inicio, tab bar, `Cerrar sesión` — because it is the one
platform whose screen could be read directly.

⚠️ **THE REFRESH TOKEN WAS DELIBERATELY NOT SPENT OUT-OF-BAND.** Calling the token
endpoint directly would have answered the question in one request and **revoked the
session family**: reuse detection is on at a 10s interval (`5c.5`), so the device's
stored token would have been a replay. That is the measurement destroying itself and
signing the owner out of his own phone. The app had to do it.

⚠️ **AND THE EMULATOR'S CLOCK WAS CHECKED BEFORE THE VERDICT, NOT AFTER.** A sealed
VM resuming with a stale clock answers this question wrongly and confidently — the
generalisation of [[emulators-never-sleep-or-lock]], which is about asserting the
instrument can actually look. It agreed with the host to the second, `auto_time=1`.

**THREE FINDINGS, and the first two are obligations rather than trivia:**

| | Finding | What it changes |
|---|---|---|
| **1** | ⚠️⚠️ **THE FIRST LAUNCH WAS REFUSED: *"its profile has not been explicitly trusted by the user"*.** The 2026-09-20 re-deploy minted a new signing certificate, and iOS will not start the app until a person taps Settings → General → VPN & Device Management → trust | **The 2026-09-27 re-deploy row did not say this and now does.** ⚠️ A re-deploy that is never trusted is an instrument that cannot be read on 2026-10-13, and **nothing would have said so until the day**. ✅ The refused launch was harmless and that was verified rather than assumed: no process started, the store kept its day-0 timestamp |
| **2** | ⚠️⚠️ **THE DAY-30 READING NO LONGER MEASURES THIRTY DAYS.** Opening both apps today refreshed both sessions — that is what the reading IS — so 2026-10-13 measures **22 days from today**, not 30 from day 0 | Recorded on the row itself. **It is still worth taking** (22 untouched days is a longer gap than 8, and C1.4's claim is unbounded), but *"day 30"* is now a name rather than an interval, and a session reporting it as thirty days since sign-in would state something false |
| **3** | ⚠️⚠️ **THIS MAC HAS AN iOS SIMULATOR AFTER ALL — Xcode 26.6, iOS 26.5, eleven devices.** The **tenth stale copy** recorded here, and the first caused by the MACHINE changing under a sentence that was true when written rather than by a copy drifting | ⚠️ **`xcrun simctl` still fails, which is why it was nearly missed twice**: `xcode-select -p` still points at `/Library/Developer/CommandLineTools`, so every `xcrun` call misses Xcode. Full paths under `/Applications/Xcode.app/Contents/Developer/usr/bin/` work. **It changes HOW `5c-ii-b`'s iOS half is measured, not whether `5c-ii-b` is gated** |

⚠️ **THE 2026-09-20 SENTENCES ARE STRUCK, NOT DELETED.** *"There is no iOS Simulator
on this Mac"* was true when written and the `5c-ii` split rests on it; a record that
quietly rewrites its own premise cannot be audited, which is the same reason
`docs/plan/archive/` exists.

✅ **`5c-ii-b` IS UNGATED AND STILL THE NEXT TASK.** Its gate was this reading. ⚠️ **The
simulator does not simply replace the phone and its row now says so**: a simulator
shares the host's network and has no cellular radio, so it can answer *"what do these
two libraries report when the link drops"* and cannot answer *"wifi versus cellular"*.
**Whether that distinction is needed is `5c-ii-b`'s first question.**
