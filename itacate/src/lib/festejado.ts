import { readKey, writeKey, type DeviceStore } from '@/lib/store';

// ============================================================================
// THE LAST REWARD THIS PHONE CELEBRATED — ONE MOMENT PER LOGIN. Plan task `10.9e-iii` (G11, G17: *"a nice
// animation showing she won something"*, on the spot or at her next open).
//
// A reward is won at the kitchen — her last stamp, given by the kitchen's *Entregar* or its scan of her code —
// while her app may be closed; *¡Ganaste!* then shows at her next open (`@/lib/Festejos`). So the phone keeps
// WHEN it last celebrated: the moment the reward was won (`won_at`, the database's clock), never the reward
// nor the kitchen — a moment, not a read of anyone's rows. A reward won after it is celebrated once.
// ⚠️ PER LOGIN, AND IT OUTLIVES *CERRAR SESIÓN*, as her key does (`@/lib/llave`).
// Pure over the store it is handed; `test/tarjetaVecina.test.ts` runs it on a store in memory.
// ============================================================================

/** The one key of the phone's store the moments are kept under. */
export const FESTEJOS_KEY = 'itacate.festejos';

function leerTodos(store: DeviceStore | undefined): Record<string, string> {
  const raw = readKey(store, FESTEJOS_KEY);
  if (raw === null) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed) ? (parsed as Record<string, string>) : {};
  } catch {
    return {};
  }
}

/** When this phone last celebrated a reward for her — an instant — or `null`: never. */
export function festejadoHasta(store: DeviceStore | undefined, usuario: string): string | null {
  const at = leerTodos(store)[usuario];
  return typeof at === 'string' && !Number.isNaN(Date.parse(at)) ? at : null;
}

/** A reward celebrated: its moment kept, if later than the one kept — every other login's untouched. */
export function marcarFestejado(store: DeviceStore | undefined, usuario: string, wonAt: string): void {
  const antes = festejadoHasta(store, usuario);
  if (Number.isNaN(Date.parse(wonAt))) return;
  if (antes !== null && Date.parse(antes) >= Date.parse(wonAt)) return;
  writeKey(store, FESTEJOS_KEY, JSON.stringify({ ...leerTodos(store), [usuario]: wonAt }));
}
