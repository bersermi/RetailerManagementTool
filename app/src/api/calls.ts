// ============================================================================
// THE ONLY MODULE IN THIS APP THAT CALLS `supabase.rpc` OR `supabase.from`.
// Plan tasks 5b-i and 5b-ii-a. ADR-035 §2.11: "`src/api/` — one wrapper per RPC. Juniors
// never call `supabase.rpc` directly."
//
// ⚠️ IT IS DELIBERATELY UNTESTABLE, AND EVERYTHING IN IT WITH A RIGHT ANSWER IS
// SOMEWHERE ELSE. It imports `@/lib/supabase`, which runs three side effects at
// module scope — a URL polyfill, SQLite installing itself as
// `globalThis.localStorage`, an `AppState` listener — so no node suite can load
// this file, and `app/vitest.config.ts` collects `test/**` only so nothing
// tries. The argument names, the column list and the membership decision are in
// `@/api/workspace`; the message a failure becomes is in `@/api/errors`. What
// is left here is the three lines that talk, which is the same split
// `env.ts` / `supabase.ts` already made one layer down.
//
// ⚠️ SO WHAT NO CHECK IN THIS REPOSITORY CAN SEE, NAMED HERE RATHER THAN LEFT
// TO BE DISCOVERED: that these three lines call the RPC the contract describes.
// A typecheck cannot — TypeScript has never read `0027`. The suite cannot — it
// cannot load this file. `docs/checks/5b-i-api-contract.sh` is the instrument,
// and it is an HTTP round trip against a reset database rather than a reading
// of this file.
//
// ⚠️ THE WRAPPERS THROW RATHER THAN RETURNING A RESULT SHAPE. supabase-js
// returns `{ data, error }` and never rejects; TanStack Query decides
// `isError`, retries and invalidation from a REJECTED PROMISE. A wrapper that
// resolved with an error object would be a wrapper every caller has to remember
// to unpack, and the one that forgets gets a cached success holding a failure.
// ============================================================================

import { supabase } from '@/lib/supabase';
import { RECORD_FAILED_WRITE } from '@/api/deadletter';
import { isContractMismatch } from '@/api/errors';
import { RECORD_RPC } from '@/api/flush';
import { type WriteKind } from '@/api/outbox';
import {
  APPROVE_REQUEST,
  PENDING_ACCESS_REQUESTS,
  approveArgs,
  approvedFrom,
  pendingRequestsArgs,
  type ApprovalDraft,
  type Approved,
  type PendingRequestRow,
} from '@/api/approvals';
import {
  INVITE_COLUMNS,
  MEMBER_COLUMNS,
  type InviteRow,
  type MemberRow,
} from '@/api/members';
import {
  CREATE_INVITE,
  LOCATION_COLUMNS,
  createInviteArgs,
  issuedFrom,
  type InviteDraft,
  type InviteIssued,
  type LocationRow,
} from '@/api/invites';
import {
  SET_MY_DISPLAY_NAME,
  setMyDisplayNameArgs,
  storedNameFrom,
} from '@/api/displayName';
import {
  REDEEM_INVITE,
  redeemArgs,
  redeemedFrom,
  type Redeemed,
} from '@/api/redeem';
import {
  SALE_COLUMNS,
  TODAY_COLUMN,
  dayStartISO,
  type SaleRow,
} from '@/api/today';
import {
  MY_ACCESS_REQUESTS,
  REQUEST_ACCESS,
  outcomeFrom,
  requestAccessArgs,
  type AccessOutcome,
  type AccessRequestRow,
} from '@/api/requests';
import {
  CATALOG_ORDER_COLUMN,
  CATALOG_SELECT,
  PRICE_STARTS_COLUMN,
  PRICE_TABLE,
  UNIT_COLUMNS,
  isoDay,
  priceEndsAfter,
  type UnitBases,
  type UnitFactors,
  type UnitRow,
  type VariantRow,
} from '@/api/catalog';
import {
  PRICE_EDIT_COLUMNS,
  PRICE_EDIT_TABLE,
  UPDATE_RETURNING,
  VARIANT_EDIT_COLUMNS,
  VARIANT_TABLE,
  type ActivePatch,
  type NamePatch,
  type PriceChange,
  type PriceChangeOutcome,
  type PriceInForce,
  type SettingsPatch,
  type VariantSettingsRow,
} from '@/api/catalogEdit';
import {
  INSERT_RETURNING,
  WRITE_ORDER,
  familyRow,
  parsePesos,
  priceOmitted,
  priceRow,
  pricePerBase,
  variantRow,
  type CreateOutcome,
  type ProductDraft,
} from '@/api/catalogWrite';
import {
  ONBOARD_WORKSPACE,
  WORKSPACE_COLUMNS,
  onboardArgs,
  toWorkspace,
  type OnboardInput,
  type Workspace,
  type WorkspaceRow,
} from '@/api/workspace';

/**
 * The shops the caller is an active member of. An empty array is the answer,
 * not a failure: it is what "signed in, belongs to no shop" looks like, and
 * `workspace_select` (0001) is what makes the empty array trustworthy.
 */
export async function myWorkspaces(): Promise<Workspace[]> {
  const { data, error } = await supabase.from('workspace').select(WORKSPACE_COLUMNS);
  if (error) throw reported(error);
  return ((data ?? []) as WorkspaceRow[]).map(toWorkspace);
}

/** Creates the shop, its owner membership, its settings, its first location and
 *  its generic provider — five rows, one statement (`0027`). Returns its id. */
export async function onboardWorkspace(input: OnboardInput): Promise<string> {
  const { data, error } = await supabase.rpc(ONBOARD_WORKSPACE, onboardArgs(input));
  if (error) throw reported(error);
  if (typeof data !== 'string') {
    throw new Error(`${ONBOARD_WORKSPACE} returned ${typeof data}, expected a workspace id`);
  }
  return data;
}

/**
 * Every active and inactive membership of every shop the caller belongs to
 * (5b-ii-a). `workspace_member_select` (`0001`) scopes it to their workspaces
 * and does NOT filter `is_active`, which is why the column is read and
 * `rosterFrom` is what drops a membership that has ended.
 */
export async function workspaceMembers(): Promise<MemberRow[]> {
  const { data, error } = await supabase.from('workspace_member').select(MEMBER_COLUMNS);
  if (error) throw reported(error);
  return (data ?? []) as MemberRow[];
}

/**
 * The invites this caller may read — the other half of the roster's join.
 *
 * ⚠️⚠️ A STAFF CALLER GETS `[]` AND NOT A 403, WHICH IS THE ENTIRE REASON
 * `canSeeRoster` IS A CLIENT-SIDE FENCE AND NOT AN ERROR HANDLER.
 * `workspace_invite_select` is `has_role(workspace_id, 'manager')` (`0002`), and
 * a row a policy hides is a row that was never there: the read SUCCEEDS and
 * returns nothing. Rendering the roster from that answer is a list of people
 * with no identity on any of them, so the decision is taken before the call —
 * see `@/api/members`, and the owner's ruling of 2026-09-18.
 */
export async function workspaceInvites(): Promise<InviteRow[]> {
  const { data, error } = await supabase.from('workspace_invite').select(INVITE_COLUMNS);
  if (error) throw reported(error);
  return (data ?? []) as InviteRow[];
}

/**
 * The stores this caller may put somebody in — the read no line in this app
 * performed before `5b-ii-b-1` (`P1`).
 *
 * ⚠️ `location_select` IS `id in (select public.my_locations())` (`0001:506`),
 * which is scoped by LOCATION and not by workspace like every other read here.
 * Measured against `0001:332`: `my_locations()` returns every ACTIVE location in
 * the workspace when `wm.role >= 'manager'`, and only explicit `member_location`
 * rows below that. So a manager gets the whole list by role, a staff caller gets
 * the stores they work in — and neither ever sees an inactive one, which is why
 * `LOCATION_COLUMNS` does not read `is_active`.
 *
 * ⚠️ AN EMPTY ARRAY IS AN ANSWER, NOT A FAILURE, exactly as it is for
 * `myWorkspaces` — and here it is the one `checkInvite` turns into `noLocations`
 * rather than a refusal from the wire.
 */
export async function workspaceLocations(): Promise<LocationRow[]> {
  const { data, error } = await supabase.from('location').select(LOCATION_COLUMNS);
  if (error) throw reported(error);
  return (data ?? []) as LocationRow[];
}

/**
 * Issues one invite and returns its token — which exists in this result and
 * nowhere else, ever (`0028` stores only the hash).
 *
 * ⚠️ `issuedFrom` THROWS ON A RESULT IT CANNOT PARSE rather than returning a
 * partial, and `@/api/invites` argues why: a half-parsed result is an invite
 * that has been created in the database and lost on the way to the person who
 * needed it.
 */
export async function createInvite(
  workspaceId: string,
  draft: InviteDraft,
): Promise<InviteIssued> {
  const { data, error } = await supabase.rpc(CREATE_INVITE, createInviteArgs(workspaceId, draft));
  if (error) throw reported(error);
  return issuedFrom(data);
}

/**
 * Spends one invite token and returns the membership it just wrote (5b-ii-b-2).
 *
 * ⚠️ THE CALLER BELONGS TO NO SHOP WHEN THIS RUNS, which is why `redeem_invite`
 * is `security definer` — `0028`'s own comment says it: *"the caller is not a
 * member of anything yet and no policy could admit them."* So this is the one
 * write in this app whose success is what makes its caller's other reads
 * non-empty, and the invalidation in `useRedeemInvite` is not a refresh, it is
 * the thing that lets the guard move her.
 *
 * ⚠️ IT IS PASSED WHAT THE PERSON TYPED AND NORMALISES ON THE WAY IN
 * (`redeemArgs`), so the string that was CLASSIFIED by length is the string that
 * is SPENT. `0028` normalises inside the hash as well, and the two agree.
 */
export async function redeemInvite(typed: string): Promise<Redeemed> {
  const { data, error } = await supabase.rpc(REDEEM_INVITE, redeemArgs(typed));
  if (error) throw reported(error);
  return redeemedFrom(data);
}

/**
 * Asks to join a shop by its code, and returns what became of the ask
 * (5b-iii-b).
 *
 * ⚠️ THE CALLER BELONGS TO NO SHOP WHEN THIS RUNS — `redeemInvite`'s situation,
 * and `request_access` is `security definer` for the same reason plus one more:
 * `0029`'s `D6` refuses the select policy that would let a stranger SCAN for
 * shops, so the code is resolved WHOLE inside the function and never matched
 * against a list this app could read.
 *
 * ⚠️⚠️ IT IS NOT ALWAYS AN ASK. `0029`'s `D7` absorbs a pending invite: a person
 * who was already invited by email and types the shop code instead of the token
 * is let straight in, and the answer comes back `joined` rather than
 * `requested`. `outcomeFrom` is where that is read, and `useRequestAccess` is
 * what makes the guard notice.
 *
 * ⚠️ IT IS PASSED WHAT THE PERSON TYPED AND NORMALISES ON THE WAY IN
 * (`requestAccessArgs`), so the string that was CLASSIFIED by length is the
 * string that is SENT — `redeemInvite`'s rule, through the same normaliser.
 */
export async function requestAccess(typed: string): Promise<AccessOutcome> {
  const { data, error } = await supabase.rpc(REQUEST_ACCESS, requestAccessArgs(typed));
  if (error) throw reported(error);
  return outcomeFrom(data);
}

/**
 * What this account has asked for, and what became of it (5b-iii-b).
 *
 * ⚠️⚠️ IT IS THE ONLY WAY SHE CAN EVER SEE A ROW OF HER OWN, AND THAT IS WHY IT
 * IS A FUNCTION AND NOT A SELECT (`S3`). `workspace_invite_select` (`0002:563`)
 * is manager-and-above; somebody who has just asked to join has NO ROLE AT ALL,
 * so no policy can show her the row she just created. The cheap-looking fix — a
 * select policy keyed on the requester — is exactly what `D6` rules out, because
 * it is one predicate away from letting a stranger enumerate shops.
 *
 * ⚠️ IT IS KEYED ON `auth.uid()` INSIDE THE FUNCTION and takes no argument at
 * all, so there is nothing a screen could pass to read somebody else's. `0029`'s
 * decision 1: an email is mutable and a status read that moves with it is a way
 * to read another person's.
 *
 * ⚠️ AN EMPTY ARRAY IS AN ANSWER, NOT A FAILURE — the rule `myWorkspaces` sets.
 * It is what every founding owner who lands on this screen gets.
 */
export async function myAccessRequests(): Promise<AccessRequestRow[]> {
  const { data, error } = await supabase.rpc(MY_ACCESS_REQUESTS);
  if (error) throw reported(error);
  return (data ?? []) as AccessRequestRow[];
}

/**
 * Who is waiting to be let into ONE shop, and what to call her (5b-iii-d-1).
 *
 * ⚠️⚠️ IT IS `security definer` BECAUSE THE NAME IS NOT ON ANY TABLE THIS CALLER
 * MAY READ. A person who has asked to join has NO `workspace_member` row until
 * `approve_request` writes one, so there is nothing carrying `display_name` to
 * join to; the only place her name exists is `auth.users.raw_user_meta_data`,
 * which §2.7 never exposes and which exactly one function in the schema reads.
 * `0037` is that function's second caller. The EMAIL, by contrast, was already
 * reachable — `workspace_invite_select` is manager-and-above — so this read
 * widens exactly one column.
 *
 * ⚠️⚠️ A NON-OWNER GETS `[]` AND NOT A 403, WHICH IS WHY `canApprove` IS A
 * CLIENT-SIDE FENCE AND NOT AN ERROR HANDLER — `workspaceInvites`' arrangement,
 * and here it is deliberate on the server's side too. `0037`'s decision 2
 * refuses with an empty list rather than `42501`, because that SQLSTATE is
 * already carrying two meanings on this path and a third is the overload
 * `@/api/requests` is currently guessing around. So the empty answer is a
 * REFUSAL and an EMPTY QUEUE at once, and only `canApprove` — asked before the
 * call — can tell a screen which one it is looking at.
 *
 * ⚠️ IT IS WORKSPACE-SCOPED and takes the id, rather than fanning out over
 * `my_workspaces()`: `0001:317` admits many shops per person from day one, and
 * approving is per-shop. `0037`'s decision 5.
 */
export async function pendingAccessRequests(workspaceId: string): Promise<PendingRequestRow[]> {
  const { data, error } = await supabase.rpc(
    PENDING_ACCESS_REQUESTS,
    pendingRequestsArgs(workspaceId),
  );
  if (error) throw reported(error);
  return (data ?? []) as PendingRequestRow[];
}

/**
 * Lets one person in (5b-iii-d-2) — and it is the only call in this app that
 * writes a `workspace_member` row somebody else will use.
 *
 * ⚠️⚠️ IT WRITES TWO TABLES IN ONE STATEMENT AND BOTH INSERT POLICIES ARE
 * OWNER-ONLY (`0001`). That is why the fence one module up is `canApprove` and
 * not `canInvite`: `create_invite` is manager-and-above because an invite is a
 * row nobody can use until it is redeemed, and this is the membership itself.
 * `0029`'s decision 6.
 *
 * ⚠️⚠️ AND IT IS IDEMPOTENT, WHICH IS NOT A NICETY ON THIS CONNECTION. The pilot
 * store is offline a lot; a tap that appears to do nothing is tapped again.
 * `0029:381` answers the second one with the membership and `already_approved`,
 * rather than raising — so `approvedFrom` treats it as the success it is, and
 * the screen must not invent a refusal the database does not have.
 *
 * ⚠️ THE LOCATION ARRAY IS `D8` AND IS NOT A CONVENIENCE. An approved staff
 * member with no `member_location` row writes NOTHING, silently, for the rest of
 * her time in the shop; `checkApproval` is what stops this being called with an
 * empty one, and `0029:407` raises `22023` if it ever is.
 */
export async function approveRequest(draft: ApprovalDraft): Promise<Approved> {
  const { data, error } = await supabase.rpc(APPROVE_REQUEST, approveArgs(draft));
  if (error) throw reported(error);
  return approvedFrom(data);
}

/**
 * Fixes the caller's OWN name in ONE shop, and returns the name that was stored
 * (5b.8-iii-b).
 *
 * ⚠️⚠️ THERE IS NO ARGUMENT THAT COULD NAME ANYBODY ELSE. `0035` puts
 * `user_id = auth.uid()` in its own `where` clause — not "the caller may only
 * pass her own id", which is a rule a client could get wrong, but no id to pass
 * at all. So this wrapper cannot be misused by a screen, which is why the
 * control it serves is a text box and not an editor with a subject.
 *
 * ⚠️ IT IS `security definer` BECAUSE THE FENCE HAS TO BE PER-COLUMN.
 * `workspace_member_update` (`0001:532`) is owner-only, and the policy that
 * would have been easier — "you may update your own row" — hands every cashier
 * her own `role`, because RLS filters ROWS and not COLUMNS.
 *
 * ⚠️ IT RETURNS THE STORED NAME, and the screen renders THAT rather than what it
 * typed. `storedNameFrom` throws instead of falling back to the input, because
 * the fallback is the divergence the return value exists to prevent.
 */
export async function setMyDisplayName(workspaceId: string, typed: string): Promise<string> {
  const { data, error } = await supabase.rpc(
    SET_MY_DISPLAY_NAME,
    setMyDisplayNameArgs(workspaceId, typed),
  );
  if (error) throw reported(error);
  return storedNameFrom(data);
}

/**
 * One queued write, sent (5c-ii-a). The four `record_*` functions are one
 * wrapper here rather than four, ⚠️ **and that is not a shortcut**: a flush
 * does not know which kind it is holding until it reads the row, so four
 * wrappers would need a fifth thing to choose between them — which is the
 * mapping `RECORD_RPC` already is, in a module the suite can read (`R13`).
 *
 * ⚠️ IT TAKES ARGUMENTS ALREADY BUILT. `sendArgs` decides the `p_` names, the
 * `occurred_at` fallback and `recorded_offline`; none of those is a decision
 * this file may hold, because no node suite can load it.
 *
 * ⚠️ IT THROWS, like every other wrapper — and `classify` in `@/api/deadletter`
 * is what tells a transient throw from a permanent one.
 */
export async function sendQueuedWrite(
  kind: WriteKind,
  args: Readonly<Record<string, unknown>>,
): Promise<unknown> {
  const { data, error } = await supabase.rpc(RECORD_RPC[kind], args);
  if (error) throw reported(error);
  return data;
}

/**
 * One permanently rejected write, dead-lettered and the shelf downgraded with
 * it, in one transaction (5c-iii).
 *
 * ⚠️⚠️ IT IS THE ONLY CALL IN THIS APP THAT MOVES STOCK, and it moves it
 * without anybody choosing a quantity: `0024` derives every movement from a
 * payload a `record_*` function already refused, which is why §2.7's manager
 * fence on stock adjustment is NOT on this grant. The person whose write was
 * rejected is usually a cashier, and §2.6's exception exists for exactly her —
 * a fence here would refuse the report in its commonest case.
 *
 * ⚠️ IT TAKES ARGUMENTS ALREADY BUILT, like `sendQueuedWrite`. `reportArgs`
 * decides the `p_` names, hands the payload over UNTOUCHED so `0026` can replay
 * it, and reads the location out of it by name; none of those is a decision
 * this file may hold, because no node suite can load it.
 *
 * ⚠️ IT THROWS, and `createFlusher` reads a throw here as a failed REPORT — the
 * row goes back to `pending` rather than to `dead`. A row marked dead with no
 * `failed_write` row behind it is the one outcome in the whole queue that loses
 * a sale outright.
 */
export async function reportFailedWrite(
  args: Readonly<Record<string, unknown>>,
): Promise<unknown> {
  const { data, error } = await supabase.rpc(RECORD_FAILED_WRITE, args);
  if (error) throw reported(error);
  return data;
}

/**
 * The shop's catalog, in ONE round trip: every variant, its family, and
 * whatever price is in force TODAY. Plan task 5d-i, and the first read in this
 * app that is about what a shop sells rather than who works in it.
 *
 * ⚠️⚠️ THE DATE IS THE DEVICE'S AND IT IS COMPUTED HERE RATHER THAN SENT BY
 * THE SERVER, because there is no server call in this app that knows what day
 * it is where the shop stands. `isoDay` takes the LOCAL day for the reason its
 * own comment gives; a UTC day would move a price change half an afternoon
 * early in Mexico.
 *
 * ⚠️ THE WINDOW IS TWO FILTERS ON AN EMBEDDED RESOURCE, not one on a range
 * column — `valid_period=cs.<date>` is a 400, measured. `effective_from` is
 * narrowed with `lte` and the open end with an `or`, both scoped to
 * `price_list` through `referencedTable`, so the variant rows themselves are
 * untouched: a product with no price still comes back, with an empty array,
 * which is what C3.12's dash is drawn from.
 *
 * ⚠️ THE ORDER IS THE DATABASE'S (`order=name`), and nothing re-sorts it on the
 * phone — see `catalogFrom`.
 */
export async function catalogVariants(): Promise<VariantRow[]> {
  const today = isoDay(new Date());
  const { data, error } = await supabase
    .from('product_variant')
    .select(CATALOG_SELECT)
    .lte(`${PRICE_TABLE}.${PRICE_STARTS_COLUMN}`, today)
    .or(priceEndsAfter(today), { referencedTable: PRICE_TABLE })
    .order(CATALOG_ORDER_COLUMN);
  if (error) throw reported(error);
  return (data ?? []) as unknown as VariantRow[];
}

/**
 * The ten units, and the factors that turn one into another.
 *
 * ⚠️ `unit_read_all` IS `using (true)` (`0001`) — the table is global reference
 * data with no workspace column, because factors are physics. So this read is
 * the one in this app that is not fenced by tenancy, and that is the policy's
 * decision rather than an oversight here.
 *
 * ⚠️ IT IS A SEPARATE QUERY AND NOT AN EMBED, deliberately. `product_variant`
 * has four unit columns and PostgREST would need a hint for each; ten rows that
 * change once a migration are better cached under their own key than fetched
 * once per variant.
 */
export async function catalogUnits(): Promise<UnitRow[]> {
  const { data, error } = await supabase.from('unit').select(UNIT_COLUMNS);
  if (error) throw reported(error);
  return (data ?? []) as unknown as UnitRow[];
}

/**
 * Today's sale documents — the read §2.8's Home row has asked for since the ADR
 * was written and no line in this app has ever performed. Plan task `5d-iv-a`.
 *
 * ⚠️⚠️ THE DAY BOUNDARY IS THE DEVICE'S AND IT IS COMPUTED HERE RATHER THAN SENT
 * BY THE SERVER, exactly as `catalogVariants` above computes the price window's
 * date and for the same reason: no call in this app knows what day it is where
 * the shop stands. ⚠️ `today.ts`'s header is where the harder half of that lives
 * — `0012` put the shop's zone on `location`, and reading it would need
 * `Intl.DateTimeFormat`, which `R5` and `R10` both refuse until somebody has put
 * it on an iPhone and an Android and looked.
 *
 * ⚠️ ONE FILTER AND NO UPPER BOUND, WHICH IS THE SCHEMA'S DOING RATHER THAN AN
 * OVERSIGHT. `0003` clamps `occurred_at` to `[now() - 72h, now()]`, so no row can
 * be in the future and `gte` alone is the whole window.
 *
 * ⚠️ NO `location_id` FILTER, AND THAT IS THE POLICY'S DECISION RATHER THAN
 * THIS FILE'S. `sale_select` (`0003`) is
 * `workspace_id in (select my_workspaces()) and location_id in (select my_locations())`,
 * so a cashier already reads her own store and a manager reads every store she
 * covers — which is *"the shop's takings today"*, the reading §2.8 asks for.
 * C1.5 makes both pilot shops one location each, so today the two are the same
 * question.
 */
export async function todaySales(): Promise<SaleRow[]> {
  const { data, error } = await supabase
    .from('sale')
    .select(SALE_COLUMNS)
    .gte(TODAY_COLUMN, dayStartISO(new Date()));
  if (error) throw reported(error);
  return (data ?? []) as unknown as SaleRow[];
}

/**
 * THE SHOP MAKING A PRODUCT — three rows, in the order `WRITE_ORDER` gives, and
 * the only write in this app that is three round trips rather than one RPC.
 * Plan task `5e-i`.
 *
 * ⚠️⚠️ IT RETURNS AN OUTCOME AND DOES NOT THROW, WHICH IS THE OPPOSITE OF EVERY
 * OTHER FUNCTION IN THIS FILE, AND THE REASON IS THAT THERE IS NO TRANSACTION.
 * This file's own header says a wrapper throws so TanStack can decide `isError`
 * from a rejected promise — true of a single call, where failure means nothing
 * happened. Here failure can mean two rows landed and one did not, and a thrown
 * error carries no room for the ids that did. `CreateOutcome` is that room, and
 * `retryDraft` is what the next attempt needs out of it.
 *
 * ⚠️ THE ARITHMETIC IS `@/api/catalogWrite`'s AND NOT THIS FILE'S (`R3`, `R13`):
 * the peso figure, the fan-out and the row shapes all arrive from the module
 * `app/test/api-catalog-write.test.ts` can load. What is left here are the three
 * lines that talk.
 *
 * ⚠️ THE TABLES ARE READ OUT OF `WRITE_ORDER` BY INDEX rather than spelled
 * three times, so the order this file posts in is the order that array claims —
 * which is what `docs/checks/5e-i-catalog-write-contract.sh` drives against a
 * real PostgREST.
 */
export async function createProduct(
  workspaceId: string,
  draft: ProductDraft,
  factors: UnitFactors,
  // ⚠️ THE BASES COME FROM THE SAME UNIT READ AS THE FACTORS, and they are what
  // `base_unit_code` is written from as of 2026-09-24. See `unitColumns`: the
  // form used to write the picked unit into all four columns, and every product
  // it made was refused by `record_sale` for it.
  bases: UnitBases,
  now: Date = new Date(),
): Promise<CreateOutcome> {
  const [FAMILY, VARIANT, PRICE] = WRITE_ORDER;

  // ⚠️⚠️ THE PRICE IS WORKED OUT BEFORE ANYTHING IS WRITTEN, AND THE ORDER OF
  // THESE LINES IS THE DIFFERENCE BETWEEN NO PRODUCT AND A PRICELESS ONE BY
  // ACCIDENT. `pricePerBase` answers null when the figure will not convert —
  // which includes the case where the `unit` read has not landed and `factors`
  // is empty — and computing it AFTER the two inserts would leave a real
  // product on Productos wearing C3.12's dash, created by a phone that never
  // had the factors to price it. That is now indistinguishable on the shelf
  // from a product the shopkeeper MEANT to leave priceless, which is exactly
  // why it has to be caught here rather than there.
  //
  // ⚠️⚠️ AN OMITTED PRICE IS NOT THAT, AND THE TWO ARE TOLD APART BY
  // `priceOmitted` RATHER THAN BY A NULL — the owner's ruling of 2026-09-22.
  // An empty box is a two-row create; a box holding something unreadable is a
  // draft `checkProduct` refuses at the form and this refuses again here,
  // reporting the FIRST step so `retryDraft` carries nothing forward and
  // nothing was written.
  const omitted = priceOmitted(draft.pricePesos);
  const centavos = omitted ? null : parsePesos(draft.pricePesos);
  const perBase =
    centavos === null ? null : pricePerBase(centavos, factors[draft.unitCode] ?? '');
  if (!omitted && perBase === null) {
    return { ok: false, failed: FAMILY, familyId: null, variantId: null, error: null };
  }

  let familyId = draft.familyId;

  if (familyId === null) {
    const { data, error } = await supabase
      .from(FAMILY)
      .insert(familyRow(workspaceId, draft.familyName))
      .select(INSERT_RETURNING)
      .single();
    if (error) {
      return { ok: false, failed: FAMILY, familyId: null, variantId: null, error: reported(error) };
    }
    familyId = (data as { id: string }).id;
  }

  const variant = await supabase
    .from(VARIANT)
    .insert(variantRow(workspaceId, familyId, draft, bases))
    .select(INSERT_RETURNING)
    .single();
  if (variant.error) {
    return {
      ok: false,
      failed: VARIANT,
      familyId,
      variantId: null,
      error: reported(variant.error),
    };
  }
  const variantId = (variant.data as { id: string }).id;

  // ⚠️⚠️ THE THIRD ROW IS NOT POSTED AT ALL WHEN THE SHOPKEEPER LEFT THE BOX
  // EMPTY, AND THAT IS THE RULING RATHER THAN AN OPTIMISATION. A `price_list`
  // row of zero is a price the owner SET and sells at; no row is a question
  // nobody has answered — C3.12 makes them render differently on purpose, and
  // posting `0.000000` here would quietly answer the question on his behalf at
  // the one moment he deliberately declined to.
  //
  // ⚠️ WHAT NO INSTRUMENT IN THIS REPOSITORY CAN SEE (`R9`), named here rather
  // than left to be discovered: that this branch posts TWO rows and not three.
  // No suite can load this file, and the contract check builds its own bodies
  // out of the column lists rather than calling this function — so *the app
  // omits the price row* is checkable only by creating a product with an empty
  // price on a real phone and seeing C3.12's dash under it. Routed to `5e-ii`,
  // where the owner has the form in his hand.
  if (perBase !== null) {
    const { error } = await supabase
      .from(PRICE)
      .insert(priceRow(workspaceId, variantId, perBase, isoDay(now)))
      .select(INSERT_RETURNING)
      .single();
    if (error) {
      return { ok: false, failed: PRICE, familyId, variantId, error: reported(error) };
    }
  }

  return { ok: true, familyId, variantId, priced: perBase !== null };
}

/**
 * One variant's dated price rows, as the edit needs them. Plan task `5e-iii-a`.
 *
 * ⚠️⚠️ IT IS A SECOND READ OF `price_list` AND THAT IS DELIBERATE. `catalogVariants`
 * above embeds `PRICE_COLUMNS` — a figure and a scope — for every variant in the
 * shop; every branch of `priceChange` turns on a row's `id` and on which DAY it
 * started, and widening the list read to carry those would pay for them on every
 * load of Productos to serve one screen.
 *
 * ⚠️ THE WINDOW IS THE SAME WINDOW, spelled by the same two exports. A second
 * answer to *which row is in force* is a second price, and the one a shopkeeper
 * gets would be whichever screen asked.
 */
export async function variantPrices(variantId: string): Promise<PriceInForce[]> {
  const today = isoDay(new Date());
  const { data, error } = await supabase
    .from(PRICE_EDIT_TABLE)
    .select(PRICE_EDIT_COLUMNS)
    .eq('variant_id', variantId)
    .lte(PRICE_STARTS_COLUMN, today)
    .or(priceEndsAfter(today));
  if (error) throw reported(error);
  return (data ?? []) as unknown as PriceInForce[];
}

/**
 * One variant's two set-once figures, for the form that changes them. Plan task
 * `5e-iii-b`.
 *
 * ⚠️⚠️ IT EXISTS SO THE IVA BOX IS NOT BLIND. `variantSettings` sends no column
 * for a box nobody typed into, so an empty form cannot overwrite anything — but
 * a shopkeeper still has to be able to SEE what the IVA and the pack size are
 * before deciding to leave them alone, and `VARIANT_COLUMNS` in `@/api/catalog`
 * carries neither. Widening that read would pay for two columns on every load of
 * Productos, for ~100 products (C8.3), to serve one screen.
 *
 * ⚠️ `.maybeSingle()` AND NOT `.single()`, WHICH IS THE OPPOSITE CALL FROM EVERY
 * PATCH IN THIS SECTION AND FOR THE REASON THAT MAKES THOSE RIGHT. On a patch,
 * zero rows is the fence arriving through a `using` clause and must become an
 * error an app can act on; on a READ there is no fence — `product_variant_select`
 * is the whole shop — so zero rows means the catalog moved under the screen, and
 * a form that refused to open over it would be worse than one that simply shows
 * no current figures.
 */
export async function variantSettingsRow(variantId: string): Promise<VariantSettingsRow | null> {
  const { data, error } = await supabase
    .from(VARIANT_TABLE)
    .select(VARIANT_EDIT_COLUMNS)
    .eq('id', variantId)
    .maybeSingle();
  if (error) throw reported(error);
  return (data ?? null) as unknown as VariantSettingsRow | null;
}

/**
 * A rename, the two settings, or a retirement — one patch, one answer.
 *
 * ⚠️⚠️ ONE PATCH PER CALL AND NOT ONE BODY FOR ALL THREE, which is
 * `catalogEdit`'s recorded decision rather than a shape this function chose: a
 * rename can be refused `23505` while the tax rate beside it was fine, and one
 * refusal for two unrelated edits sends a shopkeeper to fix the thing that was
 * right.
 *
 * ⚠️ IT THROWS RATHER THAN ANSWERING AN OUTCOME, which is the opposite of
 * `createProduct` one function up and is the right shape here for the reason that
 * one is not: a single call either happened or did not, so there is no partial
 * state to carry and nothing for a retry to know. `changePrice` below is the one
 * that can half-happen.
 */
export async function patchVariant(
  variantId: string,
  patch: NamePatch | SettingsPatch | ActivePatch,
): Promise<void> {
  const { error } = await supabase
    .from(VARIANT_TABLE)
    .update(patch)
    .eq('id', variantId)
    .select(UPDATE_RETURNING)
    .single();
  if (error) throw reported(error);
}

/**
 * The price change, performed in the only order `price_list` accepts.
 *
 * ⚠️⚠️ CLOSE BEFORE YOU OPEN. Two rows covering today is a `23P01` from
 * `price_list_no_overlap`, so the old row's `effective_to` is patched to today
 * FIRST and only then is the new row posted. `createProduct`'s `WRITE_ORDER` is
 * the same kind of claim with a foreign key behind it instead of an exclusion.
 *
 * ⚠️⚠️ AND THE GAP BETWEEN THE TWO CALLS IS THE WORST PARTIAL STATE IN THIS APP.
 * PostgREST has no transaction. A close that lands followed by an open that does
 * not leaves the product **priced yesterday and priceless today** — on the shelf,
 * mid-morning, put there by somebody who was CORRECTING a price. That is why the
 * failure carries `closed`, why `priceChangeLine` has a sentence of its own for
 * it, and why `retryChange` re-opens rather than re-closing.
 *
 * ⚠️ `unchanged` IS NOT A ROUND TRIP. A shopkeeper who opened the price box,
 * looked and left it alone has changed nothing, and closing and re-opening an
 * identical row would write a change into the shop's own price history that never
 * happened.
 */
export async function changePrice(plan: PriceChange): Promise<PriceChangeOutcome> {
  if (plan.kind === 'unchanged') return { ok: true, changed: false };

  if (plan.kind === 'reprice') {
    const { error } = await supabase
      .from(PRICE_EDIT_TABLE)
      .update(plan.patch)
      .eq('id', plan.rowId)
      .select(UPDATE_RETURNING)
      .single();
    if (error) {
      return { ok: false, failed: 'reprice', closed: false, error: reported(error) };
    }
    return { ok: true, changed: true };
  }

  let closed = false;
  if (plan.kind === 'closeAndOpen') {
    const { error } = await supabase
      .from(PRICE_EDIT_TABLE)
      .update(plan.closePatch)
      .eq('id', plan.closeRowId)
      .select(UPDATE_RETURNING)
      .single();
    if (error) {
      return { ok: false, failed: 'close', closed: false, error: reported(error) };
    }
    closed = true;
  }

  const { error } = await supabase
    .from(PRICE_EDIT_TABLE)
    .insert(plan.open)
    .select(INSERT_RETURNING)
    .single();
  if (error) {
    return { ok: false, failed: 'open', closed, error: reported(error) };
  }
  return { ok: true, changed: true };
}

/**
 * Hands the error back, having put a developer's sentence in the console if it
 * is a developer's error.
 *
 * ⚠️ THE CONSOLE AND NEVER THE SCREEN, the rule `AuthProvider` already follows
 * for a failed OAuth round trip: a contract mismatch names a misconfiguration
 * of ours, and the only person who can act on it is not the one holding the
 * phone.
 */
function reported(error: unknown): unknown {
  if (isContractMismatch(error)) {
    const detail = (error as { message?: unknown }).message;
    console.warn(`[api] this app and the database disagree about an RPC: ${String(detail)}`);
  }
  return error;
}
