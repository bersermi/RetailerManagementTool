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
// token hash, and staff have no reason to enumerate either."*
//
// ⚠️⚠️ AND WHAT A STAFF CALLER GETS CHANGED UNDER THIS FILE ON 2026-09-18. This
// header used to end *"so a staff caller reads the roster and can identify
// NOBODY on it: not an error, not an empty list, but a list of rows with
// nothing in them."* `0034` added `workspace_member.display_name`, and
// `MEMBER_COLUMNS` below now asks for it, so that sentence is **false of this
// module from the commit that added the column to the read** — a staff caller
// reads every colleague's NAME. Section 7 of `supabase/tests/0034_member_
// display_name.sql` measured it under `set role authenticated`: a cashier reads
// every name in her own shop, the owner's among them, and zero rows from
// another shop.
//
// ⚠️ THE OWNER RULED ON IT THE SAME DAY — *"leave it."* Postgres has no
// column-level RLS; the three fences available are a column `GRANT` (which
// §2.7 argues against by name — `supabase gen types` still emits the column, so
// a staff read compiles clean and fails at runtime in front of a customer), a
// second view, or narrowing `workspace_member_select`, which is the read behind
// every member's own role lookup and `rosterFrom`'s join. **The boundary that
// carries the weight is the tenant one, and it holds.**
//
// ⚠️ THE FENCE ON THE SHEET IS A DIFFERENT ARGUMENT AND SURVIVES INTACT: the
// owner ruled on 2026-09-18 that the roster is *"manager-and-above"*, so the
// sheet does not render the section at all below `manager`. `canSeeRoster` is
// that ruling, and it is a function rather than a line in a screen so that the
// suite can read it. ⚠️ Its measurement moved, though — it was ruled because a
// staff caller could identify nobody, and that is no longer why. It stands on
// the invite asymmetry alone: `workspace_invite` carries an address and a token
// hash, and staff have no reason to enumerate either.
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
 *
 * ⚠️⚠️ `display_name` IS THE COLUMN `0034` ADDED AND THIS IS THE READ THAT
 * MAKES IT REACH A PHONE. It is the PERSON's name and never the shop's —
 * `workspace.display_name` is a different column on a different table, and the
 * two sit three lines apart inside `onboard_workspace`. ⚠️ It is NULLABLE by
 * design: an account whose metadata carried no name is still admitted, which is
 * why `rosterFrom`'s ladder keeps every rung below this one.
 */
export const MEMBER_COLUMNS = 'user_id,role,is_active,display_name';

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

/**
 * A `workspace_member` row as PostgREST sends it — snake_case, because Postgres
 * is.
 *
 * ⚠️ `display_name` IS `string | null` AND THE NULL IS NOT AN ERROR STATE. The
 * column is nullable on purpose (`0034`) and carries a not-blank CHECK, so the
 * only two things that arrive here are a real name and nothing at all. A `''`
 * would render as a gap on the roster where a null falls through to the rung
 * below; the database is what makes that unreachable, not this type.
 */
export interface MemberRow {
  readonly user_id: string;
  readonly role: string;
  readonly is_active: boolean;
  readonly display_name: string | null;
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
 * ⚠️⚠️ THE ARGUMENT THAT PRODUCED THIS RULING IS NO LONGER THE ARGUMENT THAT
 * HOLDS IT UP, AND SAYING SO IS THE POINT OF THIS PARAGRAPH. It was ruled
 * because a staff caller could read `workspace_member` and not
 * `workspace_invite`, so the list they would get was one row per colleague with
 * no identity on any of them — the app showing a shopkeeper an internal state,
 * which the owner's own rule refuses. `0034` and `MEMBER_COLUMNS` ended that:
 * every row now carries a name, and a staff roster would be perfectly legible.
 *
 * ⚠️ THE FENCE STAYS, ON THE HALF OF THE ASYMMETRY THAT DID NOT MOVE. The list
 * of people is also a list of pending invitations and of who invited whom —
 * `workspace_invite` is manager-and-above by `0002:563`, whose own comment says
 * *"staff have no reason to enumerate either"* — and `5b-ii-b` put the invite
 * button on this sheet. A roster a cashier can open is a roster with a control
 * she may not use on it. They are shown the shop and their own settings instead.
 *
 * ⚠️ WHAT WOULD MAKE THIS WRONG is a later migration loosening
 * `workspace_invite_select`, and nothing in TypeScript can see that. Assertion 5
 * of `docs/checks/5b-ii-a-roster-contract.sh` is where it is measured.
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
 * The caller's OWN stored name in this shop, or `null` when there is none —
 * which is the state `5b.8-iii-b` exists to let a person out of. Plan task
 * `5b.8-iii-b`.
 *
 * ⚠️ IT IS `roleOf`'S SHAPE ON PURPOSE, DOWN TO THE `is_active` FILTER. Both
 * answer "what does my own row say", off the read every member already makes —
 * so they agree about which row is mine, and a fifth column read off that row
 * later lands beside these two rather than inventing a third finder.
 *
 * ⚠️⚠️ AND IT INHERITS `roleOf`'S ONE LIMITATION, NAMED HERE RATHER THAN LEFT TO
 * BE FOUND. `MEMBER_COLUMNS` does not read `workspace_id`, so neither function
 * can tell one shop's membership from another's — in a person with two shops
 * this returns whichever row PostgREST listed first. That is pre-existing and
 * wider than this function: `rosterFrom` would already mix two shops' people
 * into one list. Every real user has exactly one shop (`0001:317`), and the
 * repair is one column added to `MEMBER_COLUMNS` plus a filter here, not a
 * migration.
 *
 * ⚠️ A BLANK IS NO NAME, which is `nonBlank`'s rule and not a second one.
 */
export function nameOf(
  rows: readonly MemberRow[] | null | undefined,
  userId: string | null,
): string | null {
  if (rows === null || rows === undefined || userId === null) return null;
  const mine = rows.find((row) => row.user_id === userId && row.is_active);
  if (mine === undefined || mine.display_name === null) return null;
  return nonBlank(mine.display_name) ?? null;
}

/**
 * How one row on the roster says who it is.
 *
 * ⚠️⚠️ FOUR KINDS, AND THE 2026-09-14 RULING THAT SAID THERE WOULD BE THREE IS
 * SUPERSEDED HERE — BY THE SAME OWNER, ON 2026-09-18. That ruling was
 * *"identified by EMAIL, with the caller's own row labelled Tú and no name
 * anywhere"*, and its reason was `T1`: **no table in this schema carried a human
 * name**, and he declined the migration that would invent one. `5b.7` then put
 * the name a person types at sign-up into `raw_user_meta_data`, and `5b.8-i`
 * (`0034`) copied it onto the membership from all four writers. `T1` is dead,
 * so the ruling built on it is spent — **this is where it stops being true, on a
 * screen, rather than where the column landed.**
 *
 * THE LADDER, MOST SPECIFIC FIRST, AND EVERY RUNG BELOW THE FIRST IS STILL
 * REACHED IN A REAL SHOP:
 *
 *   `self`   the caller's own row — *Tú*, and it wins over a stored name
 *   `name`   `workspace_member.display_name`, what that person typed or what
 *            Google handed over
 *   `email`  recovered from the INVITE they redeemed, for a membership written
 *            before `0034` and never re-written, or an account whose metadata
 *            was empty
 *   `role`   what they ARE, in Spanish
 *
 * ⚠️⚠️ `email` AND `role` ARE NOT DEAD CODE AND MUST NOT BE COLLAPSED. `0034`'s
 * column is NULLABLE on purpose: an account with empty metadata is still
 * admitted, and the backfill wrote a name only where one could be found. ⚠️ AND
 * `role` IS STILL THE PILOT'S DAY-ONE CASE for a shop created before `5b.7` —
 * the founding owner has no invite row (`T2`), so with no name he has nothing
 * else left. It says what the person IS, in Spanish, and the one member who can
 * reach that case is by construction the shop's owner.
 */
export type IdentityKind = 'self' | 'name' | 'email' | 'role';

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
 *
 * ⚠️⚠️ THE NAME IS READ OFF THE MEMBERSHIP AND THE EMAIL OFF THE INVITE, AND
 * THAT IS WHY THE LADDER IS ORDERED THE WAY IT IS. `display_name` arrives on the
 * row this function is already iterating — every active member has one read, and
 * a staff caller who cannot read a single invite still gets a legible list. The
 * email needs the join, needs `workspace_invite`, and is `null` for the founding
 * owner by construction (`T2`). The more specific identity is also the one that
 * is more often there.
 *
 * ⚠️ A BLANK NAME IS TREATED AS NO NAME. `0034`'s CHECK makes `''` unreachable
 * from the database, so this guard is about the other way in — a row handed to
 * this function by a test, a cache written by an older build, or a column some
 * later migration relaxes. A rung that renders an empty string swallows the
 * three below it and puts a gap on the roster.
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
    const name = row.display_name === null ? undefined : nonBlank(row.display_name);
    const email = emailByUser.get(row.user_id);
    const identity: Identity = isSelf
      ? { kind: 'self', text: ES.members.you }
      : name !== undefined
        ? { kind: 'name', text: name }
        : email !== undefined
          ? { kind: 'email', text: email }
          : { kind: 'role', text: ES.members.roles[row.role] };
    entries.push({ userId: row.user_id, role: row.role, isSelf, identity });
  }

  return entries.sort(compareEntries);
}

/**
 * The name with its edges trimmed, or `undefined` when there is nothing left.
 *
 * ⚠️ `btrim(display_name) <> ''` IS THE CHECK `0034` WROTE, so this is the same
 * rule stated on the side of the wire that renders it. It is not a second
 * opinion about what the database allows — it is what keeps a row that got here
 * some other way from occupying a rung it cannot fill.
 *
 * ⚠️⚠️ AND IT IS EXPORTED AS OF `5b.8-iii-b`, WHICH IS THE WRITE SIDE BORROWING
 * THE READ SIDE'S RULE RATHER THAN RESTATING IT. `0035` normalises with
 * `nullif(btrim(coalesce(…, '')), '')` and its own comment says why one rule and
 * not two: *"two normalisation rules for one column is how the blank gets in by
 * the door the CHECK is not watching."* `@/api/displayName` is the only other
 * caller, and a second copy of this function is exactly the stale-duplicate
 * defect this repository has recorded seven times.
 */
export function nonBlank(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
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
