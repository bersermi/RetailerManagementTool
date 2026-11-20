import {
  DEMASIADOS_INTENTOS,
  DIAS_MAX,
  DIAS_MIN,
  DIAS_SIN_VENIR,
  FUERA_DE_RANGO,
  NO_ES_DUENA,
  NO_ES_SU_PREMIO,
  NO_SE_OFRECE,
  PREMIO_MAX,
  SELLOS_MAX,
  SELLOS_MIN,
  diasValidos,
  type CardRow,
  type DiasSinVenir,
  type KitchenCardRow,
  type RewardRow,
  type TermsRow,
  type TodayRow,
} from '@/api/tarjeta';
import { apiErrorMessage } from '@/api/errors';
import type { LoQueUsa } from '@/api/servicios';
import { digitosDe, leerQR, segundosQueQuedan } from '@/lib/codigo';
import { clockOf } from '@/lib/ventana';
import { ES } from '@/strings';

// ============================================================================
// THE LOYALTY CARD IN WERA COCINA — WHAT EACH SCREEN SAYS, PURE. Plan task `10.9e-ii`, on `0085`'s
// answers (`@/api/tarjeta`) and the phone's own code (`@/lib/codigo`). The owner's rulings G4–G19, G23,
// G34 and G35 of 2026-11-16 and 17, as the family-shell page draws stage 3:
//   - THE SETUP ON ONE SCREEN (G34): the reward (up to 60 characters), 4 to 12 stamps, and when her
//     stamps are erased — *Nunca · 2 semanas · 1 mes · 2 meses · 3 meses · Otro…*, 14 to 365 days typed
//     (`10.9k`: `fichaDeDias`, `diasDeTexto`, `empujarDias`, `ejemploDeDias`) — NOTHING PRE-CHOSEN, hints
//     only (`borradorDe`, `revisarBorrador`) — with the card as her neighbours will see it and its
//     conditions naming her kitchen (`condicionesDe`, G12);
//   - *HOY*'S TILE (`enVivoDe`): *6 sellos hoy*, *1 premio por entregar* with its dot; ⚠️ CLOSED, IT
//     STAYS while those who started it may finish it (`tarjetaGuardada`) — *Cerrar la tarjeta* turns
//     her choice off, and without the tile there would be no *Sellar* for their last stamps;
//   - *SELLAR*'S LINES (`lineaDe`): *Ana R. · sello 3 de 8*, *completó su tarjeta*, *cobra su premio:
//     … · entrégaselo* — today's, as the database names them (never who gave each, G19);
//   - A SCAN (`escaneoDe`) AND WHAT IT GAVE (`resultadoDe`) — each of `0085`'s answers in words.
// Nothing here talks; `test/tarjetaCocina.test.ts` pins every rule in Mexico City's zone.
// ============================================================================

/** The stamps she may choose, in order (G7, round 3). */
export const SELLOS: readonly number[] = Array.from({ length: SELLOS_MAX - SELLOS_MIN + 1 }, (_, i) => SELLOS_MIN + i);

/** The hint drawn on the stamps' chips while she chose none — a hint, never a value (the page's `hint`). */
export const SELLOS_SUGERIDOS = 8;

/** The setup as she fills it: nothing chosen until she chooses. */
export interface Borrador {
  readonly premio: string;
  readonly sellos: number | null;
  readonly dias: DiasSinVenir | null;
}

/**
 * A first setup is empty (G34: nothing pre-chosen); a change starts from the terms the card has — her days
 * whatever they are, so a card set up on 15 or 45 before `10.9k` reopens as *Otro…*, *15 días*.
 */
export function borradorDe(terms: TermsRow | null): Borrador {
  if (terms === null) return { premio: '', sellos: null, dias: null };
  const dias = terms.expiry_days ?? 0;
  return { premio: terms.reward, sellos: terms.stamps, dias: diasValidos(dias) ? dias : null };
}

/** What is missing, in the order the screen asks it — `null` when it may go. The database checks the same (`22023`). */
export function revisarBorrador(b: Borrador): string | null {
  const premio = b.premio.trim();
  if (premio.length === 0 || premio.length > PREMIO_MAX) return ES.prepararTarjeta.faltaPremio;
  if (b.sellos === null || b.sellos < SELLOS_MIN || b.sellos > SELLOS_MAX) return ES.prepararTarjeta.faltanSellos;
  if (b.dias === null || !diasValidos(b.dias)) return ES.prepararTarjeta.faltanDias;
  return null;
}

// ---- when her stamps are erased (`10.9k`, the owner's rulings of 2026-11-19) ---------------

/**
 * The chip her days choose — one of `DIAS_SIN_VENIR` — else `null`: *Otro…*, which then reads *21 días*. A typed
 * 14, 30, 60 or 90 chooses its own chip, so one choice never shows twice.
 */
export function fichaDeDias(dias: number | null): DiasSinVenir | null {
  return dias !== null && (DIAS_SIN_VENIR as readonly number[]).includes(dias) ? dias : null;
}

/** A chip's words: *Nunca*, *2 semanas*, *1 mes*, *2 meses*, *3 meses* — any other number in days. */
export function textoDeDias(dias: number): string {
  return ES.prepararTarjeta.fichas[dias] ?? ES.prepararTarjeta.diasN(dias);
}

/** Whether *Otro…* holds her choice: days chosen that are no chip's. */
export function esOtro(dias: number | null): boolean {
  return dias !== null && fichaDeDias(dias) === null;
}

/** *Otro…*'s box as she types: digits only, three at most — no decimals, no sign (the ruling). */
export function soloDigitos(texto: string): string {
  return texto.replace(/[^0-9]/g, '').slice(0, 3);
}

/** The box's days — `null` while it is empty. */
export function diasDeTexto(texto: string): number | null {
  const digitos = soloDigitos(texto);
  return digitos === '' ? null : Number.parseInt(digitos, 10);
}

/** Whether the box's days may be chosen: 14 to 365 (`Listo` waits until they fit). */
export function diasQueCaben(dias: number | null): dias is number {
  return dias !== null && dias >= DIAS_MIN && dias <= DIAS_MAX;
}

/** − / + beside the box: a day less or more, held to 14…365; from an empty box, the shortest. */
export function empujarDias(dias: number | null, paso: 1 | -1): number {
  if (dias === null) return DIAS_MIN;
  return Math.min(DIAS_MAX, Math.max(DIAS_MIN, dias + paso));
}

/**
 * *Si su último sello fuera hoy, se borrarían el 10 de diciembre.* — her days after today, in the phone's zone (the
 * kitchen's, in the pilot), as `0085`'s `expires_on` counts them from a last stamp.
 */
export function ejemploDeDias(dias: number, hoy: Date): string {
  return ES.prepararTarjeta.hojaDias.ejemplo(diaDe(new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + dias)));
}

/** What the preview draws while she fills it: her choices, else the hint and *Tu premio*. */
export function previaDe(b: Borrador): { readonly premio: string; readonly sellos: number; readonly dias: number } {
  const premio = b.premio.trim();
  return { premio: premio.length > 0 ? premio : ES.prepararTarjeta.premioDeMuestra, sellos: b.sellos ?? SELLOS_SUGERIDOS, dias: b.dias ?? 0 };
}

/** *Una comida corrida* → *una comida corrida*, inside a sentence (the page's `lc1`). */
export function enFrase(texto: string): string {
  return texto.charAt(0).toLowerCase() + texto.slice(1);
}

/**
 * ⚠️ THE CARD'S CONDITIONS (G12, G41; the page's `termsTxt`) — what she starts on, the kitchen as the one
 * who promises, with its address. The same words Itacate shows before her first stamp (`10.9e-iii`).
 */
export function condicionesDe(cocina: string, direccion: string | null, sellos: number, premio: string, dias: number): string {
  return [
    ES.condiciones.junta(sellos, cocina, enFrase(premio)),
    ES.condiciones.uno,
    dias > 0 ? ES.condiciones.seBorran(dias) : ES.condiciones.noSeBorran,
    ES.condiciones.promesa(cocina, direccion),
  ].join(' ');
}

/** Her street and colonia, as the conditions name them — `null` when they are not whole. */
export function direccionCorta(address: { readonly street: string; readonly number: string; readonly colonia: string } | null): string | null {
  if (address === null) return null;
  const calle = `${address.street.trim()} ${address.number.trim()}`.trim();
  const colonia = address.colonia.trim();
  if (calle === '' || colonia === '') return null;
  return `${calle}, ${colonia}`;
}

// ---- dates, in the phone's zone (the kitchen's, in the pilot) ------------------------------

/** *18 de diciembre*. */
export function diaDe(at: Date): string {
  return ES.fechas.delMes(at.getDate(), ES.fechas.meses[at.getMonth()]);
}

/** `kept_until` (an instant) or `expires_on` (`YYYY-MM-DD`, the kitchen's day) as a day she reads. */
export function diaDeTexto(texto: string | null): string | null {
  if (texto === null) return null;
  const soloDia = /^(\d{4})-(\d{2})-(\d{2})$/.exec(texto);
  const at = soloDia === null ? new Date(texto) : new Date(Number(soloDia[1]), Number(soloDia[2]) - 1, Number(soloDia[3]));
  return Number.isNaN(at.getTime()) ? null : diaDe(at);
}

// ---- the card's state --------------------------------------------------------------------

/**
 * Whether her card is read at all: while Wera offers it (`0081`'s switch), or before what Wera offers is
 * read — a kept copy may be drawn meanwhile. With the switch off, nothing is asked.
 */
export function seLee(loQueUsa: LoQueUsa | undefined): boolean {
  return loQueUsa === undefined || loQueUsa.ofrecidos.includes('tarjeta');
}

/**
 * ⚠️ A COPY READ ON ANOTHER DAY (the review of `10.9e-ii`): her card's counts are kept on the phone, so *Hoy* opened
 * after midnight with no signal would say yesterday's *6 sellos hoy* and *Sellar* yesterday's names. Read on
 * another day — the phone's, the kitchen's in the pilot — today's stamps and lines are none until the next read.
 */
export function deHoy(card: KitchenCardRow | undefined, leidoEn: number | null, ahora: Date): KitchenCardRow | undefined {
  if (card === undefined || leidoEn === null) return card;
  const leido = new Date(leidoEn);
  const mismoDia = leido.getFullYear() === ahora.getFullYear() && leido.getMonth() === ahora.getMonth() && leido.getDate() === ahora.getDate();
  return mismoDia ? card : { ...card, stamps_today: 0, today: [] };
}

/** How recent a line must be for *Sellar* to say it in a toast — a line already there when it opened is not news. */
export const LINEA_NUEVA_MS = 2 * 60_000;

/** Closed, while those who started it may still finish it and claim (G12) — its tile and *Sellar* stay. */
export function tarjetaGuardada(card: KitchenCardRow | null | undefined, now: Date): boolean {
  if (card === null || card === undefined || card.terms === null || card.open || card.kept_until === null) return false;
  return new Date(card.kept_until).getTime() > now.getTime();
}

/** Whether the card's screen and *Sellar* have anything to stamp on: open, or closed within its 30 days. */
export function tarjetaViva(card: KitchenCardRow | null | undefined, now: Date): boolean {
  return card !== null && card !== undefined && card.terms !== null && (card.open || tarjetaGuardada(card, now));
}

/**
 * *Hoy*'s tile, once set up (the page's `cardTile`): *6 sellos hoy*, then the rewards to give with the
 * dot, else the cards going — or, closed, until when. `null` — the first-time state — until she set it up,
 * and for an answer not read yet.
 */
export function enVivoDe(card: KitchenCardRow | null | undefined, now: Date): { valor: string; detalle: string; porHacer: boolean } | null {
  if (!tarjetaViva(card, now) || card === null || card === undefined) return null;
  const valor = ES.tarjeta.mosaico.sellosHoy(card.stamps_today);
  if (card.rewards_to_give > 0) return { valor, detalle: ES.tarjeta.mosaico.premios(card.rewards_to_give), porHacer: true };
  if (!card.open) return { valor, detalle: ES.tarjeta.mosaico.cerrada(diaDeTexto(card.kept_until) ?? ''), porHacer: false };
  return { valor, detalle: ES.tarjeta.mosaico.activas(card.cards), porHacer: false };
}

/** The card's three counts (the page's `kpis`), each with its word in its number. */
export function cuentasDe(card: KitchenCardRow): readonly { readonly n: number; readonly que: string }[] {
  return [
    { n: card.cards, que: ES.tarjeta.kpi.tarjetas(card.cards) },
    { n: card.stamps_today, que: ES.tarjeta.kpi.sellos(card.stamps_today) },
    { n: card.rewards_to_give, que: ES.tarjeta.kpi.premios(card.rewards_to_give) },
  ];
}

/** ⚠️ G23: before *Eliminar esta cocina*, who holds her card — warned, never blocked; `null` with nobody. */
export function avisoAlEliminar(card: KitchenCardRow | null | undefined): string | null {
  if (card === null || card === undefined || (card.cards === 0 && card.rewards_to_give === 0)) return null;
  return ES.kitchenDeletion.tarjeta(card.cards, card.rewards_to_give);
}

// ---- Sellar's lines ----------------------------------------------------------------------

export interface LineaDeHoy {
  readonly clave: string;
  readonly quien: string;
  readonly que: string;
  readonly detalle: string;
  /** A reward claimed: the kitchen hands it over now (*entrégaselo*). */
  readonly entregar: boolean;
}

/** One of today's lines, as the page draws them: *Ana R. · sello 3 de 8*, *17:12*. */
export function lineaDe(row: TodayRow): LineaDeHoy {
  const at = new Date(row.at);
  const hora = Number.isNaN(at.getTime()) ? '' : clockOf(at);
  const quien = row.name ?? ES.sellar.alguien;
  let que: string;
  if (row.kind === 'cobro') que = ES.sellar.cobro(enFrase(row.reward ?? ''));
  else if (row.kind === 'gano') que = ES.sellar.gano;
  else que = ES.sellar.sello(row.stamps ?? 0, row.of ?? 0);
  const extra = row.kind === 'cobro' ? ES.sellar.entregaselo : row.via === 'entrega' ? ES.sellar.alEntregar : null;
  return {
    clave: `${row.kind}:${row.at}:${quien}`,
    quien,
    que,
    detalle: extra === null ? hora : `${hora} · ${extra}`,
    entregar: row.kind === 'cobro',
  };
}

/** *Cambia en 0:42* — `1:00` at the minute's first second. */
export function cambiaEn(ms: number): string {
  const s = segundosQueQuedan(ms);
  return s === 60 ? '1:00' : `0:${String(s).padStart(2, '0')}`;
}

// ---- a scan ------------------------------------------------------------------------------

/** What a scan or her typed digits gave: her code, the phone it names, and the reward she chose. */
export interface Escaneo {
  readonly code: string;
  readonly key: string | null;
  readonly premio: string | null;
  /** When it was read — the moment every call about it is checked at (`p_at`). */
  readonly en: Date;
}

/**
 * A QR the camera read: a neighbour's code (`WERA1:v:…`), with the reward her *Cobras: …* names. A
 * kitchen's own code, or anything not ours, is `null` — the camera says *Ese no es…* and reads on.
 */
export function escaneoDe(texto: string, en: Date): Escaneo | null {
  const leido = leerQR(texto);
  if (leido === null || leido.lado !== 'v') return null;
  return { code: leido.code, key: leido.key, premio: leido.premio ?? null, en };
}

/** Six digits she typed under the camera — no phone named, no reward: the kitchen picks. */
export function tecleadoDe(texto: string, en: Date): Escaneo | null {
  const code = digitosDe(texto);
  return code === null ? null : { code, key: null, premio: null, en };
}

/**
 * The scan's identity in the queue: the same code read twice — the camera fires on every frame, a
 * nervous double tap — is one send. ⚠️ A reward's names its reward: one stamp and one reward a minute.
 */
export function escaneoId(e: Escaneo): string {
  return `${e.key ?? 'tecleado'}:${e.code}:${e.premio ?? 'sello'}`;
}

/** How long after the scan the database's own clock still fits her code: a code lives its minute and the one before. */
export const RELOJ_DEL_SERVIDOR_MS = 60_000;

/**
 * ⚠️ `p_at` FOR A CALL WITH SIGNAL (the review of `10.9e-ii`): within a minute of the scan, NONE — the database's
 * clock checks her code, which then always fits (its minute or the one before), whatever this phone's clock
 * says; later, the scan's moment, by this phone's clock. From the queue it is always the scan's moment.
 */
export function momentoDeLaLlamada(e: Escaneo, ahora: Date): string | null {
  return ahora.getTime() - e.en.getTime() < RELOJ_DEL_SERVIDOR_MS ? null : e.en.toISOString();
}

/** The summary under her name: *5 de 8 · 2 premios*. */
export function resumenDe(card: CardRow): string | null {
  if (card.of === null || card.of === undefined || card.stamps === undefined) return null;
  return ES.escanearCliente.resumen(card.stamps, card.of, card.rewards?.length ?? 0);
}

/** The rewards to pick from, newest first as the database sends them: what, and *Ganado el 5 de noviembre*. */
export function premiosDe(card: CardRow): readonly { readonly id: string; readonly que: string; readonly cuando: string }[] {
  return (card.rewards ?? []).map((r: RewardRow) => ({ id: r.id, que: r.reward, cuando: ES.escanearCliente.ganadoEl(diaDeTexto(r.won_at) ?? '') }));
}

/** How an answer is drawn: green for what was given, plain for what changed nothing, red for what failed. */
export type Tono = 'bien' | 'nada' | 'mal';

/** What an answer of `give_stamp`, `give_reward` or `card_of_code` says — `null` for `suya`, which is the card itself. */
export function resultadoDe(card: CardRow): { readonly texto: string; readonly tono: Tono } | null {
  const nombre = card.name ?? ES.sellar.alguien;
  const R = ES.escanearCliente.resultado;
  switch (card.result) {
    case 'suya':
      return null;
    case 'primer':
      return { texto: R.primer(nombre, card.of ?? 0), tono: 'bien' };
    case 'sello':
      return { texto: R.sello(nombre, card.stamps ?? 0, card.of ?? 0), tono: 'bien' };
    case 'gano':
      // The reward just won is the newest; the card is back to zero (G17).
      return { texto: R.gano(nombre, enFrase(card.rewards?.[0]?.reward ?? card.reward ?? '')), tono: 'bien' };
    case 'ya_hoy':
      return { texto: R.yaHoy(nombre), tono: 'nada' };
    case 'cobrado':
      return { texto: R.cobrado(nombre, enFrase(card.claimed ?? '')), tono: 'bien' };
    case 'ya_cobrado':
      return { texto: R.yaCobrado(nombre, enFrase(card.claimed ?? '')), tono: 'nada' };
    case 'ya_usado':
      return { texto: R.yaUsado, tono: 'nada' };
    case 'cerrada':
      return { texto: R.cerrada, tono: 'mal' };
    case 'propia':
      return { texto: R.propia, tono: 'mal' };
    case 'no_valido':
      return { texto: R.noValido, tono: 'mal' };
    case 'repite':
      return { texto: R.repite, tono: 'mal' };
  }
}

/** Whether an answer gave what the scan was for — a stamp, or a reward. */
export function dio(card: CardRow): boolean {
  return card.result === 'primer' || card.result === 'sello' || card.result === 'gano' || card.result === 'cobrado' || card.result === 'ya_cobrado';
}

/** Whether, after this answer, she still has a card to show — her name, her count, her rewards. */
export function conTarjeta(card: CardRow): boolean {
  return card.result !== 'no_valido' && card.result !== 'repite' && card.result !== 'propia';
}

/** A refusal in words (`0085`'s codes). `22023` reads by what was sent: the terms, or a code. */
export function tarjetaErrorMessage(thrown: unknown, sobre: 'terminos' | 'codigo' = 'codigo'): string {
  const code = typeof thrown === 'object' && thrown !== null ? (thrown as { code?: unknown }).code : undefined;
  const message = typeof thrown === 'object' && thrown !== null ? (thrown as { message?: unknown }).message : undefined;
  if (code === NO_SE_OFRECE) return ES.tarjetaErrores.noDisponible;
  if (code === DEMASIADOS_INTENTOS) return ES.tarjetaErrores.demasiados;
  if (code === NO_ES_SU_PREMIO) return ES.tarjetaErrores.noEsSuPremio;
  if (code === FUERA_DE_RANGO) {
    if (sobre === 'terminos') return ES.tarjetaErrores.terminos;
    return typeof message === 'string' && /7 days/.test(message) ? ES.tarjetaErrores.viejo : ES.tarjetaErrores.codigo;
  }
  if (code === NO_ES_DUENA && typeof message === 'string' && /only the kitchen's owner/.test(message)) return ES.tarjetaErrores.soloLaDuena;
  return apiErrorMessage(thrown);
}
