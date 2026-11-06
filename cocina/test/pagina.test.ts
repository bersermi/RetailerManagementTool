import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { NINGUNA, guardada } from '@/api/fotos';
import {
  COLORS,
  DIBUJOS,
  EMPTY_PAGE,
  LINK_MAX,
  PAGE_COLUMNS,
  PAGE_OWNER_COLUMN,
  PAGE_TABLE,
  POR_GIRO,
  SENTENCE_MAX,
  SET_KITCHEN_PAGE,
  SIN_GIRO,
  checkPage,
  cleanSentence,
  colorOf,
  defaultsFor,
  draftOf,
  kitchenInitials,
  linkFrom,
  mapsLinkOk,
  pageKey,
  pagePatch,
  pageWith,
  setPageArgs,
  toPage,
  type Page,
} from '@/api/pagina';
import { ES } from '@/strings';
import { HUES } from '@/theme/colores';

// ============================================================================
// HER PAGE IN ITACATE (`@/api/pagina`). Plan task `10.5-ii`, on `0076`.
//
// ⚠️ WHAT ONLY A REAL DATABASE CAN SAY — that `kitchen_page` answers these
// columns to her kitchen's people and `set_kitchen_page` keeps what it is not
// sent — is `docs/checks/10.5-i-a-kitchen-photos-contract.sh`, which reads the
// names out of `src/api/pagina.ts`. Here: every rule the form checks, held to
// `0076`'s TEXT — the six codes, the sentence's limit, the link's rule run on the
// same links — what a save sends, the defaults, and the drawings' files.
// ============================================================================

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SRC = join(ROOT, 'src');
const strip = (text: string) => text.replace(/^\s*\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
const code = (path: string) => strip(readFileSync(join(SRC, path), 'utf8'));
const MIGRATION = readFileSync(join(ROOT, '../supabase/migrations/0076_a_kitchens_own_page.sql'), 'utf8');
const KITCHENS = readFileSync(join(ROOT, '../supabase/migrations/0072_a_kitchen_publishes.sql'), 'utf8');
const TABLE = MIGRATION.slice(MIGRATION.indexOf('create table public.kitchen_page ('), MIGRATION.indexOf('comment on table public.kitchen_page'));
const DOOR = MIGRATION.slice(
  MIGRATION.indexOf('create function public.set_kitchen_page('),
  MIGRATION.indexOf('comment on function public.set_kitchen_page('),
);

/** `google_maps_link_ok`, run as Postgres would: its pattern rebuilt from the migration's string pieces. */
function databaseLinkOk(link: string): boolean {
  const body = MIGRATION.slice(MIGRATION.indexOf('create function public.google_maps_link_ok('), MIGRATION.indexOf('comment on function public.google_maps_link_ok('));
  const shape = body.slice(body.indexOf('p_link ~ ('), body.indexOf('and position('));
  const posix = [...shape.matchAll(/'((?:[^']|'')*)'/g)].map((m) => m[1].replace(/''/g, "'")).join('');
  const pattern = new RegExp(posix.replace('[]', '[\\]'));
  const ceiling = Number(/char_length\(p_link\) <= (\d+)/.exec(body)?.[1]);
  expect(body).toContain("position('..' in p_link) = 0");
  expect(body).toContain("p_link !~* '%2e'");
  return link.length <= ceiling && pattern.test(link) && !link.includes('..') && !/%2e/i.test(link);
}

const SAVED: Page = { sentence: 'Comida casera', color: 'chile', cover: 'k/portada', logo: null, mapsLink: null };

describe('her page, as the app asks for it', () => {
  it('names the table, the columns and the filter once — every column `0076`’s', () => {
    expect(PAGE_TABLE).toBe('kitchen_page');
    expect(MIGRATION).toContain(`create table public.${PAGE_TABLE} (`);
    expect(PAGE_OWNER_COLUMN).toBe('workspace_id');
    expect(PAGE_COLUMNS).toBe('sentence,color,cover_path,logo_path,maps_link');
    for (const column of [PAGE_OWNER_COLUMN, ...PAGE_COLUMNS.split(',')]) expect(TABLE, column).toMatch(new RegExp(`\\n  ${column}\\s+(uuid|text)`));
    expect(code('api/calls.ts')).toMatch(/\.from\(PAGE_TABLE\)\.select\(PAGE_COLUMNS\)\.eq\(PAGE_OWNER_COLUMN, kitchenId\)\.maybeSingle\(\)/);
  });

  it('the fields it sends are the ones the door reads, by name', () => {
    const fields = /export interface PageFields \{([\s\S]*?)\n\}/.exec(code('api/pagina.ts'))?.[1] ?? '';
    const keys = [...fields.matchAll(/readonly ([a-z_]+):/g)].map((m) => m[1]);
    expect(keys).toEqual(PAGE_COLUMNS.split(','));
    const read = /foreach v_key in array array\[([^\]]+)\]/.exec(DOOR)?.[1] ?? '';
    expect(read.split(',').map((k) => k.trim().replace(/'/g, ''))).toEqual(keys);
    expect(SET_KITCHEN_PAGE).toBe('set_kitchen_page');
    expect(MIGRATION).toContain(`create function public.${SET_KITCHEN_PAGE}(p_workspace_id uuid, p_page jsonb)`);
    expect(Object.keys(setPageArgs('k', {}))).toEqual(['p_workspace_id', 'p_page']);
  });

  it('caches under the login and the kitchen', () => {
    expect(pageKey('u-1', 'k-1')).toEqual(['cocina', 'pagina', 'u-1', 'k-1']);
    expect(pageKey('u-1', 'k-1')).not.toEqual(pageKey('u-2', 'k-1'));
    expect(code('api/hooks.ts')).toMatch(/queryKey: pageKey\(userId, kitchenId\)/);
  });

  it('reads no row as every default, and a colour it does not know as hers to default', () => {
    expect(toPage(null)).toEqual(EMPTY_PAGE);
    expect(toPage({ sentence: ' ', color: 'azul', cover_path: null, logo_path: '', maps_link: null })).toEqual(EMPTY_PAGE);
    expect(toPage({ sentence: 'Hola', color: 'mole', cover_path: 'k/c', logo_path: 'k/l', maps_link: 'https://g.page/x' })).toEqual({
      sentence: 'Hola',
      color: 'mole',
      cover: 'k/c',
      logo: 'k/l',
      mapsLink: 'https://g.page/x',
    });
  });
});

describe('the database’s rules, as `0076` writes them', () => {
  it('the six colours are the migration’s codes, in its order, each with a name', () => {
    const list = /color in \(([^)]+)\)/.exec(TABLE)?.[1] ?? '';
    expect(list.split(',').map((c) => c.trim().replace(/'/g, ''))).toEqual([...COLORS]);
    expect(DOOR).toContain(`v_color not in (${COLORS.map((c) => `'${c}'`).join(', ')})`);
    for (const color of COLORS) expect(ES.pagina.colores[color].length, color).toBeGreaterThan(0);
    expect(ES.pagina.colores.cempasuchil).toBe('Cempasúchil');
  });

  it('the sentence is one line of at most 100 characters, as the table and the door refuse past', () => {
    expect(SENTENCE_MAX).toBe(100);
    expect(TABLE).toContain(`char_length(sentence) <= ${SENTENCE_MAX}`);
    expect(DOOR).toContain(`char_length(v_sentence) > ${SENTENCE_MAX}`);
    expect(cleanSentence('  Comida casera\ndesde 1998 ')).toBe('Comida casera desde 1998');
    expect(cleanSentence('a\r\n\r\nb')).toBe('a b');
    expect(cleanSentence('   ')).toBeNull();
  });

  it('a link is one that opens Google Maps — the app and the database agree on every link', () => {
    expect(LINK_MAX).toBe(1000);
    const links = [
      'https://maps.app.goo.gl/AbCd123xyz',
      'https://goo.gl/maps/xyz123',
      'https://g.page/fonda-dona-mari',
      'https://www.google.com/maps/place/Fonda/@19.4,-99.1,17z/data=!3m1!4b1',
      'https://google.com.mx/maps?q=fonda',
      'https://www.google.com.mx/maps',
      'https://maps.google.com/?cid=1234567890',
      'https://maps.google.com.mx',
      'http://maps.app.goo.gl/AbCd',
      'https://maps.app.goo.gl',
      'https://google.com@evil.example/maps',
      'https://maps.google.com.evil.example/',
      'https://www.google.com/mapsx',
      'https://maps.app.goo.gl/a b',
      'https://maps.app.goo.gl/../x',
      'https://maps.app.goo.gl/%2E%2E/x',
      'https://maps.app.goo.gl/%2e',
      'https://evil.example/?https://maps.app.goo.gl/x',
      'HTTPS://MAPS.APP.GOO.GL/X',
      'https://maps.app.goo.gl/x\n',
      'https://maps.app.goo.gl/x"onload=',
      `https://maps.app.goo.gl/${'a'.repeat(1000)}`,
      `https://maps.app.goo.gl/${'a'.repeat(1000 - 'https://maps.app.goo.gl/'.length)}`,
      '',
    ];
    for (const link of links) expect(mapsLinkOk(link), JSON.stringify(link)).toBe(databaseLinkOk(link));
    expect(links.filter(mapsLinkOk).length).toBe(9);
  });

  it('takes the link out of what the share button copied, and refuses a box with no link in it', () => {
    expect(linkFrom('')).toBeNull();
    expect(linkFrom('   ')).toBeNull();
    expect(linkFrom(' https://maps.app.goo.gl/AbC ')).toBe('https://maps.app.goo.gl/AbC');
    expect(linkFrom('Fonda Doña Mari\nCalle Sabino 12\nhttps://maps.app.goo.gl/AbC')).toBe('https://maps.app.goo.gl/AbC');
    expect(linkFrom('Mira: <https://maps.app.goo.gl/AbC>')).toBe('https://maps.app.goo.gl/AbC');
    expect(linkFrom('Fonda Doña Mari')).toBeUndefined();
    expect(linkFrom('https://www.facebook.com/fonda')).toBeUndefined();
  });
});

describe('what a save sends — only what she changed', () => {
  it('nothing, when she changed nothing', () => {
    expect(pagePatch(SAVED, draftOf(SAVED))).toEqual({});
    expect(pagePatch(EMPTY_PAGE, draftOf(EMPTY_PAGE))).toEqual({});
  });

  it('each field she changed, cleaned; a field emptied as null, which clears it', () => {
    const draft = draftOf(SAVED);
    expect(pagePatch(SAVED, { ...draft, sentence: '  Comida casera\ndesde 1998 ' })).toEqual({ sentence: 'Comida casera desde 1998' });
    expect(pagePatch(SAVED, { ...draft, sentence: '' })).toEqual({ sentence: null });
    expect(pagePatch(SAVED, { ...draft, color: 'mole' })).toEqual({ color: 'mole' });
    expect(pagePatch(SAVED, { ...draft, cover: NINGUNA })).toEqual({ cover_path: null });
    expect(pagePatch(SAVED, { ...draft, cover: { kind: 'nueva', path: 'k/nueva', archivos: [] } })).toEqual({ cover_path: 'k/nueva' });
    expect(pagePatch(SAVED, { ...draft, logo: guardada('k/logo') })).toEqual({ logo_path: 'k/logo' });
    expect(pagePatch(SAVED, { ...draft, mapsLink: 'Fonda\nhttps://maps.app.goo.gl/x' })).toEqual({ maps_link: 'https://maps.app.goo.gl/x' });
  });

  it('never sends a link it did not check', () => {
    expect(() => pagePatch(SAVED, { ...draftOf(SAVED), mapsLink: 'hola' })).toThrow(RangeError);
  });

  it('the form names the first thing wrong, in Spanish', () => {
    const draft = draftOf(EMPTY_PAGE);
    expect(checkPage(draft)).toBeNull();
    expect(checkPage({ ...draft, sentence: 'a'.repeat(SENTENCE_MAX) })).toBeNull();
    expect(checkPage({ ...draft, sentence: 'a'.repeat(SENTENCE_MAX + 1) })).toBe('sentenceLong');
    expect(checkPage({ ...draft, mapsLink: 'mi fonda' })).toBe('link');
    expect(ES.pagina.errores.sentenceLong).toMatch(/100/);
    expect(ES.pagina.errores.link).toMatch(/Google Maps/);
  });

  it('the preview draws the form as it would be saved', () => {
    const draft = { ...draftOf(SAVED), sentence: ' Hola ', mapsLink: 'mal enlace' };
    expect(pageWith(draft)).toEqual({ sentence: 'Hola', color: 'chile', cover: 'k/portada', logo: null, mapsLink: null });
  });
});

describe('the defaults — what each empty slot shows', () => {
  it('every kitchen trade of `0072` has a colour and a drawing, and nothing else does', () => {
    const trades = [...KITCHENS.matchAll(/\('(giro-[a-z-]+)',\s*'giro',\s*'[^']+',\s*\d+,\s*'cocina'\)/g)].map((m) => m[1]);
    expect(trades.length).toBe(9);
    expect(Object.keys(POR_GIRO).sort()).toEqual([...trades].sort());
    expect(new Set(Object.values(POR_GIRO).map((d) => d.dibujo))).toEqual(new Set(DIBUJOS));
    expect(defaultsFor('giro-panaderia')).toEqual({ color: 'cempasuchil', dibujo: 'concha' });
    expect(defaultsFor(null)).toBe(SIN_GIRO);
    expect(defaultsFor('giro-que-ya-no-esta')).toBe(SIN_GIRO);
  });

  it('her colour is hers, else her trade’s', () => {
    expect(colorOf(EMPTY_PAGE, 'giro-taqueria')).toBe('nopal');
    expect(colorOf({ ...EMPTY_PAGE, color: 'jamaica' }, 'giro-taqueria')).toBe('jamaica');
  });

  it('each of the six holds white at 4.5 : 1 or better — her initials and the drawings are white', () => {
    const channel = (hex: string, at: number) => {
      const c = parseInt(hex.slice(at, at + 2), 16) / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    };
    const luminance = (hex: string) => 0.2126 * channel(hex, 1) + 0.7152 * channel(hex, 3) + 0.0722 * channel(hex, 5);
    expect(Object.keys(HUES)).toEqual([...COLORS]);
    for (const color of COLORS) expect(1.05 / (luminance(HUES[color]) + 0.05), color).toBeGreaterThanOrEqual(4.5);
  });

  it('every drawing is a 512 px PNG in the bundle, required by name, and drawn from `brand/giros.svg`', () => {
    const map = code('theme/dibujos.ts');
    const svg = readFileSync(join(ROOT, '../brand/giros.svg'), 'utf8');
    const symbols = [...svg.matchAll(/<symbol id="([a-z]+)" viewBox="0 0 64 64">/g)].map((m) => m[1]);
    expect([...symbols].sort()).toEqual([...DIBUJOS].sort());
    for (const dibujo of DIBUJOS) {
      const file = join(SRC, 'marca/giros', `${dibujo}.png`);
      expect(existsSync(file), file).toBe(true);
      const png = readFileSync(file);
      expect(png.subarray(1, 4).toString('latin1'), dibujo).toBe('PNG');
      expect([png.readUInt32BE(16), png.readUInt32BE(20)], dibujo).toEqual([512, 512]);
      expect(map, dibujo).toContain(`${dibujo}: require('@/marca/giros/${dibujo}.png') as ImageSourcePropType,`);
    }
    expect(readFileSync(join(ROOT, '../store/cocina-itacate/render.sh'), 'utf8')).toMatch(/if \[\[ "\$\{1:-\}" == "giros" \]\]; then\n  giros\n  exit 0/);
  });
});

describe('her initials, until she gives a logo', () => {
  it('skip the words that say what she is — as the proposals page drew them', () => {
    expect(kitchenInitials('Fonda Doña Mari')).toBe('DM');
    expect(kitchenInitials('Panadería La Espiga')).toBe('LE');
    expect(kitchenInitials('Taquería El Güero')).toBe('EG');
    expect(kitchenInitials('Cocina Económica de Lupita')).toBe('LU');
    expect(kitchenInitials('Doña Mari Fonda')).toBe('DM');
    expect(kitchenInitials('Mariscos Ñandú')).toBe('ÑA');
  });

  it('a name made only of such words keeps its own; one word gives two letters; nothing gives nothing', () => {
    expect(kitchenInitials('Fonda Económica')).toBe('FE');
    expect(kitchenInitials('Fonda')).toBe('FO');
    expect(kitchenInitials('Lupita')).toBe('LU');
    expect(kitchenInitials('  ')).toBe('');
  });
});

describe('the screens’ wiring, read as text', () => {
  // ⚠️ `10.5-v-c-i`: her page's head left *Hoy* for *Mi cocina* (his direction of 2026-11-06), first on it.
  it('Mi cocina opens the editor, from the picture and from the button, her page first', () => {
    const kitchen = code('app/(cocina)/(tabs)/mi-cocina.tsx');
    expect(kitchen.match(/router\.push\('\/pagina'\)/g)?.length).toBe(2);
    expect(kitchen.indexOf('<Portada')).toBeGreaterThan(-1);
    expect(kitchen.indexOf('<Portada')).toBeLessThan(kitchen.indexOf('<Pendientes'));
    expect(kitchen.indexOf('<Pendientes')).toBeLessThan(kitchen.indexOf('ES.cocina.donde'));
    expect(code('app/(cocina)/(tabs)/index.tsx')).not.toMatch(/<Portada/);
  });

  it('the editor checks the form before anything is sent, and saves through its hook', () => {
    const screen = code('app/(cocina)/pagina.tsx');
    const checked = screen.indexOf('checkPage(draft)');
    const sent = screen.indexOf('await save({ kitchenId: kitchen.id, saved, draft })');
    expect(checked).toBeGreaterThan(-1);
    expect(sent).toBeGreaterThan(checked);
    expect(screen).toMatch(/newPicturePath\(kitchen\.id, newId\(\)\)/);
  });
});
