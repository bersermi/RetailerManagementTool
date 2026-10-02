#!/usr/bin/env node
// ============================================================================
// THE STARTER CATALOG'S GENERATOR. docs/PLAN.md task `9b`, `## Step 9`.
//
// Reads the CSVs beside this file and writes ONE migration that makes
// `catalogo` (`0044`) equal to them — a SNAPSHOT, not a diff:
//
//   node supabase/catalog/build.mjs --write <label>   # e.g. --write polleria
//   node supabase/catalog/build.mjs --check           # CI: CSVs and the newest
//                                                     # catalog migration agree
//
// ⚠️⚠️ WHY A SNAPSHOT. The giros overlap, and a later giro's session TAGS a row
// that an earlier giro's file already holds rather than adding it twice. A
// migration per giro that only inserted that giro's rows would miss the new
// tag on the old row. So every content migration carries the WHOLE template,
// and the newest one wins: tags and families and products that left the CSVs
// leave the template, and everything else is upserted on its code.
//
// ⚠️ A CODE NEVER CHANGES. A shop's imported product remembers its template
// row by `product_variant.template_code`, which is set once. Renaming a
// product is editing its `name`; changing its `code` is deleting it and adding
// a stranger — every shop that imported it loses the link to its picture.
//
// ⚠️ PICTURES ARE NOT HERE. `image_path` is not a CSV column and the upsert
// never touches it, so a picture assigned later survives every regeneration.
//
// ⚠️ UNITS ARE READ FROM THE MIGRATIONS, NEVER COPIED. `public.unit` is
// written by `insert into public.unit` statements in `supabase/migrations/`;
// this file parses them, so a unit a future migration adds is known here the
// day it lands, and there is no second list to drift. The database still has
// the last word — `0044`'s triggers refuse what this file might have missed —
// but a refusal HERE names the CSV row, and a refusal there names a code.
//
// No dependency: node's standard library only, so CI runs it before `npm ci`.
// ============================================================================

import { readFileSync, readdirSync, writeFileSync, existsSync, realpathSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));

export const HEADERS = {
  tags: ['code', 'kind', 'label'],
  families: ['code', 'name', 'default_lifespan_days', 'track_expiry'],
  products: ['code', 'family', 'name', 'base', 'purchase', 'sell', 'price', 'pack_size', 'tax_rate', 'tags'],
};

const CODE_RX = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const KINDS = new Set(['giro', 'categoria']);

/** `public.normalize_name()`, `0002`: lower(btrim(regexp_replace(name, '\s+', ' ', 'g'))). */
export function normalizeName(name) {
  return name.replace(/\s+/g, ' ').trim().toLowerCase();
}

/** A small RFC 4180 reader: quoted fields, doubled quotes, CRLF or LF. */
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); rows.push(row); row = []; field = '';
    } else field += c;
  }
  if (field !== '' || row.length > 0) { row.push(field); rows.push(row); }
  // A trailing blank line is not a row.
  return rows.filter((r) => !(r.length === 1 && r[0].trim() === ''));
}

/** Every unit any migration inserts: code → { dimension, base }. */
export function readUnits(migrationsDir) {
  const units = new Map();
  const tuple = /\(\s*'([^']+)'\s*,\s*'([^']+)'\s*,\s*'([^']+)'\s*,\s*[\d.]+\s*,\s*\d+\s*\)/g;
  for (const file of readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort()) {
    const sql = readFileSync(join(migrationsDir, file), 'utf8');
    const block = /insert into public\.unit\s*\(code, dimension, base_code, factor_to_base, display_order\)\s*values([\s\S]*?);/g;
    for (const m of sql.matchAll(block)) {
      // Strip `--` comments before reading tuples, so a comment cannot add a unit.
      const body = m[1].replace(/--[^\n]*/g, '');
      for (const t of body.matchAll(tuple)) units.set(t[1], { dimension: t[2], base: t[3] });
    }
  }
  return units;
}

/** One CSV as objects, with the file and line each came from. */
function readTable(path, kind, problems) {
  const rows = parseCsv(readFileSync(path, 'utf8'));
  const where = basename(path);
  if (rows.length === 0) { problems.push(`${where}: empty — the header row is required`); return []; }
  const header = rows[0].map((h) => h.trim());
  if (header.join(',') !== HEADERS[kind].join(',')) {
    problems.push(`${where}: header must be exactly "${HEADERS[kind].join(',')}" — found "${header.join(',')}"`);
    return [];
  }
  return rows.slice(1).map((cells, i) => {
    const at = `${where}:${i + 2}`;
    if (cells.length !== header.length) {
      problems.push(`${at}: ${cells.length} fields, expected ${header.length}`);
    }
    const obj = { at };
    header.forEach((h, k) => { obj[h] = (cells[k] ?? '').trim(); });
    return obj;
  });
}

/**
 * Read and validate the whole catalog. Returns { tags, families, products, problems };
 * a non-empty `problems` means nothing may be written.
 */
export function loadCatalog(catalogDir, migrationsDir) {
  const problems = [];
  const units = readUnits(migrationsDir);
  if (units.size === 0) problems.push(`no units found in ${migrationsDir} — the unit parser read nothing`);

  const tags = readTable(join(catalogDir, 'tags.csv'), 'tags', problems);
  const families = readTable(join(catalogDir, 'families.csv'), 'families', problems);
  const productsDir = join(catalogDir, 'products');
  const productFiles = existsSync(productsDir)
    ? readdirSync(productsDir).filter((f) => f.endsWith('.csv')).sort()
    : [];
  const products = productFiles.flatMap((f) => readTable(join(productsDir, f), 'products', problems));

  // --- codes, once each, everywhere --------------------------------------
  const seen = new Map();
  for (const [kind, list] of [['tag', tags], ['family', families], ['product', products]]) {
    for (const r of list) {
      if (!CODE_RX.test(r.code)) problems.push(`${r.at}: code "${r.code}" is not lower-case-with-hyphens`);
      const key = `${kind}:${r.code}`;
      if (seen.has(key)) problems.push(`${r.at}: ${kind} code "${r.code}" is already used at ${seen.get(key)}`);
      else seen.set(key, r.at);
    }
  }

  // --- tags ----------------------------------------------------------------
  const tagByCode = new Map(tags.map((t) => [t.code, t]));
  for (const t of tags) {
    if (!KINDS.has(t.kind)) problems.push(`${t.at}: kind "${t.kind}" must be giro or categoria`);
    if (t.label === '') problems.push(`${t.at}: label is blank`);
  }

  // --- families ------------------------------------------------------------
  const familyByCode = new Map(families.map((f) => [f.code, f]));
  const familyNames = new Map();
  for (const f of families) {
    if (f.name === '') problems.push(`${f.at}: name is blank`);
    const n = normalizeName(f.name);
    if (familyNames.has(n)) problems.push(`${f.at}: family "${f.name}" has the same name as ${familyNames.get(n)}`);
    else familyNames.set(n, f.at);
    if (f.default_lifespan_days !== '' && !/^[1-9]\d*$/.test(f.default_lifespan_days)) {
      problems.push(`${f.at}: default_lifespan_days "${f.default_lifespan_days}" must be blank or a whole number of days`);
    }
    if (!['', 'si', 'no'].includes(f.track_expiry)) {
      problems.push(`${f.at}: track_expiry "${f.track_expiry}" must be blank, si or no`);
    }
  }

  // --- products ------------------------------------------------------------
  const productNames = new Map();
  const familyDimension = new Map(); // family code → { dimension, at }
  for (const p of products) {
    if (p.name === '') problems.push(`${p.at}: name is blank`);
    const n = normalizeName(p.name);
    if (productNames.has(n)) problems.push(`${p.at}: product "${p.name}" has the same name as ${productNames.get(n)}`);
    else productNames.set(n, p.at);

    if (!familyByCode.has(p.family)) problems.push(`${p.at}: family "${p.family}" is not in families.csv`);

    const four = ['base', 'purchase', 'sell', 'price'];
    const unknown = four.filter((k) => !units.has(p[k]));
    if (unknown.length > 0) {
      problems.push(`${p.at}: unknown unit(s) ${unknown.map((k) => `${k}="${p[k]}"`).join(', ')} — known: ${[...units.keys()].join(' ')}`);
    } else {
      const dims = new Set(four.map((k) => units.get(p[k]).dimension));
      if (dims.size > 1) {
        problems.push(`${p.at}: units span ${[...dims].join(' and ')} — base, purchase, sell and price must share one dimension`);
      }
      const base = units.get(p.base);
      if (base.base !== p.base) {
        problems.push(`${p.at}: base "${p.base}" is not a base unit — use "${base.base}"`);
      }
      const prev = familyDimension.get(p.family);
      if (prev && prev.dimension !== base.dimension) {
        problems.push(`${p.at}: family "${p.family}" is ${prev.dimension} at ${prev.at}, and this product is ${base.dimension} — one family, one dimension (C8.5)`);
      } else if (!prev) familyDimension.set(p.family, { dimension: base.dimension, at: p.at });
    }

    if (p.pack_size !== '' && !(/^\d+(\.\d{1,3})?$/.test(p.pack_size) && Number(p.pack_size) > 0)) {
      problems.push(`${p.at}: pack_size "${p.pack_size}" must be blank (1) or a positive number with up to 3 decimals`);
    }
    if (!/^0(\.\d{1,4})?$/.test(p.tax_rate)) {
      problems.push(`${p.at}: tax_rate "${p.tax_rate}" must be a rate like 0 or 0.16 — not a percentage`);
    }

    p.tagList = p.tags.split(/\s+/).filter((t) => t !== '');
    const undeclared = p.tagList.filter((t) => !tagByCode.has(t));
    if (undeclared.length > 0) problems.push(`${p.at}: tag(s) ${undeclared.join(', ')} are not in tags.csv`);
    if (new Set(p.tagList).size !== p.tagList.length) problems.push(`${p.at}: a tag is listed twice`);
    if (!p.tagList.some((t) => tagByCode.get(t)?.kind === 'giro')) {
      problems.push(`${p.at}: no giro tag — a product no giro carries can never be imported at onboarding`);
    }
  }

  return { tags, families, products, problems };
}

// ---------------------------------------------------------------------------
// SQL
// ---------------------------------------------------------------------------

const lit = (s) => `'${s.replace(/'/g, "''")}'`;
const list = (codes) => codes.map(lit).join(', ');

function staleFamiliesAndTags(families, tags) {
  return [
    families.length
      ? `delete from catalogo.family where code not in (${list(families.map((f) => f.code))});`
      : 'delete from catalogo.family;',
    tags.length
      ? `delete from catalogo.tag where code not in (${list(tags.map((t) => t.code))});`
      : 'delete from catalogo.tag;',
    '',
  ];
}

/** The migration body. Deterministic: same CSVs, same bytes — which is what --check compares. */
export function renderSql({ tags, families, products }) {
  const out = [];
  out.push(
    '-- ============================================================================',
    '-- GENERATED by supabase/catalog/build.mjs from supabase/catalog/*.csv.',
    '-- ⚠️ DO NOT EDIT. Edit the CSVs and run `node supabase/catalog/build.mjs --write <label>`.',
    '-- ============================================================================',
    '-- A SNAPSHOT of the whole starter catalog (docs/PLAN.md Step 9, ADR-035 §2.9):',
    '-- after this file `catalogo` holds exactly these rows. Upserted on `code`; a row',
    '-- that left the CSVs leaves the template (shops keep their copies — nothing in',
    '-- `public` references `catalogo`). `image_path` is never written here.',
    `-- ${tags.length} tag(s), ${families.length} family(ies), ${products.length} product(s).`,
    '',
  );

  // ⚠️ THE ORDER IS LOAD-BEARING. Stale PRODUCTS go first, so a kept product may
  // take a name a removed one held; families and tags go LAST, after every kept
  // product has been upserted away from them, or the foreign key refuses.
  out.push('delete from catalogo.product_tag;');
  out.push(products.length
    ? `delete from catalogo.product where code not in (${list(products.map((p) => p.code))});`
    : 'delete from catalogo.product;');
  out.push('');

  if (tags.length) {
    out.push('insert into catalogo.tag (code, kind, label, display_order) values');
    out.push(tags.map((t, i) => `  (${lit(t.code)}, ${lit(t.kind)}, ${lit(t.label)}, ${i + 1})`).join(',\n'));
    out.push('on conflict (code) do update set kind = excluded.kind, label = excluded.label,');
    out.push('  display_order = excluded.display_order;', '');
  }

  if (families.length) {
    out.push('insert into catalogo.family (code, name, default_lifespan_days, track_expiry) values');
    out.push(families.map((f) => `  (${lit(f.code)}, ${lit(f.name)}, ${f.default_lifespan_days || 'null'}, ${f.track_expiry === 'si'})`).join(',\n'));
    out.push('on conflict (code) do update set name = excluded.name,');
    out.push('  default_lifespan_days = excluded.default_lifespan_days, track_expiry = excluded.track_expiry;', '');
  }

  if (products.length) {
    out.push('insert into catalogo.product (code, family_code, name, base_unit_code, purchase_unit_code,');
    out.push('       sell_unit_code, price_unit_code, pack_size, tax_rate, display_order) values');
    out.push(products.map((p, i) =>
      `  (${lit(p.code)}, ${lit(p.family)}, ${lit(p.name)}, ${lit(p.base)}, ${lit(p.purchase)}, ` +
      `${lit(p.sell)}, ${lit(p.price)}, ${p.pack_size || '1'}, ${p.tax_rate}, ${i + 1})`).join(',\n'));
    out.push('on conflict (code) do update set family_code = excluded.family_code, name = excluded.name,');
    out.push('  base_unit_code = excluded.base_unit_code, purchase_unit_code = excluded.purchase_unit_code,');
    out.push('  sell_unit_code = excluded.sell_unit_code, price_unit_code = excluded.price_unit_code,');
    out.push('  pack_size = excluded.pack_size, tax_rate = excluded.tax_rate, display_order = excluded.display_order;', '');

    out.push(...staleFamiliesAndTags(families, tags));
    const pairs = products.flatMap((p) => p.tagList.map((t) => `  (${lit(p.code)}, ${lit(t)})`));
    out.push('insert into catalogo.product_tag (product_code, tag_code) values');
    out.push(pairs.join(',\n') + ';', '');
  }

  if (!products.length) out.push(...staleFamiliesAndTags(families, tags));

  const pairCount = products.reduce((n, p) => n + p.tagList.length, 0);
  out.push(
    '-- The snapshot says how many rows it wrote; a partial apply is a failed one.',
    'do $$',
    'begin',
    `  if (select count(*) from catalogo.tag) <> ${tags.length}`,
    `     or (select count(*) from catalogo.family) <> ${families.length}`,
    `     or (select count(*) from catalogo.product) <> ${products.length}`,
    `     or (select count(*) from catalogo.product_tag) <> ${pairCount} then`,
    "    raise exception 'starter catalog snapshot did not land whole'",
    "      using errcode = 'check_violation';",
    '  end if;',
    'end;',
    '$$;',
    '',
  );
  return out.join('\n');
}

// ---------------------------------------------------------------------------
// The newest catalog migration, and the next free number
// ---------------------------------------------------------------------------

const CATALOG_MIGRATION_RX = /^(\d{4})_catalogo_[a-z0-9_]+\.sql$/;

export function newestCatalogMigration(migrationsDir) {
  const files = readdirSync(migrationsDir).filter((f) => CATALOG_MIGRATION_RX.test(f)).sort();
  return files.length ? files[files.length - 1] : null;
}

export function nextMigrationNumber(migrationsDir) {
  const nums = readdirSync(migrationsDir)
    .map((f) => /^(\d{4})_/.exec(f)?.[1])
    .filter(Boolean)
    .map(Number);
  return String(Math.max(0, ...nums) + 1).padStart(4, '0');
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function main(argv) {
  const catalogDir = HERE;
  const migrationsDir = join(HERE, '..', 'migrations');
  const [mode, label] = argv;

  const catalog = loadCatalog(catalogDir, migrationsDir);
  if (catalog.problems.length > 0) {
    console.error(`REFUSED — ${catalog.problems.length} problem(s), nothing written:`);
    for (const p of catalog.problems) console.error(`  ${p}`);
    return 1;
  }
  const sql = renderSql(catalog);
  const summary = `${catalog.tags.length} tags, ${catalog.families.length} families, ${catalog.products.length} products`;

  if (mode === '--write') {
    if (!label || !/^[a-z0-9_]+$/.test(label)) {
      console.error('usage: build.mjs --write <label>   (lower case, digits, underscores — e.g. polleria)');
      return 2;
    }
    const newest = newestCatalogMigration(migrationsDir);
    if (newest && readFileSync(join(migrationsDir, newest), 'utf8') === sql) {
      console.error(`nothing to write — ${newest} already holds exactly this snapshot (${summary})`);
      return 1;
    }
    const file = `${nextMigrationNumber(migrationsDir)}_catalogo_${label}.sql`;
    writeFileSync(join(migrationsDir, file), sql);
    console.log(`wrote supabase/migrations/${file} — ${summary}`);
    console.log('⚠️ add its row to supabase/README.md, then `supabase db reset` to apply it');
    return 0;
  }

  if (mode === '--check') {
    const newest = newestCatalogMigration(migrationsDir);
    if (!newest) {
      if (catalog.products.length === 0) {
        console.log(`ok — no catalog migration yet, and no products in the CSVs (${summary})`);
        return 0;
      }
      console.error(`FAIL: the CSVs hold ${catalog.products.length} product(s) and no catalog migration exists.`);
      console.error('      Run `node supabase/catalog/build.mjs --write <label>`.');
      return 1;
    }
    if (readFileSync(join(migrationsDir, newest), 'utf8') !== sql) {
      console.error(`FAIL: the CSVs changed since ${newest} was generated — the shop would never see the edit.`);
      console.error('      Run `node supabase/catalog/build.mjs --write <label>` for a new snapshot.');
      return 1;
    }
    console.log(`ok — ${newest} is exactly what the CSVs generate (${summary})`);
    return 0;
  }

  console.error('usage: build.mjs --write <label> | --check');
  return 2;
}

// ⚠️ REAL PATHS, BECAUSE A SYMLINK MADE THIS A SILENT NO-OP. On macOS `/var` is
// `/private/var`, so `import.meta.url` and `argv[1]` spelled one file two ways,
// `main` never ran, and the process exited 0 having checked nothing — the one
// result a `--check` must never produce. Measured by `build.test.mjs`'s CLI test.
const invoked = process.argv[1] && realpathSync(process.argv[1]);
if (invoked && realpathSync(fileURLToPath(import.meta.url)) === invoked) {
  process.exit(main(process.argv.slice(2)));
}
