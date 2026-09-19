// ============================================================================
// ISSUING AN INVITE, AS A CONTRACT WITH POSTGRES. Plan task 5b-ii-b-1, and the
// third module of `src/api/` on the pure side of the boundary — same shape as
// `workspace.ts` and `members.ts` (ADR-035 §2.11, `R12`, `R13`): everything
// with a right answer is in here, and nothing that talks.
//
// ⚠️⚠️ THE TOKEN THIS RPC RETURNS EXISTS IN ONE PLACE FOR ONE MOMENT. `0028`
// stores only `sha256(normalize_workspace_code(token))` and its own comment says
// so in terms — *"THE TOKEN IS IN THIS RESULT AND NOWHERE ELSE, EVER"*. So the
// render is the only copy: there is no read that recovers it, no column to
// re-fetch, and an owner who loses it invites again (`0028` decision 6, which is
// why that path costs no human step). ⚠️ NOTHING HERE MAY CACHE IT. It is a
// mutation result held in screen state for as long as the screen is open, never
// a query, never `lib/store.ts` — a token in this phone's SQLite is a token that
// outlives the reason it was minted.
//
// ⚠️⚠️ AND THE CLIENT FENCE HERE IS A COURTESY, NOT THE SECURITY. `create_invite`
// is `security definer` with `has_role(workspace_id, 'manager')` in its BODY —
// not "under normal RLS" as ADR-035 §2.7 still says, which is a stale sentence
// `5b.8` now owes an amendment for (owner's ruling, 2026-09-18). The fence in
// this file exists so a shopkeeper is not shown a form that will refuse her, and
// for no other reason. Deleting it loses a courtesy; it opens nothing.
//
// ⚠️ THE `location` READ IS THE ONE THIS APP DID NOT HAVE. Nothing under
// `app/src/` selected from `location` before this task — `workspace.ts` reads
// `workspace`, `members.ts` reads `workspace_member` and `workspace_invite`, and
// that was every read in the app. It was named inside the `5b-ii` sizing's `N1`
// six days ago as a passing clause and never became a deliverable; it is `P1`
// now. See `LOCATION_COLUMNS` for the measured reason its column list is
// SHORTER than the roster's, which is the opposite of `members.ts`'s decision
// and right for a measurable reason.
// ============================================================================

import { ES } from '@/strings';
import { apiErrorMessage } from '@/api/errors';
import { ROLES, type Role } from '@/api/members';

/** The RPC's name, written once (`R13`). */
export const CREATE_INVITE = 'create_invite';

/**
 * The columns a client may ask `location` for.
 *
 * ⚠️⚠️ `is_active` IS DELIBERATELY NOT HERE, AND THAT IS THE OPPOSITE OF
 * `MEMBER_COLUMNS`'s DECISION ONE MODULE OVER. The difference is measured, not
 * stylistic:
 *
 *     workspace_member_select   workspace_id in (select my_workspaces())   0001:524
 *     location_select           id in (select my_locations())              0001:506
 *
 * `workspace_member_select` does NOT filter `is_active`, so a deactivated
 * member comes back like anybody else and `rosterFrom` has to drop them — which
 * is why the roster reads the column. `my_locations()` (`0001:332`) has
 * `and l.is_active` inside it, so **an inactive location never comes back at
 * all**. Reading the column here would ship a value that is `true` on every row
 * this app can ever see, which teaches a later reader the wrong lesson about
 * which policies filter and which do not.
 *
 * ⚠️ NAMED AND NEVER `*` (`R13`), for the reason that rule gives: `select('*')`
 * is a promise to keep parsing whatever a later migration adds.
 */
export const LOCATION_COLUMNS = 'id,name';

/** The query key the picker's location read caches under. */
export const LOCATIONS_KEY = ['workspace', 'locations'] as const;

/**
 * The roles this screen will offer.
 *
 * ⚠️⚠️ `owner` IS ABSENT ON PURPOSE AND `0028` WOULD ALLOW IT. Its decision 9 is
 * *"a manager may not mint an owner"* — so an OWNER may. This app declines to
 * offer it: a second owner is not a thing either pilot shop needs (C11.2 makes
 * the second person a manager), and it is the one invite that can hand the shop
 * away by mistap. **The schema keeps the capability and the screen does not
 * surface it**, which is reversible by one entry in this array and is the
 * cheaper direction to be wrong in.
 *
 * ⚠️ A CONSEQUENCE WORTH NAMING: `0028`'s owner-fence is therefore unreachable
 * from this screen, so nothing here can make it fire. That is not a gap in this
 * module — it is a fence on a door this app does not build, and `0028`'s own
 * suite is what proves it still holds.
 */
export const INVITABLE_ROLES: readonly Role[] = ['manager', 'staff'];

/**
 * ⚠️ WHO MAY ISSUE AN INVITE — `0028`'s own predicate, `has_role(ws, 'manager')`.
 *
 * ⚠️ IT IS NOT AN ALIAS OF `canSeeRoster` AND MUST NOT BECOME ONE, even though
 * both answer "manager and above" today. They are different questions that
 * happen to share an answer: the roster's fence is about whether the rows would
 * be IDENTIFIABLE (`workspace_invite` is readable at `manager`, so a staff
 * caller gets a list of blanks — the owner's ruling of 2026-09-18), and this one
 * is about what the RPC will accept. A migration that loosened either would move
 * one and not the other, and an alias is how the wrong one moves.
 *
 * ⚠️ THE INDEX INTO `ROLES` AND NOT `role !== 'staff'`, so a fourth role
 * inserted below `manager` is fenced out by that table rather than by
 * remembering this line exists.
 */
export function canInvite(role: Role | null): boolean {
  if (role === null) return false;
  return ROLES.indexOf(role) <= ROLES.indexOf('manager');
}

/** Does an invite for this role have to name a location? `0028:291`. */
export function locationsRequired(role: Role): boolean {
  return role === 'staff';
}

/** A `location` row as PostgREST sends it. */
export interface LocationRow {
  readonly id: string;
  readonly name: string;
}

/** One store, as the picker renders it. */
export interface LocationOption {
  readonly id: string;
  readonly name: string;
}

/**
 * The stores this caller may put somebody in.
 *
 * ⚠️ SORTED BY NAME SO THE PICKER DOES NOT RESHUFFLE between opens. PostgREST
 * returns rows in no guaranteed order, and a list of stores that reorders itself
 * is a list somebody taps the wrong row in.
 *
 * ⚠️ A ROW WITH A BLANK NAME IS DROPPED rather than rendered as an empty tap
 * target. `location_name_not_blank` (`0001`) makes that unreachable through any
 * supported path, which is exactly why this is two lines rather than a screen
 * state: it is the answer for a row that cannot exist, and it costs nothing.
 */
export function locationsFrom(rows: readonly LocationRow[] | null | undefined): LocationOption[] {
  if (rows === null || rows === undefined) return [];
  return rows
    .filter((row) => typeof row.name === 'string' && row.name.trim() !== '')
    .map((row) => ({ id: row.id, name: row.name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** What the form collects. */
export interface InviteDraft {
  readonly email: string;
  readonly role: Role;
  readonly locationIds: readonly string[];
}

/** The `p_` names `0028` declared, and the only place they are written (`R13`). */
export interface CreateInviteArgs {
  readonly p_workspace_id: string;
  readonly p_email: string;
  readonly p_role: Role;
  readonly p_location_ids: readonly string[];
}

/**
 * The draft as `create_invite`'s four arguments.
 *
 * ⚠️ THE EMAIL IS TRIMMED HERE BECAUSE `0028` TRIMS IT TOO, and sending the
 * untrimmed string would mean the address stored is the one the RPC derived
 * while the address this app validated is a different string. One normalisation,
 * on the way in, agreeing with the one in the body.
 *
 * ⚠️ A MANAGER INVITE SENDS `[]` WHATEVER THE FORM HELD. `0028` overwrites it —
 * *"a manager or owner invite stores '{}' whatever was passed"* — so sending a
 * location for a manager would be this app asking for something the database
 * then silently discards, which is the kind of disagreement nobody notices until
 * they are reading two rows and cannot explain one.
 */
export function createInviteArgs(workspaceId: string, draft: InviteDraft): CreateInviteArgs {
  return {
    p_workspace_id: workspaceId,
    p_email: draft.email.trim(),
    p_role: draft.role,
    p_location_ids: locationsRequired(draft.role) ? dedupe(draft.locationIds) : [],
  };
}

/** `0028` deduplicates too, because `member_location`'s PK would refuse the copy. */
function dedupe(ids: readonly string[]): string[] {
  const seen: string[] = [];
  for (const id of ids) if (!seen.includes(id)) seen.push(id);
  return seen;
}

/** Why this app will not send the form yet. Keys of `ES.invite.issues`. */
export type InviteIssueKey = keyof typeof ES.invite.issues;

/**
 * Is this draft one `create_invite` will accept?
 *
 * ⚠️⚠️ EVERY RULE HERE IS A COPY OF ONE IN `0028`, AND THE COPY IS THE POINT.
 * The database is the authority and answers `22023`; a shopkeeper who has typed
 * an address and tapped a button should be told which box is wrong, not handed a
 * refusal from a round trip. ⚠️ **What makes the copy safe is that the rules are
 * few and stated in one place** — and that
 * `docs/checks/5b-ii-b-1-invite-contract.sh` drives the real RPC with the same
 * drafts and asserts the two agree, so a rule that drifts is red rather than
 * merely generous.
 *
 * ⚠️ THE EMAIL SHAPE IS `0028`'s AND IS NOT A VALIDATOR. One `@` with something
 * either side, no spaces — the migration's own comment says why: *"anything
 * stricter refuses real mailboxes and this column is a label for a person, not a
 * delivery mechanism."* Delivery is out of band (§2.7).
 *
 * ⚠️ `locationCount` IS HOW "NOTHING IS ASKED IN A ONE-STORE SHOP" IS EXPRESSED.
 * C1.5 says both pilot shops have exactly one location, so the picker is not
 * rendered and the single store is filled in for her — see `resolveLocations`.
 * A staff draft with no location is therefore only an ERROR in a shop that had a
 * choice to make.
 */
export function checkInvite(
  draft: InviteDraft,
  context: { readonly locationCount: number },
): InviteIssueKey | null {
  const email = draft.email.trim();
  if (email === '') return 'emailMissing';
  if (!/^[^@\s]+@[^@\s]+$/.test(email)) return 'emailShape';

  if (locationsRequired(draft.role)) {
    if (context.locationCount === 0) return 'noLocations';
    if (dedupe(draft.locationIds).length === 0) return 'locationMissing';
  }
  return null;
}

/**
 * The locations to send, given what the shop has and what was ticked.
 *
 * ⚠️ IN A ONE-STORE SHOP THE ANSWER IS THAT STORE, NOT AN EMPTY SET. This is the
 * decision of the `5b-ii` sizing — *"nothing is asked when a shop has one
 * location"* — and it is the owner's standing tie-break: the option that adds no
 * human step. Asking a one-store shopkeeper which store is the question with no
 * right answer that `5b-i` already refused about the location's NAME.
 */
export function resolveLocations(
  draft: InviteDraft,
  options: readonly LocationOption[],
): readonly string[] {
  if (!locationsRequired(draft.role)) return [];
  if (options.length === 1) return [options[0].id];
  return draft.locationIds;
}

/** What `create_invite` answers with, once. */
export interface InviteIssued {
  readonly token: string;
  readonly email: string;
  readonly role: Role;
  /** ISO 8601, straight from `expires_at`. Rendered by `@/format/date`. */
  readonly expiresAt: string;
  /** ⚠️ `0028` decision 6: a LIVE pending invite for this address was killed. */
  readonly replacedPending: boolean;
}

/**
 * `create_invite`'s `jsonb` as the screen's value.
 *
 * ⚠️ IT THROWS RATHER THAN RETURNING A PARTIAL, and the reason is what a partial
 * would be: an invite screen showing a blank code. The token cannot be re-read —
 * so a result this app cannot parse is not a degraded success, it is an invite
 * that has been CREATED in the database and lost on the way to the person who
 * needed it. Better a refusal the owner can retry, which mints a new one and
 * supersedes this row (decision 6) than a screen with a gap where the code goes.
 */
export function issuedFrom(data: unknown): InviteIssued {
  if (typeof data !== 'object' || data === null) {
    throw new Error(`${CREATE_INVITE} returned ${typeof data}, expected an object`);
  }
  const row = data as Record<string, unknown>;
  const token = row.token;
  const email = row.email;
  const role = row.role;
  const expiresAt = row.expires_at;

  if (typeof token !== 'string' || token === '') {
    throw new Error(`${CREATE_INVITE} returned no token`);
  }
  if (typeof expiresAt !== 'string' || expiresAt === '') {
    throw new Error(`${CREATE_INVITE} returned no expires_at`);
  }
  if (!(ROLES as readonly string[]).includes(String(role))) {
    throw new Error(`${CREATE_INVITE} returned an unknown role: ${String(role)}`);
  }

  return {
    token,
    email: typeof email === 'string' ? email : '',
    role: role as Role,
    expiresAt,
    // ⚠️ ABSENT IS `false`, NOT UNKNOWN. The field is always in `0028`'s result;
    // treating a missing one as "maybe" would put a hedge on screen.
    replacedPending: row.replaced_pending === true,
  };
}

/**
 * ⚠️⚠️ IT WAS A MARKER IN THE SERVER'S PROSE UNTIL `0036`, AND IT IS A CODE NOW.
 *
 * `0028` raised `22023` for five different refusals, one of which needs a
 * different sentence than the others: inviting somebody who has ALREADY ASKED to
 * join is an approval, and approval is `0029`'s `approve_request`. The other
 * four are what `checkInvite` above already refuses locally. With no
 * distinguishing SQLSTATE, this module matched a substring of the message —
 * `ALREADY_REQUESTED_MARKER = 'already requested'` — which is normally a defect
 * here and was safe only because `docs/checks/5b-ii-b-1-invite-contract.sh`
 * drove that refusal for real and went red if the wording moved.
 *
 * ✅ `0036` MINTED `TD004` FOR IT (task `5b-iii-a`, ruled into this step by the
 * owner on 2026-09-18), so the marker, the substring match and the assertion
 * that made them safe are all retired together. A message is not a contract;
 * a SQLSTATE is.
 *
 * ⚠️ THE OTHER FOUR REFUSALS KEEP `22023` AND THAT IS WHY THE CODE IS STILL
 * CHECKED. A bad payload is a bad payload — one meaning reached four ways —
 * so `22023` reaching here means the phone let something through that
 * `checkInvite` should have caught, and it is NOT this.
 */
export const ALREADY_REQUESTED = 'TD004';

/** Did the database refuse this because the person has already asked to join? */
export function isAlreadyRequested(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  return (error as { code?: unknown }).code === ALREADY_REQUESTED;
}

/**
 * The code, in the four groups of four a person reads aloud (C11.6, C11.7).
 *
 * ⚠️ IT IS A RENDERING AND NEVER A VALUE, which is `groupedCode`'s rule one
 * module over and is safe for the same measured reason:
 * `normalize_workspace_code` (`0027:175`) strips every non-alphanumeric before
 * hashing, and `hash_invite_token` calls it — so the spaces cannot reach the
 * hash and would be a corruption to store or to send anywhere else.
 *
 * ⚠️ ANYTHING THAT IS NOT SIXTEEN CHARACTERS IS RETURNED UNTOUCHED, the
 * discipline `groupedCode` records: the only way here with something else is a
 * result this app failed to parse, and grouping it anyway would put spaces
 * through whatever a screen passed.
 */
export function groupedToken(token: string): string {
  if (token.length !== 16) return token;
  return `${token.slice(0, 4)} ${token.slice(4, 8)} ${token.slice(8, 12)} ${token.slice(12)}`;
}

/**
 * The sentence that carries the token to WhatsApp.
 *
 * ⚠️ IT IS THE SAME HAND-OFF `shareText` MAKES FOR THE JOIN CODE, and §2.7 is
 * why either exists: *"delivery is out of band for v1 — the owner sends the code
 * over WhatsApp."* An owner retyping sixteen characters off her own screen is a
 * human step this app can simply not require.
 *
 * ⚠️ IT NAMES THE SHOP for `4.6a-iii`'s recorded reason, one layer out: a code
 * with no shop attached is sixteen characters in a chat window three weeks
 * later, and the person receiving it cannot tell which shop they are joining.
 */
export function inviteShareText(shopName: string, token: string): string {
  return ES.invite.shareMessage(shopName, groupedToken(token));
}

/**
 * What the shopkeeper is told when `create_invite` refuses.
 *
 * ⚠️ IT IS HERE AND NOT IN `@/api/errors` ON PURPOSE. That module's contract,
 * stated in its own header, is that every value of its map is a KEY of
 * `ES.api.errors` — so a sentence typed at a call site is a typecheck failure.
 * This answer is `ES.invite.alreadyRequested`, which is not in that table and
 * should not be moved into it: it is one RPC's refusal, not an API-wide code.
 * The general path is still `apiErrorMessage`, called below, so the offline and
 * session-ended sentences stay the ones every other screen gives.
 */
export function inviteErrorMessage(error: unknown): string {
  return isAlreadyRequested(error) ? ES.invite.alreadyRequested : apiErrorMessage(error);
}
