import { describe, expect, it } from 'vitest';

import {
  ACCESS_STATUSES,
  MY_ACCESS_REQUESTS,
  MY_REQUESTS_KEY,
  REQUEST_ACCESS,
  REQUEST_REFUSALS,
  REQUEST_STATES,
  isInsideShop,
  outcomeFrom,
  pendingRequest,
  requestAccessArgs,
  requestErrorMessage,
  requestsFrom,
  type AccessRequestRow,
} from '@/api/requests';
import { CODE_LENGTH, normalizeCredential } from '@/api/redeem';
import { INVITES_KEY, MEMBERS_KEY } from '@/api/members';
import { ES } from '@/strings';

// ============================================================================
// ASKING TO JOIN A SHOP. Plan task 5b-iii-b.
//
// ⚠️⚠️ WHAT THIS SUITE IS FOR AND WHAT IT CANNOT DO, STATED TOGETHER — the
// sentence every sibling module's suite opens with. Every assertion below pins
// either a STRING this app sends to PostgREST or a DECISION about what it does
// with what came back. It can prove the app is consistent with itself.
//
// IT CANNOT PROVE `0029` AGREES. No line of TypeScript has ever read
// `request_access`, and PostgREST matches an RPC BY ITS PARAMETER NAMES — so a
// `p_` name that drifts is a 404 the typecheck, this suite and the bundler all
// pass straight over, reaching a person as a button that does nothing on the one
// screen she has no way around. THAT is
// `docs/checks/5b-iii-b-request-contract.sh`.
//
// ⚠️⚠️ AND IT NO LONGER GAMBLES ON `42501`, WHICH IS WHAT `5b.9` CHANGED. This
// module used to read `42501` from `request_access` as the CODE while
// `@/api/errors` read the same `42501` app-wide as the SESSION, and only a live
// database could say whether the two were still indistinguishable. `0038` minted
// `TD006` for the code that resolves to no shop, so the guess is retired and the
// assertion below pins the OPPOSITE of what it used to: `42501` here is the
// session sentence, like everywhere else in this app. The contract check still
// drives both against a real database and now asserts they come back DIFFERENT.
// ============================================================================

describe('the contract this app sends', () => {
  it('names both RPCs exactly once, where the wrapper can read them', () => {
    expect(REQUEST_ACCESS).toBe('request_access');
    expect(MY_ACCESS_REQUESTS).toBe('my_access_requests');
  });

  it("sends `0029`'s argument name and nothing else", () => {
    const args = requestAccessArgs('ABCDEFGH');
    expect(Object.keys(args)).toEqual(['p_code']);
  });

  // ⚠️ THE STRING THAT WAS CLASSIFIED IS THE STRING THAT IS SENT, which is
  // `redeemArgs`'s rule through the same normaliser. The box carries whatever
  // grouping a person pasted out of WhatsApp.
  it('normalises on the way in, through the redeem module’s normaliser', () => {
    expect(requestAccessArgs('abcd-efgh').p_code).toBe('ABCDEFGH');
    expect(requestAccessArgs('abcd efgh').p_code).toBe(normalizeCredential('abcd efgh'));
    expect(requestAccessArgs('abcd efgh').p_code.length).toBe(CODE_LENGTH);
  });

  // ⚠️⚠️ ITS OWN KEY, NOT THE ROSTER'S. Both read `workspace_invite` rows; one
  // is a manager's read of a shop and this is a stranger's read of herself.
  // Sharing a key would have a joiner's invalidation blank an owner's roster.
  it('reads under a key of its own', () => {
    expect(MY_REQUESTS_KEY).not.toEqual(INVITES_KEY);
    expect(MY_REQUESTS_KEY).not.toEqual(MEMBERS_KEY);
  });
});

// ============================================================================
// WHAT `request_access` ANSWERED
// ============================================================================

const answer = (over: Record<string, unknown> = {}) => ({
  status: 'requested',
  workspace_id: 'ws-1',
  workspace_name: 'La Esquina',
  request_id: 'req-1',
  role: 'staff',
  expires_at: '2026-10-01T00:00:00Z',
  ...over,
});

describe('reading what request_access answered', () => {
  it('reads the ordinary ask', () => {
    const out = outcomeFrom(answer());
    expect(out.status).toBe('requested');
    expect(out.workspaceId).toBe('ws-1');
    expect(out.workspaceName).toBe('La Esquina');
    expect(out.isMember).toBe(false);
  });

  // ⚠️ `0029`'s DECISION 5, AND IT IS NOT AN ERROR. She tapped twice on a bad
  // connection, or asked again the next morning.
  it('a second ask is a success carrying her own live row', () => {
    expect(outcomeFrom(answer({ status: 'already_requested' })).isMember).toBe(false);
  });

  // ⚠️⚠️ `D7`: SHE WAS ALREADY INVITED AND TYPED THE SHOP CODE. `0029` absorbs
  // the invite and writes the membership then and there, so this is a JOIN.
  it('`joined` and `already_member` both put her inside the shop', () => {
    expect(outcomeFrom(answer({ status: 'joined' })).isMember).toBe(true);
    expect(outcomeFrom(answer({ status: 'already_member' })).isMember).toBe(true);
  });

  it('every status `0029` can answer is one this app reads', () => {
    for (const status of ACCESS_STATUSES) {
      expect(outcomeFrom(answer({ status })).status).toBe(status);
    }
    expect(ACCESS_STATUSES.filter(isInsideShop)).toEqual(['already_member', 'joined']);
  });

  // ⚠️⚠️ AN UNKNOWN STATUS THROWS RATHER THAN FALLING THROUGH TO `requested`. A
  // fifth branch added to `0029` would otherwise arrive as a person being told
  // she is waiting for something that did not happen.
  it('throws on a status it does not know', () => {
    expect(() => outcomeFrom(answer({ status: 'absorbed' }))).toThrow(/unknown status/);
    expect(() => outcomeFrom(answer({ status: undefined }))).toThrow(/unknown status/);
  });

  it('throws on an answer it cannot account for', () => {
    expect(() => outcomeFrom(null)).toThrow();
    expect(() => outcomeFrom('ok')).toThrow();
    expect(() => outcomeFrom(answer({ workspace_id: '' }))).toThrow(/workspace_id/);
  });

  // ⚠️ THE NAME IS ALLOWED TO BE MISSING AND THE IDENTITY IS NOT — `redeemedFrom`'s
  // rule. A blank name costs one word in one sentence; a missing id is an ask
  // this app cannot account for.
  it('tolerates a missing shop name and not a missing id', () => {
    expect(outcomeFrom(answer({ workspace_name: undefined })).workspaceName).toBe('');
  });
});

// ============================================================================
// THE ROW SHE CAN SEE — `S3`
// ============================================================================

const row = (over: Partial<Record<keyof AccessRequestRow, unknown>> = {}): AccessRequestRow =>
  ({
    request_id: 'req-1',
    workspace_id: 'ws-1',
    workspace_name: 'La Esquina',
    status: 'pending',
    role: 'staff',
    requested_at: '2026-09-19T10:00:00Z',
    decided_at: null,
    expires_at: '2026-10-01T00:00:00Z',
    ...over,
  }) as AccessRequestRow;

describe('reading her own requests', () => {
  it('reads a pending row', () => {
    const [only] = requestsFrom([row()]);
    expect(only.requestId).toBe('req-1');
    expect(only.state).toBe('pending');
    expect(only.role).toBe('staff');
    expect(only.workspaceName).toBe('La Esquina');
  });

  it('reads every state `0029` computes', () => {
    for (const status of REQUEST_STATES) {
      expect(requestsFrom([row({ status })])[0].state).toBe(status);
    }
  });

  // ⚠️ AN EMPTY LIST IS THE ORDINARY CASE, NOT A FAILURE: every founding owner
  // who lands on this screen has never asked anybody for anything.
  it('nothing asked and nothing read are both an empty list', () => {
    expect(requestsFrom([])).toEqual([]);
    expect(requestsFrom(undefined)).toEqual([]);
  });

  // ⚠️⚠️ IT DROPS WHAT IT CANNOT READ RATHER THAN THROWING, WHICH IS THE
  // OPPOSITE OF `outcomeFrom` AND THE DIFFERENCE IS WHICH WAY THE DAMAGE RUNS.
  // A throw here costs her the whole screen, including the box she would use to
  // ask again.
  it('drops an unreadable row and keeps the rest', () => {
    const kept = requestsFrom([
      row({ status: 'invented' }),
      row({ request_id: '' }),
      row({ role: 'superuser' }),
      row({ workspace_id: null }),
      row({ request_id: 'req-2' }),
    ]);
    expect(kept.map((r) => r.requestId)).toEqual(['req-2']);
  });
});

describe('the one request the landing renders', () => {
  // ⚠️⚠️ ONE, NOT A LIST. The landing is not a history — it is the answer to
  // "did my ask go through?", and it is only ever on screen for somebody who
  // belongs to no shop at all.
  it('takes the newest pending one, trusting `0029`’s ordering', () => {
    const found = pendingRequest(
      requestsFrom([
        row({ request_id: 'newest', status: 'pending' }),
        row({ request_id: 'older', status: 'pending' }),
      ]),
    );
    expect(found?.requestId).toBe('newest');
  });

  // ⚠️ AN APPROVED REQUEST CANNOT BE RENDERED HERE TRUTHFULLY: if it were still
  // live she would be a member, and the guard would have moved her off this
  // screen before the read came back.
  it('renders nothing for a state she cannot act on', () => {
    for (const status of ['approved', 'superseded', 'expired'] as const) {
      expect(pendingRequest(requestsFrom([row({ status })]))).toBeNull();
    }
    expect(pendingRequest([])).toBeNull();
  });

  it('finds the pending one past states it will not render', () => {
    const found = pendingRequest(
      requestsFrom([
        row({ request_id: 'dead', status: 'expired' }),
        row({ request_id: 'live', status: 'pending' }),
      ]),
    );
    expect(found?.requestId).toBe('live');
  });
});

// ============================================================================
// WHAT SHE IS TOLD WHEN IT REFUSES
// ============================================================================

const refusal = (code: string) => ({ code, message: 'whatever the server said' });

describe('what the joiner is told when request_access refuses', () => {
  it('every refusal it maps has a sentence of its own', () => {
    for (const code of Object.keys(REQUEST_REFUSALS)) {
      const key = REQUEST_REFUSALS[code];
      expect(typeof ES.join.requestErrors[key]).toBe('string');
      expect(requestErrorMessage(refusal(code))).toBe(ES.join.requestErrors[key]);
    }
  });

  // ⚠️⚠️ THE OVERLOAD, RETIRED — AND THIS IS THE ASSERTION THAT TURNED OVER.
  // Until `0038` it read *"reads 42501 as the code, not as the session that
  // ended"*, pinning a documented GUESS about who was standing at the screen.
  // `0038` (task `5b.9`) minted `TD006` for a code that resolves to no shop and
  // left `42501` on the authentication guard alone, so this module stops
  // guessing: `TD006` is hers to re-read, `42501` is the session, and the two
  // sentences are different. ⚠️ Both halves are asserted, because "TD006 says
  // no-such-shop" alone would still be green if `42501` had been left mapped
  // beside it — which is the overload coming back wearing two codes.
  it('reads TD006 as the code and leaves 42501 to the session sentence', () => {
    expect(REQUEST_REFUSALS.TD006).toBe('noSuchShop');
    expect(requestErrorMessage(refusal('TD006'))).toBe(ES.join.requestErrors.noSuchShop);
    expect(requestErrorMessage(refusal('42501'))).toBe(ES.api.errors.sessionEnded);
    expect(requestErrorMessage(refusal('42501'))).not.toBe(ES.join.requestErrors.noSuchShop);
  });

  // ⚠️ THE PULL PATH'S REFUSALS ARE NOT THE PUSH PATH'S, because the NEXT STEP
  // differs: a mistyped shop code is hers to re-read, a dead token is somebody
  // else's to reissue. Telling her to go bother a person for a typo is the
  // failure this separation exists to prevent.
  it('does not reuse the invite-token sentences', () => {
    expect(ES.join.requestErrors.noSuchShop).not.toBe(ES.join.errors.spent);
    expect(ES.join.requestErrors.noSuchShop).not.toBe(ES.join.errors.expired);
    expect(ES.join.requestErrors.requestExpired).not.toBe(ES.join.errors.expired);
  });

  // ⚠️ OFFLINE IS THE PILOT STORE'S NORMAL WRITE PATH, so the general sentence
  // has to survive this module's own table — the rule every sibling follows.
  it('falls through to the app-wide sentence for anything else', () => {
    expect(requestErrorMessage({ message: 'Network request failed' })).toBe(ES.api.errors.offline);
    expect(requestErrorMessage(refusal('PGRST202'))).toBe(ES.api.errors.unknown);
    expect(requestErrorMessage(null)).toBe(ES.api.errors.unknown);
  });
});

describe('the sentences she reads while she waits', () => {
  // ⚠️ IT NAMES THE SHOP, for `4.6a-iii`'s recorded reason: a code with no shop
  // attached is eight characters she cannot place three days later.
  it('names the shop she asked to join', () => {
    expect(ES.join.pending.title('La Esquina')).toContain('La Esquina');
  });

  // ⚠️ IT NAMES NO STATE AND NO ROW. She is told the thing she wanted is true,
  // which is §2.8's rule and the owner's standing one: we do the book-keeping.
  it('mentions no internal state', () => {
    const both = `${ES.join.pending.title('La Esquina')} ${ES.join.pending.body}`;
    for (const leak of ['pending', 'request', 'workspace', 'invite', 'null', 'RLS']) {
      expect(both.toLowerCase()).not.toContain(leak.toLowerCase());
    }
  });
});
