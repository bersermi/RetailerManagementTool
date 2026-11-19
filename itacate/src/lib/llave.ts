import type { KeyRow } from '@/api/tarjeta';
import { secretoDe } from '@/lib/codigo';
import { readKey, writeKey, type DeviceStore } from '@/lib/store';

// ============================================================================
// THIS PHONE'S *MI CÓDIGO* KEY — ONE PER LOGIN, KEPT ON THE PHONE. Plan task `10.9e-iii` (G10, G16:
// her code changing every minute, worked out on her phone with no signal), Wera Cocina's
// `cocina/src/lib/llave.ts` cut to a neighbour: she has one code for every kitchen, so one key per
// login, never one per kitchen.
//
// `register_my_key` (`0085`) hands her phone its key and its 20-byte secret ONCE; the phone works her
// six digits out of the secret every minute from then on (`@/lib/codigo`), signal or not.
// ⚠️ ASKED ONCE, NEVER ON EACH OPEN: the database keeps three phones a person at most and drops the
// oldest — asking on every open would drop her other phones' codes.
// ⚠️ WHERE IT LIVES: the phone's own store (`@/lib/store` — SQLite in the app's private folder), where
// her session is kept too. Itacate carries no keychain module, and one is a native build. This is her
// own secret, not a read of anyone's rows: Itacate's rule that no read is kept on the disk still holds.
// ⚠️ PER LOGIN, AND IT OUTLIVES *CERRAR SESIÓN*, as Wera Cocina's does: another person who signs in on
// this phone has a key of her own; she, signing back in, finds hers.
// Pure over the store it is handed; `test/tarjetaVecina.test.ts` runs it on a store in memory.
// ============================================================================

/** The one key of the phone's store her code is kept under. */
export const LLAVE_KEY = 'itacate.micodigo';

/** Her phone's key: its id (`p_key`, in the QR) and its secret, 40 hex characters. */
export interface Llave {
  readonly key: string;
  readonly secreto: string;
}

type Llaves = Record<string, Llave>;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

function leerTodas(store: DeviceStore | undefined): Llaves {
  const raw = readKey(store, LLAVE_KEY);
  if (raw === null) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed) ? (parsed as Llaves) : {};
  } catch {
    return {};
  }
}

/** Her key on this phone, or `null` — anything the phone cannot read is none, and a new one is asked. */
export function leerLlave(store: DeviceStore | undefined, usuario: string): Llave | null {
  const llave = leerTodas(store)[usuario];
  if (typeof llave !== 'object' || llave === null) return null;
  if (typeof llave.key !== 'string' || !UUID.test(llave.key) || secretoDe(llave.secreto) === null) return null;
  return { key: llave.key, secreto: llave.secreto };
}

/** The key the database handed, kept — every other login's untouched. Answers what was kept. */
export function guardarLlave(store: DeviceStore | undefined, usuario: string, row: KeyRow): Llave {
  const llave: Llave = { key: row.key, secreto: row.secret };
  writeKey(store, LLAVE_KEY, JSON.stringify({ ...leerTodas(store), [usuario]: llave }));
  return llave;
}
