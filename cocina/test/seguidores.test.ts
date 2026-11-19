import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { KITCHEN_FOLLOWERS, SEGUIDORES_KEY, followersArgs, seguidoresKey, teSiguenFrom } from '@/api/seguidores';
import { ES } from '@/strings';

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

// ============================================================================
// `10.9d-ii` — WHERE *TE SIGUEN N* IS DRAWN: the day's card on *Hoy*, and before *Eliminar esta
// cocina* (G22, G23). What the phone shows is the phone's to judge (ADR-035 §2.11); this pins the
// words, the floor (from the first follower), and that a count not known is never drawn as 0.
// ============================================================================

describe('`10.9d-ii` — Te siguen N, drawn', () => {
  const SRC_10_9D = fileURLToPath(new URL('../src', import.meta.url));
  const texto = (path: string) =>
    readFileSync(join(SRC_10_9D, path), 'utf8')
      .replace(/^\s*\/\/.*$/gm, '')
      .replace(/\/\*[\s\S]*?\*\//g, '');

  it('its words — one vecino, many vecinos — and the deletion’s warning with the 30 days', () => {
    // One follower is the pilot's common case: *Te sigue 1 vecino*, *Dejará* (the review of `10.9d-ii`).
    expect(ES.hoy.teSiguen(1)).toBe('Te sigue');
    expect(ES.hoy.teSiguen(38)).toBe('Te siguen');
    expect(ES.hoy.vecinos(1)).toBe('1 vecino');
    expect(ES.hoy.vecinos(38)).toBe('38 vecinos');
    expect(ES.kitchenDeletion.followers(1)).toBe(
      'Te sigue 1 vecino en Itacate. Dejará de ver tu cocina, y durante 30 días su lista dirá que dejó Itacate.',
    );
    expect(ES.kitchenDeletion.followers(12)).toMatch(/^Te siguen 12 vecinos en Itacate\. Dejarán de ver/);
    // The 30 days are `0084`'s and Itacate's (`DIAS_QUE_SE_VE_QUE_SE_FUE`).
    expect(readFileSync(join(SRC_10_9D, '../../itacate/src/api/siguiendo.ts'), 'utf8')).toMatch(
      /export const DIAS_QUE_SE_VE_QUE_SE_FUE = 30;/,
    );
  });

  it('on the day’s card from the first follower — on offer or not — and nothing while unread', () => {
    const dia = texto('ui/DiaDeHoy.tsx');
    expect(dia).toMatch(/const siguen = teSiguen !== null && teSiguen > 0 \? ES\.hoy\.vecinos\(teSiguen\) : null;/);
    // Both cards draw it: the white one with nothing on offer, and the green one.
    expect(dia.match(/\{siguen !== null && \(/g)?.length).toBe(2);
  });

  it('before Eliminar esta cocina — warned, never blocked: the confirm never waits on the count', () => {
    const salidas = texto('ui/Salidas.tsx');
    expect(salidas).toMatch(/useSeguidores\(open !== null && alone !== null \? alone\.id : null\)/);
    expect(salidas).toMatch(/\{avisoSeguidores !== null && <Text style=\{words\}>\{avisoSeguidores\}<\/Text>\}/);
    expect(salidas).toMatch(/const kitchenReady = alone !== null && nameMatches\(kitchenTyped, alone\.name\);/);
    expect(salidas).not.toMatch(/kitchenReady[^\n]*seguidores/);
  });

  it('never kept on the phone’s disk — a count read days ago is never shown as today’s', () => {
    expect(readFileSync(join(SRC_10_9D, 'api/persist.ts'), 'utf8')).not.toMatch(/SEGUIDORES_KEY/);
  });
});
