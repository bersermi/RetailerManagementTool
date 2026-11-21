-- ---------------------------------------------------------------------------
-- CAMPAIGNS — HOW HE STARTS ONE, TESTS IT ON HIS PHONES, LAUNCHES IT AND READS IT.
-- Plan task `10.5c-ii` (`0093`), on `10.5c-i`'s design: a campaign is a few rows he
-- writes in SQL, never a build. Everything here runs as the database owner and is
-- granted to nobody else; no step names a person in its answer.
--
-- HOW TO RUN A STEP, from the repository root. Copy the step into a file OUTSIDE the
-- repository (it will hold your email), replace what the step says to replace, then:
--
--   supabase db query --linked -o table -f ~/campana.sql     # the live database
--   supabase db query --local  -o table -f ~/campana.sql     # rehearsal
--
-- ⚠️ TWO WORDS TO REPLACE, and nothing else: `:'email'` — your own account's email, in
-- quotes ('tu@correo'); `:campaign` — the number step 1 answered (7). The check that
-- holds this file to the database runs each step as written, with those two filled in
-- and step 1's two dates moved to tomorrow (`docs/checks/10.5c-ii-campaigns-contract.sh`).
--
-- ⚠️ PROMOTIONS ARE DARK UNTIL THE ANALYST RULES (the owner's ruling of 2026-11-20):
-- both promotion kinds are off and no words are approved, so step 4 is refused —
-- *the kind … is off* — and nobody can say yes. Steps 0 to 3 work today: a test goes to
-- your own phones whatever the switch. Turning promotions on is the last section, hers.
--
-- WHAT THE NUMBERS ARE (`servicio.notification_rule`, one row — her answer to question
-- 3 changes them with one UPDATE): promotions only from 9:00 to 20:00 Mexico City; at
-- most one a day and three in the last seven days per person per app, every campaign
-- together, a test never. A campaign that misses its hours waits for the next morning,
-- or expires.
-- ---------------------------------------------------------------------------


-- step 0: your test accounts — once per account (each phone signed in to it gets the tests)
insert into servicio.campaign_tester (user_id)
select u.id from auth.users u where u.email = :'email'
on conflict (user_id) do nothing;

-- (to see them: select u.email from servicio.campaign_tester t join auth.users u on u.id = t.user_id;)


-- step 1: a draft — nothing is sent; it answers the campaign's number
--   p_app       'itacate' (neighbours) or 'cocina' (fondas)
--   p_kind      'ofertas' in Itacate, 'novedades' in Wera Cocina
--   p_audience  one of `select * from servicio.campaign_audience` — always on top of her yes:
--               itacate: todos, nunca_aparto, recogio, sin_apartar_7, sin_apartar_14, sin_apartar_30
--               cocina:  todos, publico_7, sin_publicar_7, tuvo_apartado, sin_apartado
--   p_starts, p_expires   Mexico City times; at most 14 days apart
--   p_window_h  hours after her message in which a reservation (or a publication) counts: 1 to 168
--   p_held_out  per cent held back, sent nothing, counted all the same: 0 to 90
--   p_variants  1 to 5 wordings: a key A–Z, a weight (all adding to 100), a title (80) and a body (240)
--   p_opens     what a tap opens — leave it out for the kind's own (Itacate: its list; Wera Cocina: Hoy). The places
--               each app's build opens (`10.5c-iii`; any other word opens only the app):
--               itacate: cerca (the list), mis_cocinas, apartados, cocina (with p_opens_id => a kitchen's id: her page)
--               cocina:  hoy, publicar, apartados, mi_cocina
select servicio.new_campaign(
  p_app      => 'itacate',
  p_kind     => 'ofertas',
  p_audience => 'todos',
  p_starts   => '2026-12-03 18:00 America/Mexico_City',
  p_expires  => '2026-12-03 20:00 America/Mexico_City',
  p_window_h => 24,
  p_held_out => 10,
  p_variants => '[{"key":"A","weight":50,"title":"Para la cena, aparta y pasa a tu hora","body":"Cuatro cocinas tienen oferta del día."},
                  {"key":"B","weight":50,"title":"¿Ya sabes qué vas a cenar?","body":"Cuatro cocinas tienen oferta del día. Aparta y pasa a tu hora."}]',
  p_note     => 'Primera prueba: mandar o no, con un grupo sin mensaje');

-- ⚠️ AT PILOT SIZE, TEST WHETHER TO SEND AT ALL, NOT WHICH WORDING (`10.5c-i`): about 200
-- people a group tell 10 % from 20 %. One wording with a group held back answers the first
-- question with the fewest people.


-- step 2: before launching — per group, how many people now, how many a phone would show it, how many counted
select * from servicio.campaign_preview(:campaign);


-- step 3: every wording to your test accounts' phones, now — hours, limits and the switch ignored, counted nowhere
select servicio.test_campaign(:campaign);

-- It answers how many messages went to how many phones, and each of your phones that
-- could not show it, with why — an Android makes a kind's channel when the app next opens.


-- step 4: launch — refused until step 3 went out, and while promotions are dark
select servicio.launch_campaign(:campaign);


-- step 5: the results, one row per group (held_back, then each wording) of every campaign launched in the last 7 days
select * from servicio.campaign_results(7);

-- Columns: people counted (her yes to counting), reached (sent to at least one of her
-- phones), accepted (Expo's ticket ok), handed_over (Expo's receipt ok — given to Apple or
-- Google, never "shown"), tapped, acted (reserved — or her kitchen published — within the
-- window), unmeasured (sent, not counted: no yes to counting, or a test account), and the
-- two shares. final = true once the window closed and the counts were kept for good
-- (`servicio.campaign_count`); thirty days on, the rows naming who got what are deleted.


-- step 6: stop — nothing not yet sent is sent; what was sent is still counted to the window's end
select servicio.stop_campaign(:campaign);


-- ---------------------------------------------------------------------------
-- TURNING PROMOTIONS ON — THE ANALYST'S, ONCE SHE HAS RULED (her questions 2 to 5).
-- Two statements, each covering both apps — to turn on one app alone, keep only its row in on 1
-- and its kind in on 2. Her words exactly as the sheet shows them, as a new version (an approved
-- version never changes: new words are a new version); then the kind on. Until both are done
-- nobody can say yes, and nothing is sent.
-- ---------------------------------------------------------------------------

-- on 1: the words she approved — the yes sheet naming both uses (or two screens, each naming one); one row per app
-- ⚠️ THE TEXT BELOW IS A DRAFT, NOT APPROVED — Itacate's `10.5c-i`'s, Wera Cocina's written after it by
-- `10.5c-iii`. Each is EXACTLY what that app's sheet shows today, under the version its build carries
-- (`itacate/src/api/push.ts` and `cocina/src/api/push.ts`, `PALABRAS`; each app's `test/push.test.ts` holds the
-- two equal). Her words, if they differ from these, change the app's sheet too — an update to the app — and
-- take a new version (`itacate-hoja-2`) in both places: an approved version never changes.
insert into servicio.consent_words (words, app, purposes, shown_on, body) values
  ('itacate-hoja-1', 'itacate', '{promociones,medir_promociones}', 'hoja',
   '¿Te avisamos de ofertas? De vez en cuando te mandamos ofertas y novedades de las cocinas de Itacate. Nunca antes de las 9 ni después de las 20, y no más de una al día. Contamos cuáles abres y si apartas después, para saber cuáles te sirven. Lo apagas cuando quieras en Tú → Notificaciones.'),
  ('cocina-hoja-1', 'cocina', '{promociones,medir_promociones}', 'hoja',
   '¿Te mandamos novedades de Wera Cocina? De vez en cuando te mandamos consejos y novedades de la app. Nunca antes de las 9 ni después de las 20, y no más de uno al día. Contamos cuáles abres y si publicas después, para saber cuáles te sirven. Lo apagas cuando quieras en Mi cocina.');

-- on 2: the kind on, for everyone — AFTER on 1: with the kind on and no words approved, the sheet rises and
-- every yes is refused. Once on, each app shows its sheet once, after a Ya lo tengo (Itacate) or a handover
-- (Wera Cocina), and the switch in Tú → Notificaciones or Mi cocina (`10.5c-iii`).
update servicio.notification_kind set is_on = true where kind in ('ofertas', 'novedades');

-- Her other settings, each one UPDATE: the hours and limits —
--   update servicio.notification_rule set promo_from = '09:00', promo_until = '20:00', promo_per_day = 1, promo_per_week = 3;
-- an audience switched off — update servicio.campaign_audience set is_on = false where app = 'itacate' and audience = 'recogio';
-- the days a row naming who got what is kept — update servicio.notification_rule set keep_days = 30;

-- THE SERVICES' MESSAGES (`0094`, plan `10.9h-i`) — each moment a row of servicio.notification_kind, the
-- recommendations as written; her answers, each one UPDATE. What a message needs before it goes is read from
-- its kind's CLASS when it goes: servicio (her switch), a_pedido (her switch, her bell, one a kitchen a day),
-- promocion (her yes, the hours and the limits above, counted with every campaign).
-- a moment off for everyone — update servicio.notification_kind set is_on = false where kind = 'sellos';
--   (the kinds: publico — the bell; promocion_cocina — a promotion's alert, dark; premio — ¡Ganaste!; sellos — the
--   reminder; tarjeta_cambio — a card closing or its kitchen leaving; primera_oferta — Wera Cocina's nudge)
-- the bell: several within the hour as one — update servicio.notification_kind set hold_minutes = 60 where kind = 'publico';
-- the reminder: days before, its hour, none for a card of fewer days —
--   update servicio.notification_kind set days_before = 7, send_at = '11:00', min_days = null where kind = 'sellos';
-- the nudge: on which day with no offer, at what hour — update servicio.notification_kind set on_day = 2, send_at = '12:00' where kind = 'primera_oferta';
-- a moment read as a promotion (needs her yes) — update servicio.notification_kind set class = 'promocion', default_on = false where kind = 'sellos';
-- the alert only to those who rang the bell, without her yes — update servicio.notification_kind set class = 'a_pedido', default_on = true where kind = 'promocion_cocina';
-- the alert on — update servicio.notification_kind set is_on = true where kind = 'promocion_cocina';
-- her switch's words in Notificaciones — update servicio.notification_kind set label = '…', detail = '…' where kind = '…';
