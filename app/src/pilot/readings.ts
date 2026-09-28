// ============================================================================
// WHAT THE PILOT MEASURES, AND WHAT A NUMBER MEANS AGAINST ITS BUDGET.
// Plan task `5P-a`; ADR-035 §5.
//
// ⚠️ NO SCREEN, NO STORAGE, NO NETWORK. Everything here has a right answer
// `app/test/pilot-readings.test.ts` can read: the five kinds `0043` accepts,
// the four budgets §5 writes down, the one percentile rule, the state machine
// that turns finger-downs into *taps per transaction* and *abandonment*, and
// the summary the owner's panel draws. `@/pilot/recorder` does the effects and
// decides none of this.
//
// ⚠️⚠️ THE FLAG IS A BUILD, NOT A MODE. §5 says a *dev-build overlay*, and the
// phones the pilot runs on carry RELEASE builds — `__DEV__` is false on every
// one of them, so an overlay keyed on it would be absent from exactly the
// phones it exists for. `EXPO_PUBLIC_PILOT` is inlined when the bundle is made:
// set, and this build measures and names itself by its value; unset, and not
// one reading is taken. A store build is made without it.
// ============================================================================

/** The five kinds `0043`'s `pilot_reading_kind_known` accepts. */
export const KINDS = ['commit_ms', 'round_trip_ms', 'open_ms', 'taps', 'abandoned'] as const;
export type Kind = (typeof KINDS)[number];

/** The three capture screens — `pilot_reading_screen_known`, and the only screens measured. */
export const SCREENS = ['vender', 'comprar', 'desperdicio'] as const;
export type Screen = (typeof SCREENS)[number];

/**
 * §5's numbers, written once. ⚠️ `taps` is a MEDIAN ceiling and the three
 * times are p95 ceilings — §5's own table and its rule 2 say which.
 */
export const BUDGETS = {
  commit_ms: { at: 95, ceiling: 300 },
  round_trip_ms: { at: 95, ceiling: 1000 },
  open_ms: { at: 95, ceiling: 2000 },
  taps: { at: 50, ceiling: 5 },
} as const satisfies Readonly<Record<Exclude<Kind, 'abandoned'>, { at: number; ceiling: number }>>;

export type Budgeted = keyof typeof BUDGETS;

/** A value above this is a clock that jumped, not a reading. `0043`'s own ceiling is a day. */
export const LONGEST_SANE_MS = 60_000;

/** One reading as the phone holds it before it is sent. */
export interface Reading {
  readonly id: string;
  readonly workspaceId: string;
  readonly locationId: string | null;
  readonly kind: Kind;
  readonly screen: Screen;
  readonly value: number;
  readonly occurredAt: string;
}

/**
 * The build label, or `null` when this build takes no readings.
 *
 * ⚠️ ONLY A NON-BLANK VALUE TURNS IT ON. `EXPO_PUBLIC_PILOT=` in a `.env` file
 * is a person switching it off, and `0043` refuses a blank `build` besides.
 */
export function pilotBuildOf(raw: string | undefined): string | null {
  const label = (raw ?? '').trim();
  return label === '' ? null : label;
}

/**
 * A duration as a reading's value, or `null` when it is not one.
 *
 * Rounded once, to the millisecond, because `0043` stores an integer. A negative
 * or absurd span is a clock that moved under us and is dropped rather than
 * clamped: a clamped number is a false reading, and a missing one is only a
 * smaller sample.
 */
export function msOf(from: number, to: number): number | null {
  const span = to - from;
  if (!Number.isFinite(span) || span < 0 || span > LONGEST_SANE_MS) return null;
  return Math.round(span);
}

// ----------------------------------------------------------------------------
// A visit to a capture screen — taps per transaction, and abandonment
// ----------------------------------------------------------------------------

/**
 * One stay on a capture screen, from focus to blur.
 *
 * `taps` counts finger-downs on the screen — its catalog, its search, its
 * basket and its slide — since the visit opened or the last commit, whichever
 * is later. ⚠️ The tab bar is NOT on the screen, so the tap that arrived here
 * and the tap that leaves are not counted: they are navigation, not the
 * transaction.
 */
export interface Visit {
  readonly screen: Screen;
  readonly taps: number;
  readonly commits: number;
}

/** What a step of the visit produces: at most one reading's kind and value. */
export type Emitted = { readonly kind: 'taps' | 'abandoned'; readonly value: number } | null;

export function openVisit(screen: Screen): Visit {
  return { screen, taps: 0, commits: 0 };
}

export function tapped(visit: Visit): Visit {
  return { ...visit, taps: visit.taps + 1 };
}

/**
 * A transaction committed: its taps become a reading and the count starts again.
 *
 * ⚠️ THE SLIDE IS ONE OF THE TAPS. It is a finger on the glass like any other,
 * and §5's ceiling of five is about how much a person has to DO — so a sale of
 * one product is two (the product, the slide), not one.
 */
export function committed(visit: Visit): { visit: Visit; emit: Emitted } {
  return {
    visit: { ...visit, taps: 0, commits: visit.commits + 1 },
    emit: { kind: 'taps', value: visit.taps },
  };
}

/**
 * The screen was left. §5's *abandonment — capture screens opened with no commit
 * following*.
 *
 * ⚠️ TWO SHAPES, AND THE VALUE TELLS THEM APART. A visit with no commit at all is
 * abandoned whatever it did — with `0` taps it was somebody passing through,
 * above `0` somebody who started and gave up. A visit that DID commit is
 * abandoned only if taps followed the last commit: a second transaction begun
 * and left. A commit followed by nothing is a finished visit and says nothing.
 */
export function left(visit: Visit): Emitted {
  if (visit.commits === 0) return { kind: 'abandoned', value: visit.taps };
  if (visit.taps > 0) return { kind: 'abandoned', value: visit.taps };
  return null;
}

// ----------------------------------------------------------------------------
// The summary the owner reads
// ----------------------------------------------------------------------------

/** A percentile's whole: `at` is out of this. */
const WHOLE = 100;

/**
 * The nearest-rank percentile: the smallest value at least `at`% of the sample
 * is at or below. ⚠️ NO INTERPOLATION — every answer is a reading somebody
 * actually took, which is what a person holding the phone can check against a
 * stopwatch. `null` for an empty sample.
 */
export function percentile(values: readonly number[], at: number): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  // ⚠️ `WHOLE` AND NOT A LITERAL 100: `R5`'s gate reads a division by 100 as a
  // peso turned into a float, and this is a rank, not money.
  const rank = Math.max(1, Math.ceil((at * sorted.length) / WHOLE));
  return sorted[rank - 1];
}

export type Verdict = 'within' | 'over' | 'none';

export interface Measure {
  readonly kind: Budgeted;
  readonly n: number;
  readonly value: number | null;
  readonly ceiling: number;
  readonly verdict: Verdict;
}

export interface Abandonment {
  /** Visits where somebody started and left — the silent non-use §5 names. */
  readonly gaveUp: number;
  /** Visits with no touch at all — somebody passing through. */
  readonly passedThrough: number;
  /** Transactions committed. */
  readonly committed: number;
  /** `gaveUp` over `gaveUp + committed`, in tenths of a percent; `null` with neither. */
  readonly rateTenths: number | null;
}

export interface ScreenSummary {
  readonly screen: Screen;
  readonly measures: readonly Measure[];
  readonly abandonment: Abandonment;
}

/** The fields of a stored reading the summary reads. */
export interface Row {
  readonly kind: string;
  readonly screen: string;
  readonly value: number;
}

const MEASURED: readonly Budgeted[] = ['commit_ms', 'round_trip_ms', 'open_ms', 'taps'];

/**
 * One screen's measures against §5 and its abandonment.
 *
 * ⚠️ A MEASURE WITH NO READINGS IS `none`, NEVER `within`. An empty sample
 * meets every budget, and a panel that drew it green would be the vacuous pass
 * this repository refuses everywhere else.
 */
export function summaryOf(rows: readonly Row[], screen: Screen): ScreenSummary {
  const mine = rows.filter((row) => row.screen === screen);
  const measures = MEASURED.map((kind): Measure => {
    const values = mine.filter((row) => row.kind === kind).map((row) => row.value);
    const { at, ceiling } = BUDGETS[kind];
    const value = percentile(values, at);
    return {
      kind,
      n: values.length,
      value,
      ceiling,
      verdict: value === null ? 'none' : value <= ceiling ? 'within' : 'over',
    };
  });
  const abandoned = mine.filter((row) => row.kind === 'abandoned');
  const gaveUp = abandoned.filter((row) => row.value > 0).length;
  const passedThrough = abandoned.length - gaveUp;
  const done = mine.filter((row) => row.kind === 'taps').length;
  const whole = gaveUp + done;
  return {
    screen,
    measures,
    abandonment: {
      gaveUp,
      passedThrough,
      committed: done,
      rateTenths: whole === 0 ? null : Math.round((gaveUp * 1000) / whole),
    },
  };
}

/** Tenths of a percent as the panel writes them: `125` → `12.5`, `0` → `0`. */
export function tenthsText(tenths: number): string {
  const whole = Math.trunc(tenths / 10);
  const rest = Math.abs(tenths % 10);
  return rest === 0 ? String(whole) : `${whole}.${rest}`;
}
