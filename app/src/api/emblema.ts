// ============================================================================
// WHICH DRAWING A SHOP WEARS IN ITS BAND — `8g`, the owner's option C,
// 2026-10-15: *"a small watermark at the top based on the giro of the store."*
//
// ⚠️⚠️ NOTHING RECORDS A SHOP'S GIRO, SO IT IS READ OFF WHAT THE SHOP HOLDS.
// `import_catalog` (`0044`) copies products, not a choice: each copied variant
// keeps its `template_code`, and the template says which giros each product
// belongs to. So a giro is the shop's when the shop holds **at least half** of
// that giro's products — the threshold that keeps *Huevo*, which Abarrotes,
// Cremería and Pollería all carry, from making every abarrotes a pollería.
//
// ⚠️ ONE GIRO DRAWS ITS OWN PICTURE; NONE, OR SEVERAL, DRAWS THE STOREFRONT.
// Decided on the owner's behalf, as recommended to him: a shop that sells
// fruit, vegetables and groceries is a *tienda*, and a shop that imported
// nothing is one too.
//
// ⚠️ THE TAG CODES ARE A CLAIM ABOUT `0044`'s CONTENT MIGRATIONS (`0045`–`0052`),
// which is why this lives in `src/api/` and `db.yml` fires on it. A giro added
// later with no drawing here simply never wins — its shops get the storefront.
//
// ⚠️ THE ANSWER IS REMEMBERED ON THE PHONE, PER SHOP (`@/lib/store`), because
// the template is a large read and the pilot store is offline a lot: the band
// must draw the same picture on a cold start without signal.
// ============================================================================
import type { ShopHolding, Template } from '@/api/starterCatalog';
import { readKey, writeKey, type DeviceStore } from '@/lib/store';

/** The eight drawings: one per giro, and the storefront. */
export type Emblema =
  | 'polleria'
  | 'carniceria'
  | 'verduleria'
  | 'fruteria'
  | 'abarrotes'
  | 'cremeria'
  | 'materias'
  | 'tienda';

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

const EMBLEMAS: readonly Emblema[] = [
  'polleria',
  'carniceria',
  'verduleria',
  'fruteria',
  'abarrotes',
  'cremeria',
  'materias',
  'tienda',
];

export function isEmblema(value: string | null): value is Emblema {
  return value !== null && (EMBLEMAS as readonly string[]).includes(value);
}

/**
 * The shop's drawing, or `null` when the template has nothing in it to read
 * (not loaded, or empty) — never a guess.
 */
export function emblemaDe(template: Template, holding: ShopHolding): Emblema | null {
  if (template.products.length === 0) return null;
  const total = new Map<string, number>();
  const held = new Map<string, number>();
  for (const product of template.products) {
    const mine = holding.templateCodes.has(product.code);
    for (const tag of product.tags) {
      if (GIRO_EMBLEMA[tag] === undefined) continue;
      total.set(tag, (total.get(tag) ?? 0) + 1);
      if (mine) held.set(tag, (held.get(tag) ?? 0) + 1);
    }
  }
  const giros = [...total.keys()].filter((tag) => (held.get(tag) ?? 0) * 2 >= (total.get(tag) ?? 0));
  if (giros.length !== 1) return 'tienda';
  return GIRO_EMBLEMA[giros[0] as string] ?? 'tienda';
}

const keyOf = (workspaceId: string) => `wera.emblema.${workspaceId}`;

/** What this phone last worked out for this shop, or `null`. */
export function readEmblema(store: DeviceStore | undefined, workspaceId: string): Emblema | null {
  const stored = readKey(store, keyOf(workspaceId));
  return isEmblema(stored) ? stored : null;
}

export function rememberEmblema(
  store: DeviceStore | undefined,
  workspaceId: string,
  emblema: Emblema,
): void {
  writeKey(store, keyOf(workspaceId), emblema);
}
