# brand/letras — the faces direction A · *Mostrador* names

Step 11, row `11.1` (2026-11-21). These are the sources; no app reads this folder. A build row
(`11.6` for Wera, `11.7` for Wera Cocina and Itacate) copies the files it needs into the app's own
`src/marca/letras/`, as Nunito was copied there in `8g`. **Until his yes at `11.5`, Nunito stays the
titles' face in all three apps** (his ruling of 2026-10-16), and nothing here is on a phone.

| File | For | Where it came from |
|---|---|---|
| `ArchivoSemiExpanded-ExtraBold.ttf` | A screen's title, a sheet's title and question, and the headings that replace the spaced capitals | Omnibus-Type/Archivo, `fonts/ttf/`, version 2.001 (last changed upstream in `b5d6398`, 2021-02-01; read at `2111276`) |
| `ArchivoCondensed-Bold.ttf` | A screen's one big number: today's total, *Quedan 9 de 14*, a handover code, *6 de 8* | the same |
| `Mansalva-Regular.ttf` | Two uses only, both in Wera Cocina and Itacate: a kitchen's own phrase (the one-line sentence under her name on her page, `0076`), and a reward won (the reward she wrote on her card's terms, `0085`) | google/fonts, `ofl/mansalva/`, version 2.112 (`18679c2`, 2022-10-14) |
| `OFL-Archivo.txt`, `OFL-Mansalva.txt` | Their licences: the SIL Open Font License 1.1, which allows bundling the fonts inside an app. Neither names a Reserved Font Name | each beside its font upstream |

What was measured on the files themselves (fontTools 4.68, 2026-11-21):

- **Every file covers the Spanish the apps write**: á é í ó ú ñ ü, ¿ ¡, $, the dashes, the quotes and
  the middle dot. `fsType` is 0 in all three (no embedding restriction).
- ⚠️ **Archivo's figures are proportional by default.** Tabular figures are its OpenType `tnum`
  feature, so the big number asks for them in its style: `fontVariant: ['tabular-nums']` in React
  Native. That reaches a custom font on iOS through Core Text and on Android through
  `fontFeatureSettings`. **Nobody has checked it on a phone yet. `11.5` checks it on both.** If one
  platform ignores it, the fix is a copy of the file with `tnum` frozen in, which the OFL allows
  under a new name.
- Archivo's lowercase is 9% taller than Nunito's (x-height 527 against 484 per 1,000), and
  SemiExpanded runs about 20% wider at the same size: *Fonda Doña Mari* is 206 points at 22 against
  Nunito's 178. That is why the titles keep their 22/28 tokens instead of growing.
- On Android every weight is its own file, and a custom family with `fontWeight` set beside it falls
  back to the phone's face (`app/src/theme/letra.ts` says the same of Nunito). So each cut here is
  one file with one weight, and a style that uses it sets no `fontWeight`.
- Archivo's line box differs from Nunito's (ascent 878, descent 210 against 1,011 and 353), so a
  style in these faces sets its `lineHeight` explicitly. The reference page gives the values.

The reference page that sizes and places them: https://claude.ai/artifact/WhCNyqR8PhzkFom7gavTX5
