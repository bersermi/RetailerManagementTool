// ============================================================================
// A KITCHEN AS ITACATE HOLDS IT — THE DOOR'S SHAPE, COPIED. Plan task `10.5-v-c-ii`:
// *Así la ven* and *Ver como la ven* draw Itacate's two pages inside Wera Cocina, and
// those pages are drawn from this shape. ⚠️ ITACATE'S TYPES, block for block
// (`itacate/src/api/cocinas.ts`, held by `test/vecinos.test.ts`); the reading of the
// door's answer is not copied, because Wera Cocina never asks the door — her own rows
// are made into this shape by `@/lib/comoLaVen`.
//
// ⚠️ NOT IN `src/api/`: a module there is a claim about the applied schema (`db.yml`),
// and this one names no table, column or function.
// ============================================================================

import type { Tag } from '@/api/listing';
import type { Page } from '@/api/pagina';

/** Whose point the door sends (`0078`): her own pin, or Google's copy for her address. */
export const POINT_SOURCES = ['pin', 'google'] as const;
export type PointSource = (typeof POINT_SOURCES)[number];

/** A place on the map. */
export interface Punto {
  readonly latitude: number;
  readonly longitude: number;
}

/** A kitchen's point, and whose it is. */
export interface Point extends Punto {
  readonly source: PointSource;
}

/** Her address — each part as she wrote it, `''` when she left it out. */
export interface Address {
  readonly street: string;
  readonly number: string;
  readonly colonia: string;
  readonly city: string;
  readonly postalCode: string;
}

/** A dish or a bag. Money in integer centavos. */
export interface Dish {
  readonly lineNo: number;
  readonly name: string;
  readonly description: string | null;
  readonly tags: readonly Tag[];
  readonly priceCentavos: number;
  /** How many she offered — a whole number, or `null` for a fraction (a shop's *Ofrecer*, later). */
  readonly count: number | null;
  readonly surprise: boolean;
  readonly usualCentavos: number | null;
  /** Its photo's path in the bucket, or `null` — her trade's drawing. */
  readonly photo: string | null;
}

/** A publication on offer. */
export interface Offer {
  readonly id: string;
  readonly start: Date;
  readonly end: Date;
  readonly dishes: readonly Dish[];
}

/** A dish she repeats. */
export interface Repeat {
  readonly name: string;
  readonly times: number;
  readonly usualCentavos: number | null;
}

/** What she usually publishes, over four weeks. */
export interface Summary {
  /** Publications per weekday, Monday first (ISO's order), seven numbers. */
  readonly weekdays: readonly number[];
  /** The hour she usually publishes for, in her kitchen's zone, 0–23. */
  readonly usualHour: number | null;
  /** The last day she published for, `YYYY-MM-DD` in her kitchen's zone. */
  readonly lastDay: string | null;
  readonly repeats: readonly Repeat[];
}

/** A kitchen, as the list draws it. */
export interface Kitchen {
  readonly id: string;
  readonly name: string;
  readonly giro: string | null;
  readonly address: Address;
  readonly directions: string | null;
  readonly point: Point | null;
  readonly page: Page;
  /** What she has on offer, the earliest window first. */
  readonly offers: readonly Offer[];
  readonly summary: Summary;
}
