// ============================================================================
// WHO IS IN THE SHOP, AS A CONTRACT WITH POSTGRES. Plan task 5b-ii-a, and the
// second module of `src/api/` — same boundary as `workspace.ts` (ADR-035
// §2.11, `R12`, `R13`): everything with a right answer is in here, and nothing
// that talks.
//
// ⚠️⚠️ THERE ARE TWO READS AND THE JOIN IS DONE HERE, IN TYPESCRIPT, BECAUSE
// POSTGREST CANNOT DO IT AT ALL. The instinct is
// `select=*,workspace_invite(email)`. There is NO FOREIGN KEY between
// `workspace_member` and `workspace_invite` — `workspace_invite.accepted_by`
// and `workspace_member.user_id` both reference `auth.users`, which §2.7 never
// exposes to a client — so PostgREST has no relationship to embed and answers
// `PGRST200`. Two selects, joined on `accepted_by = user_id` by `rosterFrom`
// below, which is why the roster is a data-layer problem and not a list
// component.
//
// ⚠️⚠️ AND THE TWO READS ARE NOT OPEN TO THE SAME PEOPLE, WHICH IS THE WHOLE
// SHAPE OF THIS SCREEN. Measured against the applied schema, not recalled:
//
//     workspace_member_select   any active member of the workspace   0001:524
//     workspace_invite_select   has_role(workspace_id, 'manager')    0002:563
//
// `0002`'s own comment says why — *"the row carries an email address and a
// token hash, and staff have no reason to enumerate either."* So a staff caller
// reads the roster and can identify NOBODY on it: not an error, not an empty
// list, but a list of rows with nothing in them. ⚠️ THE OWNER RULED ON
// 2026-09-18 — *"manager-and-above is right"* — so the sheet does not render
// the section at all below `manager`. `canSeeRoster` is that ruling, and it is
// a function rather than a line in a screen so that the suite can read it.
//
// ⚠️ NOTHING HERE WRITES A MEMBERSHIP. That is the seam `5b-ii` was split on
// and `docs/checks/5b-ii-split-coverage.sh` asserts it of the plan row; this
// file is where it is true of the code. `create_invite` and `redeem_invite` are
// `5b-ii-b`'s, and they arrive as a second module beside this one.
// ============================================================================

import { ES } from '@/strings';

/**
 * The columns a client may ask `workspace_member` for.
 *
 * ⚠️ NAMED AND NEVER `*` (`R13`). `is_active` is in the list because the policy
 * does NOT filter on it — `workspace_member_select` is
 * `workspace_id in (select public.my_workspaces())` and nothing more, so a
 * deactivated member comes back like anybody else and the roster would show a
 * person who was let go in March. The filtering is `rosterFrom`'s, below.
 */
export const MEMBER_COLUMNS = 'user_id,role,is_active';

/**
 * The columns a client may ask `workspace_invite` for. ⚠️ `token_hash` IS NOT
 * AMONG THEM AND MUST NEVER BE: the policy would hand it over to a manager, and
 * a column this app never asks for is a column that never reaches a phone.
 * `accepted_by` is here to be joined on, and for no other reason.
 */
export const INVITE_COLUMNS = 'email,accepted_by';

/** The query key the roster's member read caches under. */
export const MEMBERS_KEY = ['workspace', 'members'] as const;

/** The query key the roster's invite read caches under. */
export const INVITES_KEY = ['workspace', 'invites'] as const;

/**
 * The three roles, as `0001`'s `workspace_role` enum declares them, ordered
 * from most authority to least.
 *
 * ⚠️ THE ORDER IS LOAD-BEARING TWICE: it is how `canSeeRoster` says
 * "manager-and-above" without naming two roles, and it is the roster's sort.
 * A fourth role added to the enum lands here once.
 */
export const ROLES = ['owner', 'manager', 'staff'] as const;

export type Role = (typeof ROLES)[number];

/** Is this whatever Postgres sent us actually one of the three roles? */
export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && (ROLES as readonly string[]).includes(value);
}

/** A `workspace_member` row as PostgREST sends it — snake_case, because Postgres is. */
export interface MemberRow {
  readonly user_id: string;
  readonly role: string;
  readonly is_active: boolean;
}

/** A `workspace_invite` row as PostgREST sends it. `accepted_by` is null while pending. */
export interface InviteRow {
  readonly email: string;
  readonly accepted_by: string | null;
}

/**
 * ⚠️⚠️ WHO MAY SEE THE LIST OF PEOPLE — RULED BY THE OWNER, 2026-09-18:
 * *"manager-and-above is right."*
 *
 * A staff caller can read `workspace_member` and cannot read `workspace_invite`,
 * so the list they would get is one row per colleague with no identity on any of
 * them. That is the app showing a shopkeeper an internal state, which the
 * owner's own rule refuses — and it is the client disagreeing with a policy it
 * cannot win against. They are shown the shop and their own settings instead.
 *
 * ⚠️ IT IS THE INDEX INTO `ROLES` AND NOT `role !== 'staff'`, so that a fourth
 * role inserted below `manager` is fenced out by adding it to that table rather
 * than by remembering this line exists.
 */
export function canSeeRoster(role: Role | null): boolean {
  if (role === null) return false;
  return ROLES.indexOf(role) <= ROLES.indexOf('manager');
}

/**
 * The caller's own role in this shop, or `null` while the read has not come
 * back — or if the caller is somehow not in the list they just read.
 *
 * ⚠️ `null` IS "NOT KNOWN", NOT "NO AUTHORITY", and it is the same distinction
 * `Membership`'s `unknown` draws one table over. `canSeeRoster(null)` is false,
 * so the section is absent while the answer is outstanding and appears when it
 * arrives — which is a section that fades in, never a section that is shown and
 * then snatched away from someone who was not allowed it.
 */
export function roleOf(rows: readonly MemberRow[] | null | undefined, userId: string | null): Role | null {
  if (rows === null || rows === undefined || userId === null) return null;
  const mine = rows.find((row) => row.user_id === userId && row.is_active);
  return mine !== undefined && isRole(mine.role) ? mine.role : null;
}

/**
 * How one row on the roster says who it is.
 *
 * ⚠️⚠️ THREE KINDS, AND THE THIRD IS THE ONE A PILOT MEETS ON DAY ONE. The
 * owner's ruling of 2026-09-14 is *"identified by EMAIL, with the caller's own
 * row labelled Tú and no name anywhere"* — no table in this schema carries a
 * human name (`T1`), and no migration is added to invent one. But an email is
 * recovered from the INVITE that person redeemed, and **the founding owner has
 * no invite row** (`T2`): his membership was written by `onboard_workspace`,
 * which no invite precedes. So the manager of a two-person shop opens Ajustes
 * and looks at a row for the owner that has nothing in it.
 *
 * `role` is that case: the row says what the person IS, in Spanish, because the
 * one member who can reach it is by construction the shop's owner.
 */
export type IdentityKind = 'self' | 'email' | 'role';

export interface Identity {
  readonly kind: IdentityKind;
  readonly text: string;
}

/** One line of the roster. Everything the sheet renders, and nothing else. */
export interface RosterEntry {
  readonly userId: string;
  readonly role: Role;
  readonly isSelf: boolean;
  readonly identity: Identity;
}

/**
 * The roster: two reads and a join, as one list.
 *
 * ⚠️ INACTIVE MEMBERS ARE DROPPED HERE BECAUSE THE POLICY DOES NOT DROP THEM.
 * See `MEMBER_COLUMNS`. Deactivation is how this schema ends a membership —
 * there is a `workspace_member_delete` policy and nothing in the product calls
 * it — so `is_active` is the difference between "who is in the shop" and "who
 * has ever been in the shop".
 *
 * ⚠️ AND A PENDING INVITE IS NOT A MEMBER. `accepted_by` is null until
 * redemption, so those rows join to nobody and appear nowhere. Whether the
 * sheet should list people who have been invited and have not arrived is
 * `5b-ii-b`'s question — it is the task that creates one.
 *
 * ⚠️ THE ORDER IS THE CALLER FIRST, THEN BY AUTHORITY, THEN BY TEXT. A person
 * looking for themselves finds their row without reading, and the rest of the
 * list does not reshuffle when somebody's email is recovered — two ordinary
 * screens' worth of confusion avoided by a comparator the suite can read.
 */
export function rosterFrom({
  members,
  invites,
  selfUserId,
}: {
  readonly members: readonly MemberRow[] | null | undefined;
  readonly invites: readonly InviteRow[] | null | undefined;
  readonly selfUserId: string | null;
}): RosterEntry[] {
  if (members === null || members === undefined) return [];

  const emailByUser = new Map<string, string>();
  for (const invite of invites ?? []) {
    if (invite.accepted_by !== null && invite.email !== '') {
      emailByUser.set(invite.accepted_by, invite.email);
    }
  }

  const entries: RosterEntry[] = [];
  for (const row of members) {
    if (!row.is_active || !isRole(row.role)) continue;
    const isSelf = row.user_id === selfUserId;
    const email = emailByUser.get(row.user_id);
    const identity: Identity = isSelf
      ? { kind: 'self', text: ES.members.you }
      : email !== undefined
        ? { kind: 'email', text: email }
        : { kind: 'role', text: ES.members.roles[row.role] };
    entries.push({ userId: row.user_id, role: row.role, isSelf, identity });
  }

  return entries.sort(compareEntries);
}

/** The caller first, then by authority, then by what the row says. */
function compareEntries(a: RosterEntry, b: RosterEntry): number {
  if (a.isSelf !== b.isSelf) return a.isSelf ? -1 : 1;
  const byRole = ROLES.indexOf(a.role) - ROLES.indexOf(b.role);
  if (byRole !== 0) return byRole;
  return a.identity.text.localeCompare(b.identity.text);
}

/**
 * The code, in the two groups of four a person reads aloud over WhatsApp
 * (C11.6, C11.7).
 *
 * ⚠️ IT IS A RENDERING AND NEVER A VALUE. `normalize_workspace_code` (`0027`)
 * strips exactly this grouping on the way back in — *"a code read aloud gets
 * written down"* — so the space is safe to show and would be a corruption to
 * store or to send anywhere. What `shareText` hands to WhatsApp below is the
 * grouped form too, because the person receiving it is going to type it.
 *
 * ⚠️ ANYTHING THAT IS NOT EIGHT CHARACTERS IS RETURNED UNTOUCHED. The column is
 * `check (code ~ '^[0-9ABCDEFGHJKMNPQRSTVWXYZ]{8}$')`, so the only way to get
 * here with something else is a read that has not arrived; splitting it anyway
 * would put a space in the middle of whatever placeholder a screen passed.
 */
export function groupedCode(code: string): string {
  return code.length === 8 ? `${code.slice(0, 4)} ${code.slice(4)}` : code;
}

/**
 * The sentence that goes to WhatsApp (C11.7).
 *
 * ⚠️ IT NAMES THE SHOP, AND THAT IS THE POINT OF SENDING IT. `4.6a-iii`'s
 * decision 3 made `request_access` return the workspace's NAME for the same
 * reason: *"without it a joiner cannot tell they have joined the wrong shop, and
 * that is a mistake nobody discovers until they are looking at somebody else's
 * takings."* A code with no shop attached is eight characters in a chat window
 * three weeks later.
 *
 * ⚠️ NO LINK, AND THAT IS A DECISION, NOT AN OMISSION. A deep link would need a
 * published app and a domain neither of which exists; C11.6 says the joiner
 * TYPES the code, and `5b-iii` builds the screen where they type it.
 */
export function shareText(shopName: string, code: string): string {
  return ES.members.shareMessage(shopName, groupedCode(code));
}
