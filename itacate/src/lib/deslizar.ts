// ============================================================================
// *YA LO TENGO* — HOW FAR IS FAR ENOUGH, PURE. Plan task `10.5b-iii-a`: her side of
// *Recogí* is a swipe, as the family-shell page draws it (stage 2, *Desliza cuando ya lo
// tengas*), so a pocket or a stray tap never says she has her plate.
//
// ⚠️ WERA'S ANSWER, COPIED: the slide that sells (`app/src/cart/commit.ts`, C3.6) commits
// at 85 % of the track the thumb can travel. One answer to *how far*, and a release short
// of it springs back. `test/apartados.test.ts` pins it; where the thumb IS on a phone is
// `@/ui/Deslizar`'s, which no check can look at (ADR-035 §2.11).
// ============================================================================

/** Wera's `COMMIT_AT`: the share of the track a release must reach. */
export const DESLIZAR_HASTA = 0.85;

/** Where the thumb is, as a share of the track it can travel — clamped. */
export function avanceDe(x: number, recorrido: number): number {
  if (!Number.isFinite(x) || !Number.isFinite(recorrido) || recorrido <= 0) return 0;
  return Math.min(1, Math.max(0, x / recorrido));
}

/** Was this release far enough to say *Ya lo tengo*? */
export function alSoltarConfirma(x: number, recorrido: number): boolean {
  return avanceDe(x, recorrido) >= DESLIZAR_HASTA;
}
