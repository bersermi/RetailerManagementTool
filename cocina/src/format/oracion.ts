// ============================================================================
// A HEADING IN SENTENCE CASE — `11.7-i`, Wera's file code for code
// (`app/src/format/oracion.ts`, `11.6`, whose header says why): the spaced capitals
// became headings, their words written in sentence case in `@/strings`; this only
// capitalises the first letter of a heading that arrives built — a day as
// `jueves 26` — and never lower-cases, so a kitchen's name keeps its own case.
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
