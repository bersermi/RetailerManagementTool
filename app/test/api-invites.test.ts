import { describe, expect, it } from 'vitest';

import {
  ALREADY_REQUESTED,
  CREATE_INVITE,
  INVITABLE_ROLES,
  LOCATIONS_KEY,
  LOCATION_COLUMNS,
  canInvite,
  checkInvite,
  createInviteArgs,
  groupedToken,
  inviteErrorMessage,
  inviteShareText,
  isAlreadyRequested,
  issuedFrom,
  locationsFrom,
  locationsRequired,
  resolveLocations,
  type InviteDraft,
  type LocationRow,
} from '@/api/invites';
import { ROLES } from '@/api/members';
import { ES } from '@/strings';

// ============================================================================
// ISSUING AN INVITE. Plan task 5b-ii-b-1.
//
// ⚠️⚠️ WHAT THIS SUITE IS FOR AND WHAT IT CANNOT DO, STATED TOGETHER — the
// sentence `api-members.test.ts` opens with, for the same reason. Every
// assertion below pins either a STRING this app sends to PostgREST or a
// DECISION about what the form does. It can prove the app is consistent with
// itself.
//
// IT CANNOT PROVE `0028` AGREES. Nothing in TypeScript has read that migration:
// rename an argument here and every line below still passes while the real call
// comes back `404 — Could not find the function public.create_invite(...)` on a
// phone in a shop. THAT is `docs/checks/5b-ii-b-1-invite-contract.sh`, which
// drives this app's own argument names against a reset database over HTTP.
//
// ⚠️ AND THE RULES IN `checkInvite` ARE COPIES OF `0028`'s. This suite pins the
// copies. That the copies still MATCH is the contract check's job, and it drives
// the real RPC with the same drafts to find out.
// ============================================================================

const staffDraft = (over: Partial<InviteDraft> = {}): InviteDraft => ({
  email: 'ana@example.com',
  role: 'staff',
  locationIds: ['loc-1'],
  ...over,
});

describe('the contract this app sends', () => {
  it('names the RPC once, and it is the one 0028 declares', () => {
    expect(CREATE_INVITE).toBe('create_invite');
  });

  it("asks location for named columns, never '*'", () => {
    expect(LOCATION_COLUMNS).toBe('id,name');
    expect(LOCATION_COLUMNS).not.toContain('*');
  });

  // ⚠️ THE MEASURED DIFFERENCE FROM `MEMBER_COLUMNS`, pinned so a later session
  // adding `is_active` here "for symmetry" has to delete this assertion and read
  // why. `my_locations()` (0001:332) filters `l.is_active` itself, so the column
  // would be `true` on every row this app can ever see.
  it('does NOT read is_active, because my_locations() already filtered it', () => {
    expect(LOCATION_COLUMNS).not.toContain('is_active');
  });

  it('sends the four p_ names 0028 declared, and no others', () => {
    const args = createInviteArgs('ws-1', staffDraft());
    expect(Object.keys(args).sort()).toEqual([
      'p_email',
      'p_location_ids',
      'p_role',
      'p_workspace_id',
    ]);
  });

  it('caches the location read under its own key', () => {
    expect(LOCATIONS_KEY).toEqual(['workspace', 'locations']);
  });
});

describe('createInviteArgs', () => {
  it('trims the address, because 0028 trims it too', () => {
    expect(createInviteArgs('ws-1', staffDraft({ email: '  ana@example.com ' })).p_email).toBe(
      'ana@example.com',
    );
  });

  // ⚠️ `0028`: "a manager or owner invite stores '{}' whatever was passed". Send
  // a location for a manager and the database silently discards it, which is a
  // disagreement nobody notices until they are reading two rows.
  it('sends no locations for a manager, whatever the form held', () => {
    const args = createInviteArgs('ws-1', staffDraft({ role: 'manager', locationIds: ['loc-1'] }));
    expect(args.p_location_ids).toEqual([]);
  });

  // ⚠️ `0028` deduplicates too, because member_location's PK would refuse the
  // second copy — an hour later, to somebody else, at redemption.
  it('deduplicates the locations, as 0028 does', () => {
    const args = createInviteArgs('ws-1', staffDraft({ locationIds: ['a', 'b', 'a'] }));
    expect(args.p_location_ids).toEqual(['a', 'b']);
  });

  it('passes the workspace id through rather than deriving it', () => {
    expect(createInviteArgs('ws-9', staffDraft()).p_workspace_id).toBe('ws-9');
  });
});

describe('who may issue an invite', () => {
  it('is manager and above, which is 0028s body predicate', () => {
    expect(canInvite('owner')).toBe(true);
    expect(canInvite('manager')).toBe(true);
    expect(canInvite('staff')).toBe(false);
  });

  // ⚠️ `null` IS "NOT KNOWN", NOT "NO AUTHORITY" — the distinction `roleOf`
  // draws one module over. The section is absent while the read is out and
  // appears when it lands, never shown and then snatched away.
  it('is false while the role is not known', () => {
    expect(canInvite(null)).toBe(false);
  });

  // ⚠️ THE DECISION: the schema keeps the capability and the screen does not
  // surface it. An owner MAY mint an owner under 0028; this app does not offer
  // it, because it is the one invite that hands the shop away by mistap.
  it('offers manager and staff, and never owner', () => {
    expect(INVITABLE_ROLES).toEqual(['manager', 'staff']);
    expect(INVITABLE_ROLES).not.toContain('owner');
  });

  it('offers only roles the enum actually has', () => {
    for (const role of INVITABLE_ROLES) expect(ROLES).toContain(role);
  });
});

describe('which invites need a location — 0028:291', () => {
  it('is staff, and only staff', () => {
    expect(locationsRequired('staff')).toBe(true);
    expect(locationsRequired('manager')).toBe(false);
    expect(locationsRequired('owner')).toBe(false);
  });

  // ⚠️ C1.5: both pilot shops have exactly one location. Nothing is asked, and
  // the single store is filled in — the owner's tie-break, the option that adds
  // no human step.
  it('fills in the only store rather than asking which', () => {
    const options = [{ id: 'loc-1', name: 'Principal' }];
    expect(resolveLocations(staffDraft({ locationIds: [] }), options)).toEqual(['loc-1']);
  });

  it('asks when there is a choice to make', () => {
    const options = [
      { id: 'loc-1', name: 'Centro' },
      { id: 'loc-2', name: 'Norte' },
    ];
    expect(resolveLocations(staffDraft({ locationIds: [] }), options)).toEqual([]);
    expect(resolveLocations(staffDraft({ locationIds: ['loc-2'] }), options)).toEqual(['loc-2']);
  });

  it('resolves to nothing for a manager, even in a one-store shop', () => {
    const options = [{ id: 'loc-1', name: 'Principal' }];
    expect(resolveLocations(staffDraft({ role: 'manager' }), options)).toEqual([]);
  });
});

describe('checkInvite — the copies of 0028s rules', () => {
  const one = { locationCount: 1 };

  it('accepts an ordinary staff invite', () => {
    expect(checkInvite(staffDraft(), one)).toBeNull();
  });

  it('refuses a blank address', () => {
    expect(checkInvite(staffDraft({ email: '   ' }), one)).toBe('emailMissing');
  });

  // ⚠️ `0028`'s shape and not a validator: one @ with something either side, no
  // spaces. Its own comment says anything stricter refuses real mailboxes.
  it.each([['ana'], ['ana@'], ['@example.com'], ['a b@example.com'], ['a@b@c']])(
    'refuses %s, which is not that shape',
    (bad) => {
      expect(checkInvite(staffDraft({ email: bad }), one)).toBe('emailShape');
    },
  );

  it.each([['a@b'], ['ana.maria@correo.com.mx'], ['ANA+uno@example.com']])(
    'accepts %s, which is',
    (good) => {
      expect(checkInvite(staffDraft({ email: good }), one)).toBeNull();
    },
  );

  it('refuses a staff invite with no store, when there was a choice', () => {
    expect(checkInvite(staffDraft({ locationIds: [] }), { locationCount: 2 })).toBe(
      'locationMissing',
    );
  });

  it('says so when the shop has no stores at all', () => {
    expect(checkInvite(staffDraft({ locationIds: [] }), { locationCount: 0 })).toBe('noLocations');
  });

  it('asks a manager invite for no store at all', () => {
    expect(
      checkInvite(staffDraft({ role: 'manager', locationIds: [] }), { locationCount: 3 }),
    ).toBeNull();
  });

  // ⚠️ THE ORDER IS THE FORM'S READING ORDER: the first refusal a person sees
  // names the topmost box that is wrong. `5b.7`'s decision 3, one screen over.
  it('reports the address before the store', () => {
    expect(checkInvite(staffDraft({ email: '', locationIds: [] }), { locationCount: 2 })).toBe(
      'emailMissing',
    );
  });

  it('has a sentence for every issue it can return', () => {
    for (const key of ['emailMissing', 'emailShape', 'locationMissing', 'noLocations'] as const) {
      expect(ES.invite.issues[key]).toBeTruthy();
    }
  });
});

describe('locationsFrom', () => {
  const rows: LocationRow[] = [
    { id: 'b', name: 'Norte' },
    { id: 'a', name: 'Centro' },
  ];

  it('sorts by name so the picker does not reshuffle between opens', () => {
    expect(locationsFrom(rows).map((o) => o.name)).toEqual(['Centro', 'Norte']);
  });

  it('is empty while the read has not come back', () => {
    expect(locationsFrom(undefined)).toEqual([]);
    expect(locationsFrom(null)).toEqual([]);
  });

  it('drops a row with a blank name rather than rendering an empty tap target', () => {
    expect(locationsFrom([...rows, { id: 'c', name: '  ' }])).toHaveLength(2);
  });
});

describe('issuedFrom — the result that exists once', () => {
  const answer = {
    invite_id: 'inv-1',
    workspace_id: 'ws-1',
    email: 'ana@example.com',
    role: 'staff',
    location_ids: ['loc-1'],
    expires_at: '2026-09-25T18:00:00+00:00',
    token: 'ABCD2345EFGH6789',
    replaced_pending: false,
    superseded_count: 0,
  };

  it('reads the token, the address, the role and the expiry', () => {
    const issued = issuedFrom(answer);
    expect(issued.token).toBe('ABCD2345EFGH6789');
    expect(issued.email).toBe('ana@example.com');
    expect(issued.role).toBe('staff');
    expect(issued.expiresAt).toBe('2026-09-25T18:00:00+00:00');
  });

  // ⚠️ `0028` DECISION 6: a live pending invite for the same address is REPLACED
  // and the old token stops working. It is the one thing on the card a
  // shopkeeper would call a bug, and `P3` is the finding that it was on no row.
  it('carries whether a live invite was just replaced', () => {
    expect(issuedFrom({ ...answer, replaced_pending: true }).replacedPending).toBe(true);
    expect(issuedFrom(answer).replacedPending).toBe(false);
  });

  it('treats an absent replaced_pending as false, never as unknown', () => {
    const { replaced_pending: _omitted, ...without } = answer;
    expect(issuedFrom(without).replacedPending).toBe(false);
  });

  // ⚠️ IT THROWS RATHER THAN RENDERING A GAP WHERE THE CODE GOES. A partial is
  // an invite that exists in the database and was lost on the way to the person
  // who needed it — and it cannot be re-read.
  it.each([
    ['null', null],
    ['a string', 'ABCD'],
    ['no token', { ...answer, token: undefined }],
    ['an empty token', { ...answer, token: '' }],
    ['no expiry', { ...answer, expires_at: undefined }],
    ['an unknown role', { ...answer, role: 'jefe' }],
  ])('throws on %s rather than returning a partial', (_label, bad) => {
    expect(() => issuedFrom(bad)).toThrow();
  });

  it('names the RPC in what it throws, so the console says which call', () => {
    expect(() => issuedFrom(null)).toThrow(/create_invite/);
  });
});

describe('groupedToken', () => {
  it('reads as four groups of four', () => {
    expect(groupedToken('ABCD2345EFGH6789')).toBe('ABCD 2345 EFGH 6789');
  });

  // ⚠️ IT IS A RENDERING AND NEVER A VALUE — `normalize_workspace_code`
  // (0027:175) strips every non-alphanumeric before hashing, so the spaces
  // cannot reach the hash and would be a corruption to store.
  it('leaves anything that is not sixteen characters alone', () => {
    expect(groupedToken('ABCD')).toBe('ABCD');
    expect(groupedToken('')).toBe('');
    expect(groupedToken('ABCD2345EFGH678')).toBe('ABCD2345EFGH678');
  });

  it('is what goes to WhatsApp, with the shop named beside it', () => {
    const text = inviteShareText('Abarrotes Lupita', 'ABCD2345EFGH6789');
    expect(text).toContain('ABCD 2345 EFGH 6789');
    expect(text).toContain('Abarrotes Lupita');
  });
});

describe('the refusal that has a next step, and it is a CODE now', () => {
  const alreadyRequested = {
    code: 'TD004',
    message: 'create_invite: ana@example.com has already requested access — approve the request instead',
  };

  it('recognises the refusal that has a next step', () => {
    expect(isAlreadyRequested(alreadyRequested)).toBe(true);
    expect(inviteErrorMessage(alreadyRequested)).toBe(ES.invite.alreadyRequested);
  });

  // ⚠️⚠️ THIS TEST REPLACES THE ONE THAT ASSERTED A MARKER, and the replacement
  // is not cosmetic. `0036` (task `5b-iii-a`) minted `TD004`, so this module
  // reads a SQLSTATE instead of a substring of the server's prose — which means
  // the refusal survives a reworded message, which the old arrangement did not.
  // The contract check that made the substring safe was retired in the same
  // pass: an assertion still standing over a rule that has been superseded is
  // red on a correct tree.
  it('reads the CODE, so a reworded message changes nothing', () => {
    expect(isAlreadyRequested({ code: 'TD004', message: 'reworded entirely' })).toBe(true);
    expect(isAlreadyRequested({ code: 'TD004' })).toBe(true);
  });

  // ⚠️ THE FOUR OTHER 22023s ARE NOT THIS ONE, and that is the whole reason the
  // code was minted. `checkInvite` catches all four on the phone; one arriving
  // here means something got past it, and it is not an approval.
  it('does not claim a 22023 is that one — not even carrying the old words', () => {
    expect(
      isAlreadyRequested({ code: '22023', message: 'a staff invite must name at least one location' }),
    ).toBe(false);
    expect(
      isAlreadyRequested({ code: '22023', message: 'ana has already requested access' }),
    ).toBe(false);
  });

  it('does not match the old prose under any other code', () => {
    expect(isAlreadyRequested({ code: '42501', message: 'already requested' })).toBe(false);
  });

  it.each([[null], [undefined], ['TD004'], [{}]])('is false for %s', (junk) => {
    expect(isAlreadyRequested(junk)).toBe(false);
  });

  // ⚠️ EVERYTHING ELSE STILL GETS THE SENTENCE EVERY OTHER SCREEN GIVES, which
  // is why `inviteErrorMessage` delegates rather than owning a second table.
  it('falls through to the shared sentences for everything else', () => {
    expect(inviteErrorMessage({ code: '42501' })).toBe(ES.api.errors.sessionEnded);
    expect(inviteErrorMessage({ message: 'Network request failed' })).toBe(ES.api.errors.offline);
    expect(inviteErrorMessage({ code: 'nope' })).toBe(ES.api.errors.unknown);
  });
});
