// ============================================================================
// WHEN A CODE STOPS WORKING, AS A SHOPKEEPER READS IT. Plan task 5b-ii-b-1, and
// the second thing this app renders that has a right answer and a wrong one —
// `mxn.ts` was the first, and this file is beside it for that reason.
//
// ⚠️ IT RENDERS. IT DOES NOT COMPUTE A DEADLINE. `0028` sets `expires_at` to
// `now() + interval '7 days'` and RETURNS it, so what appears on screen is the
// timestamp the database chose. Computing "seven days from now" on the phone
// would be a second opinion about a value the server already holds, and the two
// disagree the moment a clock does.
//
// ⚠️⚠️ AND IT DOES NOT TOUCH `Intl.DateTimeFormat`, WHICH IS NOT CAUTION — IT IS
// THIS APP'S OWN SCAR. `mxn.ts`'s header records it at length: the first
// spelling of the money formatter used `Intl.NumberFormat.formatToParts`, all
// twenty-six of its assertions were green under node, and it CRASHED THE APP ON
// LAUNCH on the owner's iPhone 15 — `TypeError: undefined is not a function`,
// an uncaught exception that terminates the process. Hermes ships a partial
// ICU. `Intl.DateTimeFormat` is in the same family, a node suite would tell us
// exactly as little about it, and the way to find out is a device rather than an
// argument.
//
// ⚠️ SO THE MONTH NAMES ARE A TABLE IN `@/strings`, WHICH `R4` WOULD REQUIRE
// ANYWAY — every Spanish literal a person reads lives there. That costs this
// file the property `mxn.ts` fought for, where C12.2's separators stay a
// MEASUREMENT of ICU rather than an assertion; nothing about a date is fixed by
// a C-constraint, so there is no equivalent claim to keep honest. What is left
// is arithmetic on a `Date`, which Hermes has.
//
// ⚠️ THE DEVICE'S OWN TIMEZONE, DELIBERATELY. `expires_at` is `timestamptz`; the
// person reading it is holding the phone in the shop, and "the 25th" means her
// 25th. This is NOT `4d-i`'s ruling about product expiry resolving in the
// store's local day — that one governs what the LEDGER stores and had to be
// pinned to a store, and this governs a sentence on a screen.
// ============================================================================

import { ES } from '@/strings';

/**
 * A day a shopkeeper can act on — `25 de septiembre`.
 *
 * ⚠️ NO YEAR, AND THAT IS A CHOICE ABOUT THIS VALUE RATHER THAN ABOUT DATES. An
 * invite lives seven days (`0028`), so the year is noise on every day of its
 * life except the few where it would be the only thing that disambiguates — and
 * on those the month has changed too. A year on screen is a word that is wrong
 * to read aloud fifty-one weeks out of fifty-two.
 *
 * ⚠️ NO TIME EITHER. The expiry has one, to the second, and saying it would
 * invite a shopkeeper to cut it fine on a value she cannot act on precisely —
 * she is not going to hand over a code at 14:32. The date is the actionable
 * half, and it ROUNDS THE WRONG WAY ON PURPOSE: the code dies partway through
 * the day named, never after it, so a person who treats the date as a deadline
 * is early rather than late.
 *
 * ⚠️ `null` FOR ANYTHING IT CANNOT READ, never a rendered `NaN`. The caller
 * omits the line. A screen that says *"expira el NaN de undefined"* is worse
 * than a screen that says nothing about expiry, because the first one is the app
 * visibly broken in front of the one person who cannot tell whether the rest of
 * it worked.
 */
export function formatExpiry(iso: string | null | undefined): string | null {
  if (typeof iso !== 'string' || iso.trim() === '') return null;

  const at = new Date(iso);
  const time = at.getTime();
  // ⚠️ `Number.isNaN` AND NOT `isNaN`: the global coerces, so `isNaN(undefined)`
  // is true for the wrong reason and a future edit passing something odd would
  // get the right answer by accident.
  if (Number.isNaN(time)) return null;

  const month = ES.dates.months[at.getMonth()];
  if (month === undefined) return null;

  return ES.dates.dayOfMonth(at.getDate(), month);
}

/**
 * How long somebody has been waiting, as an approver reads it — `Pidió hoy`,
 * `Pidió ayer`, `Pidió hace 3 días`. Plan task `5b-iii-d-1`.
 *
 * ⚠️⚠️ IT RENDERS ELAPSED WHOLE DAYS, NOT HOURS, AND IT IS THE DEVICE'S OWN
 * CLOCK. That is a weaker instrument than `formatExpiry` above, which renders a
 * timestamp the DATABASE chose and computes nothing — and the difference is
 * named here rather than left to be discovered. "How long has she been waiting"
 * has no server-side answer to render: `0037` returns `requested_at` and not an
 * age, because an age computed at `select` time is stale by the time it is
 * drawn. So this subtracts, and the subtraction uses the phone's clock.
 *
 * ⚠️ WHICH IS SAFE HERE FOR A REASON IT IS NOT SAFE ELSEWHERE. `0027` refuses a
 * client-side deadline, and this is not one: nothing is decided by this string.
 * An approver reads it to tell "she asked while I was serving somebody" from
 * "she asked last week and I forgot" — and a phone whose clock is a day out
 * makes that sentence a day wrong, never makes an approval fail. The row itself
 * is `0037`'s to include or drop, on the server's clock, and an expired one is
 * simply absent.
 *
 * ⚠️ WHOLE DAYS AND NOT HOURS, because `hace 14 horas` invites an approver to
 * treat it as precise and there is nothing precise to treat. The granularity is
 * the one she acts on: today, yesterday, or a number of days she is overdue by.
 *
 * ⚠️ THE DAYS ARE CALENDAR DAYS IN THE DEVICE'S TIMEZONE, not 24-hour blocks —
 * `formatExpiry`'s rule, and for its reason. A request made at 23:50 last night
 * is *ayer* at 00:10 this morning, which is what a person standing in the shop
 * means by yesterday. A 24-hour block would call it *hoy* for another day.
 *
 * ⚠️ A CLOCK BEHIND THE SERVER'S READS AS `hoy` RATHER THAN AS A NEGATIVE
 * NUMBER. It is the same absorption `formatExpiry` makes for an unparseable
 * value: we do the bookkeeping, and `Pidió hace -1 días` is the app visibly
 * broken in front of the one person who cannot tell whether the rest of it
 * worked.
 *
 * ⚠️ `null` FOR ANYTHING IT CANNOT READ, and the caller omits the line — the
 * rule `formatExpiry` set. An entry with no waiting line is still an entry with
 * an address on it, which is the half the approver acts on.
 *
 * ⚠️ `now` IS AN ARGUMENT SO THE SUITE CAN HOLD IT STILL. A function that read
 * `Date.now()` itself would be one whose assertions change meaning at midnight,
 * which is `mxn.ts`'s recorded standard for anything with a right answer.
 */
export function formatWaiting(iso: string | null | undefined, now: Date = new Date()): string | null {
  if (typeof iso !== 'string' || iso.trim() === '') return null;

  const at = new Date(iso);
  if (Number.isNaN(at.getTime()) || Number.isNaN(now.getTime())) return null;

  // Midnight-to-midnight in the device's own timezone, so the difference counts
  // calendar days and never fractions of one.
  const then = new Date(at.getFullYear(), at.getMonth(), at.getDate()).getTime();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const days = Math.round((today - then) / 86400000);

  if (days <= 0) return ES.dates.waiting.today;
  if (days === 1) return ES.dates.waiting.yesterday;
  return ES.dates.waiting.daysAgo(days);
}

/**
 * A LEDGER DAY, SPLIT INTO THE THREE PIECES A TABLE HEADING PUTS ON THREE
 * LINES — `24`, `septiembre`, `2026`. Plan task `5g-iii-a`.
 *
 * ⚠️⚠️ IT TAKES A `YYYY-MM-DD` STRING AND NEVER TOUCHES `Date`, AND THAT IS THE
 * WHOLE REASON IT IS A SECOND FUNCTION RATHER THAN A FLAG ON `formatExpiry`.
 * `CostPoint.day` is `occurred_at.slice(0, 10)` — a label Postgres already chose,
 * in UTC, for a row the database already assigned to a day. Handing it to
 * `new Date(…)` reinterprets it: `new Date('2026-09-24').getDate()` is **23** on
 * this project's Mac (UTC−6) and **24** on `ubuntu-latest` (UTC), **measured, not
 * argued** — so a `Date` here would print a column heading that disagrees with
 * the ledger, for a reader holding a PDF who can check neither.
 * ⚠️ `formatExpiry` above wants the opposite and says so: it renders a
 * `timestamptz` for the person holding the phone, so the DEVICE's timezone is
 * right there and wrong here. **Two values, two rules, one file.**
 *
 * ⚠️ IT IS ALSO WHY THIS IS TZ-INDEPENDENT BY CONSTRUCTION RATHER THAN BY A
 * PINNED `TZ`. A suite that fixed `process.env.TZ` would prove the assertion and
 * not the code — the shape [[local-time-tests-need-a-pinned-tz]] records, met by
 * removing the dependency instead of by pinning the machine.
 *
 * ⚠️ THE MONTH NAME IS `ES.dates.months`, WHICH ALREADY EXISTED. `R4` would
 * require it anyway, and the point worth writing down is that this needed no new
 * Spanish word at all: the app has one answer to *what is this month called* and
 * a second table of abbreviations would have been a second one.
 *
 * ⚠️ THE DAY IS NOT ZERO-PADDED — `formatExpiry`'s rule, for its reason: nobody
 * writes *el 05 de mayo*. The YEAR is returned as the four characters the ledger
 * sent, untouched.
 *
 * ⚠️ `null` FOR ANYTHING IT CANNOT READ, and the caller falls back to the raw
 * label rather than to a rendered `NaN` — `formatExpiry`'s rule again.
 */
export interface LedgerDay {
  /** The day of the month, unpadded, as a string ready to print. */
  readonly day: string;
  /** The month's own name, from `ES.dates.months`. */
  readonly month: string;
  /** Four characters, verbatim from the ledger's label. */
  readonly year: string;
}

export function formatLedgerDay(day: string | null | undefined): LedgerDay | null {
  if (typeof day !== 'string') return null;
  // ⚠️ THE SHAPE IS CHECKED BEFORE ANY SLICE IS TRUSTED. `'2026-9-4'` slices
  // into pieces that all look plausible and name the wrong month.
  if (!/^\d{4}-\d{2}-\d{2}/.test(day)) return null;

  const year = day.slice(0, 4);
  const month = Number(day.slice(5, 7));
  const numeral = Number(day.slice(8, 10));

  const name = ES.dates.months[month - 1];
  if (name === undefined) return null;
  // ⚠️ A ZERO MONTH INDEXES `months[-1]`, which is `undefined` and caught above;
  // a zero DAY indexes nothing, so it is refused here on its own.
  if (numeral < 1 || numeral > 31) return null;

  return { day: String(numeral), month: name, year };
}
