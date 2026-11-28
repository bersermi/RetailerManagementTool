# The starter catalog — how to author it

Plan `## Step 9`. The CSVs here hold the catalog Wera maintains, by giro. A shop copies
products from it at onboarding or later, through `import_catalog()` (`0044`). They become the
shop's own rows, marked prebuilt, and they work offline like any other product.

```
node supabase/catalog/build.mjs --write <label>   # writes the next NNNN_catalogo_<label>.sql
node supabase/catalog/build.mjs --check           # CI: the newest snapshot matches the CSVs
node --test supabase/catalog/build.test.mjs       # the generator's own suite
```

**Each migration is a snapshot of the WHOLE catalog**, not one giro's rows. The newest one
wins: rows that left the CSVs leave the template (shops keep their copies), and everything
else is upserted on its `code`. After `--write`, add the file's row to `supabase/README.md`
and run `supabase db reset`.

## The files

| File | Columns |
|---|---|
| `tags.csv` | `code, kind, label`. `kind` is `giro` or `categoria`; the row order is the picker's order |
| `families.csv` | `code, name, default_lifespan_days, track_expiry`. Lifespan is blank or whole days; `track_expiry` is blank, `si` or `no` |
| `products/<giro>.csv` | `code, family, name, base, purchase, sell, price, pack_size, pack_word, tax_rate, suggested_price, tags` |

**A product row:**

- `family` is a family **code** from `families.csv`.
- `base, purchase, sell, price` are unit codes from `public.unit` (the generator reads them
  out of the migrations):
  - all four share one dimension;
  - `base` is the base unit itself: `g`, `ml` or `pza`;
  - every product in a family shares a dimension (C8.5).
- `pack_size` and `pack_word` go together (`0101`, plan `14.5`): how the product usually
  ARRIVES — `pack_word` is `caja`, `arpilla`, `costal`, `bulto`, `reja`, `docena`, `paquete` or
  `manojo_grande`, and `pack_size` how many of its SELL units one holds (`13,caja` for jitomate
  sold by the kilo, `12,docena` for lechuga sold by the piece). Both blank: it arrives loose. A
  pack is a best guess each shop corrects at its first delivery — never a figure nobody sourced.
- `tax_rate` is a **rate**, `0` or `0.16`, never `16`.
- `tags` are space-separated tag codes, and at least one must be a giro.

## Rules that are not obvious

- **The CSVs own Wera's tags, not every row of `catalogo.tag`.** Wera Cocina's nine trades are
  `0072`'s rows (`for_kind = 'cocina'`), and kitchens point at them. A snapshot deletes and counts
  `for_kind = 'tienda'` only — the first draft of `0102` (`14.5`) deleted them unscoped, and CI's
  kitchen suites caught it before any merge. `build.test.mjs` holds the scope.

- **A code never changes.** A shop's copy remembers its template row by code, and that is how
  a picture added later finds every shop's copy. Rename by editing `name`.
- **An overlap is a tag, never a second row.** *Huevo* sold by a pollería and a cremería is one
  row carrying both giro tags, in whichever file it was first written. The generator refuses a
  code or a name used twice, across all files.
- **No prices, no pictures.** `image_path` is not a column here, and a regeneration never
  touches it.
- **A unit the table lacks** (*docena*, *manojo*, *caja*) is a migration to `public.unit` and
  an owner's ruling. Never work around one.
