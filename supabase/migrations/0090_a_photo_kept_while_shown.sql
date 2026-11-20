-- ============================================================================
-- 0090 — a kitchen's photo: opened outside her kitchen only while it is shown,
--        and deleted by her kitchen once nothing names it
-- ============================================================================
-- docs/PLAN.md task `10.9i-ii` — the owner's D2 of 2026-11-19 (*"a photo stops
-- being kept once it stops being shown"*), as he ruled the full version on
-- 2026-11-20 (*"Follow your recommendation"*), (1) to (4). This file is (1) and
-- (2); (3) is `docs/runbooks/delete-orphan-photos.sh`, (4) Wera Cocina's aviso.
--
-- WHAT `10.9i-i` MEASURED ON THE LOCAL STACK, 2026-11-20: under `0076`'s rule a
-- neighbour who belongs to nothing opened and LISTED every picture in a
-- kitchen's folder — the cover she replaced among them — and her own phone could
-- not delete one (no delete policy: the owner's delete answered 400 for one file
-- and `200 []` for two, and both still read). No function can delete a file
-- either: Storage refuses SQL's `delete` (`storage.protect_delete`), so a file
-- goes only through Storage's API — a phone under a delete policy, or the
-- runbook's service key.
--
-- WHERE A PICTURE IS NAMED (a picture is `<workspace_id>/<uuid>`, a folder of the
-- phone's two files, `0076`'s `picture_in_folder`):
--   * her page — `kitchen_page.cover_path` and `logo_path`;
--   * every line of every offer she ever published — `listing_line.image_path`
--     (offers are never deleted, and *Repetir* sends yesterday's photo again, so
--     one dish's photo is named by many offers);
--   * each promotion — `servicio.promotion.image_path` (an undone one is deleted
--     as if never made, `0087`: its photo is then named by nothing).
--
-- WHAT IS HERE:
--   1. `public.kitchen_picture_shown(name)` — whether a file in the bucket is a
--      picture the door shows now: her cover or logo; a dish of one of her offers
--      not withdrawn whose window has not ended; a promotion while it is shown
--      (`servicio.promotion_shown`, the door's own test). Exactly what reaches a
--      neighbour — `on_offer_now`, `my_follows`, `my_cards` and `my_reservations`
--      send no other picture a build draws (Itacate's tickets blank theirs).
--   2. `public.kitchen_picture_named(name)` — whether anything names it: her page,
--      any line of any offer, any promotion.
--   3. The bucket `cocina`'s read, RE-MADE: everyone who works at the kitchen
--      opens and lists every file in its folder, as before; anyone else only what
--      (1) answers. Still only while the kitchen exists (`kitchen_folder_ok`).
--   4. A delete policy, the bucket's first: someone who works there (any role —
--      a helper publishes, `0082`) deletes a file in its folder that (2) says
--      nothing names. Wera Cocina deletes the old cover or logo right after the
--      save that replaced or removed it, and an undone promotion's photo after
--      *Deshacer*; a dish's photo stays while an offer names it — her
--      *Anteriores* and *Repetir* show it to her, and no neighbour opens it once
--      that offer ends.
--   5. An index on `listing_line.image_path`, which both questions ask.
--
-- WHAT STAYS AS IT IS: the insert policy (`0083`: any member, her own kitchen's
-- folder); no update policy (a new photo is a new path); the bucket's row
-- (private, 2 MB, JPEG/PNG/WebP); signed out, nothing. A deleted kitchen's photos
-- leave everyone's reach at once and wait for the runbook, as before.
--
-- ⚠️ WHAT IT COSTS, AS RULED: every picture a neighbour opens asks the
-- membership, then her page, her offers' lines and her promotions — each by an
-- index; a dish's photo on a page a neighbour holds open stops loading the
-- moment its offer ends; a deleted photo cannot come back (she takes it again).
-- Reversing: a new migration (`0076`'s read back, the delete policy dropped);
-- a deleted file is gone.
--
-- ⚠️ THE FIELD RULE (ADR-035 §2.2): two functions and an index added, one policy
-- re-made, one added; nothing a build calls is removed or renamed. Every picture
-- a build draws for a neighbour is one (1) answers yes to; Wera Cocina draws only
-- her own kitchen's, which its people still open. An older Wera Cocina build
-- never deletes — its replaced photos are the runbook's, after a day.
--
-- ⚠️ ONLY WHERE STORAGE RUNS for (3) and (4) — the hosted project, a local stack
-- started with `storage-api`, and CI's reset job (a full `supabase start`); the
-- jobs that exclude `storage-api` skip them with a notice. The two functions and
-- the index are made everywhere. `supabase/tests/0090_a_photo_kept_while_shown.sql`
-- asks the two questions and reads the policies' text; only
-- `docs/checks/10.5-i-a-kitchen-photos-contract.sh` drives them over the real
-- Storage API.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 0. The index both questions ask
-- ----------------------------------------------------------------------------
create index listing_line_by_photo on public.listing_line (image_path) where image_path is not null;


-- ----------------------------------------------------------------------------
-- 1. Whether a file is a picture the door shows now
-- ----------------------------------------------------------------------------
-- ⚠️ IT READS PAST THREE FENCES — `kitchen_page`'s and `listing_line`'s policies
-- show a neighbour no row, and `servicio.promotion` is granted to nobody — and
-- answers one boolean about one path: whether a neighbour may open it now, which
-- is what her read of the file answers anyway. Granted to `authenticated`
-- because Storage runs the policy as the caller.
-- ⚠️ THE FILE MUST SIT IN A PICTURE'S FOLDER, `<kitchen>/<uuid>/<file>`, lower
-- case as `picture_in_folder` writes every path a row holds: anything else in
-- the folder is shown by nothing.
create function public.kitchen_picture_shown(p_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_ws      uuid;
  v_picture text;
begin
  if p_name is null
     or p_name !~ ('^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
                   || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[^/]+$')
     or not public.kitchen_folder_ok(p_name) then
    return false;
  end if;
  v_ws      := split_part(p_name, '/', 1)::uuid;
  v_picture := split_part(p_name, '/', 1) || '/' || split_part(p_name, '/', 2);

  return exists (select 1 from public.kitchen_page kp
                  where kp.workspace_id = v_ws
                    and (kp.cover_path = v_picture or kp.logo_path = v_picture))
      or exists (select 1 from public.listing_line ll
                   join public.listing li on li.id = ll.listing_id
                  where ll.image_path = v_picture
                    and ll.workspace_id = v_ws
                    and li.withdrawn_at is null
                    and li.pickup_end > now())
      or exists (select 1 from servicio.promotion p
                  where p.workspace_id = v_ws
                    and p.image_path = v_picture
                    and servicio.promotion_shown(p));
end;
$$;

comment on function public.kitchen_picture_shown(text) is
  'True when a file of the bucket cocina is a picture a neighbour is shown now: in a picture''s '
  'folder (<kitchen>/<uuid>/<file>) of a kitchen that exists, and that picture her cover or '
  'logo, a dish of one of her offers not withdrawn whose window has not ended, or one of her '
  'promotions while shown (servicio.promotion_shown). The bucket''s read for anyone who does '
  'not work there. Reads three fences past their policies and answers one boolean. 0090, plan '
  '10.9i-ii.';

revoke all on function public.kitchen_picture_shown(text) from public, anon;
grant execute on function public.kitchen_picture_shown(text) to authenticated;


-- ----------------------------------------------------------------------------
-- 2. Whether anything names a file's picture
-- ----------------------------------------------------------------------------
-- A file's picture is its folder: the path less its last part. Named when her
-- page, any line of any offer (withdrawn or over, too) or any promotion (ended,
-- too) holds that path. ⚠️ A NAME THAT IS NOT A KITCHEN'S FILE IS ANSWERED
-- NAMED, so nothing reads it as deletable; the delete policy asks for her
-- kitchen's folder besides.
create function public.kitchen_picture_named(p_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_ws      uuid;
  v_picture text;
begin
  if p_name is null
     or split_part(p_name, '/', 1)
        !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
     or position('/' in p_name) = 0 then
    return true;
  end if;
  v_ws      := split_part(p_name, '/', 1)::uuid;
  v_picture := regexp_replace(p_name, '/[^/]*$', '');

  return exists (select 1 from public.kitchen_page kp
                  where kp.workspace_id = v_ws
                    and (kp.cover_path = v_picture or kp.logo_path = v_picture))
      or exists (select 1 from public.listing_line ll
                  where ll.image_path = v_picture)
      or exists (select 1 from servicio.promotion p
                  where p.workspace_id = v_ws
                    and p.image_path = v_picture);
end;
$$;

comment on function public.kitchen_picture_named(text) is
  'True when anything names the picture a file of the bucket cocina belongs to (its folder): '
  'her page''s cover or logo, any line of any offer, or any promotion — and for any name that '
  'is not a kitchen''s file. The bucket''s delete policy deletes only what this answers false. '
  'Reads three fences past their policies and answers one boolean. 0090, plan 10.9i-ii.';

revoke all on function public.kitchen_picture_named(text) from public, anon;
grant execute on function public.kitchen_picture_named(text) to authenticated;


-- ----------------------------------------------------------------------------
-- 3 and 4. The bucket's read, re-made, and its delete policy
-- ----------------------------------------------------------------------------
-- ⚠️ THE READ IS RE-MADE BY DROP AND CREATE, in one transaction: no moment
-- without it. `photo_folder_ok(name, 'staff')` is any active member of THAT
-- kitchen (`0083`'s insert asks the same); `kitchen_folder_ok` keeps `0076`'s
-- promise — only while the kitchen exists, for her people too.
do $fotos$
begin
  if to_regclass('storage.objects') is null then
    raise notice '0090: no Storage here — the bucket cocina''s read and delete policies are made where Storage runs';
    return;
  end if;

  execute 'drop policy if exists cocina_select on storage.objects';
  execute $p$
    create policy cocina_select on storage.objects
      for select to authenticated
      using (bucket_id = 'cocina'
             and public.kitchen_folder_ok(name)
             and (public.photo_folder_ok(name, 'staff') or public.kitchen_picture_shown(name)))
  $p$;
  execute $p$
    create policy cocina_delete on storage.objects
      for delete to authenticated
      using (bucket_id = 'cocina'
             and public.kitchen_folder_ok(name)
             and public.photo_folder_ok(name, 'staff')
             and not public.kitchen_picture_named(name))
  $p$;
end
$fotos$;
