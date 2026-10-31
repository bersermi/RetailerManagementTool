import { readFileSync } from 'node:fs';
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
  attemptFor,
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
  type LineDraft,
  type Listing,
  type ListingRow,
} from '@/api/listing';
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
// anything is sent — held to `0072`'s TEXT, where the database's own rule is
// written, so the two cannot drift apart unseen — and the wiring.
// ============================================================================

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SRC = join(ROOT, 'src');
const strip = (text: string) => text.replace(/^\s*\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
const code = (path: string) => strip(readFileSync(join(SRC, path), 'utf8'));
const MIGRATION = readFileSync(join(ROOT, '../supabase/migrations/0072_a_kitchen_publishes.sql'), 'utf8');
const PUBLISH_BODY = MIGRATION.slice(MIGRATION.indexOf('create function public.publish_listing('), MIGRATION.indexOf('create function public.withdraw_listing('));

const line = (patch: Partial<LineDraft> = {}): LineDraft => ({
  ...emptyLine('k1'),
  name: 'Comida corrida',
  price: '65',
  count: '4',
  ...patch,
});

describe('her list, as the app asks for it', () => {
  it('names the table, the columns with the lines’ embed, the filter, the order and the limit once', () => {
    expect(LISTING_TABLE).toBe('listing');
    expect(LINES_TABLE).toBe('listing_line');
    expect(LISTING_COLUMNS).toBe(
      'id,location_id,pickup_start,pickup_end,created_at,withdrawn_at,listing_line(line_no,name,description,tags,unit_price,quantity,surprise,usual_price)',
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
    expect(LISTING_LIMIT).toBe(10);
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

describe('the database’s rules, as `0072` writes them', () => {
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
    expect(sent.length).toBe(7);
    for (const key of sent) expect(read, key).toContain(key);
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
    expect(checkLine(line({ price: '99999.99' }))).toBeNull();
    expect(checkLine(line({ count: '' }))).toBe('count');
    expect(checkLine(line({ count: '0' }))).toBe('countShape');
  });

  it('a bag’s vale is optional, and above the price when given; a dish’s is never read', () => {
    expect(checkLine(line({ surprise: true, price: '45', usual: '' }))).toBeNull();
    expect(checkLine(line({ surprise: true, price: '45', usual: '90' }))).toBeNull();
    expect(checkLine(line({ surprise: true, price: '45', usual: '45' }))).toBe('usualLow');
    expect(checkLine(line({ surprise: true, price: '45', usual: 'mucho' }))).toBe('usualShape');
    expect(checkLine(line({ surprise: false, price: '45', usual: 'mucho' }))).toBeNull();
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
      usual_price: null,
    });
  });

  it('a bag with its vale; a dish never sends one, even with one typed before the switch', () => {
    expect(lineBody(line({ surprise: true, price: '45', usual: '90' }))).toMatchObject({ surprise: true, unit_price: '45.00', usual_price: '90.00' });
    expect(lineBody(line({ surprise: true, price: '45', usual: '' })).usual_price).toBeNull();
    expect(lineBody(line({ surprise: false, price: '45', usual: '90' })).usual_price).toBeNull();
    expect(lineBody(line({ description: '   ' })).description).toBeNull();
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
  });

  it('and the screen sends the attempt’s id, never a fresh one per press', () => {
    const screen = code('app/(cocina)/publicar.tsx');
    expect(screen).toMatch(/attempt\.current = attemptFor\(attempt\.current, body, newId\)/);
    expect(screen).toMatch(/publish\(publishArgs\(attempt\.current, body\)\)/);
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
    expect(l.lines[0]).toEqual({ name: 'Comida corrida', description: null, tags: ['pica'], priceCentavos: 6550, count: 4, surprise: false, usualCentavos: null });
    expect(l.lines[1]).toMatchObject({ priceCentavos: 4500, count: 5, surprise: true, usualCentavos: 9000 });
    expect(centavosOf(65.1)).toBe(6510);
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

  it('opens her lines as she published them, each under a new handle, the vale only on a bag', () => {
    expect(new Date(2026, 9, 31, 12).getTimezoneOffset()).toBe(360);
    const past: Listing = {
      id: 'l-1',
      placeId: 'place-1',
      start: new Date(2026, 9, 30, 19, 30),
      end: new Date(2026, 9, 30, 20),
      withdrawnAt: null,
      lines: [
        { name: 'Comida corrida', description: null, tags: ['pica'], priceCentavos: 6550, count: 4, surprise: false, usualCentavos: 9000 },
        { name: 'Bolsa de pan', description: '6 piezas', tags: [], priceCentavos: 4500, count: 5, surprise: true, usualCentavos: 9000 },
      ],
    };
    let n = 0;
    const draft = repeatDraft(past, new Date(2026, 9, 31, 19), () => `key-${(n += 1)}`);
    expect(draft.lines).toEqual([
      { key: 'key-1', surprise: false, name: 'Comida corrida', description: '', tags: ['pica'], price: '65.50', count: '4', usual: '' },
      { key: 'key-2', surprise: true, name: 'Bolsa de pan', description: '6 piezas', tags: [], price: '45', count: '5', usual: '90' },
    ]);
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
    const lines = screen.indexOf('checkLines(lines)');
    const window = screen.indexOf('checkVentana(ventana, new Date())');
    const sent = screen.indexOf('await publish(');
    expect(lines).toBeGreaterThan(-1);
    expect(window).toBeGreaterThan(lines);
    expect(sent).toBeGreaterThan(window);
  });

  it('publishes at her kitchen’s own place — the place read by the kitchen’s id', () => {
    const screen = code('app/(cocina)/publicar.tsx');
    expect(screen).toMatch(/usePlace\(kitchen\?\.id \?\? null\)/);
    expect(screen).toMatch(/placeId=\{place\.data\.id\}/);
  });

  it('her list is read again after every press, landed or not', () => {
    const hooks = code('api/hooks.ts');
    const publish = hooks.slice(hooks.indexOf('export function usePublish'), hooks.indexOf('export function useWithdraw'));
    expect(publish).toMatch(/onSettled: \(\) => \{\s*void queries\.invalidateQueries\(\{ queryKey: LISTINGS_KEY \}\)/);
    expect(publish).toMatch(/withListing\(listings, listingFrom\(args\)\)/);
  });

  it('her kitchen draws publishing first and her list; the list’s Repetir opens the form with the publication', () => {
    const kitchen = code('app/(cocina)/index.tsx');
    expect(kitchen).toMatch(/router\.push\('\/publicar'\)/);
    expect(kitchen).toMatch(/<Publicaciones kitchenId=\{kitchen\.id\} \/>/);
    expect(kitchen.indexOf('<Publicaciones')).toBeLessThan(kitchen.indexOf('ES.cocina.donde'));
    expect(code('ui/Publicaciones.tsx')).toMatch(/router\.push\(\{ pathname: '\/publicar', params: \{ repetir: listing\.id \} \}\)/);
    expect(code('app/(cocina)/publicar.tsx')).toMatch(/useLocalSearchParams<\{ repetir\?: string \}>\(\)/);
  });
});
