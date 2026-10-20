// ============================================================================
// A SUPPLIER'S PAGE — WHAT SHE BRINGS AND AT WHAT PRICE. Plan task `8g`, the
// owner's ruling of 2026-10-20 over the canvas (*Proveedores · la propuesta*,
// option A): *"Move on with your proposal for Proveedores. We just need to make
// Editar more accesible. I also want to remove the legends … better for things
// to be intuitive."*
//
// So the page opens on the supplier and not on a form: *Llamar*, *WhatsApp* and
// *Editar* side by side, this month's deliveries, and what she brings with the
// last price and how it moved against the delivery before. The list says, under
// each name, when she last came and what was bought from her this month. No
// sentence explains any of it — his ruling.
//
// ⚠️ EVERY FIGURE IS DECIDED HERE (`R3`) and `app/test/proveedores-ficha.test.ts`
// reads them; `docs/checks/8g-proveedores-contract.sh` puts the one new read —
// a supplier's delivery lines — in front of a real database.
//
// ⚠️ THE PRICE IS THE INVOICE NET, `@/api/costs`' rule and its reason: it is what
// Comprar shows and what she typed, so *La última vez: $38* agrees with the
// delivery she remembers. ⚠️ WHO SEES IT: every member, by RLS — `0040` widened
// purchase headers and lines to every member of the store (his ruling of
// 2026-09-25); nothing here asks who is holding the phone.
// ============================================================================

import { SCALE, parseDecimal } from '@tienda/money';

import { priceCentavos, type UnitFactors } from '@/api/catalog';
import { daysBefore, standing, type PurchaseHead, type ReversalRow } from '@/api/month';
import { ES } from '@/strings';

// ---------------------------------------------------------------- the reads --

/** How far back a supplier's deliveries are read, for the list and her page. */
export const SUPPLIER_DAYS = 120;

/**
 * One delivery line of one supplier, with its document. ⚠️ `purchase!inner` over
 * the COMPOSITE foreign key, `@/api/costs`' embed, so a line whose document is
 * unreadable is no line at all rather than a line with a null document.
 */
export const SUPPLIER_LINE_COLUMNS =
  'id,variant_id,unit_price_net_per_base::text,purchase!inner(id,occurred_at,provider_id,reversal_of)';

/** The table, and the two embedded columns the read filters on. */
export const SUPPLIER_LINE_TABLE = 'purchase_line';
export const SUPPLIER_LINE_PROVIDER = 'purchase.provider_id';
export const SUPPLIER_LINE_TIME = 'purchase.occurred_at';

/**
 * Newest first, by the PARENT's time — the column-expression spelling, which
 * sorts the parent ([[postgrest-embedded-order-has-two-spellings]]) — then the
 * line's own id, so a page boundary between two lines of one delivery is stable.
 */
export const SUPPLIER_LINE_ORDER = 'purchase(occurred_at)';
export const SUPPLIER_LINE_TIEBREAK = 'id';

export function supplierHeadsKey(since: string): readonly unknown[] {
  return ['providers', 'heads', since];
}
export function supplierLinesKey(providerId: string | null, since: string): readonly unknown[] {
  return ['providers', 'lines', providerId ?? '', since];
}

export interface SupplierLine {
  readonly id: string;
  readonly variant_id: string;
  readonly unit_price_net_per_base: string;
  readonly purchase: { readonly id: string; readonly occurred_at: string; readonly provider_id: string | null; readonly reversal_of: string | null } | null;
}

// ----------------------------------------------------------- the list's line --

export interface Activity {
  /** The local day of her last standing delivery in the window, or `null`. */
  readonly lastDay: string | null;
  /** What was bought from her this month, gross, centavos. */
  readonly monthCentavos: number;
  readonly monthDeliveries: number;
}

function grossOf(row: PurchaseHead): number | null {
  try {
    return parseDecimal(row.total_net, SCALE.money) + parseDecimal(row.total_tax, SCALE.money);
  } catch {
    return null;
  }
}

/** The local day a delivery happened — the phone is in the shop (`today.ts`). */
function localDay(at: string): string {
  const d = new Date(at);
  const y = String(d.getFullYear()).padStart(4, '0');
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Each supplier's last delivery and this month's, out of the window's headers.
 * ⚠️ WHAT STANDS — a cancelled delivery is no visit (`standing`, `8p`'s rule).
 * The generic supplier is a key like any other (`''` for a header with none).
 */
export function activityOf(
  heads: readonly PurchaseHead[] | null | undefined,
  reversals: readonly ReversalRow[] | null | undefined,
  today: string,
): ReadonlyMap<string, Activity> {
  const out = new Map<string, { lastDay: string | null; monthCentavos: number; monthDeliveries: number }>();
  if (heads === null || heads === undefined || reversals === null || reversals === undefined) return out;
  const month = today.slice(0, 7);
  for (const head of standing(heads, reversals)) {
    const key = head.provider_id ?? '';
    const one = out.get(key) ?? { lastDay: null, monthCentavos: 0, monthDeliveries: 0 };
    const day = localDay(head.occurred_at);
    if (one.lastDay === null || day > one.lastDay) one.lastDay = day;
    if (day.slice(0, 7) === month) {
      one.monthDeliveries += 1;
      one.monthCentavos += grossOf(head) ?? 0;
    }
    out.set(key, one);
  }
  return out;
}

/**
 * The directory's order: the generic supplier first (as before), then who sold
 * her the most this month, then the most recent, then by name.
 */
export function rankedProviders<T extends { readonly id: string; readonly name: string; readonly isGeneric: boolean }>(
  providers: readonly T[],
  activity: ReadonlyMap<string, Activity>,
): T[] {
  const of = (p: T) => activity.get(p.id);
  return [...providers].sort((a, b) => {
    if (a.isGeneric !== b.isGeneric) return a.isGeneric ? -1 : 1;
    const money = (of(b)?.monthCentavos ?? 0) - (of(a)?.monthCentavos ?? 0);
    if (money !== 0) return money;
    const da = of(a)?.lastDay ?? '';
    const db = of(b)?.lastDay ?? '';
    if (da !== db) return da < db ? 1 : -1;
    return a.name.localeCompare(b.name, 'es');
  });
}

/** *hoy*, *ayer*, *hace 3 días*, *hace 2 semanas*, *hace más de un mes*. */
export function agoWords(day: string, today: string): string {
  const days = Math.round((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${day}T00:00:00Z`)) / 86_400_000);
  return ES.providers.page.ago(days);
}

/** The row's line: *Hace 3 días · $3,030 este mes*, *Hace 2 semanas*, or nothing. */
export function activityLine(activity: Activity | undefined, today: string, amount: (c: number) => string): string {
  if (activity === undefined || activity.lastDay === null) return '';
  const ago = agoWords(activity.lastDay, today);
  return ES.providers.page.rowLine(ago, activity.monthCentavos > 0 ? amount(activity.monthCentavos) : null);
}

// ------------------------------------------------------ what she brings you --

export interface Brought {
  readonly variantId: string;
  readonly name: string;
  readonly priceUnit: string;
  /** Centavos per price unit, net: the last delivery's price. */
  readonly last: number;
  /** Against the delivery before it, or `null` when there is only one. */
  readonly change: number | null;
  readonly lastDay: string;
}

/**
 * What she brought in the window, the most recent first: the last price per
 * the product's own unit and how it moved against the delivery before.
 *
 * ⚠️ WHAT STANDS: a line of a cancelled delivery, or of the cancellation itself,
 * is no price. ⚠️ Two lines of ONE delivery for one product (two prices typed)
 * count once, the higher — `provider_price_memory`'s tie rule (`0010`).
 */
export function broughtOf(
  lines: readonly SupplierLine[] | null | undefined,
  entries: readonly { readonly id: string; readonly name: string; readonly priceUnit: string }[],
  factors: UnitFactors,
): readonly Brought[] | null {
  if (lines === null || lines === undefined) return null;
  const heads = new Map<string, { id: string; occurred_at: string; reversal_of: string | null }>();
  for (const l of lines) if (l.purchase !== null) heads.set(l.purchase.id, l.purchase);
  const kept = new Set(standing([...heads.values()], []).map((h) => h.id));
  // Per product: per delivery, the price; deliveries newest first.
  const per = new Map<string, Map<string, { at: string; perBase: string }>>();
  for (const l of lines) {
    if (l.purchase === null || !kept.has(l.purchase.id)) continue;
    const docs = per.get(l.variant_id) ?? new Map<string, { at: string; perBase: string }>();
    const was = docs.get(l.purchase.id);
    if (was === undefined || unitPrice(l.unit_price_net_per_base) > unitPrice(was.perBase)) {
      docs.set(l.purchase.id, { at: l.purchase.occurred_at, perBase: l.unit_price_net_per_base });
    }
    per.set(l.variant_id, docs);
  }
  const out: Brought[] = [];
  for (const entry of entries) {
    const docs = per.get(entry.id);
    if (docs === undefined) continue;
    const factor = factors[entry.priceUnit];
    if (factor === undefined) continue;
    const order = [...docs.values()].sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
    const last = priceCentavos(order[0]!.perBase, factor);
    if (last === null) continue;
    const before = order[1] === undefined ? null : priceCentavos(order[1].perBase, factor);
    out.push({
      variantId: entry.id,
      name: entry.name,
      priceUnit: entry.priceUnit,
      last,
      change: before === null ? null : last - before,
      lastDay: localDay(order[0]!.at),
    });
  }
  return out.sort((a, b) => (a.lastDay < b.lastDay ? 1 : a.lastDay > b.lastDay ? -1 : a.name.localeCompare(b.name, 'es')));
}

/** A per-base price as integer millionths, for comparing two — never a float (`R5`). */
function unitPrice(text: string): number {
  try {
    return parseDecimal(text, SCALE.unitPrice);
  } catch {
    return -1;
  }
}

/** The first day the reads reach. */
export function supplierSince(today: string): string {
  return daysBefore(today, SUPPLIER_DAYS);
}

// ------------------------------------------------------------- the contact --

/**
 * Her number as digits WhatsApp takes: a Mexican ten-digit number gets its `52`;
 * a number already written with it is kept; anything else is passed as typed
 * digits. `null` with no digits at all.
 */
export function whatsappNumber(phone: string | null | undefined): string | null {
  const digits = (phone ?? '').replace(/\D/g, '');
  if (digits === '') return null;
  if (digits.length === 10) return `52${digits}`;
  return digits;
}

/** The `tel:` link — the digits, so a space or a dash never breaks the dialler. */
export function callUrl(phone: string | null | undefined): string | null {
  const digits = (phone ?? '').replace(/[^\d+]/g, '');
  return digits === '' ? null : `tel:${digits}`;
}

/** The `wa.me` link, with no prefilled message. */
export function chatUrl(phone: string | null | undefined): string | null {
  const number = whatsappNumber(phone);
  return number === null ? null : `https://wa.me/${number}`;
}
