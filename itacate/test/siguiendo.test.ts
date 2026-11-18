import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
  DIAS_QUE_SE_VE_QUE_SE_FUE,
  MY_FOLLOWS,
  NINGUNA,
  NO_ES_COCINA,
  SET_MY_FOLLOW,
  SIGUIENDO_KEY,
  followArgs,
  siguiendoFrom,
  siguiendoKey,
  switchesDe,
  switchesFrom,
  type Siguiendo,
} from '@/api/siguiendo';

// ============================================================================
// THE KITCHENS SHE FOLLOWS, AS ITACATE READS THEM. Plan task `10.9d-i`, on `0084`.
//
// ⚠️ WHAT ONLY A REAL POSTGREST CAN SAY — that each name and key here is one the database
// answers — is `docs/checks/10.9d-i-following-contract.sh`'s. Here: every name, key and number
// this module repeats is in the migration's own TEXT (whichever defines each function last),
// and what the app does with an answer — a kitchen it cannot read left out, never the list.
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

/** The whole text of the migration that made the follows, its whitespace folded. */
function laMigracion(): string {
  const file = readdirSync(MIGRATIONS).find((f) => /create table servicio\.follow \(/.test(readFileSync(join(MIGRATIONS, f), 'utf8')));
  if (file === undefined) throw new Error('no migration makes servicio.follow');
  return readFileSync(join(MIGRATIONS, file), 'utf8').replace(/\s+/g, ' ');
}

const SINCE = '2026-11-18T23:40:27.404874+00:00';

function cocina(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'mari',
    name: 'Fonda Doña Mari',
    giro: 'giro-fonda',
    colonia: 'Santa María la Ribera',
    page: { color: 'nopal', logo_path: 'mari/logo.jpg', cover_path: null },
    following: true,
    bell: false,
    since: SINCE,
    last_day: '2026-11-18',
    ...over,
  };
}

describe('the names, held to `0084`', () => {
  it('two functions keyed on her login, each defined by a migration', () => {
    expect([SET_MY_FOLLOW, MY_FOLLOWS]).toEqual(['set_my_follow', 'my_follows']);
    expect(ultimaQueDefine(SET_MY_FOLLOW).body).toContain('v_user uuid := auth.uid()');
    expect(ultimaQueDefine(MY_FOLLOWS).body).toContain('where f.user_id = auth.uid()');
    expect(ultimaQueDefine(MY_FOLLOWS).body).toContain('where g.user_id = auth.uid()');
  });

  it('their arguments, by the names PostgREST matches on — each switch `null` to leave it as it is', () => {
    expect(ultimaQueDefine(SET_MY_FOLLOW).body).toMatch(
      /set_my_follow\( p_workspace_id uuid, p_following boolean default null, p_bell boolean default null \)/,
    );
    expect(ultimaQueDefine(MY_FOLLOWS).body).toMatch(/my_follows\(\) returns jsonb/);
    expect(followArgs('k', { siguiendo: true })).toEqual({ p_workspace_id: 'k', p_following: true, p_bell: null });
    expect(followArgs('k', { campana: false })).toEqual({ p_workspace_id: 'k', p_following: null, p_bell: false });
    expect(followArgs('k', { siguiendo: false, campana: false })).toEqual({ p_workspace_id: 'k', p_following: false, p_bell: false });
  });

  it('every key of both answers is written in the functions’ text', () => {
    const set = ultimaQueDefine(SET_MY_FOLLOW).body;
    for (const key of ['following', 'bell']) expect(set, key).toContain(`'${key}'`);
    const read = ultimaQueDefine(MY_FOLLOWS).body;
    for (const key of ['kitchens', 'gone', 'id', 'name', 'giro', 'colonia', 'page', 'color', 'logo_path', 'cover_path', 'following', 'bell', 'since', 'last_day', 'gone_at']) {
      expect(read, key).toContain(`'${key}'`);
    }
  });

  it('⚠️ publicó hoy is the door’s own last day — the same words, so her page and her list never disagree', () => {
    // The same subquery, each over its own aliases: the door's kitchen is `k`, the list's `w` with its place `l`.
    const lastDay = (zone: string, id: string) =>
      `to_char(max(li.pickup_start at time zone ${zone}.timezone), 'YYYY-MM-DD') from public.listing li ` +
      `where li.workspace_id = ${id}.id and li.created_at >= now() - interval '28 days')`;
    expect(ultimaQueDefine(MY_FOLLOWS).body).toContain(lastDay('l', 'w'));
    expect(ultimaQueDefine('on_offer_now').body).toContain(lastDay('k', 'k'));
  });

  it('dejó Itacate for 30 days: the read stops there, and the nightly job deletes', () => {
    expect(DIAS_QUE_SE_VE_QUE_SE_FUE).toBe(30);
    expect(ultimaQueDefine(MY_FOLLOWS).body).toContain(`g.gone_at > now() - interval '${DIAS_QUE_SE_VE_QUE_SE_FUE} days'`);
    expect(laMigracion()).toContain(`where g.gone_at <= now() - interval '${DIAS_QUE_SE_VE_QUE_SE_FUE} days'`);
    expect(laMigracion()).toContain("select cron.schedule('forget-gone-kitchens'");
  });

  it('TD026 for a kitchen not in Itacate; the bell off until she taps it', () => {
    expect(NO_ES_COCINA).toBe('TD026');
    expect(ultimaQueDefine(SET_MY_FOLLOW).body).toContain("using errcode = 'TD026'");
    expect(laMigracion()).toContain('bell boolean not null default false');
    expect(ultimaQueDefine(SET_MY_FOLLOW).body).toContain('v_bell := coalesce(p_bell, v_bell, false)');
  });
});

describe('the answers read', () => {
  it('the two switches as the database holds them; anything else is `null`', () => {
    expect(switchesFrom({ following: true, bell: false })).toEqual({ siguiendo: true, campana: false });
    expect(switchesFrom({ following: false, bell: true })).toEqual({ siguiendo: false, campana: true });
    for (const v of [null, [], {}, { following: 'true', bell: false }, { following: true }]) expect(switchesFrom(v)).toBeNull();
  });

  it('her kitchens and those that left, renamed', () => {
    const s = siguiendoFrom({
      kitchens: [cocina()],
      gone: [{ id: 'otra', name: 'Fonda Otra', gone_at: SINCE }],
    }) as Siguiendo;
    expect(s.cocinas).toEqual([
      {
        id: 'mari',
        nombre: 'Fonda Doña Mari',
        giro: 'giro-fonda',
        colonia: 'Santa María la Ribera',
        pagina: { sentence: null, color: 'nopal', cover: null, logo: 'mari/logo.jpg', mapsLink: null },
        siguiendo: true,
        campana: false,
        desde: new Date('2026-11-18T23:40:27.404Z'),
        ultimoDia: '2026-11-18',
      },
    ]);
    expect(s.seFueron).toEqual([{ id: 'otra', nombre: 'Fonda Otra', cuando: new Date('2026-11-18T23:40:27.404Z') }]);
  });

  it('no page, no giro, no colonia, never published: each its default, the kitchen still drawn', () => {
    const s = siguiendoFrom({ kitchens: [cocina({ page: null, giro: null, colonia: null, last_day: null })], gone: [] }) as Siguiendo;
    expect(s.cocinas[0]).toMatchObject({ giro: null, colonia: null, ultimoDia: null });
    expect(s.cocinas[0].pagina).toEqual({ sentence: null, color: null, cover: null, logo: null, mapsLink: null });
  });

  it('⚠️ a kitchen it cannot read is left out, never the list; a colour it does not know is her default', () => {
    const s = siguiendoFrom({
      kitchens: [cocina({ id: null }), cocina({ following: 'yes' }), cocina({ since: 'ayer' }), cocina({ id: 'ok', page: { color: 'azul' } })],
      gone: [{ id: 'x', name: '', gone_at: SINCE }, { id: 'y', name: 'Fonda Y', gone_at: SINCE }],
    }) as Siguiendo;
    expect(s.cocinas.map((c) => c.id)).toEqual(['ok']);
    expect(s.cocinas[0].pagina.color).toBeNull();
    expect(s.seFueron.map((c) => c.id)).toEqual(['y']);
  });

  it('an answer that is not the two lists is `null`', () => {
    for (const v of [null, [], {}, { kitchens: [] }, { gone: [] }, { kitchens: {}, gone: [] }]) expect(siguiendoFrom(v)).toBeNull();
  });

  it('her switches on one kitchen — both off for a kitchen she neither follows nor rings', () => {
    const s = siguiendoFrom({ kitchens: [cocina({ bell: true })], gone: [] });
    expect(switchesDe(s, 'mari')).toEqual({ siguiendo: true, campana: true });
    expect(switchesDe(s, 'otra')).toEqual({ siguiendo: false, campana: false });
    expect(switchesDe(null, 'mari')).toEqual({ siguiendo: false, campana: false });
    expect(switchesDe(NINGUNA, 'mari')).toEqual({ siguiendo: false, campana: false });
  });

  it('cached under the login', () => {
    expect(siguiendoKey('u')).toEqual([...SIGUIENDO_KEY, 'u']);
    expect(siguiendoKey(null)).toEqual([...SIGUIENDO_KEY, '']);
  });
});
