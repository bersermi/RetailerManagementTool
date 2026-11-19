import { readKey, writeKey, type DeviceStore } from '@/lib/store';

// ============================================================================
// THE REWARDS THIS PHONE HAS ALREADY CELEBRATED — PER LOGIN. Plan task `10.9e-iii` (G11, G17: *"a nice animation
// showing she won something"*, on the spot or at her next open).
//
// A reward is won at the kitchen — her last stamp, given by the kitchen's *Entregar* or its scan of her code —
// while her app may be closed; *¡Ganaste!* then shows at her next open (`@/lib/Festejos`). So the phone keeps WHICH
// of her rewards it has shown: their ids, her own, never a read of anyone's rows. ⚠️ BY ID, NOT BY MOMENT (the review
// of `10.9e-iii`): a reward's `won_at` is the kitchen's scan, which can reach the database days late from a phone
// with no signal (`p_at`) — a moment kept would have hidden it behind one celebrated meanwhile.
// ⚠️ PER LOGIN, AND IT OUTLIVES *CERRAR SESIÓN*, as her key does (`@/lib/llave`). The last `MAXIMO` ids are kept:
// a reward claimed leaves her list, so its id is never asked about again.
// Pure over the store it is handed; `test/tarjetaVecina.test.ts` runs it on a store in memory.
// ============================================================================

/** The one key of the phone's store the ids are kept under. */
export const FESTEJOS_KEY = 'itacate.festejos';

/** How many ids a login keeps — far more rewards than anyone holds unclaimed. */
export const MAXIMO = 60;

const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

function leerTodos(store: DeviceStore | undefined): Record<string, unknown> {
  const raw = readKey(store, FESTEJOS_KEY);
  if (raw === null) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

/** The ids of her rewards this phone has celebrated — `null`: it never celebrated one for her. */
export function festejados(store: DeviceStore | undefined, usuario: string): ReadonlySet<string> | null {
  const ids = leerTodos(store)[usuario];
  if (!Array.isArray(ids)) return null;
  return new Set(ids.filter((id): id is string => typeof id === 'string' && ID.test(id)));
}

/** Rewards celebrated — or seen, and never to be celebrated: their ids added, every other login's untouched. */
export function marcarFestejados(store: DeviceStore | undefined, usuario: string, ids: readonly string[]): void {
  const antes = [...(festejados(store, usuario) ?? [])];
  const nuevos = ids.filter((id) => ID.test(id) && !antes.includes(id));
  writeKey(store, FESTEJOS_KEY, JSON.stringify({ ...leerTodos(store), [usuario]: [...antes, ...nuevos].slice(-MAXIMO) }));
}
