import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
  EN_LA_PUERTA,
  ESTADOS,
  MENU_MAXIMO,
  MY_KITCHEN_FEATURES,
  NADA,
  NO_SE_OFRECE,
  SEND_MENU_REQUEST,
  SERVICIOS,
  SERVICIOS_KEY,
  SET_KITCHEN_FEATURES,
  enLaPuerta,
  enUso,
  featuresArgs,
  loQueUsaFrom,
  menuRequestArgs,
  serviciosKey,
  setFeaturesArgs,
  type LoQueUsa,
} from '@/api/servicios';

// ============================================================================
// WHAT HER KITCHEN USES, AS WERA COCINA READS IT. Plan task `10.9a-i`, on `0081`.
//
// ⚠️ WHAT ONLY A REAL POSTGREST CAN SAY — that each name and key here is one the database
// answers — is `docs/checks/10.9a-i-features-contract.sh`'s. Here: every list and number this
// module repeats is in the migration's own TEXT (whichever defines each function last), and
// what the app does with an answer — a feature or a state it does not know left out.
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

/** The migration that made the tables, its whitespace folded. */
function tablas(): string {
  const file = readdirSync(MIGRATIONS).find((f) => /create table servicio\.kitchen_feature/.test(readFileSync(join(MIGRATIONS, f), 'utf8')));
  if (file === undefined) throw new Error('no migration makes servicio.kitchen_feature');
  return readFileSync(join(MIGRATIONS, file), 'utf8').replace(/\s+/g, ' ');
}

const SINCE = '2026-11-17T18:08:33.340171+00:00';

function respuesta(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    features: [
      { feature: 'tarjeta', state: 'on', since: SINCE },
      { feature: 'numeros', state: 'off', since: SINCE },
      { feature: 'menu', state: 'interesada', since: SINCE },
    ],
    available: ['tarjeta', 'numeros'],
    proximamente: false,
    menu_requests: 0,
    ...over,
  };
}

describe('the names, held to `0081`', () => {
  it('three functions, each defined by a migration — the read for any member, the two writes the owner’s', () => {
    expect([MY_KITCHEN_FEATURES, SET_KITCHEN_FEATURES, SEND_MENU_REQUEST]).toEqual([
      'my_kitchen_features',
      'set_kitchen_features',
      'send_menu_request',
    ]);
    expect(ultimaQueDefine(MY_KITCHEN_FEATURES).body).toContain('p_workspace_id not in (select public.my_workspaces())');
    expect(ultimaQueDefine(SET_KITCHEN_FEATURES).body).toContain("not public.has_role(p_workspace_id, 'owner')");
    expect(ultimaQueDefine(SEND_MENU_REQUEST).body).toContain("not public.has_role(p_workspace_id, 'owner')");
  });

  it('their arguments, by the names PostgREST matches on', () => {
    expect(ultimaQueDefine(MY_KITCHEN_FEATURES).body).toMatch(/my_kitchen_features\(p_workspace_id uuid\)/);
    expect(ultimaQueDefine(SET_KITCHEN_FEATURES).body).toMatch(/set_kitchen_features\(p_workspace_id uuid, p_choices jsonb\)/);
    expect(ultimaQueDefine(SEND_MENU_REQUEST).body).toMatch(/send_menu_request\(p_workspace_id uuid, p_text text\)/);
    expect(Object.keys(featuresArgs('k'))).toEqual(['p_workspace_id']);
    expect(Object.keys(setFeaturesArgs('k', { tarjeta: 'on' }))).toEqual(['p_workspace_id', 'p_choices']);
    expect(Object.keys(menuRequestArgs('k', 'x'))).toEqual(['p_workspace_id', 'p_text']);
  });

  it('the four features in the fixed order, the three states — the table’s and the functions’ own lists', () => {
    const sql = tablas();
    expect([...SERVICIOS]).toEqual(['tarjeta', 'promociones', 'numeros', 'menu']);
    expect(sql).toContain("check (feature in ('tarjeta', 'promociones', 'numeros', 'menu'))");
    expect(ultimaQueDefine(SET_KITCHEN_FEATURES).body).toContain("not in ('tarjeta', 'promociones', 'numeros', 'menu')");
    expect(ultimaQueDefine(MY_KITCHEN_FEATURES).body).toContain("array_position(array['tarjeta', 'promociones', 'numeros', 'menu'], f.feature)");
    expect([...ESTADOS]).toEqual(['on', 'off', 'interesada']);
    expect(sql).toContain("check (state in ('on', 'off', 'interesada'))");
    expect(ultimaQueDefine(SET_KITCHEN_FEATURES).body).toContain("not in ('on', 'off', 'interesada')");
  });

  it('every key of the answer is written in the read’s text', () => {
    const body = ultimaQueDefine(MY_KITCHEN_FEATURES).body;
    for (const key of ['features', 'feature', 'state', 'since', 'available', 'proximamente', 'menu_requests']) {
      expect(body, key).toContain(`'${key}'`);
    }
  });

  it('the menu’s 500 characters, trimmed; TD024 for a feature Wera has switched off', () => {
    expect(MENU_MAXIMO).toBe(500);
    expect(ultimaQueDefine(SEND_MENU_REQUEST).body).toContain('char_length(v_body) not between 1 and 500');
    expect(tablas()).toContain('char_length(body) between 1 and 500 and body = btrim(body)');
    expect(menuRequestArgs('k', '  Lunes, menú de la semana  ').p_text).toBe('Lunes, menú de la semana');
    expect(NO_SE_OFRECE).toBe('TD024');
    expect(ultimaQueDefine(SET_KITCHEN_FEATURES).body).toContain("using errcode = 'TD024'");
  });

  it('⚠️ what the door shows a neighbour is the card and promotions — never her numbers', () => {
    const door = ultimaQueDefine('on_offer_now').body;
    expect([...EN_LA_PUERTA]).toEqual(['tarjeta', 'promociones']);
    expect(door).toContain("and f.feature in ('tarjeta', 'promociones'))");
    expect(door).toContain("join servicio.feature_switch s on s.name = f.feature and s.is_on");
    expect(door).toContain("where f.workspace_id = k.id and f.state = 'on'");
  });
});

describe('the answer read', () => {
  it('her choices with their moments, what Wera offers in the fixed order, Próximamente, her requests', () => {
    const l = loQueUsaFrom(respuesta({ available: ['numeros', 'tarjeta'], proximamente: true, menu_requests: 2 })) as LoQueUsa;
    expect(l.elecciones.tarjeta).toEqual({ estado: 'on', desde: new Date('2026-11-17T18:08:33.340Z') });
    expect(l.elecciones.menu?.estado).toBe('interesada');
    expect(l.elecciones.promociones).toBeUndefined();
    expect(l.ofrecidos).toEqual(['tarjeta', 'numeros']);
    expect(l.proximamente).toBe(true);
    expect(l.pedidosDeMenu).toBe(2);
  });

  it('⚠️ a feature or a state this build does not know is left out — never an error', () => {
    const l = loQueUsaFrom(
      respuesta({
        features: [
          { feature: 'tarjeta', state: 'on', since: SINCE },
          { feature: 'lo_que_venga', state: 'on', since: SINCE },
          { feature: 'numeros', state: 'pausada', since: SINCE },
          { feature: 'menu', state: 'on', since: 'no es fecha' },
        ],
        available: ['tarjeta', 'lo_que_venga'],
      }),
    ) as LoQueUsa;
    expect(Object.keys(l.elecciones)).toEqual(['tarjeta']);
    expect(l.ofrecidos).toEqual(['tarjeta']);
  });

  it('an answer it cannot read is `null`; a count it cannot read is none; Próximamente only on `true`', () => {
    expect(loQueUsaFrom(null)).toBeNull();
    expect(loQueUsaFrom([])).toBeNull();
    expect(loQueUsaFrom({ available: [] })).toBeNull();
    expect(loQueUsaFrom({ features: [] })).toBeNull();
    const l = loQueUsaFrom(respuesta({ proximamente: 'true', menu_requests: '3' })) as LoQueUsa;
    expect(l.proximamente).toBe(false);
    expect(l.pedidosDeMenu).toBe(0);
    expect(loQueUsaFrom({ features: [], available: [] })).toEqual(NADA);
  });
});

describe('what she uses, and what a neighbour sees of it', () => {
  it('her tiles: on, and offered by Wera now — in the fixed order', () => {
    const l = loQueUsaFrom(respuesta()) as LoQueUsa;
    expect(enUso(l)).toEqual(['tarjeta']);
    expect(enUso({ ...l, ofrecidos: [] })).toEqual([]);
  });

  it('the door’s `features`, worked out from her own answer: never her numbers, never interesada', () => {
    const l = loQueUsaFrom(
      respuesta({
        features: [
          { feature: 'promociones', state: 'on', since: SINCE },
          { feature: 'tarjeta', state: 'on', since: SINCE },
          { feature: 'numeros', state: 'on', since: SINCE },
        ],
        available: ['tarjeta', 'promociones', 'numeros'],
      }),
    ) as LoQueUsa;
    expect(enLaPuerta(l)).toEqual(['tarjeta', 'promociones']);
    expect(enLaPuerta({ ...l, ofrecidos: ['numeros'] })).toEqual([]);
    expect(enLaPuerta(null)).toEqual([]);
    expect(enLaPuerta(NADA)).toEqual([]);
  });

  it('cached under the login and the kitchen', () => {
    expect(serviciosKey('u-1', 'k-1')).toEqual([...SERVICIOS_KEY, 'u-1', 'k-1']);
    expect(serviciosKey('u-1', 'k-1')).not.toEqual(serviciosKey('u-2', 'k-1'));
    expect(serviciosKey('u-1', 'k-1')).not.toEqual(serviciosKey('u-1', 'k-2'));
  });
});
