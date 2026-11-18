import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { KITCHEN_FOLLOWERS, SEGUIDORES_KEY, followersArgs, seguidoresKey, teSiguenFrom } from '@/api/seguidores';

// ============================================================================
// HOW MANY FOLLOW HER KITCHEN, AS WERA COCINA READS IT. Plan task `10.9d-i`, on `0084`.
//
// ⚠️ WHAT ONLY A REAL POSTGREST CAN SAY — that the name and its argument are ones the database
// answers — is `docs/checks/10.9d-i-following-contract.sh`'s. Here: the name and the argument
// are in the migration's own TEXT (whichever defines the function last), the count is of
// followers and never of bells, any member reads it, and what the app does with an answer.
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

describe('the name, held to `0084`', () => {
  it('one function, its one argument by the name PostgREST matches on, answering an integer', () => {
    expect(KITCHEN_FOLLOWERS).toBe('kitchen_followers');
    const { body } = ultimaQueDefine(KITCHEN_FOLLOWERS);
    expect(body).toMatch(/kitchen_followers\(p_workspace_id uuid\) returns integer/);
    expect(Object.keys(followersArgs('k'))).toEqual(['p_workspace_id']);
  });

  it('⚠️ any member of her kitchen reads it — her helpers too — and it counts followers, never a bell', () => {
    const { body } = ultimaQueDefine(KITCHEN_FOLLOWERS);
    expect(body).toContain('p_workspace_id not in (select public.my_workspaces())');
    expect(body).not.toContain('has_role');
    expect(body).toContain('where f.workspace_id = p_workspace_id and f.following');
    expect(body).not.toMatch(/f\.bell/);
  });
});

describe('the answer read', () => {
  it('a whole number from zero is the count', () => {
    expect(teSiguenFrom(0)).toBe(0);
    expect(teSiguenFrom(38)).toBe(38);
  });

  it('anything else is `null` — never a 0 that is not one', () => {
    for (const v of [null, undefined, '38', -1, 2.5, Number.NaN, {}, []]) expect(teSiguenFrom(v), String(v)).toBeNull();
  });

  it('cached under the login and the kitchen', () => {
    expect(seguidoresKey('u', 'k')).toEqual([...SEGUIDORES_KEY, 'u', 'k']);
    expect(seguidoresKey(null, null)).toEqual([...SEGUIDORES_KEY, '', '']);
  });
});
