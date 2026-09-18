import { describe, expect, it } from 'vitest';

import {
  CODE_LENGTH,
  REDEEM_INVITE,
  REDEEM_REFUSALS,
  TOKEN_LENGTH,
  checkCredential,
  classifyCredential,
  normalizeCredential,
  redeemArgs,
  redeemErrorMessage,
  redeemedFrom,
} from '@/api/redeem';
import { groupedToken } from '@/api/invites';
import { ROLES } from '@/api/members';
import { ES } from '@/strings';

// ============================================================================
// SPENDING AN INVITE. Plan task 5b-ii-b-2.
//
// ⚠️⚠️ WHAT THIS SUITE IS FOR AND WHAT IT CANNOT DO, STATED TOGETHER — the
// sentence `api-invites.test.ts` and `api-members.test.ts` both open with.
// Every assertion below pins either a STRING this app sends to PostgREST or a
// DECISION about what the landing does with what a person typed. It can prove
// the app is consistent with itself.
//
// IT CANNOT PROVE `0028` AGREES, and on this module that gap is unusually wide,
// because the app's whole decision is a LENGTH and no line of TypeScript has
// ever read `generate_invite_token` or `workspace_code_shape`. If either moved,
// every assertion here would stay green and the app would send a person's
// invite token down the join-code path — or refuse it outright. THAT is
// `docs/checks/5b-ii-b-2-redeem-contract.sh`, which mints a real token and
// reads a real shop's code and measures both against the two constants below.
//
// ⚠️ AND `normalizeCredential` IS A COPY OF `normalize_workspace_code`
// (`0027:175`). This suite pins the copy. That the copy still agrees is the
// contract check's job, and it drives the real RPC with a token carrying the
// grouping `groupedToken` puts there.
// ============================================================================

describe('the contract this app sends', () => {
  it('names the RPC once, and it is the one 0028 declares', () => {
    expect(REDEEM_INVITE).toBe('redeem_invite');
  });

  it("sends 0028's own p_ name, and only that one", () => {
    expect(redeemArgs('ABCDEFGHJKMNPQRS')).toEqual({ p_token: 'ABCDEFGHJKMNPQRS' });
    expect(Object.keys(redeemArgs('ABCDEFGHJKMNPQRS'))).toEqual(['p_token']);
  });

  // ⚠️ THE STRING THAT WAS CLASSIFIED IS THE STRING THAT IS SPENT. If the app
  // measured the normalised form and then sent the raw one, the two would agree
  // only because `hash_invite_token` normalises again — and the day that stopped
  // being true the symptom would be "the code the owner read out does not work".
  it('sends the normalised form, which is the form it measured', () => {
    const typed = 'abcd efgh jkmn pqrs';
    expect(redeemArgs(typed).p_token).toBe(classifyCredential(typed).value);
  });
});

// ============================================================================
// `P2` — THE LENGTH RULE, WHICH IS THE WHOLE SCREEN.
// ============================================================================

describe('normalising a credential the way the database will', () => {
  it('strips the grouping a code acquires when it is written down', () => {
    expect(normalizeCredential('ABCD EFGH JKMN PQRS')).toBe('ABCDEFGHJKMNPQRS');
    expect(normalizeCredential('ABCD-EFGH')).toBe('ABCDEFGH');
  });

  it('case-folds, because she is typing what she can see', () => {
    expect(normalizeCredential('abcdefgh')).toBe('ABCDEFGH');
  });

  // ⚠️ CROCKFORD'S OWN SUBSTITUTIONS, AND THEY ARE NOT COSMETIC. The alphabet
  // excludes I, L and O precisely so somebody reading a code aloud can say "oh"
  // and be understood. Dropping these would refuse a credential 0028 accepts.
  it('applies I/L → 1 and O → 0, as normalize_workspace_code does', () => {
    expect(normalizeCredential('IL0O')).toBe('1100');
    expect(normalizeCredential('ilo')).toBe('110');
  });

  // ⚠️ `U` IS EXCLUDED WITH NO MAPPING AND SURVIVES — 0027's own comment. It
  // matches nothing, which is the right answer for a character no credential
  // can contain.
  it('leaves U alone, so it matches nothing', () => {
    expect(normalizeCredential('U')).toBe('U');
  });

  // ⚠️⚠️ THE PRECONDITION THE ENTIRE LENGTH RULE RESTS ON. `upper` and
  // `translate` are 1:1 and the regex removes only separators, so normalising
  // cannot turn a 16 into anything else. If this ever failed, "only length tells
  // them apart" would be false and both destinations would be a coin toss.
  it('is length-preserving on alphanumerics', () => {
    for (const raw of ['ABCDEFGH', 'ilo12345', 'ABCDEFGHJKMNPQRS', 'UUUUUUUU']) {
      expect(normalizeCredential(raw)).toHaveLength(raw.length);
    }
  });
});

describe('telling an invite token from a join code', () => {
  it('pins the two lengths 0028 and 0027 mint', () => {
    expect(TOKEN_LENGTH).toBe(16);
    expect(CODE_LENGTH).toBe(8);
  });

  it('sixteen characters is a token', () => {
    expect(classifyCredential('ABCDEFGHJKMNPQRS').kind).toBe('token');
  });

  it('eight characters is the shop’s join code', () => {
    expect(classifyCredential('ABCDEFGH').kind).toBe('code');
  });

  // ⚠️⚠️ THE CASE THE OWNER'S OWN SHARE SHEET PRODUCES. `inviteShareText` sends
  // `groupedToken`, which is four groups of four — nineteen characters. Measuring
  // the raw string would send every shared token down the "neither length" path,
  // which is the app refusing the exact string it told her to send.
  it('classifies the grouped token this app itself shares', () => {
    const grouped = groupedToken('ABCDEFGHJKMNPQRS');
    expect(grouped).toContain(' ');
    expect(classifyCredential(grouped).kind).toBe('token');
    expect(classifyCredential(grouped).value).toBe('ABCDEFGHJKMNPQRS');
  });

  it('anything else is neither, and is refused before a call is made', () => {
    expect(classifyCredential('ABC').kind).toBeNull();
    expect(classifyCredential('ABCDEFGHJKMNPQRSTV').kind).toBeNull();
    expect(classifyCredential('').kind).toBeNull();
  });
});

describe('what the box refuses before it calls', () => {
  it('nothing typed is `missing`, and punctuation alone is nothing typed', () => {
    expect(checkCredential('')).toBe('missing');
    expect(checkCredential('   ')).toBe('missing');
    expect(checkCredential('-- --')).toBe('missing');
  });

  it('a wrong length is `shape`', () => {
    expect(checkCredential('ABC')).toBe('shape');
  });

  // ⚠️⚠️ THE EIGHT-CHARACTER CASE IS A SENTENCE, NOT A CALL, AND IT IS NOT
  // HYPOTHETICAL: Ajustes has shipped `Compartir código` since 5b-ii-a, so an
  // owner can hand out a join code today and this screen is where it lands.
  // `5b-iii` DELETES THIS BRANCH when it wires `request_access`.
  it('a join code is recognised and named, never called “no se ve bien”', () => {
    expect(checkCredential('ABCDEFGH')).toBe('workspaceCode');
    expect(ES.join.issues.workspaceCode).not.toBe(ES.join.issues.shape);
  });

  it('a token passes', () => {
    expect(checkCredential('abcd efgh jkmn pqrs')).toBeNull();
  });

  // ⚠️ EVERY KEY IT CAN RETURN HAS A SENTENCE. A key with no string is a blank
  // line under the box, which is the app refusing and not saying why.
  it('every issue it can return is a key of ES.join.issues', () => {
    for (const key of ['missing', 'shape', 'workspaceCode'] as const) {
      expect(typeof ES.join.issues[key]).toBe('string');
    }
  });
});

// ============================================================================
// THE ANSWER, AND THE TWO REFUSALS.
// ============================================================================

const result = (over: Record<string, unknown> = {}) => ({
  workspace_id: 'ws-1',
  workspace_name: 'La Esquina',
  member_id: 'm-1',
  role: 'staff',
  location_count: 2,
  already_redeemed: false,
  membership_existed: false,
  ...over,
});

describe('reading what redeem_invite answered', () => {
  it('takes the membership it just wrote', () => {
    expect(redeemedFrom(result())).toEqual({
      workspaceId: 'ws-1',
      workspaceName: 'La Esquina',
      role: 'staff',
      locationCount: 2,
      alreadyRedeemed: false,
      membershipExisted: false,
    });
  });

  it('every role 0001 declares parses', () => {
    for (const role of ROLES) {
      expect(redeemedFrom(result({ role })).role).toBe(role);
    }
  });

  // ⚠️ THE IDEMPOTENT BRANCH IS A SUCCESS. 0028 answers it when the same caller
  // taps twice, which is the ordinary case on a connection the pilot store loses
  // routinely — so it must parse, not throw.
  it('a second tap by the same person parses as already_redeemed', () => {
    const again = redeemedFrom(result({ already_redeemed: true, membership_existed: true }));
    expect(again.alreadyRedeemed).toBe(true);
    expect(again.membershipExisted).toBe(true);
  });

  it('an absent flag is false, never unknown', () => {
    const row = result();
    delete (row as Record<string, unknown>).already_redeemed;
    expect(redeemedFrom(row).alreadyRedeemed).toBe(false);
  });

  // ⚠️ THE NAME MAY BE MISSING AND THE MEMBERSHIP MAY NOT. Nothing renders the
  // name on this path — the guard moves her off the screen — so a blank one
  // costs a word nobody reads.
  it('tolerates a missing workspace_name and refuses a missing workspace_id', () => {
    expect(redeemedFrom(result({ workspace_name: null })).workspaceName).toBe('');
    expect(() => redeemedFrom(result({ workspace_id: '' }))).toThrow(/workspace_id/);
  });

  it('throws on a result it cannot account for, rather than returning a partial', () => {
    expect(() => redeemedFrom(null)).toThrow(/expected an object/);
    expect(() => redeemedFrom('ok')).toThrow(/expected an object/);
    expect(() => redeemedFrom(result({ role: 'contador' }))).toThrow(/unknown role/);
  });
});

describe('what the joiner is told when it refuses', () => {
  it('maps only the two SQLSTATEs 0028 raises, to KEYS and never sentences', () => {
    expect(Object.keys(REDEEM_REFUSALS).sort()).toEqual(['42501', 'TD003']);
    for (const key of Object.values(REDEEM_REFUSALS)) {
      expect(typeof ES.join.errors[key]).toBe('string');
    }
  });

  it('TD003 is “ask for a new one”, for expiry and supersession alike', () => {
    expect(redeemErrorMessage({ code: 'TD003' })).toBe(ES.join.errors.expired);
  });

  // ⚠️⚠️ `42501` MEANS SOMETHING DIFFERENT HERE THAN IT DOES ANYWHERE ELSE IN
  // THIS APP. `@/api/errors` maps it to `sessionEnded`, because the
  // `authenticated` grant is what refuses a caller with no session. On this
  // screen the caller has one — `/bienvenida` is behind `guard.ts` — so it is
  // read as the code. The honest fix is a SQLSTATE of its own, which is a
  // migration, routed to `5b-iii`.
  it('42501 is the code on this screen, and NOT the session sentence', () => {
    expect(redeemErrorMessage({ code: '42501' })).toBe(ES.join.errors.spent);
    expect(redeemErrorMessage({ code: '42501' })).not.toBe(ES.api.errors.sessionEnded);
  });

  // ⚠️ OFFLINE IS THE PILOT STORE'S NORMAL WRITE PATH, so it is the sentence
  // that will actually be read — and it stays the one every other screen gives.
  it('falls through to the app-wide sentence for everything else', () => {
    expect(redeemErrorMessage({ message: 'Network request failed' })).toBe(
      ES.api.errors.offline,
    );
    expect(redeemErrorMessage({ code: 'PGRST202' })).toBe(ES.api.errors.unknown);
    expect(redeemErrorMessage(undefined)).toBe(ES.api.errors.unknown);
  });
});
