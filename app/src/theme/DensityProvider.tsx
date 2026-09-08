import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

import { DENSITIES, type DensityMode, type DensityScale } from '@/theme/density';

// ============================================================================
// HOW A SCREEN GETS AT C3.18's SCALE. Plan task 5a-ii.
//
// One context, read with `useDensity()`. The alternative — passing a scale down
// through props — was not considered for long: every component in the app needs
// it, so it would be a prop on every component in the app.
//
// ⚠️ THE CHOICE IS NOT PERSISTED YET, AND THAT IS A SEAM, NOT AN OVERSIGHT.
// Storage arrives with the session in `5a-iii` and the settings surface in
// `5b`'s Configuración; until then the mode resets to `normal` on a cold start.
// ⚠️ AND WHEN IT IS PERSISTED IT IS A DEVICE SETTING, NOT A WORKSPACE ONE — an
// elder shopkeeper and their twenty-year-old nephew share a workspace and do
// not share a pair of eyes (C1.5: personal phones, no shared till).
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
  const [mode, setMode] = useState<DensityMode>(initialMode);
  const value = useMemo<Density>(() => ({ mode, scale: DENSITIES[mode], setMode }), [mode]);
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
