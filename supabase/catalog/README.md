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
| `products/<giro>.csv` | `code, family, name, base, purchase, sell, price, pack_size, tax_rate, tags` |

**A product row:**

- `family` is a family **code** from `families.csv`.
- `base, purchase, sell, price` are unit codes from `public.unit` (the generator reads them
  out of the migrations):
  - all four share one dimension;
  - `base` is the base unit itself: `g`, `ml` or `pza`;
  - every product in a family shares a dimension (C8.5).
- `pack_size` is blank (meaning 1) or the number of base units in one purchase unit. A case of
  24 bought as `pza` is `24`.
- `tax_rate` is a **rate**, `0` or `0.16`, never `16`.
- `tags` are space-separated tag codes, and at least one must be a giro.

## Rules that are not obvious

- **A code never changes.** A shop's copy remembers its template row by code, and that is how
  a picture added later finds every shop's copy. Rename by editing `name`.
- **An overlap is a tag, never a second row.** *Huevo* sold by a pollería and a cremería is one
  row carrying both giro tags, in whichever file it was first written. The generator refuses a
  code or a name used twice, across all files.
- **No prices, no pictures.** `image_path` is not a column here, and a regeneration never
  touches it.
- **A unit the table lacks** (*docena*, *manojo*, *caja*) is a migration to `public.unit` and
  an owner's ruling. Never work around one.
