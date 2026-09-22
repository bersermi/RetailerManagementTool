// ============================================================================
// WHAT IS ON SCREEN WHEN THE LINK COMES AND GOES. Plan task 5c-iv-a.
//
// ⚠️⚠️ IT DRAWS NOTHING AND IT DECIDES EVERYTHING. §2.11 keeps rendering,
// navigation and layout out of scope, so no suite in this repository can look
// at the two components beside this file — which is precisely why every RULE
// they obey is in here, as a function of `(state, event, now)`, where
// `app/test/offline-notice.test.ts` can read it. What is left in the `.tsx`
// files is a `View`, a `Text` and an opacity.
//
// ⚠️ IT READS THE SIGNAL AND NEVER THE LIBRARY. The `Online` it is handed comes
// from `@/lib/connectivityMonitor`'s `subscribe()`, which is the app's one
// answer to *"am I online?"* — `5c-ii-b-2` measured what a second one costs on
// iOS. This module holds a type from `@/api/connectivity` and steps nothing.
//
// THE TWO SURFACES, AND THE OWNER'S WORDS ON EACH:
//
//   C10.1 — "a small icon, intermittent, somewhere non-invasive, with *Sin
//   conexión a internet* — surfacing on screen changes and EASILY DISMISSED.
//   It never blocks and never interrupts."
//
//   C10.2 — "on reconnect, ONE FADING TOAST: *Tus últimas operaciones ya se
//   guardaron.* It fades on its own, needs no acknowledgement, and DOES NOT SAY
//   HOW MANY."
//
// ⚠️⚠️ "SURFACING ON SCREEN CHANGES" IS THE HALF THAT IS EASY TO GET WRONG, AND
// GETTING IT WRONG IS SILENT. A dismissal that lasted the session would be
// kinder for ten seconds and wrong for the rest of the day: a shop that brushed
// the notice away at 9am would not be told it was offline at 4pm, and the one
// thing the notice exists to prevent is a shopkeeper who does not know. So a
// dismissal is keyed to the SCREEN it was made on and dies with it.
//
// ⚠️ AND A TOAST IS NEVER SHOWN AT LAUNCH. `UNKNOWN → true` is the first
// reading of a session, not a reconnect a person lived through; toasting there
// would say *"your last operations are saved"* to somebody who never saw them
// at risk, on every single launch. Only `false → true` is a reconnect.
// ============================================================================

import type { Online } from '@/api/connectivity';

/**
 * How long the reconnect toast stays up, fade included.
 *
 * ⚠️ IT NEEDS NO ACKNOWLEDGEMENT, so this number is the whole of its lifetime —
 * there is no dismiss, no button and no undo. Four seconds is long enough to
 * read eight words at arm's length in a bright shop and short enough that it is
 * gone before it is in the way.
 */
export const TOAST_MS = 4_000;

/**
 * The fade at the end of it.
 *
 * ⚠️⚠️ IT IS AN `opacity` FADE AND IT MUST STAY ONE. §2.11's motion rule is a
 * PERFORMANCE constraint before it is a taste one: `transform` and `opacity`
 * run on the compositor, and C1.1 puts two low-end Androids among the pilot's
 * four phones. A toast that "fades" by animating a background colour, a shadow
 * or a height does its work on the JS thread, on the phones least able to
 * afford it.
 */
export const TOAST_FADE_MS = 400;

/** Everything the two surfaces are decided from. */
export interface Surfaces {
  /** The app's one answer to "am I online?". ⚠️ `null` is UNKNOWN, not offline. */
  readonly online: Online;
  /** Where we are. The dismissal is keyed to this and to nothing else. */
  readonly screen: string;
  /** The screen a dismissal was made on, or `null` for none outstanding. */
  readonly dismissedOn: string | null;
  /** When the reconnect toast stops being shown, or `null` for no toast. */
  readonly toastUntil: number | null;
}

/** Before anything has been read or navigated to. */
export const NOTHING_YET: Surfaces = {
  online: null,
  screen: '',
  dismissedOn: null,
  toastUntil: null,
};

export type Seen =
  /** The signal changed. ⚠️ From `subscribe()`, never from a library. */
  | { readonly kind: 'link'; readonly online: Online }
  /** The person navigated. `at` is the route, and it re-arms the notice. */
  | { readonly kind: 'screen'; readonly at: string }
  /** The person brushed the notice away. */
  | { readonly kind: 'dismiss' };

/**
 * One event, one new state.
 *
 * ⚠️ TOTAL AND NEVER THROWS, for the reason `@/api/connectivity` gives: this
 * runs on a phone with no console attached to it, and a throw here would take
 * out the only thing telling a shopkeeper she is offline.
 */
export function surfaces(state: Surfaces, seen: Seen, now: number): Surfaces {
  switch (seen.kind) {
    case 'link': {
      if (seen.online === state.online) return state;

      if (seen.online === true) {
        // ⚠️⚠️ A RECONNECT IS `false → true` AND NOTHING ELSE. `null → true` is
        // a launch: nobody watched anything go offline, so there is nothing to
        // reassure them about.
        const reconnected = state.online === false;
        return {
          ...state,
          online: true,
          // ⚠️ THE DISMISSAL DIES WITH THE OUTAGE IT ANSWERED. Carrying it into
          // the next one would silence the notice on the screen a shopkeeper
          // happens to be standing on, which is the screen she is working on.
          dismissedOn: null,
          toastUntil: reconnected ? now + TOAST_MS : state.toastUntil,
        };
      }

      // Offline, or back to not knowing.
      return {
        ...state,
        online: seen.online,
        // ⚠️ AN OUTAGE CANCELS A TOAST IN FLIGHT, because the toast says the
        // last operations are saved and the next one will not be.
        toastUntil: null,
      };
    }

    case 'screen': {
      if (seen.at === state.screen) return state;
      // ⚠️ THIS IS C10.1's "surfacing on screen changes" AND IT IS THE WHOLE
      // RULE. A dismissal is worth one screen. See the header for what a
      // session-long one would cost.
      return { ...state, screen: seen.at, dismissedOn: null };
    }

    case 'dismiss':
      return { ...state, dismissedOn: state.screen };
  }
}

/**
 * Is the quiet offline notice on screen?
 *
 * ⚠️ `null` SHOWS NOTHING. An app that has not yet read the network is not an
 * app that knows it is offline, and the first thing a launch would otherwise do
 * is accuse the shop's wifi.
 */
export function showsNotice(state: Surfaces): boolean {
  return state.online === false && state.dismissedOn !== state.screen;
}

/** Is the reconnect toast on screen? */
export function showsToast(state: Surfaces, now: number): boolean {
  return state.toastUntil !== null && now < state.toastUntil;
}

/**
 * When the toast's own opacity fade should begin, or `null` if none is up.
 *
 * ⚠️ IT IS DERIVED RATHER THAN STORED, so the fade cannot drift out of step
 * with the lifetime — the defect this repository has recorded ten times, in its
 * smallest possible form.
 */
export function fadeBeginsAt(state: Surfaces): number | null {
  return state.toastUntil === null ? null : state.toastUntil - TOAST_FADE_MS;
}
