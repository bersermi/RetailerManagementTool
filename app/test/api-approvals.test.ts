import { describe, expect, it } from 'vitest';

import {
  PENDING_ACCESS_REQUESTS,
  PENDING_REQUESTS_KEY,
  canApprove,
  linesOf,
  pendingFrom,
  pendingRequestsArgs,
  type PendingRequestRow,
} from '@/api/approvals';
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
