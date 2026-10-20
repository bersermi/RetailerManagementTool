// ============================================================================
// WHAT IS ON SCREEN WHEN THE LINK COMES AND GOES — the whole instrument for
// plan task 5c-iv-a.
//
// ⚠️⚠️ §2.11 KEEPS RENDERING, NAVIGATION AND LAYOUT OUT OF SCOPE, SO THIS SUITE
// CAN SEE EVERY RULE AND NOT ONE PIXEL. That is not a gap being apologised for:
// it is why `@/offline/notice` exists as a pure function at all, and why the
// `.tsx` beside it holds a `View`, a `Text` and an opacity and no judgement.
// The rules below are the ones that are silent when they go wrong — a dismissal
// that outlives its screen, a toast at launch, a toast that survives the outage
// it was lying about.
//
// ⚠️ THE REST IS `R9`: whether it is small, quiet and out of the way is the
// owner's phone, and nothing here pretends otherwise.
// ============================================================================

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
  NOTHING_YET,
  TOAST_FADE_MS,
  TOAST_MS,
  fadeBeginsAt,
  showsNotice,
  showsToast,
  surfaces,
  type Seen,
  type Surfaces,
} from '@/offline/notice';

/** Drive a list of events through the machine. */
function run(from: Surfaces, events: ReadonlyArray<readonly [Seen, number]>): Surfaces {
  return events.reduce((state, [seen, at]) => surfaces(state, seen, at), from);
}

const link = (online: boolean | null, at: number): readonly [Seen, number] => [
  { kind: 'link', online },
  at,
];
const drain = (
  stop: 'drained' | 'failed' | 'busy',
  landed: number,
  at: number,
): readonly [Seen, number] => [{ kind: 'drain', stop, landed }, at];
const screen = (at: string, when: number): readonly [Seen, number] => [
  { kind: 'screen', at: when === 0 ? at : at },
  when,
];

/** Signed in, on a screen, with a working link. */
const settled = run(NOTHING_YET, [screen('/vender', 0), link(true, 0)]);

describe('the quiet notice — C10.1', () => {
  it('shows nothing before anything has read the network', () => {
    // ⚠️ `null` IS NOT `false`. The first thing a launch would otherwise do is
    // accuse the shop's wifi.
    expect(NOTHING_YET.online).toBeNull();
    expect(showsNotice(NOTHING_YET)).toBe(false);
  });

  it('shows once the signal says offline', () => {
    expect(showsNotice(run(settled, [link(false, 1_000)]))).toBe(true);
  });

  it('is brushed away by a tap', () => {
    const off = run(settled, [link(false, 1_000)]);
    expect(showsNotice(surfaces(off, { kind: 'dismiss' }, 2_000))).toBe(false);
  });

  it('comes back on the next screen, which is C10.1 in five words', () => {
    // ⚠️⚠️ THE RULE THAT IS SILENT WHEN IT IS WRONG. A dismissal that lasted the
    // session would be kinder for ten seconds and wrong for the rest of the
    // day: a shop that brushed it away at 9am would not be told at 4pm.
    const dismissed = run(settled, [link(false, 1_000), [{ kind: 'dismiss' }, 2_000]]);
    expect(showsNotice(dismissed)).toBe(false);
    expect(showsNotice(run(dismissed, [screen('/comprar', 3_000)]))).toBe(true);
  });

  it('is not re-armed by re-rendering on the screen it was dismissed on', () => {
    // A `screen` event carrying the route we are already on is a re-render, not
    // a navigation. Treating it as one would make the dismissal last no time.
    const dismissed = run(settled, [link(false, 1_000), [{ kind: 'dismiss' }, 2_000]]);
    expect(showsNotice(run(dismissed, [screen('/vender', 3_000)]))).toBe(false);
  });

  it('does not carry a dismissal into the NEXT outage', () => {
    // ⚠️ The dismissal answered one outage. Carrying it forward silences the
    // notice on the screen she is standing on, which is the one she works on.
    const back = run(settled, [
      link(false, 1_000),
      [{ kind: 'dismiss' }, 2_000],
      link(true, 3_000),
      link(false, 4_000),
    ]);
    expect(showsNotice(back)).toBe(true);
  });

  it('goes away when the link comes back', () => {
    expect(showsNotice(run(settled, [link(false, 1_000), link(true, 2_000)]))).toBe(false);
  });
});

describe('the fading toast — C10.2', () => {
  it('fires when the queue has landed after a reconnect, and lasts exactly its own lifetime', () => {
    const back = run(settled, [link(false, 1_000), link(true, 5_000), drain('drained', 2, 5_300)]);
    expect(showsToast(back, 5_300)).toBe(true);
    expect(showsToast(back, 5_300 + TOAST_MS - 1)).toBe(true);
    expect(showsToast(back, 5_300 + TOAST_MS)).toBe(false);
  });

  it('does NOT fire on the reconnect itself — the operations are still on the phone', () => {
    // ⚠️⚠️ THE DEFECT OF 2026-10-20: it said *ya se guardaron* before the drain
    // had started, for up to 90 s if the auth layer was refusing from cache.
    const back = run(settled, [link(false, 1_000), link(true, 5_000)]);
    expect(showsToast(back, 5_000)).toBe(false);
    expect(back.awaiting).toBe(true);
  });

  it('stays silent after an outage in which nothing was written', () => {
    const back = run(settled, [link(false, 1_000), link(true, 5_000), drain('drained', 0, 5_300)]);
    expect(showsToast(back, 5_300)).toBe(false);
    expect(back.awaiting).toBe(false);
  });

  it('waits through a refused drain and fires on the one that empties the queue', () => {
    const refused = run(settled, [link(false, 1_000), link(true, 5_000), drain('failed', 0, 5_300)]);
    expect(showsToast(refused, 5_300)).toBe(false);
    const landed = run(refused, [drain('drained', 3, 95_000)]);
    expect(showsToast(landed, 95_000)).toBe(true);
  });

  it('counts what landed before the queue stopped, so a partial drain still earns the toast', () => {
    const back = run(settled, [
      link(false, 1_000),
      link(true, 5_000),
      drain('failed', 2, 5_300),
      drain('drained', 0, 25_000),
    ]);
    expect(showsToast(back, 25_000)).toBe(true);
  });

  it('never fires for a drain with no outage behind it — an ordinary online sale', () => {
    expect(showsToast(run(settled, [drain('drained', 1, 9_000)]), 9_000)).toBe(false);
  });

  it('does NOT fire at launch, and that is the whole of `null` being a state', () => {
    // ⚠️⚠️ `UNKNOWN → true` is the first reading of a session, not a reconnect
    // somebody lived through. Toasting there says "your last operations are
    // saved" to a person who never saw them at risk — on every single launch.
    const launched = run(NOTHING_YET, [screen('/inicio', 0), link(true, 0), drain('drained', 4, 50)]);
    expect(showsToast(launched, 50)).toBe(false);
    expect(launched.toastUntil).toBeNull();
  });

  it('does not fire on a repeated `true`', () => {
    expect(showsToast(run(settled, [link(true, 9_000)]), 9_000)).toBe(false);
  });

  it('is cancelled by an outage that arrives while it is up', () => {
    // ⚠️ The toast says the last operations are saved. The next one will not be.
    const lying = run(settled, [
      link(false, 1_000),
      link(true, 5_000),
      drain('drained', 1, 5_200),
      link(false, 5_500),
    ]);
    expect(showsToast(lying, 5_600)).toBe(false);
  });

  it('restarts rather than inheriting a half-spent one', () => {
    const twice = run(settled, [
      link(false, 1_000),
      link(true, 5_000),
      drain('drained', 1, 5_200),
      link(false, 6_000),
      link(true, 7_000),
      drain('drained', 1, 7_200),
    ]);
    expect(twice.toastUntil).toBe(7_200 + TOAST_MS);
  });

  it('derives its fade from its deadline rather than storing a second copy', () => {
    const back = run(settled, [link(false, 1_000), link(true, 5_000), drain('drained', 1, 5_200)]);
    expect(fadeBeginsAt(back)).toBe(back.toastUntil! - TOAST_FADE_MS);
    expect(fadeBeginsAt(settled)).toBeNull();
  });

  it('leaves room to read it: the fade is a fraction of the lifetime', () => {
    // Two fades (in and out) must fit inside the lifetime with time left over,
    // or the toast is never fully legible.
    expect(TOAST_FADE_MS * 2).toBeLessThan(TOAST_MS / 2);
  });
});

describe('the two never contradict each other', () => {
  it('never shows a notice and a toast at the same instant', () => {
    // ⚠️ One says "you are offline" and the other says "you are not, and your
    // work is saved". Both at once is the app arguing with itself in a corner
    // of a screen nobody can test.
    const moments: ReadonlyArray<readonly [Surfaces, number]> = [
      [settled, 0],
      [run(settled, [link(false, 1_000)]), 1_000],
      [run(settled, [link(false, 1_000), link(true, 5_000), drain('drained', 1, 5_200)]), 5_200],
      [
        run(settled, [link(false, 1_000), link(true, 5_000), drain('drained', 1, 5_200), link(false, 5_500)]),
        5_600,
      ],
      [run(settled, [link(false, 1_000), drain('drained', 1, 1_500)]), 1_500],
      [NOTHING_YET, 0],
    ];
    for (const [state, now] of moments) {
      expect(showsNotice(state) && showsToast(state, now)).toBe(false);
    }
  });
});

describe('the monitor keeps its readers for the whole life of the app', () => {
  // ⚠️⚠️ MEASURED FROM THE CODE 2026-10-20: `Drain` restarts the monitor on
  // every session change — a token refresh, hourly — and its stop used to clear
  // every watcher. Each reader subscribes once, at mount, so the notice, the
  // toast and the data library's `onlineManager` went deaf after the first hour.
  const monitor = readFileSync(
    fileURLToPath(new URL('../src/lib/connectivityMonitor.ts', import.meta.url)),
    'utf8',
  )
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');

  it('reads a real file', () => {
    expect(monitor).toMatch(/export function start\(\)/);
  });

  it('never clears its watchers on a stop', () => {
    expect(monitor).not.toMatch(/watchers\.clear\(\)/);
    expect(monitor).not.toMatch(/drainWatchers\.clear\(\)/);
  });

  it('tells the drain watchers how every drain ended, while it is running', () => {
    expect(monitor).toMatch(/if \(running\) for \(const watcher of drainWatchers\) watcher\(drained\)/);
  });
});
