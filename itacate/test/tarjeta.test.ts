import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { readFileSync as leer } from 'node:fs';

import {
  CLAIM_WITH_CODE,
  MY_CARDS,
  REGISTER_MY_KEY,
  RESULTADOS,
  STAMP_WITH_CODE,
  TARJETAS_KEY,
  claimWithCodeArgs,
  keyFrom,
  marcaDe,
  myCardsFrom,
  scanFrom,
  stampWithCodeArgs,
  tarjetasKey,
} from '@/api/tarjeta';

// ============================================================================
// HER LOYALTY CARDS, AS ITACATE ASKS FOR THEM. Plan task `10.9e-i`, on `0085`.
//
// ⚠️ WHAT ONLY A REAL POSTGREST CAN SAY — that each name and argument is one the database answers,
// and every key of every answer — is `docs/checks/10.9e-i-card-contract.sh`'s. Here: each name and
// its arguments are in the migration's own TEXT, that each is keyed on her, every result the
// database writes for her scan, and what the app does with an answer.
// ============================================================================

const MIGRATIONS = fileURLToPath(new URL('../../supabase/migrations', import.meta.url));

/** The text of the last migration that defines `fn`, its whitespace folded. */
function ultimaQueDefine(fn: string): { readonly file: string; readonly body: string } {
  const files = readdirSync(MIGRATIONS).filter((f) => f.endsWith('.sql')).sort();
  const pattern = new RegExp(`create (or replace )?function public\\.${fn}\\(`, 'i');
  const hits = files.filter((f) => pattern.test(readFileSync(join(MIGRATIONS, f), 'utf8')));
  if (hits.length === 0) throw new Error(`no migration defines ${fn}`);
  const file = hits[hits.length - 1];
  const text = readFileSync(join(MIGRATIONS, file), 'utf8');
  const start = text.search(pattern);
  const end = text.indexOf('$$;', text.indexOf('$$', start) + 2);
  return { file, body: text.slice(start, end).replace(/\s+/g, ' ') };
}

describe('the names and their arguments, held to `0085`', () => {
  const cases: Array<[string, RegExp, string[]]> = [
    [REGISTER_MY_KEY, /register_my_key\(\) returns jsonb/, []],
    [MY_CARDS, /my_cards\(\) returns jsonb/, []],
    [
      STAMP_WITH_CODE,
      /stamp_with_code\( p_code text, p_workspace_id uuid default null, p_key uuid default null \) returns jsonb/,
      Object.keys(stampWithCodeArgs('123456', null, null)),
    ],
    [
      CLAIM_WITH_CODE,
      /claim_with_code\( p_reward_id uuid, p_code text, p_key uuid default null \) returns jsonb/,
      Object.keys(claimWithCodeArgs('r', '123456', null)),
    ],
  ];

  for (const [name, signature, args] of cases) {
    it(`${name}: its signature, and the app sends exactly its arguments by the names PostgREST matches on`, () => {
      const { file, body } = ultimaQueDefine(name);
      expect(file.startsWith('0085_')).toBe(true);
      expect(body).toMatch(signature);
      const declared = [...body.slice(0, body.indexOf(') returns')).matchAll(/\b(p_[a-z_]+) /g)].map((m) => m[1]);
      expect(args).toEqual(declared);
    });
  }
});

describe('keyed on her, held to `0085`', () => {
  it('her key, her cards, her stamp and her claim are hers: auth.uid(), never an id she sends', () => {
    for (const fn of [REGISTER_MY_KEY, MY_CARDS, STAMP_WITH_CODE, CLAIM_WITH_CODE]) {
      const { body } = ultimaQueDefine(fn);
      expect(body, fn).toContain('v_user uuid := auth.uid();');
      expect(body, fn).not.toMatch(/p_user/);
    }
    expect(ultimaQueDefine(CLAIM_WITH_CODE).body).toContain('where r.id = p_reward_id and r.user_id = v_user');
  });

  it('a kitchen’s terms before her first stamp come through the one door, its `card` — only while open and switched on (G12, ADR-035 §2.7)', () => {
    const { file, body } = ultimaQueDefine('on_offer_now');
    // `0085` made it; a later migration re-making the door (`0087`'s promotions) carries it — with, since `0099`
    // (`10.9m`), the kitchen's condition.
    expect(Number(file.slice(0, 4))).toBeGreaterThanOrEqual(99);
    expect(body).toContain(
      "'card', (select jsonb_build_object('reward', t.reward, 'stamps', t.stamps, 'expiry_days', t.expiry_days, 'conditions', t.conditions) from servicio.card_terms t where t.workspace_id = k.id and t.replaced_at is null and t.closed_at is null and servicio.card_switched_on()),",
    );
    // Itacate declares the key and its four fields, so the door's contract check holds every key.
    const cocinas = leer(fileURLToPath(new URL('../src/api/cocinas.ts', import.meta.url)), 'utf8');
    expect(cocinas).toMatch(/readonly card: DoorCardRow \| null;/);
    const campos = cocinas
      .slice(cocinas.indexOf('export interface DoorCardRow {'))
      .split('\n}')[0]
      .match(/readonly ([a-z_]+):/g)
      ?.map((m) => m.slice(9, -1));
    expect(campos).toEqual(['reward', 'stamps', 'expiry_days', 'conditions']);
    // And no second door: no function of the card hands her a kitchen's terms.
    expect(() => ultimaQueDefine('card_terms_of')).toThrow();
  });

  it('every result the database writes for her scan is one this app knows', () => {
    const bodies = [STAMP_WITH_CODE, CLAIM_WITH_CODE].map((fn) => ultimaQueDefine(fn).body).join(' ');
    const core = readFileSync(
      join(MIGRATIONS, readdirSync(MIGRATIONS).find((f) => f.startsWith('0085_')) as string),
      'utf8',
    ).replace(/\s+/g, ' ');
    const stampCore = core.slice(core.indexOf('create function servicio.give_card_stamp('));
    const written = new Set(
      [...bodies.matchAll(/jsonb_build_object\('result', '([a-z_]+)'/g)].map((m) => m[1]).concat(
        [...stampCore.slice(0, stampCore.indexOf('$$;')).matchAll(/return (?:case when v_first then )?'([a-z_]+)'/g)].map(
          (m) => m[1],
        ),
      ),
    );
    written.delete('apagada'); // the trigger's alone: her scan is refused TD024 before it
    expect(written.size).toBeGreaterThanOrEqual(9);
    for (const r of written) expect(RESULTADOS as readonly string[], r).toContain(r);
  });
});

describe('the answers read', () => {
  const state = {
    stamps: 5,
    of: 8,
    reward: 'Una comida corrida',
    expiry_days: 30,
    conditions: null,
    expires_on: '2026-12-19',
    stamped_today: false,
    rewards: [
      { id: 'r2', reward: 'Una comida corrida', won_at: '2026-11-12T17:00:00Z' },
      { id: 'r1', reward: 'Un agua fresca', won_at: '2026-11-05T17:00:00Z' },
    ],
    open: true,
    kept_until: null,
  };

  it('her cards: who, in its colour and logo, and her card there', () => {
    const read = myCardsFrom([
      { ...state, id: 'k', name: 'Fonda Doña Mari', colonia: 'Santa María la Ribera', page: { color: 'rojo', logo_path: null } },
    ]);
    expect(read?.[0].name).toBe('Fonda Doña Mari');
    expect(read?.[0].page?.color).toBe('rojo');
    expect(read?.[0].rewards.map((r) => r.id)).toEqual(['r2', 'r1']);
    expect(myCardsFrom([])).toEqual([]);
  });

  it('anything else is `null` — never an empty list that is not one', () => {
    for (const v of [null, {}, [{ ...state, id: 'k' }], [{ ...state, id: 'k', name: 'x', stamps: -1 }]]) {
      expect(myCardsFrom(v), JSON.stringify(v)).toBeNull();
    }
  });

  it('a scan: its result, the kitchen, the reward claimed and her card; an unknown result is `null`', () => {
    const read = scanFrom({ ...state, result: 'gano', kitchen: { id: 'k', name: 'Fonda Doña Mari' } });
    expect(read?.result).toBe('gano');
    expect(read?.kitchen?.name).toBe('Fonda Doña Mari');
    expect(read?.card?.stamps).toBe(5);
    expect(scanFrom({ result: 'no_valido' })).toEqual({ result: 'no_valido', kitchen: null, claimed: null, card: null });
    expect(scanFrom({ result: 'suya' })).toBeNull();
  });

  it('her mark in Cerca (G38): *5/8*, nothing with no stamp going', () => {
    expect(marcaDe(state)).toBe('5/8');
    expect(marcaDe({ ...state, stamps: 0 })).toBeNull();
    expect(marcaDe(undefined)).toBeNull();
  });

  it('a phone’s key: its id and 40 hex characters; cached under the login', () => {
    expect(keyFrom({ key: 'k', secret: 'f'.repeat(40) })).toEqual({ key: 'k', secret: 'f'.repeat(40) });
    expect(keyFrom({ key: 'k' })).toBeNull();
    expect(tarjetasKey('u')).toEqual([...TARJETAS_KEY, 'u']);
  });
});
