# Status log — the 2026-10-02 working day

⚠️ **Moved by `10.5-0` from `docs/PLAN.md`'s `## Position`, unedited** — the day's three entries, to keep `## Position` under its
1,400-line ceiling. **A later cut of the same day APPENDS here, never a second file for this date.**

✅ **2026-10-02 — `9h` IS DONE AND `9i` IS THE NEXT TASK, WITH THE OWNER (Cremería, the Catalog Prompt).**
**`9h`, the Abarrotes session: `0050_catalogo_abarrotes.sql`**, **1,017 new products** in 24 new families and 22 new category tags,
plus **10 newly tagged** Abarrotes: *Huevo blanco/rojo*, and *Jitomate saladet, Cebolla blanca, Papa blanca, Limón con semilla,
Chile serrano, Chile jalapeño, Ajo, Aguacate*. The 4 dried chiles were already tagged. That makes 1,195 products in all. ⚠️⚠️ **HIS RULINGS, 2026-10-02:**
(1) ⚠️⚠️ **ABARROTES CARRIES BRANDS: the Catalog Prompt's no-brands rule is lifted for this giro**, because *"Abarrotes is very brand
sensitive"*. A product is brand + product + presentation (*Coca-Cola lata 355 ml*, *Marías Gamesa tubo*). Bulk goods stay generic and by the
kilo (*Arroz a granel*). Pollería, Carnicería, Verdulería and Frutería stay generic. (2) **No IVA on anything for now**: every row is 0, and the
16% question is deferred, not answered. (3) He asked for **every presentation** in Refrescos, Pan (Oroweat included), Galletas, Botanas,
Enlatados and Cerveza/licores. (4) **He accepted the last proposal whole** (*"close enough"*) without row edits. ⚠️ **The review page could
not save**: it was opened through `/artifacts`, on the artifact's own host, where the `db` capability resolves `null`. The page showed
*Connecting…* for ever and kept his edits only in the tab. A review page must be opened on claude.ai, and it must say *not saving* rather than *connecting*.
(5) **Frutería correction, in the same snapshot**: *Fresa por charola* is new, and *Frambuesa, Zarzamora, Arándano* are renamed *… por charola* (codes unchanged).
**Decisions taken for him (his "accept" covers them, but they were mine):** the 24 family names and 22 category labels; bulk *croquetas*
tagged *Mascotas* and bulk sugar tagged *Azúcar*; naming *X a granel* / *X en bolsa* (which breaks Frutería's plain-name-is-kilo rule, because *Arroz
por pieza* reads wrong); presentations written as words (*individual*, *grande*, *tubo*, *Familiar*) where the grammage was not known.
⚠️⚠️ **661 OF THE 1,017 ROWS WERE MARKED GUESS IN THE DRAFT AND SHIPPED UNCORRECTED** — mostly presentations and sizes, not brands.
A wrong size is a `name` edit in a later snapshot, and the code stays. ⚠️ **Cheap now, expensive later:** each code bakes in the presentation
(`coca-cola-lata-355-ml`), and a shop's copy remembers it for ever. A rename keeps a code that no longer matches its name.
⚠️ **Found, not fixed: the import's untick list (`app/src/app/catalogo.tsx`) renders every product in a plain `ScrollView`.** That was fine at 177;
at 1,031 Abarrotes rows it is unvirtualized, and every tick re-renders all of them. **Not measured on a phone** — it belongs to whoever next looks at that
screen on a device.
**Measured locally:** `build.test.mjs` 20 of 20 after `0050`; `--check` matches (41 tags, 35 families, 1,195 products); `supabase db reset`
applies it (1,031 rows carry `giro-abarrotes`); every behavioural suite in `supabase/tests/` passes, each run after `_cleanup.sql`.

✅ **2026-10-02 — `9g` IS DONE AND `9h` IS THE NEXT TASK, WITH THE OWNER (Abarrotes, the Catalog Prompt).**
**`9g`, the Frutería session: `0049_catalogo_fruteria.sql`**, **46 new products** in 2 new families: *Frutas* 37, by the kilo,
and *Frutas por pieza* 9, by the piece. **6 newly tagged** Frutería: *Limón* ×3 and *Aguacate*, plus *Jícama* and *Pepino*. That makes
177 products in all, plus 1 new category tag, *Frutas*. No new unit. ⚠️⚠️ **HIS RULINGS, 2026-10-02:** (1) **Melón, Sandía,
Papaya maradol, Piña and Pitaya are each TWO products**: the plain name is sold by the kilo, and *… por pieza* is sold by the piece. He accepted that naming
(it follows *Verdolaga en manojo*). (2) **Three pears**: *Bartlett*, *Bosc*, *roja*. He dropped the other two the draft proposed.
(3) **Fruta picada is not included for now.** The other prepared items (jugos, cocteles) were proposed for parking and went unchallenged.
(4) Coco, Frambuesa, Zarzamora and Arándano are by the piece only; Fresa is by the kilo. *Naranja para jugo* is its own row.
**Decisions taken for him:** the family names and the *Frutas* category. The six tagged rows keep their *Verduras*
category; they get the giro tag only. ⚠️ **The berry names went in WITHOUT the draft's "(charola)"** (*Frambuesa*,
not *Frambuesa (charola)*), because the unit already says it is counted. A rename is a `name` edit, and the code stays the same.
**Guessed and kept unchanged:** Fresa by the kilo and berries by the piece; *Naranja para jugo* as a separate row; Jícama and
Pepino tagged; the variety lists (plátano ×3, manzana ×3, mango ×3, uva ×2); IVA 0 on everything.
**Parked:** fruta picada, jugos and cocteles. A cup of fruit is a recipe, and a jugo by the litro needs an `l` family.
**Measured locally:** `build.test.mjs` 20 of 20 after `0049`; `--check` matches; `supabase db reset` applies it (177
template rows, 46 in the fruit families, 6 others carrying `giro-fruteria`); every behavioural suite in `supabase/tests/`
green, each run after `_cleanup.sql`.

✅ **2026-10-02 — `9f` IS DONE AND `9g` IS THE NEXT TASK, WITH THE OWNER (Frutería, the Catalog Prompt).**
**`9f`, the Verdulería session: `0047_unit_manojo.sql` and `0048_catalogo_verduleria.sql`**, **53 new products** in 4 new
families: *Verduras* 29 and *Chiles* 9, by the kilo; *Verduras por pieza* 6, by the piece; *Hierbas* 9, by the **manojo**.
Nothing was newly tagged, because no Verdulería product was already in the template. That makes 131 in all, plus 4 new
category tags (*Verduras*, *Chiles*, *Chiles secos*, *Hierbas*). ⚠️⚠️ **HIS RULINGS, 2026-10-02:** (1) **Herbs are sold by the
manojo, so `0047` adds the unit `manojo`** (count, factor 1 to `pza`, display order 15). Stock counts bunches. (2) **Verdolaga
is two products**: *Verdolaga* by the kilo and *Verdolaga en manojo* (the wording is the assistant's). (3) **Ajo is sold by the
head**, under *Verduras por pieza*. (4) **Limón is three products**: *con semilla*, *sin semilla*, *amarillo*. (5) **Dried chiles
are tagged Verdulería AND Abarrotes** (*ancho, guajillo, pasilla, de árbol*), so `9h` tags them and never adds them again.
(6) ⚠️⚠️ **`caja` WAS ASKED FOR AND IS PARKED, NOT AS A TASK BUT AS CONTEXT, by the owner, until there is feedback.** What
was measured: `record_purchase` (`0018`/`0025`) converts by `unit.factor_to_base` alone and **never reads `pack_size`**,
which the app only shows and edits. So a box of 24 recorded as *2 cajas* would add 2 to stock, not 48. A `caja` unit would
also need one weight for every product, and a box from the Central varies by product and by delivery. **Every purchase unit
here stays `kg` or `pza`.** ⚠️ **Two migrations, not one**: the generator writes the whole catalog file and `--check`
compares it byte for byte, so the unit cannot live inside it. ⚠️ **What `manojo` touched outside the catalog:** `ES.units`
(*manojo*), `MEASURED_IN` (a bunch is counted, never a pack, so the field reads *3 manojo*, not *3 pza*), the unit
fixtures in `api-catalog-write`/`cart-quantity`, and `5d-i-catalog-contract.sh`'s unit count, which goes from 10 to 11. ⚠️ **And `07_money_and_units`, found by CI, not locally:** its U-block asserted *factor 1 if and only if base*, which is stricter than `0001`'s constraint. It now asserts one direction only (a base is at 1), with `manojo` named; the F-block's *exactly three bases* still refuses a fourth. 193 of 193.
**Decisions taken for him:** the *Chiles secos* category; family names; display order 15. **Guessed and kept unchanged:**
Brócoli, Coliflor and Nopal by the kilo; Lechuga orejona, Apio and Poro by the piece; *Limón amarillo* as the third limón;
IVA 0 on everything, dried chiles included. **For `9g`:** *Limón* ×3 and *Aguacate* already exist, so Frutería TAGS them.
**Measured locally:** `build.test.mjs` 20 of 20 after `0048`; the `0042` (25), `0044` (36) and `0018` (82) suites pass;
`5d-i` 12 of 12 with eleven units; Vitest 1741/1741 in 53 files; typecheck clean.
