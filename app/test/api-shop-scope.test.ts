// ============================================================================
// EVERY READ OF A BUSINESS'S ROWS IS THE OPEN SHOP'S. Plan task `10.4b-ii`.
//
// ⚠️⚠️ WHY A SUITE READS TWO SOURCE FILES AS TEXT. The walls let a login read
// every business she belongs to, so the scope is a FILTER in the app, and a read
// that forgets it is not an error anywhere: a typecheck passes, every row it
// returns is one she may see, and in a shop of one person and one business it
// returns exactly what the filtered read would. It surfaces only for a person
// with a shop and a kitchen — two stores, no slider on Vender, measured
// 2026-10-29. `@/api/calls` cannot be loaded by this suite (it opens the live
// client), so what it CAN do is hold the file to its own rule: every read of a
// relation starts at `shopRows`, or is on the list below with its reason.
//
// ⚠️ AND WHAT IT CANNOT DO, SAID WITH IT: prove the filter keeps a kitchen out.
// That is `docs/checks/10.4b-ii-shop-scope-contract.sh`, which reads the
// relations `shopRows` is handed out of the same file and asks a real PostgREST,
// as a person with a shop and a kitchen, for each of them.
//
// ⚠️ COMMENTS ARE STRIPPED FIRST — `api-persist.test.ts`'s binding block gives
// the reason: prose naming a call is not a call.
// ============================================================================

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const SRC = fileURLToPath(new URL('../src', import.meta.url));

/** One source file with its comments removed. */
function code(rel: string): string {
  return readFileSync(`${SRC}/${rel}`, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

/** Every top-level function of a file, by name: its signature and its body. */
function functionsOf(source: string): Map<string, string> {
  const found = new Map<string, string>();
  let name: string | null = null;
  let body: string[] = [];
  for (const line of source.split('\n')) {
    const start = /^(?:export\s+)?(?:async\s+)?function\s+(\w+)/.exec(line);
    if (name === null && start !== null) {
      name = start[1];
      body = [line];
      continue;
    }
    if (name === null) continue;
    body.push(line);
    if (line === '}') {
      found.set(name, body.join('\n'));
      name = null;
    }
  }
  return found;
}

const calls = functionsOf(code('api/calls.ts'));
const hooksSource = code('api/hooks.ts');
const hooks = functionsOf(hooksSource);

/** A write is any of these on the builder — storage's upload among them. */
const WRITES = /\.(update|insert|upsert|delete|upload)\(/;

/**
 * ⚠️⚠️ THE SIXTEEN READS OF ONE SHOP'S ROWS — each starts at `shopRows`. A new
 * read of a business's rows joins this list and the contract check reads its
 * relation without being told.
 */
const SCOPED = [
  'catalogVariants',
  'collectionRequests',
  'documentsBetween',
  'monthRows',
  'purchaseLinesSince',
  'purchasePricesSince',
  'recentDocuments',
  'reversalsSince',
  'shopMagnitude',
  'shopProviders',
  'shopSales',
  'storeAddresses',
  'todaySales',
  'workspaceInvites',
  'workspaceLocations',
  'workspaceMembers',
].sort();

/**
 * ⚠️⚠️ EVERY OTHER READ IN THE FILE, AND WHY IT IS NOT A SHOP'S LIST. A read by a
 * product's or a supplier's id is one business's by construction: every foreign
 * key to `product_variant` and to `provider` carries `workspace_id` (read off the
 * database 2026-10-29), so no row of another business can reference it.
 */
const UNSCOPED: Readonly<Record<string, string>> = {
  myWorkspaces: "the person's shops — the list the open shop is taken from (`kind=eq.tienda`)",
  accountOwners: "the person's own owner memberships, both kinds on purpose (`10.4b-i`)",
  catalogUnits: 'the ten units — reference data with no business column',
  firstStoreOf: 'filtered on the business it is handed — the shop onboarding just made',
  pilotReadingsSince: 'filtered on the business it is handed (`PILOT_WORKSPACE_COLUMN`)',
  variantPrices: "one product's prices, by its id",
  variantSettingsRow: "one product's row, by its id",
  variantCosts: "one product's deliveries, by its id",
  priceSide: "one product's price history, by its id",
  providerMemory: "one supplier's prices, by its id",
  supplierLines: "one supplier's delivery lines, by its id",
  providerDetail: "one supplier's row, by its id",
};

describe('every read in `@/api/calls` of a business’s rows starts at `shopRows`', () => {
  it('reads the real file, so nothing below can pass vacuously', () => {
    expect(calls.size).toBeGreaterThan(40);
    expect(calls.get('shopRows')).toMatch(/\.eq\(SHOP_COLUMN, shopId\)/);
  });

  it('scopes exactly the sixteen reads of a shop’s rows', () => {
    const scoped = [...calls].filter(([, body]) => /\bshopRows\(/.test(body)).map(([name]) => name);
    expect(scoped.filter((name) => name !== 'shopRows').sort()).toEqual(SCOPED);
  });

  it('hands each the open shop, first, and filters on it', () => {
    for (const name of SCOPED) {
      const body = calls.get(name) ?? '';
      expect(body, name).toMatch(new RegExp(`function ${name}(<[^>]*>)?\\(\\s*shopId: string`));
      expect(body, name).toMatch(/\bshopRows\([^()]*(\([^()]*\))?[^()]*,\s*shopId\)/);
    }
  });

  it('reads nothing else directly but what the list says, each with its reason', () => {
    // ⚠️⚠️ THE ASSERTION THAT EARNS THE FILE: a new `.from(…).select(…)` of a
    // business's rows that does not start at `shopRows` is red here, by name.
    const direct = [...calls]
      .filter(([name, body]) => name !== 'shopRows' && /\.from\(/.test(body) && !WRITES.test(body))
      .map(([name]) => name)
      .sort();
    expect(direct).toEqual(Object.keys(UNSCOPED).sort());
  });
});

describe('every hook over those reads asks for the open shop, and keys on it', () => {
  /** Where each hook's text starts and ends in the file. */
  const spans = [...hooks.values()].map((body) => {
    const start = hooksSource.indexOf(body);
    return { body, start, end: start + body.length };
  });

  /** Each call of a scoped read in `@/api/hooks`: its argument, its query so far, its hook. */
  const sites = SCOPED.flatMap((name) =>
    [...hooksSource.matchAll(new RegExp(`\\b${name}(<[^>]*>)?\\(\\s*([A-Za-z]+)`, 'g'))].map((match) => {
      const at = match.index ?? 0;
      const before = hooksSource.slice(0, at);
      const block = Math.max(before.lastIndexOf('useQuery('), before.lastIndexOf('useQuery<'), before.lastIndexOf('fetchQuery('));
      const hook = spans.find((span) => span.start <= at && at < span.end);
      return { name, argument: match[2], query: hooksSource.slice(block, at), hook: hook?.body ?? '' };
    }),
  );

  it('finds every one of the sixteen called, so nothing below can pass vacuously', () => {
    expect(new Set(sites.map((site) => site.name)).size).toBe(SCOPED.length);
    expect(sites.length).toBeGreaterThanOrEqual(SCOPED.length);
  });

  it('passes each the open shop', () => {
    for (const site of sites) expect(['shopId', 'shop'], site.name).toContain(site.argument);
  });

  it('keys each on the shop, so no cache answers one business with another’s rows', () => {
    for (const site of sites) expect(site.query, site.name).toMatch(/queryKey:\s*shopKey\(/);
  });

  it('runs none of them until the shop is known', () => {
    for (const site of sites) expect(site.hook, site.name).toMatch(/shopId [!=]== null/);
  });
});
