// ============================================================================
// THE SEAL ON HER TICKET, CHECKED ON THIS PHONE WITH NO SIGNAL. Plan task `10.9j-ii-b` — Wera
// Cocina's half of the handover with no signal (the owner's J2 and J3 of 2026-11-20, *"yes to
// all"*, on `10.9j-i`'s drawing; his D4: *"We need to enable both parties to do redeem offline"*).
// The database half is `0088` (`10.9j-ii-a`): every reservation still to collect carries a seal —
// the text of the QR on her ticket in Itacate — made with her kitchen's secret.
//
//   kitchen_seal_keys   her kitchen's secrets, for the phone of anyone who works there (`0088`)
//
// ⚠️ THE CLAIM: the function's name, its argument and every key read, by the database's names —
// `docs/checks/10.5b-iv-a-handover-contract.sh` (group 14) reads them OUT OF THIS FILE and asks a
// real PostgREST as a fonda, and Itacate's reserving check (group 13) reads the function's name
// from here too.
//
// ⚠️⚠️ THE SEAL'S SHAPE IS `0088`'S HEADER, READ HERE AS IT SAYS — fourteen fields of printable
// ASCII joined by `|`: `s1`, the reservation and its kitchen as 32 hex, the key version, the code,
// her hour in epoch seconds, payment, eat, quantity, unit and container price (the container empty
// when none), surprise `1`/`0`, the dish's name percent-encoded (`decodeURIComponent` reads it), and
// the first 10 bytes of HMAC-SHA1 of everything before the LAST `|`, keyed with that version of the
// kitchen's secret, as 20 lowercase hex. ⚠️ THE MAC IS CHECKED OVER THE TEXT AS SCANNED — never a
// text rebuilt from the fields — so nothing here has to agree with the database on how a number is
// written. `test/sello.test.ts` verifies a seal the database itself made (`test/sello-de-la-base.json`),
// and holds the shape to the migration's text.
//
// ⚠️ NEVER HER NAME: the seal does not carry it (J2). Her short name and score come with the next
// read, as today.
//
// Everything with a right answer is here, and nothing that talks: the call is `@/api/calls`',
// the hook `@/api/hooks`' (`useLlavesDeSello`), the screen `(cocina)/entregar`.
// ============================================================================

import { SCALE, parseDecimal } from '@tienda/money';

import { COMERES, PAGOS, type Comer, type Pago, type Reserva } from '@/api/apartados';
import { hmacSha1, secretoDe } from '@/lib/codigo';

/** `0088`: her kitchen's sealing secrets. */
export const KITCHEN_SEAL_KEYS = 'kitchen_seal_keys';

/** Her kitchen's secrets, kept on the phone under the login and the kitchen (`@/api/persist`'s list) until *Cerrar sesión*. */
export const SELLO_KEY = ['cocina', 'sello'] as const;
export function selloKey(userId: string | null, kitchenId: string | null): readonly unknown[] {
  return [...SELLO_KEY, userId ?? '', kitchenId ?? ''];
}

// ----------------------------------------------------------------------------
// What is sent and what comes back — ⚠️ the contract check reads each name
// ----------------------------------------------------------------------------

/** `kitchen_seal_keys`' one argument. */
export interface SealKeysArgs {
  readonly p_workspace_id: string;
}

export function sealKeysArgs(kitchenId: string): SealKeysArgs {
  return { p_workspace_id: kitchenId };
}

/** `kitchen_seal_keys`' answer. */
export interface SealKeysRow {
  readonly workspace_id: string;
  readonly keys: readonly SealKeyRow[] | null;
}

/** One version of her kitchen's secret. */
export interface SealKeyRow {
  readonly version: number;
  /** 20 bytes as 40 hexadecimal characters. */
  readonly secret: string;
  /** Until when a ticket sealed with it is checked — `null` for the current one; a retired one a day after it was retired. */
  readonly until: string | null;
}

/** A version of her kitchen's secret, as the phone keeps it. */
export interface LlaveDeSello {
  readonly version: number;
  /** 40 hexadecimal characters — kept as text, so the phone's saved cache reads it back as it wrote it. */
  readonly secreto: string;
  /** Until when it checks a ticket; `null` while it is the current one. */
  readonly hasta: Date | null;
}

const object = (value: unknown): Record<string, unknown> | null =>
  typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : null;

/** `kitchen_seal_keys`' answer as the phone keeps it. A key it cannot read is left out, never the answer. */
export function llavesFrom(data: unknown): LlaveDeSello[] {
  const keys = object(data)?.keys;
  if (!Array.isArray(keys)) return [];
  const llaves: LlaveDeSello[] = [];
  for (const value of keys) {
    const k = object(value);
    if (k === null || typeof k.version !== 'number' || !Number.isInteger(k.version) || k.version < 1) continue;
    const secreto = typeof k.secret === 'string' ? k.secret.toLowerCase() : null;
    if (secreto === null || secretoDe(secreto) === null) continue;
    let hasta: Date | null = null;
    if (k.until !== null && k.until !== undefined) {
      hasta = new Date(String(k.until));
      if (Number.isNaN(hasta.getTime())) continue;
    }
    llaves.push({ version: k.version, secreto, hasta });
  }
  return llaves;
}

// ----------------------------------------------------------------------------
// The seal, read
// ----------------------------------------------------------------------------

/** The one shape this build reads (`0088`'s first field). Another is not a seal it can vouch for. */
export const SELLO_FORMA = 's1';

/** `0088`'s fourteen fields — twelve, the name, the MAC. */
export const CAMPOS_DEL_SELLO = 14;

/** What a seal says, read — and the text its MAC covers. */
export interface SelloLeido {
  readonly reservaId: string;
  readonly cocinaId: string;
  readonly version: number;
  readonly codigo: string;
  readonly hora: Date;
  readonly pago: Pago;
  readonly comer: Comer;
  readonly cantidad: number;
  readonly precioCentavos: number;
  readonly desechableCentavos: number | null;
  readonly sorpresa: boolean;
  /** The dish's name, read back from its percent-encoding — as much of it as the seal carries (120 encoded). */
  readonly nombre: string;
  /** Everything before the last `|`: what the MAC is over. */
  readonly firmado: string;
  readonly mac: string;
}

const HEX32 = /^[0-9a-f]{32}$/;
const uuidDe = (hex: string) => `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
const ASCII_IMPRIMIBLE = /^[\x20-\x7e]+$/;

/** A decimal as `0088` writes it, in its scale's units; `null` when it is not one, or not above zero. */
function decimalDe(texto: string, escala: number): number | null {
  if (!/^\d+(\.\d+)?$/.test(texto)) return null;
  try {
    const v = parseDecimal(texto, escala);
    return v > 0 ? v : null;
  } catch {
    return null;
  }
}

/**
 * A QR's text read as a seal, or `null` when it is not one this build can read — another app's QR,
 * the card's *Mi código*, a later shape, anything malformed. ⚠️ READING IS NOT CHECKING: `revisarSello`
 * decides whether to believe it.
 */
export function leerSello(texto: unknown): SelloLeido | null {
  if (typeof texto !== 'string' || texto.length > 1000 || !ASCII_IMPRIMIBLE.test(texto)) return null;
  const ultimo = texto.lastIndexOf('|');
  if (ultimo < 0) return null;
  const firmado = texto.slice(0, ultimo);
  const mac = texto.slice(ultimo + 1);
  const f = firmado.split('|');
  if (f.length !== CAMPOS_DEL_SELLO - 1 || f[0] !== SELLO_FORMA || !/^[0-9a-f]{20}$/.test(mac)) return null;
  const [, reserva, cocina, version, codigo, hora, pago, comer, cantidad, precio, desechable, sorpresa, nombreCodificado] = f;
  if (!HEX32.test(reserva) || !HEX32.test(cocina)) return null;
  if (!/^[1-9]\d{0,8}$/.test(version) || !/^[1-9]\d{2}$/.test(codigo) || !/^\d{9,11}$/.test(hora)) return null;
  if (!(PAGOS as readonly string[]).includes(pago) || !(COMERES as readonly string[]).includes(comer)) return null;
  if (sorpresa !== '0' && sorpresa !== '1') return null;
  const milesimas = decimalDe(cantidad, SCALE.quantity);
  const precioCentavos = decimalDe(precio, SCALE.money);
  const desechableCentavos = desechable === '' ? null : decimalDe(desechable, SCALE.money);
  if (milesimas === null || milesimas % 1000 !== 0 || precioCentavos === null || (desechable !== '' && desechableCentavos === null)) return null;
  let nombre: string;
  try {
    nombre = decodeURIComponent(nombreCodificado);
  } catch {
    return null;
  }
  if (nombre.trim() === '') return null;
  return {
    reservaId: uuidDe(reserva),
    cocinaId: uuidDe(cocina),
    version: Number(version),
    codigo,
    hora: new Date(Number(hora) * 1000),
    pago: pago as Pago,
    comer: comer as Comer,
    cantidad: milesimas / 1000,
    precioCentavos,
    desechableCentavos,
    sorpresa: sorpresa === '1',
    nombre,
    firmado,
    mac,
  };
}

/** The MAC `0088` puts on a text: the first 10 bytes of HMAC-SHA1 under a secret given as 40 hex, as 20 lowercase hex. */
export function macDe(firmado: string, secretoHex: string): string | null {
  const secreto = secretoDe(secretoHex);
  if (secreto === null) return null;
  // A seal is printable ASCII (`leerSello` refuses anything else), so each character is its one byte.
  const mac = hmacSha1(secreto, Uint8Array.from(firmado, (c) => c.charCodeAt(0) & 0xff));
  return Array.from(mac.slice(0, 10), (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * What the phone makes of a seal at her kitchen's counter:
 *   `valido`      it is a reservation of THIS kitchen, sealed with a secret this phone holds and may still use
 *   `noEsSuyo`    another kitchen's ticket, an altered one, or one sealed with a secret this phone does not
 *                 hold or holds past its day — *Ese código no es de un apartado de tu cocina.*
 * ⚠️ A VERSION THIS PHONE HAS NOT READ (a helper left since its last read) is `noEsSuyo` too: with no signal
 * nothing can vouch for it, and the screen hands nothing over unchecked (J3). With signal the hook reads her
 * kitchen's secrets again first (`useLlavesDeSello`), so it is found then.
 */
export type Revision = 'valido' | 'noEsSuyo';

export function revisarSello(sello: SelloLeido, cocinaId: string, llaves: readonly LlaveDeSello[], ahora: Date): Revision {
  if (sello.cocinaId !== cocinaId) return 'noEsSuyo';
  const llave = llaves.find((k) => k.version === sello.version);
  if (llave === undefined || (llave.hasta !== null && ahora.getTime() > llave.hasta.getTime())) return 'noEsSuyo';
  return macDe(sello.firmado, llave.secreto) === sello.mac ? 'valido' : 'noEsSuyo';
}

/** Whether a version is one this phone has not read — the hook then reads her kitchen's secrets again, if it can. */
export function versionNueva(sello: SelloLeido, llaves: readonly LlaveDeSello[]): boolean {
  return !llaves.some((k) => k.version === sello.version) && llaves.every((k) => k.version < sello.version);
}

/**
 * ⚠️ THE ORDER AS THE SEAL SAYS IT — for an order this phone never read (one made after its last read,
 * with no signal since): a `Reserva`, so *Entregar* says what to prepare and charge with the words it
 * uses for any order. What the seal does not carry is what nothing drawn here reads: the offer (`''`),
 * and the window's end — taken as her hour plus 15 minutes, the earliest it can be (`reserve_plate`:
 * her hour is at most 15 minutes before the window ends). Nothing of it was cancelled, handed over or
 * collected, as far as this phone knows; the database records the handover all the same (ruled
 * 2026-11-10), and the next read brings the rest.
 */
export const QUINCE_MINUTOS_MS = 15 * 60_000;

export function reservaDeSello(sello: SelloLeido, diaDe: (hora: Date) => string): Reserva {
  const desechablesCentavos = sello.cantidad * (sello.comer === 'llevar' ? (sello.desechableCentavos ?? 0) : 0);
  return {
    id: sello.reservaId,
    ofertaId: '',
    codigo: sello.codigo,
    dia: diaDe(sello.hora),
    hora: sello.hora,
    guardadaHasta: new Date(sello.hora.getTime() + QUINCE_MINUTOS_MS),
    creadaEn: sello.hora,
    canceladaEn: null,
    canceladaPorLaCocina: false,
    entregadaEn: null,
    recogidaEn: null,
    pago: sello.pago,
    comer: sello.comer,
    platos: [
      {
        lineaDeOferta: 0,
        nombre: sello.nombre,
        sorpresa: sello.sorpresa,
        cantidad: sello.cantidad,
        precioCentavos: sello.precioCentavos,
        desechableCentavos: sello.comer === 'llevar' ? sello.desechableCentavos : null,
      },
    ],
    cobroCentavos: sello.cantidad * sello.precioCentavos + desechablesCentavos,
    desechablesCentavos,
  };
}
