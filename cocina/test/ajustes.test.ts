import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
  AJUSTES_COLUMNS,
  AJUSTES_INICIALES,
  AJUSTES_OWNER_COLUMN,
  AJUSTES_TABLE,
  DESECHABLE_TECHO_CENTAVOS,
  MIN_SCORES,
  ajustesCon,
  ajustesKey,
  comerPatch,
  comeresDe,
  desechableDe,
  desechablePatch,
  desechableTexto,
  esLaUnica,
  minScorePatch,
  pagoPatch,
  pagosDe,
  setAjustesArgs,
  toAjustes,
  type Ajustes,
  type AjustesFields,
} from '@/api/ajustes';
import {
  BUENAS,
  DESDE,
  ETIQUETAS,
  ETIQUETAS_EN_LA_PUERTA,
  MY_KITCHEN_RATINGS,
  calificacionesFrom,
  calificacionesKey,
  estrellasDe,
  ratingsArgs,
} from '@/api/calificaciones';
import { SET_KITCHEN_PAGE } from '@/api/pagina';
import { calificacionesFila, cobroTexto, comerTexto, desechableFila, estrellasTexto, quienTexto } from '@/lib/ajustes';
import { ES } from '@/strings';
import { ETIQUETAS_BUENAS } from '@/vecinos/cocinas';

// ============================================================================
// HER SETTINGS AND HER STARS. Plan task `10.5b-iv-c` (`@/api/ajustes`, `@/api/calificaciones`,
// `@/lib/ajustes`, the five screens from *Mi cocina*).
//
// ⚠️ WHAT ONLY A REAL DATABASE CAN SAY — that the columns are readable, that `set_kitchen_page`
// sets each key and refuses what the screens never send, that `my_kitchen_ratings` answers these
// keys below five and from five — is `docs/checks/10.5b-iv-c-settings-contract.sh`, which reads the
// names out of the two modules. Here: the values, every rule the screens keep before the database
// answers, held to `0079`'s and `0080`'s TEXT, and the wiring read as text (no suite renders).
// ============================================================================

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SRC = join(ROOT, 'src');
const MIGRATIONS = join(ROOT, '../supabase/migrations');
const strip = (text: string) => text.replace(/^\s*\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
const code = (path: string) => strip(readFileSync(join(SRC, path), 'utf8'));
const M0079 = readFileSync(join(MIGRATIONS, '0079_reserving_and_collecting.sql'), 'utf8');
const M0080 = readFileSync(join(MIGRATIONS, '0080_names_scores_and_stars.sql'), 'utf8');

/** The body of the last migration that defines a function — the one the database runs. */
function ultimaQueDefine(name: string): string {
  const files = readdirSync(MIGRATIONS).filter((f) => f.endsWith('.sql')).sort();
  const pattern = new RegExp(`create (or replace )?function public\\.${name}\\(`);
  const hits = files.filter((f) => pattern.test(readFileSync(join(MIGRATIONS, f), 'utf8')));
  const text = readFileSync(join(MIGRATIONS, hits[hits.length - 1]), 'utf8');
  const start = text.search(pattern);
  return text.slice(start, text.indexOf('$$;', text.indexOf('$$', start) + 2));
}

const AHORA: Ajustes = { ...AJUSTES_INICIALES };

describe('her settings, as `0079` and `0080` make them', () => {
  it('six columns of her page’s row, named, never `*`, read by the open kitchen’s id', () => {
    expect(AJUSTES_TABLE).toBe('kitchen_page');
    expect(AJUSTES_COLUMNS).toBe('accepts_card,accepts_transfer,para_llevar,para_aqui,container_price,min_score');
    expect(AJUSTES_OWNER_COLUMN).toBe('workspace_id');
    const keys: (keyof AjustesFields)[] = ['accepts_card', 'accepts_transfer', 'para_llevar', 'para_aqui', 'container_price', 'min_score'];
    expect(AJUSTES_COLUMNS.split(',')).toEqual(keys);
    expect(ajustesKey('u', 'k')).toEqual(['cocina', 'ajustes', 'u', 'k']);
    expect(ajustesKey('u', 'k')).not.toEqual(ajustesKey('u2', 'k'));
  });

  it('the defaults are the columns’ — card and transfer off, to go on, here off, no desechable, everyone', () => {
    expect(M0079).toContain('add column accepts_card     boolean not null default false,');
    expect(M0079).toContain('add column accepts_transfer boolean not null default false,');
    expect(M0079).toContain('add column para_llevar      boolean not null default true,');
    expect(M0079).toContain('add column para_aqui        boolean not null default false,');
    expect(M0079).toContain('add column container_price  numeric(12,2);');
    expect(M0080).toContain('alter table public.kitchen_page add column min_score smallint;');
    expect(AJUSTES_INICIALES).toEqual({ tarjeta: false, transferencia: false, llevar: true, aqui: false, desechableCentavos: null, minScore: null });
    expect(toAjustes(null)).toEqual(AJUSTES_INICIALES);
  });

  it('a row read: each value; a min_score or a price this build does not know reads as none', () => {
    expect(
      toAjustes({ accepts_card: true, accepts_transfer: true, para_llevar: false, para_aqui: true, container_price: 5.5, min_score: 80 }),
    ).toEqual({ tarjeta: true, transferencia: true, llevar: false, aqui: true, desechableCentavos: 550, minScore: 80 });
    expect(toAjustes({ container_price: '12.00' }).desechableCentavos).toBe(1200);
    expect(toAjustes({ min_score: 90 }).minScore).toBeNull();
    expect(toAjustes({ container_price: 'mucho' }).desechableCentavos).toBeNull();
    // Neither way is what the database never holds: read as to go.
    expect(toAjustes({ para_llevar: false, para_aqui: false })).toMatchObject({ llevar: true, aqui: false });
  });

  it('who may reserve: everyone, or more than 75, 80 or 85 — `0080`’s check, and nothing else', () => {
    expect(M0080).toContain('check (min_score is null or min_score in (75, 80, 85))');
    expect([...MIN_SCORES]).toEqual([75, 80, 85]);
    expect(minScorePatch(85)).toEqual({ min_score: 85 });
    expect(minScorePatch(null)).toEqual({ min_score: null });
  });

  it('at least one way — the constraint, the door’s refusal, and a switch never sent off when it is the last', () => {
    expect(M0079).toContain('add constraint kitchen_page_one_way_at_least check (para_llevar or para_aqui)');
    expect(ultimaQueDefine('set_kitchen_page')).toContain('if not (v_llevar or v_aqui) then');
    expect(esLaUnica(AHORA, 'llevar')).toBe(true);
    expect(esLaUnica(AHORA, 'aqui')).toBe(false);
    expect(comerPatch(AHORA, 'llevar', false)).toBeNull();
    expect(comerPatch(AHORA, 'aqui', true)).toEqual({ para_aqui: true });
    const ambas = { ...AHORA, aqui: true };
    expect(esLaUnica(ambas, 'llevar')).toBe(false);
    expect(comerPatch(ambas, 'llevar', false)).toEqual({ para_llevar: false });
    expect(esLaUnica({ ...AHORA, llevar: false, aqui: true }, 'aqui')).toBe(true);
  });

  it('a card or a transfer is a yes or no — never an account', () => {
    expect(pagoPatch('tarjeta', true)).toEqual({ accepts_card: true });
    expect(pagoPatch('transferencia', false)).toEqual({ accepts_transfer: false });
    expect(M0079).toContain('A CARD OR A TRANSFER IS A');
    expect(code('app/(cocina)/cobro.tsx')).not.toMatch(/Campo|TextInput/);
  });

  it('the desechable: a price above zero and below 100,000, or none — read as every price here', () => {
    expect(M0079).toContain('check (container_price is null or (container_price > 0 and container_price < 100000))');
    expect(DESECHABLE_TECHO_CENTAVOS).toBe(10_000_000);
    expect(desechableDe('')).toEqual({ issue: 'vacio' });
    expect(desechableDe('  ')).toEqual({ issue: 'vacio' });
    expect(desechableDe('5')).toEqual({ centavos: 500 });
    expect(desechableDe('$5.50')).toEqual({ centavos: 550 });
    expect(desechableDe('1,200')).toEqual({ centavos: 120000 });
    expect(desechableDe('0')).toEqual({ issue: 'forma' });
    expect(desechableDe('100000')).toEqual({ issue: 'forma' });
    expect(desechableDe('5.555')).toEqual({ issue: 'forma' });
    expect(desechableDe('cinco')).toEqual({ issue: 'forma' });
    expect(desechablePatch(550)).toEqual({ container_price: '5.50' });
    expect(desechablePatch(null)).toEqual({ container_price: null });
    expect(desechableTexto(500)).toBe('5');
    expect(desechableTexto(550)).toBe('5.50');
    expect(desechableTexto(null)).toBe('');
  });

  it('every key a setting is sent under is one `set_kitchen_page` reads — the same door as her page, one key a tap', () => {
    const body = ultimaQueDefine('set_kitchen_page');
    for (const key of AJUSTES_COLUMNS.split(',')) expect(body, key).toContain(`p_page ? '${key}'`);
    expect(SET_KITCHEN_PAGE).toBe('set_kitchen_page');
    expect(setAjustesArgs('k', { accepts_card: true })).toEqual({ p_workspace_id: 'k', p_page: { accepts_card: true } });
    for (const patch of [pagoPatch('tarjeta', true), minScorePatch(80), desechablePatch(500), comerPatch({ ...AHORA, aqui: true }, 'llevar', false)!]) {
      expect(Object.keys(patch)).toHaveLength(1);
    }
  });

  it('a tap is drawn at once', () => {
    expect(ajustesCon(AHORA, { accepts_card: true })).toMatchObject({ tarjeta: true, transferencia: false });
    expect(ajustesCon(AHORA, { container_price: '5.00' }).desechableCentavos).toBe(500);
    expect(ajustesCon({ ...AHORA, desechableCentavos: 500 }, { container_price: null }).desechableCentavos).toBeNull();
    expect(ajustesCon(AHORA, { min_score: 75 }).minScore).toBe(75);
    expect(ajustesCon({ ...AHORA, minScore: 75 }, { accepts_card: true }).minScore).toBe(75);
  });

  it('as the door lists them: cash first and always, card, transfer; to go first', () => {
    expect(pagosDe(AHORA)).toEqual(['efectivo']);
    expect(pagosDe({ ...AHORA, tarjeta: true, transferencia: true })).toEqual(['efectivo', 'tarjeta', 'transferencia']);
    expect(pagosDe({ ...AHORA, transferencia: true })).toEqual(['efectivo', 'transferencia']);
    expect(comeresDe({ ...AHORA, aqui: true })).toEqual(['llevar', 'aqui']);
    expect(comeresDe({ ...AHORA, llevar: false, aqui: true })).toEqual(['aqui']);
  });
});

describe('her stars, as `0080`’s `my_kitchen_ratings` answers — the day after, from five, never who', () => {
  const BODY = ultimaQueDefine('my_kitchen_ratings');

  it('the function and its argument', () => {
    expect(MY_KITCHEN_RATINGS).toBe('my_kitchen_ratings');
    expect(BODY).toContain('create function public.my_kitchen_ratings(p_workspace_id uuid)');
    expect(ratingsArgs('k')).toEqual({ p_workspace_id: 'k' });
    expect(calificacionesKey('u', 'k')).toEqual(['cocina', 'calificaciones', 'u', 'k']);
  });

  it('below five only the count; the eight tags in its order; yesterday mixed — never an order, a code or a name', () => {
    expect(BODY).toContain(`if v_count < ${DESDE} then`);
    expect(BODY.replace(/\s+/g, ' ')).toContain(`array[${ETIQUETAS.map((t) => `'${t}'`).join(', ')}]`);
    expect(BODY).toContain("order by c.stars desc, array_to_string(c.tags, ',')");
    expect(BODY).not.toMatch(/'code'|'note'|buyer_id|'name'/);
    expect([...BUENAS]).toEqual([...ETIQUETAS_BUENAS]);
  });

  it('reads below five as how many, from five as the average, each tag given, and yesterday', () => {
    expect(calificacionesFrom({ count: 3 })).toEqual({ kind: 'pocas', cuantas: 3 });
    expect(calificacionesFrom({ count: 0 })).toEqual({ kind: 'pocas', cuantas: 0 });
    expect(
      calificacionesFrom({
        count: 12,
        average: '4.7',
        tags: { lista_a_tiempo: 9, buena_porcion: 7, muy_rica: 7, me_atendieron_bien: 0, tuve_que_esperar: 2, nuevo: 4 },
        yesterday: [
          { stars: 5, tags: ['lista_a_tiempo'] },
          { stars: 3, tags: ['tuve_que_esperar', 'otra'] },
        ],
      }),
    ).toEqual({
      kind: 'listas',
      cuantas: 12,
      promedio: '4.7',
      etiquetas: [
        { etiqueta: 'lista_a_tiempo', veces: 9 },
        { etiqueta: 'buena_porcion', veces: 7 },
        { etiqueta: 'muy_rica', veces: 7 },
        { etiqueta: 'tuve_que_esperar', veces: 2 },
      ],
      ayer: [
        { estrellas: 5, etiquetas: ['lista_a_tiempo'] },
        { estrellas: 3, etiquetas: ['tuve_que_esperar'] },
      ],
    });
    expect(calificacionesFrom(null)).toBeNull();
    expect(calificacionesFrom([])).toBeNull();
    expect(calificacionesFrom({ count: -1 })).toBeNull();
    // From five with an average it cannot read: how many, nothing invented.
    expect(calificacionesFrom({ count: 6, average: 'x' })).toEqual({ kind: 'pocas', cuantas: 6 });
  });

  it('as the door shows a neighbour: from five, the three most given GOOD tags, the most first, then by name', () => {
    const door = ultimaQueDefine('on_offer_now');
    expect(door).toContain("'stars', (select case when count(*) >= 5 then jsonb_build_object(");
    expect(door).toContain(`limit ${ETIQUETAS_EN_LA_PUERTA}) g)) end`);
    expect(door).toMatch(/order by count\(\*\) desc, t\.tag\s+limit 3/);
    const listas = calificacionesFrom({
      count: 9,
      average: '4.2',
      tags: { muy_rica: 3, lista_a_tiempo: 3, buena_porcion: 1, me_atendieron_bien: 4, porcion_chica: 9 },
    });
    expect(estrellasDe(listas)).toEqual({ promedio: '4.2', cuantas: 9, etiquetas: ['me_atendieron_bien', 'lista_a_tiempo', 'muy_rica'] });
    expect(estrellasDe(calificacionesFrom({ count: 4 }))).toBeNull();
    expect(estrellasDe(null)).toBeNull();
  });
});

describe('what *Mi cocina*’s rows say', () => {
  it('each setting under its name, in her words', () => {
    expect(cobroTexto(AHORA)).toBe('Efectivo');
    expect(cobroTexto({ ...AHORA, tarjeta: true, transferencia: true })).toBe('Efectivo · Tarjeta · Transferencia');
    expect(comerTexto(AHORA)).toBe('Para llevar');
    expect(comerTexto({ ...AHORA, aqui: true })).toBe('Para llevar · Para comer aquí');
    expect(desechableFila(AHORA)).toBe('No lo cobras');
    expect(desechableFila({ ...AHORA, desechableCentavos: 500 })).toBe('$5 por cada plato para llevar');
    expect(quienTexto(AHORA)).toBe('Pueden apartar: todos');
    expect(quienTexto({ ...AHORA, minScore: 80 })).toBe('Pueden apartar: más de 80% de 👍');
    expect(calificacionesFila(null)).toBe('Todavía sin calificaciones');
    expect(calificacionesFila({ kind: 'pocas', cuantas: 4 })).toBe('Todavía sin calificaciones');
    expect(calificacionesFila({ kind: 'listas', cuantas: 12, promedio: '4.7', etiquetas: [], ayer: [] })).toBe('★ 4.7 · 12 calificaciones');
    expect(estrellasTexto(3)).toBe('★★★☆☆');
    expect(estrellasTexto(5)).toBe('★★★★★');
  });

  it('the screens’ words are the drawings’ — and say nothing about penalties, an account or who rated', () => {
    expect(ES.ajustes.apartados.masDe(75)).toBe('Más de 75%');
    expect(ES.ajustes.apartados.todos).toBe('Todos');
    expect(ES.ajustes.cobro.tarjetaDetalle).toBe('Con tu propia terminal');
    expect(ES.ajustes.cobro.transferenciaDetalle).toBe('A tu cuenta, por SPEI');
    expect(ES.ajustes.comer.nota).toBe('Al menos una. Si están las dos, tus vecinos eligen al apartar, y para llevar va primero.');
    expect(ES.ajustes.calificaciones.pocas(1)).toBe('Tienes 1 calificación.');
    expect(ES.ajustes.calificaciones.pocas(0)).toBe('Todavía no tienes calificaciones.');
    for (const tag of ETIQUETAS) expect(ES.ajustes.calificaciones.etiqueta[tag], tag).toBeTruthy();
  });
});

describe('the wiring, read as text', () => {
  const ROWS = [
    ['/cobro', 'cobro.tsx'],
    ['/como-se-come', 'como-se-come.tsx'],
    ['/desechable', 'desechable.tsx'],
    ['/calificaciones', 'calificaciones.tsx'],
    ['/ajustes-apartados', 'ajustes-apartados.tsx'],
  ] as const;

  it('*Mi cocina* opens each of her settings’ screens, pushed over the tabs, never a tab', () => {
    const mi = code('app/(cocina)/(tabs)/mi-cocina.tsx');
    for (const [ruta, archivo] of ROWS) {
      expect(mi, ruta).toContain(`router.push('${ruta}')`);
      expect(existsSync(join(SRC, 'app/(cocina)', archivo)), archivo).toBe(true);
      expect(existsSync(join(SRC, 'app/(cocina)/(tabs)', archivo)), archivo).toBe(false);
    }
  });

  it('*Ajustes de apartados* is named in *Mi cocina* alone — nothing on *Hoy* or *Apartados* (the final design)', () => {
    for (const screen of ['app/(cocina)/(tabs)/index.tsx', 'app/(cocina)/(tabs)/apartados.tsx', 'ui/DiaDeHoy.tsx', 'ui/LoQueSigue.tsx']) {
      expect(code(screen), screen).not.toMatch(/ajustesApartados|ajustes-apartados|minScore|min_score|quienTexto/);
    }
  });

  it('a setting is drawn at once and put back on a refusal; one at a time', () => {
    const hooks = code('api/hooks.ts');
    const hook = hooks.slice(hooks.indexOf('export function useGuardarAjuste'), hooks.indexOf('export function useCalificaciones'));
    expect(hook).toMatch(/onMutate: async \(patch\) => \{\s*await queries\.cancelQueries\(\{ queryKey: key \}\);/);
    expect(hook).toMatch(/queries\.setQueryData<Ajustes>\(key, ajustesCon\(antes, patch\)\)/);
    expect(hook).toMatch(/onError: [\s\S]*?queries\.setQueryData<Ajustes>\(key, context\.antes\)/);
    expect(hook).toMatch(/if \(kitchenId === null \|\| mutation\.isPending\) return null;/);
  });

  it('the last way her kitchen hands plates over is drawn still', () => {
    const screen = code('app/(cocina)/como-se-come.tsx');
    expect(screen).toMatch(/fijo=\{esLaUnica\(ajustes, 'llevar'\)\}/);
    expect(screen).toMatch(/fijo=\{esLaUnica\(ajustes, 'aqui'\)\}/);
  });

  it('a screen whose settings are not read says so — never the defaults drawn as hers', () => {
    const frame = code('ui/PantallaDeAjustes.tsx');
    expect(frame).toMatch(/if \(kitchen === null \|\| ajustes\.data === undefined\) \{/);
    expect(frame).toMatch(/ajustes\.isError \?/);
  });
});
