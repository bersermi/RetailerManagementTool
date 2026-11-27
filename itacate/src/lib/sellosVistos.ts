import { readKey, writeKey, type DeviceStore } from '@/lib/store';

// ============================================================================
// HOW MANY STAMPS SHE LAST SAW ON EACH CARD — PER LOGIN, ON THIS PHONE. Plan task `11.8-ii` (*El sello cae*,
// `brand/mostrador/movimiento.json`: *a new stamp on her card … when the kitchen gave it*). A stamp is given at
// the kitchen — her scan of its code, its scan of hers, a plate handed over — often while her app is closed; so
// a stamp lands when her card shows MORE than she last saw on it, on whichever screen shows it next, in front.
// The phone keeps the count per card: a number per kitchen, her own, never a read of anyone's rows.
//   - NOTHING KEPT FOR A CARD (a new phone, a first look at it): nothing lands, and the count is kept.
//   - ⚠️ THE KITCHEN'S INVITATION SEEN (`@/ui/SeccionTarjeta`, no card yet) KEEPS 0 — so her first stamp there lands.
//   - FEWER THAN SHE SAW (a reward won empties the card; stamps that lapsed): nothing lands, and the new count is kept.
// ⚠️ PER LOGIN, AND IT OUTLIVES *CERRAR SESIÓN*, as the rewards celebrated do (`@/lib/festejado`). The last `MAXIMO`
// cards a login looked at are kept. Pure over the store it is handed; `test/movimiento.test.ts` runs it in memory.
// ============================================================================

/** The one key of the phone's store the counts are kept under. */
export const SELLOS_VISTOS_KEY = 'itacate.sellos-vistos';

/** How many cards a login keeps a count for — far more kitchens than anyone collects stamps at. */
export const MAXIMO = 60;

type PorUsuario = Record<string, Record<string, number>>;

function leerTodos(store: DeviceStore | undefined): PorUsuario {
  const raw = readKey(store, SELLOS_VISTOS_KEY);
  if (raw === null) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed) ? (parsed as PorUsuario) : {};
  } catch {
    return {};
  }
}

function deUsuario(todos: PorUsuario, usuario: string): Record<string, number> {
  const suyos = todos[usuario];
  return typeof suyos === 'object' && suyos !== null && !Array.isArray(suyos) ? suyos : {};
}

/** The stamps she last saw on this kitchen's card — `null`: this phone never showed it to her. */
export function sellosVistos(store: DeviceStore | undefined, usuario: string, cocinaId: string): number | null {
  const n = deUsuario(leerTodos(store), usuario)[cocinaId];
  return typeof n === 'number' && Number.isInteger(n) && n >= 0 ? n : null;
}

/** She has seen `sellos` on this kitchen's card: kept as the newest of her cards, every other login's untouched. */
export function marcarSellosVistos(store: DeviceStore | undefined, usuario: string, cocinaId: string, sellos: number): void {
  if (!Number.isInteger(sellos) || sellos < 0) return;
  const todos = leerTodos(store);
  const suyos = Object.entries(deUsuario(todos, usuario)).filter(([id]) => id !== cocinaId);
  const nuevos = Object.fromEntries([...suyos, [cocinaId, sellos] as const].slice(-MAXIMO));
  writeKey(store, SELLOS_VISTOS_KEY, JSON.stringify({ ...todos, [usuario]: nuevos }));
}

/**
 * The first place whose stamp lands, or `null` for none: with `visto` kept and the card now showing more, the
 * stamps from `visto` on are new (`visto` 5, `sellos` 6 → place 5, her sixth). Nothing kept, or no more: none.
 */
export function primerSelloNuevo(visto: number | null, sellos: number): number | null {
  return visto !== null && sellos > visto ? visto : null;
}
