# `5a-iv-c-3` — the borrowed Android evening

**Booked: the evening of 2026-09-14.** One evening, with a relative's Android. The
pilot's own Oppo and Samsung belong to the users — *"not me to take their devices
anywhere"* — so this is the only Android hardware this project gets before the pilot.

> ⚠️ **WHY THIS IS A FORM WITH BOXES AND NOT A LIST OF COMMANDS.** `5a-iv-a`'s sitting
> produced six readings and **four of them were opinions**. One — C3.18's — was not
> written down on the night and took a second conversation the next day to recover.
> A reading not written down at the time is one this project did not take.

---

## Before the evening — NOT on the night

| # | | Done |
|---|---|---|
| P1 | ✅✅ **DONE 2026-09-13. `5a-iv-c-2` is closed and the Release APK exists**, built, installed and launched on the emulator — `docs/checks/5a-iv-c-2-rehearsal.sh` 15/15. This evening is a sitting, not a setup | ☑ |
| P2 | ⚠️⚠️ **USB debugging is on, on a phone that is not yours.** Settings → About phone → tap **Build number** seven times → back → Developer options → **USB debugging**. ⚠️ **Ask the day before.** It is thirty seconds of someone else's phone and it is the difference between plugging in and negotiating | ☐ |
| P3 | A USB **data** cable, tested. ⚠️ A charge-only cable is indistinguishable from a broken one until `adb devices` is empty | ☐ |
| P4 | ✅ **DONE — `~/wera-release-2026-09-13.apk`** (107 MB universal, four ABIs, Hermes bytecode). ⚠️ **Outside the build tree on purpose**: regenerating `app/android` deletes the copy under it, and a cold rebuild is eleven minutes. ⚠️ **It is signed with the DEBUG keystore** — sideloading is fine; *Install unknown apps* has to be allowed on the phone | ☑ |
| P5 | Google test-user accounts still valid — the consent screen is in *Testing*, and its tokens expire | ☐ |

⚠️ **On first plug-in the phone shows *"Allow USB debugging?"* with a fingerprint.**
It is easy to miss and `adb devices` reports `unauthorized` until it is tapped. That is
not a failure; it is a dialog on a screen you are not looking at.

---

## The sitting

`adb devices` → expect `device`, not `unauthorized` and not empty.

```
adb install -r <the Release APK>
adb logcat -c && adb logcat | tee ~/wera-android-evening.log
```

⚠️ **Start `logcat` BEFORE launching the app, and keep it.** `5a-iv-a`'s crash was
`TypeError: undefined is not a function` on the splash — on Android that line is in
logcat and nowhere else. **A crash you did not capture is an evening you have to
re-book**, and this one cannot be re-booked.

### The readings

| # | | What counts as an answer | Result |
|---|---|---|---|
| A1 | ⚠️⚠️ **Does it launch at all?** | The app reaches a screen. If it does not, **the log is the deliverable** | ☐ |
| A2 | ⚠️⚠️ **`R10` — does money render?** Find any price | `$1,234.50` — correct separator, two centavos. **Anything else, capture the log.** ⚠️ **Half-answered in advance on 2026-09-13** — an emulator probe read `$1,234.50` with the right code points, so this reading is now a CONFIRMATION on real silicon rather than the first look | ☐ |
| A3 | **C12.1** — four words under the icons | *Inicio, Vender, Comprar, Desperdicio*, drawn and legible | ☐ |
| A4 | **C3.18** — the numbers, on a screen that is not an iPhone 15 | Big enough, at arm's length. ⚠️ **Write the answer down here, on the night** | ☐ |
| A5 | **Google sign-in**, end to end | The browser opens **and comes back**. ⚠️ The deep link is the risk | ☐ |
| A6 | **C1.3** — kill and reopen | It restores the last screen | ☐ |

### ⚠️ A2 is the one this evening exists for

`R10` — *"`Intl` is an allow-list of what has been measured on a phone"* — was written
from a crash on **iOS Hermes**, on 2026-09-13. Every measurement behind it was taken on
one runtime. **Android Hermes backs ECMA-402 differently**, and `format()` working on an
iPhone is not evidence about an Oppo.

✅✅ **UPDATED 2026-09-13, AFTER `5a-iv-c-2`: THE EMULATOR ALREADY ANSWERED PART OF THIS,
AND THE ANSWER WENT THE OTHER WAY.** `format()` and `resolvedOptions()` work on Android
Hermes and C12.2 holds byte-for-byte — but **`formatToParts`, the name that killed the app
on the iPhone, IS A FUNCTION on Android.** The ECMA-402 surface is a property of the
**platform** (Foundation vs ICU), not of Hermes, so `R10` is now written as an
**intersection** of the platforms the pilot ships to.

⚠️ **So A2 is no longer a first look — it is the same question on real silicon.** An
emulator is Android's ICU on an x86-or-arm image; a two-year-old Oppo with a vendor ROM and
a device locale of its own is not obviously the same ICU. ⚠️⚠️ **If A2 disagrees with the
emulator, THAT is the deliverable of the evening** — capture it, because it means the
allow-list needs a third column and not a correction.

If A2 is wrong, the fix is not on this phone. **Capture it, and the rule gets its second
runtime's worth of evidence** — which is the whole reason C1.1 widened register #13 from
an emulator smoke test to real hardware.

---

## Afterwards

- ⚠️ **Write the opinions down before you hand the phone back**, not tomorrow.
- Uninstall: `adb uninstall mx.bserafin.wera`. It is not your phone.
- ⚠️ **Offer to turn USB debugging back off.** It was on for you, not for them.
