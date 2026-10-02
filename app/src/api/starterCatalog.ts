// ============================================================================
// THE STARTER CATALOG, AS A CONTRACT WITH POSTGRES. Plan task `9d`, `## Step 9`.
//
// Two RPCs from `0044`: `catalog_template()` reads the catalog Wera maintains,
// by giro, and `import_catalog()` copies the chosen part of it into one shop.
// Everything with a right answer is here and nothing that talks (`R3`): the
// RPC names and `p_` arguments (`R13`), the wire shape, which giros a picker
// offers, how the list groups, what is already in the shop, and what is sent.
// `app/test/api-starter-catalog.test.ts` reads it;
// `docs/checks/9d-starter-catalog-contract.sh` holds it to a real PostgREST.
//
// ⚠️⚠️ THE OWNER'S RULING OF 2026-10-01 IS THE SHAPE OF THIS FILE: CHOOSE GIROS,
// THEN AN UNTICK LIST, THEN IMPORT. An imported product can never be retired
// (`0042`'s fence), so the list is the only place a shopkeeper can say *"we
// don't sell that"*. Everything starts ticked; what is unticked goes to
// `p_exclude`. ⚠️ So the SELECTION is held as what is EXCLUDED, never as what is
// included: a giro ticked after products were unticked keeps those unticked,
// and a product two giros share is one decision, not two.
//
// ⚠️ "ALREADY IN YOUR SHOP" IS THE IMPORT'S OWN RULE, COPIED: the code is in the
// shop (`template_code`), or a product of that name is (`normalize_name`, which
// is `searchKey`). Those rows are neither offered nor counted, because the
// import would skip them anyway — a count that included them would promise
// products that never arrive. ⚠️ The family rule (C8.5: a shop family of that
// name holding another measure) is NOT copied: it needs the shop's units, and
// the import reports what it skipped instead (`ImportResult.skipped`).
//
// ⚠️ EVERY NUMBER CROSSES AS TEXT (`0044`) and none is parsed here: the picker
// shows names, and the import copies the template's own values server-side.
// ============================================================================

import { searchKey } from '@/api/catalog';

/** `0044`. The whole template, one JSON object. */
export const CATALOG_TEMPLATE = 'catalog_template';

/** `0044`. Copies every product carrying any of `p_tags`, minus `p_exclude`. */
export const IMPORT_CATALOG = 'import_catalog';

/**
 * The key the template is cached under, in memory only.
 *
 * ⚠️ DELIBERATELY NOT PERSISTED (`@/api/persist`). The import needs a connection,
 * so a picker drawn offline from a stored template could only offer a button
 * that fails. Without signal the picker says it needs one instead. The products
 * a shop IMPORTED are what must work offline, and they do: they are ordinary
 * rows of `['catalog', 'variants']`, which is persisted.
 */
export const TEMPLATE_KEY = ['catalog', 'template'] as const;

export type TagKind = 'giro' | 'categoria';

export interface TemplateTag {
  readonly code: string;
  readonly kind: TagKind;
  readonly label: string;
}

export interface TemplateFamily {
  readonly code: string;
  readonly name: string;
}

export interface TemplateProduct {
  readonly code: string;
  /** The family's CODE. */
  readonly family: string;
  readonly name: string;
  readonly tags: readonly string[];
}

export interface Template {
  readonly tags: readonly TemplateTag[];
  readonly families: readonly TemplateFamily[];
  readonly products: readonly TemplateProduct[];
}

export const EMPTY_TEMPLATE: Template = { tags: [], families: [], products: [] };

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const text = (v: unknown): string | null => (typeof v === 'string' ? v : null);

/**
 * The RPC's JSON, as this app holds it.
 *
 * ⚠️ A ROW IT CANNOT READ IS DROPPED, NOT GUESSED AT — and an answer that is not
 * the three-list object at all is the empty template, which draws as *no giros
 * to offer*. The unit and tax fields are deliberately not carried: nothing on
 * this side reads them, and the import copies them in Postgres.
 */
export function templateFrom(data: unknown): Template {
  if (!isRecord(data)) return EMPTY_TEMPLATE;
  const list = (key: string): unknown[] => (Array.isArray(data[key]) ? (data[key] as unknown[]) : []);

  const tags: TemplateTag[] = [];
  for (const raw of list('tags')) {
    if (!isRecord(raw)) continue;
    const code = text(raw.code);
    const label = text(raw.label);
    const kind = raw.kind === 'giro' || raw.kind === 'categoria' ? raw.kind : null;
    if (code && label && kind) tags.push({ code, kind, label });
  }

  const families: TemplateFamily[] = [];
  for (const raw of list('families')) {
    if (!isRecord(raw)) continue;
    const code = text(raw.code);
    const name = text(raw.name);
    if (code && name) families.push({ code, name });
  }

  const products: TemplateProduct[] = [];
  for (const raw of list('products')) {
    if (!isRecord(raw)) continue;
    const code = text(raw.code);
    const family = text(raw.family);
    const name = text(raw.name);
    const rawTags = Array.isArray(raw.tags) ? raw.tags : [];
    const productTags = rawTags.filter((t): t is string => typeof t === 'string');
    if (code && family && name) products.push({ code, family, name, tags: productTags });
  }

  return { tags, families, products };
}

/** What the shop already holds, as the import decides it. */
export interface ShopHolding {
  readonly templateCodes: ReadonlySet<string>;
  readonly names: ReadonlySet<string>;
}

/**
 * The shop's holding, out of its own catalog read — every ACTIVE variant's
 * template code and folded name.
 *
 * ⚠️ A retired product still blocks its name in the database (`normalize_name`
 * is unique per workspace whatever `is_active` says), so a picker that offered
 * it would promise one product more than arrives. The hook passes the whole
 * read for that reason; `catalogFrom` drops inactive rows and is not used here.
 */
export function holdingFrom(
  rows: readonly { readonly name: string; readonly template_code: string | null }[] | undefined,
): ShopHolding {
  const templateCodes = new Set<string>();
  const names = new Set<string>();
  for (const row of rows ?? []) {
    if (row.template_code) templateCodes.add(row.template_code);
    names.add(searchKey(row.name));
  }
  return { templateCodes, names };
}

export const NOTHING_HELD: ShopHolding = { templateCodes: new Set(), names: new Set() };

/** Would the import skip this product as already in the shop? */
export function alreadyIn(product: TemplateProduct, holding: ShopHolding): boolean {
  return holding.templateCodes.has(product.code) || holding.names.has(searchKey(product.name));
}

/** One giro the picker can offer, with how many products it would bring. */
export interface GiroChoice {
  readonly code: string;
  readonly label: string;
  /** Products this giro carries that the shop does not hold yet. */
  readonly count: number;
}

/**
 * The giros to offer, in the template's order.
 *
 * ⚠️ A GIRO WITH NOTHING LEFT TO BRING IS NOT OFFERED. That is every giro but
 * Pollería until its content session lands, and it is also a giro whose every
 * product this shop already holds — a pill that imports nothing is a tap that
 * looks broken.
 */
export function giroChoices(template: Template, holding: ShopHolding): readonly GiroChoice[] {
  return template.tags
    .filter((tag) => tag.kind === 'giro')
    .map((tag) => ({
      code: tag.code,
      label: tag.label,
      count: template.products.filter((p) => p.tags.includes(tag.code) && !alreadyIn(p, holding)).length,
    }))
    .filter((choice) => choice.count > 0);
}

/** One family of the untick list. */
export interface FamilyGroup {
  readonly code: string;
  readonly name: string;
  readonly products: readonly TemplateProduct[];
}

/**
 * The untick list: every product a chosen giro carries that the shop does not
 * hold, grouped by family in the template's own order, each product ONCE even
 * when two chosen giros share it.
 */
export function offeredGroups(
  template: Template,
  chosen: ReadonlySet<string>,
  holding: ShopHolding,
): readonly FamilyGroup[] {
  const offered = template.products.filter(
    (p) => p.tags.some((t) => chosen.has(t)) && !alreadyIn(p, holding),
  );
  const byFamily = new Map<string, TemplateProduct[]>();
  for (const product of offered) {
    const list = byFamily.get(product.family) ?? [];
    list.push(product);
    byFamily.set(product.family, list);
  }
  const names = new Map(template.families.map((f) => [f.code, f.name]));
  return [...byFamily.entries()].map(([code, products]) => ({
    code,
    name: names.get(code) ?? code,
    products,
  }));
}

/** How many products `Importar` would bring: offered, minus unticked. */
export function importCount(groups: readonly FamilyGroup[], excluded: ReadonlySet<string>): number {
  let n = 0;
  for (const group of groups) for (const p of group.products) if (!excluded.has(p.code)) n++;
  return n;
}

/** `excluded` with one product's tick flipped. A new set — React compares by reference. */
export function toggled(excluded: ReadonlySet<string>, code: string): ReadonlySet<string> {
  const next = new Set(excluded);
  if (next.has(code)) next.delete(code);
  else next.add(code);
  return next;
}

/** What a shopkeeper chose, in the app's words. */
export interface ImportChoice {
  readonly giros: readonly string[];
  readonly excluded: readonly string[];
}

/**
 * What the screen's two sets mean, as a choice — or `null`, which is *Omitir*.
 *
 * ⚠️ ONLY WHAT IS STILL OFFERED IS SENT AS EXCLUDED. A product unticked under a
 * giro that was later unchosen is not a decision about anything being
 * imported, and sending it would make `p_exclude` a record of the shopkeeper's
 * scrolling rather than of what she said no to.
 */
export function choiceFrom(
  template: Template | null,
  chosen: ReadonlySet<string>,
  excluded: ReadonlySet<string>,
  holding: ShopHolding,
): ImportChoice | null {
  if (template === null || chosen.size === 0) return null;
  const offered = new Set(
    offeredGroups(template, chosen, holding).flatMap((g) => g.products.map((p) => p.code)),
  );
  return {
    giros: template.tags.filter((t) => chosen.has(t.code)).map((t) => t.code),
    excluded: [...excluded].filter((code) => offered.has(code)).sort(),
  };
}

/** The import's arguments, by the names `0044` declared (`R13`). */
export interface ImportArgs {
  readonly p_workspace_id: string;
  readonly p_tags: readonly string[];
  readonly p_exclude: readonly string[];
}

/**
 * The arguments, or `null` when there is nothing to send.
 *
 * ⚠️ NO GIRO IS *OMITIR*, NOT AN ERROR. `import_catalog` refuses an empty tag
 * list with `23514`, which is right for a client bug and wrong for a shopkeeper
 * who chose nothing — so the call is simply not made.
 */
export function importArgs(workspaceId: string, choice: ImportChoice): ImportArgs | null {
  if (choice.giros.length === 0) return null;
  return {
    p_workspace_id: workspaceId,
    p_tags: [...choice.giros],
    p_exclude: [...choice.excluded].sort(),
  };
}

/** What the import says it did. */
export interface ImportResult {
  readonly imported: number;
  readonly skipped: number;
}

/** `{"imported": n, "skipped": n}`, or a thrown error naming what came back instead. */
export function importResultFrom(data: unknown): ImportResult {
  if (isRecord(data) && typeof data.imported === 'number' && typeof data.skipped === 'number') {
    return { imported: data.imported, skipped: data.skipped };
  }
  throw new Error(`${IMPORT_CATALOG} returned ${JSON.stringify(data)}, expected {imported, skipped}`);
}
