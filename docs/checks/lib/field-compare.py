#!/usr/bin/env python3
# ============================================================================
# field-compare.py — does the schema after a change still answer every call a
# phone could make before it? (plan `10.3`, ADR-035 §2.2's field rule)
#
#   python3 field-compare.py BASE.csv HEAD.csv [NEW_MIGRATION.sql ...]
#
# BASE.csv and HEAD.csv are `docs/checks/lib/field-surface.sql`'s answer on the
# schema before the change and after it: one fact per row, (kind, key, detail).
# The migrations named after them are the ones this change adds; a line in one
# of them reading
#
#     -- field-rule: breaks <kind> <key> — <why no build in use calls it>
#
# declares that it removes that fact ON PURPOSE. Only the change's own
# migrations can declare: an old declaration never covers a new removal.
#
# Exit 0: every fact a build could rely on is still there, or declared broken.
# Exit 1: something a build could call is gone or changed, undeclared — or a
#         declaration names something that does not break.
# Exit 2: an answer it cannot use (no header, or nothing examined) — never a
#         green: an empty surface would hold nothing and break nothing.
#
# WHAT BREAKS, kind by kind (a fact in BASE that HEAD must keep, unless said):
#   function      gone, or no longer executable by a signed-in person; or what
#                 it returns changed
#   argument      gone or renamed (PostgREST finds a function BY ITS ARGUMENT
#                 NAMES: a call that sends it is not found, PGRST202); its type
#                 changed; it lost its default. AND, in HEAD only: a NEW argument
#                 with no default — every call made before it leaves it out
#   result        a column the function returned is gone, or its type changed
#   overload      in HEAD at all: two functions with one name answer 300
#   relation, column (and its type), select, insert, update, delete — gone
#   required      in HEAD only, on a table a signed-in person could insert into
#                 before: an insert must now name a column every older insert
#                 leaves out (23502)
#   relationship  gone; or a pair of tables joined by ONE foreign key in BASE is
#                 joined by more in HEAD — an embed between them is ambiguous (PGRST201)
#   unique        gone — an upsert naming those columns has no target (42P10)
#   enum          a label gone — a write that sends it fails (22P02)
#   bucket        gone
# A fact whose parent is reported gone (a column of a dropped table) is not
# reported again.
# ============================================================================
import csv
import re
import sys
from collections import defaultdict

# The key runs to the em dash, because a key may hold spaces (an enum label:
# `waste_reason.error de captura`); the reason follows it.
SENTINEL = re.compile(r'^\s*--\s*field-rule:\s*breaks\s+(\S+)\s+(.+?)(?:\s+—\s*(.*?))?\s*$')


def load(path):
    with open(path, newline='') as f:
        reader = csv.reader(f)
        header = next(reader, None)
        if header != ['kind', 'key', 'detail']:
            return None
        return {(row[0], row[1]): row[2] for row in reader if len(row) == 3}


def declared(paths):
    out = {}
    for path in paths:
        with open(path) as f:
            for line in f:
                m = SENTINEL.match(line)
                if m:
                    out[(m.group(1), m.group(2).strip())] = (path.rsplit('/', 1)[-1], (m.group(3) or '').strip())
    return out


def keys(surface, kind):
    return {k for (kd, k) in surface if kd == kind}


def owner(key):
    return key.split('.', 1)[0]


def pair(rel_key):
    left, right = rel_key.split('->', 1)
    return frozenset((left.split('(', 1)[0], right.split('(', 1)[0]))


def split_detail(detail):
    kind, _, need = detail.rpartition(' ')
    return kind, need


def main(argv):
    if len(argv) < 3:
        print('usage: field-compare.py BASE.csv HEAD.csv [NEW_MIGRATION.sql ...]')
        return 2
    base, head = load(argv[1]), load(argv[2])
    for name, s in (('before', base), ('after', head)):
        if s is None:
            print(f'FAIL: the surface {name} the change has no kind,key,detail header — not an answer')
            return 2
        examined = {k: s.get(('examined', k), '0') for k in ('functions', 'relations')}
        if not all(v.isdigit() and int(v) > 0 for v in examined.values()):
            print(f'FAIL: the surface {name} the change examined {examined} — an empty answer holds nothing')
            return 2

    breaks = []  # (kind, key, what happened)

    def gone(kind, key, why):
        breaks.append((kind, key, why))

    # --- functions, their arguments and what they return -------------------
    b_fn, h_fn = keys(base, 'function'), keys(head, 'function')
    for f in sorted(b_fn):
        if f not in h_fn:
            gone('function', f, 'gone, or a signed-in person may no longer execute it')
            continue
        if base[('function', f)] != head[('function', f)]:
            gone('function', f, f'it {base[("function", f)]} before and {head[("function", f)]} after')
        b_args = {k: d for (kd, k), d in base.items() if kd == 'argument' and owner(k) == f}
        h_args = {k: d for (kd, k), d in head.items() if kd == 'argument' and owner(k) == f}
        for a, d in sorted(b_args.items()):
            if a not in h_args:
                gone('argument', a, 'gone or renamed — a call that sends it is not found (PGRST202)')
                continue
            (bt, bn), (ht, hn) = split_detail(d), split_detail(h_args[a])
            if bt != ht:
                gone('argument', a, f'its type changed from {bt} to {ht}')
            if bn == 'optional' and hn == 'required':
                gone('argument', a, 'it lost its default — a call that leaves it out is not found')
        for a, d in sorted(h_args.items()):
            if a not in b_args and split_detail(d)[1] == 'required':
                gone('argument', a, 'new, with no default — every call written before it leaves it out')
        b_res = {k: d for (kd, k), d in base.items() if kd == 'result' and owner(k) == f}
        h_res = {k: d for (kd, k), d in head.items() if kd == 'result' and owner(k) == f}
        for r, d in sorted(b_res.items()):
            if r not in h_res:
                gone('result', r, 'a column it returned is gone')
            elif h_res[r] != d:
                gone('result', r, f'its type changed from {d} to {h_res[r]}')
    for f in sorted(keys(head, 'overload')):
        gone('overload', f, f'{head[("overload", f)]} functions share the name — PostgREST answers 300 (ambiguous)')

    # --- relations, columns and the rights over them -------------------------
    b_rel, h_rel = keys(base, 'relation'), keys(head, 'relation')
    lost_rel = b_rel - h_rel
    for r in sorted(lost_rel):
        gone('relation', r, 'gone, or a signed-in person may no longer read or write it')
    lost_col = set()
    for c in sorted(keys(base, 'column')):
        if owner(c) in lost_rel:
            continue
        if ('column', c) not in head:
            lost_col.add(c)
            gone('column', c, 'gone or renamed — a read or write that names it fails (42703)')
        elif base[('column', c)] != head[('column', c)]:
            gone('column', c, f'its type changed from {base[("column", c)]} to {head[("column", c)]}')
    for right in ('select', 'insert', 'update'):
        for c in sorted(keys(base, right) - keys(head, right)):
            if owner(c) in lost_rel or c in lost_col:
                continue
            gone(right, c, f'a signed-in person may no longer {right} it (42501)')
    for r in sorted(keys(base, 'delete') - keys(head, 'delete')):
        if r not in lost_rel:
            gone('delete', r, 'a signed-in person may no longer delete from it (42501)')
    insertable_before = {owner(c) for c in keys(base, 'insert')}
    for c in sorted(keys(head, 'required') - keys(base, 'required')):
        if owner(c) in insertable_before:
            gone('required', c, 'an insert must now name it, and every insert written before it leaves it out (23502)')

    # --- what embeds and upserts lean on ------------------------------------
    for k in sorted(keys(base, 'relationship') - keys(head, 'relationship')):
        if not (pair(k) & lost_rel):
            gone('relationship', k, 'gone — an embed that follows it is not found (PGRST200)')
    b_pairs, h_pairs = defaultdict(int), defaultdict(int)
    for k in keys(base, 'relationship'):
        b_pairs[pair(k)] += 1
    for k in keys(head, 'relationship'):
        h_pairs[pair(k)] += 1
    for p, n in sorted(b_pairs.items(), key=lambda kv: sorted(kv[0])):
        if n == 1 and h_pairs.get(p, 0) > 1:
            gone('relationship', '<->'.join(sorted(p)),
                 f'one foreign key joined them before and {h_pairs[p]} do now — an embed between them is ambiguous (PGRST201)')
    for k in sorted(keys(base, 'unique') - keys(head, 'unique')):
        if owner(k.split('(', 1)[0]) not in lost_rel:
            gone('unique', k, 'gone — an upsert naming these columns has no conflict target (42P10)')
    for k in sorted(keys(base, 'enum') - keys(head, 'enum')):
        gone('enum', k, 'a label gone — a write that sends it fails (22P02)')
    for k in sorted(keys(base, 'bucket') - keys(head, 'bucket')):
        gone('bucket', k, 'gone — an upload or a read in it fails')

    # --- declarations --------------------------------------------------------
    decl = declared(argv[3:])
    failed = 0
    held = sum(1 for k in base if k[0] != 'examined')
    for kind, key, why in breaks:
        if (kind, key) in decl:
            mig, reason = decl[(kind, key)]
            print(f'  declared  {kind} {key} — {why}')
            print(f'            {mig} says: {reason or "(no reason given)"}')
        else:
            failed += 1
            print(f'FAIL: {kind} {key} — {why}')
    broken = {(k, key) for k, key, _ in breaks}
    for (kind, key), (mig, _) in sorted(decl.items()):
        if (kind, key) not in broken:
            failed += 1
            print(f'FAIL: {mig} declares it breaks {kind} {key}, and nothing of that name breaks')

    added_fn = sorted(h_fn - b_fn)
    added_rel = sorted(h_rel - b_rel)
    added_col = len(keys(head, 'column') - keys(base, 'column'))
    print(f'  read  {held} facts before the change and {sum(1 for k in head if k[0] != "examined")} after; '
          f'{len(b_fn)} functions and {len(b_rel)} tables and views a signed-in person reached before')
    print(f'  added {len(added_fn)} function(s){": " + ", ".join(added_fn) if added_fn else ""}; '
          f'{len(added_rel)} table(s) or view(s){": " + ", ".join(added_rel) if added_rel else ""}; '
          f'{added_col} column(s)')
    if failed:
        print(f'{failed} thing(s) a build could call would stop working. Keep them (ADR-035 §2.2: a migration')
        print('adds), or, once no build in use calls one, declare it in the migration that removes it:')
        print('    -- field-rule: breaks <kind> <key> — <why no build in use calls it>')
        return 1
    print(f'  ok    every one of them still answers, or its migration says why it may go ({len(decl)} declared)')
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv))
