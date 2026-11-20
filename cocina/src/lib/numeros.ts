import type { EnElPeriodo, Numeros, Periodo } from '@/api/numeros';
import { enUso, type LoQueUsa } from '@/api/servicios';
import { formatMXN } from '@/format/mxn';
import type { Festejo } from '@/lib/empujones';
import { construidos, type Elegible, type EnVivo } from '@/lib/loQueUsas';
import { textoDeDias } from '@/lib/tarjeta';
import { ES } from '@/strings';

// ============================================================================
// WHAT *TUS NÚMEROS* SAYS — PURE. Plan task `10.9f`, the owner's rulings G24–G27 of 2026-11-17 and the
// family-shell page's `cNumeros` (round 7): five questions answered for *Día · Semana · Mes* at her pick,
// each against the whole period before; *Tus días fuertes* (a week or a month) and *Tus horas fuertes*
// as two sets of bars; the tile on *Hoy*, this week's plates. The counts are `0086`'s (`@/api/numeros`):
// this file only says them. ⚠️ Since `10.9l` (his ruling of 2026-11-19, night) also the summary row on top
// (`resumenDe`) and *Tu tarjeta de lealtad*'s six answers (`tarjetaDe`), on `0091`'s counts.
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
 * The words of a first's celebration: her first handover says it counts in her numbers when she sees them (the
 * page's `firstToast('entrega', …)` — its *empiezan hoy* is false when a walk-in's stamp came first, so not those
 * words); every other first, its own.
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
  readonly clave: 'platos' | 'visitas' | 'vecinos' | 'regresan' | 'pesos' | ClaveDeTarjeta;
  readonly pregunta: string;
  readonly respuesta: string;
  readonly detalle: string;
  /**
   * From 0 to 1 — *¿Cuántos ya habían venido antes?* and *¿Cuántas de tus visitas juntaron sello?*, only when
   * shown.
   */
  readonly barra: number | null;
  /** A second line under it — the card's answers only (*18 al entregar un apartado · 11 en el mostrador*). */
  readonly debajo?: string;
  /** *Cambiar cuándo se borran ›* under it — *¿Cuántas tarjetas se borraron?* only. */
  readonly cambiar?: true;
}

/** The card's six, in the drawing's order. */
export type ClaveDeTarjeta = 'sellos' | 'premios' | 'juntan' | 'empezaron' | 'vuelven' | 'borradas';

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

/** One number of the summary row: the number, what it counts, and the period before. */
export interface DelResumen {
  readonly clave: 'platos' | 'visitas' | 'sellos' | 'vecinos';
  readonly cifra: string;
  readonly que: string;
  readonly antes: string;
}

/**
 * ⚠️ `10.9l`: THE SUMMARY ROW ON TOP — *platos · visitas · sellos*, each against the whole period before (*la anterior,
 * 31*); *vecinos* in place of *sellos* while her kitchen does not use the card (his ruling), under the floor *—*.
 */
export function resumenDe(numeros: Numeros, periodo: Periodo, conTarjeta: boolean): DelResumen[] {
  const p = numeros[periodo];
  const antes = (n: string) => ES.numeros.contra(ES.numeros.anterior[periodo], n);
  const r = ES.numeros.resumen;
  const tercero: DelResumen = conTarjeta
    ? { clave: 'sellos', cifra: cifra(p.stamps), que: r.sellos(p.stamps === 1), antes: antes(cifra(p.prev.stamps)) }
    : p.neighbours === null
      ? { clave: 'vecinos', cifra: ES.numeros.nada, que: r.vecinos(false), antes: r.desdeCinco }
      : { clave: 'vecinos', cifra: cifra(p.neighbours), que: r.vecinos(p.neighbours === 1), antes: antes(personasAntes(p.prev.neighbours)) };
  return [
    { clave: 'platos', cifra: cifra(p.plates), que: r.platos(p.plates === 1), antes: antes(cifra(p.prev.plates)) },
    { clave: 'visitas', cifra: cifra(p.visits), que: r.visitas(p.visits === 1), antes: antes(cifra(p.prev.visits)) },
    tercero,
  ];
}

/** *56%* — of a period's visits, those with a stamp; a period with none says so. */
function parteConSello(stamps: number, visits: number): string {
  return visits === 0 ? ES.numeros.sinVisitas : ES.numeros.porciento(Math.round((stamps * 100) / visits));
}

/** Under the floor: the dash, and from how many it appears. */
function bajoElPiso(clave: ClaveDeTarjeta, pregunta: string): Respuesta {
  return { clave, pregunta, respuesta: ES.numeros.nada, detalle: ES.numeros.desdeCinco, barra: null };
}

/**
 * ⚠️ `10.9l`: *TU TARJETA DE LEALTAD* — six answers for her pick, in the drawing's order, each against the period before:
 * (1) her visits that got a stamp, of all, and where (at a handover · at the counter); (2) rewards won, and claimed in the
 * period · waiting now; (3) cards going now against one period earlier (*hace una semana*), and how many are one stamp
 * away; (4) new cards; (5) the middle gap between two stamps; (6) cards erased, under it her rule today and *Cambiar
 * cuándo se borran ›*. `dias` is her rule — `null` *Nunca*, `undefined` not read (nothing said under it).
 * ⚠️ THE FLOOR IS THE DATABASE'S: (3), (4) and (5) arrive `null` under five, and say *Aparece desde cinco vecinos*.
 */
export function tarjetaDe(numeros: Numeros, periodo: Periodo, dias: number | null | undefined): Respuesta[] {
  const p = numeros[periodo];
  const antes = p.prev;
  const q = ES.numeros.preguntasTarjeta;
  const contra = (n: string) => contraAntes(periodo, n);

  const sellos: Respuesta = {
    clave: 'sellos',
    pregunta: q.sellos,
    respuesta: p.visits === 0 ? cifra(0) : ES.numeros.deCuantos(cifra(p.stamps), cifra(p.visits)),
    // No visit in the period: no share of its own to say — the period's name, as the other answers say it.
    detalle:
      p.visits === 0
        ? contra(parteConSello(antes.stamps, antes.visits))
        : ES.numeros.junto(parteConSello(p.stamps, p.visits), ES.numeros.contra(ES.numeros.anterior[periodo], parteConSello(antes.stamps, antes.visits))),
    barra: p.visits === 0 ? null : p.stamps / p.visits,
    ...(p.stamps > 0 ? { debajo: ES.numeros.dondeSellos(cifra(p.stamps_handover), cifra(p.stamps - p.stamps_handover)) } : {}),
  };

  const cobro = [
    ...(p.rewards_claimed > 0 ? [ES.numeros.cobraron(cifra(p.rewards_claimed), ES.numeros.estePeriodo[periodo])] : []),
    ...(numeros.rewards_waiting > 0 ? [ES.numeros.porEntregar(cifra(numeros.rewards_waiting))] : []),
  ];
  const premios: Respuesta = {
    clave: 'premios',
    pregunta: q.premios,
    respuesta: cifra(p.rewards_won),
    detalle: contra(cifra(antes.rewards_won)),
    barra: null,
    ...(cobro.length > 0 ? { debajo: cobro.join(' · ') } : {}),
  };

  const juntan: Respuesta =
    p.cards_going === null
      ? bajoElPiso('juntan', q.juntan)
      : {
          clave: 'juntan',
          pregunta: q.juntan,
          respuesta: ES.numeros.tarjetas(cifra(p.cards_going), p.cards_going === 1),
          detalle: ES.numeros.contra(ES.numeros.haceUn[periodo], personasAntes(antes.cards_going)),
          barra: null,
          ...(p.cards_one_away !== null && p.cards_one_away > 0
            ? { debajo: ES.numeros.aUnSello(cifra(p.cards_one_away), p.cards_one_away === 1) }
            : {}),
        };

  const empezaron: Respuesta =
    p.cards_started === null
      ? bajoElPiso('empezaron', q.empezaron)
      : { clave: 'empezaron', pregunta: q.empezaron, respuesta: cifra(p.cards_started), detalle: contra(personasAntes(antes.cards_started)), barra: null };

  const vuelven: Respuesta =
    p.return_days === null
      ? bajoElPiso('vuelven', q.vuelven)
      : {
          clave: 'vuelven',
          pregunta: q.vuelven,
          respuesta: ES.numeros.enDias(cifra(p.return_days), p.return_days === 1),
          detalle: contra(antes.return_days === null ? ES.numeros.conMenosDeCinco : ES.numeros.enDias(cifra(antes.return_days), antes.return_days === 1)),
          barra: null,
          debajo: ES.numeros.laMitad,
        };

  const regla = dias === undefined ? null : dias === null ? ES.numeros.nuncaSeBorran : ES.numeros.porPasar(textoDeDias(dias));
  const borradas: Respuesta = {
    clave: 'borradas',
    pregunta: q.borradas,
    respuesta: cifra(p.cards_erased),
    detalle: contra(cifra(antes.cards_erased)),
    barra: null,
    ...(regla !== null ? { debajo: regla } : {}),
    cambiar: true,
  };

  return [sellos, premios, juntan, empezaron, vuelven, borradas];
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

/**
 * Under the title, true today: the stamps named while her kitchen uses the card — or while the numbers still count
 * stamps it gave before she closed it (*N sin apartar, con su sello* on the screen).
 */
export function subtituloDe(conTarjeta: boolean, numeros?: Numeros): string {
  const conSellos =
    numeros !== undefined && (['dia', 'semana', 'mes'] as const).some((p) => numeros[p].walk_ins > 0 || numeros[p].prev.walk_ins > 0);
  return conTarjeta || conSellos ? ES.numeros.subtitulo : ES.numeros.subtituloSinTarjeta;
}

/**
 * Whether a read was made today, by the phone's own calendar (`dataUpdatedAt`) — a read from another day is
 * read again, never drawn as today's. ⚠️ NEVER the answer's `day` against the phone's: a phone set to another
 * zone would never agree, and would read again for ever. The card's tile keeps the same rule (`@/lib/tarjeta`'
 * `deHoy`).
 */
export function leidoHoy(leidoEn: number | null, ahora: Date): boolean {
  if (leidoEn === null || leidoEn <= 0) return false;
  // ⚠️ From the start of `ahora`'s day, never "the same day as `ahora`": `ahora` ticks every half minute, and a
  // read that lands at 00:00:01 while it still says 23:59:40 is not yesterday's — asked again, it would be asked
  // again and again until the clock ticked (the review of `10.9f`).
  return leidoEn >= new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate()).getTime();
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
