import type { EnElPeriodo, Numeros, Periodo } from '@/api/numeros';
import { enUso, type LoQueUsa } from '@/api/servicios';
import { formatMXN } from '@/format/mxn';
import type { Festejo } from '@/lib/empujones';
import { construidos, type Elegible, type EnVivo } from '@/lib/loQueUsas';
import { ES } from '@/strings';

// ============================================================================
// WHAT *TUS NÚMEROS* SAYS — PURE. Plan task `10.9f`, the owner's rulings G24–G27 of 2026-11-17 and the
// family-shell page's `cNumeros` (round 7): five questions answered for *Día · Semana · Mes* at her pick,
// each against the whole period before; *Tus días fuertes* (a week or a month) and *Tus horas fuertes*
// as two sets of bars; the tile on *Hoy*, this week's plates. The counts are `0086`'s (`@/api/numeros`):
// this file only says them.
//
// ⚠️ THE FLOOR IS THE DATABASE'S: a figure about people arrives `null` under five neighbours, and this
// says *Aparece desde cinco vecinos* — never a number it was not sent.
// ⚠️ A READ FROM ANOTHER DAY IS NOT TODAY'S (`leidoHoy`, by the phone's calendar): *Hoy* and the screen
// read them again rather than say yesterday's week as this one.
// `test/numeros.test.ts` pins every rule, in Mexico City's zone.
// ============================================================================

/**
 * Her numbers are hers to see (G18, G26): she is the kitchen's owner, she uses them, and this build carries
 * them — a helper's phone never asks, and *Hoy* draws no tile for them.
 */
export function veSusNumeros(loQueUsa: LoQueUsa | undefined, duena: boolean, hechos: readonly Elegible[] = construidos()): boolean {
  return duena && loQueUsa !== undefined && hechos.includes('numeros') && enUso(loQueUsa).includes('numeros');
}

/**
 * The words of a first's celebration: her first handover says her numbers start today when she sees them
 * (the page's `firstToast('entrega', …)`); every other first, its own.
 */
export function palabrasDelFestejo(festejo: Festejo, conNumeros: boolean): string {
  return festejo === 'entrega' && conNumeros ? ES.festejo.entregaConNumeros : ES.festejo[festejo];
}

/** Her pick when the screen opens — the drawing's (*Semana*). */
export const PERIODO_INICIAL: Periodo = 'semana';

/** A count as she reads it: *1,280*, and a fraction only if there is one (*2.5*). */
export function cifra(n: number): string {
  const redondo = Math.round(n * 1000) / 1000;
  const [entero, fraccion] = String(redondo).split('.');
  const agrupado = entero.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return fraccion === undefined ? agrupado : `${agrupado}.${fraccion}`;
}

/** One answered question: what it asks, the answer, what is under it, and a bar of how many came back. */
export interface Respuesta {
  readonly clave: 'platos' | 'visitas' | 'vecinos' | 'regresan' | 'pesos';
  readonly pregunta: string;
  readonly respuesta: string;
  readonly detalle: string;
  /** From 0 to 1 — only *¿Cuántos ya habían venido antes?*, and only when it is shown. */
  readonly barra: number | null;
}

/** *Esta semana · la anterior, 36*. */
function contraAntes(periodo: Periodo, antes: string): string {
  return ES.numeros.junto(ES.numeros.este[periodo], ES.numeros.contra(ES.numeros.anterior[periodo], antes));
}

/** A figure about people from the period before: its count, or *menos de cinco*. */
function personasAntes(n: number | null): string {
  return n === null ? ES.numeros.menosDeCinco : cifra(n);
}

/** The five answers for her pick, in the drawing's order. */
export function respuestasDe(numeros: Numeros, periodo: Periodo): Respuesta[] {
  const p: EnElPeriodo = numeros[periodo];
  const antes = p.prev;
  const visitasDetalle =
    p.walk_ins > 0
      ? ES.numeros.junto(ES.numeros.sinApartar(cifra(p.walk_ins)), ES.numeros.contra(ES.numeros.anterior[periodo], cifra(antes.visits)))
      : contraAntes(periodo, cifra(antes.visits));
  return [
    {
      clave: 'platos',
      pregunta: ES.numeros.preguntas.platos,
      respuesta: cifra(p.plates),
      detalle: contraAntes(periodo, cifra(antes.plates)),
      barra: null,
    },
    {
      clave: 'visitas',
      pregunta: ES.numeros.preguntas.visitas,
      respuesta: ES.numeros.visitas(cifra(p.visits), p.visits === 1),
      detalle: visitasDetalle,
      barra: null,
    },
    p.neighbours === null
      ? { clave: 'vecinos', pregunta: ES.numeros.preguntas.vecinos, respuesta: ES.numeros.nada, detalle: ES.numeros.desdeCinco, barra: null }
      : {
          clave: 'vecinos',
          pregunta: ES.numeros.preguntas.vecinos,
          respuesta: cifra(p.neighbours),
          detalle: contraAntes(periodo, personasAntes(antes.neighbours)),
          barra: null,
        },
    p.neighbours === null || p.returning === null
      ? { clave: 'regresan', pregunta: ES.numeros.preguntas.regresan, respuesta: ES.numeros.nada, detalle: ES.numeros.desdeCinco, barra: null }
      : {
          clave: 'regresan',
          pregunta: ES.numeros.preguntas.regresan,
          respuesta: ES.numeros.deCuantos(cifra(p.returning), cifra(p.neighbours)),
          detalle: ES.numeros.regresan(Math.round((p.returning * 100) / p.neighbours)),
          barra: p.returning / p.neighbours,
        },
    {
      clave: 'pesos',
      pregunta: ES.numeros.preguntas.pesos,
      respuesta: formatMXN(p.cents),
      detalle: ES.numeros.junto(ES.numeros.aPrecioPublicado, ES.numeros.contra(ES.numeros.anterior[periodo], formatMXN(antes.cents))),
      barra: null,
    },
  ];
}

/** One bar: its label and how many visits. */
export interface Barra {
  readonly etiqueta: string;
  readonly valor: number;
}

/**
 * *Tus días fuertes*: Monday to Sunday — for a week or a month; a single day has none. None either while
 * nobody came in the period: seven empty bars say nothing.
 */
export function diasFuertes(numeros: Numeros, periodo: Periodo): Barra[] {
  const p = numeros[periodo];
  if (periodo === 'dia' || p.visits === 0) return [];
  return p.days.map((valor, i) => ({ etiqueta: ES.numeros.dias[i], valor }));
}

/**
 * *Tus horas fuertes*: from her first hour with a visit to her last, the hours between them drawn too
 * (an empty hour inside her day is part of the answer); none while nobody came.
 */
export function horasFuertes(numeros: Numeros, periodo: Periodo): Barra[] {
  const horas = numeros[periodo].hours;
  const primera = horas.findIndex((n) => n > 0);
  if (primera < 0) return [];
  let ultima = horas.length - 1;
  while (horas[ultima] === 0) ultima -= 1;
  return horas.slice(primera, ultima + 1).map((valor, i) => ({ etiqueta: ES.numeros.hora(primera + i), valor }));
}

/** Under the title, true today: the stamps only while her kitchen uses the card. */
export function subtituloDe(conTarjeta: boolean): string {
  return conTarjeta ? ES.numeros.subtitulo : ES.numeros.subtituloSinTarjeta;
}

/**
 * Whether a read was made today, by the phone's own calendar (`dataUpdatedAt`) — a read from another day is
 * read again, never drawn as today's. ⚠️ NEVER the answer's `day` against the phone's: a phone set to another
 * zone would never agree, and would read again for ever. The card's tile keeps the same rule (`@/lib/tarjeta`'
 * `deHoy`).
 */
export function leidoHoy(leidoEn: number | null, ahora: Date): boolean {
  if (leidoEn === null || leidoEn <= 0) return false;
  const leido = new Date(leidoEn);
  return leido.getFullYear() === ahora.getFullYear() && leido.getMonth() === ahora.getMonth() && leido.getDate() === ahora.getDate();
}

/**
 * ⚠️ THE TILE ON *HOY*: before her first visit ever, its first-time state (`null`: *Empiezan con tu primera
 * entrega*); after, this week's plates against the whole week before — the drawing's *41 platos*, said as
 * the screen says it (*la anterior, 36*) rather than *5 más*, which on a Tuesday weighs two days against
 * seven. Its read failed: it says so (`tileSinLeer`), never a first time that is not one.
 */
export function enVivoDe(numeros: Numeros | null): EnVivo | null {
  if (numeros === null) return { valor: ES.numeros.tileSinLeer[0], detalle: ES.numeros.tileSinLeer[1], porHacer: false };
  if (numeros.since === null) return null;
  const semana = numeros.semana;
  return {
    valor: ES.numeros.platos(cifra(semana.plates), semana.plates === 1),
    detalle: ES.numeros.estaSemana(ES.numeros.contra(ES.numeros.anterior.semana, cifra(semana.prev.plates))),
    porHacer: false,
  };
}
