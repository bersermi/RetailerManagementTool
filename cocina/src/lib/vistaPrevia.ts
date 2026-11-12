// ============================================================================
// THE CARD AT THE FOOT OF *TU OFERTA DE HOY* — WHAT IT SHOWS AS SHE TYPES. Plan task
// `10.5-v-d`, the family-shell page's form (ruled 2026-11-05): *"Así la verán en
// Itacate"*, one card per line, filling in as she types.
//
// ⚠️ THE CARD IS ITACATE'S (`@/vecinos/ui/TarjetaPlatillo`, its list's card copied), so
// this makes what Itacate's list hands it — her kitchen, the offer, the dish — out of
// what the form holds, never out of the door (ADR-035 §2.7: Wera Cocina never asks it).
// Her kitchen is `@/lib/comoLaVen`'s, as *Ver como la ven* makes it from her own rows.
//
// ⚠️ UNTIL SHE TYPES, THE DRAWING'S HINTS: the dish's name, *60* and *120* — the same
// muted hints her boxes show (`ES.publicar`) — so the card is whole from the first
// frame and each figure becomes hers as she writes it. A count she has not given
// draws no *Quedan*. A usual price she wrote that is not above the price draws no
// saving, as Itacate draws none (`ahorroDe`); *Publicar* says why.
//
// ⚠️ `10.5b-iv-c`: HOW EACH DISH WILL BE SENT, AND HER SETTINGS — the card says *Para llevar*
// or *Aquí o para llevar* as the dish will be sent (`@/api/listing`'s `comoSeComeDe`: her choice
// when her kitchen offers both ways, else the kitchen's), and her kitchen's payment, *desechable*
// and stars are the ones *Mi cocina* holds; the door's defaults while those are not read.
//
// ⚠️ PURE: `test/vistaPrevia.test.ts` pins every rule here.
// ============================================================================

import { porSubir, pathOf, type Foto } from '@/api/fotos';
import type { Kitchen as SuCocina } from '@/api/kitchen';
import type { Ajustes } from '@/api/ajustes';
import { comoSeComeDe, parseCount, parsePesos, type LineDraft } from '@/api/listing';
import type { Page } from '@/api/pagina';
import type { Place } from '@/api/place';
import { SIN_AJUSTES, cocinaComoLaVen } from '@/lib/comoLaVen';
import type { Ventana } from '@/lib/ventana';
import { ES } from '@/strings';
import type { Dish, Estrellas, Kitchen, Offer } from '@/vecinos/cocinas';

/** The offer the card belongs to, before it has an id of its own. Never sent. */
export const OFERTA_PREVIA = 'vista-previa';

/** A typed figure as centavos, or `null` while it is empty or not a price above zero. */
function centavos(typed: string): number | null {
  const value = parsePesos(typed);
  return value === null || value <= 0 ? null : value;
}

/** The hints, read once from her words: what the card shows until she types. */
function pista(text: string): number {
  const value = centavos(text);
  if (value === null) throw new RangeError(`a hint that is not a price: ${text}`);
  return value;
}

/** Whether she has written anything in a box — a figure she is still typing counts. */
function escrito(typed: string): boolean {
  return typed.trim() !== '';
}

/**
 * The ways a dish will be eaten, as it will be sent: a bag to go; her choice when her kitchen
 * offers both; else her kitchen's (`null` from `comoSeComeDe`) — the door's default unread.
 */
function comoSeComePrevio(line: LineDraft, ajustes: Ajustes | null): { readonly llevar: boolean; readonly aqui: boolean } {
  if (line.surprise) return { llevar: true, aqui: false };
  const enviado = comoSeComeDe(line, ajustes);
  if (enviado.para_llevar !== null && enviado.para_aqui !== null) return { llevar: enviado.para_llevar, aqui: enviado.para_aqui };
  return ajustes === null ? { llevar: SIN_AJUSTES.llevar, aqui: SIN_AJUSTES.aqui } : { llevar: ajustes.llevar, aqui: ajustes.aqui };
}

/** One line of the form as the card's dish. See the header. */
export function platilloPrevio(line: LineDraft, i: number, ajustes: Ajustes | null = null): Dish {
  const kind = line.surprise ? 'bolsa' : 'platillo';
  const name = line.name.trim();
  const description = line.description.trim();
  const usual = escrito(line.usual) ? centavos(line.usual) : pista(ES.publicar.valeEjemplo);
  return {
    lineNo: i + 1,
    name: name === '' ? ES.publicar.nombreEjemplo[kind] : name,
    description: description === '' ? null : description,
    tags: line.tags,
    priceCentavos: centavos(line.price) ?? pista(ES.publicar.precioEjemplo),
    count: parseCount(line.count),
    surprise: line.surprise,
    usualCentavos: usual,
    photo: pathOf(line.foto),
    ...comoSeComePrevio(line, ajustes),
  };
}

/** What Itacate's list would hand its card for each line: her kitchen, the offer, the dish. */
export interface Previa {
  readonly cocina: Kitchen;
  readonly oferta: Offer;
  readonly platillos: readonly Dish[];
}

export function previaDe(input: {
  readonly kitchen: SuCocina;
  readonly place: Place | null;
  readonly page: Page;
  readonly lines: readonly LineDraft[];
  readonly ventana: Ventana;
  readonly now: Date;
  /** `10.5b-iv-c`: her settings and her stars, once read. */
  readonly ajustes?: Ajustes | null;
  readonly estrellas?: Estrellas | null;
}): Previa {
  const { kitchen, place, page, lines, ventana, now } = input;
  const ajustes = input.ajustes ?? null;
  const platillos = lines.map((line, i) => platilloPrevio(line, i, ajustes));
  const desechableCentavos = ajustes === null ? SIN_AJUSTES.desechableCentavos : ajustes.desechableCentavos;
  return {
    // Her name, trade, colour, logo and stars — nothing else of it is drawn by the card.
    cocina: cocinaComoLaVen({ kitchen, place, page, listings: [], now, ajustes, estrellas: input.estrellas }),
    // ⚠️ The *desechable* her kitchen holds now, which publishing copies onto the offer.
    oferta: { id: OFERTA_PREVIA, start: ventana.start, end: ventana.end, dishes: platillos, desechableCentavos },
    platillos,
  };
}

/** The photos taken on the form and not yet sent, by path — what the card's photo part draws from the phone. */
export function recienTomadas(lines: readonly LineDraft[]): ReadonlyMap<string, Foto> {
  return new Map(porSubir(lines.map((line) => line.foto)).map((foto) => [foto.path, foto]));
}
