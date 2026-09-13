# `5a-iv-a` — the sitting

**The five readings no CI can take, plus the one pre-check that decides whether
`5a-iv-d` is free or costs $99.** One evening, the phone in your hand.

⚠️ **Run `bash docs/checks/5a-iv-a-preflight.sh` first and get a green.** Every
assertion in it is something that would otherwise be found *here*, with the phone
already plugged in. Two of them can only be cleared by you: the Apple ID, and a
rehearsal build that proves the native project compiles.

⚠️ **Write the answers down as you go, in the boxes below.** Four of the six
readings are *opinions* — "does that read as big", "did an interstitial appear" —
and an opinion not written down at the time becomes a memory of an opinion.

---

## 0. Before the phone comes out

```bash
bash docs/checks/5a-iv-a-preflight.sh
```

Expect green — every assertion, no fails. If the signing assertion is the only red one, clear it now:

```
open app/ios/Wera.xcworkspace
Xcode → Settings → Accounts → + → Apple ID → sign in
target Wera → Signing & Capabilities → ✓ Automatically manage signing
Team → the Personal Team that appears once you are signed in
```

⚠️⚠️ **EVERYTHING FROM HERE IS INSIDE THE SEVEN DAYS.** A free personal team signs
for seven days; `5a-iv-d`'s reading is at day **eight**, and the plan's answer to
that is the pre-check in §5 below, not a shorter wait. ⚠️ **Whether the seven run
from this sign-in (the certificate) or from the first device build (the profile)
is not measured** — they are minutes apart, which is why §5 is in this sitting and
not the next one.

---

## 1. The phone

1. Plug it into the Mac. Unlock it. **Trust This Computer** if asked.
2. On the phone: **Settings → Privacy & Security → Developer Mode → on.**
   It reboots. ⚠️ **This is the step everyone forgets**, and its failure mode is
   an install that ends in a dialogue about an untrusted developer rather than an
   error you can search for.

---

## 2. The build

```bash
export DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer   # required: xcode-select points at the CLT

# 1. FIRST BUILD ONLY — creates the provisioning profile. `expo run:ios`
#    cannot do this: it does not pass -allowProvisioningUpdates, and a free
#    personal team has no profile until something asks for one.
cd app/ios
xcodebuild -workspace Wera.xcworkspace -scheme Wera -configuration Release \
  -destination 'id=<DEVICE-UDID>' -allowProvisioningUpdates build

# 2. INSTALL. ⚠️ NOT `npx expo run:ios` — its installer uses the old lockdown
#    pairing path and fails `CommandError: InvalidHostID` on this Mac+phone.
xcrun devicectl device install app --device <CORE-DEVICE-UUID> \
  ~/Library/Developer/Xcode/DerivedData/Wera-*/Build/Products/Release-iphoneos/Wera.app

# 3. LAUNCH. Add --console to see JS exceptions; without it a crash is silent.
xcrun devicectl device process launch --console --terminate-existing \
  --device <CORE-DEVICE-UUID> mx.bserafin.wera
```

⚠️⚠️ **THERE ARE TWO DIFFERENT IDENTIFIERS AND THEY ARE NOT INTERCHANGEABLE.**
This cost the first attempt of the 2026-09-13 sitting:

| Needed by | Which | How to get it |
|---|---|---|
| `xcodebuild -destination`, `expo run:ios --device` | **device UDID** — `00008120-…` | `xcrun xctrace list devices` |
| every `xcrun devicectl` command | **CoreDevice UUID** — `D15192C1-…` | `xcrun devicectl list devices` |

⚠️ **`5a-iv-a-preflight.sh` prints the CoreDevice one**, which is the wrong one
for the build. It now prints both.

⚠️⚠️ **`--configuration Release` IS NOT OPTIONAL AND IT IS NOT A PREFERENCE.**
`npx expo run:ios` defaults to **Debug**, and a Debug build does not contain its
own JavaScript — `ios/Wera/AppDelegate.swift` asks Metro for a bundle URL under
`#if DEBUG` and only reads the embedded `main.jsbundle` in the other branch. A
Debug build therefore **cannot launch with the Mac out of the room**, which is
exactly the condition of both the pre-check and the eight-day reading. On day 8 a
Debug build shows a red screen about a development server, and the reading that
comes back is not "signed out" — it is **nothing at all, from an instrument that
never reached the question.**

First launch of a free-signed app: the phone refuses it once, and then
**Settings → General → VPN & Device Management → your Apple ID → Trust.**

### ✅ Prove the build is self-contained *before* anything else

**Quit Metro** (Ctrl-C in the terminal), **unplug the phone**, and open the app
from the home screen.

> **It opens and renders:** ☐ yes ☐ no
>
> If **no**, stop. The build is Debug in effect, the rest of this sheet measures
> the laptop rather than the app, and `5a-iv-d` cannot start.

---

## 3. The four readings you take by looking

Take them in this order — it is the order the app puts them in front of you.

### Reading 3 of 6 — the guard redirects, and nothing hangs on a splash

Cold start, **signed out**. (If you are signed in, log out first.)

> Where does it land? ☐ `/entrar`, the way in ☐ the tab bar ☐ **stuck on the splash**
>
> How long from tap to first screen? ______ seconds

⚠️ **The splash is the interesting failure.** `guard.ts`'s `ready` flag is false
for the first frames of *every* launch, signed in or not, because reading the
session out of `expo-sqlite` is asynchronous. If the effect that acts on the
guard were dropped, a signed-out cold start would sit on the splash forever —
and every assertion in `app/test/guard.test.ts` would still be green.

### Reading 1 of 6 — C12.1: the tab bar draws its **words**

> Under each of the four icons, is there a word? ☐ yes ☐ no
>
> Read them off the screen, exactly: ______________________________________

⚠️ **This is the deliverable that no check in this repository can ever see.**
Falsification F14 in `5a-ii` set `tabBarShowLabel: false` — icons alone, the one
thing C12.1 forbids — and nothing turned red. §2.10/§2.11 refuse suites over
rendering, and *"the label is drawn"* is a rendering claim. **You are the
instrument.**

### Reading 2 of 6 — C3.18: whether the numbers read as big

> Hold the phone where you would hold it behind a counter. The large figures:
> ☐ comfortably big ☐ fine ☐ too small
>
> ⚠️ **Ask someone over fifty, without telling them the answer you want:**
> ______________________________________________________________________

⚠️ **`density.ts` says 76pt and `app/test/density.test.ts` proves it is 76pt.**
Neither knows whether 76pt is *big*. That question has no file.

### Reading 6 of 6 (taken here, not on day 8) — C1.3: the last screen

1. Go to **Vender**.
2. Kill the app from the app switcher.
3. Open it again.

> Where does it open? ☐ Vender ☐ the first tab ☐ the way in
>
> Repeat for **Comprar**: ☐ Comprar ☐ somewhere else

---

## 4. Reading 4 and 5 of 6 — Google, end to end

⚠️ **This is the only thing in `5a` whose failure mode is *the browser opens and
never comes back*.** Two of the six readings live inside it, and neither is
measurable from outside a browser.

Sign out. Tap **Entrar con Google**.

> **a.** Safari opens on `accounts.google.com`: ☐ yes ☐ no
>
> **b. Reading 5 — the *"unverified app"* interstitial.** Google shows this for a
> consent screen in *Testing*. It may not appear for a test user.
> ☐ it appeared ☐ it did not
> If it appeared, write what it says, verbatim — this is what a pilot shopkeeper
> will read: ____________________________________________________________
>
> **c. Reading 4 — the redirect allow-list.** After consent, the browser hands
> back to the app.
> ☐ the app reopens, signed in ☐ **the browser lands on a "cannot connect" page**
> ☐ it hangs
>
> **d.** Which tab are you on when it returns? ______________________

⚠️ **(c) IS THE ONLY MEASUREMENT THIS PROJECT WILL EVER HAVE OF THE SUPABASE
REDIRECT ALLOW-LIST.** The owner added `mx.bserafin.wera://**` to the dashboard on
2026-09-12 and **no check in this repository can confirm it** — an assertion over
it was written, measured and deleted, because `/auth/v1/authorize` returns the
same 302 for the right redirect and for `evil.example.com`, and `/auth/v1/settings`
exposes thirty-two fields of which none is the allow-list. The gate script was
re-run after the change and still read 15/15: **it did not notice.**

✅ **A failure here is loud rather than plausible, and that was deliberate.** Site
URL is `http://localhost:3000` and stays there, so a failed allow-list match lands
on a visible *"cannot connect"* page inside the sign-in sheet — not on a real page
that looks like it worked.

---

## 5. ⚠️⚠️ The day-0 pre-check — the five minutes that decide $99

**Do this last, and do it while signed in.**

1. You are signed in. Leave it that way.
2. Kill the app from the app switcher.
3. Plug the phone back in and **re-deploy**. ⚠️ **This is an `install`, not a
   rebuild** — the point is an upgrade install over the same bundle id:
   ```bash
   xcrun devicectl device install app --device <CORE-DEVICE-UUID> \
     ~/Library/Developer/Xcode/DerivedData/Wera-*/Build/Products/Release-iphoneos/Wera.app
   xcrun devicectl device process launch --device <CORE-DEVICE-UUID> mx.bserafin.wera
   ```
   ⚠️ **If the profile has expired, step 1's `xcodebuild … -allowProvisioningUpdates`
   has to run first** — that is the whole mechanism `5a-iv-d` depends on.
4. Open it.

> **Still signed in?** ☐ yes ☐ no

- ☐ **yes** → ✅ **the whole of `5a-iv` runs on this iPhone for nothing.** An
  upgrade install over the same bundle id preserved the app's data container, so
  an expired profile — which stops the app *launching* and does not touch the
  SQLite file the session lives in — can be cleared on day 8 by re-deploying,
  *then* reading. **`5a-iv-d` needs no second device and no $99.**
- ☐ **no** → ⚠️ **that is what the $99 buys**: a Developer Program profile that
  lasts a year, so day 8 needs no re-deploy at all. It is now a **measured**
  necessity rather than a guess, which is the whole reason this step exists.

⚠️ **Why the answer is not obvious.** "An upgrade install preserves the data
container" is a claim about Apple's system, and this repository does not assume
those — see `credentials.ts` on email normalisation for the same refusal.

---

## 6. Starting the clock

1. **Sign in** (if the pre-check left you signed out, sign in again).
2. **Put the phone down.** Do not open Wera again.
3. Write the date here and in `docs/PLAN.md`'s `5a-iv-d` row:

> Day 0: __________________  → **the eight-day reading is due __________________**

⚠️ **Turn OFF Settings → App Store → Offload Unused Apps**, or iOS may remove the
binary during the wait and take the SQLite store with it. That would return
"signed out" from an app that was never asked.

---

## 7. What to write back into the plan

Six readings, six answers, plus the pre-check. ⚠️ **A reading taken and not
written down is a reading this project did not take** — `5a-iv-a` is the only
instrument for five of them, and there is no second run to fall back on.

| | Reading | Answer |
|---|---|---|
| 1 | C12.1 — the words are drawn | |
| 2 | C3.18 — 76pt reads as big | |
| 3 | the guard redirects, no splash hang | |
| 4 | the Supabase redirect allow-list | |
| 5 | Google's *"unverified app"* interstitial | |
| — | ⚠️⚠️ **the day-0 pre-check** | |
| 6 | C1.4 — the eight-day reading | `5a-iv-d`, not today |
