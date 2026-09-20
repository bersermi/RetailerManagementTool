import { describe, expect, it } from 'vitest';

import {
  APPROVE_REQUEST,
  BAD_LOCATION,
  PENDING_ACCESS_REQUESTS,
  PENDING_REQUESTS_KEY,
  REQUEST_GONE,
  approveArgs,
  approveErrorMessage,
  approvedFrom,
  canApprove,
  checkApproval,
  choiceOf,
  isRequestGone,
  linesOf,
  pendingFrom,
  pendingRequestsArgs,
  type PendingRequest,
  type PendingRequestRow,
} from '@/api/approvals';
import { ES } from '@/strings';
import { INVITES_KEY, MEMBERS_KEY, ROLES } from '@/api/members';
import { MY_WORKSPACES_KEY } from '@/api/workspace';

// ============================================================================
// WHO IS WAITING TO BE LET IN. Plan task `5b-iii-d-1`.
//
// ⚠️⚠️ WHAT THIS SUITE IS FOR AND WHAT IT CANNOT DO, STATED TOGETHER — the
// sentence every sibling module's suite opens with. Every assertion below pins
// either a STRING this app sends to PostgREST or a DECISION about what it does
// with what came back. It can prove the app is consistent with itself.
//
// IT CANNOT PROVE `0037` AGREES. No line of TypeScript has ever read
// `pending_access_requests`, and PostgREST matches an RPC BY ITS PARAMETER
// NAMES — so a `p_` name that drifts is a 404 the typecheck, this suite and the
// bundler all pass straight over, reaching an owner as a bell that is never
// there. THAT is `docs/checks/5b-iii-d-1-approvals-contract.sh`, and it also
// asserts the two things only a live database can answer: that a non-owner
// really does read ZERO ROWS rather than being refused, and that the newest-first
// order `pendingFrom` trusts is still promised.
//
// ⚠️⚠️ WHAT IT CAN DO THAT NO SUITE IN THIS REPOSITORY COULD BEFORE: PIN A
// RULING ABOUT A SCREEN. §2.11 keeps rendering out of scope, which is why the
// plan says in several places that an owner's decision about what a screen draws
// has nowhere to live but a paragraph. The ruling of 2026-09-19 — *"Show the
// Email as a Header and the Name as a subtitle of the request"* — is in
// `linesOf`, a pure function, so the `describe` block at the bottom is a real
// instrument over it rather than a comment claiming diligence.
// ============================================================================

/** One row as `0037` sends it, with only the interesting field varied. */
function row(over: Partial<Record<keyof PendingRequestRow, unknown>> = {}): PendingRequestRow {
  return {
    request_id: '11111111-1111-1111-1111-111111111111',
    email: 'juan@example.com',
    requester_name: 'Juan Pérez',
    role: 'staff',
    requested_at: '2026-09-19T18:00:00Z',
    expires_at: '2026-09-26T18:00:00Z',
    ...over,
  };
}

describe('the contract this app sends', () => {
  it('names the RPC exactly once, where the wrapper can read it', () => {
    expect(PENDING_ACCESS_REQUESTS).toBe('pending_access_requests');
  });

  it("sends `0037`'s argument name and nothing else", () => {
    const args = pendingRequestsArgs('ws-1');
    expect(Object.keys(args)).toEqual(['p_workspace_id']);
    expect(args.p_workspace_id).toBe('ws-1');
  });

  // ⚠️ ONE KEY PER FENCE. `INVITES_KEY` is the roster's manager-and-above select
  // over the same table; this is an owner-fenced definer read that also carries a
  // name off `auth.users`. Sharing a key would serve one caller's rows out of a
  // cache the other caller filled under a different predicate.
  it('caches under a key of its own, not the roster’s', () => {
    expect(PENDING_REQUESTS_KEY).not.toEqual(INVITES_KEY);
    expect(PENDING_REQUESTS_KEY).not.toEqual(MEMBERS_KEY);
    expect(PENDING_REQUESTS_KEY).not.toEqual(MY_WORKSPACES_KEY);
  });

  // ⚠️ AND IT IS SCOPED UNDER `workspace`, so one sweep of that prefix reaches it.
  it('sits under the workspace prefix the other three share', () => {
    expect(PENDING_REQUESTS_KEY[0]).toBe('workspace');
  });
});

describe('who may open the queue at all', () => {
  // ⚠️⚠️ THE FENCE IS THE TASK. `0037` answers a manager with an EMPTY LIST
  // rather than refusing (its decision 2), so nothing downstream can tell "not
  // yours" from "nobody is waiting" — this function is the only thing that can,
  // and it has to be asked before the call.
  it('is the owner and nobody else', () => {
    expect(canApprove('owner')).toBe(true);
    expect(canApprove('manager')).toBe(false);
    expect(canApprove('staff')).toBe(false);
  });

  // ⚠️ `null` IS "NOT KNOWN", NOT "NO AUTHORITY" — `roleOf`'s distinction. The
  // bell is absent while the membership read is out and appears when it lands,
  // which is a control that fades in rather than one snatched away.
  it('says no while the role is still unknown', () => {
    expect(canApprove(null)).toBe(false);
  });

  // ⚠️ IT IS TIGHTER THAN THE ROSTER'S FENCE ON PURPOSE, matching
  // `approve_request` (`0029` decision 6): a manager cannot approve, so a queue
  // she cannot act on is a list of strangers' names for no purpose.
  it('admits strictly fewer people than the roster does', () => {
    const approvers = ROLES.filter(canApprove);
    expect(approvers).toEqual(['owner']);
  });
});

describe('the queue, parsed', () => {
  it('is empty while the read has not come back, and that is not a failure', () => {
    expect(pendingFrom(undefined)).toEqual([]);
  });

  it('carries the five things the screen renders', () => {
    const [entry] = pendingFrom([row()]);
    expect(entry).toEqual({
      requestId: '11111111-1111-1111-1111-111111111111',
      email: 'juan@example.com',
      name: 'Juan Pérez',
      role: 'staff',
      requestedAt: '2026-09-19T18:00:00Z',
    });
  });

  // ⚠️ `0034` ADMITS AN ACCOUNT WHOSE PROVIDER SENT NO NAME and `auth_full_name`
  // returns NULL — never `''` — for it (`0037` decision 4). The entry is then an
  // address with nothing under it, and the screen is what omits the line.
  it('keeps the entry when there is no name, because the address is the header', () => {
    const [entry] = pendingFrom([row({ requester_name: null })]);
    expect(entry.email).toBe('juan@example.com');
    expect(entry.name).toBeNull();
  });

  // ⚠️ ONE NORMALISATION RULE, SHARED WITH THE ROSTER RATHER THAN COPIED —
  // `nonBlank`'s own comment: two rules for one column is how the blank gets in
  // by the door the CHECK is not watching.
  it('treats a blank name as no name', () => {
    expect(pendingFrom([row({ requester_name: '   ' })])[0].name).toBeNull();
  });

  // ⚠️ THE EMAIL IS REQUIRED BECAUSE IT IS THE HEADER. An entry with a blank one
  // is a row an approver cannot match against the person standing in front of
  // her, which is the whole job of this screen.
  it('drops a row with no address to be headed by', () => {
    expect(pendingFrom([row({ email: null })])).toEqual([]);
    expect(pendingFrom([row({ email: '  ' })])).toEqual([]);
  });

  it('drops a row whose role is not one of the three', () => {
    expect(pendingFrom([row({ role: 'superuser' })])).toEqual([]);
  });

  it('drops a row with no id, since nothing could ever act on it', () => {
    expect(pendingFrom([row({ request_id: null })])).toEqual([]);
  });

  // ⚠️⚠️ IT DROPS AND DOES NOT THROW, WHICH IS THE OPPOSITE OF `outcomeFrom` AND
  // THE DIFFERENCE IS WHICH WAY THE DAMAGE RUNS. This parses a READ of a list: an
  // unreadable row costs one entry, and a throw costs the whole queue — including
  // the people whose rows were fine.
  it('keeps the readable rows when one of them is not', () => {
    const entries = pendingFrom([row({ role: 'nonsense' }), row({ request_id: 'ok-2' })]);
    expect(entries.map((e) => e.requestId)).toEqual(['ok-2']);
  });

  // ⚠️ THE ORDER IS `0037`'S PROMISE, NOT THIS APP'S SORT. `requested_at` is a
  // string here and the pilot store's phone clock is not the database's, so
  // re-sorting at the client is the clock disagreement `0027` already refuses.
  it('preserves the order the function returned', () => {
    const entries = pendingFrom([
      row({ request_id: 'newest', requested_at: '2026-09-19T18:00:00Z' }),
      row({ request_id: 'oldest', requested_at: '2026-09-14T08:00:00Z' }),
    ]);
    expect(entries.map((e) => e.requestId)).toEqual(['newest', 'oldest']);
  });

  // ⚠️ AN UNREADABLE TIMESTAMP COSTS THE WAITING LINE AND NOT THE ENTRY —
  // `formatWaiting` returns null for `''` and the screen omits the line.
  it('keeps an entry whose timestamp it cannot read', () => {
    const [entry] = pendingFrom([row({ requested_at: 42 })]);
    expect(entry.email).toBe('juan@example.com');
    expect(entry.requestedAt).toBe('');
  });
});

// ============================================================================
// ⚠️⚠️ THE OWNER'S RULING OF 2026-09-19, AS AN ASSERTION RATHER THAN A PARAGRAPH.
// *"Show the Email as a Header and the Name as a subtitle of the request."*
// ============================================================================
describe('the two lines of an entry', () => {
  it('puts the EMAIL in the header and the NAME beneath it', () => {
    const [entry] = pendingFrom([row()]);
    expect(linesOf(entry)).toEqual({ header: 'juan@example.com', subtitle: 'Juan Pérez' });
  });

  // ⚠️ THE INVERSE OF THE ROSTER, AND SPELLED OUT SO A SWAP IS A RED TEST. On the
  // roster the name is the title; here you are matching a stranger against an
  // address somebody read out to you, so the address is what is being verified.
  it('never puts the name on top, which is the roster’s order and not this one', () => {
    const [entry] = pendingFrom([row()]);
    expect(linesOf(entry).header).not.toBe(entry.name);
    expect(linesOf(entry).header).toBe(entry.email);
  });

  // ⚠️ NO PLACEHOLDER AND NO EXPLANATION. A missing name is the identity ladder's
  // own floor; it is ours to absorb, never hers to read.
  it('has no subtitle at all when there is no name', () => {
    const [entry] = pendingFrom([row({ requester_name: null })]);
    expect(linesOf(entry)).toEqual({ header: 'juan@example.com', subtitle: null });
  });
});

// ============================================================================
// THE ACT. Plan task `5b-iii-d-2`.
//
// ⚠️⚠️ THE `describe` BLOCK BELOW CALLED `D8` IS THE ONLY INSTRUMENT IN THIS
// REPOSITORY THAT CAN SEE THE PICKER'S REFUSAL AT ALL, and it can see it only
// because the refusal was written as a pure function instead of as an
// `if` inside JSX. §2.11 keeps rendering out of scope; the sizing of
// `5b-iii-d` says in its own words that a session shipping this control
// alongside a badge and a list would have *"nothing able to go red"*. That is
// the whole reason this half got its own sitting, so these assertions are the
// deliverable and not a formality.
//
// ⚠️ WHAT IT STILL CANNOT DO: prove the SCREEN asks `checkApproval` before it
// calls, or that `0029` refuses the same set. The first is the owner's phone
// (`R9`); the second is `docs/checks/5b-iii-d-2-approve-contract.sh`, which
// drives the real RPC with the same drafts over real HTTP.
// ============================================================================

/** One entry, as the queue hands it to the row's controls. */
function entry(over: Partial<PendingRequest> = {}): PendingRequest {
  return {
    requestId: '22222222-2222-2222-2222-222222222222',
    email: 'juan@example.com',
    name: 'Juan Pérez',
    role: 'staff',
    requestedAt: '2026-09-20T18:00:00Z',
    ...over,
  };
}

const CENTRO = '33333333-3333-3333-3333-333333333333';
const SUR = '44444444-4444-4444-4444-444444444444';

describe('the act this app sends', () => {
  it('names the RPC exactly once, where the wrapper can read it', () => {
    expect(APPROVE_REQUEST).toBe('approve_request');
  });

  it("sends `0029`'s two argument names and nothing else", () => {
    const args = approveArgs({ entry: entry(), locationIds: [CENTRO] });
    expect(Object.keys(args).sort()).toEqual(['p_location_ids', 'p_request_id']);
    expect(args.p_request_id).toBe('22222222-2222-2222-2222-222222222222');
    expect(args.p_location_ids).toEqual([CENTRO]);
  });

  it('deduplicates the stores, because member_location’s PK would refuse the copy', () => {
    const args = approveArgs({ entry: entry(), locationIds: [CENTRO, SUR, CENTRO] });
    expect(args.p_location_ids).toEqual([CENTRO, SUR]);
  });

  // ⚠️ `0029:434`: a manager or owner is granted every location BY ROLE, and a
  // `member_location` row would outlive a demotion. Sending one would be this
  // app asking for something the database discards.
  it('sends [] for a manager whatever was ticked', () => {
    const args = approveArgs({ entry: entry({ role: 'manager' }), locationIds: [CENTRO, SUR] });
    expect(args.p_location_ids).toEqual([]);
  });

  it('reads the role off the ENTRY and not off a constant', () => {
    expect(choiceOf({ entry: entry({ role: 'manager' }), locationIds: [CENTRO] })).toEqual({
      role: 'manager',
      locationIds: [CENTRO],
    });
  });
});

// ============================================================================
// ⚠️⚠️ `D8` — THE FENCE THAT REFUSES TO BE EMPTY.
// ============================================================================

describe('D8: a staff member is never approved into nowhere', () => {
  it('refuses a staff approval with nothing ticked, in a shop with a choice', () => {
    expect(checkApproval({ entry: entry(), locationIds: [] }, { locationCount: 2 })).toBe(
      'locationMissing',
    );
  });

  it('refuses one whose ticks all collapse to nothing', () => {
    // An empty string is not a store; `dedupe` keeps it, so this asserts the
    // count and not the shape — the server is what rejects the id itself.
    expect(checkApproval({ entry: entry(), locationIds: [] }, { locationCount: 5 })).toBe(
      'locationMissing',
    );
  });

  it('accepts a staff approval with one ticked', () => {
    expect(checkApproval({ entry: entry(), locationIds: [CENTRO] }, { locationCount: 2 })).toBe(
      null,
    );
  });

  // ⚠️ C1.5 AND THE OWNER'S STANDING TIE-BREAK. Both pilot shops have exactly
  // one store, so the picker is never drawn and `resolveLocations` fills it in
  // — a staff approval with nothing ticked is only an ERROR in a shop that had
  // a choice to make. Without this case the fence would refuse every approval
  // in both shops the app is actually for.
  it('does not refuse in a one-store shop, where nothing was asked', () => {
    expect(checkApproval({ entry: entry(), locationIds: [CENTRO] }, { locationCount: 1 })).toBe(
      null,
    );
  });

  it('says the shop has no stores when it has none, rather than blaming the tick', () => {
    expect(checkApproval({ entry: entry(), locationIds: [] }, { locationCount: 0 })).toBe(
      'noLocations',
    );
  });

  // ⚠️ THE FENCE IS ON THE ROW'S ROLE. `0029:434` discards a manager's
  // locations, so asking her for one would be a question with no consequence.
  it('never asks a manager or an owner for a store', () => {
    for (const role of ['owner', 'manager'] as const) {
      expect(checkApproval({ entry: entry({ role }), locationIds: [] }, { locationCount: 2 })).toBe(
        null,
      );
    }
  });

  // ⚠️⚠️ THE KEYS ARE THE SCREEN'S, AND THIS IS WHAT TIES THEM TOGETHER. A key
  // with no sentence is a blank line where a refusal should be, and TypeScript
  // alone would not catch a sentence deleted from `ES.approvals.issues` if the
  // predicate stopped returning it on the same day.
  it('every issue it can return has a Spanish sentence', () => {
    for (const key of ['locationMissing', 'noLocations'] as const) {
      expect(ES.approvals.issues[key]).toBeTypeOf('string');
      expect(ES.approvals.issues[key].length).toBeGreaterThan(0);
    }
  });
});

// ============================================================================
// WHAT CAME BACK.
// ============================================================================

describe('what approve_request answered', () => {
  const approved = {
    status: 'approved',
    workspace_id: 'ws-1',
    workspace_name: 'La Tiendita',
    request_id: '22222222-2222-2222-2222-222222222222',
    member_id: '55555555-5555-5555-5555-555555555555',
    role: 'staff',
    location_count: 1,
    already_approved: false,
  };

  it('reads the approval it was handed', () => {
    expect(approvedFrom(approved)).toEqual({
      requestId: '22222222-2222-2222-2222-222222222222',
      memberId: '55555555-5555-5555-5555-555555555555',
      role: 'staff',
      locationCount: 1,
      alreadyApproved: false,
    });
  });

  // ⚠️⚠️ THE ORDINARY CASE ON A BAD CONNECTION, AND IT IS A SUCCESS. `0029:381`
  // answers a second tap with the membership rather than raising, and that
  // branch carries NO `location_count` at all — so a hook that treated a
  // missing count as unknown would put a hedge on the screen for the case the
  // pilot store hits most.
  it('treats already_approved as the success it is, with no count', () => {
    const second = {
      status: 'already_approved',
      workspace_id: 'ws-1',
      request_id: '22222222-2222-2222-2222-222222222222',
      member_id: '55555555-5555-5555-5555-555555555555',
      role: 'staff',
      already_approved: true,
    };
    expect(approvedFrom(second)).toEqual({
      requestId: '22222222-2222-2222-2222-222222222222',
      memberId: '55555555-5555-5555-5555-555555555555',
      role: 'staff',
      locationCount: 0,
      alreadyApproved: true,
    });
  });

  it('a missing already_approved is false and never unknown', () => {
    const { already_approved: _dropped, ...rest } = approved;
    expect(approvedFrom(rest).alreadyApproved).toBe(false);
  });

  it('a member_id it cannot read is null rather than an empty string', () => {
    expect(approvedFrom({ ...approved, member_id: null }).memberId).toBe(null);
    expect(approvedFrom({ ...approved, member_id: '' }).memberId).toBe(null);
  });

  // ⚠️ IT THROWS, WHICH IS THE OPPOSITE OF `pendingFrom` IN THE SAME FILE.
  // That parses a READ of a list, where an unreadable row costs one entry;
  // this parses a WRITE that has already happened. ⚠️ And the throw is safe to
  // retry precisely because `already_approved` exists.
  it('throws rather than inventing an outcome it could not read', () => {
    expect(() => approvedFrom(null)).toThrow(/approve_request/);
    expect(() => approvedFrom('ok')).toThrow(/approve_request/);
    expect(() => approvedFrom({ ...approved, request_id: '' })).toThrow(/request_id/);
    expect(() => approvedFrom({ ...approved, role: 'jefe' })).toThrow(/jefe/);
  });

  it('accepts every role the schema has', () => {
    for (const role of ROLES) {
      expect(approvedFrom({ ...approved, role }).role).toBe(role);
    }
  });
});

// ============================================================================
// WHAT SHE IS TOLD WHEN IT REFUSES.
// ============================================================================

describe('the three refusals', () => {
  // ⚠️ ONE SENTENCE FOR BOTH HALVES OF TD003 — expired (`0029:401`) and
  // superseded (`0029:396`). One act for the shopkeeper: ask her again.
  it('TD003 is the request being gone, however it went', () => {
    expect(isRequestGone({ code: REQUEST_GONE })).toBe(true);
    expect(approveErrorMessage({ code: REQUEST_GONE })).toBe(ES.approvals.errors.gone);
  });

  it('22023 names the store and not the tick', () => {
    expect(approveErrorMessage({ code: BAD_LOCATION })).toBe(ES.approvals.errors.location);
  });

  // ⚠️⚠️ THIS IS THE ASSERTION THAT SAYS THE `42501` OVERLOAD PARKED IN THE
  // DECISIONS BLOCK DID NOT ACQUIRE A SECOND GUESSING CLIENT. `0029` raises
  // `42501` for a request that is not the caller's to approve AND for a caller
  // with no session — but the first is unreachable here, because `0037` hands a
  // non-owner an empty list and `canApprove` never opens the queue for one. So
  // the app-wide sentence is the correct one on this screen rather than a
  // guess, and this module deliberately does NOT map the code itself.
  it('leaves 42501 to the app-wide sentence, because here it really is the session', () => {
    expect(approveErrorMessage({ code: '42501' })).toBe(ES.api.errors.sessionEnded);
  });

  // ⚠️ OFFLINE IS THE NORMAL WRITE PATH IN THE PILOT STORE, not the edge case.
  it('still gives the offline sentence every other screen gives', () => {
    expect(approveErrorMessage({ name: 'AuthRetryableFetchError' })).toBe(ES.api.errors.offline);
    expect(approveErrorMessage({ message: 'Network request failed' })).toBe(ES.api.errors.offline);
  });

  it('falls to the honest catch-all for something it has never seen', () => {
    expect(approveErrorMessage({ code: 'XX000' })).toBe(ES.api.errors.unknown);
    expect(approveErrorMessage(undefined)).toBe(ES.api.errors.unknown);
  });
});

// ============================================================================
// THE HALF-LOOP SENTENCE IS GONE.
// ============================================================================

// ⚠️⚠️ AN ASSERTION ABOUT AN ABSENCE, AND IT IS HERE BECAUSE THE SENTENCE'S OWN
// COMMENT PROMISED THIS TASK WOULD DELETE IT. `ES.approvals.notYet` told an
// owner *"por ahora solo puedes ver quién está esperando"* — true on
// 2026-09-20 and a lie the moment the button shipped. A string nobody renders
// is invisible to the typecheck, to the bundler and to every other assertion
// in this file, so the only thing that can notice it survived is a test that
// looks for it.
describe('the scaffolding this task removed', () => {
  it('no longer tells the owner he can only look', () => {
    expect('notYet' in ES.approvals).toBe(false);
  });
});
