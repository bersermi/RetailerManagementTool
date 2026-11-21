import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { attemptFor, emptyLine, publishArgs, publishBody, PUBLISH_LISTING, type LineDraft } from '@/api/listing';
import {
  ALERT_PROMOTION,
  ACTIVAS_MAX,
  CONDICIONES_MAX,
  CREATE_PROMOTION,
  DESHACER_SEGUNDOS,
  DIAS,
  DIAS_MAX,
  END_PROMOTION,
  ESTADOS,
  ES_TIENDA,
  FUERA_DE_RANGO,
  KITCHEN_PROMOTIONS,
  LO_QUE_MAX,
  MAS_MAX,
  NO_ES_DUENA,
  NO_SE_OFRECE,
  NO_SE_PUEDE_UNIR,
  PROMOCIONES_KEY,
  PROMOTION_ALERT_OFFERED,
  SIN_TARJETA,
  TIPOS,
  TRES_ACTIVAS,
  UNDO_PROMOTION,
  YA_NO_SE_DESHACE,
  activasEl,
  alertaFrom,
  avisoOfrecidoKey,
  createArgs,
  diaDeLaSemana,
  kitchenArgs,
  ofrecidoFrom,
  promocionesFrom,
  promocionesKey,
  promotionArgs,
  type Borrador,
} from '@/api/promociones';

// ============================================================================
// PROMOTIONS, AS WERA COCINA ASKS FOR THEM. Plan task `10.9g-i`, on `0087`.
//
// ⚠️ WHAT ONLY A REAL POSTGREST CAN SAY — that each name and argument is one the database answers,
// and every key of every answer — is `docs/checks/10.9g-i-promotions-contract.sh`'s. Here: each name
// and its arguments are in the migration's own TEXT (whichever defines the function last), who may
// call each, the bounds and the refusals, and what the app does with an answer.
// ============================================================================

const MIGRATIONS = fileURLToPath(new URL('../../supabase/migrations', import.meta.url));

/** The text of the last migration that defines `fn`, its whitespace folded. */
function ultimaQueDefine(fn: string): { readonly file: string; readonly body: string } {
  const files = readdirSync(MIGRATIONS).filter((f) => f.endsWith('.sql')).sort();
  const pattern = new RegExp(`create (or replace )?function public\\.${fn}\\(`, 'i');
  const hits = files.filter((f) => pattern.test(readFileSync(join(MIGRATIONS, f), 'utf8')));
  if (hits.length === 0) throw new Error(`no migration defines ${fn}`);
  const file = hits[hits.length - 1];
  const rest = readFileSync(join(MIGRATIONS, file), 'utf8').slice(
    readFileSync(join(MIGRATIONS, file), 'utf8').search(pattern),
  );
  // Its body ends where its own quote does — `$$` here, `$function$` for a body copied from the database.
  const as = /\bas (\$[a-z]*\$)/i.exec(rest);
  const end = as === null ? rest.length : rest.indexOf(as[1], as.index + as[0].length);
  return { file, body: rest.slice(0, end).replace(/\s+/g, ' ') };
}

const BORRADOR: Borrador = {
  tipo: 'dia',
  loQue: '  Jueves pozolero ',
  mas: '  Rojo o verde, grande  ',
  foto: null,
  dias: [4, 4, 1],
  hasta: '2026-12-31',
  condiciones: ' Los lunes y jueves, del 19 de noviembre al 31 de diciembre de 2026, en Fonda Doña Mari, Sabino 120. ',
};

describe('the names and their arguments, held to `0087`', () => {
  const cases: Array<[string, RegExp, string[]]> = [
    [KITCHEN_PROMOTIONS, /kitchen_promotions\(p_workspace_id uuid\) returns jsonb/, Object.keys(kitchenArgs('k'))],
    [
      CREATE_PROMOTION,
      /create_promotion\( p_workspace_id uuid, p_id uuid, p_kind text, p_what text, p_more text, p_image_path text, p_days integer\[\], p_ends_on date, p_conditions text \) returns jsonb/,
      Object.keys(createArgs('k', 'p', BORRADOR)),
    ],
    [END_PROMOTION, /end_promotion\(p_workspace_id uuid, p_id uuid\) returns jsonb/, Object.keys(promotionArgs('k', 'p'))],
    [UNDO_PROMOTION, /undo_promotion\(p_workspace_id uuid, p_id uuid\) returns jsonb/, Object.keys(promotionArgs('k', 'p'))],
  ];

  for (const [name, signature, args] of cases) {
    it(`${name}: its signature, and the app sends exactly its arguments by the names PostgREST matches on`, () => {
      const { file, body } = ultimaQueDefine(name);
      expect(file.startsWith('0087_')).toBe(true);
      expect(body).toMatch(signature);
      const declared = [...body.slice(0, body.indexOf(') returns')).matchAll(/\b(p_[a-z_]+) /g)].map((m) => m[1]);
      expect(args).toEqual(declared);
    });
  }

  it('publish_listing takes the promotion an offer joins as its sixth argument, defaulted — the name the app sends', () => {
    const { file, body } = ultimaQueDefine(PUBLISH_LISTING);
    expect(file.startsWith('0087_')).toBe(true);
    expect(body).toMatch(/publish_listing\(p_id uuid, p_location_id uuid, p_pickup_start timestamp with time zone, p_pickup_end timestamp with time zone, p_lines jsonb, p_promotion_id uuid default null\)/);
    const lineas: LineDraft[] = [];
    const args = publishArgs({ id: 'x', sent: '' }, publishBody('place', lineas, { start: new Date(0), end: new Date(1) }, null, 'promo-1'));
    expect(Object.keys(args)).toContain('p_promotion_id');
    expect(args.p_promotion_id).toBe('promo-1');
  });
});

describe('Avisar a quienes te siguen — the alert’s two doors, held to `0094` (`10.9h-ii`)', () => {
  it('promotion_alert_offered: her kitchen, by the name the app sends — any member reads it; true only while the kind is on', () => {
    const { file, body } = ultimaQueDefine(PROMOTION_ALERT_OFFERED);
    expect(file.startsWith('0094_')).toBe(true);
    expect(body).toMatch(/promotion_alert_offered\(p_workspace_id uuid\) returns boolean/);
    expect(Object.keys(kitchenArgs('k'))).toEqual(['p_workspace_id']);
    expect(body).toContain('p_workspace_id not in (select public.my_workspaces())');
    expect(body).not.toContain('has_role');
    expect(body).toContain("k.kind = 'promocion_cocina'");
  });

  it('alert_promotion: her kitchen and her promotion, by the names the app sends — the owner’s alone', () => {
    const { file, body } = ultimaQueDefine(ALERT_PROMOTION);
    expect(file.startsWith('0094_')).toBe(true);
    expect(body).toMatch(/alert_promotion\(p_workspace_id uuid, p_id uuid\) returns jsonb/);
    const declared = [...body.slice(0, body.indexOf(') returns')).matchAll(/\b(p_[a-z_]+) /g)].map((m) => m[1]);
    expect(Object.keys(promotionArgs('k', 'p'))).toEqual(declared);
    expect(body).toContain("not public.has_role(p_workspace_id, 'owner')");
  });

  it('its answer is {offered, alerted} and never how many — exactly the keys the app reads', () => {
    const { body } = ultimaQueDefine(ALERT_PROMOTION);
    const answers = [...body.matchAll(/jsonb_build_object\('offered', (true|false), 'alerted', (true|false)\)/g)];
    expect(answers.map((m) => `${m[1]},${m[2]}`)).toEqual(['false,false', 'true,true']);
    expect(body).not.toMatch(/count\(|row_count/i);
  });

  it('a retry is the same alert: once per neighbour and promotion', () => {
    const { body } = ultimaQueDefine(ALERT_PROMOTION);
    expect(body).toContain("'promotion:' || v_p.id");
    expect(body).toContain('on conflict (user_id, kind, about) do nothing');
  });

  it('what the app reads: offered only when it is true, the answer only when both are booleans', () => {
    expect(ofrecidoFrom(true)).toBe(true);
    for (const v of [false, null, 'true', 1, {}, undefined]) expect(ofrecidoFrom(v)).toBe(false);
    expect(alertaFrom({ offered: true, alerted: true })).toEqual({ offered: true, alerted: true });
    expect(alertaFrom({ offered: false, alerted: false })).toEqual({ offered: false, alerted: false });
    expect(alertaFrom({ offered: true })).toBeNull();
    expect(alertaFrom({ offered: 'true', alerted: true })).toBeNull();
    expect(alertaFrom([true, true])).toBeNull();
    expect(alertaFrom(null)).toBeNull();
  });

  it('whether it is offered is cached under the login and the kitchen, apart from her promotions', () => {
    expect(avisoOfrecidoKey('u', 'k')).toEqual(['cocina', 'aviso-ofrecido', 'u', 'k']);
    expect(avisoOfrecidoKey(null, null)).toEqual(['cocina', 'aviso-ofrecido', '', '']);
    expect(avisoOfrecidoKey('u', 'k')[1]).not.toBe(PROMOCIONES_KEY[1]);
  });
});

describe('who may call each (G18, G36), held to `0087`', () => {
  it('making, ending and undoing are the owner’s', () => {
    for (const fn of [CREATE_PROMOTION, END_PROMOTION, UNDO_PROMOTION]) {
      expect(ultimaQueDefine(fn).body, fn).toContain("not public.has_role(p_workspace_id, 'owner')");
    }
  });

  it('reading them: any member — her helper publishes, and Publicar asks her which runs', () => {
    const { body } = ultimaQueDefine(KITCHEN_PROMOTIONS);
    expect(body).toContain('p_workspace_id not in (select public.my_workspaces())');
    expect(body).not.toContain('has_role');
  });

  it('an offer joins one in publish_listing — whoever publishes, a helper too', () => {
    const { body } = ultimaQueDefine(PUBLISH_LISTING);
    expect(body).toContain("case when v_kind = 'cocina' then 'staff' else 'manager' end");
    expect(body).toContain("using errcode = 'TD031'");
  });
});

describe('the bounds and the refusals, held to `0087`', () => {
  const sql = readFileSync(
    join(MIGRATIONS, readdirSync(MIGRATIONS).find((f) => f.startsWith('0087_')) as string),
    'utf8',
  ).replace(/\s+/g, ' ');

  it('the four kinds are the database’s, in the drawing’s order', () => {
    expect([...TIPOS]).toEqual(['nuevo', 'temporada', 'dia', 'clientes']);
    expect(sql).toContain("check (kind in ('nuevo', 'temporada', 'dia', 'clientes'))");
    expect(sql).toContain("p_kind not in ('nuevo', 'temporada', 'dia', 'clientes')");
  });

  it('what 1–40, more ≤ 80, conditions 1–400, eight weeks, three at once, Deshacer two minutes', () => {
    expect([LO_QUE_MAX, MAS_MAX, CONDICIONES_MAX, DIAS_MAX, ACTIVAS_MAX]).toEqual([40, 80, 400, 56, 3]);
    expect(sql).toContain('char_length(v_what) not between 1 and 40');
    expect(sql).toContain('char_length(coalesce(v_more, \'\')) > 80');
    expect(sql).toContain('char_length(v_cond) not between 1 and 400');
    expect(sql).toContain('p_ends_on > v_today + 56');
    expect(sql).toContain('servicio.promotion_running(p)) >= 3 then');
    expect(sql).toContain("'max', 3,");
    expect(DESHACER_SEGUNDOS).toBe(120);
    expect(sql).toContain("v_found.created_at <= now() - interval '2 minutes'");
  });

  it('its days are ISO weekdays, and un día especial names fewer than seven', () => {
    expect([...DIAS]).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(sql).toContain('days <@ array[1, 2, 3, 4, 5, 6, 7]::smallint[]');
    expect(sql).toContain("if p_kind = 'dia' and cardinality(v_days) = 7 then");
  });

  it('every refusal this app names is one the database raises', () => {
    for (const code of [ES_TIENDA, NO_SE_OFRECE, TRES_ACTIVAS, SIN_TARJETA, NO_SE_PUEDE_UNIR, YA_NO_SE_DESHACE]) {
      expect(sql, code).toContain(`errcode = '${code}'`);
    }
    expect(sql).toContain("errcode = '42501'");
    expect(sql).toContain("errcode = '22023'");
    expect([NO_ES_DUENA, FUERA_DE_RANGO]).toEqual(['42501', '22023']);
  });

  it('ending or undoing one that is not there answers her list — never a P0002, which PostgREST serves as a 500', () => {
    expect(ultimaQueDefine(END_PROMOTION).body).not.toContain("errcode = 'P0002'");
    expect(ultimaQueDefine(UNDO_PROMOTION).body).not.toContain("errcode = 'P0002'");
  });

  it('every state the database writes is one this app knows', () => {
    expect([...ESTADOS]).toEqual(['activa', 'terminada']);
    expect(sql).toContain("case when x.running then 'activa' else 'terminada' end");
  });
});

describe('what the app sends', () => {
  it('a press of Publicar promoción: trimmed, its days once each in order, more null when blank', () => {
    expect(createArgs('kitchen', 'id-1', BORRADOR)).toEqual({
      p_workspace_id: 'kitchen',
      p_id: 'id-1',
      p_kind: 'dia',
      p_what: 'Jueves pozolero',
      p_more: 'Rojo o verde, grande',
      p_image_path: null,
      p_days: [1, 4],
      p_ends_on: '2026-12-31',
      p_conditions: 'Los lunes y jueves, del 19 de noviembre al 31 de diciembre de 2026, en Fonda Doña Mari, Sabino 120.',
    });
    expect(createArgs('k', 'i', { ...BORRADOR, mas: '   ' }).p_more).toBeNull();
  });

  it('an offer that joins nothing is sent as today — no key, the same retry id', () => {
    const line: LineDraft = { ...emptyLine('k1'), name: 'Pozole', price: '70', count: '5', usual: '90' };
    const ventana = { start: new Date('2026-11-19T20:00:00Z'), end: new Date('2026-11-19T23:00:00Z') };
    const sin = publishBody('p', [line], ventana);
    expect('p_promotion_id' in sin).toBe(false);
    const mint = (() => {
      let n = 0;
      return () => `id-${(n += 1)}`;
    })();
    const first = attemptFor(null, sin, mint);
    expect(attemptFor(first, publishBody('p', [line], ventana, null, null), mint)).toBe(first);
    const con = attemptFor(first, publishBody('p', [line], ventana, null, 'promo-1'), mint);
    expect(con.id).not.toBe(first.id);
  });
});

describe('what the app reads', () => {
  const ROW = {
    id: 'p-1',
    kind: 'dia',
    what: 'Jueves pozolero',
    more: null,
    image_path: null,
    days: [4],
    starts_on: '2026-11-19',
    ends_on: '2026-12-31',
    conditions: 'Los jueves …',
    created_at: '2026-11-19T18:00:00.123456+00:00',
    state: 'activa',
    ended_on: null,
    shown: true,
    offers_today: 1,
  };
  const ANSWER = { day: '2026-11-19', max: 3, running: 2, card_open: false, promotions: [ROW] };

  it('a well-formed answer is read as it came', () => {
    const read = promocionesFrom(ANSWER);
    expect(read?.running).toBe(2);
    expect(read?.card_open).toBe(false);
    expect(read?.promotions[0]).toEqual(ROW);
  });

  it('a promotion this build cannot read is left out, never the list — the counts stay the database’s', () => {
    const read = promocionesFrom({ ...ANSWER, promotions: [{ ...ROW, kind: 'relampago' }, { ...ROW, id: 'p-2', days: [8] }, ROW] });
    expect(read?.promotions.map((p) => p.id)).toEqual(['p-1']);
    expect(read?.running).toBe(2);
  });

  it('an answer that is not one is null — a screen draws nothing for it, never zeros', () => {
    expect(promocionesFrom(null)).toBeNull();
    expect(promocionesFrom({ ...ANSWER, day: 'hoy' })).toBeNull();
    expect(promocionesFrom({ ...ANSWER, promotions: null })).toBeNull();
    expect(promocionesFrom({ ...ANSWER, card_open: 'no' })).toBeNull();
  });

  it('¿Es parte de una promoción? offers what publish_listing takes for that pickup day — never one over, hidden, or ending before it', () => {
    // 2026-11-19 is a Thursday (4), 2026-11-20 a Friday (5).
    const read = promocionesFrom({
      ...ANSWER,
      promotions: [
        ROW,
        { ...ROW, id: 'p-2', days: [1, 2, 3, 4, 5, 6, 7] },
        { ...ROW, id: 'p-3', state: 'terminada', ended_on: '2026-11-19' },
        { ...ROW, id: 'p-4', shown: false },
        { ...ROW, id: 'p-5', days: [5] },
        { ...ROW, id: 'p-6', days: [1, 2, 3, 4, 5, 6, 7], ends_on: '2026-11-19' },
      ],
    });
    expect(activasEl(read, '2026-11-19').map((p) => p.id)).toEqual(['p-1', 'p-2', 'p-6']);
    expect(activasEl(read, '2026-11-20').map((p) => p.id)).toEqual(['p-2', 'p-5']);
    expect(activasEl(read, '2026-11-18')).toEqual([]);
    expect(activasEl(null, '2026-11-19')).toEqual([]);
    expect(activasEl(read, 'mañana')).toEqual([]);
  });

  it('the weekday of a day is the calendar’s, whatever the phone’s zone', () => {
    expect(diaDeLaSemana('2026-11-19')).toBe(4);
    expect(diaDeLaSemana('2026-11-22')).toBe(7);
    expect(diaDeLaSemana('2026-11-23')).toBe(1);
  });

  it('cached under the login and the kitchen', () => {
    expect(promocionesKey('u', 'k')).toEqual([...PROMOCIONES_KEY, 'u', 'k']);
    expect(promocionesKey(null, null)).toEqual([...PROMOCIONES_KEY, '', '']);
  });
});
