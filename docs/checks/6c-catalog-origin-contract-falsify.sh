#!/usr/bin/env bash
# 6c-catalog-origin-contract-falsify — can that check still fail?
#
# ⚠️ RULE 4 OF THIS REPOSITORY. `6c-catalog-origin-contract.sh` prints "all 12
# assertion groups passed", and that sentence is ALSO what a check which stopped
# reading anything prints. This is what tells the two apart: one control that must
# stay green, three that break the CONTRACT the app carries, and three that break the
# DATABASE the check asserts against.
#
# ⚠️⚠️ EACH FIXTURE MATCHES THE MESSAGE, NOT THE EXIT CODE. *A fixture that is red for
# the wrong reason is not a falsification, it is a coincidence.*
#
# ⚠️⚠️ AND THE CONTRACT FIXTURES MUTATE A **COPY** PASSED IN AS AN ARGUMENT, NEVER THE
# WORKING TREE — [[falsifier-must-not-mutate-what-the-check-reads]]. The check compares
# the app against a migration; editing the CHECK would move both sides and prove
# nothing.
#
# ⚠️⚠️ THE THREE DATABASE FIXTURES ARE THE ONES THIS FILE EXISTS FOR, BECAUSE THEY ARE
# THE THREE THAT GO WRONG SILENTLY AND MERGE AUTOMATICALLY:
#
#   * **`D1`, THE FENCE MOVED INTO THE UPDATE POLICY** — which is `6c`'s Finding 1 and
#     the version of `0042` that would have shipped if nobody had looked. Adding
#     `is_prebuilt = false` to `product_variant_update`'s `using` clause reads
#     correctly, refuses the retire, and also stops the shopkeeper PRICING and
#     RENAMING an imported product. Nothing in `app/` goes red: his PATCH comes back
#     **200 with `[]`**, because a `using` clause makes the row invisible rather than
#     refusing the write, so `Editar` says nothing at all.
#   * **`D2`, THE TRIGGER DROPPED FROM `product_variant`.** Every screen still works.
#     The retire control is still absent on a prebuilt row, because the client fence
#     is `canRetireProduct` — so the ONLY way this is visible is a request the app
#     does not make, which is what this check makes.
#   * **`D3`, THE FENCE WIDENED TO BOTH DIRECTIONS**, which is what the first writing
#     of `0042` actually did. Nothing a shopkeeper can do changes; what breaks is that
#     no seed, no fixture, no maintenance job and no later migration can ever mark a
#     row prebuilt again, so the onboarding this whole row exists for has no way in.
#
# ⚠️ AND ONE FIXTURE IS DELIBERATELY NOT HERE: mutating `canRetireProduct` itself. The
# check cannot see it — it is a TypeScript function and this is a shell script
# ([[a-shell-check-cannot-see-a-pure-function]]) — so `app/test/api-catalog-edit.test.ts`
# owns that claim and this file does not pretend to.
#
# Run:  supabase start && supabase db reset && bash docs/checks/6c-catalog-origin-contract-falsify.sh
# Exit: 0 every fixture behaved; 1 otherwise.

set -uo pipefail

CHECK="docs/checks/6c-catalog-origin-contract.sh"
CONTRACT="app/src/api/catalogEdit.ts"
[[ -r "$CHECK" && -r "$CONTRACT" ]] || { echo "FAIL: run this from the repository root"; exit 1; }

# ⚠️ THE CONTAINER NAME COMES FROM `supabase/config.toml`, NOT FROM THE DIRECTORY.
# There is no `psql` on the owner's Mac, so `docker exec` is the only way in
# ([[no-psql-on-this-machine]]).
DB_CONTAINER="supabase_db_$(sed -n 's/^project_id[[:space:]]*=[[:space:]]*"\(.*\)"/\1/p' supabase/config.toml | head -1)"
if ! docker exec "$DB_CONTAINER" true 2>/dev/null; then
  FOUND="$(docker ps --filter 'name=supabase_db_' --format '{{.Names}}' | head -1)"
  [[ -n "$FOUND" ]] && DB_CONTAINER="$FOUND"
fi
ask() { docker exec -i "$DB_CONTAINER" psql -U postgres -At -c "$1" 2>/dev/null | tr -d '\r'; }

# ⚠️⚠️ THE POLICY BODY AND THE FUNCTION BODY ARE READ OUT OF THE APPLIED CATALOG AND
# NEVER SPELLED HERE — `5g-i`'s harness learned this the expensive way: a harness
# carrying its own copy does not fail when the thing moves, **it quietly puts the
# wrong one back.**
policy_using() { ask "select coalesce(pg_get_expr(pol.polqual, pol.polrelid), '') from pg_policy pol join pg_class c on c.oid = pol.polrelid where c.relname = '$1' and pol.polname = '$2';"; }
policy_check() { ask "select coalesce(pg_get_expr(pol.polwithcheck, pol.polrelid), '') from pg_policy pol join pg_class c on c.oid = pol.polrelid where c.relname = '$1' and pol.polname = '$2';"; }

VARIANT_USING="$(policy_using product_variant product_variant_update)"
VARIANT_CHECK="$(policy_check product_variant product_variant_update)"
FUNCTION_BODY="$(ask "select pg_get_functiondef('public.catalog_prebuilt_stays()'::regprocedure);")"

case "$VARIANT_USING" in
  *has_role*) ;;
  *) echo "FAIL: product_variant_update's using clause does not mention has_role, so D1"
     echo "      would prove nothing. That is the defect, not the fixture."
     echo "      using: ${VARIANT_USING:0:160}"
     exit 1 ;;
esac
[[ -n "$VARIANT_CHECK" ]] || { echo "FAIL: could not read product_variant_update's with-check clause"; exit 1; }
case "$FUNCTION_BODY" in
  *catalog_prebuilt_stays*) ;;
  *) echo "FAIL: could not read catalog_prebuilt_stays() out of the applied catalog."
     echo "      Has 0042 been applied? Run supabase db reset."
     exit 1 ;;
esac

restored=yes
# ⚠️⚠️ THE FUNCTION BODY IS **PIPED** IN AND NEVER PUT IN A HEREDOC, AND THIS COST THIS
# HARNESS ITS FIRST RUN. `pg_get_functiondef` returns the body dollar-quoted as
# `as $function$ … $function$`, and an UNQUOTED heredoc expands `$function` to the
# empty string — so psql received `as $ … $`, failed, and `-v ON_ERROR_STOP=1` ABORTED
# the restore before the `create trigger` on the next line ever ran. **`D2` then left
# `product_variant` with no trigger at all, and `D3` measured a database with nothing
# to fire** — it went red for the wrong reason and said so, which is the one thing that
# found this. A quoted heredoc cannot be used either, because the body is a variable.
#
# ⚠️ AND EACH STATEMENT GOES THROUGH ITS OWN `ask`, so one failing cannot abort the
# rest of the restore.
restore() {
  [[ "$restored" == yes ]] && return 0
  ask "drop policy if exists product_variant_update on public.product_variant;" >/dev/null
  ask "create policy product_variant_update on public.product_variant for update to authenticated using ($VARIANT_USING) with check ($VARIANT_CHECK);" >/dev/null
  printf '%s\n' "$FUNCTION_BODY" \
    | docker exec -i "$DB_CONTAINER" psql -U postgres -q -v ON_ERROR_STOP=1 >/dev/null 2>&1
  # ⚠️ THE TRIGGER IS DROPPED FIRST, because only `D2` removes it and this same restore
  # runs after `D1` and `D3`, where it is still there. `create trigger` has no
  # `or replace`.
  ask "drop trigger if exists catalog_prebuilt_stays_trg on public.product_variant;" >/dev/null
  ask "create trigger catalog_prebuilt_stays_trg before update or delete on public.product_variant for each row execute function public.catalog_prebuilt_stays();" >/dev/null
  restored=yes

  # ⚠️⚠️ AND THE RESTORE IS VERIFIED RATHER THAN ASSUMED, which is the whole lesson of
  # the paragraph above: a harness that puts the database back WRONG accuses the next
  # fixture, and every one of these writes has its output sent to /dev/null.
  local back
  back="$(ask "select (select count(*) from pg_proc where proname = 'catalog_prebuilt_stays' and prosrc ~ 'reassigned to the shop') || '/' || (select count(*) from pg_trigger where tgname = 'catalog_prebuilt_stays_trg' and not tgisinternal);")"
  if [[ "$back" != "1/2" ]]; then
    echo "FAIL: THE RESTORE DID NOT PUT THE DATABASE BACK — function/triggers = '$back',"
    echo "      expected '1/2'. Every fixture after this one is measuring a database"
    echo "      nobody restored, so their verdicts mean nothing. Stopping here."
    bad=$((bad+1))
    exit 1
  fi
  echo "        (product_variant_update, catalog_prebuilt_stays() and the trigger put back, and verified)"
}

TMP="$(mktemp -d)"
# ⚠️ THE RESTORE IS IN A `trap` AND RUNS ON EVERY EXIT PATH, Ctrl-C included: a
# harness that left a shop's prebuilt catalog deletable is worse than one that fails.
trap 'restore; rm -rf "$TMP"' EXIT INT TERM

fixtures=0
bad=0

# $1 label  $2 expectation: a grep -E pattern, or GREEN  $3 contract
expect() {
  local label="$1" pattern="$2" contract="$3" out rc
  fixtures=$((fixtures+1))
  out="$(bash "$CHECK" "$contract" 2>&1)"; rc=$?
  if [[ "$pattern" == GREEN ]]; then
    if (( rc == 0 )) && grep -c 'assertion groups passed' <<< "$out" >/dev/null; then
      echo "  ok    $label — green, as it must be"
    else
      echo "FAIL: $label should have been GREEN (exit $rc)"
      sed 's/^/        /' <<< "$out" | tail -14
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
    sed 's/^/        /' <<< "$out" | grep -E '^FAIL|^ {6}' | tail -10
    bad=$((bad+1))
  fi
}

# ⚠️ THE COPY IS DIFFED AGAINST THE ORIGINAL AFTERWARDS: "the fixture edited nothing"
# is the anti-vacuity failure one layer in.
# ⚠️⚠️ THREE SEPARATE `local`s AND NOT ONE — [[local-expands-before-it-assigns]].
mutate() { # label source-path sed-expression -> path
  local label="$1"
  local src="$2"
  local expr="$3"
  local path="$TMP/$label-$(basename "$src")"
  sed "$expr" "$src" > "$path"
  if cmp -s "$path" "$src"; then
    echo "FAIL: fixture $label edited nothing — it proves nothing about the check."
    bad=$((bad+1))
  fi
  echo "$path"
}

echo "=== the control: the tree as it is ==="
expect "C0  the unbroken tree" GREEN "$CONTRACT"

echo
echo "=== the contract: three ways the app can stop describing this table ==="

# ⚠️ F1: THE MARKER DROPPED FROM THE READ. Everything else answers, the screen still
# renders, and `canRetireProduct` receives a row with `is_prebuilt` undefined — which
# is falsy, so the control appears on EVERY product again. That is precisely the state
# the owner found on his phone on 2026-09-23, arriving as a deleted word.
F1="$(mutate F1 "$CONTRACT" "s/^export const VARIANT_EDIT_COLUMNS = 'id,tax_rate::text,pack_size::text,is_prebuilt';\$/export const VARIANT_EDIT_COLUMNS = 'id,tax_rate::text,pack_size::text';/")"
expect "F1  the marker dropped from the one-variant read" \
  "no longer asks for is_prebuilt|nothing to draw on" "$F1"

# ⚠️⚠️ F2: THE MARKER CAST TO TEXT, WHICH IS THE ONE-CHARACTER-CLASS MISTAKE A SESSION
# WOULD MAKE FOR CONSISTENCY — the two columns beside it are `::text`. It is a 200,
# the column is present, the value is right, and `'false'` is TRUTHY in TypeScript, so
# the retire control disappears from every product the shop made. No typecheck and no
# Vitest fixture can see a JSON type.
F2="$(mutate F2 "$CONTRACT" "s/^export const VARIANT_EDIT_COLUMNS = 'id,tax_rate::text,pack_size::text,is_prebuilt';\$/export const VARIANT_EDIT_COLUMNS = 'id,tax_rate::text,pack_size::text,is_prebuilt::text';/")"
expect "F2  the marker cast to text, for consistency with the two figures" \
  "CASTS THE MARKER TO TEXT|truthy" "$F2"

# ⚠️ F3: THE COLUMN THE RETIRE SENDS, MISSPELLED. PostgREST resolves a column by name,
# so this is a 400 `42703` on the one write a shopkeeper cannot undo — and the app
# would be showing him a confirmation for something that never lands.
F3="$(mutate F3 "$CONTRACT" "s/^export const ACTIVE_PATCH_COLUMNS = 'is_active';\$/export const ACTIVE_PATCH_COLUMNS = 'active';/")"
expect "F3  the retire column misspelled" \
  "42703|ANSWERED|retiring the shop's own product answered" "$F3"

echo
echo "=== the database: three ways 0042 can be wrong and everything still look fine ==="

# ⚠️⚠️ D1 IS THE MIGRATION THAT WOULD HAVE SHIPPED. `6c`'s Finding 1, as a fixture:
# the fence written as a policy predicate instead of a trigger. It refuses the retire
# correctly and it also refuses the rename and the reprice — and it refuses them
# SILENTLY, as 200 with an empty array, because a `using` clause excludes the row from
# being seen rather than refusing the write ([[rls-update-refusal-is-a-200]]).
restored=no
ask "drop policy if exists product_variant_update on public.product_variant;" >/dev/null
ask "create policy product_variant_update on public.product_variant for update to authenticated using (($VARIANT_USING) and is_prebuilt = false) with check ($VARIANT_CHECK);" >/dev/null
expect "D1  the fence moved into product_variant_update's using clause" \
  "RENAMING A PREBUILT PRODUCT WAS REFUSED|using clause sees a ROW" "$CONTRACT"
restore

# ⚠️⚠️ D2 IS THE TRIGGER GONE FROM THE VARIANT TABLE. Every screen still behaves,
# because the control is absent on a prebuilt row either way — `canRetireProduct` is
# the client fence. What is gone is the only thing standing between a stale read, a
# deep link or a second phone and the deletion of a row that is not the shop's.
restored=no
ask "drop trigger if exists catalog_prebuilt_stays_trg on public.product_variant;" >/dev/null
expect "D2  the trigger dropped from product_variant" \
  "RETIRING A PREBUILT PRODUCT ANSWERED|23001" "$CONTRACT"
restore

# ⚠️⚠️ D3 IS WHAT THE FIRST WRITING OF `0042` ACTUALLY DID, and it is here because
# nothing a shopkeeper does would ever reveal it. Fencing BOTH directions of the
# marker means nothing can mark a row prebuilt after it is inserted — not the seed,
# not a fixture, not a maintenance job, not a later migration without disabling the
# trigger. The onboarding this entire row exists for would have no way in, and the
# defect is invisible in the only case anybody tests: an import that INSERTS its rows.
restored=no
docker exec -i "$DB_CONTAINER" psql -U postgres -q -v ON_ERROR_STOP=1 >/dev/null 2>&1 <<'SQLD3'
create or replace function public.catalog_prebuilt_stays()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' and old.is_prebuilt then
    raise exception 'a prebuilt % cannot be deleted: %',
      tg_table_name, coalesce(old.name, '(unnamed)')
      using errcode = 'restrict_violation';
  end if;

  if tg_op = 'UPDATE' then
    if old.is_prebuilt and old.is_active and not new.is_active then
      raise exception 'a prebuilt % cannot be retired: %',
        tg_table_name, coalesce(old.name, '(unnamed)')
        using errcode = 'restrict_violation';
    end if;

    if old.is_prebuilt <> new.is_prebuilt then
      raise exception 'is_prebuilt cannot change on %: %',
        tg_table_name, coalesce(old.name, '(unnamed)')
        using errcode = 'restrict_violation';
    end if;
  end if;

  return coalesce(new, old);
end;
$$;
SQLD3
expect "D3  the marker fenced in BOTH directions, so nothing can ever mark a row prebuilt" \
  "PROMOTING A ROW TO PREBUILT WAS REFUSED|unsettable" "$CONTRACT"
restore

echo
if (( bad > 0 )); then
  echo "$fixtures fixture(s) run, $bad behaved wrongly — $CHECK is not measuring what"
  echo "its own header claims."
  exit 1
fi
echo "all $fixtures fixtures behaved — the check goes red on three ways the app can"
echo "stop describing this table and three ways 0042 can be wrong, and stays green on"
echo "the tree as it is."
