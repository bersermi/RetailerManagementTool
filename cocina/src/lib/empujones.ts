import type { Href } from 'expo-router';
import { useCallback, useState } from 'react';

import { diaTexto, type Reserva } from '@/api/apartados';
import type { Listing } from '@/api/listing';
import type { LoQueUsa } from '@/api/servicios';
import { DONDE_SE_HACE, deHoy, deshecha, faltanDe, type Estado, type Pendiente } from '@/lib/hoy';
import { construidos, elegibles, type Elegible } from '@/lib/loQueUsas';
import { deviceStore, readKey, writeKey, type DeviceStore } from '@/lib/store';

// ============================================================================
// THE NUDGES AND THE FIRSTS — WHAT *HOY* INVITES, WHEN, AND WHAT THIS PHONE REMEMBERS OF
// IT, PURE. Plan task `10.9a-iii`, the owner's rulings of 2026-11-16 and 17 (G31, G32 and the
// nudges, round 6 of the grill; the family-shell page, round 7): *"attractive but not
// invasive"* — ONE IDEA RUNS THROUGH THEM: A NUDGE SITS WHERE THE THING WILL LIVE, AND TAKES
// NO SPACE OF ITS OWN.
//   - UNTIL HER FIRST OFFER the day's card is the invitation — *¿Tienes alguna oferta?
//     Publícala y tus vecinos la verán* (his words) — and *Publicar* glows once each time she
//     opens the app, on her first three days with none (`verHoy`'s `invitacion`, `brilla`);
//   - HER FIRST OFFER is celebrated — *¡Ya te ven en Itacate!* — and never again
//     (`ofertaDeEstreno`);
//   - HER PAGE'S MISSING PARTS: one quiet line under the day's card, one part at a time, only
//     after her first offer and only on days she publishes, three days each — then nothing on
//     *Hoy*, the part a *Falta* row in *Mi cocina*; ✕ ends them for good (`@/lib/puerta`'s
//     `'pagina'`, the key her page's door kept since `10.5-v-c-i`);
//   - A FEATURE SHE DID NOT PICK stays off *Hoy* for two weeks; then one line each, on one
//     day, a week apart, opening its *Activar*;
//   - AT MOST ONE LINE ON *HOY* (`lineaDe`) — and, as the page draws them, only on a day she
//     published; *Cuéntanos* at the foot is a *Próximamente*, never counted as one;
//   - ONE SMALL CELEBRATION PER FIRST — her first offer, reservation, handover; the stamp and
//     the promotion are their rows' (`10.9e`, `10.9g`);
//   - *ASÍ FUNCIONA* the first time she opens a feature, until she uses it or closes it
//     (`asiFuncionaVisible`) — drawn by each feature's own screen.
//
// ⚠️⚠️ ALL OF IT IS THIS PHONE'S (the ruling: *"phone-only"*) — one record per kitchen under
// `clave`, nothing sent anywhere: it is how her screen invites her, not something about her.
// A store that fails reads as an empty record, so the worst a full disk costs is a line seen
// again; a record it cannot read is an empty one too.
// ⚠️ EVERY WRITE IS READ, CHANGED AND WRITTEN AT ONCE (`cambiarMemoria`): *Hoy*, the tabs'
// layout and *Publicar* each hold a copy, and none may write another's field back as it was.
// ⚠️ A FIRST IS CELEBRATED ONLY IF THIS PHONE SAW THE ZERO BEFORE IT (`Primera`'s `'cero'`):
// a kitchen whose history already holds a reservation when this update arrives is told
// nothing — never a "first" that was not. Her history is the last 30 days the phone reads
// (`@/api/hooks`' `antes`), so a kitchen silent for longer reads as never reserved.
// ⚠️ "TODAY" IS THE PHONE'S DAY (`diaTexto`), as every rule of *Hoy* is. `test/empujones.test.ts`
// pins every rule against a calendar.
// ============================================================================

/** Her first days with no offer on which *Publicar* glows. */
export const DIAS_QUE_BRILLA = 3;
/** The days each missing part of her page has its line — days she publishes. */
export const DIAS_POR_PARTE = 3;
/** How long a feature she did not pick stays off *Hoy*, from the first day this phone drew her *Hoy*. */
export const DIAS_ANTES_DE_OFRECER = 14;
/** The gap between two features' lines. */
export const DIAS_ENTRE_SERVICIOS = 7;

/** What a first was, on this phone: the zero seen, or done — absent until her history is read. */
export type Primera = 'cero' | 'hecha';

/** What is celebrated once. */
export type Festejo = 'oferta' | 'apartado' | 'entrega';

/** This phone's record of one kitchen's nudges. */
export interface Memoria {
  /** The first day this phone drew her *Hoy* — a feature she did not pick waits two weeks from it. */
  readonly desde: string | null;
  /** The first days her *Hoy* opened with no offer of hers ever — the glow's three. */
  readonly sinOferta: readonly string[];
  /** Each missing part of her page: the days its line was shown, up to three. */
  readonly pagina: Readonly<Partial<Record<Pendiente, readonly string[]>>>;
  /** A feature she did not pick: the one day its line was shown, and whether she closed it. */
  readonly servicio: Readonly<Partial<Record<Elegible, { readonly dia: string; readonly cerrado: boolean }>>>;
  /** Her first offer celebrated. */
  readonly oferta: boolean;
  readonly apartado: Primera | null;
  readonly entrega: Primera | null;
  /** ⚠️ `10.9e-ii`: her card's first stamp — the zero seen in its counts, then done. */
  readonly sello: Primera | null;
  /** The features whose *Así funciona* she used or closed. */
  readonly vistos: readonly Elegible[];
}

export const MEMORIA_VACIA: Memoria = {
  desde: null,
  sinOferta: [],
  pagina: {},
  servicio: {},
  oferta: false,
  apartado: null,
  entrega: null,
  sello: null,
  vistos: [],
};

// ----------------------------------------------------------------------------
// The record, on the phone
// ----------------------------------------------------------------------------

/** The key a kitchen's record is kept under. */
export function clave(kitchenId: string): string {
  return `wera-cocina.hoy.empujones.${kitchenId}`;
}

const DIA = /^\d{4}-\d{2}-\d{2}$/;
const esDia = (v: unknown): v is string => typeof v === 'string' && DIA.test(v);
const dias = (v: unknown): string[] => (Array.isArray(v) ? v.filter(esDia) : []);
const primera = (v: unknown): Primera | null => (v === 'cero' || v === 'hecha' ? v : null);
const PENDIENTES_DE_PAGINA: readonly Pendiente[] = ['nombreGiro', 'direccion', 'frase', 'oferta', 'portada'];
const ELEGIBLES: readonly Elegible[] = ['tarjeta', 'promociones', 'numeros'];

/** A record read back — anything it cannot read is left out, never an error. */
export function memoriaDe(texto: string | null): Memoria {
  if (texto === null) return MEMORIA_VACIA;
  let crudo: unknown;
  try {
    crudo = JSON.parse(texto);
  } catch {
    return MEMORIA_VACIA;
  }
  if (typeof crudo !== 'object' || crudo === null || Array.isArray(crudo)) return MEMORIA_VACIA;
  const m = crudo as Record<string, unknown>;
  const pagina: Partial<Record<Pendiente, string[]>> = {};
  const pag = typeof m.pagina === 'object' && m.pagina !== null ? (m.pagina as Record<string, unknown>) : {};
  for (const p of PENDIENTES_DE_PAGINA) if (Array.isArray(pag[p])) pagina[p] = dias(pag[p]);
  const servicio: Partial<Record<Elegible, { dia: string; cerrado: boolean }>> = {};
  const serv = typeof m.servicio === 'object' && m.servicio !== null ? (m.servicio as Record<string, unknown>) : {};
  for (const s of ELEGIBLES) {
    const r = serv[s] as { dia?: unknown; cerrado?: unknown } | undefined;
    if (typeof r === 'object' && r !== null && esDia(r.dia)) servicio[s] = { dia: r.dia, cerrado: r.cerrado === true };
  }
  return {
    desde: esDia(m.desde) ? m.desde : null,
    sinOferta: dias(m.sinOferta).slice(0, DIAS_QUE_BRILLA),
    pagina,
    servicio,
    oferta: m.oferta === true,
    apartado: primera(m.apartado),
    sello: primera(m.sello),
    entrega: primera(m.entrega),
    vistos: Array.isArray(m.vistos) ? ELEGIBLES.filter((s) => (m.vistos as unknown[]).includes(s)) : [],
  };
}

/** A kitchen's record, read now. */
export function leerMemoria(store: DeviceStore | undefined, kitchenId: string): Memoria {
  return memoriaDe(readKey(store, clave(kitchenId)));
}

/** Read, change, write — at once, so a copy held elsewhere never writes its old fields back. Written only when it changed. */
export function cambiarMemoria(store: DeviceStore | undefined, kitchenId: string, cambio: (m: Memoria) => Memoria): Memoria {
  const antes = leerMemoria(store, kitchenId);
  const despues = cambio(antes);
  if (JSON.stringify(despues) !== JSON.stringify(antes)) writeKey(store, clave(kitchenId), JSON.stringify(despues));
  return despues;
}

/** A kitchen's record for a screen: read once, and changed through `cambiarMemoria`. */
export function useMemoria(kitchenId: string): readonly [Memoria, (cambio: (m: Memoria) => Memoria) => void] {
  const [memoria, setMemoria] = useState(() => leerMemoria(deviceStore(), kitchenId));
  const cambiar = useCallback(
    (cambio: (m: Memoria) => Memoria) => {
      const nueva = cambiarMemoria(deviceStore(), kitchenId, cambio);
      setMemoria((vieja) => (JSON.stringify(vieja) === JSON.stringify(nueva) ? vieja : nueva));
    },
    [kitchenId],
  );
  return [memoria, cambiar] as const;
}

// ----------------------------------------------------------------------------
// Days
// ----------------------------------------------------------------------------

/** Whole days from `de` to `a`, both `YYYY-MM-DD`. */
export function diasEntre(de: string, a: string): number {
  return Math.round((Date.parse(`${a}T00:00:00Z`) - Date.parse(`${de}T00:00:00Z`)) / 86_400_000);
}

// ----------------------------------------------------------------------------
// *Hoy*: the invitation, the glow, the one line
// ----------------------------------------------------------------------------

/** She has never published — no offer of hers, any day, but one taken back by *Deshacer*. */
export function nuncaPublico(listings: readonly Listing[]): boolean {
  return !listings.some((l) => !deshecha(l));
}

/** A part of her page the line can name — her first offer is the invitation's, never a line. */
export type ParteDePagina = Exclude<Pendiente, 'oferta'>;

/** The one line under the day's card, and where a tap takes her. */
export type Linea =
  | { readonly kind: 'pagina'; readonly pendiente: ParteDePagina; readonly abre: Href }
  | { readonly kind: 'servicio'; readonly servicio: Elegible; readonly abre: Href };

/** What *Hoy* is read from. ⚠️ `estado` and `loQueUsa` are `null` until read: a line waits for them. */
export interface EntradaDeHoy {
  readonly listings: readonly Listing[];
  /** Her page's checklist (`@/lib/hoy`'s `estadoDe`) — `null` until her place and her page are read. */
  readonly estado: Estado | null;
  readonly loQueUsa: LoQueUsa | null;
  /** Her page's line ended with its ✕. */
  readonly paginaCerrada: boolean;
  readonly ahora: Date;
  /** The features this build carries (`@/lib/loQueUsas`' `construidos`). */
  readonly hechos?: readonly Elegible[];
  /**
   * ⚠️ `10.9b-ii`: SHE IS THE KITCHEN'S OWNER (`@/api/equipo`' `esDuena`). The line is about her
   * page and her features, both the owner's (G18), so a helper's *Hoy* never draws it — nor while
   * her role is not read yet. The invitation and the glow are publishing's, and a helper publishes
   * too (G36), so they stay.
   */
  readonly duena: boolean;
}

/** What *Hoy* draws of the nudges, and what it records of today. */
export interface VistaDeHoy {
  /** The day's card is the invitation. */
  readonly invitacion: boolean;
  /** *Publicar* glows at this open. */
  readonly brilla: boolean;
  readonly linea: Linea | null;
  /** Today's marks, made on any record — the same answer however often it runs. */
  readonly registrar: (m: Memoria) => Memoria;
  /** What `registrar` marks, as one string: a screen marks again only when it changes. */
  readonly marca: string;
}

/** The first day, and today among her first three with no offer. */
function conElDia(m: Memoria, hoy: string, nunca: boolean): Memoria {
  const desde = m.desde ?? hoy;
  const sinOferta =
    nunca && !m.sinOferta.includes(hoy) && m.sinOferta.length < DIAS_QUE_BRILLA ? [...m.sinOferta, hoy] : m.sinOferta;
  return desde === m.desde && sinOferta === m.sinOferta ? m : { ...m, desde, sinOferta };
}

/** Today counted for the line she sees. */
function conLaLinea(m: Memoria, linea: Linea | null, hoy: string): Memoria {
  if (linea === null) return m;
  if (linea.kind === 'pagina') {
    const vistos = m.pagina[linea.pendiente] ?? [];
    return vistos.includes(hoy) ? m : { ...m, pagina: { ...m.pagina, [linea.pendiente]: [...vistos, hoy] } };
  }
  return m.servicio[linea.servicio] !== undefined
    ? m
    : { ...m, servicio: { ...m.servicio, [linea.servicio]: { dia: hoy, cerrado: false } } };
}

/** At most one line: her page's next missing part, else — two weeks in — a feature she did not pick. */
export function lineaDe(m: Memoria, x: EntradaDeHoy, hoy: string): Linea | null {
  // `10.9b-ii`: her page and her features are the owner's — a helper is never nudged about them.
  if (!x.duena) return null;
  // Only on a day she published (the page's `nudgeLine`): she is looking at her offer then.
  if (deHoy(x.listings, x.ahora).length === 0) return null;
  // Every read the line counts, or none yet: never a line that changes under her thumb.
  if (x.estado === null || x.loQueUsa === null) return null;
  if (!x.paginaCerrada) {
    const parte = faltanDe(x.estado)
      .filter((p): p is ParteDePagina => p !== 'oferta')
      .find((p) => {
        const vistos = m.pagina[p] ?? [];
        return vistos.includes(hoy) || vistos.length < DIAS_POR_PARTE;
      });
    if (parte !== undefined) return { kind: 'pagina', pendiente: parte, abre: DONDE_SE_HACE[parte] };
  }
  if (m.desde === null || diasEntre(m.desde, hoy) < DIAS_ANTES_DE_OFRECER) return null;
  const loQueUsa = x.loQueUsa;
  const sinElegir = elegibles(loQueUsa, x.hechos ?? construidos()).filter((s) => loQueUsa.elecciones[s]?.estado !== 'on');
  const deHoyMismo = sinElegir.find((s) => m.servicio[s]?.dia === hoy);
  if (deHoyMismo !== undefined) {
    return m.servicio[deHoyMismo]?.cerrado ? null : { kind: 'servicio', servicio: deHoyMismo, abre: activarDe(deHoyMismo) };
  }
  const ultimo = Object.values(m.servicio).reduce<string | null>((a, r) => (r === undefined ? a : a === null || r.dia > a ? r.dia : a), null);
  if (ultimo !== null && diasEntre(ultimo, hoy) < DIAS_ENTRE_SERVICIOS) return null;
  const siguiente = sinElegir.find((s) => m.servicio[s] === undefined);
  return siguiente === undefined ? null : { kind: 'servicio', servicio: siguiente, abre: activarDe(siguiente) };
}

/** A feature's *Activar* — what it is, what it asks of her, and the button (`10.9a-ii`). */
export function activarDe(servicio: Elegible): Href {
  return `/activar/${servicio}` as Href;
}

/** What *Hoy* draws of the nudges at `x.ahora`, from this phone's record. */
export function verHoy(m: Memoria, x: EntradaDeHoy): VistaDeHoy {
  const hoy = diaTexto(x.ahora);
  const nunca = nuncaPublico(x.listings);
  const conHoy = conElDia(m, hoy, nunca);
  const linea = lineaDe(conHoy, x, hoy);
  const deLaLinea = linea === null ? '-' : linea.kind === 'pagina' ? `p:${linea.pendiente}` : `s:${linea.servicio}`;
  return {
    invitacion: nunca,
    brilla: nunca && conHoy.sinOferta.includes(hoy),
    linea,
    registrar: (otra) => conLaLinea(conElDia(otra, hoy, nunca), linea, hoy),
    marca: `${hoy}|${nunca ? 'nunca' : 'ya'}|${deLaLinea}`,
  };
}

/** A feature's line closed with its ✕ — or open again, by *Deshacer*. Its day stays its one day. */
export function cerrarServicio(m: Memoria, servicio: Elegible, cerrado: boolean): Memoria {
  const r = m.servicio[servicio];
  return r === undefined || r.cerrado === cerrado ? m : { ...m, servicio: { ...m.servicio, [servicio]: { ...r, cerrado } } };
}

// ----------------------------------------------------------------------------
// The firsts
// ----------------------------------------------------------------------------

/** Her first offer, about to be published: celebrated if she never published and this phone never celebrated it. */
export function ofertaDeEstreno(m: Memoria, listings: readonly Listing[] | undefined): boolean {
  return listings !== undefined && !m.oferta && nuncaPublico(listings);
}

/** Her first offer celebrated. */
export function ofertaFestejada(m: Memoria): Memoria {
  return m.oferta ? m : { ...m, oferta: true };
}

/** One first, read again: the zero kept until something comes, then done — celebrated only if the zero was seen. */
export function primeraDe(antes: Primera | null, hay: boolean): { readonly ahora: Primera; readonly festejar: boolean } {
  if (!hay) return { ahora: antes ?? 'cero', festejar: false };
  return { ahora: 'hecha', festejar: antes === 'cero' };
}

/** What her reservations hold of the two firsts: any reservation, any handover. */
export interface Hay {
  readonly apartado: boolean;
  readonly entrega: boolean;
}

/** Her reservations read (the 30 days and today's, with what waits in her queue — a handover sent with no signal counts). */
export function hayDe(reservas: readonly Reserva[]): Hay {
  return { apartado: reservas.length > 0, entrega: reservas.some((r) => r.entregadaEn !== null) };
}

/**
 * Her reservations read again: her first reservation and her first handover. ⚠️ ONE CELEBRATION
 * AT A TIME — when both came in one read, the handover, the later of the two.
 */
export function primerasDe(m: Memoria, hay: Hay): { readonly memoria: Memoria; readonly festejo: Festejo | null } {
  const apartado = primeraDe(m.apartado, hay.apartado);
  const entrega = primeraDe(m.entrega, hay.entrega);
  const memoria = apartado.ahora === m.apartado && entrega.ahora === m.entrega ? m : { ...m, apartado: apartado.ahora, entrega: entrega.ahora };
  return { memoria, festejo: entrega.festejar ? 'entrega' : apartado.festejar ? 'apartado' : null };
}

/**
 * ⚠️ `10.9e-ii`: HER CARD'S FIRST STAMP (*Diste tu primer sello*, the page's `firstToast('sello', …)`) — from
 * its counts as `kitchen_card` reads them: nothing going, nothing today, nothing to give is the zero; any of
 * them after it, the first. As her other firsts, only if this phone saw the zero (`primeraDe`).
 */
export function primerSelloDe(m: Memoria, cuentas: { readonly cards: number; readonly stamps_today: number; readonly rewards_to_give: number }): {
  readonly memoria: Memoria;
  readonly festejar: boolean;
} {
  const hay = cuentas.cards > 0 || cuentas.stamps_today > 0 || cuentas.rewards_to_give > 0;
  const visto = primeraDe(m.sello, hay);
  return { memoria: visto.ahora === m.sello ? m : { ...m, sello: visto.ahora }, festejar: visto.festejar };
}

// ----------------------------------------------------------------------------
// *Así funciona*
// ----------------------------------------------------------------------------

/** The strip shows until she uses the feature or closes it. */
export function asiFuncionaVisible(m: Memoria, servicio: Elegible): boolean {
  return !m.vistos.includes(servicio);
}

/** Used or closed: the strip never shows again on this phone. */
export function asiFuncionaVisto(m: Memoria, servicio: Elegible): Memoria {
  return m.vistos.includes(servicio) ? m : { ...m, vistos: [...m.vistos, servicio] };
}
