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
| P1 | ⚠️⚠️ **`5a-iv-c-2` is finished and a Release APK exists.** Without it this evening is a setup, which is the one thing the three-way split was designed to prevent | ☐ |
| P2 | ⚠️⚠️ **USB debugging is on, on a phone that is not yours.** Settings → About phone → tap **Build number** seven times → back → Developer options → **USB debugging**. ⚠️ **Ask the day before.** It is thirty seconds of someone else's phone and it is the difference between plugging in and negotiating | ☐ |
| P3 | A USB **data** cable, tested. ⚠️ A charge-only cable is indistinguishable from a broken one until `adb devices` is empty | ☐ |
| P4 | The APK copied somewhere you can reach without this repo | ☐ |
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
| A2 | ⚠️⚠️ **`R10` — does money render?** Find any price | `$1,234.50` — correct separator, two centavos. **Anything else, capture the log** | ☐ |
| A3 | **C12.1** — four words under the icons | *Inicio, Vender, Comprar, Desperdicio*, drawn and legible | ☐ |
| A4 | **C3.18** — the numbers, on a screen that is not an iPhone 15 | Big enough, at arm's length. ⚠️ **Write the answer down here, on the night** | ☐ |
| A5 | **Google sign-in**, end to end | The browser opens **and comes back**. ⚠️ The deep link is the risk | ☐ |
| A6 | **C1.3** — kill and reopen | It restores the last screen | ☐ |

### ⚠️ A2 is the one this evening exists for

`R10` — *"`Intl` is an allow-list of what has been measured on a phone"* — was written
from a crash on **iOS Hermes**, on 2026-09-13. Every measurement behind it was taken on
one runtime. **Android Hermes backs ECMA-402 differently**, and `format()` working on an
iPhone is not evidence about an Oppo.

If A2 is wrong, the fix is not on this phone. **Capture it, and the rule gets its second
runtime's worth of evidence** — which is the whole reason C1.1 widened register #13 from
an emulator smoke test to real hardware.

---

## Afterwards

- ⚠️ **Write the opinions down before you hand the phone back**, not tomorrow.
- Uninstall: `adb uninstall mx.bserafin.wera`. It is not your phone.
- ⚠️ **Offer to turn USB debugging back off.** It was on for you, not for them.
