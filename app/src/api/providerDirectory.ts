import { ROLES, type Role } from '@/api/members';
import { searchTerm } from '@/api/catalog';
import { apiErrorMessage, type ApiMessageKey } from '@/api/errors';
import { type Provider } from '@/api/providers';
import { ES } from '@/strings';

// ============================================================================
// PROVEEDORES — THE DIRECTORY, AND THE FIRST THING IN THIS APP THAT WRITES A
// `provider` ROW. Plan task `6b`.
//
// ⚠️ NO SCREEN AND NO COMPONENT — `@/api/providers`' own arrangement, for the
// reason that file gives: everything decided here has a right answer
// `app/test/api-provider-directory.test.ts` can read, and
// `docs/checks/6b-provider-directory-contract.sh` drives the same strings
// against a real PostgREST.
//
// ----------------------------------------------------------------------------
// ⚠️⚠️ THE LIST IS `useProviders`' READ AND NOT A SECOND ONE, WHICH IS THE ONE
// STRUCTURAL DECISION IN THIS FILE
// ----------------------------------------------------------------------------
// The obvious shape was a directory query of its own — `provider` with every
// column, ordered by name. It is refused here, and the reason is a correctness
// property rather than a saving: **Comprar's picker and this directory would
// then be two answers to *which suppliers exist*.** `providersFrom` drops
// `is_active` false rows and promotes the generic one; a directory that filtered
// differently would show a supplier Comprar cannot buy from, or hide one it
// offers, and nothing in this repository could see the disagreement. So the list
// draws `PROVIDERS_KEY`'s rows through `providersFrom` — the same cache, the same
// rule — and this module adds only the rows the list needs that a `Provider` has
// no field for.
//
// ⚠️ THE CONSEQUENCE IS THAT A LIST ROW HAS A NAME AND NOTHING ELSE,
// because `PROVIDER_COLUMNS` is `id,name,is_generic,is_active` and
// `docs/checks/5g-i-purchase-contract.sh` asserts BY NAME that `contact_name`,
// `phone` and `address_line1` do not reach a phone through it. ⚠️⚠️ **THAT
// ASSERTION IS NOT WEAKENED BY THIS TASK AND MUST NOT BE**: it says a column
// *Comprar* never draws never arrives on Comprar's read, and its own comment
// names this row as where those three belong. They arrive through
// `DETAIL_COLUMNS` below, on a screen reached by tapping one supplier.
//
// ⚠️⚠️ SO A LIST ROW CARRIES A NAME AND NO PHONE NUMBER, AND THAT IS THE ONE
// THING ABOUT THIS SCREEN THE OWNER IS MOST LIKELY TO ASK FOR. A `Sin teléfono`
// string was written for it and then DELETED rather than left unused: putting the
// number on the row means widening `PROVIDER_COLUMNS`, which is the constant
// `docs/checks/5g-i-purchase-contract.sh` bans those three columns from BY NAME —
// so it is a check to amend and an argument to make, not a field to add. It is
// parked in ⛔ DECISIONS OWED with that cost attached.
//
// ----------------------------------------------------------------------------
// ⚠️⚠️ WHAT A CASHIER SEES HERE, AND IT IS THE APPLIED POLICY AND NOT A NEW RULE
// ----------------------------------------------------------------------------
// `0002` fences this table in exactly one direction:
//
//     provider_select   →  workspace_id in (select my_workspaces())   — everyone
//     provider_insert   →  has_role(workspace_id, 'manager')
//     provider_update   →  has_role(workspace_id, 'manager')
//     (no delete policy at all)
//
// `canWriteProviders` is that second and third line and nothing more. A cashier
// reaches the directory, reaches a supplier's detail, and is handed no create row
// and no controls — which is `catalogRows`' treatment of the same fence one table
// over, and [[shift-cover-is-a-reassignment]]'s shape: plainly absent beats
// looking live and refusing silently.
//
// ⚠️⚠️ AND SHE IS **NOT** KEPT OFF THE DETAIL SCREEN, WHICH IS WHERE THIS PARTS
// COMPANY WITH `producto/[id]`. `canWriteCatalog` keeps her off that screen
// entirely — but that screen is a FORM with no read-only state, and `Proveedores`
// is a directory whose whole purpose is looking something up. The predicate
// follows the applied policy and never leads it (`canReadMemory`'s own rule), and
// `provider_select` admits her. ⚠️ **It does mean a supplier's `phone` and
// `address_line1` reach a cashier's phone**, which is a decision this task took
// on the owner's behalf and parked in ⛔ DECISIONS OWED. Reversing it is one
// predicate on the detail screen: no migration, no data.
//
// ----------------------------------------------------------------------------
// ⚠️⚠️ THERE IS NO DELETE, AND THE WORD ON THE CONTROL SAYS SO
// ----------------------------------------------------------------------------
// `0002` gives `provider` no DELETE policy, and `provider_protect_generic`
// additionally raises `restrict_violation` on a DELETE or a demotion of the
// generic row. So retiring is `is_active` false — `producto/[id]`'s treatment of
// the identical absence — and `ES.providers.edit.retire` is *Quitar proveedor*.
//
// ⚠️⚠️ AND IT IS ONE-WAY, WHICH IS THE OWNER'S RULING OF 2026-09-23 APPLIED
// RATHER THAN A GAP. He described retiring a product in his own words — it
// *"leaves the catalog and stays in the transactions and the history"* — and
// asked for no way back. `providersFrom` drops a retired supplier, so nothing in
// this app can reach one to reactivate it, and `ES.providers.edit.retireOnce`
// states that rather than apologising for it. ⚠️ **Whether a SUPPLIER deserves
// the same answer as a PRODUCT was a real question — a seasonal supplier is a
// thing a shop stops and restarts, where a product retired in the wrong family
// is not.** ✅ **RULED 2026-09-28 by the owner, the thirty-fourth ruling: *"Leave
// Quitar proveedor one-way, as recommended."*** A regretted retirement is a
// support call during the pilot, revisited on a real complaint. **Reversing it costs a
// `Reactivar` control and one filter, not a migration** — `provider_update`
// already grants the write in both directions.
//
// ⚠️⚠️ THE GENERIC ROW CANNOT BE RETIRED AND THE FENCE IS **HERE**, NOT IN THE
// DATABASE. `provider_protect_generic` refuses to delete it and refuses to
// demote it and **stops there** — nothing prevents `is_active` false. A shop whose
// catch-all supplier had been switched off would open Comprar with no default and
// `record_purchase` refusing every delivery for want of a counterparty;
// `providersFrom` compensates by keeping it whatever `is_active` says, so the
// damage would be a row the directory hides and the picker still offers. `canRetire`
// is what stops the tap, and `docs/checks/6b-provider-directory-contract.sh`
// measures that the DATABASE would have allowed it — because a fence that exists
// only in a client is a fence worth writing down.
// ============================================================================

// ----------------------------------------------------------------------------
// THE DETAIL READ — one supplier, and the three columns Comprar never asks for
// ----------------------------------------------------------------------------

/** The table, spelled once (`R13`). Shared with `@/api/providers`' list read. */
export const DIRECTORY_TABLE = 'provider';

/**
 * Everything the detail screen draws, for ONE supplier.
 *
 * ⚠️⚠️ `is_active` IS HERE AND THE SCREEN NEEDS IT, even though a retired supplier
 * is unreachable from the list: the row can be retired on ANOTHER phone while this
 * one holds the detail open, and a form that saved into it would be writing to a
 * supplier the shop has stopped using. ⚠️ `is_generic` is here because `canRetire`
 * reads it — see the header.
 *
 * ⚠️ `normalized_name` IS NOT HERE AND MUST NOT BE. It is `generated always` and
 * carries the uniqueness constraint; a phone that held it would be holding a
 * second answer to *what is this supplier called*, and `searchTerm` is what folds
 * a name for comparison here. `docs/checks/5g-i-purchase-contract.sh` bans it from
 * the list read by name and this file bans it by omission.
 */
export const DETAIL_COLUMNS =
  'id,name,is_generic,is_active,contact_name,phone,address_line1';

/**
 * The column the detail read filters on.
 *
 * ⚠️ SPELLED ONCE BECAUSE `calls.ts` BUILDS THE FILTER AND THE CONTRACT CHECK
 * READS IT — the `MEMORY_PROVIDER_COLUMN` arrangement one file over. A check that
 * typed `id` in itself would be a check agreeing with its own guess.
 */
export const DETAIL_ID_COLUMN = 'id';

/** The query key one supplier's detail caches under. */
export function providerKey(id: string | null): readonly unknown[] {
  return ['providers', 'detail', id ?? ''];
}

/** A `provider` row as PostgREST sends it to the detail screen. */
export interface ProviderDetailRow {
  readonly id: string;
  readonly name: string;
  readonly is_generic: boolean;
  readonly is_active: boolean;
  readonly contact_name: string | null;
  readonly phone: string | null;
  readonly address_line1: string | null;
}

/** One supplier, as the detail screen needs it and with no rendering in it. */
export interface ProviderDetail {
  readonly id: string;
  readonly name: string;
  readonly isGeneric: boolean;
  readonly isActive: boolean;
  /** ⚠️ `''` AND NOT `null`, for the reason `detailFrom` gives. */
  readonly contact: string;
  readonly phone: string;
  readonly address: string;
}

/**
 * The detail screen's subject, or `null` when the read has not landed or came
 * back empty.
 *
 * ⚠️⚠️ THE THREE NULLABLE COLUMNS BECOME `''` AND THAT IS NOT COSMETIC. Each one
 * is about to be a `TextInput`'s `value`, and React Native treats `null` there as
 * *uncontrolled* — a box that accepts typing and then loses it on the next render
 * the shopkeeper cannot explain. The dash a person READS is
 * `ES.providers.fields.blank`, applied by the screen to an empty string; the
 * difference between *nothing here* and *not back yet* is carried by this
 * function returning `null` for the second, which is `costShown`'s argument about
 * `''` versus C3.12's dash pointed at a contact instead of a price.
 */
export function detailFrom(
  row: ProviderDetailRow | null | undefined,
): ProviderDetail | null {
  if (row === null || row === undefined) return null;
  return {
    id: row.id,
    name: row.name,
    isGeneric: row.is_generic,
    isActive: row.is_active,
    contact: row.contact_name ?? '',
    phone: row.phone ?? '',
    address: row.address_line1 ?? '',
  };
}

// ----------------------------------------------------------------------------
// THE FENCE — `provider_insert` and `provider_update`, as a predicate
// ----------------------------------------------------------------------------

/**
 * May the person holding this phone change the shop's suppliers?
 *
 * ⚠️ IT IS NOT `canWriteCatalog` AND MUST NOT BE ALIASED TO IT, which is the
 * lesson `canReadMemory` paid for over four days: two predicates that answer
 * *manager and above* today are still two different questions, and `0040`
 * loosened one of them while leaving the other exactly where it was. Had they
 * been aliased, editing a shop's SUPPLIERS would have opened with the delivery
 * reads.
 *
 * ⚠️ `null` IS "NOT KNOWN" AND IS FENCED OUT, `roleOf`'s distinction: answering
 * `true` while the membership read is in flight would draw a create row on a
 * phone that has not been told who is holding it, and the tap would be a 403.
 */
export function canWriteProviders(role: Role | null): boolean {
  if (role === null) return false;
  return ROLES.indexOf(role) <= ROLES.indexOf('manager');
}

/**
 * May THIS supplier be retired?
 *
 * ⚠️⚠️ TWO REASONS A CONTROL CAN BE ABSENT, KEPT AS TWO THINGS. `mayWrite` is a
 * question about the PERSON and `isGeneric` is a question about the ROW — the
 * shape `producto/[id]` arrived at when the owner ruled that a shopkeeper may
 * delete only the products he created. Folding them into one boolean would make
 * *you are not allowed* and *this one cannot go* indistinguishable in a log.
 *
 * ⚠️ AND AN ALREADY-RETIRED SUPPLIER IS THE THIRD: the control is absent rather
 * than idempotent, because a second `is_active = false` is a 200 that changes
 * nothing and reads to a shopkeeper as having worked.
 */
export function canRetire(
  detail: ProviderDetail | null,
  mayWrite: boolean,
): boolean {
  if (detail === null || !mayWrite) return false;
  if (detail.isGeneric) return false;
  return detail.isActive;
}

// ----------------------------------------------------------------------------
// THE LIST — Proveedores, where a supplier gets created
// ----------------------------------------------------------------------------

/** One run of inner whitespace, and no edges. What a typed name is worth. */
function collapse(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

/**
 * Does this supplier match what has been typed?
 *
 * ⚠️ `searchTerm` IS `@/api/catalog`'s AND IS IMPORTED RATHER THAN RE-WRITTEN.
 * It folds case, collapses whitespace and folds the seven Spanish accents, which
 * is `0002`'s own division of labour — *"search-time folding belongs in the
 * query"* — and a second fold in this file would be a second answer to whether
 * `Bodega Peña` matches `pena`.
 */
export function matchesProvider(provider: Provider, typed: string): boolean {
  const term = searchTerm(typed);
  if (term === '') return true;
  return searchTerm(provider.name).includes(term);
}

/** One row of Proveedores: a supplier, or the door to making one. */
export type ProviderRowView =
  | { readonly kind: 'provider'; readonly provider: Provider }
  | { readonly kind: 'create'; readonly name: string };

/**
 * Proveedores, as rows — including the create row, when there is one.
 *
 * ⚠️⚠️ THE CREATE ROW APPEARS ONLY WHEN THE SEARCH FOUND NOTHING, AND ON THIS
 * SCREEN THE ANTI-DUPLICATE ARGUMENT IS SHARPER THAN IT WAS ON PRODUCTOS.
 * `provider_name_unique` is on `normalized_name`, which folds case and whitespace
 * and **does not fold accents** — so *Bodega Centro* and *Bodega del Centro* are
 * two rows the database accepts happily, and a shop holding both has
 * `provider_price_memory` split down the middle: two prefills for one supplier,
 * each missing half of what was paid. **The list is what prevents that, and it
 * only prevents it if it is read before the door opens.**
 *
 * ⚠️ A BLANK BOX IS NOT A SEARCH THAT FOUND NOTHING — `catalogRows`' rule, and
 * here it cannot fire anyway: `onboard_workspace` seeds the generic supplier and
 * `providersFrom` keeps it whatever `is_active` says, so an empty box always
 * matches at least one row. The guard stays because *always* is a claim about the
 * seed, and this function must not depend on it.
 *
 * ⚠️ THE FENCE IS APPLIED HERE AND NOT IN THE SCREEN (`R3`): `mayCreate` comes
 * from `canWriteProviders`, and a cashier gets a list with no create row in it.
 * The one thing this function must never do is return a door she will be refused.
 */
export function providerRows(
  providers: readonly Provider[],
  typed: string,
  mayCreate: boolean,
): readonly ProviderRowView[] {
  const rows: ProviderRowView[] = providers
    .filter((provider) => matchesProvider(provider, typed))
    .map((provider) => ({ kind: 'provider', provider }) as ProviderRowView);
  if (rows.length > 0) return rows;
  if (!mayCreate) return rows;
  const name = collapse(typed);
  if (name === '') return rows;
  return [{ kind: 'create', name }];
}

/**
 * The one line the list shows when it has no rows at all — three different facts,
 * kept apart. `catalogLine`'s arrangement.
 *
 * ⚠️⚠️ FAILURE OUTRANKS LOADING, WHICH IS `catalogLine`'s MEASURED FIX AND NOT A
 * STYLE. TanStack retries twice, so a query that has already failed can still be
 * fetching — and a screen preferring *loading* goes back to the endless spinner on
 * every retry. A read that has failed says so, even while it tries again.
 *
 * ⚠️ AND IT NEVER SAYS *todavía no tienes proveedores* ON A FAILURE, which is the
 * sentence a shopkeeper would act on: she would go and add a supplier she already
 * has, because the app told her the shop had none when the truth is that the app
 * could not ask.
 *
 * ⚠️ IT RETURNS THE SENTENCE AND NOT A KEY because it chooses between TWO
 * namespaces — `ES.api.errors` and `ES.providers.empty` — and a key alone cannot
 * say which it belongs to. `catalogLine` carries the identical argument.
 */
export function providerLine(
  loading: boolean,
  typed: string,
  failed: ApiMessageKey | null,
): string {
  if (failed !== null) return ES.api.errors[failed];
  if (loading) return ES.providers.empty.loading;
  if (collapse(typed) !== '') return ES.providers.empty.noMatch;
  return ES.providers.empty.none;
}

// ----------------------------------------------------------------------------
// WHAT GETS WRITTEN — the insert, the patch, and what is refused before either
// ----------------------------------------------------------------------------

/**
 * The four columns an insert sends, and the one it must not.
 *
 * ⚠️⚠️ `workspace_id` IS SENT AND IS **NOT** DERIVED BY THE DATABASE. `provider`
 * has no default for it and `provider_insert`'s `with check` reads it, so an
 * insert that omitted it is a `23502` rather than a row in the wrong shop — which
 * is the failure worth having, and it is why `createProvider` takes the workspace
 * as an argument instead of reading it out of a hook.
 *
 * ⚠️ `is_generic` IS NOT HERE AND CANNOT BE. Exactly one per workspace, created by
 * `onboard_workspace`, and `provider_one_generic_per_workspace_idx` is a partial
 * unique index — so a second one is a `23505` on an index whose name says nothing
 * a shopkeeper could act on. Nothing in this app offers the flag.
 *
 * ⚠️ `is_active` IS NOT HERE EITHER: the column defaults to `true`, and sending it
 * would be this app restating a default it does not own.
 */
export const INSERT_COLUMNS = 'workspace_id,name,contact_name,phone,address_line1';

/** `{ name }`. What a rename patches. */
export const NAME_PATCH_COLUMNS = 'name';
/** `{ contact_name, phone, address_line1 }`. What the other three patch. */
export const CONTACT_PATCH_COLUMNS = 'contact_name,phone,address_line1';
/** `{ is_active }`. What `Quitar proveedor` patches. */
export const ACTIVE_PATCH_COLUMNS = 'is_active';

/**
 * ⚠️⚠️ WHAT AN INSERT AND A PATCH BOTH ASK BACK, AND ON THE PATCH IT IS THE ONLY
 * WAY THE FENCE IS VISIBLE. An RLS UPDATE refusal is **200 with `[]`** — the row
 * goes invisible rather than forbidden — so a PATCH that asked for nothing back
 * would report success to a cashier whose write never happened
 * ([[rls-update-refusal-is-a-200]]). `.single()` turns the empty answer into
 * `PGRST116`, which `providerWriteErrorMessage` maps to `notAllowed`.
 */
export const WRITE_RETURNING = 'id';

/** What the shopkeeper typed into the four boxes, before anything is decided. */
export interface ProviderDraft {
  readonly name: string;
  readonly contact: string;
  readonly phone: string;
  readonly address: string;
}

/** An empty form. ⚠️ `''` throughout, `detailFrom`'s reason. */
export const EMPTY_DRAFT: ProviderDraft = Object.freeze({
  name: '',
  contact: '',
  phone: '',
  address: '',
});

/** What one supplier's form starts holding. */
export function draftOf(detail: ProviderDetail): ProviderDraft {
  return {
    name: detail.name,
    contact: detail.contact,
    phone: detail.phone,
    address: detail.address,
  };
}

/** The `provider` row an insert sends. `INSERT_COLUMNS`. */
export interface ProviderInsert {
  readonly workspace_id: string;
  readonly name: string;
  readonly contact_name: string | null;
  readonly phone: string | null;
  readonly address_line1: string | null;
}

/**
 * An empty optional box becomes `null` and never `''`.
 *
 * ⚠️⚠️ AND THE DIFFERENCE IS VISIBLE TO A SHOPKEEPER, WHICH IS WHY IT IS A
 * FUNCTION AND NOT AN INLINE TERNARY. `contact_name = ''` is a contact this shop
 * HAS, so `detailFrom` hands the screen `''`, the screen draws
 * `ES.providers.fields.blank`, and the two states are indistinguishable on the
 * page while being different rows in Postgres. One of them also survives a
 * `coalesce` in a report nobody has written yet. **Empty means absent, once.**
 */
function optional(typed: string): string | null {
  const value = collapse(typed);
  return value === '' ? null : value;
}

/**
 * The name, as it will be stored.
 *
 * ⚠️ COLLAPSED AND TRIMMED BECAUSE `normalize_name` WILL DO IT ANYWAY for the
 * uniqueness key — so a name stored as `Bodega  del Centro` is a name whose
 * DISPLAY disagrees with what the shop is allowed to create next. Storing the
 * folded-for-comparison form would be worse: `0002` refuses to fold accents on
 * purpose, and `Peña` must stay `Peña` on the page.
 */
export function providerName(typed: string): string {
  return collapse(typed);
}

/** What this form refuses before it asks the database — keys, never Spanish. */
export type ProviderIssue = keyof typeof ES.providers.issues;

/**
 * Is this draft sendable, and against which suppliers?
 *
 * ⚠️⚠️ THE DUPLICATE CHECK IS LOCAL AND IS DELIBERATELY INCOMPLETE, WHICH IS WHY
 * `ES.providers.errors.duplicate` EXISTS AS WELL AND SAYS THE SAME THING. This
 * can only see the rows `providersFrom` handed it — so it cannot see a supplier
 * added on another phone, and it cannot see a RETIRED one, which that function
 * drops and `provider_name_unique` still counts. The database is the authority and
 * the local half is a faster, kinder version of the same answer.
 *
 * ⚠️ IT COMPARES ON `searchTerm` AND THE DATABASE COMPARES ON `normalize_name`,
 * WHICH IS **WIDER** ON PURPOSE. `normalize_name` does not fold accents, so
 * `Peña` and `Pena` are two legal rows; this refuses the second as a duplicate.
 * **Wider is the safe direction**: it refuses something the database would have
 * allowed, with a sentence, where the other way round is a `23505` on a name the
 * screen had just shown as available. ⚠️ Said here because it is the one place
 * this app is deliberately stricter than its schema.
 *
 * ⚠️ `exceptId` IS THE SUPPLIER BEING EDITED. Without it, saving a form with an
 * untouched name would refuse itself as a duplicate of itself.
 */
export function checkProvider(
  draft: ProviderDraft,
  existing: readonly Provider[],
  exceptId: string | null = null,
): ProviderIssue | null {
  const name = providerName(draft.name);
  if (name === '') return 'nameBlank';
  const term = searchTerm(name);
  for (const provider of existing) {
    if (provider.id === exceptId) continue;
    if (searchTerm(provider.name) === term) return 'duplicate';
  }
  return null;
}

/** The sentence under a refused form, or `''`. `R4`'s shape. */
export function issueLine(issue: ProviderIssue | null): string {
  return issue === null ? '' : ES.providers.issues[issue];
}

/** The row an insert sends. ⚠️ `checkProvider` first — this one only shapes. */
export function providerInsert(
  draft: ProviderDraft,
  workspaceId: string,
): ProviderInsert {
  return {
    workspace_id: workspaceId,
    name: providerName(draft.name),
    contact_name: optional(draft.contact),
    phone: optional(draft.phone),
    address_line1: optional(draft.address),
  };
}

/** What a save sends, with every column it does not touch absent. */
export interface ProviderPatch {
  readonly name?: string;
  readonly contact_name?: string | null;
  readonly phone?: string | null;
  readonly address_line1?: string | null;
  readonly is_active?: boolean;
}

/**
 * The patch that turns this supplier into this draft, or `null` when nothing
 * moved.
 *
 * ⚠️⚠️ ONE PATCH AND NOT FOUR, WHICH IS THE OPPOSITE OF `editPlan` ONE MODULE
 * OVER AND IS RIGHT FOR THE OPPOSITE REASON. `catalogEdit` splits a rename from a
 * re-pricing because they are two TABLES and the second can fail after the first
 * succeeded — a half-done state a shopkeeper can see. All four columns here are on
 * `provider`, so a single PATCH is one statement and one transaction: it either
 * all lands or none of it does, and there is no partial state to have a sentence
 * for.
 *
 * ⚠️ `null` WHEN NOTHING MOVED, AND THE SCREEN SAYS `ES.providers.edit.nothing`
 * RATHER THAN SENDING AN EMPTY PATCH. PostgREST answers an empty body with a 400
 * that means nothing to anybody, and a `{}` PATCH would still bump
 * `updated_at` through `provider_set_updated_at` — a write recorded against a
 * shopkeeper who changed her mind and pressed save.
 *
 * ⚠️ EVERY COMPARISON IS AGAINST THE STORED FORM AND NOT THE TYPED ONE: the draft
 * goes through `providerName` and `optional` first, so re-typing `Bodega ` with a
 * trailing space is correctly NOT a change.
 */
export function providerPatch(
  detail: ProviderDetail,
  draft: ProviderDraft,
): ProviderPatch | null {
  const patch: {
    name?: string;
    contact_name?: string | null;
    phone?: string | null;
    address_line1?: string | null;
  } = {};

  const name = providerName(draft.name);
  if (name !== detail.name) patch.name = name;

  const contact = optional(draft.contact);
  if (contact !== (detail.contact === '' ? null : detail.contact)) {
    patch.contact_name = contact;
  }
  const phone = optional(draft.phone);
  if (phone !== (detail.phone === '' ? null : detail.phone)) patch.phone = phone;
  const address = optional(draft.address);
  if (address !== (detail.address === '' ? null : detail.address)) {
    patch.address_line1 = address;
  }

  return Object.keys(patch).length === 0 ? null : patch;
}

/** `{ is_active: false }` — what `Quitar proveedor` sends. ⚠️ `canRetire` first. */
export function retirePatch(): ProviderPatch {
  return { is_active: false };
}

// ----------------------------------------------------------------------------
// THE REFUSALS A SHOPKEEPER CAN ACTUALLY REACH
// ----------------------------------------------------------------------------

/** `23505` — and on this path only `provider_name_unique`. */
const DUPLICATE = '23505';
/** `42501` — the manager fence on `provider_insert`, measured as HTTP 403. */
const FORBIDDEN = '42501';
/**
 * ⚠️⚠️ `PGRST116` — ZERO ROWS, AND ON A **PATCH** THAT IS THE FENCE ITSELF.
 * `provider_update`'s `using` clause excludes the row from being seen rather than
 * refusing the write, so a cashier's PATCH is **200 with `[]`**; `.single()` is
 * what turns it into something an app can act on. ⚠️ It is also what a supplier
 * retired on another phone looks like, and the two are indistinguishable off the
 * wire — which is why the sentence is `notAllowed` and not `missing`: being told
 * to ask a manager and being wrong is recoverable, and being told *this supplier
 * is gone* when she is simply not allowed sends her to create it again.
 */
const NO_ROWS = 'PGRST116';
/**
 * `2BP01`/`23001` — `provider_protect_generic`'s `restrict_violation`. ⚠️ Raised
 * with `errcode = 'restrict_violation'`, which Postgres spells `23001`; the
 * trigger fires only on a DELETE or a demotion, and nothing in this app sends
 * either. `canRetire` is the fence — this is the belt to it.
 */
const PROTECTED: readonly string[] = ['23001', '2BP01'];
/** `23514`/`23502`/`23503` — a row we should never have sent. `checkProvider` stops them. */
const REJECTED: readonly string[] = ['23514', '23502', '23503'];

function codeOf(error: unknown): string | null {
  if (typeof error !== 'object' || error === null) return null;
  const code = (error as { code?: unknown }).code;
  return typeof code === 'string' ? code : null;
}

/**
 * The one sentence a failed provider write shows.
 *
 * ⚠️ EVERYTHING UNRECOGNISED GOES DOWN `apiErrorMessage`, so *sin conexión* stays
 * the one sentence this app gives for a lost link — and offline is the pilot
 * store's normal write path, so it is the one that will actually be read.
 */
export function providerWriteErrorMessage(error: unknown): string {
  const code = codeOf(error);
  if (code === DUPLICATE) return ES.providers.errors.duplicate;
  if (code === FORBIDDEN || code === NO_ROWS) return ES.providers.errors.notAllowed;
  if (code !== null && PROTECTED.includes(code)) return ES.providers.errors.generic;
  if (code !== null && REJECTED.includes(code)) return ES.providers.errors.rejected;
  return apiErrorMessage(error);
}
