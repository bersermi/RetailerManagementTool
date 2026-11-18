// ============================================================================
// WHO WORKS AT HER KITCHEN, AS A CONTRACT WITH POSTGRES. Plan task `10.9b-ii` —
// the owner's rulings of 2026-11-16 and 17 (G13 everyone at the fonda on her own
// phone; G18 two roles, the OWNER and a HELPER — the database's `owner` and
// `staff`, `manager` left free for a third; G36 a helper publishes too), on the
// database `10.9b-i` left (`0082`). Three claims, each a name the database answers:
//
//   1. HER ROLE AT A KITCHEN — `my_role(p_workspace_id)` (`0001`): the database's own
//      answer to "caller role in one workspace, or null if not a member". Held per
//      kitchen and KEPT ON THE PHONE (`@/api/persist`): a helper's *Hoy* opened with no
//      signal must not draw what is the owner's, nor an owner's lose her doors.
//   2. *QUIÉN TRABAJA AQUÍ* — the owner's list: `workspace_member`'s rows of THIS
//      kitchen, active, by name and role. `workspace_member_select` (`0001`) lets every
//      member read them; the screen draws them for the owner alone (G18: inviting and
//      removing are hers), and the read is not made on a helper's phone at all.
//      *QUITAR A …* is the table's own update of `is_active` — `workspace_member_update`
//      is the owner's (`0001`), and the trigger stamps `left_at` (`0053`); her name stays
//      on the row (the owner's ruling of 2026-10-09: the business keeps the name). An
//      RLS UPDATE refusal is a 200 with no row, so the call asks for the row back and
//      `.single()` turns a refusal into `PGRST116`.
//   3. *SALIR DE ESTA COCINA* — `leave_kitchen(p_workspace_id)` (`0082`): a helper ends
//      her own membership; `TD025` for an owner, who deletes her kitchen instead.
//
// ⚠️⚠️ A HELPER REMOVED OR GONE IS READ AS NO KITCHEN, AND NOTHING HERE DOES IT: the
// walls do. `my_workspaces()` asks `is_active`, so her kitchens' read (`@/api/kitchen`)
// answers `[]` once she is out, and the guard sends her where a kitchen is made — and,
// from `10.9b-iii`, joined. `my_role` answers `null` then too; the tabs' layout reads
// her kitchens again when it does (`@/api/hooks`' `useSuRol`).
//
// ⚠️ EVERYTHING WITH A RIGHT ANSWER IS IN HERE, AND NOTHING THAT TALKS (`@/api/kitchen`'s
// split): `docs/checks/10.9b-ii-team-contract.sh` reads every name below OUT OF THIS FILE
// and asks a real PostgREST, as a real owner and a real helper.
// ============================================================================

import { apiErrorMessage } from '@/api/errors';
import { ES } from '@/strings';

// ----------------------------------------------------------------------------
// 1. Her role at a kitchen
// ----------------------------------------------------------------------------

/** `0001`'s function: her role at one business, or `null` when she is no active member of it. */
export const MY_ROLE = 'my_role';

/** Its argument, by the name PostgREST matches on. */
export interface RoleArgs {
  readonly p_workspace_id: string;
}

export function roleArgs(kitchenId: string): RoleArgs {
  return { p_workspace_id: kitchenId };
}

/**
 * The three roles of `0001`'s `workspace_role`, most authority first. At a kitchen only two are
 * given: `owner` (*Dueña*) and `staff` (*Ayudante*); `manager` is left free for a third (G18).
 */
export const ROLES = ['owner', 'manager', 'staff'] as const;

export type Rol = (typeof ROLES)[number];

/** The one role whose doors are the owner's: her page, her settings, her features, her people. */
export const DUENA = 'owner';

/**
 * Her role as the function answers it. `null` — no active membership — is an answer, not an
 * absence: she is out. ⚠️ A ROLE THIS BUILD DOES NOT KNOW IS READ AS THE LEAST (`staff`): a role
 * added after this build (G18's third) then draws a helper's screens, never an owner's — the
 * database is the fence either way, and a door shown that refuses is the worse mistake.
 */
export function rolFrom(data: unknown): Rol | null {
  if (data === null || data === undefined) return null;
  if (typeof data !== 'string') return 'staff';
  return (ROLES as readonly string[]).includes(data) ? (data as Rol) : 'staff';
}

/** The query key her role caches under; the login and the kitchen are appended (`rolKey`). Kept on the phone. */
export const ROL_KEY = ['cocina', 'rol'] as const;

export function rolKey(userId: string | null, kitchenId: string | null): readonly unknown[] {
  return [...ROL_KEY, userId ?? '', kitchenId ?? ''];
}

/**
 * Whether the owner's own parts are drawn. ⚠️ `undefined` (not read yet) AND `null` (out) ARE
 * NOT THE OWNER: what is hers fades in when the answer comes, and is never shown to a helper
 * and then taken away. An owner's phone opened with no signal before this read was ever kept
 * waits for the signal — once.
 */
export function esDuena(rol: Rol | null | undefined): boolean {
  return rol === DUENA;
}

/** Which *Mi cocina* she is shown: the owner's, a helper's, or a wheel while her role is unknown. */
export type MiCocina = 'duena' | 'ayudante' | 'leyendo';

export function miCocinaPara(rol: Rol | null | undefined): MiCocina {
  if (rol === undefined || rol === null) return 'leyendo';
  return rol === DUENA ? 'duena' : 'ayudante';
}

// ----------------------------------------------------------------------------
// 2. *Quién trabaja aquí* — the owner's list, and *Quitar a …*
// ----------------------------------------------------------------------------

/** The memberships' table (`0001`). */
export const MEMBERS_TABLE = 'workspace_member';

/** What the list reads of each membership. Named, never `*`. */
export const MEMBER_COLUMNS = 'user_id,role,display_name';

/** The filter: THIS kitchen's memberships… */
export const MEMBER_KITCHEN_COLUMN = 'workspace_id';

/** …that are active. ⚠️ The policy does NOT drop an ended membership: the read must. */
export const MEMBER_ACTIVE_COLUMN = 'is_active';

/** Whose membership — the row *Quitar* ends. */
export const MEMBER_USER_COLUMN = 'user_id';

/** ⚠️ *Quitar* never ends an owner's membership: this column, `neq` the owner, is in its filter. */
export const MEMBER_ROLE_COLUMN = 'role';

/** A membership as PostgREST sends it. `display_name` is nullable on purpose (`0034`). */
export interface MemberRow {
  readonly user_id: string;
  readonly role: string;
  readonly display_name: string | null;
}

/** The query key the list caches under; the login and the kitchen are appended (`equipoKey`). Not kept on the phone. */
export const EQUIPO_KEY = ['cocina', 'equipo'] as const;

export function equipoKey(userId: string | null, kitchenId: string | null): readonly unknown[] {
  return [...EQUIPO_KEY, userId ?? '', kitchenId ?? ''];
}

/** One person on the list. */
export interface Persona {
  readonly userId: string;
  /** Her name, or `null` — then her role says who she is. */
  readonly nombre: string | null;
  readonly rol: Rol;
  /** The owner reading the list. */
  readonly esElla: boolean;
  /** *Quitar a …* is offered: someone else, and not an owner. */
  readonly quitable: boolean;
}

/**
 * The list: the owner reading it first, then by authority, then by name. ⚠️ A BLANK NAME IS NO
 * NAME (`0034`'s check, Wera's `nonBlank`), so a row never draws a gap.
 */
export function equipoDe(rows: readonly MemberRow[] | null | undefined, selfUserId: string | null): Persona[] {
  if (rows === null || rows === undefined) return [];
  const personas = rows.map((row): Persona => {
    const rol = rolFrom(row.role) ?? 'staff';
    const nombre = row.display_name === null ? null : row.display_name.trim().replace(/\s+/g, ' ') || null;
    const esElla = row.user_id === selfUserId;
    return { userId: row.user_id, nombre, rol, esElla, quitable: !esElla && rol !== DUENA };
  });
  return personas.sort((a, b) => {
    if (a.esElla !== b.esElla) return a.esElla ? -1 : 1;
    const porRol = ROLES.indexOf(a.rol) - ROLES.indexOf(b.rol);
    if (porRol !== 0) return porRol;
    return (a.nombre ?? '').localeCompare(b.nombre ?? '');
  });
}

/** How a row says who she is: her name, else her role's word. */
export function nombreDePersona(persona: Persona): string {
  return persona.nombre ?? ES.equipo.roles[persona.rol];
}

/** The line under it: her role, and *tú* on the owner's own row. */
export function detalleDePersona(persona: Persona): string {
  const rol = ES.equipo.roles[persona.rol];
  return persona.esElla ? ES.equipo.tu(rol) : rol;
}

/** What *Quitar a …* sends: her membership ended. `true` again is *Deshacer*. */
export function activoPatch(activo: boolean): { readonly [MEMBER_ACTIVE_COLUMN]: boolean } {
  return { [MEMBER_ACTIVE_COLUMN]: activo };
}

/** Which membership *Quitar* and its *Deshacer* touch. */
export interface Quitar {
  readonly kitchenId: string;
  readonly userId: string;
}

/** The list with one person gone, drawn at once while the database answers. */
export function sinPersona(rows: readonly MemberRow[] | undefined, userId: string): MemberRow[] | undefined {
  return rows?.filter((row) => row.user_id !== userId);
}

/**
 * A refused or failed *Quitar*, in words. ⚠️ `PGRST116` — the update found no row it may change —
 * is said as itself: she is no longer the owner, or the person is an owner, or already gone.
 */
export function quitarErrorMessage(thrown: unknown): string {
  return codeOf(thrown) === 'PGRST116' ? ES.equipo.noSePudoQuitar : apiErrorMessage(thrown);
}

// ----------------------------------------------------------------------------
// 3. *Salir de esta cocina* — `leave_kitchen` (`0082`)
// ----------------------------------------------------------------------------

/** `0082`'s function: a helper ends her own membership of a kitchen. */
export const LEAVE_KITCHEN = 'leave_kitchen';

/** Its argument, by the name PostgREST matches on. */
export interface LeaveArgs {
  readonly p_workspace_id: string;
}

export function leaveArgs(kitchenId: string): LeaveArgs {
  return { p_workspace_id: kitchenId };
}

/** `0082`'s refusal: an owner does not leave her kitchen — she deletes it (*Eliminar esta cocina*). */
export const OWNER_STAYS_CODE = 'TD025';

/** A refused or failed *Salir*, in words. */
export function salirErrorMessage(thrown: unknown): string {
  return codeOf(thrown) === OWNER_STAYS_CODE ? ES.ayudante.duenaNoSale : apiErrorMessage(thrown);
}

function codeOf(thrown: unknown): unknown {
  return typeof thrown === 'object' && thrown !== null ? (thrown as { code?: unknown }).code : undefined;
}
