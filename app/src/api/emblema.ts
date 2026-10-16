// ============================================================================
// WHICH DRAWING A SHOP WEARS IN ITS BAND — `8g`, the owner's option C,
// 2026-10-15, and his main giro of 2026-10-16.
//
// ⚠️⚠️ THE SHOP SAYS, AND NOTHING IS WORKED OUT. *"I'd rather have a main giro
// selected explicitly than making weights and calculations at a product
// level."* The first giro picked when the shop is created carries a star and is
// stored on the shop (`workspace.giro_principal`, `0056`); the owner changes it
// in Ajustes. This module only maps that code to a drawing. The rule it
// replaced — *a giro is the shop's when it holds half its products* — and the
// storefront for several giros are gone with it: *"there's always a Main Giro
// regardless if the person picks one or many."*
//
// ⚠️ NO MAIN GIRO, NO DRAWING. A shop made before `0056`, or with no giro at
// all, shows its name alone until the owner picks one.
//
// ⚠️ THE CODES ARE A CLAIM ABOUT `0045`–`0052`'s CONTENT, which is why this
// lives in `src/api/` and `db.yml` fires on it. A giro added later with no
// drawing here draws nothing rather than a wrong one.
// ============================================================================

/** The seven drawings, one per giro. */
export type Emblema =
  | 'polleria'
  | 'carniceria'
  | 'verduleria'
  | 'fruteria'
  | 'abarrotes'
  | 'cremeria'
  | 'materias';

/** `catalogo.tag.code` → the drawing, for every giro `0045`–`0052` define. */
export const GIRO_EMBLEMA: Readonly<Record<string, Emblema>> = {
  'giro-polleria': 'polleria',
  'giro-carniceria': 'carniceria',
  'giro-verduleria': 'verduleria',
  'giro-fruteria': 'fruteria',
  'giro-abarrotes': 'abarrotes',
  'giro-cremeria': 'cremeria',
  'giro-materias-primas': 'materias',
};

/** The main giros a shop may name, in the order Ajustes offers them. */
export const GIROS: readonly string[] = Object.keys(GIRO_EMBLEMA);

/**
 * The drawing for a shop's main giro, or `null` for none. ⚠️ `undefined` is
 * accepted on purpose: a shop restored from the cache written before `0056`
 * has no field at all (`persist.ts`).
 */
export function emblemaDe(giroPrincipal: string | null | undefined): Emblema | null {
  if (giroPrincipal === null || giroPrincipal === undefined) return null;
  return GIRO_EMBLEMA[giroPrincipal] ?? null;
}

/**
 * The order the giros were picked in, with `code` toggled: a new pick goes to
 * the end, an unpick leaves the others in their order. ⚠️ The FIRST is the main
 * giro (`principalDe`), so unpicking the starred one passes the star to the
 * next one picked.
 */
export function toggledInOrder(order: readonly string[], code: string): string[] {
  return order.includes(code) ? order.filter((c) => c !== code) : [...order, code];
}

/** The main giro of a pick order: the first one picked, or `null`. */
export function principalDe(order: readonly string[]): string | null {
  return order[0] ?? null;
}
