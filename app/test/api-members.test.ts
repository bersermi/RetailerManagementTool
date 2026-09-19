import { describe, expect, it } from 'vitest';

import {
  INVITE_COLUMNS,
  INVITES_KEY,
  MEMBERS_KEY,
  MEMBER_COLUMNS,
  ROLES,
  canSeeRoster,
  groupedCode,
  isRole,
  roleOf,
  rosterFrom,
  shareText,
  type InviteRow,
  type MemberRow,
} from '@/api/members';
import { ES } from '@/strings';

// ============================================================================
// WHO IS IN THE SHOP. Plan task 5b-ii-a.
//
// ⚠️⚠️ WHAT THIS SUITE IS FOR AND WHAT IT CANNOT DO, STATED TOGETHER because
// the second half is the more important one — the same sentence
// `api-workspace.test.ts` opens with, and for the same reason. Every assertion
// below pins either a STRING this app sends to PostgREST or a DECISION about
// what the sheet renders. It can prove the app is consistent with itself.
//
// IT CANNOT PROVE THE DATABASE AGREES. Nothing in TypeScript has read `0001` or
// `0002`: rename a column here and every line below still passes while the real
// read comes back `400 — column workspace_member.rol does not exist` on a phone
// in a shop. THAT is `docs/checks/5b-ii-a-roster-contract.sh`, which posts these
// exact column lists to a reset database over HTTP, with two real people in two
// real roles, and reads what comes back.
//
// ⚠️ AND IT CANNOT SEE THE SHEET. §2.11 refuses suites over rendering, so that
// `ajustes.tsx` asks `canSeeRoster` before it draws the section — rather than
// drawing it and hiding it — is the owner's own phone (`R9`).
// ============================================================================

const OWNER = '11111111-1111-4111-8111-111111111111';
const MANAGER = '22222222-2222-4222-8222-222222222222';
const STAFF = '33333333-3333-4333-8333-333333333333';

// ⚠️ `display_name` DEFAULTS TO NULL SO THAT EVERY ASSERTION WRITTEN BEFORE
// `0034` STILL MEANS WHAT IT MEANT. The email and role rungs are not legacy —
// the column is nullable by design — so the fixtures that reach them have to go
// on reaching them, and a default of `null` is what stops a later edit quietly
// promoting them all to `name`.
function member(
  user_id: string,
  role: string,
  is_active = true,
  display_name: string | null = null,
): MemberRow {
  return { user_id, role, is_active, display_name };
}

function invite(email: string, accepted_by: string | null): InviteRow {
  return { email, accepted_by };
}

// The shop the pilot actually has (C11.1): two people, the founding owner and a
// family member who is a manager (C11.2).
const SHOP: MemberRow[] = [member(OWNER, 'owner'), member(MANAGER, 'manager')];
// ⚠️ ONE INVITE, NOT TWO. The founding owner's membership was written by
// `onboard_workspace`; no invite precedes it, which is `T2`.
const INVITES: InviteRow[] = [invite('encargada@example.com', MANAGER)];

// ⚠️ THE SAME SHOP AFTER `5b.8-i`. Both memberships were written by a function
// that copies `raw_user_meta_data ->> 'full_name'`, so both carry a name — and
// the manager carries an EMAIL as well, which is the whole point of the pair:
// it is the only fixture where the ladder has to choose.
const NAMED_SHOP: MemberRow[] = [
  member(OWNER, 'owner', true, 'Bernardo Serafín'),
  member(MANAGER, 'manager', true, 'Lupita Hernández'),
];

describe('the two column lists', () => {
  // ⚠️ THESE ARE THE STRINGS THE CONTRACT CHECK POSTS. A rename on either side
  // of the wire is a 400 that the typecheck, the bundler and this file all pass
  // over — the assertion is that they are written ONCE, here, not that they are
  // right. See the header.
  it('names its columns and never asks for a star', () => {
    expect(MEMBER_COLUMNS).toBe('user_id,role,is_active,display_name');
    expect(INVITE_COLUMNS).toBe('email,accepted_by');
    expect(MEMBER_COLUMNS).not.toContain('*');
    expect(INVITE_COLUMNS).not.toContain('*');
  });

  it('reads is_active, because the policy does not filter it', () => {
    // `workspace_member_select` is `workspace_id in (select my_workspaces())`
    // and nothing else (`0001:524`), so a membership that ended still comes
    // back. Dropping this column is how a person let go in March stays on the
    // roster for ever.
    expect(MEMBER_COLUMNS.split(',')).toContain('is_active');
  });

  it('reads display_name, which is what 0034 added the column for', () => {
    // ⚠️ THE COLUMN EXISTED FOR A WHOLE TASK WITHOUT REACHING A PHONE. `0034`'s
    // own closing section says so in as many words — "NOTHING READS THE COLUMN"
    // — and this line is what ended that. Drop it and `rosterFrom`'s `name` rung
    // is unreachable in production while every assertion below goes on passing,
    // because they hand it rows this app would never receive.
    expect(MEMBER_COLUMNS.split(',')).toContain('display_name');
  });

  it('asks workspace_member for the name and never auth.users', () => {
    // §2.7: `auth.users` is never exposed to a client. The name is on the
    // membership BECAUSE of that, so a read that went anywhere else for it would
    // be a read this app cannot make.
    expect(MEMBER_COLUMNS).not.toContain('raw_user_meta_data');
    expect(MEMBER_COLUMNS).not.toContain('auth');
  });

  it('never asks for the token hash', () => {
    // ⚠️ THE POLICY WOULD HAND IT OVER. `workspace_invite_select` is
    // `has_role(workspace_id, 'manager')` — a manager may read the whole row,
    // hash included. A column this app never asks for is a column that never
    // reaches a phone, and this is the one where that distinction is a secret.
    expect(INVITE_COLUMNS).not.toContain('token');
  });

  it('caches the two reads under different keys', () => {
    expect(MEMBERS_KEY).not.toEqual(INVITES_KEY);
  });
});

describe('the roles, and who may see the list of people', () => {
  it('is the enum 0001 declares, most authority first', () => {
    expect(ROLES).toEqual(['owner', 'manager', 'staff']);
  });

  it('recognises only the three', () => {
    expect(isRole('owner')).toBe(true);
    expect(isRole('manager')).toBe(true);
    expect(isRole('staff')).toBe(true);
    expect(isRole('admin')).toBe(false);
    expect(isRole(null)).toBe(false);
    expect(isRole(7)).toBe(false);
  });

  // ⚠️⚠️ THE OWNER'S RULING OF 2026-09-18 — "manager-and-above is right" — and
  // it lives in a function so that it is here rather than in a screen.
  it('shows the roster to a manager and above, and to nobody else', () => {
    expect(canSeeRoster('owner')).toBe(true);
    expect(canSeeRoster('manager')).toBe(true);
    expect(canSeeRoster('staff')).toBe(false);
  });

  it('shows it to nobody while the role is still unknown', () => {
    // `null` is "the read has not come back", not "no authority". A section that
    // appeared and was then taken away from someone who was never allowed it is
    // worse than a section that arrives late.
    expect(canSeeRoster(null)).toBe(false);
  });

  it('reads the caller own role out of the rows they just read', () => {
    expect(roleOf(SHOP, OWNER)).toBe('owner');
    expect(roleOf(SHOP, MANAGER)).toBe('manager');
  });

  it('knows nothing before the read lands, and nothing about a stranger', () => {
    expect(roleOf(undefined, OWNER)).toBeNull();
    expect(roleOf(SHOP, null)).toBeNull();
    expect(roleOf(SHOP, STAFF)).toBeNull();
  });

  it('gives a deactivated caller no role at all', () => {
    // Being on the table is not being in the shop. The fence has to agree with
    // the roster about that or a former manager keeps the section.
    expect(roleOf([member(OWNER, 'owner', false)], OWNER)).toBeNull();
  });
});

describe('the join, which PostgREST cannot do', () => {
  it('labels the caller Tu and nobody else', () => {
    const rows = rosterFrom({ members: SHOP, invites: INVITES, selfUserId: OWNER });
    expect(rows[0].isSelf).toBe(true);
    expect(rows[0].identity).toEqual({ kind: 'self', text: ES.members.you });
    expect(rows.filter((row) => row.identity.kind === 'self')).toHaveLength(1);
  });

  // ⚠️⚠️ THE FOURTH RUNG, AND THE RULING IT SUPERSEDES. The owner ruled on
  // 2026-09-14 that a member row is identified by EMAIL and by no name, BECAUSE
  // no table in this schema carried one (`T1`). `5b.7` and `0034` ended that,
  // and he ruled again on 2026-09-18. These are the assertions that make the
  // second ruling true of something a person can see.
  it('names a member by the name on their membership', () => {
    const rows = rosterFrom({ members: NAMED_SHOP, invites: INVITES, selfUserId: OWNER });
    const other = rows.find((row) => row.userId === MANAGER);
    expect(other?.identity).toEqual({ kind: 'name', text: 'Lupita Hernández' });
  });

  it('prefers the name over the email it could have recovered', () => {
    // The manager has BOTH: a membership written by `redeem_invite` with her
    // name on it, and the invite she redeemed carrying her address. The ladder
    // has to choose, and a name is what a person calls a colleague.
    const rows = rosterFrom({ members: NAMED_SHOP, invites: INVITES, selfUserId: OWNER });
    const other = rows.find((row) => row.userId === MANAGER);
    expect(other?.identity.text).not.toBe('encargada@example.com');
  });

  it('labels the caller Tu even when the caller has a name of their own', () => {
    // `self` is the top rung and stays there. A person does not need to be told
    // their own name on a list they are reading.
    const rows = rosterFrom({ members: NAMED_SHOP, invites: INVITES, selfUserId: OWNER });
    expect(rows[0].identity).toEqual({ kind: 'self', text: ES.members.you });
  });

  it('names the founding owner, who has no invite to recover anything from', () => {
    // ⚠️ T2 WITH A NAME ON IT. `onboard_workspace` writes the founder's
    // membership and no invite precedes it, so before `0034` the manager of a
    // two-person shop looked at a row that said `Dueño`. It says who he is now.
    const rows = rosterFrom({ members: NAMED_SHOP, invites: INVITES, selfUserId: MANAGER });
    const founder = rows.find((row) => row.userId === OWNER);
    expect(founder?.identity).toEqual({ kind: 'name', text: 'Bernardo Serafín' });
  });

  it('identifies everyone for a caller who cannot read a single invite', () => {
    // ⚠️⚠️ THE MEASURED CHANGE, AND IT IS THE SENTENCE THE MODULE HEADER USED TO
    // END ON. `workspace_invite_select` is manager-and-above (`0002:563`), so a
    // staff caller reads `[]` invites — and used to get a list of role labels.
    // The name is on `workspace_member`, which any member may read, so the same
    // caller now reads every colleague by name. Section 7 of
    // `supabase/tests/0034_member_display_name.sql` measured it in the database;
    // this is the same fact on the side of the wire that renders it.
    const rows = rosterFrom({ members: NAMED_SHOP, invites: [], selfUserId: MANAGER });
    expect(rows.map((row) => row.identity.kind)).toEqual(['self', 'name']);
  });

  it('treats a blank name as no name and falls to the rung below', () => {
    // ⚠️ `0034` MAKES `''` UNREACHABLE FROM THE DATABASE — the column carries
    // `check (display_name is null or btrim(display_name) <> '')` — so this
    // guards the other ways in: a cache written by an older build, or a later
    // migration that relaxes the constraint. A rung that renders an empty string
    // swallows the three below it and leaves a gap where a person should be.
    const rows = rosterFrom({
      members: [member(OWNER, 'owner'), member(MANAGER, 'manager', true, '   ')],
      invites: INVITES,
      selfUserId: OWNER,
    });
    const other = rows.find((row) => row.userId === MANAGER);
    expect(other?.identity).toEqual({ kind: 'email', text: 'encargada@example.com' });
  });

  it('trims a name rather than rendering its whitespace', () => {
    const rows = rosterFrom({
      members: [member(OWNER, 'owner'), member(MANAGER, 'manager', true, '  Lupita  ')],
      invites: [],
      selfUserId: OWNER,
    });
    expect(rows.find((row) => row.userId === MANAGER)?.identity.text).toBe('Lupita');
  });

  it('recovers an email from the invite that person redeemed', () => {
    const rows = rosterFrom({ members: SHOP, invites: INVITES, selfUserId: OWNER });
    const other = rows.find((row) => row.userId === MANAGER);
    expect(other?.identity).toEqual({ kind: 'email', text: 'encargada@example.com' });
  });

  // ⚠️⚠️ T2, AND IT IS REACHED IN THE PILOT ON DAY ONE. The manager opens
  // Ajustes and looks at the owner, whose membership `onboard_workspace` wrote
  // and no invite precedes. The row falls back to what that person IS.
  it('names by role the one member no invite ever created', () => {
    const rows = rosterFrom({ members: SHOP, invites: INVITES, selfUserId: MANAGER });
    const founder = rows.find((row) => row.userId === OWNER);
    expect(founder?.identity).toEqual({ kind: 'role', text: ES.members.roles.owner });
  });

  it('drops a membership that has ended', () => {
    const rows = rosterFrom({
      members: [...SHOP, member(STAFF, 'staff', false)],
      invites: [...INVITES, invite('sefue@example.com', STAFF)],
      selfUserId: OWNER,
    });
    expect(rows.map((row) => row.userId)).not.toContain(STAFF);
  });

  it('does not count an invite nobody has redeemed as a person', () => {
    // `accepted_by` is null until redemption. Whether a pending invite should be
    // LISTED is 5b-ii-b's question; it must not become a member here.
    const rows = rosterFrom({
      members: SHOP,
      invites: [...INVITES, invite('todavia@example.com', null)],
      selfUserId: OWNER,
    });
    expect(rows).toHaveLength(2);
    expect(rows.map((row) => row.identity.text)).not.toContain('todavia@example.com');
  });

  it('survives a role the app has never heard of', () => {
    // A fourth value added to the enum by a later migration must not put an
    // unrenderable row on the screen of someone who has not updated.
    const rows = rosterFrom({
      members: [...SHOP, member(STAFF, 'auditor')],
      invites: INVITES,
      selfUserId: OWNER,
    });
    expect(rows.map((row) => row.userId)).not.toContain(STAFF);
  });

  // ⚠️ THE STAFF CASE, AND THE POINT IS THAT IT IS NOT AN ERROR. `[]` is what a
  // policy that hides rows returns. The screen must not reach here at all — that
  // is `canSeeRoster` — and if it does, it gets a list of role labels rather
  // than a list of blanks.
  it('identifies nobody but the caller when the invites cannot be read', () => {
    const rows = rosterFrom({ members: SHOP, invites: [], selfUserId: MANAGER });
    expect(rows.map((row) => row.identity.kind)).toEqual(['self', 'role']);
  });

  it('is empty, not broken, before the member read lands', () => {
    expect(rosterFrom({ members: undefined, invites: undefined, selfUserId: OWNER })).toEqual([]);
    expect(rosterFrom({ members: null, invites: INVITES, selfUserId: OWNER })).toEqual([]);
  });

  it('puts the caller first and then the most authority', () => {
    const rows = rosterFrom({
      members: [member(STAFF, 'staff'), ...SHOP],
      invites: [...INVITES, invite('mostrador@example.com', STAFF)],
      selfUserId: STAFF,
    });
    expect(rows.map((row) => row.role)).toEqual(['staff', 'owner', 'manager']);
  });

  it('sorts two colleagues of one role by the name on the screen', () => {
    // The comparator's last key is `identity.text`, and after `0034` that text
    // is a name for almost every row. Two managers sort the way a person reading
    // the list would expect them to, rather than by a `user_id` nobody sees.
    const rows = rosterFrom({
      members: [
        member(OWNER, 'owner', true, 'Bernardo Serafín'),
        member(STAFF, 'manager', true, 'Zulema Ríos'),
        member(MANAGER, 'manager', true, 'Ana Beltrán'),
      ],
      invites: [],
      selfUserId: OWNER,
    });
    expect(rows.map((row) => row.identity.text)).toEqual([ES.members.you, 'Ana Beltrán', 'Zulema Ríos']);
  });

  it('does not reshuffle the rest of the list when the caller changes', () => {
    // Two callers, one shop: everybody but the caller keeps their order.
    const byOwner = rosterFrom({ members: SHOP, invites: INVITES, selfUserId: OWNER });
    const byManager = rosterFrom({ members: SHOP, invites: INVITES, selfUserId: MANAGER });
    expect(byOwner.filter((r) => !r.isSelf).map((r) => r.userId)).toEqual([MANAGER]);
    expect(byManager.filter((r) => !r.isSelf).map((r) => r.userId)).toEqual([OWNER]);
  });
});

describe('the code, as a person reads it aloud', () => {
  it('breaks eight characters into two groups of four', () => {
    expect(groupedCode('NFFABMNA')).toBe('NFFA BMNA');
  });

  it('leaves anything that is not a code alone', () => {
    // The column is `check (code ~ '^[0-9ABCDEFGHJKMNPQRSTVWXYZ]{8}$')`, so the
    // only way to arrive here with something else is a read that has not
    // happened. A space in the middle of a placeholder helps nobody.
    expect(groupedCode('')).toBe('');
    expect(groupedCode('NFFA')).toBe('NFFA');
  });

  it('is a rendering and never a value 0027 has to undo', () => {
    // `normalize_workspace_code` strips exactly this grouping on the way back
    // in, which is what makes showing it safe.
    expect(groupedCode('NFFABMNA').replace(/[^0-9A-Z]/g, '')).toBe('NFFABMNA');
  });
});

describe('what goes to WhatsApp (C11.7)', () => {
  it('carries the code and the shop it belongs to', () => {
    const message = shareText('Abarrotes La Probe', 'NFFABMNA');
    expect(message).toContain('NFFA BMNA');
    expect(message).toContain('Abarrotes La Probe');
  });

  it('is the one sentence, written in src/strings.ts', () => {
    // R4: every word a shopkeeper reads is in one file. This asserts the
    // function is that file's, not a sentence assembled at the call site.
    expect(shareText('X', 'ABCDEFGH')).toBe(ES.members.shareMessage('X', 'ABCD EFGH'));
  });
});
