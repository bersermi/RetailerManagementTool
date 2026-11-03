# Status log — the 2026-10-01 working day

⚠️ **Moved by `10.4g-i` from `docs/PLAN.md`'s `## Position`, unedited** — the day's one entry, to keep `## Position` under its
1,400-line ceiling. **A later cut of the same day APPENDS here, never a second file for this date.**

✅ **2026-10-01 — `9a`–`9e` ARE DONE AND `9f` IS THE NEXT TASK, WITH THE OWNER (Verdulería, the Catalog Prompt): the starter catalog by giro, `## Step 9`.** The owner parked `8g`
(*"I'm in talks with a Graphic and UI designer that might be able to help me with the redesign"*) and asked
for the default catalog he described on 2026-09-23 — seven giros, imported in bulk at onboarding and later,
offline, tagged, each product to carry a picture some day. Planned with him the same hour; the rows are
`9a`–`9j`. The same day `5R-a` closed its accounts half in another session: both store accounts exist, and the app id is now `mx.wera.app` (see its row).
**`9a` built `0044` the same day**: the `catalogo` schema, `template_code`, `catalog_template()` and `import_catalog()`.
⚠️ **What the estimate found that the plan had not said:** (1) `_cleanup.sql` sweeps `public` only, so template rows
**survive between suites**. The suite therefore owns a `zz0044-` fixture, and no suite may count the whole template.
(2) `0042`'s fence means **an imported product can never be retired**, so `p_exclude` is not a nicety; it is the only
way to say no to a product. That question is now on `9d`'s row. (3) The shop's dimension trigger reads only columns the
template names identically, so it is **reused, not copied**. **36 checks in `supabase/tests/0044_starter_catalog.sql`,
falsified twice** (role fence weakened to staff → 4.15 red; C8.5 skip removed → 4.8, 4.10, 4.17 red). All 31 behavioural
suites, all 7 pgTAP suites (`01_rls_coverage` untouched) and the `5d-i`/`6c` contract checks are green locally. No content
yet: the template is empty until `9c`.
**`9b` built the authoring path the same night**: `supabase/catalog/` (`tags.csv` holding the seven giros he named,
`families.csv`, `products/polleria.csv` with a header only, a README) and `build.mjs` with `--write` and `--check`.
⚠️ **What the estimate found:** (1) **each content migration has to be a SNAPSHOT of the whole catalog**, because a
later giro TAGS a row an earlier giro's file holds, and a per-giro insert would miss that tag. (2) **Units are parsed
out of the migrations**, never copied, so there is no second list. (3) **`--check` comes almost free** because the
output is deterministic, and it catches a CSV edited without regenerating. ⚠️ **A defect found by its own suite:** on
macOS `/var` is `/private/var`, so the entry-point test never matched, and **the CLI exited 0 having checked
nothing**. It is fixed with real paths. **20 of 20 in `build.test.mjs`**, each refusal asserted by its reason. Two
generated snapshots were applied to the local database and rolled back: a rename onto a removed product's name, a
family move and a family deletion all landed, and a picture path survived the second snapshot. In CI it runs as the
first step of `supabase db reset`. **The Catalog Prompt** is in the handbook, beside the main prompt.
**`9c`, the Pollería session with the owner, the same night: `0045_catalogo_polleria.sql`**, generated, with 24 products in
2 families (*Pollo* 22, *Huevo* 2), every one by the kilo and at IVA 0, plus 4 category tags. ⚠️⚠️ **HIS RULINGS, 2026-10-01:**
(1) ***"Agree on families"*: a FAMILY IS WHAT THE PRODUCT IS** (*Pollo*, *Huevo*) and keeps one measure (C8.5); the
section a shop browses by (*Pollo fresco*, *Menudencia*, *Preparados*) is a **category tag**. ⚠️ His pilot shop uses
Familia as a section, and its *Pollo* and *Verduras* each mix pieces and kilos, so **importing Pollería into the pilot
shop would land only the 2 eggs**. Every chicken row would be skipped by the C8.5 rule; his rows are untouched either
way. (2) **Pollo entero by the kilo; Huevo by the kilo.** (3) **Every guessed row kept as drafted**, including *Nuggets* and
*Hamburguesa de pollo* by the kilo, and IVA 0 on the marinated ones. **Left out:** *Pollo rostizado* (16%, a rosticería's),
*Gallina*, and turkey cold cuts. Lifespans are blank, since he was not asked. **Measured locally:** a fresh shop imports
24 of 24; a second import imports 0 and skips 24; an import by `cat-menudencia` alone finds its 6 already in;
`0044`'s and `0042`'s suites still pass with the content present; `01_rls_coverage` is 97 ok.
(4) ⚠️⚠️ **`9d`'s import screen, ruled the same night: PICK GIROS, THEN AN UNTICK LIST, THEN *Importar*.** Products are
grouped by family and all ticked, and unticking sends `p_exclude`. He chose it over giro-only and over loosening `0042`'s
fence, because an imported product can never be retired.
**`9d`, the import in the app, built the same night.** `@/api/starterCatalog` (pure: the RPC names and `p_` args, the
wire shape, the giros offered, the untick list by family, "already in your shop" by `template_code` or folded name, and
`choiceFrom`), two `calls.ts` wrappers, `useStarterCatalog` and `useImportCatalog`, `src/ui/SelectorCatalogo` (drawn by
two files, R14), and *¿Qué vendes?* as the third question on `bienvenida`. **The import runs inside the create mutation,
BEFORE the membership read is invalidated**, so the guard moves her to Inicio only once the products exist. The route
`catalogo.tsx` is reached from Productos (*Agregar del catálogo*, for managers and the owner). `VARIANT_COLUMNS` gains
`template_code`, and `CACHE_SHAPE` goes from `v1` to `v2`. ⚠️ **What the estimate found:** (1) **a picker screen after
*Crear* would RACE the guard**, which moves a new member out of onboarding on its own, so the picker lives ON the onboarding
screen. (2) **The template is NOT persisted**, a change from the plan: the import needs signal, so a stored picker could
only offer a button that fails. Offline, it says so. (3) The `5d-i` check reads `VARIANT_COLUMNS` with a one-line `sed`,
so the constant must stay on one line. ⚠️ **Decisions for the owner:** a failed import at onboarding does not fail the shop
and shows no error, because *Agregar del catálogo* is the same import. On the onboarding screen the shop's own *Crear mi
tienda* is the import button: no giro chosen means *Omitir*. After a later import the route goes back, and Productos is
the confirmation. **Evidence:** Vitest **1741/1741 in 53 files** (the runner's tally); `conventions-gate.sh` 18 of 18;
`9d-starter-catalog-contract.sh` **10 of 10** over HTTP, run after `6c` the way CI orders them; its falsifier **4 of 4**,
each red for its reason; typecheck clean after regenerating the typed routes. **Looked at** on the iPhone 17 simulator
(Release, local shop, bundle checked to hold the local URL and no production ref): onboarding offers *Pollería · 24
productos*; Lupe's Productos shows the entry; her picker offers 23, because one product is already hers by name. ⚠️ **NOT
looked at: the untick list itself.** Reaching it takes a tap, and macOS refuses synthetic input to this terminal, so it
is **the owner's phone, R9**, together with the list's length and whether *Volver* should ask before discarding a choice.
No migration. **It reaches his phone with the next rebuild**: 4 October, or the paid-team build.
**`9e`, the Carnicería session with the owner, the same day: `0046_catalogo_carniceria.sql`**, generated, **54 new products**
in 3 new families (*Res* 29 and *Cerdo* 24, by the kilo; *Tuétano* 1, by the piece) plus *Huevo blanco* and *Huevo rojo*
**newly tagged** Carnicería. That makes 78 in the template, and 3 new category tags (*Cortes*, *Embutidos*, *Manteca*). ⚠️⚠️ **HIS RULINGS, 2026-10-01:**
(1) **A carnicería sells eggs, not chicken.** (2) **Grades are products**: *Molida de res* and *Molida de cerdo* each in
**90/10, 85/15, 80/20, 75/25, 70/30, lean first**, and *Bistec* and *Milanesa* of both animals *de primera* and *de segunda*.
They replace the plain rows. (3) **IVA 0 on everything**, the marinated and *embutidos* included. (4) **Tuétano is sold by the
piece, so it is a family of its own**, because C8.5 keeps one measure per family. *Pata de res* and *Manitas de cerdo* are by the kilo.
(5) Chorizo and Longaniza go under *Embutidos*, and *Manteca de cerdo* has a category of its own. ⚠️ **Names carry the animal**
(*Hígado de res*, *Pierna de cerdo*) because `product_variant_name_unique` is shop-wide, and Pollería already holds *Hígado*,
*Pierna*, *Retazo*. **Guessed and kept unchanged:** *Sirloin* and *Rib eye* as names, and every unit except Tuétano's.
**Left out:** carnero, borrego and other meats (*"not by the moment"*). Lifespans are blank. **Measured locally:** a fresh
shop imports 56 of 56, then 0 a second time (56 skipped); Pollería afterwards imports 22 and skips only the 2 eggs, so no
name collides across giros; `cat-embutidos` alone finds its 2 already in. All 31 behavioural suites pass with the
content present; `build.test.mjs` is 20 of 20 after the new migration.
