import type { KeyRow } from '@/api/tarjeta';
import { secretoDe } from '@/lib/codigo';
import { readKey, writeKey, type DeviceStore } from '@/lib/store';

// ============================================================================
// THIS PHONE'S *SELLAR* KEY — ONE PER LOGIN PER KITCHEN, KEPT ON THE PHONE. Plan task `10.9e-ii`
// (G16, G19: each phone its own code, worked out with no signal; every stamp records who gave it).
//
// `register_kitchen_key` (`0085`) hands a phone its key and its 20-byte secret ONCE; the phone works
// its six digits out of the secret every minute from then on (`@/lib/codigo`), signal or not. So the
// key is asked for the first time *Sellar* opens with signal, and kept here for good.
// ⚠️ ASKED ONCE, NEVER ON EACH OPEN: the database keeps three phones a member at most and drops the
// oldest (`0085`) — asking on every open of one phone would drop her other phones' codes.
// ⚠️ WHERE IT LIVES: the phone's own store (`@/lib/store` — SQLite in the app's private folder), where
// her session is kept too. Wera Cocina carries no keychain module, and one is a native build; a
// stolen phone's session is worth more than a code that gives one stamp a day.
// ⚠️ PER LOGIN, AND IT OUTLIVES *CERRAR SESIÓN*, as her queue does (`@/api/cola`): another person who
// signs in on this phone has keys of her own; she, signing back in, finds hers.
// Pure over the store it is handed; `test/tarjetaCocina.test.ts` runs it on a store in memory.
// ============================================================================

/** The one key of the phone's store every kitchen's code is kept under. */
export const LLAVES_KEY = 'cocina.sellar';

/** A phone's key at a kitchen: its id (`p_key`, in the QR) and its secret, 40 hex characters. */
export interface Llave {
  readonly key: string;
  readonly secreto: string;
}

type Llaves = Record<string, Llave>;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

const claveDe = (usuario: string, cocina: string) => `${usuario}:${cocina}`;

function leerTodas(store: DeviceStore | undefined): Llaves {
  const raw = readKey(store, LLAVES_KEY);
  if (raw === null) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed) ? (parsed as Llaves) : {};
  } catch {
    return {};
  }
}

/** Her key at this kitchen on this phone, or `null` — anything the phone cannot read is none, and a new one is asked. */
export function leerLlave(store: DeviceStore | undefined, usuario: string, cocina: string): Llave | null {
  const llave = leerTodas(store)[claveDe(usuario, cocina)];
  if (typeof llave !== 'object' || llave === null) return null;
  if (typeof llave.key !== 'string' || !UUID.test(llave.key) || secretoDe(llave.secreto) === null) return null;
  return { key: llave.key, secreto: llave.secreto };
}

/** The key the database handed, kept — the others untouched. Answers what was kept. */
export function guardarLlave(store: DeviceStore | undefined, usuario: string, cocina: string, row: KeyRow): Llave {
  const llave: Llave = { key: row.key, secreto: row.secret };
  writeKey(store, LLAVES_KEY, JSON.stringify({ ...leerTodas(store), [claveDe(usuario, cocina)]: llave }));
  return llave;
}
