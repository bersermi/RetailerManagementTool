-- ============================================================================
-- 0103 — the shops already open take the starter catalog's packs
-- ============================================================================
-- docs/PLAN.md task `14.5`, the row's own question: *whether a shop's catalog
-- products that still hold `1` take them*. A shop opened before `0101` imported
-- its products with no pack, so without this its Comprar never offers *2 cajas*
-- until someone sets each product by hand on its page.
--
-- WHAT IS HERE: one update. A product a shop imported from Wera's catalog
-- (`template_code`) takes its template's pack word and what one holds — only when
-- the template has a pack (`0102`'s guesses) and the shop's row is still as the
-- import left it: no word, and `pack_size` at its default of 1.
--
-- ⚠️ NOTHING A PERSON TYPED IS TOUCHED. A row with a word (set on its page since
-- `14.5`) or with any other size (*Piezas por paquete*, `5e-iii`, before the
-- owner took it out of Editar on 2026-10-17 — one row on the hosted project when
-- this was written, a chayote at 60) keeps what it holds. A product the shop made
-- itself has no `template_code` and is never matched. A row that is already
-- right is not rewritten, so a second run writes nothing.
--
-- ⚠️ ON A NEW DATABASE IT WRITES NOTHING: migrations run before any shop exists.
-- It is a migration rather than a write on the hosted project by hand (the way
-- `0067`'s prices reached his two shops) because the rule names no shop — every
-- shop's untouched rows, the same rule a shop opened tomorrow gets from the import.
-- ============================================================================

update public.product_variant v
   set pack_word = p.pack_word,
       pack_size = p.pack_size
  from catalogo.product p
 where v.template_code = p.code
   and p.pack_word is not null
   and v.pack_word is null
   and v.pack_size = 1;
