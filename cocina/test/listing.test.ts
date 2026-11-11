import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  COUNT_MAX,
  DESCRIPTION_MAX,
  LINES_TABLE,
  LINE_ORDER,
  LISTING_COLUMNS,
  LISTING_LIMIT,
  LISTING_ORDER,
  LISTING_OWNER_COLUMN,
  LISTING_TABLE,
  MAX_LINES,
  NAME_MAX,
  PRICE_CEILING_CENTAVOS,
  PUBLISH_LISTING,
  TAGS,
  WITHDRAW_LISTING,
  CANTIDAD_MAXIMA,
  QUANTITY_CODES,
  SET_LISTING_QUANTITY,
  attemptFor,
  cantidadErrorMessage,
  cantidadFrom,
  cantidadPedida,
  comoSeComeDe,
  esApartado,
  countOf,
  eleccionRepetida,
  ofreceLasDos,
  setQuantityArgs,
  withCantidad,
  centavosOf,
  checkLine,
  checkLines,
  emptyLine,
  inOrder,
  issueSentence,
  lineBody,
  lineDetail,
  listingFrom,
  listingState,
  listingsFrom,
  listingsKey,
  orderTerm,
  parseCount,
  parsePesos,
  pesosText,
  publishArgs,
  publishBody,
  repeatDraft,
  toListing,
  withListing,
  withWithdrawn,
  fotosPorSubir,
  type LineDraft,
  type Listing,
  type ListingRow,
} from '@/api/listing';
import { NINGUNA, guardada } from '@/api/fotos';
import { AHEAD_MS, LONGEST_MS } from '@/lib/ventana';
import { ES } from '@/strings';

// ============================================================================
// WHAT A KITCHEN PUBLISHES. Plan task `10.4b-iv-a`.
//
// ⚠️ WHAT ONLY A REAL DATABASE CAN SAY — that the table, the columns, the embed,
// the filter, the order and the two functions are ones PostgREST answers, that a
// retry is one publication and a second kitchen's stay out — is
// `docs/checks/10.4b-iv-a-listing-contract.sh`, which reads them out of
// `src/api/listing.ts`. Here: the values, the rules the form checks before
// anything is sent — held to the migrations' TEXT, where the database's own rule
// is written, so the two cannot drift apart unseen — and the wiring. ⚠️ Since
// `0076` (plan `10.5-i-a`) `publish_listing` is re-created with its signature
// unchanged — a photo per line in `0076`, how each dish may be eaten and the
// desechable in `0079` (plan `10.5b-i`) — every limit `0072`'s character for
// character; the table's tag check and the two names stay `0072`'s. ⚠️ So its body
// is read out of the migration that defines it LAST, the one the database runs.
// ============================================================================

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SRC = join(ROOT, 'src');
const strip = (text: string) => text.replace(/^\s*\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
const code = (path: string) => strip(readFileSync(join(SRC, path), 'utf8'));
const MIGRATION = readFileSync(join(ROOT, '../supabase/migrations/0072_a_kitchen_publishes.sql'), 'utf8');
const LATEST = readFileSync(join(ROOT, '../supabase/migrations/0076_a_kitchens_own_page.sql'), 'utf8');
const MIGRATIONS = join(ROOT, '../supabase/migrations');
/** The text of the last migration that defines `publish_listing` — the body the database runs. */
const PUBLISHER = (() => {
  const files = readdirSync(MIGRATIONS).filter((f) => f.endsWith('.sql')).sort();
  const hits = files.filter((f) =>
    /create (or replace )?function public\.publish_listing\(/.test(readFileSync(join(MIGRATIONS, f), 'utf8')),
  );
  return readFileSync(join(MIGRATIONS, hits[hits.length - 1]), 'utf8');
})();
const PUBLISH_BODY = PUBLISHER.slice(
  PUBLISHER.search(/create (or replace )?function public\.publish_listing\(/),
  PUBLISHER.indexOf('comment on function public.publish_listing('),
);

const line = (patch: Partial<LineDraft> = {}): LineDraft => ({
  ...emptyLine('k1'),
  name: 'Comida corrida',
  price: '65',
  count: '4',
  usual: '120',
  ...patch,
});

describe('her list, as the app asks for it', () => {
  it('names the table, the columns with the lines’ embed, the filter, the order and the limit once', () => {
    expect(LISTING_TABLE).toBe('listing');
    expect(LINES_TABLE).toBe('listing_line');
    expect(LISTING_COLUMNS).toBe(
      'id,location_id,pickup_start,pickup_end,created_at,withdrawn_at,container_price,listing_line(line_no,name,description,tags,unit_price,quantity,surprise,usual_price,image_path,para_llevar,para_aqui)',
    );
    expect(LISTING_COLUMNS).not.toContain('*');
    expect(LISTING_COLUMNS).toContain(`${LINES_TABLE}(`);
    expect(LISTING_OWNER_COLUMN).toBe('workspace_id');
    expect(LISTING_ORDER).toBe('created_at.desc,id.desc');
    expect(LISTING_ORDER.split(',').map(orderTerm)).toEqual([
      { column: 'created_at', ascending: false },
      { column: 'id', ascending: false },
    ]);
    expect(orderTerm('line_no.asc')).toEqual({ column: 'line_no', ascending: true });
    expect(LINE_ORDER).toBe('line_no');
    expect(LISTING_LIMIT).toBe(60);
  });

  it('and the read sends exactly those: filtered on the kitchen, in that order, the lines in hers', () => {
    const calls = code('api/calls.ts');
    expect(calls).toMatch(/\.from\(LISTING_TABLE\)\.select\(LISTING_COLUMNS\)\.eq\(LISTING_OWNER_COLUMN, kitchenId\)/);
    expect(calls).toMatch(/LISTING_ORDER\.split\(','\)\.map\(orderTerm\)\) query = query\.order\(column, \{ ascending \}\)/);
    expect(calls).toMatch(/\.order\(LINE_ORDER, \{ referencedTable: LINES_TABLE \}\)\.limit\(LISTING_LIMIT\)/);
  });

  it('is cached under the login and the kitchen', () => {
    expect(listingsKey('u-1', 'k-1')).toEqual(['cocina', 'publicaciones', 'u-1', 'k-1']);
    expect(listingsKey('u-1', 'k-1')).not.toEqual(listingsKey('u-2', 'k-1'));
    expect(listingsKey('u-1', 'k-1')).not.toEqual(listingsKey('u-1', 'k-2'));
    expect(code('api/hooks.ts')).toMatch(/queryKey: listingsKey\(userId, kitchenId\)/);
  });
});

describe('the database’s rules, as `0072` and `0076` write them', () => {
  it('the six tags are the migration’s list, in its order', () => {
    const list = /v_known\s+constant text\[\] := array\[([^\]]+)\]/.exec(PUBLISH_BODY)?.[1] ?? '';
    expect(list.split(',').map((t) => t.trim().replace(/'/g, ''))).toEqual([...TAGS]);
    expect(MIGRATION).toContain(`tags <@ array[${TAGS.map((t) => `'${t}'`).join(', ')}]::text[]`);
  });

  it('every limit the form checks is the one the function refuses past', () => {
    expect(PUBLISH_BODY).toContain(`v_n < 1 or v_n > ${MAX_LINES}`);
    expect(PUBLISH_BODY).toContain(`char_length(v_name) > ${NAME_MAX}`);
    expect(PUBLISH_BODY).toContain(`, ''))) > ${DESCRIPTION_MAX}`);
    expect(PUBLISH_BODY).toContain(`v_qty < 1 or v_qty > ${COUNT_MAX}`);
    expect(PUBLISH_BODY).toContain(`v_price >= ${PRICE_CEILING_CENTAVOS / 100}`);
    expect(PUBLISH_BODY).toContain(`v_usual >= ${PRICE_CEILING_CENTAVOS / 100}`);
    expect(PUBLISH_BODY).toContain(`p_pickup_end - p_pickup_start > interval '${LONGEST_MS / 3_600_000} hours'`);
    expect(PUBLISH_BODY).toContain(`now() + interval '${AHEAD_MS / 3_600_000} hours'`);
  });

  it('every key a line is sent under is one the function reads — a misspelt key would be silently dropped', () => {
    const read = new Set([...PUBLISH_BODY.matchAll(/v_line (?:->>|->|\?) '([a-z_]+)'/g)].map((m) => m[1]));
    const sent = Object.keys(lineBody(line({ surprise: true, usual: '90', tags: ['pica'], description: 'x' })));
    // ⚠️ `10.5b-iv-c`: ten since `0079` — `para_llevar` and `para_aqui`.
    expect(sent.length).toBe(10);
    for (const key of sent) expect(read, key).toContain(key);
  });

  // ⚠️ `10.5-v-d`: the rule is the phone's. A build in the field publishes without a vale, and
  // must go on doing so (the field rule), so no migration may make the column required.
  it('`10.5-v-d`: the vale stays optional in the table — the phone requires it, the database never', () => {
    expect(MIGRATION).toMatch(/usual_price\s+numeric\(12,2\),/);
    for (const file of readdirSync(MIGRATIONS)) {
      const text = readFileSync(join(MIGRATIONS, file), 'utf8');
      expect(text, file).not.toMatch(/usual_price\s+numeric\(\d+,\s*\d+\)\s+not\s+null|alter\s+column\s+usual_price\s+set\s+not\s+null/i);
    }
  });

  it('`10.5-ii`: a dish’s photo is `0076`’s key, `image_path`, a picture in her own folder', () => {
    expect(PUBLISH_BODY).toContain(`v_line ? 'image_path'`);
    expect(PUBLISH_BODY).toContain('public.picture_in_folder(v_photo, v_loc.workspace_id)');
    expect(LATEST).toMatch(/alter table public\.listing_line add column image_path text;/);
  });

  it('the two functions are the migration’s, by name', () => {
    expect(PUBLISH_LISTING).toBe('publish_listing');
    expect(WITHDRAW_LISTING).toBe('withdraw_listing');
    expect(MIGRATION).toContain(`create function public.${PUBLISH_LISTING}(`);
    expect(MIGRATION).toContain(`create function public.${WITHDRAW_LISTING}(p_id uuid)`);
  });
});

describe('a price she types', () => {
  it('becomes integer centavos with Wera’s cleaning — the $, the spaces, the thousands commas', () => {
    expect(parsePesos('65')).toBe(6500);
    expect(parsePesos('65.5')).toBe(6550);
    expect(parsePesos(' $ 65.50 ')).toBe(6550);
    expect(parsePesos('$1,234.50')).toBe(123450);
    // ⚠️ C12.2: a comma is a thousands separator, as Wera reads it.
    expect(parsePesos('65,50')).toBe(655000);
  });

  it('or nothing, never a guess: three decimals, a sign, an exponent, a word, an empty box', () => {
    for (const typed of ['65.555', '-5', '1e3', 'sesenta', '', '  $  ']) expect(parsePesos(typed), typed).toBeNull();
  });

  it('is cleaned exactly as Wera cleans one', () => {
    const wera = readFileSync(join(ROOT, '../app/src/api/catalogWrite.ts'), 'utf8');
    expect(wera).toContain("return typed.replace(/[\\s,$]/g, '');");
    expect(code('api/listing.ts')).toContain("return typed.replace(/[\\s,$]/g, '');");
  });

  it('and a count is digits from 1 to 999', () => {
    expect(parseCount('4')).toBe(4);
    expect(parseCount(' 12 ')).toBe(12);
    expect(parseCount('999')).toBe(999);
    for (const typed of ['0', '1000', '4.5', '-1', 'cuatro', '']) expect(parseCount(typed), typed).toBeNull();
  });
});

describe('what is wrong with a line, in the order she fills it', () => {
  it('names the first thing', () => {
    expect(checkLine(line())).toBeNull();
    expect(checkLine(line({ name: '   ' }))).toBe('name');
    expect(checkLine(line({ name: 'x'.repeat(NAME_MAX + 1) }))).toBe('nameLong');
    expect(checkLine(line({ name: 'x'.repeat(NAME_MAX) }))).toBeNull();
    expect(checkLine(line({ description: 'x'.repeat(DESCRIPTION_MAX + 1) }))).toBe('descriptionLong');
    expect(checkLine(line({ price: '' }))).toBe('price');
    expect(checkLine(line({ price: '0' }))).toBe('priceShape');
    expect(checkLine(line({ price: '100000' }))).toBe('priceShape');
    expect(checkLine(line({ price: '99999.98', usual: '99999.99' }))).toBeNull();
    expect(checkLine(line({ count: '' }))).toBe('count');
    expect(checkLine(line({ count: '0' }))).toBe('countShape');
    expect(checkLine(line({ usual: '' }))).toBe('usual');
  });

  // ⚠️ `10.5-v-d`, the owner's ruling of 2026-11-06: *"Lo que vale normalmente must be filled in"* —
  // for a dish and a bag alike. Until then a bag's was optional and a dish's never read.
  it('the vale is required on every line, a dish’s and a bag’s alike, and above the price', () => {
    for (const surprise of [false, true]) {
      expect(checkLine(line({ surprise, price: '45', usual: '' }))).toBe('usual');
      expect(checkLine(line({ surprise, price: '45', usual: ' $ ' }))).toBe('usual');
      expect(checkLine(line({ surprise, price: '45', usual: '90' }))).toBeNull();
      expect(checkLine(line({ surprise, price: '45', usual: '45' }))).toBe('usualLow');
      expect(checkLine(line({ surprise, price: '45', usual: 'mucho' }))).toBe('usualShape');
      expect(checkLine(line({ surprise, price: '45', usual: '100000' }))).toBe('usualShape');
    }
    // Asked after how many there are — the order she fills the line in.
    expect(checkLine(line({ count: '', usual: '' }))).toBe('count');
    const lines = [line({ usual: '' })];
    expect(issueSentence(checkLines(lines)!, lines)).toBe('Platillo 1: escribe lo que vale normalmente, para que tus vecinos vean cuánto ahorran.');
  });

  it('the form: at least one line, at most ten, and a line’s problem names its line', () => {
    expect(checkLines([])).toEqual({ line: null, issue: 'noLines' });
    expect(checkLines(Array.from({ length: MAX_LINES + 1 }, () => line()))).toEqual({ line: null, issue: 'tooMany' });
    const lines = [line(), line({ key: 'k2', surprise: true, price: '' })];
    const issue = checkLines(lines);
    expect(issue).toEqual({ line: 2, issue: 'price' });
    expect(issueSentence(issue!, lines)).toBe('Bolsa sorpresa 2: escribe el precio.');
    expect(issueSentence({ line: null, issue: 'noLines' }, [])).toBe(ES.publicar.errores.noLines);
  });
});

describe('what the database is sent', () => {
  it('a line, trimmed, money as two-decimal text, tags in the fixed order whatever order she tapped', () => {
    expect(
      lineBody(line({ name: '  Comida corrida ', description: '  Sopa y guisado ', tags: ['gluten', 'pica'], price: '65', count: ' 4 ' })),
    ).toEqual({
      name: 'Comida corrida',
      description: 'Sopa y guisado',
      tags: ['pica', 'gluten'],
      unit_price: '65.00',
      quantity: 4,
      surprise: false,
      usual_price: '120.00',
      image_path: null,
      // `10.5b-iv-c`: her kitchen's ways unread — the kitchen's own.
      para_llevar: null,
      para_aqui: null,
    });
  });

  it('`10.5-ii`: a line sends its photo’s path — one saved, or one just taken — and none as null', () => {
    const path = '11111111-2222-4333-8444-555555555555/66666666-7777-4888-9999-aaaaaaaaaaaa';
    expect(lineBody(line({ foto: guardada(path) })).image_path).toBe(path);
    expect(lineBody(line({ foto: { kind: 'nueva', path, archivos: [] } })).image_path).toBe(path);
    expect(lineBody(line({ foto: NINGUNA })).image_path).toBeNull();
  });

  it('`10.5-ii`: the photos taken on the form go up once each; a saved one never goes up again', () => {
    const nueva = { kind: 'nueva', path: 'k/nueva', archivos: [] } as const;
    const lines = [line({ key: 'a', foto: nueva }), line({ key: 'b', foto: guardada('k/vieja') }), line({ key: 'c', foto: nueva }), line({ key: 'd' })];
    expect(fotosPorSubir(lines)).toEqual([nueva]);
  });

  it('`10.5-v-d`: every line sends its vale — a dish’s too, cleaned as a price is', () => {
    expect(lineBody(line({ surprise: true, price: '45', usual: '90' }))).toMatchObject({ surprise: true, unit_price: '45.00', usual_price: '90.00' });
    expect(lineBody(line({ surprise: false, price: '45', usual: '$1,200' }))).toMatchObject({ surprise: false, usual_price: '1200.00' });
    expect(lineBody(line({ description: '   ' })).description).toBeNull();
    // A line nobody checked is never sent without it.
    expect(() => lineBody(line({ usual: '' }))).toThrow(/a vale was not checked/);
  });

  it('the window as two instants, at her kitchen’s place', () => {
    const body = publishBody('place-1', [line()], {
      start: new Date('2026-10-31T23:00:00.000Z'),
      end: new Date('2026-11-01T00:00:00.000Z'),
    });
    expect(body).toEqual({
      p_location_id: 'place-1',
      p_pickup_start: '2026-10-31T23:00:00.000Z',
      p_pickup_end: '2026-11-01T00:00:00.000Z',
      p_lines: [lineBody(line())],
    });
    expect(publishArgs({ id: 'id-1', sent: '' }, body)).toEqual({ p_id: 'id-1', ...body });
  });
});

describe('a retry is the same publication; an edit is a new one', () => {
  it('keeps the id while the body is the same, and makes a new one when anything changed', () => {
    const ventana = { start: new Date('2026-10-31T23:00:00Z'), end: new Date('2026-11-01T00:00:00Z') };
    let n = 0;
    const mint = () => `id-${(n += 1)}`;
    const first = attemptFor(null, publishBody('p', [line()], ventana), mint);
    expect(first.id).toBe('id-1');
    expect(attemptFor(first, publishBody('p', [line()], ventana), mint)).toBe(first);
    const edited = attemptFor(first, publishBody('p', [line({ count: '3' })], ventana), mint);
    expect(edited.id).toBe('id-2');
    // `10.5-ii`: a photo taken is a change — its path is in the body — and the same photo again is not.
    const foto = guardada('k/foto');
    const withPhoto = attemptFor(edited, publishBody('p', [line({ count: '3', foto })], ventana), mint);
    expect(withPhoto.id).toBe('id-3');
    expect(attemptFor(withPhoto, publishBody('p', [line({ count: '3', foto })], ventana), mint)).toBe(withPhoto);
  });

  it('and the screen sends the attempt’s id, never a fresh one per press', () => {
    const screen = code('app/(cocina)/publicar.tsx');
    expect(screen).toMatch(/attempt\.current = attemptFor\(attempt\.current, body, newId\)/);
    expect(screen).toMatch(/publish\(publishArgs\(attempt\.current, body\), fotosPorSubir\(lines\)\)/);
    expect(screen).toMatch(/useRef<Attempt \| null>\(null\)/);
  });
});

describe('her list, read back', () => {
  const row = (patch: Partial<ListingRow> = {}): ListingRow => ({
    id: 'l-1',
    location_id: 'place-1',
    pickup_start: '2026-10-31T23:00:00+00:00',
    pickup_end: '2026-11-01T00:00:00+00:00',
    created_at: '2026-10-31T22:30:00+00:00',
    withdrawn_at: null,
    listing_line: [
      { line_no: 2, name: 'Bolsa de pan', description: '6 piezas', tags: [], unit_price: 45, quantity: 5, surprise: true, usual_price: 90 },
      { line_no: 1, name: 'Comida corrida', description: ' ', tags: ['pica', 'nuevo'], unit_price: '65.5', quantity: '4', surprise: false, usual_price: null },
    ],
    ...patch,
  });

  it('renames a row, money as centavos from a JSON number or its text, the lines in her order', () => {
    const l = toListing(row());
    expect(l.placeId).toBe('place-1');
    expect(l.start.toISOString()).toBe('2026-10-31T23:00:00.000Z');
    expect(l.lines.map((x) => x.name)).toEqual(['Comida corrida', 'Bolsa de pan']);
    expect(l.lines[0]).toEqual({ name: 'Comida corrida', description: null, tags: ['pica'], priceCentavos: 6550, count: 4, surprise: false, usualCentavos: null, imagePath: null, llevar: true, aqui: false });
    expect(l.desechableCentavos).toBeNull();
    expect(l.lines[1]).toMatchObject({ priceCentavos: 4500, count: 5, surprise: true, usualCentavos: 9000 });
    expect(centavosOf(65.1)).toBe(6510);
  });

  it('`10.5-ii`: reads a line’s photo, and a blank or absent one as none', () => {
    const lines = toListing(
      row({
        listing_line: [
          { line_no: 1, name: 'a', description: null, tags: [], unit_price: 1, quantity: 1, surprise: false, usual_price: null, image_path: 'k/p' },
          { line_no: 2, name: 'b', description: null, tags: [], unit_price: 1, quantity: 1, surprise: false, usual_price: null, image_path: ' ' },
          { line_no: 3, name: 'c', description: null, tags: [], unit_price: 1, quantity: 1, surprise: false, usual_price: null },
        ],
      }),
    ).lines;
    expect(lines.map((l) => l.imagePath)).toEqual(['k/p', null, null]);
  });

  it('drops a row it cannot read rather than drawing it wrong or blanking the list', () => {
    const bad = row({ id: 'l-2', listing_line: [{ line_no: 1, name: 'x', description: null, tags: [], unit_price: '65.555', quantity: 1, surprise: false, usual_price: null }] });
    expect(listingsFrom([row(), bad]).map((l) => l.id)).toEqual(['l-1']);
    expect(listingsFrom(null)).toEqual([]);
  });

  it('on offer until the window ends, unless withdrawn — and what is on offer is drawn first, the soonest first', () => {
    const now = new Date('2026-10-31T23:30:00Z');
    const offer = toListing(row());
    expect(listingState(offer, now)).toBe('oferta');
    expect(listingState(offer, new Date('2026-11-01T00:00:00Z'))).toBe('terminada');
    expect(listingState(toListing(row({ withdrawn_at: '2026-10-31T23:10:00Z' })), now)).toBe('retirada');
    const later = toListing(row({ id: 'l-later', pickup_start: '2026-11-01T01:00:00Z', pickup_end: '2026-11-01T02:00:00Z' }));
    const ended = toListing(row({ id: 'l-ended', pickup_start: '2026-10-31T20:00:00Z', pickup_end: '2026-10-31T21:00:00Z' }));
    expect(inOrder([ended, later, offer], now).map((l) => l.id)).toEqual(['l-1', 'l-later', 'l-ended']);
  });

  it('a made one goes in front at once, a retry adds nothing, and a withdrawal keeps its first moment', () => {
    const args = publishArgs({ id: 'new', sent: '' }, publishBody('place-1', [line()], { start: new Date('2026-10-31T23:00:00Z'), end: new Date('2026-11-01T00:00:00Z') }));
    const made = listingFrom(args);
    expect(made).toMatchObject({ id: 'new', placeId: 'place-1', withdrawnAt: null });
    expect(made.lines[0]).toMatchObject({ priceCentavos: 6500, count: 4 });
    const list = [toListing(row())];
    expect(withListing(list, made)?.map((l) => l.id)).toEqual(['new', 'l-1']);
    expect(withListing([made, ...list], made)?.map((l) => l.id)).toEqual(['new', 'l-1']);
    expect(withListing(undefined, made)).toBeUndefined();
    const first = new Date('2026-10-31T23:10:00Z');
    const once = withWithdrawn(list, 'l-1', first)!;
    expect(once[0].withdrawnAt).toEqual(first);
    expect(withWithdrawn(once, 'l-1', new Date('2026-10-31T23:20:00Z'))![0].withdrawnAt).toEqual(first);
  });

  it('one line’s figures, as the list shows them', () => {
    const [dish, bag] = toListing(row()).lines;
    expect(lineDetail(dish)).toBe('4 a $65.50 · Pica');
    expect(lineDetail(bag)).toBe('Bolsa sorpresa · 5 a $45 · vale $90');
  });
});

describe('Repetir', () => {
  let before: string | undefined;
  beforeAll(() => {
    before = process.env.TZ;
    process.env.TZ = 'America/Mexico_City';
  });
  afterAll(() => {
    if (before === undefined) delete process.env.TZ;
    else process.env.TZ = before;
  });

  it('opens her lines as she published them, each under a new handle, each with its vale', () => {
    expect(new Date(2026, 9, 31, 12).getTimezoneOffset()).toBe(360);
    const past: Listing = {
      id: 'l-1',
      placeId: 'place-1',
      start: new Date(2026, 9, 30, 19, 30),
      end: new Date(2026, 9, 30, 20),
      createdAt: new Date(2026, 9, 30, 19, 10),
      withdrawnAt: null,
      desechableCentavos: null,
      lines: [
        { name: 'Comida corrida', description: null, tags: ['pica'], priceCentavos: 6550, count: 4, surprise: false, usualCentavos: 9000, imagePath: 'k/comida', llevar: true, aqui: false },
        { name: 'Bolsa de pan', description: '6 piezas', tags: [], priceCentavos: 4500, count: 5, surprise: true, usualCentavos: 9000, imagePath: null, llevar: true, aqui: false },
      ],
    };
    let n = 0;
    const draft = repeatDraft(past, new Date(2026, 9, 31, 19), () => `key-${(n += 1)}`);
    expect(draft.lines).toEqual([
      { key: 'key-1', surprise: false, name: 'Comida corrida', description: '', tags: ['pica'], price: '65.50', count: '4', usual: '90', foto: { kind: 'guardada', path: 'k/comida' }, llevar: true, aqui: false },
      { key: 'key-2', surprise: true, name: 'Bolsa de pan', description: '6 piezas', tags: [], price: '45', count: '5', usual: '90', foto: { kind: 'ninguna' }, llevar: true, aqui: false },
    ]);
    // ⚠️ `10.5-ii`: yesterday's photo is sent again, as it was — never uploaded twice.
    expect(draft.lines.map((l) => lineBody(l).image_path)).toEqual(['k/comida', null]);
    expect(fotosPorSubir(draft.lines)).toEqual([]);
    expect(draft.ventana).toEqual({ start: new Date(2026, 9, 31, 19, 30), end: new Date(2026, 9, 31, 20) });
    expect(checkLines(draft.lines)).toBeNull();
  });

  it('writes centavos back as she would type them', () => {
    expect(pesosText(6500)).toBe('65');
    expect(pesosText(6550)).toBe('65.50');
    expect(pesosText(5)).toBe('0.05');
    expect(parsePesos(pesosText(123456))).toBe(123456);
  });
});

describe('the screens’ wiring, read as text', () => {
  it('the form checks the lines, then the window against the clock at the press, before anything is sent', () => {
    const screen = code('app/(cocina)/publicar.tsx');
    const lines = screen.indexOf('checkLines(lines, ajustes)');
    const window = screen.indexOf('checkVentana(ventana, new Date())');
    const sent = screen.indexOf('await publish(');
    expect(lines).toBeGreaterThan(-1);
    expect(window).toBeGreaterThan(lines);
    expect(sent).toBeGreaterThan(window);
  });

  it('publishes at her kitchen’s own place — the place read by the kitchen’s id', () => {
    const screen = code('app/(cocina)/publicar.tsx');
    expect(screen).toMatch(/usePlace\(kitchen\?\.id \?\? null\)/);
    expect(screen).toMatch(/<Form kitchen=\{kitchen\} place=\{place\.data\} /);
    expect(screen).toMatch(/const placeId = place\.id;/);
  });

  it('her list is read again after every press, landed or not', () => {
    const hooks = code('api/hooks.ts');
    const publish = hooks.slice(hooks.indexOf('export function usePublish'), hooks.indexOf('export function useWithdraw'));
    expect(publish).toMatch(/onSettled: \(\) => \{\s*void queries\.invalidateQueries\(\{ queryKey: LISTINGS_KEY \}\)/);
    expect(publish).toMatch(/withListing\(listings, listingFrom\(input\.args\)\)/);
  });

  it('`10.5-ii`: the photos go up before the call that names them, and the form hands them in', () => {
    const hooks = code('api/hooks.ts');
    const publish = hooks.slice(hooks.indexOf('export function usePublish'), hooks.indexOf('export function usePage'));
    const up = publish.indexOf('await uploadPictures(input.fotos)');
    expect(up).toBeGreaterThan(-1);
    expect(publish.indexOf('return publishListing(input.args)')).toBeGreaterThan(up);
    expect(code('app/(cocina)/publicar.tsx')).toMatch(/await publish\(publishArgs\(attempt\.current, body\), fotosPorSubir\(lines\)\)/);
  });

  // ⚠️ `10.5-v-c-i`: her list left her kitchen's screen for *Tus ofertas*, and *Repetir* publishes in one
  // tap when the form would have sent the same thing untouched — else it opens the form, as before.
  it('Hoy and Tus ofertas open publishing; Repetir opens the form with the publication when one tap cannot', () => {
    for (const screen of ['app/(cocina)/(tabs)/index.tsx', 'app/(cocina)/ofertas.tsx']) {
      expect(code(screen), screen).toMatch(/router\.push\('\/publicar'\)/);
    }
    const repetir = code('lib/useRepetir.ts');
    expect(repetir).toMatch(/if \(plan\.kind === 'formulario'\) \{\s*router\.push\(\{ pathname: '\/publicar', params: \{ repetir: listing\.id \} \}\);/);
    expect(code('app/(cocina)/publicar.tsx')).toMatch(/useLocalSearchParams<\{ repetir\?: string; primera\?: string \}>\(\)/);
  });

  it('a one-tap Repetir is the same publication on a retry, as the form’s is', () => {
    const repetir = code('lib/useRepetir.ts');
    expect(repetir).toMatch(/const attempt = attemptFor\(intentos\.current\.get\(listing\.id\) \?\? null, plan\.body, newId\);/);
    expect(repetir).toMatch(/await publish\(publishArgs\(attempt, plan\.body\)\)/);
    expect(repetir).toMatch(/if \(kitchen === null \|\| busyId !== null\) return;/);
  });

  it('published, she goes back with Publicaste … and Deshacer, which takes that publication down', () => {
    const screen = code('app/(cocina)/publicar.tsx');
    const sent = screen.indexOf('await publish(publishArgs(attempt.current, body)');
    const told = screen.indexOf('avisarPublicada(ES.nota.publicaste(nombreDe({ lines: body.p_lines })), kitchen.id, id)');
    expect(sent).toBeGreaterThan(-1);
    expect(told).toBeGreaterThan(sent);
    expect(screen.indexOf('salir();', told)).toBeGreaterThan(told);
    expect(screen).toMatch(/const id = attempt\.current\.id;/);
    expect(code('lib/NotaProvider.tsx')).toMatch(/avisarPublicada: \(texto, kitchenId, listingId\) => mostrar\(texto, \(\) => quitar\(kitchenId, listingId\)\)/);
    expect(code('api/hooks.ts')).toMatch(/mutationFn: \(input: \{ kitchenId: string; id: string \}\) => withdrawListing\(\{ p_id: input\.id \}\)/);
  });
});

// ============================================================================
// `10.5b-iv-c` — how each dish may be eaten, a count of zero, and − and +
// ============================================================================

/** The text of the last migration that defines a function — the body the database runs. */
function ultimaQueDefine(name: string): string {
  const files = readdirSync(MIGRATIONS).filter((f) => f.endsWith('.sql')).sort();
  const pattern = new RegExp(`create (or replace )?function public\\.${name}\\(`);
  const hits = files.filter((f) => pattern.test(readFileSync(join(MIGRATIONS, f), 'utf8')));
  const text = readFileSync(join(MIGRATIONS, hits[hits.length - 1]), 'utf8');
  return text.slice(text.search(pattern), text.indexOf(`comment on function public.${name}(`));
}

/** `her list, read back`'s row, at top level for the `10.5b-iv-c` blocks. */
const filaDe = (patch: Partial<ListingRow> = {}): ListingRow => ({
  id: 'l-1',
  location_id: 'place-1',
  pickup_start: '2026-10-31T23:00:00+00:00',
  pickup_end: '2026-11-01T00:00:00+00:00',
  created_at: '2026-10-31T22:30:00+00:00',
  withdrawn_at: null,
  listing_line: [
    { line_no: 2, name: 'Bolsa de pan', description: '6 piezas', tags: [], unit_price: 45, quantity: 5, surprise: true, usual_price: 90 },
    { line_no: 1, name: 'Comida corrida', description: ' ', tags: ['pica', 'nuevo'], unit_price: '65.5', quantity: '4', surprise: false, usual_price: null },
  ],
  ...patch,
});

const AMBAS = { llevar: true, aqui: true } as const;
const LLEVAR = { llevar: true, aqui: false } as const;
const AQUI = { llevar: false, aqui: true } as const;

describe('`10.5b-iv-c`: how each dish may be eaten — narrowed from her kitchen, never widened', () => {
  it('`publish_listing` reads the two keys, refuses a way the kitchen does not offer, and makes a bag to go', () => {
    expect(PUBLISH_BODY).toContain(`v_line ? 'para_llevar'`);
    expect(PUBLISH_BODY).toContain(`v_line ? 'para_aqui'`);
    expect(PUBLISH_BODY).toContain('if (v_llevar and not v_k_llevar) or (v_aqui and not v_k_aqui) then');
    expect(PUBLISH_BODY).toContain("v_llevar := coalesce((v_line ->> 'para_llevar')::boolean, v_k_llevar);");
    expect(PUBLISH_BODY).toMatch(/if v_surprise then\s+v_llevar := true;\s+v_aqui\s+:= false;/);
  });

  it('the form asks a dish only when her kitchen offers both ways, and starts with both on', () => {
    expect(ofreceLasDos(null)).toBe(false);
    expect(ofreceLasDos(LLEVAR)).toBe(false);
    expect(ofreceLasDos(AQUI)).toBe(false);
    expect(ofreceLasDos(AMBAS)).toBe(true);
    expect(emptyLine('k')).toMatchObject({ llevar: true, aqui: true });
  });

  it('sends her choice with both ways, the kitchen’s own otherwise — never a way the kitchen lacks', () => {
    expect(comoSeComeDe(line({ llevar: false, aqui: true }), AMBAS)).toEqual({ para_llevar: false, para_aqui: true });
    expect(comoSeComeDe(line({ llevar: true, aqui: true }), AMBAS)).toEqual({ para_llevar: true, para_aqui: true });
    // One way: whatever the line holds, nothing is sent — `publish_listing`'s coalesce is the kitchen's.
    expect(comoSeComeDe(line({ llevar: true, aqui: true }), AQUI)).toEqual({ para_llevar: null, para_aqui: null });
    expect(comoSeComeDe(line({ llevar: false, aqui: true }), LLEVAR)).toEqual({ para_llevar: null, para_aqui: null });
    // Unread, and a bag: the kitchen's own, and to go.
    expect(comoSeComeDe(line({ aqui: true }), null)).toEqual({ para_llevar: null, para_aqui: null });
    expect(comoSeComeDe(line({ surprise: true, usual: '90', llevar: false, aqui: true }), AMBAS)).toEqual({ para_llevar: null, para_aqui: null });
    expect(publishBody('p', [line({ llevar: false })], { start: new Date(0), end: new Date(1) }, AMBAS).p_lines[0]).toMatchObject({ para_llevar: false, para_aqui: true });
  });

  it('a dish with neither, when both are offered, is said before anything is sent', () => {
    expect(checkLine(line({ llevar: false, aqui: false }), AMBAS)).toBe('comer');
    expect(checkLine(line({ llevar: false, aqui: false }), LLEVAR)).toBeNull();
    expect(checkLine(line({ llevar: false, aqui: false }), null)).toBeNull();
    expect(checkLine(line({ surprise: true, usual: '90', llevar: false, aqui: false }), AMBAS)).toBeNull();
    const lines = [line({ llevar: false, aqui: false })];
    expect(issueSentence(checkLines(lines, AMBAS)!, lines)).toBe('Platillo 1: elige para llevar, para comer aquí o las dos.');
  });

  it('*Repetir* keeps each dish’s ways, narrowed to what her kitchen offers now — all of them when none is left', () => {
    const dish = (llevar: boolean, aqui: boolean) => ({ ...toListing(filaDe()).lines[0], llevar, aqui });
    expect(eleccionRepetida(dish(true, false), AMBAS)).toEqual(LLEVAR);
    expect(eleccionRepetida(dish(false, true), AMBAS)).toEqual(AQUI);
    expect(eleccionRepetida(dish(true, true), LLEVAR)).toEqual(LLEVAR);
    expect(eleccionRepetida(dish(false, true), LLEVAR)).toEqual(LLEVAR);
    expect(eleccionRepetida(dish(false, true), null)).toEqual(AQUI);
  });

  it('reads each line’s ways and the offer’s desechable — the columns’ defaults when a row has none', () => {
    const l = toListing(
      filaDe({
        container_price: '5.00',
        listing_line: [
          { line_no: 1, name: 'a', description: null, tags: [], unit_price: 1, quantity: 1, surprise: false, usual_price: null, para_llevar: false, para_aqui: true },
          { line_no: 2, name: 'b', description: null, tags: [], unit_price: 1, quantity: 1, surprise: false, usual_price: null },
        ],
      }),
    );
    expect(l.desechableCentavos).toBe(500);
    expect(l.lines.map((x) => [x.llevar, x.aqui])).toEqual([
      [false, true],
      [true, false],
    ]);
    // What was sent is drawn until the re-read: a bag to go, `null` the kitchen's own (to go until read).
    const made = listingFrom(publishArgs({ id: 'n', sent: '' }, publishBody('p', [line({ llevar: false })], { start: new Date(0), end: new Date(1) }, AMBAS)));
    expect(made.lines[0]).toMatchObject({ llevar: false, aqui: true });
    expect(made.desechableCentavos).toBeNull();
  });
});

describe('`10.5b-iv-c`: a count of zero, and − and +', () => {
  const SET = ultimaQueDefine('set_listing_quantity');

  it('the table takes 0 since `0079`, and the read reads it — the whole offer is no longer dropped', () => {
    const tabla = readFileSync(join(MIGRATIONS, '0079_reserving_and_collecting.sql'), 'utf8');
    expect(tabla).toContain('add constraint listing_line_quantity_not_negative check (quantity >= 0)');
    expect(countOf(0)).toBe(0);
    expect(countOf('0.000')).toBe(0);
    expect(() => countOf(-1)).toThrow();
    expect(() => countOf('1.5')).toThrow();
    const zero = filaDe({ listing_line: [{ line_no: 1, name: 'a', description: null, tags: [], unit_price: 1, quantity: '0', surprise: false, usual_price: null }] });
    expect(listingsFrom([zero]).map((l) => l.lines[0].count)).toEqual([0]);
  });

  it('names the function and its arguments as `0079` writes them; the answer’s two keys', () => {
    expect(SET_LISTING_QUANTITY).toBe('set_listing_quantity');
    expect(SET).toMatch(/create function public\.set_listing_quantity\(\s*p_listing_id uuid,\s*p_line_no\s+integer,\s*p_quantity\s+numeric\s*\)/);
    expect(Object.keys(setQuantityArgs('l', 2, 3))).toEqual(['p_listing_id', 'p_line_no', 'p_quantity']);
    expect(SET).toContain("return jsonb_build_object('quantity', p_quantity::numeric(12,3)::text,");
    expect(SET).toContain("'taken', v_taken::numeric(12,3)::text);");
    expect(cantidadFrom({ quantity: '3.000', taken: '1.000' })).toEqual({ count: 3, taken: 1 });
    expect(() => cantidadFrom({ quantity: '3.000' })).toThrow();
  });

  it('never below what is taken, never below 0 or above 999 — the function’s own limits', () => {
    expect(SET).toContain('p_quantity < 0 or p_quantity > 999');
    expect(SET).toContain("if p_quantity < v_taken then");
    expect(CANTIDAD_MAXIMA).toBe(999);
    expect(cantidadPedida(5, 2, -1)).toBe(4);
    expect(cantidadPedida(2, 2, -1)).toBeNull();
    expect(cantidadPedida(1, 0, -1)).toBe(0);
    expect(cantidadPedida(0, 0, -1)).toBeNull();
    expect(cantidadPedida(5, 2, 1)).toBe(6);
    expect(cantidadPedida(999, 0, 1)).toBeNull();
  });

  it('its refusals are hers to read: TD019 someone reserved meanwhile, TD015 the offer is over', () => {
    expect(SET).toContain("using errcode = 'TD019'");
    expect(SET).toContain("using errcode = 'TD015'");
    expect(Object.keys(QUANTITY_CODES).sort()).toEqual(['TD015', 'TD019']);
    expect(cantidadErrorMessage({ code: 'TD019' })).toBe(ES.ofertas.apartados);
    expect(cantidadErrorMessage({ code: 'TD015' })).toBe(ES.ofertas.terminada);
    expect(cantidadErrorMessage(new TypeError('Network request failed'))).toBe(ES.api.errors.offline);
  });

  it('a TD019 refusal reads today’s orders again — what is taken moved, and the phone’s copy is up to a minute old (seen on the emulator)', () => {
    expect(esApartado({ code: 'TD019' })).toBe(true);
    expect(esApartado({ code: 'TD015' })).toBe(false);
    expect(esApartado(new TypeError('Network request failed'))).toBe(false);
    const hooks = code('api/hooks.ts');
    const hook = hooks.slice(hooks.indexOf('export function useCantidades'));
    expect(hook).toMatch(/if \(esApartado\(thrown\)\) void queries\.invalidateQueries\(\{ queryKey: apartadosKey\(userId, kitchenId, 'hoy'\) \}\);/);
  });

  it('draws the new count on that line alone', () => {
    const list = [toListing(filaDe())];
    const moved = withCantidad(list, 'l-1', 2, 7)!;
    expect(moved[0].lines.map((l) => l.count)).toEqual([4, 7]);
    expect(withCantidad(list, 'otra', 1, 9)![0].lines.map((l) => l.count)).toEqual([4, 5]);
    expect(withCantidad(undefined, 'l-1', 1, 1)).toBeUndefined();
  });

  it('the hook sends one at a time per dish and the last tap wins; the read is cancelled before the drawing', () => {
    const hooks = code('api/hooks.ts');
    const hook = hooks.slice(hooks.indexOf('export function useCantidades'));
    expect(hook).toMatch(/cantidadPedida\(deseados\.current\.get\(clave\) \?\? count, taken, paso\)/);
    const cancel = hook.indexOf('await queries.cancelQueries({ queryKey: key });');
    const draw = hook.indexOf('queries.setQueryData<Listing[]>(key, (listings) => withCantidad(');
    expect(cancel).toBeGreaterThan(-1);
    expect(draw).toBeGreaterThan(cancel);
    expect(hook).toMatch(/while \(deseados\.current\.get\(clave\) !== enviado\)/);
    expect(hook).toMatch(/if \(enviando\.current\.has\(clave\)\) return;/);
  });
});

describe('`10.5b-iv-c`: the form starts with her last choice (call 26) — kept on her phone only when the form asked', () => {
  const memoria = () => {
    const datos = new Map<string, string>();
    return {
      getItem: (k: string) => datos.get(k) ?? null,
      setItem: (k: string, v: string) => void datos.set(k, v),
      removeItem: (k: string) => void datos.delete(k),
    };
  };

  it('nothing chosen yet: both on; then what she chose, per kitchen', async () => {
    const { eleccionGuardada, guardarEleccion, TODAS } = await import('@/lib/eleccion');
    const store = memoria();
    expect(eleccionGuardada(store, 'k1')).toEqual(TODAS);
    guardarEleccion(store, 'k1', { llevar: false, aqui: true });
    expect(eleccionGuardada(store, 'k1')).toEqual({ llevar: false, aqui: true });
    expect(eleccionGuardada(store, 'k2')).toEqual(TODAS);
    guardarEleccion(store, 'k1', { llevar: true, aqui: true });
    expect(eleccionGuardada(store, 'k1')).toEqual(TODAS);
    // A form that did not ask — one way — keeps nothing; neither is no choice.
    guardarEleccion(store, 'k1', { llevar: true, aqui: false });
    guardarEleccion(store, 'k1', null);
    guardarEleccion(store, 'k1', { llevar: false, aqui: false });
    expect(eleccionGuardada(store, 'k1')).toEqual({ llevar: true, aqui: false });
    expect(emptyLine('x', { llevar: false, aqui: true })).toMatchObject({ llevar: false, aqui: true });
  });

  it('the form reads it for every new dish and keeps it after publishing, only when it asked', () => {
    const screen = code('app/(cocina)/publicar.tsx');
    expect(screen).toMatch(/const \[eleccion\] = useState\(\(\) => eleccionDe\(kitchen\.id\)\);/);
    expect(screen).toMatch(/\[emptyLine\(newId\(\), eleccion\)\]/);
    expect(screen).toMatch(/\[\.\.\.now, emptyLine\(newId\(\), eleccion\)\]/);
    expect(screen).toMatch(/recordarEleccion\(kitchen\.id, ofreceLasDos\(ajustes\) && elegida !== undefined \? \{ llevar: elegida\.llevar, aqui: elegida\.aqui \} : null\);/);
  });
});
