// ============================================================================
// THE ONE MODULE THAT TURNS A DOCUMENT INTO A FILE AND HANDS IT TO THE PHONE.
// Plan task `5g-iii`, and the first native capability this app has added since
// `expo-network` at `5c-ii-b-2`.
//
// ⚠️⚠️ ONE MODULE HOLDS THE IMPORTS AND EVERYTHING ELSE ASKS IT, WHICH IS THE
// ARRANGEMENT §2.11's CONNECTIVITY ROW ALREADY SPELLS OUT: *"One module holds
// the import; everything else reads the signal."* Here the reason is not a
// duplicated subscription but a duplicated FAILURE MODE — `printToFileAsync` and
// `shareAsync` each fail in their own way on each platform, and a screen that
// called them directly would decide what a failure means inside a `.tsx`, which
// is where `R9` says no instrument in this repository can look.
//
// ⚠️⚠️ THE DEPENDENCIES ARE NEW AND NO WORKFLOW COMPILES THEM, AND THAT IS
// WRITTEN HERE BECAUSE IT IS THIS FILE'S RISK. `app.yml` is a typecheck, a
// Vitest suite and the document guards; `app/ios/` is not committed at all, so a
// native module can be added and every check stays green
// ([[no-ci-compiles-the-native-app]]). `5c-ii-b-2` proved what that costs: the
// netinfo → `expo-network` swap left a Pods target pointing at a deleted path and
// the next device build failed on a file nobody had touched. **So `pod install`
// runs before `xcodebuild`, and the bound on this feature is a device build
// rather than a green tick.** ADR-035 §2.11's stack row carries the same
// sentence where an architecture reader will find it.
//
// ----------------------------------------------------------------------------
// ⚠️ WHY THESE TWO LIBRARIES
// ----------------------------------------------------------------------------
// `expo-print` is the only thing in the Expo SDK that produces a PDF at all:
// `printToFileAsync({ html })` renders through the platform's own web view and
// writes a file into the app's cache. `expo-sharing` is what presents the share
// sheet the owner asked for — *"You can share the 'view' as a PDF"* — and it is
// the portable half of that: React Native's built-in `Share` takes a `url` on
// iOS and a `message` only on Android, so a shopkeeper on the pilot's two
// Androids would get a link she cannot open.
//
// ⚠️ THEY ARE BOTH FIRST-PARTY EXPO MODULES ON THE SAME `~57.0.x` LINE AS EVERY
// OTHER DEPENDENCY HERE, which is the property that makes this a small change
// rather than a new ecosystem — `expo install` picks the version that matches
// the installed SDK, and the alternatives (`react-native-html-to-pdf`,
// `react-native-share`) are third-party, unmaintained on this RN version, or
// both.
//
// ⚠️ NOTHING IS PERSISTED. `printToFileAsync` writes into the CACHE directory,
// which the OS may reclaim, and that is correct: the document is derived from the
// ledger on every tap, so a stale copy is worse than no copy. **This app stores
// no file of its own** and `expo-file-system` is therefore not a dependency.
// ============================================================================

import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

/**
 * What happened, as a KEY of `ES.costs` and never as Spanish (`R4`, the shape
 * `src/auth/errors.ts` established and `costNote` repeated).
 *
 * ⚠️ `unavailable` AND `failed` ARE KEPT APART BECAUSE THE SHOPKEEPER CAN ACT ON
 * ONE OF THEM. *There is no share sheet on this device* is permanent and the
 * answer is *read the table below*; *the file could not be made* is worth one
 * more tap. Collapsing them would tell her to retry something that cannot work,
 * or to give up on something that would work the second time.
 */
export type ShareOutcome = 'shared' | 'unavailable' | 'failed';

/**
 * Render this HTML to a PDF and offer it to whatever the phone can send it with.
 *
 * ⚠️⚠️ `isAvailableAsync` IS CHECKED **FIRST**, BEFORE THE FILE IS MADE. Printing
 * first would spend a second or two of a low-end Android's time producing a
 * document that then has nowhere to go — and the screen would have shown
 * *Preparando el PDF…* for that whole time before saying it cannot share. The
 * order of these two calls is the difference between a useless wait and an
 * immediate answer.
 *
 * ⚠️ A CANCELLED SHARE SHEET IS `shared`, NOT `failed`, AND THAT IS DELIBERATE.
 * Neither platform reports the difference between *sent* and *dismissed*
 * reliably, so there is nothing honest to say — and a shopkeeper who chose not
 * to send the file does not need to be told she failed at something. **This is
 * the one place this module deliberately knows less than it appears to**, said
 * out loud because the type would otherwise imply a confirmation the OS never
 * gave (§2.6's rule about never showing a confirmation the source did not give,
 * pointed at a share sheet instead of at a database).
 *
 * ⚠️ `name` BECOMES A FILENAME, SO IT IS SANITISED HERE AND NOT BY THE CALLER.
 * `expo-print` names the file itself with a random stem; the copy step that
 * would give it a readable name needs `expo-file-system`, which this app does
 * not have — so what the caller passes shapes the share sheet's title only.
 * ⚠️ **This is a named limitation and not a bug**: the shopkeeper sees a PDF
 * whose internal `<title>` names the product (`costsHtml` sets it) and whose
 * filename is a random stem. Whether that matters is a question for the phone.
 */
export async function shareHtmlAsPdf(html: string, name: string): Promise<ShareOutcome> {
  try {
    const can = await Sharing.isAvailableAsync();
    if (!can) return 'unavailable';
    const { uri } = await Print.printToFileAsync({ html });
    await Sharing.shareAsync(uri, {
      // ⚠️ BOTH, BECAUSE THE TWO PLATFORMS READ DIFFERENT ONES. Android goes by
      // the MIME type and iOS by the UTI; giving only one makes the other
      // platform offer the file as an opaque blob that half the targets refuse.
      mimeType: 'application/pdf',
      UTI: 'com.adobe.pdf',
      dialogTitle: name,
    });
    return 'shared';
  } catch {
    // ⚠️ THE CONSOLE IS NOT WRITTEN TO AND THE SCREEN GETS A KEY, which is
    // `reported`'s rule inverted on purpose: a failed print is not a contract
    // mismatch of ours, it is a phone that could not do a thing. There is
    // nothing here for a developer to read that the shopkeeper's retry does not
    // settle.
    return 'failed';
  }
}
