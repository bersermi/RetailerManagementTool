// ============================================================================
// ⚠️⚠️ ROW 11.5-i'S THROWAWAY SWITCH — A BRANCH THAT IS NEVER MERGED.
//
// Wera's skin, chosen when the app starts from one key on the phone, so ONE
// build shows every option the owner compares on real screens (Step 11,
// docs/PLAN.md):
//
//   hoy       today's app, as shipped
//   a         direction A · Mostrador (rows 11.1–11.3-i), Archivo, the paper
//   a-nunito  the same, with Nunito wherever A puts Archivo
//   a-plano   A without the paper (the frame measurement, and call 7)
//
// The key is read synchronously from the same store the session lives in
// (`expo-sqlite/kv-store`, table `storage`), before any screen's styles are
// made, and set from outside the app (adb / simctl) — so changing it needs a
// cold start, never a tap.
// ============================================================================
import Storage from 'expo-sqlite/kv-store';

export type Piel = 'hoy' | 'a' | 'a-nunito' | 'a-plano';

export const PIEL_KEY = 'wera.piel';

function leer(): Piel {
  try {
    const v = Storage.getItemSync(PIEL_KEY);
    if (v === 'hoy' || v === 'a' || v === 'a-nunito' || v === 'a-plano') return v;
  } catch {
    // nothing stored, or no store: today's app
  }
  return 'hoy';
}

export const PIEL: Piel = leer();

/** Direction A's skin, in any of its three forms. */
export const ES_A = PIEL !== 'hoy';

/** The counter's paper behind the screens. */
export const CON_PAPEL = PIEL === 'a' || PIEL === 'a-nunito';

/** Archivo where A names it; Nunito in `a-nunito` (and today). */
export const CON_ARCHIVO = PIEL === 'a' || PIEL === 'a-plano';

/**
 * A corner under A: paper does not get rounder when the letters grow. Every
 * corner a screen draws today (a spacing value or a fraction of it) becomes the
 * sheet's 3 — or less, if it was less.
 */
export function esq(today: number): number {
  return ES_A ? Math.min(today, 3) : today;
}

/** A sheet on the counter has no border under A: its edge separates it. */
export function borde(today: number): number {
  return ES_A ? 0 : today;
}

/** Letra grande is the density whose title is 28 (density.ts). */
export function esGrande(scale: { titleSize: number }): boolean {
  return scale.titleSize > 22;
}
