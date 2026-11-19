import type MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { ComponentProps } from 'react';

import { apiErrorMessage } from '@/api/errors';
import { NINGUNA, guardada, pathOf, type Foto } from '@/api/fotos';
import {
  ACTIVAS_MAX,
  CONDICIONES_MAX,
  DIAS,
  DIAS_MAX,
  LO_QUE_MAX,
  MAS_MAX,
  NO_ES_DUENA,
  NO_SE_OFRECE,
  NO_SE_PUEDE_UNIR,
  SIN_TARJETA,
  TRES_ACTIVAS,
  YA_NO_SE_DESHACE,
  diaDeLaSemana,
  type Borrador as Envio,
  type Dia,
  type PromotionRow,
  type PromotionsRow,
  type Tipo,
} from '@/api/promociones';
import { enUso, type LoQueUsa } from '@/api/servicios';
import { construidos, type Elegible, type EnVivo } from '@/lib/loQueUsas';
import { ES } from '@/strings';

// ============================================================================
// PROMOTIONS IN WERA COCINA — WHAT EACH SCREEN SAYS AND WHAT EACH TAP SENDS, PURE. Plan task
// `10.9g-ii`, on `0087`'s functions (`@/api/promociones`, `10.9g-i`). The owner's rulings of
// 2026-11-05 (calls 23–25: an offer and a promotion are two records; four kinds; days; an end date
// required, eight weeks at most; conditions written for her with her kitchen's name and address;
// a live preview; *Deshacer*; *Terminarla hoy*) and G18, G28–G30 and G36 of 2026-11-16 and 17, as the
// family-shell page draws stage 4 (`cPromos`, `promoForm`, `promoSheet`, `promoBand`, `liveTile`).
//
// ⚠️ DAYS ARE CALENDAR DAYS, `YYYY-MM-DD`, IN THE PHONE'S ZONE — the kitchen's, in the pilot, as every
// date this app draws (`@/lib/tarjeta`). The database holds them in her kitchen's zone; its answer's
// `day` is the day it read in.
// ⚠️ A PROMOTION IS NEVER EDITED: *Usarla otra vez* fills a new form from an old one (`borradorDe`),
// and what it publishes is a new promotion with a new id.
// ⚠️ THE OWNER'S (G18): a helper never reaches these screens, and the database refuses her `42501`.
// A helper only answers *¿Es parte de una promoción?* in *Publicar* (G36) — `activasEl`, the api's.
// ⚠️ NOT *AVISAR A QUIENES TE SIGUEN*: the alert is `10.9h`'s, his product analyst's.
// `test/promocionesCocina.test.ts` pins every rule here against a calendar.
// ============================================================================

type Icono = ComponentProps<typeof MaterialCommunityIcons>['name'];

/** Each kind's picture — its tile on the form, its row, its chip in *Publicar* and its mark. Held to the glyph map. */
export const ICONO_DE_TIPO: Readonly<Record<Tipo, Icono>> = {
  nuevo: 'creation',
  temporada: 'leaf',
  dia: 'calendar-star',
  clientes: 'gift-outline',
};

/** The four kinds, in the drawing's order — *Para tus clientes* only while her card is open (G28). */
export function tiposDe(conTarjeta: boolean): Tipo[] {
  return conTarjeta ? ['nuevo', 'temporada', 'dia', 'clientes'] : ['nuevo', 'temporada', 'dia'];
}

// ---- days, as calendar text -----------------------------------------------------------------

/** `at` as the calendar day it falls on, in the phone's zone. */
export function hoyDe(at: Date): string {
  const m = String(at.getMonth() + 1).padStart(2, '0');
  const d = String(at.getDate()).padStart(2, '0');
  return `${at.getFullYear()}-${m}-${d}`;
}

/** `dia` moved `n` days, by the calendar — never by 24-hour steps. */
export function sumarDias(dia: string, n: number): string {
  const [y, m, d] = dia.split('-').map(Number);
  const at = new Date(Date.UTC(y, m - 1, d + n));
  return at.toISOString().slice(0, 10);
}

/** The last day a promotion made on `hoy` may run to: eight weeks on (`0087`'s 56 days). */
export function ultimoDia(hoy: string): string {
  return sumarDias(hoy, DIAS_MAX);
}

/** *Hasta el 30 de noviembre*: the day of the month and its month. */
export function delMes(dia: string): string {
  const [, m, d] = dia.split('-').map(Number);
  return ES.fechas.delMes(d, ES.fechas.meses[m - 1]);
}

/** *lunes 30 de noviembre*: its weekday, the day of the month and its month. */
export function conSuDia(dia: string): string {
  return `${ES.promociones.diaDeSemana[diaDeLaSemana(dia) - 1]} ${delMes(dia)}`;
}

/** Every weekday — *Todos*. */
export const TODOS: readonly Dia[] = DIAS;

/** Whether the days are all seven (*Todos*). */
export function sonTodos(dias: readonly Dia[]): boolean {
  return DIAS.every((d) => dias.includes(d));
}

/**
 * A day chip tapped (the drawing's `pf-day`): *Todos* is all seven; a day tapped while all seven are on
 * is that day alone; else it is added or taken away — and none left is *Todos* again. Always in order.
 */
export function tocarDia(dias: readonly Dia[], tocado: Dia | 'todos'): Dia[] {
  if (tocado === 'todos') return [...DIAS];
  if (sonTodos(dias)) return [tocado];
  const con = dias.includes(tocado) ? dias.filter((d) => d !== tocado) : [...dias, tocado];
  return con.length === 0 ? [...DIAS] : DIAS.filter((d) => con.includes(d));
}

/** *Todos los días*, *Los jueves*, *Los lunes, miércoles y viernes* — the drawing's `daysTxt`. */
export function diasTexto(dias: readonly Dia[]): string {
  if (sonTodos(dias)) return ES.promociones.todosLosDias;
  const nombres = DIAS.filter((d) => dias.includes(d)).map((d) => ES.promociones.losDias[d - 1]);
  const ultimo = nombres.pop() as string;
  return ES.promociones.los(nombres.length === 0 ? ultimo : `${nombres.join(', ')} y ${ultimo}`);
}

/** The mark her offers wear and her page's band carries (call 25): *Un día especial*'s is its days. */
export function marcaDe(tipo: Tipo, dias: readonly Dia[]): string {
  if (tipo === 'dia') return sonTodos(dias) ? ES.promociones.marcas.especial : diasTexto(dias);
  return ES.promociones.marcas[tipo];
}

// ---- its end: *¿Hasta cuándo?* ----------------------------------------------------------------

export const HASTAS = ['semana', 'dos', 'mes', 'otra'] as const;
export type Hasta = { readonly eleccion: 'semana' | 'dos' | 'mes' } | { readonly eleccion: 'otra'; readonly dia: string };

/**
 * Her last day, from `hoy`: *Esta semana* is this Sunday (today, on a Sunday); *Dos semanas* fourteen days
 * on; *Fin de mes* the month's last day; *Otra fecha…* the day she picked. Each inside eight weeks.
 */
export function hastaDe(hasta: Hasta, hoy: string): string {
  switch (hasta.eleccion) {
    case 'semana':
      return sumarDias(hoy, 7 - diaDeLaSemana(hoy));
    case 'dos':
      return sumarDias(hoy, 14);
    case 'mes': {
      const [y, m] = hoy.split('-').map(Number);
      return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
    }
    case 'otra':
      return hasta.dia;
  }
}

/** Whether `dia` is a last day the database takes for a promotion made on `hoy`: today to eight weeks on. */
export function dentroDelPlazo(dia: string, hoy: string): boolean {
  return dia >= hoy && dia <= ultimoDia(hoy);
}

/** One week of *Otra fecha…*'s calendar: seven cells, Monday first, each a day she may pick or `null`. */
export interface Semana {
  /** The month its first pickable day is in — *noviembre 2026* — said above the week that starts a month. */
  readonly mes: string | null;
  readonly dias: readonly ({ readonly dia: string; readonly numero: number } | null)[];
}

/**
 * ⚠️ *OTRA FECHA…* WITH NO NATIVE PICKER (a date picker is a native module, and a native module is a new
 * store build): the weeks from this one to the one holding her last possible day, Monday first, every
 * day from today to eight weeks on pickable and the rest blank. A month's name heads the week its first
 * day falls in.
 */
export function calendarioDe(hoy: string): Semana[] {
  const ultimo = ultimoDia(hoy);
  const semanas: Semana[] = [];
  let lunes = sumarDias(hoy, 1 - diaDeLaSemana(hoy));
  let mesVisto: string | null = null;
  while (lunes <= ultimo) {
    const dias = Array.from({ length: 7 }, (_, i) => {
      const dia = sumarDias(lunes, i);
      return dia >= hoy && dia <= ultimo ? { dia, numero: Number(dia.slice(8)) } : null;
    });
    const primero = dias.find((d) => d !== null && (mesVisto === null || d.dia.slice(0, 7) !== mesVisto)) ?? null;
    let mes: string | null = null;
    if (primero !== null) {
      mesVisto = primero.dia.slice(0, 7);
      const [y, m] = mesVisto.split('-').map(Number);
      mes = ES.promociones.mesDe(ES.fechas.meses[m - 1], y);
    }
    semanas.push({ mes, dias });
    lunes = sumarDias(lunes, 7);
  }
  return semanas;
}

// ---- the conditions, written for her ----------------------------------------------------------

/** A day and its year when the two ends are not in the same one: *del 28 de diciembre de 2026 al 4 de enero de 2027*. */
function periodo(desde: string, hasta: string): string {
  const mismoAnio = desde.slice(0, 4) === hasta.slice(0, 4);
  const inicio = mismoAnio ? delMes(desde) : ES.promociones.conAnio(delMes(desde), desde.slice(0, 4));
  return ES.promociones.periodo(inicio, ES.promociones.conAnio(delMes(hasta), hasta.slice(0, 4)));
}

/**
 * *Condiciones · las verán tus vecinos* (call 25; LFPC Art. 48 asks for a promotion's conditions and how
 * long it lasts): *Con tu tarjeta de lealtad.* for her customers' kind, her days, from today to her last
 * day, and her kitchen's name and address — the drawing's `condTxt`. Before she picks an end, *desde el …*.
 */
export function condicionesDe(
  b: { readonly tipo: Tipo; readonly dias: readonly Dia[]; readonly hasta: string | null },
  hoy: string,
  cocina: string,
  direccion: string | null,
): string {
  const cuando = b.hasta === null ? ES.promociones.desde(ES.promociones.conAnio(delMes(hoy), hoy.slice(0, 4))) : periodo(hoy, b.hasta);
  const partes = [`${diasTexto(b.dias)}, ${cuando}, ${ES.promociones.en(cocina, direccion)}`];
  if (b.tipo === 'clientes') partes.unshift(ES.promociones.conTarjeta);
  return partes.join(' ');
}

// ---- the form: *Nueva promoción* ----------------------------------------------------------------

/** What *Nueva promoción* holds while she fills it. */
export interface Borrador {
  readonly tipo: Tipo;
  readonly loQue: string;
  readonly mas: string;
  readonly foto: Foto;
  readonly dias: readonly Dia[];
  readonly hasta: Hasta | null;
  /** Her own conditions after *Cambiar* — `null` while they are written for her from the fields. */
  readonly condiciones: string | null;
}

/** A new form: *Platillo nuevo*, every day, no end yet (the drawing's `freshPromo`). */
export const NUEVO: Borrador = { tipo: 'nuevo', loQue: '', mas: '', foto: NINGUNA, dias: TODOS, hasta: null, condiciones: null };

/**
 * *Usarla otra vez* (the drawing's `promo-again`): its kind, what, more, photo and days — never its end,
 * which was its own, nor its conditions, which named its dates. *Para tus clientes* with her card closed
 * starts as *Platillo nuevo*: that kind is not offered then (G28).
 */
export function borradorDe(p: PromotionRow, conTarjeta: boolean): Borrador {
  return {
    ...NUEVO,
    tipo: p.kind === 'clientes' && !conTarjeta ? 'nuevo' : p.kind,
    loQue: p.what,
    mas: p.more ?? '',
    foto: guardada(p.image_path),
    dias: p.days,
  };
}

/** Her last day as the form stands, or `null` before she picked one. */
export function hastaDelBorrador(b: Borrador, hoy: string): string | null {
  return b.hasta === null ? null : hastaDe(b.hasta, hoy);
}

/** The conditions it will publish: hers after *Cambiar*, else written from the fields. */
export function condicionesDelBorrador(b: Borrador, hoy: string, cocina: string, direccion: string | null): string {
  return b.condiciones ?? condicionesDe({ tipo: b.tipo, dias: b.dias, hasta: hastaDelBorrador(b, hoy) }, hoy, cocina, direccion);
}

/** One line, as the database keeps it: no line break, no tab, no control character — every run of space one space. */
export function enUnaLinea(texto: string): string {
  return texto
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Its conditions as sent: line breaks kept, every other control character a space, trimmed. */
export function condicionesLimpias(texto: string): string {
  return texto.replace(/\r\n?/g, '\n').replace(/[\u0000-\u0009\u000B-\u001F\u007F-\u009F]/g, ' ').trim();
}

/**
 * ⚠️ EVERY RULE CHECKED BEFORE ANYTHING IS SENT, in the order she fills the form — one sentence, or `null`.
 * The database checks the same and answers `22023`; three at once and her card are its words too.
 */
export function revisar(b: Borrador, hoy: string, row: PromotionsRow | null, cocina: string, direccion: string | null): string | null {
  const e = ES.nuevaPromocion.errores;
  if (b.tipo === 'clientes' && row !== null && !row.card_open) return ES.promocionErrores.sinTarjeta;
  if (enUnaLinea(b.loQue) === '') return e.que;
  if (b.tipo === 'dia' && sonTodos(b.dias)) return e.dia;
  const hasta = hastaDelBorrador(b, hoy);
  if (hasta === null) return e.hasta;
  if (!dentroDelPlazo(hasta, hoy)) return e.plazo;
  const condiciones = condicionesLimpias(condicionesDelBorrador(b, hoy, cocina, direccion));
  if (condiciones === '') return e.condiciones;
  // Written for her, a long name and address can pass the database's 400: she shortens them — never cut mid-sentence.
  if (condiciones.length > CONDICIONES_MAX) return e.condicionesLargas;
  if (row !== null && row.running >= (row.max || ACTIVAS_MAX)) return ES.promocionErrores.tres;
  return null;
}

/** What one press of *Publicar promoción* hands `@/api/promociones`' `createArgs` — after `revisar` said nothing. */
export function envioDe(b: Borrador, hoy: string, cocina: string, direccion: string | null): Envio {
  return {
    tipo: b.tipo,
    loQue: enUnaLinea(b.loQue).slice(0, LO_QUE_MAX),
    mas: enUnaLinea(b.mas).slice(0, MAS_MAX),
    foto: pathOf(b.foto),
    dias: b.dias,
    hasta: hastaDelBorrador(b, hoy) as string,
    condiciones: condicionesLimpias(condicionesDelBorrador(b, hoy, cocina, direccion)).slice(0, CONDICIONES_MAX),
  };
}

/**
 * ⚠️ *DE TEMPORADA*'S HINT (the drawing: *"For De temporada the app's calendar suggests"*) — a hint, never a
 * default: from 1 November to 24 December, the posadas and three dishes; outside it, none. One season,
 * the drawn one; another is a row here.
 */
export function temporadaDe(hoy: string): { readonly pista: string; readonly ejemplos: readonly string[] } | null {
  const mmdd = hoy.slice(5);
  if (mmdd >= '11-01' && mmdd <= '12-24') return { pista: ES.nuevaPromocion.posadas, ejemplos: ES.nuevaPromocion.posadasEjemplos };
  return null;
}

// ---- her list: *Promociones* -------------------------------------------------------------------

/** The running ones, as the database orders them (newest first). */
export function activas(row: PromotionsRow): PromotionRow[] {
  return row.promotions.filter((p) => p.state === 'activa');
}

/** Under each row's name: *Platillo nuevo · todos los días · hasta el 30 de noviembre*, or *… · terminó el 18 de noviembre*. */
export function filaDe(p: PromotionRow): string {
  const tipo = ES.promociones.tipos[p.kind];
  if (p.state === 'activa') return ES.promociones.filaActiva(tipo, diasTexto(p.days).toLowerCase(), delMes(p.ends_on));
  return ES.promociones.filaTerminada(tipo, delMes(p.ended_on ?? p.ends_on));
}

/** *Tu promoción*'s line: seen or not, and how many of today's offers wear its mark; or that it ended. */
export function estadoDe(p: PromotionRow): string {
  if (p.state !== 'activa') return ES.promociones.terminada;
  if (!p.shown) return ES.promociones.noSeVe;
  return p.offers_today > 0 ? `${ES.promociones.seVe} ${ES.promociones.ofertasHoy(p.offers_today)}` : ES.promociones.seVe;
}

/** The band as her page will show it (`@/ui/BandaPromocion`): the mark, *hasta el …*, what, more. */
export interface Banda {
  readonly tipo: Tipo;
  readonly marca: string;
  readonly hasta: string | null;
  readonly loQue: string;
  readonly mas: string | null;
}

export function bandaDe(p: { readonly tipo: Tipo; readonly dias: readonly Dia[]; readonly hasta: string | null; readonly loQue: string; readonly mas: string | null }): Banda {
  const loQue = enUnaLinea(p.loQue);
  const mas = p.mas === null ? null : enUnaLinea(p.mas);
  return {
    tipo: p.tipo,
    marca: marcaDe(p.tipo, p.dias),
    hasta: p.hasta === null ? null : ES.promociones.hastaEl(delMes(p.hasta)),
    loQue: loQue === '' ? ES.promociones.ejemplos[p.tipo] : loQue,
    mas: mas === '' ? null : mas,
  };
}

/** A stored promotion's band. */
export function bandaDeFila(p: PromotionRow): Banda {
  return bandaDe({ tipo: p.kind, dias: p.days, hasta: p.state === 'activa' ? p.ends_on : null, loQue: p.what, mas: p.more });
}

// ---- *Hoy*'s tile, and who reads them ------------------------------------------------------------

/**
 * Whether her kitchen's promotions are read at all: Wera offers them, she uses them, and this build
 * carries their screens. Unread choices, no. A helper's phone reads them too — *Publicar* asks her.
 */
export function seLeen(loQueUsa: LoQueUsa | undefined, hechos: readonly Elegible[] = construidos()): boolean {
  return loQueUsa !== undefined && hechos.includes('promociones') && enUso(loQueUsa).includes('promociones');
}

/**
 * ⚠️ THE TILE ON *HOY* (the drawing's `liveTile('promos')`): before her first promotion ever, its first-time
 * state (`null`: *Crea tu primera promoción*, dashed); then the newest running one — *Agua de jamaica gratis*,
 * *Hasta el 30 de noviembre · y 1 más* — or *Ninguna ahora*. Its read failed: it says so, never a first time
 * that is not one.
 */
export function enVivoDe(row: PromotionsRow | null): EnVivo | null {
  if (row === null) return { valor: ES.promociones.tileSinLeer[0], detalle: ES.promociones.tileSinLeer[1], porHacer: false };
  if (row.promotions.length === 0) return null;
  const corren = activas(row);
  if (corren.length === 0) return { valor: ES.promociones.ninguna[0], detalle: ES.promociones.ninguna[1], porHacer: false };
  return { valor: corren[0].what, detalle: ES.promociones.tileHasta(delMes(corren[0].ends_on), corren.length - 1), porHacer: false };
}

// ---- refusals, in words ---------------------------------------------------------------------------

/** A refused or failed promotion's call, in words: each of `0087`'s codes; the rest as every call says it. */
export function promocionErrorMessage(thrown: unknown): string {
  const code = typeof thrown === 'object' && thrown !== null ? (thrown as { code?: unknown }).code : undefined;
  const e = ES.promocionErrores;
  switch (code) {
    case NO_ES_DUENA:
      return e.soloLaDuena;
    case NO_SE_OFRECE:
      return e.noDisponible;
    case TRES_ACTIVAS:
      return e.tres;
    case SIN_TARJETA:
      return e.sinTarjeta;
    case NO_SE_PUEDE_UNIR:
      return e.noSeUne;
    case YA_NO_SE_DESHACE:
      return e.yaNoSeDeshace;
    default:
      return apiErrorMessage(thrown);
  }
}

/** Whether a publication was refused because the promotion it joined cannot take it (`TD031`). */
export function noSeUne(thrown: unknown): boolean {
  return typeof thrown === 'object' && thrown !== null && (thrown as { code?: unknown }).code === NO_SE_PUEDE_UNIR;
}
