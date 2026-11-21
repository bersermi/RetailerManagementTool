-- ============================================================================
-- 0093 — CAMPAIGNS, IN THE DATABASE. Plan task `10.5c-ii`, on `10.5c-i`'s design.
--
-- ⚠️ BUILT AHEAD OF HIS PRODUCT ANALYST'S ANSWERS (the owner's ruling of 2026-11-20,
-- *"Yes, follow your recommendation"*): each of her open questions — 2 to 5 of the
-- notifications page — is a SETTING here, its recommended value the default, so her
-- answer is an UPDATE and never a migration:
--   question 2 — her yes kept as TWO purposes (`promociones`: receiving offers;
--                `medir_promociones`: counting what each did), whatever one sheet or two
--                asks — the words she approves say which purposes they cover;
--   question 3 — the hours and the limits: `notification_rule`, one row;
--   question 4 — what a campaign may choose people by: `campaign_audience`, a closed
--                list, each fact switchable off by its row;
--   question 5 — campaigns started in SQL by him (this file's functions and
--                `docs/runbooks/campaigns.sql`), and the days a row naming who got what
--                is kept: `notification_rule.keep_days`, one number.
-- ⚠️⚠️ AND DARK UNTIL SHE RULES: the two promotion kinds are written OFF (`is_on`,
-- Wera's own switch for a kind), and NO WORDS ARE APPROVED (`consent_words` is empty),
-- so nobody can say yes and nothing is sent as a promotion. Turning promotions on is
-- her words inserted and one UPDATE per kind. His own test accounts
-- (`campaign_tester`) see the dark kinds — their phones make the channels — and get
-- `test_campaign`'s sends, counted nowhere.
--
--   servicio.notification_rule  the hours and limits of a promotion, the on-request
--                               limit and the days per-person rows are kept — one row
--   servicio.consent_words      each version of the words a yes is given on: the app,
--                               the purposes it covers, the screen, the text as shown
--   servicio.consent            each yes and each no, per app and purpose, with the words'
--                               version and its moment — only ever added to
--   servicio.campaign_audience  the closed list of facts a campaign may choose people by
--   servicio.campaign_tester    his own accounts: where a test goes
--   servicio.campaign           a campaign: its kind, audience, start, expiry, the window
--                               that counts what she did after, the share held back
--   servicio.campaign_variant   its wordings, each with a weight
--   servicio.campaign_member    who was in it, in which group, when she was sent it
--                               (deleted after keep_days)
--   servicio.campaign_count     the counts per group once its window closed — kept
--
-- ⚠️ EACH PERSON'S GROUP IS FIXED BY A HASH: `md5` of the campaign's number and her
-- account, its first 32 bits modulo 100 — buckets below the share held back get
-- nothing, the rest are split by the wordings' weights. Run a campaign's numbers again
-- and everyone lands where she landed.
--
-- ⚠️ SENT FROM POSTGRES THROUGH `pg_net` (ADR-035 §2.2): a `pg_cron` job each minute
-- (`send-campaigns`) sends what is due, inside the hours, under every limit, only to
-- someone whose latest answer for `promociones` is yes and only to a phone that will
-- show it; each request to Expo carries up to 100 messages of one app; Expo's answers
-- are read back by `0092`'s `read-push-answers`, unchanged. A message carries its send's
-- number, so a tap is reported with it and nothing else (`count_campaign_tap`).
--
-- ⚠️ A PERSON'S TABLES (ADR-035 §2.7, *What is hers*): every table sits in the closed
-- `servicio` schema; the phone reaches three functions keyed on `auth.uid()`
-- (`set_my_consent`, `my_consent`, `count_campaign_tap`); everything he runs is granted
-- to nobody and answers counts, never a name.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. The rules — one row (question 3, and question 5's number)
-- ----------------------------------------------------------------------------

create table servicio.notification_rule (
  id              boolean primary key default true,
  zone            text     not null default 'America/Mexico_City',
  promo_from      time     not null default '09:00',
  promo_until     time     not null default '20:00',
  promo_per_day   smallint not null default 1,
  promo_per_week  smallint not null default 3,
  request_per_day smallint not null default 1,
  keep_days       smallint not null default 30,
  changed_at      timestamptz not null default now(),

  constraint notification_rule_one_row check (id),
  constraint notification_rule_hours check (promo_from < promo_until),
  constraint notification_rule_per_day check (promo_per_day between 0 and 10),
  constraint notification_rule_per_week check (promo_per_week between promo_per_day and 50),
  constraint notification_rule_request_per_day check (request_per_day between 0 and 10),
  constraint notification_rule_keep_days check (keep_days between 1 and 365)
);

insert into servicio.notification_rule default values;

comment on table servicio.notification_rule is
  'The rules every promotion keeps, one row (10.5c-i, question 3 — the analyst''s, built ahead '
  'with the recommended numbers): sent only from promo_from to promo_until in zone; at most '
  'promo_per_day a day (her day in zone) and promo_per_week in the last 7 days per person per '
  'app, every campaign counted together, a test never; request_per_day — a kitchen''s '
  'on-request messages a day (10.9h); keep_days — how long a row naming who got what is kept '
  '(question 5). Her numbers are an UPDATE; looser numbers change the words people said yes '
  'to. 0093, plan 10.5c-ii.';


-- ----------------------------------------------------------------------------
-- 2. Her yes, as a record (question 2)
-- ----------------------------------------------------------------------------

create table servicio.consent_words (
  words     text primary key,
  app       text not null,
  purposes  text[] not null,
  shown_on  text not null,
  body      text not null,
  added_at  timestamptz not null default now(),

  constraint consent_words_shape check (words ~ '^[a-z0-9][a-z0-9_.-]{0,39}$'),
  constraint consent_words_app_known check (app in ('cocina', 'itacate')),
  constraint consent_words_purposes_known check (
    cardinality(purposes) between 1 and 2
    and purposes <@ array['promociones', 'medir_promociones']),
  constraint consent_words_shown_on_known check (shown_on in ('hoja', 'ajustes')),
  constraint consent_words_body check (btrim(body) <> '' and length(body) <= 2000)
);

comment on table servicio.consent_words is
  'Each version of the words a person answers on: its app, the purposes the words name '
  '(promociones — receiving offers; medir_promociones — counting what each did: one sheet '
  'naming both covers both, two screens each cover one), where they are shown (hoja — the '
  'sheet at its moment; ajustes — her switch in Notificaciones) and the text exactly as the '
  'screen shows it. ⚠️ EMPTY UNTIL THE ANALYST APPROVES THE WORDS: set_my_consent refuses a '
  'version that is not here, so nobody can say yes before then. Never changed: new words are '
  'a new version. 0093, plan 10.5c-ii.';

create function servicio.consent_words_never_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'consent_words: words people answered on never change — insert a new version'
    using errcode = '55000';
end;
$$;

revoke all on function servicio.consent_words_never_change() from public, anon, authenticated;

create trigger consent_words_never_change
  before update on servicio.consent_words
  for each row execute function servicio.consent_words_never_change();

create table servicio.consent (
  id        bigint generated always as identity primary key,
  user_id   uuid not null references auth.users (id) on delete cascade,
  app       text not null,
  purpose   text not null,
  answer    boolean not null,
  words     text not null references servicio.consent_words (words),
  given_at  timestamptz not null default now(),

  constraint consent_app_known check (app in ('cocina', 'itacate')),
  constraint consent_purpose_known check (purpose in ('promociones', 'medir_promociones'))
);

create index consent_latest_idx on servicio.consent (user_id, app, purpose, id desc);

comment on table servicio.consent is
  'Each yes and each no she gave, per app and purpose, with the version of the words she '
  'saw and its moment; her answer now is her latest row. ⚠️ ONLY EVER ADDED TO — a trigger '
  'refuses an UPDATE; her rows go with her account and with nothing else. Written only by '
  'set_my_consent. 0093, plan 10.5c-ii.';

create function servicio.consent_is_only_added_to()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'consent: a record of her answer is only ever added to' using errcode = '55000';
end;
$$;

revoke all on function servicio.consent_is_only_added_to() from public, anon, authenticated;

create trigger consent_is_only_added_to
  before update on servicio.consent
  for each row execute function servicio.consent_is_only_added_to();

-- Her answer now for one purpose: her latest row's, and no until she has one.
create function servicio.consent_now(p_user uuid, p_app text, p_purpose text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select c.answer from servicio.consent c
                    where c.user_id = p_user and c.app = p_app and c.purpose = p_purpose
                    order by c.id desc limit 1), false)
$$;

revoke all on function servicio.consent_now(uuid, text, text) from public, anon, authenticated;

-- Her answers in one app, each purpose with her latest answer, its words and moment —
-- null for a purpose she was never asked.
create function servicio.consents_of(p_user uuid, p_app text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_object_agg(p.purpose, (
           select jsonb_build_object('answer', c.answer, 'words', c.words, 'at', c.given_at)
             from servicio.consent c
            where c.user_id = p_user and c.app = p_app and c.purpose = p.purpose
            order by c.id desc limit 1))
    from unnest(array['promociones', 'medir_promociones']) as p (purpose)
$$;

revoke all on function servicio.consents_of(uuid, text) from public, anon, authenticated;


-- ----------------------------------------------------------------------------
-- 3. The kinds a campaign is sent as — written dark
-- ----------------------------------------------------------------------------
-- ⚠️ `is_on` FALSE: offered to nobody but his test accounts, and the sender refuses a
-- kind that is off. Words as `10.5c-i` drew them; a row update changes them.

insert into servicio.notification_kind
  (kind, app, class, channel, channel_name, importance, label, detail, default_on, is_on, opens, position)
values
  ('novedades', 'cocina', 'promocion', 'novedades', 'Novedades de Wera Cocina', 'normal',
   'Novedades de Wera Cocina', 'Consejos y novedades de la app.', false, false, 'hoy', 3),
  ('ofertas', 'itacate', 'promocion', 'ofertas', 'Ofertas y novedades', 'normal',
   'Ofertas y novedades', 'Ofertas y novedades de las cocinas de Itacate.', false, false, 'cerca', 2);


-- ----------------------------------------------------------------------------
-- 4. What a campaign may choose people by (question 4), and his test accounts
-- ----------------------------------------------------------------------------

create table servicio.campaign_audience (
  app       text not null,
  audience  text not null,
  is_on     boolean not null default true,
  means     text not null,
  position  smallint not null default 0,

  constraint campaign_audience_pkey primary key (app, audience),
  constraint campaign_audience_app_known check (app in ('cocina', 'itacate')),
  constraint campaign_audience_shape check (audience ~ '^[a-z0-9_]+$')
);

insert into servicio.campaign_audience (app, audience, means, position) values
  ('itacate', 'todos',          'Everyone who said yes', 1),
  ('itacate', 'nunca_aparto',   'Said yes and has never reserved', 2),
  ('itacate', 'recogio',        'Said yes and has collected at least once', 3),
  ('itacate', 'sin_apartar_7',  'Said yes, reserved before, and not in the last 7 days', 4),
  ('itacate', 'sin_apartar_14', 'Said yes, reserved before, and not in the last 14 days', 5),
  ('itacate', 'sin_apartar_30', 'Said yes, reserved before, and not in the last 30 days', 6),
  ('cocina',  'todos',          'Everyone who said yes', 1),
  ('cocina',  'publico_7',      'Said yes, and her kitchen published in the last 7 days', 2),
  ('cocina',  'sin_publicar_7', 'Said yes, has a kitchen, and it has not published in the last 7 days', 3),
  ('cocina',  'tuvo_apartado',  'Said yes, and her kitchen has had at least one reservation', 4),
  ('cocina',  'sin_apartado',   'Said yes, has a kitchen, and it has never had a reservation', 5);

comment on table servicio.campaign_audience is
  'The closed list of facts a campaign may choose people by (10.5c-i, question 4 — the '
  'analyst''s, built ahead with the recommended list), every one on top of her yes and '
  'always minus the group held back: facts the database already holds, each to be named in '
  'the aviso. ⚠️ NEVER where she is, her score or the thumbs kitchens gave her, what she eats, '
  'anything from another of the three apps, anything guessed. is_on false switches a fact off '
  '(new_campaign and the sender refuse it); adding one is a line in servicio.audience_people '
  'and an aviso change — a migration. 0093, plan 10.5c-ii.';

create table servicio.campaign_tester (
  user_id   uuid primary key references auth.users (id) on delete cascade,
  added_at  timestamptz not null default now()
);

comment on table servicio.campaign_tester is
  'His own accounts: test_campaign sends every wording to their phones, hours, limits and '
  'answers ignored, counted nowhere; they are offered the kinds Wera has dark, so their '
  'phones make the channels; and a real campaign never counts them. Filled by hand, by '
  'email, from docs/runbooks/campaigns.sql — no address is ever committed. 0093, plan '
  '10.5c-ii.';


-- ----------------------------------------------------------------------------
-- 5. Campaigns, their wordings, who was in each, the counts kept
-- ----------------------------------------------------------------------------

create table servicio.campaign (
  id            bigint generated always as identity primary key,
  app           text not null,
  kind          text not null references servicio.notification_kind (kind),
  audience      text not null,
  starts_at     timestamptz not null,
  expires_at    timestamptz not null,
  window_hours  smallint not null,
  held_out      smallint not null,
  opens         text not null,
  opens_id      uuid,
  note          text,
  created_at    timestamptz not null default now(),
  tested_at     timestamptz,
  launched_at   timestamptz,
  stopped_at    timestamptz,
  counted_at    timestamptz,

  constraint campaign_audience_fk foreign key (app, audience)
    references servicio.campaign_audience (app, audience),
  constraint campaign_app_known check (app in ('cocina', 'itacate')),
  constraint campaign_dates check (expires_at > starts_at and expires_at - starts_at <= interval '14 days'),
  constraint campaign_window check (window_hours between 1 and 168),
  constraint campaign_held_out check (held_out between 0 and 90),
  constraint campaign_opens_shape check (opens ~ '^[a-z_]+$'),
  constraint campaign_note check (note is null or length(note) <= 500)
);

create index campaign_live_idx on servicio.campaign (starts_at)
  where launched_at is not null and stopped_at is null;
create index campaign_uncounted_idx on servicio.campaign (expires_at)
  where launched_at is not null and counted_at is null;

comment on table servicio.campaign is
  'A campaign he starts in SQL (10.5c-i, question 5): its app, its promotion kind, its '
  'audience from the closed list, when it may go and when it expires (at most 14 days), the '
  'window in hours that counts what she did after (a reservation in Itacate, a publication in '
  'Wera Cocina; at most 7 days), the share held back (per cent, 0 to 90), what a tap opens '
  '(and which, if a kitchen or a dish), his note. tested_at — a test went out, which '
  'launch_campaign requires; launched_at, stopped_at; counted_at — campaign_count written. '
  'Never a person. 0093, plan 10.5c-ii.';

create table servicio.campaign_variant (
  campaign_id  bigint not null references servicio.campaign (id) on delete cascade,
  variant      text not null,
  weight       smallint not null,
  title        text not null,
  body         text not null,

  constraint campaign_variant_pkey primary key (campaign_id, variant),
  constraint campaign_variant_key check (variant ~ '^[A-Z]$'),
  constraint campaign_variant_weight check (weight between 1 and 100),
  constraint campaign_variant_title check (btrim(title) <> '' and length(title) <= 80),
  constraint campaign_variant_body check (btrim(body) <> '' and length(body) <= 240)
);

comment on table servicio.campaign_variant is
  'A campaign''s wordings, A to Z, each with its weight (a campaign''s weights add to 100): '
  'what her phone shows. 0093, plan 10.5c-ii.';

create table servicio.campaign_member (
  campaign_id  bigint not null references servicio.campaign (id) on delete cascade,
  user_id      uuid not null references auth.users (id) on delete cascade,
  variant      text,
  measured     boolean not null,
  joined_at    timestamptz not null,
  sent_at      timestamptz,

  constraint campaign_member_pkey primary key (campaign_id, user_id),
  constraint campaign_member_variant_fk foreign key (campaign_id, variant)
    references servicio.campaign_variant (campaign_id, variant)
);

create index campaign_member_sent_idx on servicio.campaign_member (user_id, sent_at) where sent_at is not null;
create index campaign_member_joined_idx on servicio.campaign_member (joined_at);

comment on table servicio.campaign_member is
  'One person in one campaign: her wording (NULL — held back, sent nothing), whether what she '
  'did is counted (her yes to medir_promociones, never for his test accounts), when she '
  'entered it (the held-back group''s moment) and when it was sent to her (NULL while her '
  'limits, her hours or her phones hold it). Her window starts at sent_at, else joined_at. '
  'Deleted keep_days after joined_at by servicio.forget_old_pushes; the counts stay in '
  'campaign_count. 0093, plan 10.5c-ii.';

create table servicio.campaign_count (
  campaign_id  bigint not null references servicio.campaign (id) on delete cascade,
  grp          text not null,
  people       integer not null,
  reached      integer not null,
  accepted     integer not null,
  handed_over  integer not null,
  tapped       integer not null,
  acted        integer not null,
  unmeasured   integer not null,

  constraint campaign_count_pkey primary key (campaign_id, grp),
  constraint campaign_count_grp check (grp = 'held_back' or grp ~ '^[A-Z]$')
);

comment on table servicio.campaign_count is
  'A campaign''s counts per group once its window closed — kept after the rows naming who '
  'got what are deleted: people counted (her yes to medir_promociones), reached (sent to at '
  'least one of her phones), accepted (Expo''s ticket ok), handed_over (Expo''s receipt ok — '
  'given to Apple or Google, never "shown"), tapped, acted (reserved, or her kitchen '
  'published, within the window); unmeasured — people sent it whose doings are not counted. '
  'Never a name. 0093, plan 10.5c-ii.';

-- Each message of a campaign: its campaign, its wording, whether it was his test, and
-- her tap. A service kind's messages leave all four empty.
alter table servicio.notification_send
  add column campaign_id bigint references servicio.campaign (id) on delete cascade,
  add column variant     text,
  add column test        boolean not null default false,
  add column tapped_at   timestamptz;

create index notification_send_by_campaign_idx on servicio.notification_send (campaign_id)
  where campaign_id is not null;

comment on column servicio.notification_send.campaign_id is
  'The campaign this message is, with variant and test; NULL for a service kind''s. 0093.';
comment on column servicio.notification_send.tapped_at is
  'Her first tap on this campaign message, reported by count_campaign_tap — only while she '
  'is counted; a service kind''s taps are counted with nobody (notification_tap_count). 0093.';

revoke all on servicio.notification_rule  from public, anon, authenticated;
revoke all on servicio.consent_words      from public, anon, authenticated;
revoke all on servicio.consent            from public, anon, authenticated;
revoke all on servicio.campaign_audience  from public, anon, authenticated;
revoke all on servicio.campaign_tester    from public, anon, authenticated;
revoke all on servicio.campaign           from public, anon, authenticated;
revoke all on servicio.campaign_variant   from public, anon, authenticated;
revoke all on servicio.campaign_member    from public, anon, authenticated;
revoke all on servicio.campaign_count     from public, anon, authenticated;


-- ----------------------------------------------------------------------------
-- 6. The kinds and her switch, re-made — their signatures and answers unchanged
-- ----------------------------------------------------------------------------
-- `0092`'s bodies, two changes: a promotion kind's `is_on` is her answer for
-- `promociones` (never a switch row), and his test accounts are offered the kinds
-- Wera has dark — and may switch a dark service kind.

create or replace function servicio.kinds_of(p_user uuid, p_app text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'kind', k.kind,
           'class', k.class,
           'channel', k.channel,
           'channel_name', k.channel_name,
           'importance', k.importance,
           'label', k.label,
           'detail', k.detail,
           'opens', k.opens,
           -- a promotion kind: her answer (never a switch row — set_notification_switch refuses one)
           'is_on', coalesce(case when k.class = 'promocion' then servicio.consent_now(p_user, k.app, 'promociones') end,
                             s.is_on, k.default_on))
         order by k.position, k.kind), '[]'::jsonb)
    from servicio.notification_kind k
    left join servicio.notification_switch s on s.user_id = p_user and s.kind = k.kind
   where k.app = p_app
     and (k.is_on or exists (select 1 from servicio.campaign_tester t where t.user_id = p_user))
$$;

comment on function servicio.kinds_of(uuid, text) is
  'Her kinds in one app, in the order the app draws them: those Wera has on — and, for his '
  'test accounts, those it has dark too; is_on her switch (else the default), or for a '
  'promotion kind her latest answer for promociones. 0092; re-made by 0093, plan 10.5c-ii.';

create or replace function public.set_notification_switch(p_kind text, p_on boolean)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_kind servicio.notification_kind;
begin
  if v_user is null then
    raise exception 'set_notification_switch requires an authenticated caller' using errcode = '42501';
  end if;
  select * into v_kind from servicio.notification_kind k
   where k.kind = p_kind
     and (k.is_on or exists (select 1 from servicio.campaign_tester t where t.user_id = v_user));
  if not found or p_on is null then
    raise exception 'set_notification_switch: no such kind, or no answer' using errcode = '22023';
  end if;
  -- ⚠️ A PROMOTION IS NEVER TURNED ON HERE: it needs her express yes, kept as a record
  -- (set_my_consent, 0093); asking for something on request is per kitchen (10.9h).
  if v_kind.class <> 'servicio' then
    raise exception 'set_notification_switch: only a service kind is switched here' using errcode = '22023';
  end if;

  insert into servicio.notification_switch as s (user_id, kind, is_on)
  values (v_user, p_kind, p_on)
  on conflict (user_id, kind) do update
     set is_on      = excluded.is_on,
         changed_at = case when s.is_on is distinct from excluded.is_on then now() else s.changed_at end;

  return servicio.kinds_of(v_user, v_kind.app);
end;
$$;

comment on function public.set_notification_switch(text, boolean) is
  'The caller turns a service kind on or off for herself, on every phone of hers; the sender '
  'reads it before every message. Answers her kinds of that app (my_notification_kinds''s '
  'answer). 42501 signed out, 22023 no such kind (or Wera switched it off — his test accounts '
  'may switch a dark one), no answer, or a kind that is not a service one. Keyed on '
  'auth.uid(). 0092; re-made by 0093, plan 10.5c-ii.';


-- ----------------------------------------------------------------------------
-- 7. What the phone calls — keyed on her own id
-- ----------------------------------------------------------------------------

-- Her answer, on words the analyst approved: one row per purpose the words name.
create function public.set_my_consent(p_words text, p_answer boolean)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user  uuid := auth.uid();
  v_words servicio.consent_words;
begin
  if v_user is null then
    raise exception 'set_my_consent requires an authenticated caller' using errcode = '42501';
  end if;
  select * into v_words from servicio.consent_words w where w.words = p_words;
  if not found or p_answer is null then
    raise exception 'set_my_consent: words that were never approved, or no answer' using errcode = '22023';
  end if;

  insert into servicio.consent (user_id, app, purpose, answer, words)
  select v_user, v_words.app, p.purpose, p_answer, v_words.words
    from unnest(v_words.purposes) as p (purpose);

  -- ⚠️ A NO TO COUNTING STOPS IT AT ONCE: in every campaign not yet counted, what she
  -- does is no longer counted (and a tap no longer kept).
  if not p_answer and 'medir_promociones' = any(v_words.purposes) then
    update servicio.campaign_member m
       set measured = false
      from servicio.campaign c
     where c.id = m.campaign_id and c.app = v_words.app and c.counted_at is null
       and m.user_id = v_user and m.measured;
  end if;

  return servicio.consents_of(v_user, v_words.app);
end;
$$;

comment on function public.set_my_consent(text, boolean) is
  'The caller''s yes or no on one version of approved words (servicio.consent_words): one '
  'record per purpose those words name, with the version and the moment — never changed, '
  'only added to. A no to medir_promociones stops counting her in every campaign not yet '
  'counted. Answers my_consent''s answer for that app. 42501 signed out, 22023 words never '
  'approved or no answer. Keyed on auth.uid(). 0093, plan 10.5c-ii.';

create function public.my_consent(p_app text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'my_consent requires an authenticated caller' using errcode = '42501';
  end if;
  if p_app is null or p_app not in ('cocina', 'itacate') then
    raise exception 'my_consent: the app is cocina or itacate' using errcode = '22023';
  end if;
  return servicio.consents_of(auth.uid(), p_app);
end;
$$;

comment on function public.my_consent(text) is
  'The caller''s answers in one app (cocina, itacate): for promociones and for '
  'medir_promociones, her latest answer with its words'' version and moment ({answer, words, '
  'at}), or null if she was never asked — what the app reads to ask once and to draw her '
  'switch. 42501 signed out, 22023 an app it does not know. Keyed on auth.uid(). 0093, plan '
  '10.5c-ii.';

-- A tap on a campaign's message, reported with the send's number the message carries.
create function public.count_campaign_tap(p_send bigint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'count_campaign_tap requires an authenticated caller' using errcode = '42501';
  end if;
  if p_send is null then
    raise exception 'count_campaign_tap: a send''s number' using errcode = '22023';
  end if;
  -- Kept only for her own message of a real campaign, while she is counted, first tap
  -- only; anything else — another's, a test, a row already forgotten — changes nothing
  -- and says nothing.
  update servicio.notification_send s
     set tapped_at = now()
    from servicio.push_token t, servicio.campaign_member m
   where s.id = p_send and s.tapped_at is null and not s.test and s.campaign_id is not null
     and t.id = s.token_id and t.user_id = v_user
     and m.campaign_id = s.campaign_id and m.user_id = v_user and m.measured;
end;
$$;

comment on function public.count_campaign_tap(bigint) is
  'Her tap on a campaign''s message: the send''s number from the message''s data. Kept on '
  'that message only if it was sent to her, is no test, and she is counted (her yes to '
  'medir_promociones); otherwise nothing changes and nothing is said. 42501 signed out, 22023 '
  'no number. Keyed on auth.uid(). 0093, plan 10.5c-ii.';


-- ----------------------------------------------------------------------------
-- 8. Who: the audience, the group, the phones
-- ----------------------------------------------------------------------------

-- ⚠️ THE ONE PLACE A CAMPAIGN CHOOSES PEOPLE: her latest answer for `promociones` is yes,
-- and the audience's fact holds — each fact one line. A kitchen is hers while she is an
-- active member of a workspace of kind `cocina`; *collected* is `reservation_state`'s
-- `recogido` (handed over or confirmed).
create function servicio.audience_people(p_app text, p_audience text, p_now timestamptz default now())
returns table (user_id uuid)
language sql
stable
security definer
set search_path = ''
as $$
  with yes as (
    select distinct on (c.user_id) c.user_id, c.answer
      from servicio.consent c
     where c.app = p_app and c.purpose = 'promociones'
     order by c.user_id, c.id desc
  ),
  kitchen as (
    select m.user_id, m.workspace_id
      from public.workspace_member m
      join public.workspace w on w.id = m.workspace_id and w.kind = 'cocina'
     where m.is_active
  )
  select y.user_id
    from yes y
   where y.answer
     and case p_app || ':' || p_audience
           when 'itacate:todos' then true
           when 'itacate:nunca_aparto' then
             not exists (select 1 from public.reservation r where r.buyer_id = y.user_id)
           when 'itacate:recogio' then
             exists (select 1 from public.reservation r where r.buyer_id = y.user_id
                        and (r.handed_over_at is not null or r.picked_up_at is not null))
           when 'itacate:sin_apartar_7' then
             exists (select 1 from public.reservation r where r.buyer_id = y.user_id)
             and not exists (select 1 from public.reservation r where r.buyer_id = y.user_id
                                and r.created_at > p_now - interval '7 days')
           when 'itacate:sin_apartar_14' then
             exists (select 1 from public.reservation r where r.buyer_id = y.user_id)
             and not exists (select 1 from public.reservation r where r.buyer_id = y.user_id
                                and r.created_at > p_now - interval '14 days')
           when 'itacate:sin_apartar_30' then
             exists (select 1 from public.reservation r where r.buyer_id = y.user_id)
             and not exists (select 1 from public.reservation r where r.buyer_id = y.user_id
                                and r.created_at > p_now - interval '30 days')
           when 'cocina:todos' then true
           when 'cocina:publico_7' then
             exists (select 1 from kitchen k join public.listing li on li.workspace_id = k.workspace_id
                      where k.user_id = y.user_id and li.created_at > p_now - interval '7 days')
           when 'cocina:sin_publicar_7' then
             exists (select 1 from kitchen k where k.user_id = y.user_id)
             and not exists (select 1 from kitchen k join public.listing li on li.workspace_id = k.workspace_id
                              where k.user_id = y.user_id and li.created_at > p_now - interval '7 days')
           when 'cocina:tuvo_apartado' then
             exists (select 1 from kitchen k join public.reservation r on r.workspace_id = k.workspace_id
                      where k.user_id = y.user_id)
           when 'cocina:sin_apartado' then
             exists (select 1 from kitchen k where k.user_id = y.user_id)
             and not exists (select 1 from kitchen k join public.reservation r on r.workspace_id = k.workspace_id
                              where k.user_id = y.user_id)
           else false
         end
$$;

comment on function servicio.audience_people(text, text, timestamptz) is
  'Who a campaign of this app and audience chooses, at a moment: her latest answer for '
  'promociones is yes, and the audience''s fact holds — each fact one line (campaign_audience). '
  'Nothing about where she is, her score, what she eats or another app. Granted to nobody. '
  '0093, plan 10.5c-ii.';

revoke all on function servicio.audience_people(text, text, timestamptz) from public, anon, authenticated;

-- Her bucket in a campaign: 0 to 99, the same in every run and every Postgres.
create function servicio.campaign_bucket(p_campaign bigint, p_user uuid)
returns smallint
language sql
immutable
set search_path = ''
as $$
  select ((('x' || left(md5(p_campaign::text || ':' || p_user::text), 8))::bit(32)::bigint) % 100)::smallint
$$;

revoke all on function servicio.campaign_bucket(bigint, uuid) from public, anon, authenticated;

-- Her wording in a campaign, or NULL — held back: buckets below the share held back get
-- nothing; the rest are split in order of the wordings, by their weights.
create function servicio.campaign_variant_of(p_campaign bigint, p_user uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  with c as (select held_out from servicio.campaign where id = p_campaign),
  b as (select servicio.campaign_bucket(p_campaign, p_user) as bucket),
  v as (
    select v.variant,
           sum(v.weight) over (order by v.variant) as upto
      from servicio.campaign_variant v
     where v.campaign_id = p_campaign
  )
  select case
           when b.bucket < c.held_out then null
           else (select v.variant from v
                  where b.bucket < c.held_out + floor(v.upto * (100 - c.held_out) / 100.0)
                  order by v.variant limit 1)
         end
    from c, b
$$;

revoke all on function servicio.campaign_variant_of(bigint, uuid) from public, anon, authenticated;

-- The phones a kind may be sent to for these people: live, allowed, in the kind's app,
-- and on Android holding the kind's channel unsilenced (Android drops a push for a
-- channel the phone has not made, without a word).
create function servicio.campaign_phones(p_kind text, p_users uuid[])
returns uuid[]
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(array_agg(t.id order by t.id), '{}')
    from servicio.notification_kind k
    join servicio.push_token t on t.app = k.app and t.user_id = any(p_users)
                              and t.retired_at is null and t.allowed
   where k.kind = p_kind
     and (t.platform = 'ios' or (k.channel = any(t.channels) and not k.channel = any(t.silenced)))
$$;

revoke all on function servicio.campaign_phones(text, uuid[]) from public, anon, authenticated;


-- ----------------------------------------------------------------------------
-- 9. The sender
-- ----------------------------------------------------------------------------

-- Queues one wording of a campaign to these phones, 100 to a request: the rows first, so
-- each message carries its own send's number for the tap. Answers how many it queued.
create function servicio.campaign_push(p_campaign bigint, p_variant text, p_tokens uuid[], p_test boolean)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_c       servicio.campaign;
  v_kind    servicio.notification_kind;
  v_v       servicio.campaign_variant;
  v_headers jsonb;
  v_message jsonb;
  v_sends   bigint[];
  v_tokens  text[];
  v_request bigint;
  v_n       integer := 0;
  v_from    integer;
begin
  select * into v_c from servicio.campaign c where c.id = p_campaign;
  select * into v_kind from servicio.notification_kind k where k.kind = v_c.kind;
  select * into v_v from servicio.campaign_variant v where v.campaign_id = p_campaign and v.variant = p_variant;
  if v_c.id is null or v_v.variant is null or coalesce(cardinality(p_tokens), 0) = 0 then
    return 0;
  end if;
  v_headers := servicio.expo_headers();
  v_message := jsonb_build_object(
    'title', v_v.title,
    'body', v_v.body,
    'data', jsonb_strip_nulls(jsonb_build_object(
              'kind', v_c.kind, 'opens', v_c.opens, 'opens_id', v_c.opens_id, 'campaign_id', v_c.id)));

  for v_from in 1 .. cardinality(p_tokens) by 100 loop
    with ins as (
      insert into servicio.notification_send (kind, token_id, message, campaign_id, variant, test)
      select v_c.kind, t.id, v_message, v_c.id, p_variant, coalesce(p_test, false)
        from servicio.push_token t
       where t.id = any(p_tokens[v_from : v_from + 99]) and t.retired_at is null
      returning id, token_id
    )
    select array_agg(ins.id order by ins.id), array_agg(t.token order by ins.id)
      into v_sends, v_tokens
      from ins join servicio.push_token t on t.id = ins.token_id;
    continue when v_sends is null;

    v_request := net.http_post(
      url                  := 'https://exp.host/--/api/v2/push/send',
      body                 := (select jsonb_agg(
                                        jsonb_set(v_message, '{data,send_id}', to_jsonb(x.send))
                                        || jsonb_build_object('to', x.token, 'channelId', v_kind.channel,
                                                              'sound', 'default', 'priority', 'normal')
                                        order by x.n)
                                 from unnest(v_sends, v_tokens) with ordinality as x (send, token, n)),
      headers              := v_headers,
      timeout_milliseconds := 10000
    );

    update servicio.notification_send s
       set request_id = v_request, request_pos = (x.n - 1)::smallint
      from unnest(v_sends) with ordinality as x (send, n)
     where s.id = x.send;
    v_n := v_n + cardinality(v_sends);
  end loop;
  return v_n;
end;
$$;

comment on function servicio.campaign_push(bigint, text, uuid[], boolean) is
  'Queues one wording of a campaign to these phones through pg_net, 100 to a request, on the '
  'kind''s Android channel, priority normal, Expo''s access token when the Vault holds one; '
  'one notification_send row per message, written first so each message''s data carries its '
  'send_id (with kind, opens, opens_id, campaign_id). Granted to nobody. 0093, plan 10.5c-ii.';

revoke all on function servicio.campaign_push(bigint, text, uuid[], boolean) from public, anon, authenticated;

-- The job each minute: inside the hours, each launched campaign takes in whoever its
-- audience holds now (her group fixed by the hash), then sends each wording to the
-- people due — not yet sent, still saying yes, under her limits — up to 1,000 a run.
create function servicio.send_due_campaigns(p_now timestamptz default now())
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_rule    servicio.notification_rule;
  v_local   timestamp;
  v_today   date;
  v_c       servicio.campaign;
  v_variant text;
  v_users   uuid[];
  v_tokens  uuid[];
  v_left    integer;
  v_joined  integer := 0;
  v_sent    integer := 0;
  v_n       integer;
  v_counted integer;
begin
  select * into v_rule from servicio.notification_rule;
  v_local := p_now at time zone v_rule.zone;
  v_today := v_local::date;

  if v_local::time >= v_rule.promo_from and v_local::time < v_rule.promo_until then
    for v_c in
      select c.* from servicio.campaign c
        join servicio.notification_kind k on k.kind = c.kind and k.is_on
        join servicio.campaign_audience a on a.app = c.app and a.audience = c.audience and a.is_on
       where c.launched_at is not null and c.stopped_at is null
         and c.starts_at <= p_now and c.expires_at > p_now
       order by c.starts_at, c.id
    loop
      begin
        insert into servicio.campaign_member (campaign_id, user_id, variant, measured, joined_at)
        select v_c.id, p.user_id,
               servicio.campaign_variant_of(v_c.id, p.user_id),
               servicio.consent_now(p.user_id, v_c.app, 'medir_promociones')
                 and not exists (select 1 from servicio.campaign_tester t where t.user_id = p.user_id),
               p_now
          from servicio.audience_people(v_c.app, v_c.audience, p_now) p
        on conflict (campaign_id, user_id) do nothing;
        get diagnostics v_n = row_count;
        v_joined := v_joined + v_n;

        v_left := 1000;
        for v_variant in
          select v.variant from servicio.campaign_variant v where v.campaign_id = v_c.id order by v.variant
        loop
          exit when v_left <= 0;
          -- ⚠️ HER LIMITS COUNT EVERY CAMPAIGN OF THE APP TOGETHER — and the sends this
          -- run already made, since each statement sees the ones before it.
          select array_agg(q.user_id) into v_users
            from (select m.user_id
                    from servicio.campaign_member m
                   where m.campaign_id = v_c.id and m.variant = v_variant and m.sent_at is null
                     and servicio.consent_now(m.user_id, v_c.app, 'promociones')
                     and (select count(*) from servicio.campaign_member o
                            join servicio.campaign oc on oc.id = o.campaign_id and oc.app = v_c.app
                           where o.user_id = m.user_id and o.sent_at is not null
                             and (o.sent_at at time zone v_rule.zone)::date = v_today) < v_rule.promo_per_day
                     and (select count(*) from servicio.campaign_member o
                            join servicio.campaign oc on oc.id = o.campaign_id and oc.app = v_c.app
                           where o.user_id = m.user_id and o.sent_at is not null
                             and (o.sent_at at time zone v_rule.zone)::date > v_today - 7
                             and (o.sent_at at time zone v_rule.zone)::date <= v_today) < v_rule.promo_per_week
                   order by m.joined_at, m.user_id
                   limit v_left) q;
          continue when v_users is null;

          v_tokens := servicio.campaign_phones(v_c.kind, v_users);
          continue when cardinality(v_tokens) = 0;
          v_sent := v_sent + servicio.campaign_push(v_c.id, v_variant, v_tokens, false);

          -- Sent to her when at least one of her phones got it; the rest stay due.
          update servicio.campaign_member m
             set sent_at = p_now
           where m.campaign_id = v_c.id and m.user_id = any(v_users)
             and exists (select 1 from servicio.push_token t where t.id = any(v_tokens) and t.user_id = m.user_id);
          get diagnostics v_n = row_count;
          v_left := v_left - v_n;
        end loop;
      exception when others then
        raise warning 'servicio.send_due_campaigns: campaign %: % (%)', v_c.id, sqlerrm, sqlstate;
      end;
    end loop;
  end if;

  v_counted := servicio.count_campaigns(p_now);
  return jsonb_build_object('joined', v_joined, 'sent', v_sent, 'counted', v_counted,
                            'inside_hours', v_local::time >= v_rule.promo_from and v_local::time < v_rule.promo_until);
end;
$$;

revoke all on function servicio.send_due_campaigns(timestamptz) from public, anon, authenticated;


-- ----------------------------------------------------------------------------
-- 10. Counting
-- ----------------------------------------------------------------------------

-- A campaign's numbers per group, from the rows that name who got what. Only people
-- counted enter a column; `unmeasured` is how many were sent it uncounted.
create function servicio.campaign_tally(p_campaign bigint)
returns table (grp text, people integer, reached integer, accepted integer, handed_over integer,
               tapped integer, acted integer, unmeasured integer)
language sql
stable
security definer
set search_path = ''
as $$
  with c as (select * from servicio.campaign where id = p_campaign),
  groups as (
    select 'held_back'::text as grp, 0 as ord from c where c.held_out > 0
    union all
    select v.variant, 1 from servicio.campaign_variant v where v.campaign_id = p_campaign
  ),
  sends as (
    select t.user_id,
           bool_or(s.ticket_status = 'ok')  as accepted,
           bool_or(s.receipt_status = 'ok') as handed_over,
           bool_or(s.tapped_at is not null) as tapped
      from servicio.notification_send s
      join servicio.push_token t on t.id = s.token_id
     where s.campaign_id = p_campaign and not s.test
     group by t.user_id
  ),
  m as (
    select coalesce(m.variant, 'held_back') as grp, m.measured, m.sent_at,
           coalesce(s.accepted, false) as accepted, coalesce(s.handed_over, false) as handed_over,
           coalesce(s.tapped, false) as tapped,
           -- ⚠️ WHAT SHE DID AFTER, from her moment — sent, else entered (held back, or never
           -- reached) — to the window's end: a reservation in Itacate, a publication by her
           -- kitchen in Wera Cocina.
           case c.app
             when 'itacate' then exists (
               select 1 from public.reservation r
                where r.buyer_id = m.user_id
                  and r.created_at >= coalesce(m.sent_at, m.joined_at)
                  and r.created_at < coalesce(m.sent_at, m.joined_at) + c.window_hours * interval '1 hour')
             else exists (
               select 1 from public.workspace_member wm
                 join public.workspace w on w.id = wm.workspace_id and w.kind = 'cocina'
                 join public.listing li on li.workspace_id = wm.workspace_id
                where wm.user_id = m.user_id and wm.is_active
                  and li.created_at >= coalesce(m.sent_at, m.joined_at)
                  and li.created_at < coalesce(m.sent_at, m.joined_at) + c.window_hours * interval '1 hour')
           end as acted
      from servicio.campaign_member m
      cross join c
      left join sends s on s.user_id = m.user_id
     where m.campaign_id = p_campaign
  )
  select g.grp,
         count(m.grp) filter (where m.measured)::integer,
         count(m.grp) filter (where m.measured and m.sent_at is not null)::integer,
         count(m.grp) filter (where m.measured and m.accepted)::integer,
         count(m.grp) filter (where m.measured and m.handed_over)::integer,
         count(m.grp) filter (where m.measured and m.tapped)::integer,
         count(m.grp) filter (where m.measured and m.acted)::integer,
         count(m.grp) filter (where not m.measured and m.sent_at is not null)::integer
    from groups g
    left join m on m.grp = g.grp
   group by g.grp, g.ord
   order by g.ord, g.grp
$$;

revoke all on function servicio.campaign_tally(bigint) from public, anon, authenticated;

-- Writes the counts of each campaign whose window has closed — its last moment, stopped
-- or expired, plus the window — once Expo has answered for its messages (or a day on,
-- when Expo has said all it will). p_force_before: a campaign holding someone who
-- entered before then is counted now, whatever its window — the nightly job's, before it
-- deletes those rows.
create function servicio.count_campaigns(p_now timestamptz default now(), p_force_before timestamptz default null)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_c servicio.campaign;
  v_n integer := 0;
begin
  for v_c in
    select c.* from servicio.campaign c
     where c.launched_at is not null and c.counted_at is null
       and (
         (p_now >= least(coalesce(c.stopped_at, c.expires_at), c.expires_at) + c.window_hours * interval '1 hour'
          and (p_now >= least(coalesce(c.stopped_at, c.expires_at), c.expires_at) + c.window_hours * interval '1 hour'
                        + interval '25 hours'
               or not exists (select 1 from servicio.notification_send s
                               where s.campaign_id = c.id and not s.test
                                 and (s.ticket_status is null
                                      or (s.ticket_status = 'ok' and s.receipt_status is null)))))
         or exists (select 1 from servicio.campaign_member m
                     where m.campaign_id = c.id and m.joined_at < p_force_before))
     order by c.id
  loop
    insert into servicio.campaign_count (campaign_id, grp, people, reached, accepted, handed_over, tapped, acted, unmeasured)
    select v_c.id, t.grp, t.people, t.reached, t.accepted, t.handed_over, t.tapped, t.acted, t.unmeasured
      from servicio.campaign_tally(v_c.id) t;
    update servicio.campaign set counted_at = p_now where id = v_c.id;
    v_n := v_n + 1;
  end loop;
  return v_n;
end;
$$;

revoke all on function servicio.count_campaigns(timestamptz, timestamptz) from public, anon, authenticated;


-- ----------------------------------------------------------------------------
-- 11. What he runs — granted to nobody (docs/runbooks/campaigns.sql)
-- ----------------------------------------------------------------------------

-- A draft: nothing is sent. Answers the campaign's number.
create function servicio.new_campaign(
  p_app      text,
  p_kind     text,
  p_audience text,
  p_starts   timestamptz,
  p_expires  timestamptz,
  p_window_h integer,
  p_held_out integer,
  p_variants jsonb,
  p_opens    text default null,
  p_opens_id uuid default null,
  p_note     text default null
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_kind servicio.notification_kind;
  v_aud  servicio.campaign_audience;
  v_id   bigint;
  v_bad  boolean;
begin
  select * into v_kind from servicio.notification_kind k where k.kind = p_kind;
  if not found or v_kind.class <> 'promocion' or v_kind.app is distinct from p_app then
    raise exception 'new_campaign: % is not a promotion kind of the app %', p_kind, p_app using errcode = '22023';
  end if;
  select * into v_aud from servicio.campaign_audience a where a.app = p_app and a.audience = p_audience;
  if not found then
    raise exception 'new_campaign: no audience % in %', p_audience, p_app using errcode = '22023';
  end if;
  if not v_aud.is_on then
    raise exception 'new_campaign: the audience % is switched off', p_audience using errcode = '22023';
  end if;
  if p_starts is null or p_expires is null or p_expires <= p_starts or p_expires <= now()
     or p_expires - p_starts > interval '14 days' then
    raise exception 'new_campaign: it expires after it starts, in the future, at most 14 days on' using errcode = '22023';
  end if;
  if p_window_h is null or p_window_h not between 1 and 168 then
    raise exception 'new_campaign: the window is 1 to 168 hours' using errcode = '22023';
  end if;
  if p_held_out is null or p_held_out not between 0 and 90 then
    raise exception 'new_campaign: the share held back is 0 to 90 per cent' using errcode = '22023';
  end if;
  -- ⚠️ IN STEPS: Postgres does not promise the order an OR is evaluated in, so a shape is
  -- proved before anything is cast or counted.
  v_bad := jsonb_typeof(p_variants) is distinct from 'array';
  if not v_bad then
    v_bad := jsonb_array_length(p_variants) not between 1 and 5
             or exists (select 1 from jsonb_array_elements(p_variants) v
                         where jsonb_typeof(v) <> 'object'
                            or coalesce(v ->> 'key', '') !~ '^[A-Z]$'
                            or coalesce(v ->> 'weight', '') !~ '^[0-9]{1,3}$'
                            or btrim(coalesce(v ->> 'title', '')) = '' or length(v ->> 'title') > 80
                            or btrim(coalesce(v ->> 'body', '')) = '' or length(v ->> 'body') > 240);
  end if;
  if not v_bad then
    v_bad := exists (select 1 from jsonb_array_elements(p_variants) v
                      where (v ->> 'weight')::integer not between 1 and 100)
             or (select count(distinct v ->> 'key') from jsonb_array_elements(p_variants) v) <> jsonb_array_length(p_variants)
             or (select sum((v ->> 'weight')::integer) from jsonb_array_elements(p_variants) v) <> 100;
  end if;
  if v_bad then
    raise exception 'new_campaign: 1 to 5 wordings, each a key A to Z, a weight (all adding to 100), a title up to 80 characters and a body up to 240'
      using errcode = '22023';
  end if;
  if coalesce(p_opens, v_kind.opens) !~ '^[a-z_]+$' then
    raise exception 'new_campaign: what a tap opens is a word in lower case' using errcode = '22023';
  end if;

  insert into servicio.campaign (app, kind, audience, starts_at, expires_at, window_hours, held_out, opens, opens_id, note)
  values (p_app, p_kind, p_audience, p_starts, p_expires, p_window_h, p_held_out,
          coalesce(p_opens, v_kind.opens), p_opens_id, nullif(btrim(coalesce(p_note, '')), ''))
  returning id into v_id;

  insert into servicio.campaign_variant (campaign_id, variant, weight, title, body)
  select v_id, v ->> 'key', (v ->> 'weight')::smallint, btrim(v ->> 'title'), btrim(v ->> 'body')
    from jsonb_array_elements(p_variants) v;

  return v_id;
end;
$$;

comment on function servicio.new_campaign(text, text, text, timestamptz, timestamptz, integer, integer, jsonb, text, uuid, text) is
  'His draft of a campaign: the app, a promotion kind of it, an audience on the closed list '
  'and switched on, when it may go and when it expires (in the future, at most 14 days on), '
  'the window in hours that counts what she did after (1 to 168), the share held back (0 to '
  '90), 1 to 5 wordings [{key, weight, title, body}] whose weights add to 100, what a tap '
  'opens (else the kind''s) and which, a note. Nothing is sent. Answers its number. Granted '
  'to nobody: docs/runbooks/campaigns.sql. 0093, plan 10.5c-ii.';

-- Every wording to his own accounts' phones, now: hours, limits, answers and the kind's
-- own switch ignored, counted nowhere. Answers what went and what could not.
create function servicio.test_campaign(p_campaign bigint)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_c       servicio.campaign;
  v_kind    servicio.notification_kind;
  v_testers uuid[];
  v_tokens  uuid[];
  v_variant text;
  v_n       integer := 0;
  v_skipped jsonb;
begin
  select * into v_c from servicio.campaign c where c.id = p_campaign;
  if not found then
    raise exception 'test_campaign: no campaign %', p_campaign using errcode = '22023';
  end if;
  if v_c.stopped_at is not null then
    raise exception 'test_campaign: campaign % is stopped', p_campaign using errcode = '22023';
  end if;
  select * into v_kind from servicio.notification_kind k where k.kind = v_c.kind;
  select array_agg(t.user_id) into v_testers from servicio.campaign_tester t;
  if v_testers is null then
    raise exception 'test_campaign: no test account — add yours (docs/runbooks/campaigns.sql, step 0)' using errcode = '22023';
  end if;

  v_tokens := servicio.campaign_phones(v_c.kind, v_testers);
  for v_variant in select v.variant from servicio.campaign_variant v where v.campaign_id = p_campaign order by v.variant loop
    v_n := v_n + servicio.campaign_push(p_campaign, v_variant, v_tokens, true);
  end loop;

  -- His live phones in the app that could not show it, and why.
  select coalesce(jsonb_agg(jsonb_build_object(
           'platform', t.platform,
           'why', case when not t.allowed then 'the phone does not allow notifications'
                       when t.platform = 'android' and v_kind.channel = any(t.silenced) then 'the channel is silenced: ' || v_kind.channel
                       else 'the phone has not made the channel ' || v_kind.channel || ' (it reads the kinds on its next open)' end)), '[]'::jsonb)
    into v_skipped
    from servicio.push_token t
   where t.user_id = any(v_testers) and t.app = v_c.app and t.retired_at is null
     and not (t.id = any(v_tokens));

  if v_n > 0 then
    update servicio.campaign set tested_at = now() where id = p_campaign;
  end if;
  return jsonb_build_object('campaign', p_campaign, 'messages', v_n, 'phones', cardinality(v_tokens),
                            'not_sent_to', v_skipped);
end;
$$;

comment on function servicio.test_campaign(bigint) is
  'Every wording of a campaign to his test accounts'' phones in its app (servicio.campaign_tester), '
  'now — hours, limits, answers and the kind''s own switch ignored; counted nowhere and '
  'never in a limit. Marks the campaign tested when a message went. Answers how many messages '
  'went to how many phones, and each of his phones that could not show it, with why. Granted '
  'to nobody. 0093, plan 10.5c-ii.';

-- Who it would reach now, per group: people, those with a phone that would show it, and
-- those whose doings would be counted. Changes nothing.
create function servicio.campaign_preview(p_campaign bigint, p_now timestamptz default now())
returns table (grp text, people integer, reachable integer, counted integer)
language sql
stable
security definer
set search_path = ''
as $$
  with c as (select * from servicio.campaign where id = p_campaign),
  p as (
    select coalesce(servicio.campaign_variant_of(c.id, a.user_id), 'held_back') as grp,
           cardinality(servicio.campaign_phones(c.kind, array[a.user_id])) > 0 as reachable,
           servicio.consent_now(a.user_id, c.app, 'medir_promociones')
             and not exists (select 1 from servicio.campaign_tester t where t.user_id = a.user_id) as counted
      from c cross join lateral servicio.audience_people(c.app, c.audience, p_now) a
  ),
  groups as (
    select 'held_back'::text as grp, 0 as ord from c where c.held_out > 0
    union all
    select v.variant, 1 from servicio.campaign_variant v where v.campaign_id = p_campaign
  )
  select g.grp, count(p.grp)::integer,
         count(p.grp) filter (where p.reachable)::integer,
         count(p.grp) filter (where p.counted)::integer
    from groups g left join p on p.grp = g.grp
   group by g.grp, g.ord
   order by g.ord, g.grp
$$;

comment on function servicio.campaign_preview(bigint, timestamptz) is
  'Before launching: per group (held_back, then each wording), how many people its audience '
  'holds now, how many have a phone that would show it, and how many would be counted. '
  'Changes nothing. Granted to nobody. 0093, plan 10.5c-ii.';

create function servicio.launch_campaign(p_campaign bigint)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_c servicio.campaign;
begin
  select * into v_c from servicio.campaign c where c.id = p_campaign for update;
  if not found then
    raise exception 'launch_campaign: no campaign %', p_campaign using errcode = '22023';
  end if;
  if v_c.launched_at is not null then
    raise exception 'launch_campaign: campaign % was launched at %', p_campaign, v_c.launched_at using errcode = '22023';
  end if;
  if v_c.stopped_at is not null or v_c.expires_at <= now() then
    raise exception 'launch_campaign: campaign % is stopped or expired', p_campaign using errcode = '22023';
  end if;
  -- ⚠️ REFUSED UNTIL A TEST WENT OUT: he has seen every wording on his own phones.
  if v_c.tested_at is null then
    raise exception 'launch_campaign: send it to your own phones first — select servicio.test_campaign(%)', p_campaign
      using errcode = '22023';
  end if;
  if not exists (select 1 from servicio.notification_kind k where k.kind = v_c.kind and k.is_on) then
    raise exception 'launch_campaign: the kind % is off — promotions wait for the analyst''s ruling', v_c.kind
      using errcode = '22023';
  end if;
  if not exists (select 1 from servicio.campaign_audience a where a.app = v_c.app and a.audience = v_c.audience and a.is_on) then
    raise exception 'launch_campaign: the audience % is switched off', v_c.audience using errcode = '22023';
  end if;

  update servicio.campaign set launched_at = now() where id = p_campaign;
  return jsonb_build_object('campaign', p_campaign, 'launched', true,
                            'goes_from', v_c.starts_at, 'until', v_c.expires_at,
                            'groups', (select jsonb_agg(to_jsonb(p)) from servicio.campaign_preview(p_campaign) p));
end;
$$;

comment on function servicio.launch_campaign(bigint) is
  'Launches a campaign: refused until test_campaign sent it to his phones, while its kind is '
  'off (promotions wait for the analyst), while its audience is off, or once stopped, expired '
  'or launched. The job each minute sends it from its start, inside the hours, under every '
  'limit. Answers its preview. Granted to nobody. 0093, plan 10.5c-ii.';

create function servicio.stop_campaign(p_campaign bigint)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  update servicio.campaign set stopped_at = coalesce(stopped_at, now()) where id = p_campaign;
  if not found then
    raise exception 'stop_campaign: no campaign %', p_campaign using errcode = '22023';
  end if;
  return jsonb_build_object('campaign', p_campaign, 'stopped', true,
                            'people_sent', (select count(*) from servicio.campaign_member m
                                             where m.campaign_id = p_campaign and m.sent_at is not null));
end;
$$;

comment on function servicio.stop_campaign(bigint) is
  'Stops a campaign: nothing not yet sent is sent; what she did after the messages already '
  'sent is still counted to the window''s end. Granted to nobody. 0093, plan 10.5c-ii.';

-- His read, as servicio.apartados_por_semana() is: one row per group of each campaign
-- launched in the last p_days — its counts kept once its window closed, else counted now.
create function servicio.campaign_results(p_days integer default 30)
returns table (campaign_id bigint, app text, kind text, audience text, starts_at timestamptz, final boolean,
               grp text, people integer, reached integer, accepted integer, handed_over integer,
               tapped integer, acted integer, unmeasured integer, tapped_pct numeric, acted_pct numeric)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id, c.app, c.kind, c.audience, c.starts_at, c.counted_at is not null,
         g.grp, g.people, g.reached, g.accepted, g.handed_over, g.tapped, g.acted, g.unmeasured,
         round(100.0 * g.tapped / nullif(g.people, 0), 1),
         round(100.0 * g.acted / nullif(g.people, 0), 1)
    from servicio.campaign c
   cross join lateral (
     select k.grp, k.people, k.reached, k.accepted, k.handed_over, k.tapped, k.acted, k.unmeasured,
            case when k.grp = 'held_back' then 0 else 1 end as ord
       from servicio.campaign_count k
      where k.campaign_id = c.id and c.counted_at is not null
     union all
     select t.grp, t.people, t.reached, t.accepted, t.handed_over, t.tapped, t.acted, t.unmeasured,
            case when t.grp = 'held_back' then 0 else 1 end
       from servicio.campaign_tally(c.id) t
      where c.counted_at is null
   ) g
   where c.launched_at is not null and c.starts_at > now() - make_interval(days => greatest(coalesce(p_days, 30), 1))
   order by c.starts_at desc, c.id, g.ord, g.grp
$$;

comment on function servicio.campaign_results(integer) is
  'His results, one row per group (held_back, then each wording) of each campaign launched '
  'in the last p_days: people counted, reached, accepted by Expo, handed to Apple or Google, '
  'tapped, acted within the window, and the two shares of people; unmeasured — sent but not '
  'counted. final — read from campaign_count, its window closed; else counted from the live '
  'rows. Never a name. Granted to nobody: supabase db query --linked. 0093, plan 10.5c-ii.';

revoke all on function servicio.new_campaign(text, text, text, timestamptz, timestamptz, integer, integer, jsonb, text, uuid, text)
  from public, anon, authenticated;
revoke all on function servicio.test_campaign(bigint)                  from public, anon, authenticated;
revoke all on function servicio.campaign_preview(bigint, timestamptz)  from public, anon, authenticated;
revoke all on function servicio.launch_campaign(bigint)                from public, anon, authenticated;
revoke all on function servicio.stop_campaign(bigint)                  from public, anon, authenticated;
revoke all on function servicio.campaign_results(integer)              from public, anon, authenticated;


-- ----------------------------------------------------------------------------
-- 12. What is forgotten, every night — `0092`'s job, re-made, its signature unchanged
-- ----------------------------------------------------------------------------
-- The days are `notification_rule.keep_days` (question 5's one number). ⚠️ A CAMPAIGN
-- IS COUNTED BEFORE ITS ROWS GO: whatever still holds someone past the days is counted
-- first. With 30 days nothing is ever counted early — a campaign lasts at most 14 days
-- and its window 7.

create or replace function servicio.forget_old_pushes()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cutoff  timestamptz := now() - make_interval(days => (select r.keep_days from servicio.notification_rule r));
  v_counted integer;
  v_sends   integer;
  v_tokens  integer;
  v_members integer;
begin
  v_counted := servicio.count_campaigns(now(), v_cutoff);
  delete from servicio.notification_send s where s.sent_at < v_cutoff;
  get diagnostics v_sends = row_count;
  delete from servicio.push_token t where t.retired_at < now() - interval '30 days';
  get diagnostics v_tokens = row_count;
  delete from servicio.campaign_member m where m.joined_at < v_cutoff;
  get diagnostics v_members = row_count;
  return jsonb_build_object('sends', v_sends, 'tokens', v_tokens, 'campaign_members', v_members,
                            'counted_first', v_counted);
end;
$$;

comment on function servicio.forget_old_pushes() is
  'Run every night by pg_cron (forget-old-pushes): counts any campaign still holding someone '
  'past notification_rule.keep_days (30), then deletes each message''s row and each person''s '
  'place in a campaign keep_days on, and each retired token 30 days after it was retired; the '
  'tap counts and campaign_count, which name nobody, stay. Granted to nobody. 0092; re-made by '
  '0093, plan 10.5c-ii.';

select cron.schedule('send-campaigns', '* * * * *', 'select servicio.send_due_campaigns()');


-- ----------------------------------------------------------------------------
-- 13. The doors
-- ----------------------------------------------------------------------------

revoke all on function public.set_my_consent(text, boolean) from public, anon;
revoke all on function public.my_consent(text)              from public, anon;
revoke all on function public.count_campaign_tap(bigint)    from public, anon;

grant execute on function public.set_my_consent(text, boolean) to authenticated;
grant execute on function public.my_consent(text)              to authenticated;
grant execute on function public.count_campaign_tap(bigint)    to authenticated;
