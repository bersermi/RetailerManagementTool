// ============================================================================
// SPENDING AN INVITE, AS A CONTRACT WITH POSTGRES. Plan task 5b-ii-b-2, and the
// fourth module of `src/api/` on the pure side of the boundary — same shape as
// `workspace.ts`, `members.ts` and `invites.ts` (ADR-035 §2.11, `R12`, `R13`):
// everything with a right answer is in here, and nothing that talks.
//
// ⚠️⚠️ IT IS A SEPARATE MODULE FROM `invites.ts` AND THAT IS THE SEAM, NOT A
// FILING PREFERENCE. `invites.ts` is the INVITING half — one actor, holding a
// shop, pushing a code out. This is the REDEEMING half: a different person, on a
// different phone, who belongs to no shop yet and is about to. The two share a
// migration (`0028`) and nothing else — no argument name, no column list, no
// refusal. ⚠️ AND THE CREDENTIAL THIS MODULE CLASSIFIES IS NOT ALWAYS AN INVITE:
// eight characters is the shop's JOIN CODE, which `invites.ts` has never heard
// of and `5b-iii` redeems through `request_access`.
//
// ⚠️⚠️ THE WHOLE SCREEN TURNS ON ONE FACT, AND IT IS MEASURED RATHER THAN
// RECALLED: AN INVITE TOKEN AND A JOIN CODE ARE THE SAME ALPHABET, THE SAME
// NORMALISER, AND DIFFER ONLY IN LENGTH. (`P2`, the sizing of 2026-09-18.)
//
//     generate_invite_token   0028:169   16 chars of 0123456789ABCDEFGHJKMNPQRSTVWXYZ
//     generate_workspace_code 0027       8 chars of the same alphabet
//     hash_invite_token       0028:191   normalize_workspace_code() INSIDE the hash
//
// So the person holding one of them cannot tell you which kind she was sent —
// nobody labelled it in the WhatsApp message — which means THE SCREEN CANNOT ASK
// HER. One box, and this module decides by length. That is the owner-behalf
// decision recorded in `docs/PLAN.md` at the `5b-ii-b` sizing, and it is cheap
// today and a retrofit the moment the second screen exists (`5b-iii`).
//
// ⚠️ ITS PRECONDITION IS THAT NORMALISING CANNOT CHANGE A LENGTH, which is not
// an assumption here either. `normalize_workspace_code` (`0027:175`) is
// `translate(upper(regexp_replace(…, '[^0-9A-Za-z]', '', 'g')), 'ILO', '110')`:
// the regex removes only separators, and `upper` and `translate` are both 1:1 on
// what is left. `workspace.code` is `check (code ~ '^[…]{8}$')` (`0027:221`) and
// a token is sixteen by construction — so a normalised credential is exactly 8
// or exactly 16, and the two cannot collide.
//
// ⚠️ `docs/checks/5b-ii-b-2-redeem-contract.sh` MEASURES BOTH LENGTHS AGAINST A
// LIVE DATABASE — a minted token and a real shop's code — rather than against
// this comment. If either ever moved, the length rule would be a coin toss
// between two people's memberships, and no suite in this repository could see it.
// ============================================================================

import { ES } from '@/strings';
import { apiErrorMessage } from '@/api/errors';
import { ROLES, type Role } from '@/api/members';

/** The RPC's name, written once (`R13`). */
export const REDEEM_INVITE = 'redeem_invite';

/** The `p_` name `0028` declared, and the only place it is written (`R13`). */
export interface RedeemInviteArgs {
  readonly p_token: string;
}

/**
 * The two lengths, and they are the entire decision this screen makes.
 *
 * ⚠️ THEY ARE CONSTANTS SO A CHECK CAN READ THEM. `5b-ii-b-2`'s contract check
 * mints a real token and reads a real shop's code and asserts these two numbers
 * against them, which is the only instrument that can see this rule at all —
 * §2.11 refuses the rendering suite that would catch two boxes appearing, and a
 * length written inline in an `if` is a number no check can find.
 */
export const TOKEN_LENGTH = 16;
export const CODE_LENGTH = 8;

/** Which of the two credentials this is, or `null` for neither. */
export type CredentialKind = 'token' | 'code' | null;

/**
 * A credential as the database will read it — `hash_invite_token`'s normaliser,
 * on this side of the wire.
 *
 * ⚠️⚠️ IT IS A COPY OF `normalize_workspace_code` (`0027:175`) AND THE COPY IS
 * LOAD-BEARING, unlike the courtesy copies in `checkInvite`. The app has to
 * MEASURE A LENGTH before it knows which RPC to call, and the string a person
 * pastes carries the grouping `groupedToken` put there — `ABCD EFGH JKMN PQRS`
 * is nineteen characters and is a sixteen-character token. Measuring the raw
 * string would send every shared code down the "neither length" path.
 *
 * ⚠️ THE `I`/`L` → `1` AND `O` → `0` SUBSTITUTIONS ARE CROCKFORD'S AND ARE NOT
 * COSMETIC: the alphabet excludes those three letters precisely so that a person
 * reading a code aloud can say "oh" and be understood. Dropping them here would
 * make this app refuse a credential the database would have accepted.
 *
 * ⚠️ `U` IS EXCLUDED FROM THE ALPHABET WITH NO MAPPING AND SURVIVES ON PURPOSE —
 * `0027`'s own comment says so. It matches nothing, which is the right answer
 * for a character that cannot be in any credential.
 *
 * ⚠️ AND THE NORMALISED FORM IS WHAT IS SENT, not the raw string. `0028`
 * normalises inside the hash so it would agree either way; sending the string
 * this app measured means the value that was CLASSIFIED is the value that was
 * SPENT, and the two can never be different strings.
 */
export function normalizeCredential(raw: string): string {
  return raw
    .replace(/[^0-9A-Za-z]/g, '')
    .toUpperCase()
    .replace(/[IL]/g, '1')
    .replace(/O/g, '0');
}

/**
 * What she typed, and which door it opens.
 *
 * ⚠️ BY LENGTH AND NOTHING ELSE. There is no prefix, no checksum and no label:
 * `0028:169` says the token was given the join code's alphabet deliberately,
 * *"read aloud over WhatsApp by the same person, in the same conditions"*.
 */
export function classifyCredential(raw: string): {
  readonly kind: CredentialKind;
  readonly value: string;
} {
  const value = normalizeCredential(raw);
  if (value.length === TOKEN_LENGTH) return { kind: 'token', value };
  if (value.length === CODE_LENGTH) return { kind: 'code', value };
  return { kind: null, value };
}

/** Why this app will not send what she typed. Keys of `ES.join.issues`. */
export type JoinIssueKey = keyof typeof ES.join.issues;

/**
 * Is this something `redeem_invite` can be called with?
 *
 * ⚠️⚠️ THE EIGHT-CHARACTER ANSWER IS A SENTENCE AND NOT A CALL, BECAUSE THE
 * SCREEN THAT SPENDS A JOIN CODE DOES NOT EXIST YET (`5b-iii`, `request_access`).
 * ⚠️ AND IT IS NOT HYPOTHETICAL: Ajustes has shipped `Compartir código` since
 * `5b-ii-a`, so an owner can hand out an eight-character code TODAY and the
 * person holding it lands here. Telling her *"ese código no se ve bien"* would
 * be this app calling a correct code wrong.
 *
 * ⚠️ THE SENTENCE NAMES HER NEXT STEP AND NOT OUR INTERNAL STATE — "ask them to
 * invite you", which is a thing she can do, rather than "that path is not built",
 * which is ours. The owner's standing rule: WE DO THE BOOK-KEEPING, NOT THEM.
 * `5b-iii` DELETES THIS BRANCH AND ITS STRING when it wires the other door.
 */
export function checkCredential(raw: string): JoinIssueKey | null {
  const { kind, value } = classifyCredential(raw);
  if (value === '') return 'missing';
  if (kind === 'code') return 'workspaceCode';
  if (kind !== 'token') return 'shape';
  return null;
}

/** The credential as `redeem_invite`'s one argument. */
export function redeemArgs(raw: string): RedeemInviteArgs {
  return { p_token: normalizeCredential(raw) };
}

/** What `redeem_invite` answers with. */
export interface Redeemed {
  readonly workspaceId: string;
  readonly workspaceName: string;
  readonly role: Role;
  readonly locationCount: number;
  /** ⚠️ `0028`'s idempotent branch: she had already spent this one. Not an error. */
  readonly alreadyRedeemed: boolean;
  /** She was already a member and has been reactivated at the invite's role. */
  readonly membershipExisted: boolean;
}

/**
 * `redeem_invite`'s `jsonb` as a value.
 *
 * ⚠️ IT THROWS ON A RESULT IT CANNOT PARSE rather than returning a partial, for
 * `issuedFrom`'s reason turned around: the membership HAS been written by the
 * time this runs, so a partial would be a person who is in the shop and is being
 * told she is not. A refusal she can retry is honest — the retry is idempotent
 * (`0028` decision, the `already_redeemed` branch) and costs her nothing.
 */
export function redeemedFrom(data: unknown): Redeemed {
  if (typeof data !== 'object' || data === null) {
    throw new Error(`${REDEEM_INVITE} returned ${typeof data}, expected an object`);
  }
  const row = data as Record<string, unknown>;
  const workspaceId = row.workspace_id;
  const role = row.role;

  if (typeof workspaceId !== 'string' || workspaceId === '') {
    throw new Error(`${REDEEM_INVITE} returned no workspace_id`);
  }
  if (!(ROLES as readonly string[]).includes(String(role))) {
    throw new Error(`${REDEEM_INVITE} returned an unknown role: ${String(role)}`);
  }

  const count = row.location_count;
  return {
    workspaceId,
    // ⚠️ THE NAME IS ALLOWED TO BE MISSING AND THE MEMBERSHIP IS NOT. Nothing on
    // this path renders the name — the guard moves her to Inicio the instant the
    // membership read lands — so a blank one costs a word nobody reads, while a
    // missing workspace_id is a redemption this app cannot account for.
    workspaceName: typeof row.workspace_name === 'string' ? row.workspace_name : '',
    role: role as Role,
    locationCount: typeof count === 'number' ? count : 0,
    // ⚠️ ABSENT IS `false`, NOT UNKNOWN — `issuedFrom`'s rule for the same
    // reason: the field is always in `0028`'s result, and a hedge here would be
    // a hedge on screen.
    alreadyRedeemed: row.already_redeemed === true,
    membershipExisted: row.membership_existed === true,
  };
}

/**
 * ⚠️⚠️ THE TWO SQLSTATES `redeem_invite` REFUSES WITH, AND NEITHER IS OVERLOADED
 * ANY MORE.
 *
 * The values are KEYS of `ES.join.errors`, never sentences — `@/api/errors`'s
 * discipline, so a message typed at a call site is a typecheck failure.
 *
 *     TD003   expired, or superseded by a newer invite to the same address
 *             (`0028`, decision 11). One sentence for both: they differ in
 *             which row died, and her next step is identical.
 *     TD005   the token is not valid, or somebody else already spent it
 *             (`0036`). One sentence for both, for the same reason: whichever
 *             way it is dead, the code in her hand will never work and she has
 *             to ask for another.
 *
 * ⚠️⚠️ UNTIL `0036` THE SECOND ROW WAS `42501`, AND THAT IS THE WHOLE POINT OF
 * THIS EDIT. `@/api/errors` maps `42501` app-wide to `sessionEnded`, because
 * the `authenticated` grant is what refuses an anonymous caller — and
 * `redeem_invite` ALSO raised it from its own body for a dead token. So this
 * screen had to GUESS which of the two had happened, and it guessed "dead
 * token" on the argument that `/bienvenida` sits behind `guard.ts` and a caller
 * here therefore has a session. That guess was documented, measured by
 * `docs/checks/5b-ii-b-2-redeem-contract.sh` assertion 9, and routed to
 * `5b-iii`.
 *
 * ✅ IT IS GONE. `0036` (task `5b-iii-a`) moved both token refusals onto
 * `TD005` and left `42501` on the authentication guard alone, so the two
 * events now answer differently and neither module is guessing. `42501`
 * reaching this screen falls through to `apiErrorMessage` and gets the session
 * sentence — which is what it always meant everywhere else.
 */
export const REDEEM_REFUSALS: Readonly<Record<string, keyof typeof ES.join.errors>> = {
  TD003: 'expired',
  TD005: 'spent',
};

/**
 * What the joiner is told when `redeem_invite` refuses.
 *
 * ⚠️ IT IS HERE AND NOT IN `@/api/errors` FOR `inviteErrorMessage`'s REASON: the
 * two sentences are one RPC's refusals, not API-wide codes. The general path is
 * still `apiErrorMessage`, called below, so the offline sentence stays the one
 * every other screen gives — and offline is the pilot store's normal write
 * path, so it is the one that will actually be read. ⚠️ As of `0036` the
 * SESSION sentence goes down that path too, which it could not before.
 */
export function redeemErrorMessage(error: unknown): string {
  if (typeof error === 'object' && error !== null) {
    const code = (error as { code?: unknown }).code;
    if (typeof code === 'string' && code in REDEEM_REFUSALS) {
      return ES.join.errors[REDEEM_REFUSALS[code]];
    }
  }
  return apiErrorMessage(error);
}
