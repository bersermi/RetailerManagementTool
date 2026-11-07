// ============================================================================
// HER REMINDER — WHEN, ON WHICH DAYS, WHEN IT IS ASKED, AND WHAT EACH LINE SAYS. PURE.
// Plan task `10.5-v-c-ii`, the owner's rulings of 2026-11-05 (the family-shell page's
// call 21: *"the middle hour of two weeks, rounded down to the half hour, on the days
// she published at least twice; asked after her third offer"*) and the page's drawing
// of round 6 (the question once, under the doors on *Hoy*; *Recordatorio diario* in *Mi
// cocina*; its sheet with *Otra hora*):
//   - HER HOUR: the middle of the moments she published over her last two weeks — the
//     earlier of the two middles when they are even, a moment she really published —
//     rounded down to the half hour, so *16:10* is *16:00*, a little before she starts;
//   - HER DAYS: the weekdays she published on two different dates in those two weeks;
//   - ASKED once she has published three offers — never on her first day — and only
//     while the rule finds an hour and at least one day: it never invents a day for her;
//   - THE NOTIFICATION, *¿Qué ofreces hoy?* · *Publica tu oferta en un minuto.*, scheduled
//     by her phone every week on each of her days (`@/lib/avisos`), its tap opening
//     *Publicar una oferta*.
// ⚠️ AN OFFER TAKEN BACK BY *DESHACER* WAS NEVER PUBLISHED, here as on *Hoy*
// (`@/lib/hoy`'s `deshecha`). ⚠️ LOCAL TIME IS THE PHONE'S, which is in her kitchen.
// ⚠️ NOTHING LEAVES THE PHONE: her answer, the hour and the days are kept in the phone's
// own store, per kitchen (`@/lib/store`) — the aviso says so since this row.
// `test/recordatorio.test.ts` pins every rule against a calendar in Mexico City's zone.
// ============================================================================

import type { Listing } from '@/api/listing';
import { deshecha } from '@/lib/hoy';
import { readKey, writeKey, type DeviceStore } from '@/lib/store';
import { ES } from '@/strings';

const DIA_MS = 86_400_000;

/** Her last two weeks — the rule's window. */
export const DIAS_DE_COSTUMBRE = 14;
/** A day of hers is one she published on this many different dates in that window. */
export const VECES_POR_DIA = 2;
/** The question waits until she has published this many offers. */
export const OFERTAS_ANTES_DE_PREGUNTAR = 3;
/** Her hour is rounded down to this many minutes. */
export const REDONDEO_MINUTOS = 30;

/** A weekday, Monday first — 1 is Monday, 7 is Sunday (ISO's order, as the door counts). */
export type Dia = 1 | 2 | 3 | 4 | 5 | 6 | 7;
export const DIAS: readonly Dia[] = [1, 2, 3, 4, 5, 6, 7];

/** What the rule proposes to her. */
export interface Propuesta {
  /** The middle of her moments, in minutes after midnight — *Sueles publicar hacia las 16:10*. */
  readonly costumbre: number;
  /** Her hour, rounded down to the half hour, in minutes after midnight. */
  readonly hora: number;
  /** Her days, Monday first. Never empty. */
  readonly dias: readonly Dia[];
}

/** Her answer, as this phone keeps it for her kitchen: on or off, at which hour, on which days. */
export interface Recordatorio {
  readonly encendido: boolean;
  readonly hora: number;
  readonly dias: readonly Dia[];
}

// ----------------------------------------------------------------------------
// The rule
// ----------------------------------------------------------------------------

/** Her offers that count: every one but those taken back by *Deshacer*. */
function publicadas(listings: readonly Listing[]): Listing[] {
  return listings.filter((listing) => !deshecha(listing));
}

/** Those she published in the last two weeks, up to now. */
function recientes(listings: readonly Listing[], now: Date): Listing[] {
  const desde = now.getTime() - DIAS_DE_COSTUMBRE * DIA_MS;
  return publicadas(listings).filter((l) => l.createdAt.getTime() >= desde && l.createdAt.getTime() <= now.getTime());
}

/** A moment as minutes after midnight, on the phone's clock. */
export function minutosDe(at: Date): number {
  return at.getHours() * 60 + at.getMinutes();
}

/** The middle of the moments she published in the last two weeks, in minutes — the earlier middle of an even count. */
export function costumbreDe(listings: readonly Listing[], now: Date): number | null {
  const minutos = recientes(listings, now)
    .map((l) => minutosDe(l.createdAt))
    .sort((a, b) => a - b);
  if (minutos.length === 0) return null;
  return minutos[Math.floor((minutos.length - 1) / 2)];
}

/** Rounded down to the half hour: *16:10* is *16:00*, *16:30* stays. */
export function aLaMediaHora(minutos: number): number {
  return Math.floor(minutos / REDONDEO_MINUTOS) * REDONDEO_MINUTOS;
}

/** Monday first: `getDay()` is 0 for Sunday. */
export function diaDe(at: Date): Dia {
  return (((at.getDay() + 6) % 7) + 1) as Dia;
}

/** The weekdays she published on two different dates in the last two weeks, Monday first. */
export function diasDeCostumbre(listings: readonly Listing[], now: Date): Dia[] {
  const fechas = new Map<Dia, Set<string>>();
  for (const listing of recientes(listings, now)) {
    const at = listing.createdAt;
    const dia = diaDe(at);
    const conjunto = fechas.get(dia) ?? new Set<string>();
    conjunto.add(`${at.getFullYear()}-${at.getMonth()}-${at.getDate()}`);
    fechas.set(dia, conjunto);
  }
  return DIAS.filter((dia) => (fechas.get(dia)?.size ?? 0) >= VECES_POR_DIA);
}

/** What the rule proposes — or `null` before her third offer, or while it finds no hour or no day. */
export function propuestaDe(listings: readonly Listing[], now: Date): Propuesta | null {
  if (publicadas(listings).length < OFERTAS_ANTES_DE_PREGUNTAR) return null;
  const costumbre = costumbreDe(listings, now);
  const dias = diasDeCostumbre(listings, now);
  if (costumbre === null || dias.length === 0) return null;
  return { costumbre, hora: aLaMediaHora(costumbre), dias };
}

/** Whether *Hoy* asks: she never answered on this phone, and the rule has something to propose. */
export function preguntar(guardado: Recordatorio | null, propuesta: Propuesta | null): boolean {
  return guardado === null && propuesta !== null;
}

/** The hours *Otra hora* offers: half an hour before hers, hers, and the next two half hours — within the day. */
export function horasDe(hora: number): number[] {
  const ultima = 24 * 60 - REDONDEO_MINUTOS;
  const horas = [hora - 30, hora, hora + 30, hora + 60].filter((h) => h >= 0 && h <= ultima);
  return [...new Set(horas)];
}

// ----------------------------------------------------------------------------
// What her phone schedules (`@/lib/avisos`)
// ----------------------------------------------------------------------------

/**
 * Expo's weekday for one of hers. ⚠️ EXPO COUNTS FROM SUNDAY — 1 is Sunday, 7 is
 * Saturday (`WeeklyTriggerInput`, `expo-notifications` 57) — and this module from
 * Monday, so Monday is 2 and Sunday 1.
 */
export function diaDeExpo(dia: Dia): number {
  return (dia % 7) + 1;
}

/** One weekly notification: which day, at what time, under which name on the phone. */
export interface Disparo {
  readonly id: string;
  readonly weekday: number;
  readonly hour: number;
  readonly minute: number;
}

/** The name every reminder is scheduled under — what is cancelled before scheduling again. */
export const PREFIJO = 'wera-cocina.recordatorio.';

/** Her notifications, one per day, every week — none when it is off. */
export function disparosDe(recordatorio: Recordatorio | null): Disparo[] {
  if (recordatorio === null || !recordatorio.encendido) return [];
  return recordatorio.dias.map((dia) => ({
    id: `${PREFIJO}${dia}`,
    weekday: diaDeExpo(dia),
    hour: Math.floor(recordatorio.hora / 60),
    minute: recordatorio.hora % 60,
  }));
}

/** Where a tap on the notification sends her — the one route it may open. */
export const RUTA = '/publicar';

/** A tap is followed this long after the notification was shown — never a stale one at a later launch. */
export const TOQUE_VIGENTE_MS = 60 * 60 * 1000;

/**
 * A notification's moment in milliseconds. ⚠️ THE TWO PHONES SAY IT DIFFERENTLY
 * (`expo-notifications` 57's native code, read 2026-11-06): Android in milliseconds
 * (`NotificationSerializer.java`, `getOriginDate().getTime()`), an iPhone in seconds
 * (`NotificationRecords.swift`, `timeIntervalSince1970`). No moment of this century is
 * under 10¹¹ milliseconds, so a smaller number is seconds.
 */
export function milisegundosDe(date: number): number {
  return date < 1e11 ? date * 1000 : date;
}

/**
 * Where a tap sends her: *Publicar* for one of her reminders shown within the hour —
 * anything else, nowhere. `ruta` is what the notification carries (`data.ruta`).
 */
export function rutaDelToque(toque: { readonly id: string; readonly date: number; readonly ruta: unknown }, ahora: number): string | null {
  if (!toque.id.startsWith(PREFIJO)) return null;
  if (ahora - milisegundosDe(toque.date) > TOQUE_VIGENTE_MS) return null;
  return toque.ruta === RUTA ? RUTA : null;
}

// ----------------------------------------------------------------------------
// Kept on this phone, per kitchen
// ----------------------------------------------------------------------------

/** The key a kitchen's reminder is kept under, beside *Hoy*'s closed door (`@/lib/puerta`). */
export function claveRecordatorio(kitchenId: string): string {
  return `wera-cocina.recordatorio.${kitchenId}`;
}

function esDia(valor: unknown): valor is Dia {
  return typeof valor === 'number' && Number.isInteger(valor) && valor >= 1 && valor <= 7;
}

/** What the store holds, read — or `null` for nothing, or for anything this build cannot read. */
export function leerRecordatorio(store: DeviceStore | undefined, kitchenId: string): Recordatorio | null {
  const texto = readKey(store, claveRecordatorio(kitchenId));
  if (texto === null) return null;
  try {
    const valor = JSON.parse(texto) as { encendido?: unknown; hora?: unknown; dias?: unknown };
    const { encendido, hora, dias } = valor;
    if (typeof encendido !== 'boolean') return null;
    if (typeof hora !== 'number' || !Number.isInteger(hora) || hora < 0 || hora >= 24 * 60) return null;
    if (!Array.isArray(dias) || dias.length === 0 || !dias.every(esDia)) return null;
    return { encendido, hora, dias: DIAS.filter((dia) => dias.includes(dia)) };
  } catch {
    return null;
  }
}

/** Her answer, kept. */
export function guardarRecordatorio(store: DeviceStore | undefined, kitchenId: string, recordatorio: Recordatorio): void {
  writeKey(store, claveRecordatorio(kitchenId), JSON.stringify(recordatorio));
}

// ----------------------------------------------------------------------------
// The words
// ----------------------------------------------------------------------------

/** *16:00*, *9:30* — Wera Cocina's clock (`@/lib/ventana`'s `clockOf`). */
export function horaTexto(minutos: number): string {
  return `${Math.floor(minutos / 60)}:${String(minutos % 60).padStart(2, '0')}`;
}

/**
 * Her days, as a sentence ends with them: *todos los días*, *de lunes a sábado* for three
 * or more in a row, else the days themselves — *los lunes y jueves*, *los sábados*.
 */
export function diasTexto(dias: readonly Dia[]): string {
  const orden = DIAS.filter((dia) => dias.includes(dia));
  if (orden.length === 7) return ES.recordatorio.todosLosDias;
  const seguidos = orden.length >= 3 && orden.every((dia, i) => i === 0 || dia === orden[i - 1] + 1);
  if (seguidos) return ES.recordatorio.deA(ES.recordatorio.dia[orden[0] - 1], ES.recordatorio.dia[orden[orden.length - 1] - 1]);
  return ES.recordatorio.los(orden.map((dia) => ES.recordatorio.losDias[dia - 1]));
}

/** *A las 16:00, de lunes a sábado* — her reminder's row in *Mi cocina*. */
export function cuandoTexto(recordatorio: { readonly hora: number; readonly dias: readonly Dia[] }): string {
  return ES.recordatorio.cuando(horaTexto(recordatorio.hora), diasTexto(recordatorio.dias));
}
