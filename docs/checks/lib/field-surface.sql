-- ============================================================================
-- field-surface.sql — WHAT A SIGNED-IN PHONE CAN REACH, ONE FACT PER ROW (plan `10.3`)
--
-- ADR-035 §2.2's field rule: a migration keeps every build in the field
-- working — it adds, and never drops or renames what a build still in use
-- calls or reads. A phone talks to this database through PostgREST and
-- Storage, signed in as `authenticated`, and PostgREST finds a function BY ITS
-- NAME AND THE NAMES OF THE ARGUMENTS SENT. So what a build can call is exactly
-- what this query lists, and `docs/checks/field-rule.sh` runs it twice — on the
-- schema before a change and after it — and goes red when a row a build could
-- rely on is gone or changed.
--
-- One row per fact, as (kind, key, detail):
--   function      a function a signed-in person may execute; detail: what it returns
--   argument      one of its inputs; detail: the type, and `required` or `optional`
--   result        one column of what it returns, when it returns columns; detail: the type
--   overload      a function name carried by more than one function (PostgREST
--                 answers 300, ambiguous); detail: how many
--   relation      a table or view a signed-in person may read or write
--   column        one of its columns; detail: the type
--   select / insert / update   one column a signed-in person holds that right on
--   delete        a table she may delete from
--   required      a column an insert must name: NOT NULL, no default, not
--                 generated — an old insert that omits a NEW one fails
--   relationship  a foreign key between two of those relations (what an embed
--                 follows); detail: the constraint's name
--   unique        a column set an upsert can name as `on_conflict`
--   enum          one label of an enum in `public`
--   bucket        a Storage bucket
--   examined      how much the query read, so an empty answer is never a clean one
-- (`field-rule.sh` adds `edge-function` rows from `supabase/functions/`.)
--
-- NOT HERE, AND SAID SO IN THE CHECK: what a call DOES — a row policy, a CHECK,
-- a trigger or a function body can still make an old call fail or answer less.
-- This query holds that the call is still FOUND, with the same names and types,
-- and that the right to make it is still held.
--
-- ⚠️ `authenticated` only: since `0071` `anon` holds nothing here (`_walls.sql`),
-- and every app calls signed in. Extension functions are left out, as in
-- `_walls.sql`.
--
-- ⚠️ ONE STATEMENT, NO TRAILING SEMICOLON, AND IT NEVER ENDS WITH A COMMENT:
-- the falsifier wraps it in a transaction after a fixture's DDL.
-- ============================================================================
with own_fn as (
  select p.oid, p.proname, p.proretset, p.prorettype, p.pronargs, p.pronargdefaults,
         coalesce(p.proallargtypes, p.proargtypes::oid[]) as types,
         coalesce(p.proargmodes, array_fill('i'::"char", array[p.pronargs])) as modes,
         p.proargnames as names
    from pg_proc p
   where p.pronamespace = 'public'::regnamespace
     and not exists (select 1 from pg_depend d
                      where d.classid = 'pg_proc'::regclass
                        and d.objid = p.oid and d.deptype = 'e')
),
callable as (
  select f.* from own_fn f where has_function_privilege('authenticated', f.oid, 'EXECUTE')
),
arg as (
  select f.oid, f.proname, f.pronargs, f.pronargdefaults, a.ord, a.mode,
         format_type(a.type, null) as type, f.names[a.ord] as name
    from callable f
   cross join lateral unnest(f.modes, f.types) with ordinality as a(mode, type, ord)
),
input as (
  select a.*, row_number() over (partition by a.oid order by a.ord) as pos
    from arg a
   where a.mode in ('i', 'b', 'v')
),
output_col as (
  select a.oid, a.proname, a.name, a.type from arg a where a.mode in ('o', 'b', 't')
  union all
  -- a function that returns a composite type (a table's row, say) returns its columns
  select f.oid, f.proname, att.attname, format_type(att.atttypid, att.atttypmod)
    from callable f
    join pg_type t on t.oid = f.prorettype and t.typrelid <> 0
    join pg_attribute att on att.attrelid = t.typrelid and att.attnum > 0 and not att.attisdropped
),
rel as (
  select c.oid, c.relname, c.relkind
    from pg_class c
   where c.relnamespace = 'public'::regnamespace
     and c.relkind in ('r', 'p', 'v', 'm', 'f')
     and (   has_table_privilege('authenticated', c.oid, 'SELECT, INSERT, UPDATE, DELETE')
          or has_any_column_privilege('authenticated', c.oid, 'SELECT, INSERT, UPDATE'))
),
col as (
  select r.oid, r.relname, r.relkind, att.attnum, att.attname,
         format_type(att.atttypid, att.atttypmod) as type,
         att.attnotnull, att.atthasdef, att.attidentity, att.attgenerated
    from rel r
    join pg_attribute att on att.attrelid = r.oid and att.attnum > 0 and not att.attisdropped
),
fk as (
  select con.conname, fr.relname as from_rel, tr.relname as to_rel,
         (select string_agg(att.attname, ',' order by k.ord)
            from unnest(con.conkey) with ordinality as k(attnum, ord)
            join pg_attribute att on att.attrelid = con.conrelid and att.attnum = k.attnum) as from_cols,
         (select string_agg(att.attname, ',' order by k.ord)
            from unnest(con.confkey) with ordinality as k(attnum, ord)
            join pg_attribute att on att.attrelid = con.confrelid and att.attnum = k.attnum) as to_cols
    from pg_constraint con
    join rel fr on fr.oid = con.conrelid
    join rel tr on tr.oid = con.confrelid
   where con.contype = 'f'
)
-- ⚠️ `::text` ON THE FIRST BRANCH: `proname` is a `name`, and a union takes the
-- first branch's type — every key below would be cut at 63 bytes (measured:
-- foreign keys lost their target table) and two facts could share a key.
select 'function'::text as kind, f.proname::text as key,
       ('returns ' || case when f.proretset then 'setof ' else '' end
       || case when exists (select 1 from output_col o where o.oid = f.oid)
               then 'columns' else format_type(f.prorettype, null) end)::text as detail
  from callable f
union all
select 'argument', i.proname || '.' || coalesce(nullif(i.name, ''), '$' || i.pos),
       i.type || case when i.mode = 'v' then ' variadic' else '' end
       || case when i.pos > i.pronargs - i.pronargdefaults then ' optional' else ' required' end
  from input i
union all
select 'result', o.proname || '.' || coalesce(nullif(o.name, ''), '?'), o.type
  from output_col o
union all
select 'overload', f.proname, count(*)::text
  from own_fn f
 group by f.proname
having count(*) > 1
union all
select 'relation', r.relname,
       case r.relkind when 'r' then 'table' when 'p' then 'table' when 'v' then 'view'
                      when 'm' then 'materialized view' else 'foreign table' end
  from rel r
union all
select 'column', c.relname || '.' || c.attname, c.type
  from col c
union all
select v.priv, c.relname || '.' || c.attname, ''
  from col c
 cross join (values ('select'), ('insert'), ('update')) as v(priv)
 where has_column_privilege('authenticated', c.oid, c.attnum, upper(v.priv))
union all
select 'delete', r.relname, ''
  from rel r
 where has_table_privilege('authenticated', r.oid, 'DELETE')
union all
select 'required', c.relname || '.' || c.attname, ''
  from col c
 where c.relkind in ('r', 'p')
   and c.attnotnull and not c.atthasdef and c.attidentity = '' and c.attgenerated = ''
union all
select 'relationship', fk.from_rel || '(' || fk.from_cols || ')->' || fk.to_rel || '(' || fk.to_cols || ')',
       fk.conname
  from fk
union all
select 'unique', r.relname || '('
       || (select string_agg(att.attname, ',' order by att.attname)
             from unnest(i.indkey::smallint[]) as k(attnum)
             join pg_attribute att on att.attrelid = i.indrelid and att.attnum = k.attnum)
       || ')', ''
  from pg_index i
  join rel r on r.oid = i.indrelid
 where i.indisunique and i.indpred is null and i.indexprs is null
union all
select 'enum', t.typname || '.' || e.enumlabel, ''
  from pg_type t
  join pg_enum e on e.enumtypid = t.oid
 where t.typnamespace = 'public'::regnamespace
union all
select 'bucket', b.id, ''
  from storage.buckets b
union all
select 'examined', 'functions', count(*)::text from callable
union all
select 'examined', 'relations', count(*)::text from rel
order by 1, 2