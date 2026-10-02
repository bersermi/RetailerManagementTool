// ============================================================================
// The generator's own suite. docs/PLAN.md task `9b`.
//
//   node --test supabase/catalog/
//
// ⚠️ EVERY REFUSAL IS ASSERTED BY ITS REASON, not by "there was a problem". A
// fixture that is refused for the WRONG reason — a header typo, say — would
// pass a count check and prove nothing ([[tab-delimiter-collapses-empty-fields]]).
//
// ⚠️ UNITS COME FROM THE REAL `supabase/migrations/`, never from a fixture: the
// claim under test is that the generator knows the units the database knows.
// ============================================================================

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

import {
  loadCatalog, renderSql, readUnits, parseCsv, normalizeName,
  newestCatalogMigration, nextMigrationNumber,
} from './build.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS = join(HERE, '..', 'migrations');

const TAGS = 'code,kind,label\ngiro-polleria,giro,Pollería\ngiro-cremeria,giro,Cremería\ncat-huevo,categoria,Huevo\n';
const FAMILIES = 'code,name,default_lifespan_days,track_expiry\npollo,Pollo,3,no\nhuevo,Huevo,,\n';
const HEADER = 'code,family,name,base,purchase,sell,price,pack_size,tax_rate,tags\n';
const GOOD = HEADER +
  'pechuga,pollo,Pechuga,g,kg,g,kg,,0,giro-polleria\n' +
  'huevo-blanco,huevo,Huevo blanco,pza,pza,pza,pza,360,0,giro-polleria giro-cremeria cat-huevo\n';

function fixture({ tags = TAGS, families = FAMILIES, products = { 'polleria.csv': GOOD } } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'catalogo-'));
  writeFileSync(join(dir, 'tags.csv'), tags);
  writeFileSync(join(dir, 'families.csv'), families);
  mkdirSync(join(dir, 'products'));
  for (const [name, body] of Object.entries(products)) writeFileSync(join(dir, 'products', name), body);
  return dir;
}

const load = (opts) => loadCatalog(fixture(opts), MIGRATIONS);
const problemsWith = (opts, rx) => load(opts).problems.filter((p) => rx.test(p));

// --- the readers ------------------------------------------------------------

test('units are read from the migrations: the base units and a derived one, each with its dimension', () => {
  const units = readUnits(MIGRATIONS);
  assert.deepEqual(units.get('g'), { dimension: 'mass', base: 'g' });
  assert.deepEqual(units.get('kg'), { dimension: 'mass', base: 'g' });
  assert.deepEqual(units.get('pza'), { dimension: 'count', base: 'pza' });
  assert.deepEqual(units.get('l'), { dimension: 'volume', base: 'ml' });
});

test('normalizeName agrees with public.normalize_name on case, padding and repeated spaces — and keeps accents', () => {
  assert.equal(normalizeName('  Pechuga   SIN  hueso '), 'pechuga sin hueso');
  assert.notEqual(normalizeName('Plátano'), normalizeName('Platano'));
});

test('the CSV reader keeps a quoted comma, a doubled quote, accents and CRLF', () => {
  const rows = parseCsv('a,b\r\n"Queso, fresco","dice ""hola""",ñ\r\n');
  assert.deepEqual(rows, [['a', 'b'], ['Queso, fresco', 'dice "hola"', 'ñ']]);
});

// --- a good catalog ---------------------------------------------------------

test('a good catalog loads with no problems', () => {
  const c = load();
  assert.deepEqual(c.problems, []);
  assert.equal(c.products.length, 2);
  assert.deepEqual(c.products[1].tagList, ['giro-polleria', 'giro-cremeria', 'cat-huevo']);
});

test('the SQL is a snapshot: stale products deleted first, families and tags last, image_path never written', () => {
  const sql = renderSql(load());
  const at = (s) => sql.indexOf(s);
  assert.ok(at("delete from catalogo.product where code not in ('pechuga', 'huevo-blanco');") > 0);
  assert.ok(at('delete from catalogo.product where') < at('insert into catalogo.product ('));
  assert.ok(at('insert into catalogo.product (') < at('delete from catalogo.family where'));
  assert.ok(at('delete from catalogo.tag where') < at('insert into catalogo.product_tag'));
  assert.ok(!/image_path/.test(sql.replace(/^--.*$/gm, '')), 'image_path appears outside a comment');
  assert.match(sql, /\('huevo-blanco', 'huevo', 'Huevo blanco', 'pza', 'pza', 'pza', 'pza', 360, 0, 2\)/);
  assert.match(sql, /\('pechuga', 'pollo', 'Pechuga', 'g', 'kg', 'g', 'kg', 1, 0, 1\)/);
  assert.match(sql, /count\(\*\) from catalogo\.product_tag\) <> 4 then/);
});

test('the SQL is deterministic — the property --check rests on', () => {
  assert.equal(renderSql(load()), renderSql(load()));
});

test('a quote in a name is escaped, not executed', () => {
  const c = load({ products: { 'p.csv': HEADER + "pollo-don,pollo,Pollo de Don Juan's,g,kg,g,kg,,0,giro-polleria\n" } });
  assert.deepEqual(c.problems, []);
  assert.match(renderSql(c), /'Pollo de Don Juan''s'/);
});

// --- every refusal, by its reason -------------------------------------------

test('refuses an unknown unit, and names the field', () => {
  const p = problemsWith({ products: { 'p.csv': HEADER + 'x,pollo,X,g,caja,g,kg,,0,giro-polleria\n' } }, /unknown unit/);
  assert.equal(p.length, 1);
  assert.match(p[0], /p\.csv:2: unknown unit\(s\) purchase="caja"/);
});

test('refuses units spanning two dimensions in one product', () => {
  const p = problemsWith({ products: { 'p.csv': HEADER + 'x,pollo,X,g,pza,g,kg,,0,giro-polleria\n' } }, /span/);
  assert.match(p[0], /units span mass and count/);
});

test('refuses a base unit that is not a base', () => {
  const p = problemsWith({ products: { 'p.csv': HEADER + 'x,pollo,X,kg,kg,kg,kg,,0,giro-polleria\n' } }, /not a base unit/);
  assert.match(p[0], /base "kg" is not a base unit — use "g"/);
});

test('refuses a family holding two dimensions, across files (C8.5)', () => {
  const p = problemsWith({ products: {
    'a.csv': HEADER + 'pechuga,pollo,Pechuga,g,kg,g,kg,,0,giro-polleria\n',
    'b.csv': HEADER + 'pollo-pza,pollo,Pollo pieza,pza,pza,pza,pza,,0,giro-polleria\n',
  } }, /one family, one dimension/);
  assert.match(p[0], /b\.csv:2: family "pollo" is mass at a\.csv:2, and this product is count/);
});

test('refuses a code used twice, across files — the overlap is a tag, never a second row', () => {
  const p = problemsWith({ products: {
    'polleria.csv': GOOD,
    'cremeria.csv': HEADER + 'huevo-blanco,huevo,Huevo blanco grande,pza,pza,pza,pza,,0,giro-cremeria\n',
  } }, /already used/);
  // Files are read in name order, so cremeria.csv's row is first and polleria.csv's is the duplicate.
  assert.match(p[0], /polleria\.csv:3: product code "huevo-blanco" is already used at cremeria\.csv:2/);
});

test('refuses two products whose names normalize alike', () => {
  const p = problemsWith({ products: { 'p.csv': GOOD + 'pechuga-2,pollo,  PECHUGA ,g,kg,g,kg,,0,giro-polleria\n' } }, /same name/);
  assert.match(p[0], /p\.csv:4: product "PECHUGA" has the same name as p\.csv:2/);
});

test('refuses an undeclared tag, and a product no giro carries', () => {
  const und = problemsWith({ products: { 'p.csv': HEADER + 'x,pollo,X,g,kg,g,kg,,0,giro-polleria giro-nada\n' } }, /not in tags\.csv/);
  assert.match(und[0], /tag\(s\) giro-nada are not in tags\.csv/);
  const nogiro = problemsWith({ products: { 'p.csv': HEADER + 'x,huevo,X,pza,pza,pza,pza,,0,cat-huevo\n' } }, /no giro tag/);
  assert.equal(nogiro.length, 1);
});

test('refuses IVA written as a percentage', () => {
  const p = problemsWith({ products: { 'p.csv': HEADER + 'x,pollo,X,g,kg,g,kg,,16,giro-polleria\n' } }, /tax_rate/);
  assert.match(p[0], /tax_rate "16" must be a rate like 0 or 0\.16/);
});

test('refuses a family that families.csv does not declare', () => {
  const p = problemsWith({ products: { 'p.csv': HEADER + 'x,res,X,g,kg,g,kg,,0,giro-polleria\n' } }, /not in families\.csv/);
  assert.match(p[0], /family "res" is not in families\.csv/);
});

test('refuses a wrong header rather than reading columns out of place', () => {
  const p = problemsWith({ products: { 'p.csv': 'code,name,family,base,purchase,sell,price,pack_size,tax_rate,tags\n' } }, /header must be exactly/);
  assert.equal(p.length, 1);
});

test('refuses a code that is not lower-case-with-hyphens', () => {
  const p = problemsWith({ products: { 'p.csv': HEADER + 'Pechuga_1,pollo,X,g,kg,g,kg,,0,giro-polleria\n' } }, /not lower-case/);
  assert.equal(p.length, 1);
});

// --- the migration files ------------------------------------------------------

test('the next migration number is one past the highest — 0006 and 0007 are holes, never refilled', () => {
  const highest = Math.max(...readdirSync(MIGRATIONS).map((f) => Number(/^(\d{4})_/.exec(f)?.[1] ?? 0)));
  assert.equal(nextMigrationNumber(MIGRATIONS), String(highest + 1).padStart(4, '0'));
});

test('--check passes on a matching snapshot and fails, saying why, on a CSV edited after it', () => {
  const root = mkdtempSync(join(tmpdir(), 'catalogo-cli-'));
  const catalog = join(root, 'catalog');
  const migrations = join(root, 'migrations');
  mkdirSync(join(catalog, 'products'), { recursive: true });
  mkdirSync(migrations);
  // The fixture CLI reads units from the real migrations, so they are copied in —
  // ⚠️ EVERY ONE BUT THE CATALOG SNAPSHOTS. Copying `0045_catalogo_polleria.sql`
  // too made this fixture's "no catalog migration yet" false the day real content
  // landed, and CI went red on `9c` while the suite had last run before `0045`.
  for (const f of readdirSync(MIGRATIONS).filter((name) => !/_catalogo_/.test(name))) {
    writeFileSync(join(migrations, f), readFileSync(join(MIGRATIONS, f)));
  }
  writeFileSync(join(catalog, 'build.mjs'), readFileSync(join(HERE, 'build.mjs')));
  writeFileSync(join(catalog, 'tags.csv'), TAGS);
  writeFileSync(join(catalog, 'families.csv'), FAMILIES);
  writeFileSync(join(catalog, 'products', 'polleria.csv'), GOOD);
  const cli = (...args) => {
    try { return { code: 0, out: execFileSync('node', [join(catalog, 'build.mjs'), ...args], { encoding: 'utf8', stdio: 'pipe' }) }; }
    catch (e) { return { code: e.status, out: `${e.stdout}${e.stderr}` }; }
  };

  const none = cli('--check');
  assert.equal(none.code, 1);
  assert.match(none.out, /no catalog migration exists/);

  const wrote = cli('--write', 'polleria');
  assert.equal(wrote.code, 0, wrote.out);
  const file = newestCatalogMigration(migrations);
  assert.match(file, /^\d{4}_catalogo_polleria\.sql$/);
  assert.equal(cli('--check').code, 0);

  const again = cli('--write', 'polleria');
  assert.equal(again.code, 1);
  assert.match(again.out, /nothing to write/);

  writeFileSync(join(catalog, 'products', 'polleria.csv'), GOOD.replace('Pechuga', 'Pechuga entera'));
  const drift = cli('--check');
  assert.equal(drift.code, 1);
  assert.match(drift.out, /the CSVs changed since/);

  writeFileSync(join(catalog, 'products', 'polleria.csv'), GOOD.replace(',0,giro-polleria\n', ',16,giro-polleria\n'));
  const bad = cli('--write', 'x');
  assert.equal(bad.code, 1);
  assert.match(bad.out, /REFUSED — 1 problem\(s\), nothing written/);
  assert.equal(newestCatalogMigration(migrations), file, 'a refused build wrote a file');
});
