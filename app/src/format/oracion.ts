// ============================================================================
// A HEADING IN SENTENCE CASE — `11.6`, direction A · *Mostrador*: the spaced
// capitals became headings, and the only words Step 11 changes are their case.
//
// The words are WRITTEN in sentence case in `@/strings`; this only capitalises a
// heading's first letter, because some arrive built — a date as `lunes 3`, a
// month as `noviembre` — and a shop's or a product's name inside one must keep
// its own case. ⚠️ Never a lower-casing: *Más de Coca-Cola* would lose its
// capitals.
// ============================================================================

/**
 * `lunes 3 · 2 ventas` → `Lunes 3 · 2 ventas`, past an opening `¿` or `¡`. A
 * heading that starts with a figure (`3 de noviembre`) is left as it is.
 */
export function enOracion(text: string): string {
  // The opening marks by code point (U+00BF, U+00A1): `R4` keeps Spanish out of code.
  const at = /^[\u00BF\u00A1]/.test(text) ? 1 : 0;
  const first = text.charAt(at);
  const upper = first.toLocaleUpperCase('es-MX');
  return upper === first ? text : text.slice(0, at) + upper + text.slice(at + 1);
}
