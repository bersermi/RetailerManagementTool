#!/usr/bin/env bash
# 5h-ii-b-corrections-contract-falsify — can that check still fail?
#
# ⚠️ RULE 4 OF THIS REPOSITORY. `5h-ii-b-corrections-contract.sh` prints "all 21
# assertion groups passed", and that sentence is ALSO what a check which stopped
# reading anything prints. This is what distinguishes the two: NINE fixtures —
# one control that must stay green, five that break the CONTRACT, and three that
# break the DATABASE.
#
# ⚠️⚠️ EACH FIXTURE MATCHES THE MESSAGE, NOT THE EXIT CODE. *A fixture that is red
# for the wrong reason is not a falsification, it is a coincidence* — the rule
# `5b-i-api-contract-falsify.sh` paid for on its first run.
#
# ⚠️⚠️ AND THE LIVE CHECK HAD ALREADY PAID FOR ITSELF BEFORE THIS FILE EXISTED, in
# its own fixture rather than in the app: its first run passed the delivery a
# cashier had been REFUSED as one that had been voided, and went red saying no
# reversal pointed at it. **That is the harness being wrong, and the distinction
# between *refused* and *voided* is now an assertion of its own** — a refusal must
# leave the ledger exactly as it was, and `TD003` is raised before `0021` writes
# anything.
#
# ⚠️⚠️ `F5` AND `F7` ARE THE TWO THIS FILE EXISTS FOR.
#
#   * **`F5` WIDENS `mayCorrect`'s SPELLING OF THE FENCE** by claiming the RPC
#     takes the cart's kind. It is the one place the app's two vocabularies —
#     `purchase`/`sale` and `buy`/`sell` — meet, and `0021` refuses the wrong one
#     with `22023`. Nothing in TypeScript can see it: both are string unions and
#     the module holds a map between them.
#   * **`F7` MAKES NARROWING THE WINDOW A SILENT NO-OP.** The whole reason
#     `@/api/corrections` does NOT render the window is that it is the shop's to
#     set and the database's to apply; if the check cannot tell a live setting
#     from `0021`'s default of 15, that decision rests on nothing. ⚠️ **And the
#     property it really pins is that the check READS THE SETTING BACK** rather
#     than trusting its own `PATCH` — the lesson the owner's 24-hour window ruling
#     was recorded with, because a write that matched nothing and one that matched
#     everything look identical from the client.
#
# Run:  supabase start && supabase db reset && bash docs/checks/5h-ii-b-corrections-contract-falsify.sh
# Exit: 0 every fixture behaved; 1 otherwise.

set -uo pipefail

CHECK="docs/checks/5h-ii-b-corrections-contract.sh"
SOURCE="app/src/api/corrections.ts"
WORDS="app/src/strings.ts"
[[ -r "$CHECK" && -r "$SOURCE" && -r "$WORDS" ]] || {
  echo "FAIL: run this from the repository root"; exit 1; }

# ⚠️ THE CONTAINER NAME COMES FROM `supabase/config.toml`, NOT FROM THE DIRECTORY
# — the coincidence `5b-ii-a`'s harness recorded. There is no `psql` on the
# owner's Mac, so `docker exec` is the only way in ([[no-psql-on-this-machine]]).
DB_CONTAINER="supabase_db_$(sed -n 's/^project_id[[:space:]]*=[[:space:]]*"\(.*\)"/\1/p' supabase/config.toml | head -1)"
if ! docker exec "$DB_CONTAINER" true 2>/dev/null; then
  FOUND="$(docker ps --filter 'name=supabase_db_' --format '{{.Names}}' | head -1)"
  [[ -n "$FOUND" ]] && DB_CONTAINER="$FOUND"
fi
sql() { docker exec -i "$DB_CONTAINER" psql -U postgres -q >/dev/null 2>&1; }
ask() { docker exec -i "$DB_CONTAINER" psql -U postgres -At -c "$1" 2>/dev/null | tr -d '\r'; }

# ⚠️⚠️ BOTH PRECONDITIONS BELOW ARE READ OUT OF THE APPLIED CATALOG AND NEITHER IS
# REMEMBERED — `5g-i`'s harness learned this the expensive way on the day `0040`
# shipped: a harness carrying its own copy of a database object does not fail when
# the object moves, **it quietly puts the old one back.** So this refuses to run at
# all when it cannot see what it would be restoring.
#
# ⚠️ BOTH DATABASE FIXTURES BELOW ARE SCHEMA-LEVEL AND BOTH ARE RESTORED IN THE
# `trap`, which is forced rather than stylistic: the check builds its own shop
# INSIDE the run, so a mutation to a ROW is a mutation to a shop the run never
# sees.
ONBOARD_EXISTS="$(ask "select 1 from pg_proc where proname = 'onboard_workspace';")"
[[ "$ONBOARD_EXISTS" == "1" ]] || {
  echo "FAIL: onboard_workspace is not in the applied schema, so no fixture below"
  echo "      can build a shop and every one of them would be red for the wrong"
  echo "      reason. Run \`supabase db reset\` first."
  exit 1; }

ORIGINAL_GRANT="$(ask "select coalesce(array_to_string(proacl, ','), '<default>')
                         from pg_proc where proname = 'void_transaction';")"
case "$ORIGINAL_GRANT" in
  *authenticated=X*) ;;
  *) echo "FAIL: void_transaction is not granted to authenticated on this database"
     echo "      (proacl reads: ${ORIGINAL_GRANT:-<empty>}). F8 below revokes and"
     echo "      re-grants it, and this harness refuses to do that when it cannot"
     echo "      see the grant it would be putting back."
     exit 1 ;;
esac

TMP="$(mktemp -d)"
accents_restored=yes
restore_accents() {
  [[ "$accents_restored" == yes ]] && return 0
  sql <<'SQL'
drop trigger if exists falsify_strip_accents on public.purchase;
drop function if exists public.falsify_strip_accents();
SQL
  accents_restored=yes
  echo "        (the accent-stripping trigger dropped from purchase)"
}
window_restored=yes
restore_window() {
  [[ "$window_restored" == yes ]] && return 0
  sql <<'SQL'
drop trigger if exists falsify_pin_void_window on public.workspace_setting;
drop function if exists public.falsify_pin_void_window();
SQL
  window_restored=yes
  echo "        (the pinning trigger dropped from workspace_setting)"
}
grant_restored=yes
restore_grant() {
  [[ "$grant_restored" == yes ]] && return 0
  sql <<'SQL'
grant execute on function public.void_transaction(text, uuid, text) to authenticated;
SQL
  grant_restored=yes
  echo "        (void_transaction's grant to authenticated restored)"
}
# ⚠️ THE RESTORE IS IN A `trap` AND RUNS ON EVERY EXIT PATH, Ctrl-C included: a
# harness that leaves the grant revoked makes the app look broken rather than
# safe, which is the failure that gets a check deleted.
trap 'restore_grant; restore_window; restore_accents; rm -rf "$TMP"' EXIT INT TERM

fixtures=0
bad=0

# $1 label  $2 expectation: a grep -E pattern, or the word GREEN  $3 contract  $4 words
expect() {
  local label="$1" pattern="$2" contract="$3" words="${4:-$WORDS}" out rc
  fixtures=$((fixtures+1))
  out="$(bash "$CHECK" "$contract" "$words" 2>&1)"; rc=$?
  if [[ "$pattern" == GREEN ]]; then
    if (( rc == 0 )) && grep -q 'assertion groups passed' <<< "$out"; then
      echo "  ok    $label — green, as it must be"
    else
      echo "FAIL: $label should have been GREEN (exit $rc)"
      sed 's/^/        /' <<< "$out" | tail -12
      bad=$((bad+1))
    fi
    return
  fi
  if (( rc == 0 )); then
    echo "FAIL: $label — the check PASSED on a broken tree, which is the vacuous"
    echo "      green this harness exists to catch."
    bad=$((bad+1))
  elif grep -qE "$pattern" <<< "$out"; then
    echo "  ok    $label — red, and red for the stated reason"
  else
    echo "FAIL: $label — red, but NOT for the reason it is named for."
    echo "      expected to match: $pattern"
    sed 's/^/        /' <<< "$out" | grep -E '^FAIL|^ {6}' | tail -8
    bad=$((bad+1))
  fi
}

# ⚠️ THE COPY IS DIFFED AGAINST THE ORIGINAL AFTERWARDS: "the fixture edited
# nothing" is the anti-vacuity failure one layer in, and it is how three fixtures
# in this repository were found to have been silently dead.
mutate() { # label file sed-expression -> path
  local label="$1" file="$2" expr="$3" path="$TMP/$1.${2##*.}"
  sed "$expr" "$file" > "$path"
  if cmp -s "$path" "$file"; then
    echo "FAIL: fixture $label edited nothing — it proves nothing about the check."
    bad=$((bad+1))
  fi
  echo "$path"
}

echo "== the control =="
expect "F0  the contract as shipped" GREEN "$SOURCE"

echo
echo "== the contract, broken five ways =="

# ⚠️⚠️ F1 — THE 404 `R13` EXISTS FOR. PostgREST matches a function BY ITS
# PARAMETER NAMES, so a renamed argument does not fail the call, it fails to FIND
# the function. TypeScript has never read `0021` and the suite cannot load
# `api/calls.ts`, so this check is the only thing in the repository that can see it.
expect "F1  p_reason renamed in VoidArgs" \
  'VoidArgs spells|answered 404' \
  "$(mutate F1 "$SOURCE" 's/  readonly p_reason: string;/  readonly p_why: string;/')"

# F2 — the RPC itself misspelled. The same 404, arriving from the other side, and
# the one a rename in a migration would produce.
expect "F2  the RPC name misspelled" \
  'answered 404' \
  "$(mutate F2 "$SOURCE" "s/^export const VOID_TRANSACTION = 'void_transaction';/export const VOID_TRANSACTION = 'void_document';/")"

# ⚠️⚠️ F3 — THE AUDIT TRAIL COLLAPSED INTO ONE WORD. `reversal_reason` is the only
# record of WHY a document was cancelled — *"Of course we will have a history of
# any of these changes for audit reasons"* — and a `Corregir` that files itself as
# an `Eliminar` is invisible everywhere except in the owner's own ledger, a month
# later, when he asks which it was.
# ⚠️ NOTE THE ARGUMENT ORDER: F3 and F4 hand the UNCHANGED module as the contract
# and a MUTATED `src/strings.ts` as the words. They are the only two fixtures here
# that break the words rather than the wire.
expect "F3  both acts writing the same reversal_reason" \
  'the same reversal_reason' \
  "$SOURCE" \
  "$(mutate F3 "$WORDS" "s/    reasonCorrected: 'Corregida desde Lo último',/    reasonCorrected: 'Eliminada desde Lo último',/")"

# ⚠️⚠️ F5 — THE FIXTURE THIS FILE EXISTS FOR, AND THE ONE NOTHING ELSE CAN SEE.
# `CART_KIND` is the single place the app's two vocabularies meet:
# `purchase`/`sale` is the DOCUMENT's and `buy`/`sell` is the CART's. Both are
# string unions, so swapping them typechecks, the suite's own inverse assertion
# would move with it, and `0021` answers `22023` — *kind must be one of purchase,
# sale, waste*. **Only a real round trip catches it.**
expect "F5  CART_KIND inverted, so the cart's word reaches the RPC" \
  'CART_KIND reads' \
  "$(mutate F5 "$SOURCE" "s/^  purchase: 'buy',/  purchase: 'sell',/")"

# ⚠️ F6 — A FOURTH ARGUMENT. `0021` declares three, and PostgREST matches on the
# whole set: an extra one is the same 404 as a renamed one. This is the shape an
# honest-looking addition takes — somebody adding `p_note` to the interface and
# never touching the migration.
expect "F6  a fourth p_ argument added to VoidArgs" \
  'VoidArgs spells|answered 404' \
  "$(mutate F6 "$SOURCE" 's/  readonly p_reason: string;/  readonly p_reason: string;\
  readonly p_note: string;/')"

echo
echo "== the database, broken three ways =="

# ⚠️⚠️ F4 — THE ACCENT, MANGLED IN THE DATABASE. The audit assertion reads the
# reason out of `src/strings.ts`, SENDS it, and compares what comes back — so the
# only thing that can move it is something changing the value BETWEEN the two.
# This trigger is that something, and what it proves is that `reversal_reason`
# survives the round trip byte for byte, which is `5d-i`'s reason: a transport
# that mangled Spanish between a phone and Postgres would otherwise be green.
#
# ⚠️⚠️ AND THE FIRST VERSION OF THIS FIXTURE WAS NOT A FALSIFICATION AT ALL,
# WHICH IS WHY IT IS RECORDED HERE RATHER THAN QUIETLY REPLACED. It mutated
# `src/strings.ts` — and the check went **GREEN**, correctly: it reads that file
# to build the payload, so changing it changes BOTH halves of the comparison.
# **Output compared against its own input is self-consistent and blind**
# ([[assert-against-a-calendar-not-the-array]]). ⚠️ So the audit assertion does
# NOT hold that the app sends what `src/strings.ts` says — `app/test/
# api-corrections.test.ts` holds that, and it is the right home for it. This
# holds the transport.
sql <<'SQL'
create or replace function public.falsify_strip_accents()
returns trigger language plpgsql as $$
begin
  new.reversal_reason := translate(new.reversal_reason, 'áéíóúñÁÉÍÓÚÑ', 'aeiounAEIOUN');
  return new;
end;
$$;
drop trigger if exists falsify_strip_accents on public.purchase;
create trigger falsify_strip_accents
  before insert on public.purchase
  for each row execute function public.falsify_strip_accents();
SQL
accents_restored=no
expect "F4  the stored reason stripped of its accents on the way in" \
  'reversal_reason is' \
  "$SOURCE"
restore_accents

# ⚠️⚠️ F7 — THE WINDOW PINNED, SO NARROWING IT SILENTLY DOES NOTHING. The check
# narrows this shop's `void_window_minutes` to 0 and then drives a refusal; this
# trigger puts the value straight back to 15, so the narrow APPEARS to succeed and
# the fence that follows is `0021`'s default rather than the shop's setting.
#
# ⚠️⚠️ THE PROPERTY IT FALSIFIES IS *the check READS THE SETTING BACK RATHER THAN
# TRUSTING ITS OWN WRITE* — which is the lesson the owner's own 24-hour window
# ruling was recorded with on 2026-09-26: *"Verified by reading it back rather
# than by the write's own output"*, because a PATCH that matched nothing and one
# that matched everything look identical from the client. A check that PATCHed and
# moved on would go GREEN here, and the two assertions after it would be measuring
# `0021`'s constant while claiming to measure the shop's.
#
# ⚠️ AND IT IS THE FIXTURE THE WHOLE DESIGN RESTS ON. `@/api/corrections`
# deliberately does not render the window, on the argument that it is the shop's
# to set and the database's to apply.
#
# ⚠️ IT IS SCHEMA-LEVEL AND NOT A `delete` OVER ROWS, WHICH IS FORCED RATHER THAN
# STYLISTIC: the check builds its own shop INSIDE the run, so anything this
# harness does to a row beforehand is done to a shop the next run never sees.
sql <<'SQL'
create or replace function public.falsify_pin_void_window()
returns trigger language plpgsql as $$
begin
  new.void_window_minutes := 15;
  return new;
end;
$$;
drop trigger if exists falsify_pin_void_window on public.workspace_setting;
create trigger falsify_pin_void_window
  before update on public.workspace_setting
  for each row execute function public.falsify_pin_void_window();
SQL
window_restored=no
expect "F7  the window pinned, so narrowing it is a silent no-op" \
  'could not narrow the window' \
  "$SOURCE"
restore_window

# ⚠️⚠️ F8 — THE GRANT REVOKED. `0021:448` revokes from `public` and grants execute
# to `authenticated`, and `5h-i` measured that grant on the applied schema after
# the plan had spent a day claiming a void was unreachable through the API. **If
# it is ever revoked, this row has no write path at all** and the claim that
# `5h-ii-b` ships no migration becomes false — so the check must say so loudly
# rather than reporting a puzzling 403 somewhere further down.
sql <<'SQL'
revoke execute on function public.void_transaction(text, uuid, text) from authenticated;
SQL
grant_restored=no
expect "F8  void_transaction's grant to authenticated revoked" \
  'answered 40[13]|has no write path' \
  "$SOURCE"
restore_grant

echo
if [[ "$bad" -eq 0 ]]; then
  echo "all $fixtures fixtures behaved — 5h-ii-b-corrections-contract.sh is still"
  echo "measuring the RPC's three argument names, the audit trail, the two"
  echo "vocabularies, the live window and the grant."
  exit 0
fi
echo "$bad of $fixtures fixtures did NOT behave."
exit 1
