import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import { DENSITIES, type DensityMode, type DensityScale } from '@/theme/density';
import { densityMemory, readDensityMode, rememberDensityMode } from '@/theme/densityMemory';

// ============================================================================
// HOW A SCREEN GETS AT C3.18's SCALE. Plan task 5a-ii.
//
// One context, read with `useDensity()`. The alternative — passing a scale down
// through props — was not considered for long: every component in the app needs
// it, so it would be a prop on every component in the app.
//
// ⚠️⚠️ THE CHOICE IS PERSISTED AS OF `5b-ii-a`, AND THE SEAM THIS HEADER USED
// TO DESCRIBE IS CLOSED. It said storage arrives with the session in `5a-iii`
// and the surface in `5b`'s Ajustes; both now exist, the switch has moved off
// the placeholder Home that `5a-iii-b` refused to write from, and the rules
// live in `@/theme/densityMemory` where the suite can read them.
// ⚠️ IT IS A DEVICE SETTING, NOT A WORKSPACE ONE — an elder shopkeeper and
// their twenty-year-old nephew share a workspace and do not share a pair of
// eyes (C1.5: personal phones, no shared till).
//
// ⚠️⚠️ THE STORED MODE IS READ IN THE `useState` INITIALISER, NOT IN AN EFFECT,
// AND THAT IS THE WHOLE DIFFERENCE BETWEEN REMEMBERING AND FLICKERING. An
// effect runs after the first paint, so elder mode would arrive as a resize:
// every screen drawn once at 16pt and again at 20pt, on the launch of the one
// person who cannot read the first of those. The store is synchronous SQLite,
// installed by `lib/supabase.ts`'s import before any component renders, so
// there is nothing to wait for.
//
// ⚠️ AND NO CHECK IN THIS REPOSITORY CAN SEE THAT IT SURVIVES A COLD START
// (`R9`). §2.11 refuses suites over rendering, and a process that is never
// killed cannot demonstrate persistence — `app/test/density-memory.test.ts`
// pins what is written and what is read back, and whether the app actually
// reopens at `Letra grande` is the owner's own phone, as ever.
// ============================================================================

interface Density {
  readonly mode: DensityMode;
  readonly scale: DensityScale;
  readonly setMode: (mode: DensityMode) => void;
}

/**
 * ⚠️ THE DEFAULT IS A WORKING VALUE, NOT `undefined` WITH A THROWING HOOK. A
 * component rendered outside the provider gets normal density and a `setMode`
 * that does nothing, which is a screen that looks right and a control that does
 * not respond — visible in a second on a device. The throwing alternative turns
 * a missing provider into a white screen in the shop, and the provider is
 * mounted once, in the root layout, where it cannot go missing quietly.
 */
const DensityContext = createContext<Density>({
  mode: 'normal',
  scale: DENSITIES.normal,
  setMode: () => {},
});

export function DensityProvider({
  children,
  initialMode = 'normal',
}: {
  children: ReactNode;
  initialMode?: DensityMode;
}) {
  // ⚠️ THE STORED CHOICE WINS OVER `initialMode`, AND `initialMode` IS STILL
  // THE FLOOR. The prop is what a caller asks for when nothing is remembered —
  // the suite's hook, and the default `normal` — and a device that has been to
  // Ajustes has an answer that outranks it.
  const [mode, setStateMode] = useState<DensityMode>(
    () => readDensityMode(densityMemory()) ?? initialMode,
  );

  // ⚠️ THE WRITE IS HERE AND NOT IN THE SCREEN, so that every control that ever
  // sets the mode persists it — including the ones nobody has written yet. A
  // screen that remembered to call the setter and forgot to call the store is
  // exactly the shape of bug `R3` exists to keep out of screens.
  const setMode = useCallback((next: DensityMode) => {
    setStateMode(next);
    rememberDensityMode(densityMemory(), next);
  }, []);

  const value = useMemo<Density>(
    () => ({ mode, scale: DENSITIES[mode], setMode }),
    [mode, setMode],
  );
  return <DensityContext.Provider value={value}>{children}</DensityContext.Provider>;
}

/**
 * The scale in force, plus the mode and the setter.
 *
 * Every size a person looks at comes from here. A literal `fontSize: 16` in a
 * screen is a screen that has only one density and does not say so.
 */
export function useDensity(): Density {
  return useContext(DensityContext);
}
