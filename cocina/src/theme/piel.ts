// ============================================================================
// ⚠️⚠️ ROW 11.5-ii'S THROWAWAY SWITCH — A BRANCH THAT IS NEVER MERGED.
//
// This app's skin, chosen when the app starts from one key on the phone, so ONE
// build shows both looks the owner compares on real screens (Step 11,
// docs/PLAN.md; Wera's twin is row 11.5-i's `app/src/theme/piel.ts`):
//
//   hoy   today's app, as shipped
//   a     direction A · Mostrador (rows 11.1–11.3-i), Archivo, no paper —
//         his rulings of 2026-11-26
//
// Read synchronously from the store the session lives in (`expo-sqlite`'s
// key–value table `storage`), before any screen's styles are made, and set from
// outside the app (adb / simctl) — so changing it needs a cold start.
// ============================================================================
import { useRef } from 'react';
import type { ScrollView } from 'react-native';
import Storage from 'expo-sqlite/kv-store';

export type Piel = 'hoy' | 'a';

export const PIEL_KEY = 'wera.piel';

function leer(): Piel {
  try {
    const v = Storage.getItemSync(PIEL_KEY);
    if (v === 'hoy' || v === 'a') return v;
  } catch {
    // nothing stored, or no store: today's app
  }
  return 'hoy';
}

export const PIEL: Piel = leer();

/** Direction A's skin. */
export const ES_A = PIEL === 'a';

/** A corner under A: a sheet's 3, or less if it was less. Paper does not get rounder. */
export function esq(today: number): number {
  return ES_A ? Math.min(today, 3) : today;
}

/** A sheet on the counter has no border under A: its edge separates it. */
export function borde(today: number): number {
  return ES_A ? 0 : today;
}

/** A probe for the shots: how far a screen opens scrolled (`wera.sonda.y`), 0 when unset. */
export function sondaY(): number {
  try {
    const v = Number(Storage.getItemSync('wera.sonda.y'));
    return Number.isFinite(v) ? v : 0;
  } catch {
    return 0;
  }
}

/**
 * The probe as props for a ScrollView: once its content is tall enough, scroll to `wera.sonda.y` once, with
 * no animation. (An initial `contentOffset` is clamped to 0 while the screen's data is still being read.)
 */
export function useSonda() {
  const ref = useRef<ScrollView>(null);
  const reloj = useRef<ReturnType<typeof setTimeout> | null>(null);
  const y = useRef(sondaY()).current;
  return {
    ref,
    onContentSizeChange: () => {
      if (y <= 0) return;
      if (reloj.current !== null) clearTimeout(reloj.current);
      reloj.current = setTimeout(() => ref.current?.scrollTo({ y, animated: false }), 700);
    },
  };
}
