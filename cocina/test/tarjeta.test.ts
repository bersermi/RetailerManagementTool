import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
  CARD_OF_CODE,
  CLOSE_CARD,
  DIAS_AL_CERRAR,
  DIAS_MAX,
  DIAS_MIN,
  DIAS_SIN_VENIR,
  GIVE_REWARD,
  GIVE_STAMP,
  KITCHEN_CARD,
  PREMIO_MAX,
  REGISTER_KITCHEN_KEY,
  RESULTADOS,
  SELLOS_MAX,
  SELLOS_MIN,
  SET_CARD_TERMS,
  TARJETA_KEY,
  cardFrom,
  codeArgs,
  diasValidos,
  keyFrom,
  kitchenArgs,
  kitchenCardFrom,
  rewardArgs,
  stampArgs,
  tarjetaKey,
  termsArgs,
} from '@/api/tarjeta';

// ============================================================================
// THE LOYALTY CARD, AS WERA COCINA ASKS FOR IT. Plan task `10.9e-i`, on `0085`.
//
// ⚠️ WHAT ONLY A REAL POSTGREST CAN SAY — that each name and argument is one the database answers,
// and every key of every answer — is `docs/checks/10.9e-i-card-contract.sh`'s. Here: each name and
// its arguments are in the migration's own TEXT (whichever defines the function last), who may call
// each, the bounds, every result the database writes, and what the app does with an answer.
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

/** Where each function is defined last: `0085`, but `set_card_terms`, re-made by `0089` (`10.9k`) with its signature. */
const DEFINIDA_EN: Readonly<Record<string, string>> = { [SET_CARD_TERMS]: '0089_' };

/** The last `card_terms_expiry` check a migration sets, its whitespace folded. */
function ultimoCheckDeDias(): string {
  const files = readdirSync(MIGRATIONS).filter((f) => f.endsWith('.sql')).sort();
  const checks = files
    .map((f) => readFileSync(join(MIGRATIONS, f), 'utf8').replace(/\s+/g, ' '))
    .flatMap((text) => [...text.matchAll(/constraint card_terms_expiry check \(([^;]*?)\)(?:,|;| \))/g)].map((m) => m[1]));
  if (checks.length === 0) throw new Error('no migration sets card_terms_expiry');
  return checks[checks.length - 1];
}

describe('the names and their arguments, held to `0085` (and `0089`)', () => {
  const cases: Array<[string, RegExp, string[]]> = [
    [
      SET_CARD_TERMS,
      /set_card_terms\( p_workspace_id uuid, p_reward text, p_stamps integer, p_expiry_days integer \) returns jsonb/,
      Object.keys(termsArgs('k', 'r', 8, 30)),
    ],
    [CLOSE_CARD, /close_card\(p_workspace_id uuid\) returns jsonb/, Object.keys(kitchenArgs('k'))],
    [KITCHEN_CARD, /kitchen_card\(p_workspace_id uuid\) returns jsonb/, Object.keys(kitchenArgs('k'))],
    [REGISTER_KITCHEN_KEY, /register_kitchen_key\(p_workspace_id uuid\) returns jsonb/, Object.keys(kitchenArgs('k'))],
    [
      CARD_OF_CODE,
      /card_of_code\( p_workspace_id uuid, p_code text, p_key uuid default null \) returns jsonb/,
      Object.keys(codeArgs('k', '123456', null)),
    ],
    [
      GIVE_STAMP,
      /give_stamp\( p_workspace_id uuid, p_code text, p_key uuid default null, p_at timestamptz default null \) returns jsonb/,
      Object.keys(stampArgs('k', '123456', null, null)),
    ],
    [
      GIVE_REWARD,
      /give_reward\( p_workspace_id uuid, p_code text, p_reward_id uuid, p_key uuid default null, p_at timestamptz default null \) returns jsonb/,
      Object.keys(rewardArgs('k', '123456', 'r', null, null)),
    ],
  ];

  for (const [name, signature, args] of cases) {
    it(`${name}: its signature, and the app sends exactly its arguments by the names PostgREST matches on`, () => {
      const { file, body } = ultimaQueDefine(name);
      expect(file.startsWith(DEFINIDA_EN[name] ?? '0085_'), file).toBe(true);
      expect(body).toMatch(signature);
      const declared = [...body.slice(0, body.indexOf(') returns')).matchAll(/\b(p_[a-z_]+) /g)].map((m) => m[1]);
      expect(args).toEqual(declared);
    });
  }
});

describe('who may call each (G18), held to `0085`', () => {
  it('the terms and closing are the owner’s', () => {
    for (const fn of [SET_CARD_TERMS, CLOSE_CARD]) {
      expect(ultimaQueDefine(fn).body).toContain("not public.has_role(p_workspace_id, 'owner')");
    }
  });

  it('reading the card, a phone’s key, a scan, a stamp and a reward: any member — her helper too', () => {
    for (const fn of [KITCHEN_CARD, REGISTER_KITCHEN_KEY, CARD_OF_CODE, GIVE_STAMP, GIVE_REWARD]) {
      const { body } = ultimaQueDefine(fn);
      expect(body, fn).toContain('p_workspace_id not in (select public.my_workspaces())');
      expect(body, fn).not.toContain('has_role');
    }
  });

  it('a stamp or a reward from the kitchen records who gave it (G19)', () => {
    expect(ultimaQueDefine(GIVE_STAMP).body).toContain(
      "servicio.give_card_stamp(p_workspace_id, v_her, v_at, v_user, 'su_codigo', null)",
    );
    expect(ultimaQueDefine(GIVE_REWARD).body).toContain(
      "set claimed_at = v_at, claimed_by = v_user, claimed_via = 'su_codigo'",
    );
  });
});

describe('the bounds and the results, held to `0085`', () => {
  const sql = readFileSync(
    join(MIGRATIONS, readdirSync(MIGRATIONS).find((f) => f.startsWith('0085_')) as string),
    'utf8',
  ).replace(/\s+/g, ' ');

  it('a reward of 1 to 60 characters, 4 to 12 stamps; Nunca or 14 to 365 days, the chips 2 semanas, 1 mes, 2 meses and 3 meses (G7, G15, G34; `0089`, `10.9k`)', () => {
    expect(PREMIO_MAX).toBe(60);
    expect([SELLOS_MIN, SELLOS_MAX]).toEqual([4, 12]);
    expect([DIAS_MIN, DIAS_MAX]).toEqual([14, 365]);
    expect([...DIAS_SIN_VENIR]).toEqual([0, 14, 30, 60, 90]);
    const terms = ultimaQueDefine(SET_CARD_TERMS).body;
    expect(terms).toContain('char_length(v_reward) not between 1 and 60');
    expect(terms).toContain('p_stamps not between 4 and 12');
    expect(terms).toContain(`(p_expiry_days <> 0 and p_expiry_days not between ${DIAS_MIN} and ${DIAS_MAX})`);
    expect(ultimoCheckDeDias()).toBe(`expiry_days between ${DIAS_MIN} and ${DIAS_MAX}`);
  });

  it('the app takes the days the database takes: 0, every chip, 14 to 365 whole — never 13, 366, a fraction or a sign (`10.9k`)', () => {
    for (const d of [0, ...DIAS_SIN_VENIR, 14, 15, 21, 45, 120, 365]) expect(diasValidos(d), String(d)).toBe(true);
    for (const d of [1, 7, 13, 366, 999, -14, 20.5, Number.NaN]) expect(diasValidos(d), String(d)).toBe(false);
    expect(termsArgs('k', 'Un taco', 8, 21)).toEqual({ p_workspace_id: 'k', p_reward: 'Un taco', p_stamps: 8, p_expiry_days: 21 });
  });

  it('a closed card is kept 30 days for those who started it (G12)', () => {
    expect(DIAS_AL_CERRAR).toBe(30);
    expect(sql).toContain("else t.closed_at + interval '30 days' end");
  });

  it('every result the database writes for a kitchen’s scan is one this app knows', () => {
    const written = new Set(
      [...sql.matchAll(/jsonb_build_object\('result', '([a-z_]+)'/g)].map((m) => m[1]).concat(
        [...sql.matchAll(/return '([a-z_]+)';/g)].map((m) => m[1]),
      ),
    );
    written.delete('apagada'); // the trigger's alone, which answers nobody
    expect(written.size).toBeGreaterThanOrEqual(10);
    for (const r of written) expect(RESULTADOS as readonly string[], r).toContain(r);
  });
});

describe('the answers read', () => {
  const card = {
    terms: { reward: 'Una comida corrida', stamps: 8, expiry_days: 30, since: '2026-11-19T17:00:00Z' },
    open: true,
    closed_at: null,
    kept_until: null,
    cards: 12,
    stamps_today: 3,
    rewards_to_give: 2,
    today: [
      { at: '2026-11-19T17:20:00Z', kind: 'sello', name: 'Ana R.', stamps: 5, of: 8, reward: null, via: 'su_codigo' },
      { at: '2026-11-19T17:10:00Z', kind: 'cobro', name: null, stamps: null, of: null, reward: 'Un agua', via: 'codigo_cocina' },
    ],
  };

  it('kitchen_card: its counts, its terms and its lines', () => {
    const read = kitchenCardFrom(card);
    expect(read?.cards).toBe(12);
    expect(read?.terms?.expiry_days).toBe(30);
    expect(read?.today.map((l) => l.kind)).toEqual(['sello', 'cobro']);
    expect(kitchenCardFrom({ ...card, terms: null })?.terms).toBeNull();
  });

  it('anything else is `null` — never zeros that are not counts', () => {
    for (const v of [null, [], { ...card, cards: -1 }, { ...card, today: [{ ...card.today[0], kind: 'otro' }] }, { ...card, open: 'yes' }]) {
      expect(kitchenCardFrom(v), JSON.stringify(v)).toBeNull();
    }
  });

  it('a scan: her name, her card and her stack; an unknown result is `null`', () => {
    const read = cardFrom({
      result: 'suya',
      name: 'Ana R.',
      stamps: 5,
      of: 8,
      reward: 'Una comida corrida',
      expiry_days: 30,
      expires_on: '2026-12-19',
      stamped_today: false,
      rewards: [{ id: 'r1', reward: 'Una comida corrida', won_at: '2026-11-05T17:00:00Z' }],
      open: true,
      kept_until: null,
    });
    expect(read?.name).toBe('Ana R.');
    expect(read?.rewards).toHaveLength(1);
    expect(cardFrom({ result: 'propia' })?.result).toBe('propia');
    expect(cardFrom({ result: 'apagada' })).toBeNull();
    expect(cardFrom({ result: 'suya', rewards: [{ id: 1 }] })).toBeNull();
  });

  it('a phone’s key: its id and 40 hex characters', () => {
    expect(keyFrom({ key: 'k', secret: 'a'.repeat(40) })).toEqual({ key: 'k', secret: 'a'.repeat(40) });
    expect(keyFrom({ key: 'k', secret: 'a'.repeat(39) })).toBeNull();
  });

  it('cached under the login and the kitchen', () => {
    expect(tarjetaKey('u', 'k')).toEqual([...TARJETA_KEY, 'u', 'k']);
    expect(tarjetaKey(null, null)).toEqual([...TARJETA_KEY, '', '']);
  });
});
