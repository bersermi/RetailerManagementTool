import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
  DUENA,
  EQUIPO_KEY,
  LEAVE_KITCHEN,
  MEMBERS_TABLE,
  MEMBER_ACTIVE_COLUMN,
  MEMBER_COLUMNS,
  MEMBER_KITCHEN_COLUMN,
  MEMBER_ROLE_COLUMN,
  MEMBER_USER_COLUMN,
  MY_ROLE,
  OWNER_STAYS_CODE,
  ROLES,
  ROL_KEY,
  activoPatch,
  detalleDePersona,
  equipoDe,
  equipoKey,
  esDuena,
  leaveArgs,
  miCocinaPara,
  nombreDePersona,
  quitarErrorMessage,
  roleArgs,
  rolFrom,
  rolKey,
  salirErrorMessage,
  sinPersona,
  type MemberRow,
} from '@/api/equipo';
import { apiErrorMessage } from '@/api/errors';
import { ES } from '@/strings';

// ============================================================================
// WHO WORKS AT HER KITCHEN, AS WERA COCINA READS IT. Plan task `10.9b-ii`, on `0001` and `0082`.
//
// ⚠️ WHAT ONLY A REAL POSTGREST CAN SAY — that each name here is one the database answers, as a
// real owner and a real helper — is `docs/checks/10.9b-ii-team-contract.sh`'s. Here: every name
// this module repeats is in the migrations' own TEXT, and what the app does with an answer.
// ============================================================================

const MIGRATIONS = fileURLToPath(new URL('../../supabase/migrations', import.meta.url));
const migracion = (prefix: string) => {
  const file = readdirSync(MIGRATIONS).find((f) => f.startsWith(prefix));
  if (file === undefined) throw new Error(`no migration ${prefix}`);
  return readFileSync(join(MIGRATIONS, file), 'utf8').replace(/\s+/g, ' ');
};
const calls = readFileSync(new URL('../src/api/calls.ts', import.meta.url), 'utf8').replace(/\s+/g, ' ');

const ME = 'u-mari';

describe('the names, as the migrations write them', () => {
  it('her role is `my_role(p_workspace_id)` (0001), and the roles are its enum’s three', () => {
    const base = migracion('0001_');
    expect(base).toContain(`create function public.${MY_ROLE}(${Object.keys(roleArgs('k'))[0]} uuid)`);
    expect(base).toContain("create type public.workspace_role as enum ('staff', 'manager', 'owner')");
    expect([...ROLES].sort()).toEqual(['manager', 'owner', 'staff']);
    expect(DUENA).toBe('owner');
  });

  it('the list reads the memberships’ table by its columns, and the policy every member reads by (0001)', () => {
    const base = migracion('0001_');
    expect(base).toContain(`create table public.${MEMBERS_TABLE} (`);
    for (const column of [...MEMBER_COLUMNS.split(','), MEMBER_KITCHEN_COLUMN, MEMBER_ACTIVE_COLUMN, MEMBER_USER_COLUMN, MEMBER_ROLE_COLUMN]) {
      if (column === 'display_name') expect(migracion('0034_')).toContain(`add column ${column} text`);
      else expect(base).toMatch(new RegExp(`create table public\\.${MEMBERS_TABLE} \\([^;]* ${column} `));
    }
    // ⚠️ The update is the owner's — the only fence *Quitar* has, and the database's.
    expect(base).toContain(
      `create policy workspace_member_update on public.${MEMBERS_TABLE} for update to authenticated using (public.has_role(workspace_id, 'owner'))`,
    );
  });

  it('Salir is `leave_kitchen(p_workspace_id)` (0082), refusing an owner with TD025', () => {
    const fuente = migracion('0082_');
    expect(fuente).toContain(`create function public.${LEAVE_KITCHEN}(${Object.keys(leaveArgs('k'))[0]} uuid)`);
    expect(fuente).toContain(`errcode = '${OWNER_STAYS_CODE}'`);
  });
});

describe('the four round trips, as calls.ts sends them', () => {
  it('Quitar asks the row back — an RLS refusal is a 200 with none — and never touches an owner', () => {
    expect(calls).toMatch(
      /\.from\(MEMBERS_TABLE\) \.update\(activoPatch\(activo\)\) \.eq\(MEMBER_KITCHEN_COLUMN, kitchenId\) \.eq\(MEMBER_USER_COLUMN, userId\) \.neq\(MEMBER_ROLE_COLUMN, DUENA\) \.select\(MEMBER_USER_COLUMN\) \.single\(\)/,
    );
    expect(activoPatch(false)).toEqual({ is_active: false });
    expect(activoPatch(true)).toEqual({ is_active: true });
  });

  it('the list is THIS kitchen’s active memberships, by name', () => {
    expect(calls).toMatch(
      /\.from\(MEMBERS_TABLE\) \.select\(MEMBER_COLUMNS\) \.eq\(MEMBER_KITCHEN_COLUMN, kitchenId\) \.eq\(MEMBER_ACTIVE_COLUMN, true\)/,
    );
    expect(MEMBER_COLUMNS).not.toContain('*');
  });

  it('her role and Salir are each one call with the kitchen', () => {
    expect(calls).toContain('supabase.rpc(MY_ROLE, roleArgs(kitchenId))');
    expect(calls).toContain('supabase.rpc(LEAVE_KITCHEN, leaveArgs(kitchenId))');
    expect(roleArgs('k1')).toEqual({ p_workspace_id: 'k1' });
    expect(leaveArgs('k1')).toEqual({ p_workspace_id: 'k1' });
  });

  it('each read caches under the login and the kitchen', () => {
    expect(rolKey('u1', 'k1')).toEqual([...ROL_KEY, 'u1', 'k1']);
    expect(rolKey(null, null)).toEqual([...ROL_KEY, '', '']);
    expect(equipoKey('u1', 'k1')).toEqual([...EQUIPO_KEY, 'u1', 'k1']);
    expect(rolKey('u1', 'k1')).not.toEqual(rolKey('u2', 'k1'));
  });
});

describe('her role, as the database answers it', () => {
  it('a role it knows is itself; no membership is `null` — she is out', () => {
    expect(rolFrom('owner')).toBe('owner');
    expect(rolFrom('staff')).toBe('staff');
    expect(rolFrom('manager')).toBe('manager');
    expect(rolFrom(null)).toBeNull();
    expect(rolFrom(undefined)).toBeNull();
  });

  it('⚠️ a role this build does not know is the least — a helper’s screens, never the owner’s', () => {
    expect(rolFrom('jefa')).toBe('staff');
    expect(rolFrom(42)).toBe('staff');
  });

  it('the owner’s parts are hers alone — and nobody’s while her role is unread or she is out', () => {
    expect(esDuena('owner')).toBe(true);
    for (const rol of ['staff', 'manager', null, undefined] as const) expect(esDuena(rol)).toBe(false);
  });

  it('which Mi cocina: the owner’s, a helper’s, or a wheel — never one drawn and then swapped', () => {
    expect(miCocinaPara('owner')).toBe('duena');
    expect(miCocinaPara('staff')).toBe('ayudante');
    expect(miCocinaPara('manager')).toBe('ayudante');
    expect(miCocinaPara(undefined)).toBe('leyendo');
    expect(miCocinaPara(null)).toBe('leyendo');
  });
});

describe('Quién trabaja aquí', () => {
  const row = (user_id: string, role: string, display_name: string | null): MemberRow => ({ user_id, role, display_name });

  it('her first, then by authority, then by name — Quitar on a helper, never on her or an owner', () => {
    const personas = equipoDe(
      [row('u-zoe', 'staff', 'Zoe'), row('u-lupita', 'staff', 'Lupita'), row(ME, 'owner', 'Mari'), row('u-socia', 'owner', 'Ana')],
      ME,
    );
    expect(personas.map((p) => [p.nombre, p.rol, p.esElla, p.quitable])).toEqual([
      ['Mari', 'owner', true, false],
      ['Ana', 'owner', false, false],
      ['Lupita', 'staff', false, true],
      ['Zoe', 'staff', false, true],
    ]);
  });

  it('each row by name and role — her own *Dueña · tú*, the drawing’s', () => {
    const [mari, lupita] = equipoDe([row(ME, 'owner', 'Mari'), row('u-lupita', 'staff', 'Lupita')], ME);
    expect([nombreDePersona(mari), detalleDePersona(mari)]).toEqual(['Mari', 'Dueña · tú']);
    expect([nombreDePersona(lupita), detalleDePersona(lupita)]).toEqual(['Lupita', 'Ayudante']);
  });

  it('a blank name is no name — her role says who she is, never a gap', () => {
    const [sinNombre, conEspacios] = equipoDe([row('u-a', 'staff', '   '), row('u-b', 'staff', '  Lupe   Pérez ')], ME);
    expect(nombreDePersona(conEspacios)).toBe('Lupe Pérez');
    expect(nombreDePersona(sinNombre)).toBe(ES.equipo.roles.staff);
    expect(equipoDe([row('u-c', 'staff', null)], ME)[0].nombre).toBeNull();
  });

  it('unread is an empty list, and one person gone is drawn gone', () => {
    expect(equipoDe(undefined, ME)).toEqual([]);
    expect(sinPersona([row(ME, 'owner', 'Mari'), row('u-l', 'staff', 'Lupita')], 'u-l')).toEqual([row(ME, 'owner', 'Mari')]);
    expect(sinPersona(undefined, 'u-l')).toBeUndefined();
  });
});

describe('a refusal, in words', () => {
  it('Quitar refused (PGRST116: no row she may change) says only the owner may', () => {
    expect(quitarErrorMessage({ code: 'PGRST116' })).toBe(ES.equipo.noSePudoQuitar);
    expect(quitarErrorMessage({ code: '42501' })).toBe(apiErrorMessage({ code: '42501' }));
  });

  it('Salir refused for an owner (TD025) says she deletes her kitchen instead', () => {
    expect(salirErrorMessage({ code: OWNER_STAYS_CODE })).toBe(ES.ayudante.duenaNoSale);
    expect(salirErrorMessage(new TypeError('Network request failed'))).toBe(apiErrorMessage(new TypeError('Network request failed')));
  });
});
