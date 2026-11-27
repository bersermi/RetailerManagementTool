// ============================================================================
// A KITCHEN AS ITACATE HOLDS IT — THE DOOR'S SHAPE, COPIED. Plan task `10.5-v-c-ii`:
// *Así la ven* and *Ver como la ven* draw Itacate's two pages inside Wera Cocina, and
// those pages are drawn from this shape. ⚠️ ITACATE'S TYPES, block for block
// (`itacate/src/api/cocinas.ts`, held by `test/vecinos.test.ts`); the reading of the
// door's answer is not copied, because Wera Cocina never asks the door — her own rows
// are made into this shape by `@/lib/comoLaVen`. ⚠️ Since `10.9g-iii` a kitchen's promotions and the one each offer
// joined (`Promocion`, `Kitchen.promociones`, `Offer.promocion`), whose kinds and days are Wera Cocina's own
// (`@/api/promociones`), which Itacate copied.
//
// ⚠️ NOT IN `src/api/`: a module there is a claim about the applied schema (`db.yml`),
// and this one names no table, column or function.
// ============================================================================

import type { Tag } from '@/api/listing';
import type { Page } from '@/api/pagina';
import type { Dia, Tipo } from '@/api/promociones';

export type { Dia, Tipo };

/** Whose point the door sends (`0078`): her own pin, or Google's copy for her address. */
export const POINT_SOURCES = ['pin', 'google'] as const;
export type PointSource = (typeof POINT_SOURCES)[number];

/** How a neighbour may pay (`0079`): cash always, first; a card or a transfer when the kitchen takes them. */
export const PAGOS = ['efectivo', 'tarjeta', 'transferencia'] as const;
export type Pago = (typeof PAGOS)[number];

/** How a plate is eaten (`0079`): taken away first, or at her kitchen. */
export const COMERES = ['llevar', 'aqui'] as const;
export type Comer = (typeof COMERES)[number];

/**
 * The good tags a neighbour may tap after four or five stars (`0080`'s closed list) — the
 * only ones the door sends, her three most given, and the only ones a kitchen's page shows.
 */
export const ETIQUETAS_BUENAS = ['lista_a_tiempo', 'buena_porcion', 'muy_rica', 'me_atendieron_bien'] as const;
export type EtiquetaBuena = (typeof ETIQUETAS_BUENAS)[number];

/**
 * The services a neighbour may see a kitchen use (`0081`'s door, `features`), in the fixed order —
 * her loyalty card, her promotions. ⚠️ A NAME THIS BUILD DOES NOT KNOW IS IGNORED (`10.9a`), so a
 * build in her hand survives the service that comes after it.
 */
export const SERVICIOS_VISTOS = ['tarjeta', 'promociones'] as const;
export type ServicioVisto = (typeof SERVICIOS_VISTOS)[number];

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
  /** It can be taken away (`para_llevar`). */
  readonly llevar: boolean;
  /** It can be eaten at her kitchen (`para_aqui`). */
  readonly aqui: boolean;
}

/** A publication on offer. */
export interface Offer {
  readonly id: string;
  readonly start: Date;
  readonly end: Date;
  readonly dishes: readonly Dish[];
  /** The *desechable* in centavos, added when she takes it away — `null`, no charge. */
  readonly desechableCentavos: number | null;
  /** `0087`: the promotion it joined — its mark — while that promotion is among her kitchen's; else `null`. */
  readonly promocion: string | null;
}

/** `0087`: one promotion a neighbour sees now — her page's band, the mark on the offers that joined it. */
export interface Promocion {
  readonly id: string;
  readonly tipo: Tipo;
  /** What she offers — *Jueves pozolero*. */
  readonly loQue: string;
  readonly mas: string | null;
  /** Its weekdays, Monday first; all seven is *Todos*. */
  readonly dias: readonly Dia[];
  /** Its last day, `YYYY-MM-DD` in her kitchen's zone — *hasta el 17 de diciembre*. */
  readonly hasta: string;
  /** As her phone wrote them, with her kitchen's name and address — line breaks kept. */
  readonly condiciones: string;
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
  /** How she takes payment, cash first and always there. */
  readonly pagos: readonly Pago[];
  /** The ways she hands plates over, *para llevar* first — at least one. */
  readonly comeres: readonly Comer[];
  /** Who may reserve here by score — more than this per cent — or `null`, everyone. */
  readonly minScore: number | null;
  /** The neighbours' stars, from five ratings — `null` until then (*Todavía sin calificaciones*). */
  readonly estrellas: Estrellas | null;
  /** `0081`: the services she uses that a neighbour sees, in `SERVICIOS_VISTOS`' order — none yet drawn. */
  readonly servicios: readonly ServicioVisto[];
  /** `0085`: her loyalty card's terms while it is open (G12) — what a first stamp starts on — else `null`. */
  readonly tarjeta: TarjetaDeCocina | null;
  /** `0087`: her promotions a neighbour sees now, newest first (the door's order) — none, `[]`. */
  readonly promociones: readonly Promocion[];
}

/** `0085`: a kitchen's loyalty card as a neighbour reads it before her first stamp (G12, G34). */
export interface TarjetaDeCocina {
  /** What she gives at the last stamp — *Una comida corrida*. */
  readonly premio: string;
  /** How many stamps, 4 to 12. */
  readonly sellos: number;
  /** The days without a stamp before hers are erased — 14 to 365 (`0089`; 15, 30, 45 or 60 before it); `0` is *Nunca*. */
  readonly dias: number;
  /** `10.9m` (`0099`): the kitchen's condition — *Compra mínima de $80* — or `null`: none, and every word as before. */
  readonly condicion: string | null;
}

/** A kitchen's stars, as the cards and her page draw them. */
export interface Estrellas {
  /** The average to one decimal, as the door wrote it: *4.8*. */
  readonly promedio: string;
  readonly cuantas: number;
  /** Her most given good tags, the most given first. */
  readonly etiquetas: readonly EtiquetaBuena[];
}
