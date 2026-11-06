// ============================================================================
// *HOY* AS A HUB — WHAT IT SAYS, PURE. Plan task `10.5-v-c-i`, the owner's directions
// of 2026-11-06 (the family-shell page's round 6: *"show the users everything in a
// dashborad/hub way, for them to easily reach the main actions with some indicators
// such as remaining items"*), as the page's phone draws it (`cHoy`, `cOfertas`):
//   - THE DAY'S CARD — how many are on offer, until when, the time left as a bar, each
//     offer on a line — or *Hoy todavía no has publicado* with when she last did, or
//     *Por hoy ya se terminó* once what she published today is over (`diaDe`);
//   - *REPETIR*, ONE TAP — her last day's offers she has not published again today
//     (`repetibles`), published at once with today's hours when they can be, else the
//     form opens filled in (`planDeRepetir`);
//   - *TUS OFERTAS* — today's (`deHoy`), then *Anteriores*, one row per offer she made,
//     the newest first (`anteriores`);
//   - HER PAGE'S CHECKLIST — five things, the door's count on *Hoy* (`pendientesDe`).
//
// ⚠️ NOTHING NEW IS READ: her last ten publications (`@/api/listing`'s list), her
// place, her page and her trade, which the app already holds. `test/hoy.test.ts`
// pins every rule against a calendar in Mexico City's zone.
//
// ⚠️⚠️ AN OFFER TAKEN BACK BY *DESHACER* WAS NEVER PUBLISHED, FOR EVERY RULE HERE
// (`deshecha`): withdrawn within a minute of being published — the toast's 8 seconds
// and a slow network — it is on no card, no row and no count. *Ya se terminó* later is
// an offer she made that is over: it stays on today's card as *Terminada*.
// ⚠️ "TODAY" IS THE PHONE'S DAY, as the window's is (`@/lib/ventana`): the phone is in
// her kitchen.
// ============================================================================

import {
  checkLines,
  listingState,
  publishBody,
  repeatDraft,
  type Listing,
  type PublishBody,
} from '@/api/listing';
import { formatMXN } from '@/format/mxn';
import { checkVentana, clockOf, dayOf, daysFrom } from '@/lib/ventana';
import { ES } from '@/strings';

// ----------------------------------------------------------------------------
// Which offers are today's
// ----------------------------------------------------------------------------

/** How soon after it was published a withdrawal is *Deshacer*: the toast's 8 seconds, and a slow network. */
export const DESHECHA_MS = 60_000;

/** Taken back by *Deshacer* — for every rule here, never published. */
export function deshecha(listing: Listing): boolean {
  if (listing.withdrawnAt === null) return false;
  return listing.withdrawnAt.getTime() - listing.createdAt.getTime() <= DESHECHA_MS;
}

/**
 * Today's: published today, or for today or later, or on offer now — and never one
 * taken back by *Deshacer*. An offer she ended (*Ya se terminó*) or whose hours are over
 * is still today's, as *Terminada*.
 */
export function esDeHoy(listing: Listing, now: Date): boolean {
  if (deshecha(listing)) return false;
  return (
    daysFrom(now, listing.createdAt) === 0 || daysFrom(now, listing.start) >= 0 || listingState(listing, now) === 'oferta'
  );
}

/** Today's offers as *Tus ofertas* lists them: on offer first, the soonest first; then the ones that are over, the latest first. */
export function deHoy(listings: readonly Listing[], now: Date): Listing[] {
  const hoy = listings.filter((l) => esDeHoy(l, now));
  const enOferta = hoy.filter((l) => listingState(l, now) === 'oferta').sort((a, b) => a.start.getTime() - b.start.getTime());
  const terminadas = hoy.filter((l) => listingState(l, now) !== 'oferta').sort((a, b) => b.end.getTime() - a.end.getTime());
  return [...enOferta, ...terminadas];
}

// ----------------------------------------------------------------------------
// The day's card
// ----------------------------------------------------------------------------

/** One line of the card: a dish of today's, and how many are on offer — or that it is over. */
export interface RenglonDelDia {
  readonly key: string;
  readonly nombre: string;
  readonly cuantos: number;
  readonly terminada: boolean;
}

/** What the day's card says. */
export type Dia =
  /** Nothing today. `ultima` is when she last published, `null` if she never has. */
  | { readonly kind: 'nada'; readonly ultima: Date | null }
  /** She published today and none of it is on offer any more. */
  | { readonly kind: 'terminado' }
  | {
      readonly kind: 'oferta';
      /** Every plate on offer now, in every offer. From `10.5b`, what is left of them. */
      readonly total: number;
      /** The first start and the last end of what is on offer — the bar runs between them. */
      readonly desde: Date;
      readonly hasta: Date;
      readonly renglones: readonly RenglonDelDia[];
    };

export function diaDe(listings: readonly Listing[], now: Date): Dia {
  const hoy = deHoy(listings, now);
  const vivas = hoy.filter((l) => listingState(l, now) === 'oferta');
  if (vivas.length === 0) {
    if (hoy.length > 0) return { kind: 'terminado' };
    const publicadas = listings.filter((l) => !deshecha(l));
    const ultima = publicadas.reduce<Date | null>((a, l) => (a === null || l.createdAt > a ? l.createdAt : a), null);
    return { kind: 'nada', ultima };
  }
  return {
    kind: 'oferta',
    total: vivas.reduce((sum, l) => sum + l.lines.reduce((n, line) => n + line.count, 0), 0),
    desde: new Date(Math.min(...vivas.map((l) => l.start.getTime()))),
    hasta: new Date(Math.max(...vivas.map((l) => l.end.getTime()))),
    renglones: hoy.flatMap((l) =>
      l.lines.map((line, i) => ({
        key: `${l.id}:${i}`,
        nombre: line.name,
        cuantos: line.count,
        terminada: listingState(l, now) !== 'oferta',
      })),
    ),
  };
}

/** The card's lines it draws, and how many it leaves to *y 2 más*. */
export const RENGLONES_EN_LA_TARJETA = 4;

/** What is left of the time between the first start and the last end, from 1 to 0 — the bar's length. */
export function fraccionDe(desde: Date, hasta: Date, now: Date): number {
  const largo = hasta.getTime() - desde.getTime();
  if (largo <= 0) return 0;
  return Math.max(0, Math.min(1, (hasta.getTime() - now.getTime()) / largo));
}

/** *hasta las 19:00*, *hasta mañana a las 1:00*. */
export function hastaTexto(hasta: Date, now: Date): string {
  return ES.hoy.hasta(daysFrom(now, hasta) === 0 ? null : dayOf(hasta, now).toLowerCase(), clockOf(hasta));
}

/** *Faltan 1 h 40 min* — or, before the first window opens, *Empieza a las 17:00*. */
export function faltaTexto(desde: Date, hasta: Date, now: Date): string {
  if (desde.getTime() > now.getTime()) {
    return ES.hoy.empieza(daysFrom(now, desde) === 0 ? null : dayOf(desde, now).toLowerCase(), clockOf(desde));
  }
  const minutos = Math.floor((hasta.getTime() - now.getTime()) / 60_000);
  if (minutos < 1) return ES.hoy.menosDeUnMinuto;
  return ES.hoy.faltan(Math.floor(minutos / 60), minutos % 60);
}

/** Under *Hoy todavía no has publicado*: *Ayer publicaste a las 16:10*, or the day, or her first. */
export function ultimaTexto(ultima: Date | null, now: Date): string {
  if (ultima === null) return ES.hoy.nunca;
  if (daysFrom(now, ultima) === -1) return ES.hoy.ayer(clockOf(ultima));
  return ES.hoy.antes(dayOf(ultima, now).toLowerCase(), clockOf(ultima));
}

// ----------------------------------------------------------------------------
// Her past offers, and *Repetir*
// ----------------------------------------------------------------------------

/** One offer she made, whatever day: what she offered, by name and kind, in her order. */
export function firmaDe(listing: Listing): string {
  return listing.lines.map((line) => `${line.surprise ? 'b' : 'p'}:${line.name.trim().toLocaleLowerCase('es-MX')}`).join('|');
}

/** An offer of hers from before today, and whether she published the same one again today. */
export interface Anterior {
  readonly listing: Listing;
  readonly hoy: boolean;
}

/** *Anteriores*: one row per offer she made before today — its newest — the newest first. */
export function anteriores(listings: readonly Listing[], now: Date): Anterior[] {
  const deHoyFirmas = new Set(listings.filter((l) => esDeHoy(l, now)).map(firmaDe));
  const pasadas = listings
    .filter((l) => !deshecha(l) && !esDeHoy(l, now))
    .sort((a, b) => b.start.getTime() - a.start.getTime() || b.createdAt.getTime() - a.createdAt.getTime());
  const vistas = new Set<string>();
  const filas: Anterior[] = [];
  for (const listing of pasadas) {
    const firma = firmaDe(listing);
    if (vistas.has(firma)) continue;
    vistas.add(firma);
    filas.push({ listing, hoy: deHoyFirmas.has(firma) });
  }
  return filas;
}

/** How many *Repetir* chips *Hoy* draws. */
export const REPETIR_EN_HOY = 3;

/**
 * *Hoy*'s chips: the offers of the last day she published before today — yesterday's, or
 * Saturday's on a Monday — that she has not published again today.
 */
export function repetibles(listings: readonly Listing[], now: Date): Listing[] {
  const filas = anteriores(listings, now);
  if (filas.length === 0) return [];
  const ultimoDia = Math.max(...filas.map((f) => daysFrom(now, f.listing.start)));
  return filas
    .filter((f) => !f.hoy && daysFrom(now, f.listing.start) === ultimoDia)
    .map((f) => f.listing)
    .slice(0, REPETIR_EN_HOY);
}

/** What she offered, in a few words: *Comida corrida*, or *Comida corrida y 2 más*. */
export function nombreDe(listing: { readonly lines: readonly { readonly name: string }[] }): string {
  const [primera] = listing.lines;
  if (primera === undefined) return '';
  return listing.lines.length === 1 ? primera.name : ES.hoy.yMas(primera.name, listing.lines.length - 1);
}

/** A chip's words: *Comida corrida · 8 · $65* — what, how many, the price of one. */
export function chipDe(listing: Listing): string {
  const [primera] = listing.lines;
  if (primera === undefined) return '';
  if (listing.lines.length > 1) return nombreDe(listing);
  return ES.hoy.chip(primera.name, primera.count, formatMXN(primera.priceCentavos));
}

/** What a tap on *Repetir* does: publish now, or open the form filled in. */
export type PlanDeRepetir = { readonly kind: 'publicar'; readonly body: PublishBody } | { readonly kind: 'formulario' };

/**
 * ⚠️ ONE TAP PUBLISHES ONLY WHAT SHE WOULD HAVE PUBLISHED FROM THE FORM UNTOUCHED: the
 * same lines, the same hours today (`repeatDraft`), every rule the form checks holding.
 * When today's hours are over, or the old offer breaks a rule the form now checks, the
 * form opens filled in, as *Repetir* did before — she picks, nothing is guessed for her.
 */
export function planDeRepetir(listing: Listing, placeId: string | null, now: Date, mint: () => string): PlanDeRepetir {
  if (placeId === null) return { kind: 'formulario' };
  const draft = repeatDraft(listing, now, mint);
  if (daysFrom(now, draft.ventana.start) !== 0) return { kind: 'formulario' };
  if (checkLines(draft.lines) !== null) return { kind: 'formulario' };
  if (checkVentana(draft.ventana, now) !== null) return { kind: 'formulario' };
  return { kind: 'publicar', body: publishBody(placeId, draft.lines, draft.ventana) };
}

// ----------------------------------------------------------------------------
// Her page's checklist — *Tu página en Itacate*, five things
// ----------------------------------------------------------------------------

/** The five, in the page's order (`pageCard`). */
export const PENDIENTES = ['nombreGiro', 'direccion', 'frase', 'oferta', 'portada'] as const;
export type Pendiente = (typeof PENDIENTES)[number];

/** What the checklist is read from — each already on the phone. */
export interface Estado {
  /** Her trade, given. Her kitchen's name always is. */
  readonly giro: boolean;
  /** Her address, whole (`@/api/place`'s `addressComplete`). Her own point is never asked: it is hers to set. */
  readonly direccion: boolean;
  /** Her page's sentence. */
  readonly frase: boolean;
  /** An offer she published — any day, never one taken back by *Deshacer*. */
  readonly oferta: boolean;
  /** Her page's cover photo. */
  readonly portada: boolean;
}

export function estadoDe(input: {
  readonly giro: string | null;
  readonly direccionCompleta: boolean;
  readonly frase: string | null;
  readonly portada: unknown;
  readonly listings: readonly Listing[];
}): Estado {
  return {
    giro: input.giro !== null,
    direccion: input.direccionCompleta,
    frase: input.frase !== null && input.frase.trim() !== '',
    oferta: input.listings.some((l) => !deshecha(l)),
    portada: input.portada !== null && input.portada !== undefined,
  };
}

/** What is missing, in the page's order. */
export function faltanDe(estado: Estado): Pendiente[] {
  const hecho: Record<Pendiente, boolean> = {
    nombreGiro: estado.giro,
    direccion: estado.direccion,
    frase: estado.frase,
    oferta: estado.oferta,
    portada: estado.portada,
  };
  return PENDIENTES.filter((p) => !hecho[p]);
}

/** The door's line: *Falta tu foto de portada*, *Faltan tu frase y tu foto de portada*, *Faltan 3 cosas*. */
export function faltaDeLaPagina(faltan: readonly Pendiente[]): string {
  const dichos = faltan.map((p) => ES.pendientes.corto[p]);
  if (dichos.length === 1) return ES.pendientes.falta(dichos[0]);
  if (dichos.length === 2) return ES.pendientes.faltan(dichos[0], dichos[1]);
  return ES.pendientes.faltanVarias(dichos.length);
}

/** Where each one is done. */
export const DONDE_SE_HACE: Readonly<Record<Pendiente, '/giro' | '/direccion' | '/pagina' | '/publicar'>> = {
  nombreGiro: '/giro',
  direccion: '/direccion',
  frase: '/pagina',
  oferta: '/publicar',
  portada: '/pagina',
};
