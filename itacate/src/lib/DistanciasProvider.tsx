// ============================================================================
// HOW FAR EACH KITCHEN IS, FROM THE LIST TO HER TWO PAGES. Plan task `10.5-iv-a-ii`.
//
// ⚠️ A NUMBER PER KITCHEN, AND NOTHING OF WHERE SHE IS: her location is asked by one
// module and read by the list alone (`test/donde.test.ts`), which measures every
// kitchen and hands each distance here (`@/lib/lista`'s `distanciasDe`); a kitchen's
// page and a dish's show it and work out nothing. So the pages follow her as she walks
// — the list stays mounted under them and keeps measuring — and a page opened with
// no list beneath it shows no distance.
//
// ⚠️ REACT STATE, NOT A STORE: ADR-035 §2.11 keeps Zustand for the cart alone, and
// this is a value two screens read while it lives — held where `AuthProvider` holds the
// session, in memory, gone with the app. The list empties it when it leaves.
// ============================================================================

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

import { mismasDistancias } from '@/lib/lista';

const NINGUNA: ReadonlyMap<string, number> = new Map();

const Distancias = createContext<ReadonlyMap<string, number>>(NINGUNA);
const Poner = createContext<(distancias: ReadonlyMap<string, number>) => void>(() => {});

export function DistanciasProvider({ children }: { children: ReactNode }) {
  const [distancias, setDistancias] = useState<ReadonlyMap<string, number>>(NINGUNA);
  // The same distances keep the same map, so a page is not drawn again every minute for nothing.
  const poner = useCallback(
    (nuevas: ReadonlyMap<string, number>) => setDistancias((antes) => (mismasDistancias(antes, nuevas) ? antes : nuevas)),
    [],
  );
  return (
    <Poner.Provider value={poner}>
      <Distancias.Provider value={distancias}>{children}</Distancias.Provider>
    </Poner.Provider>
  );
}

/** The list's hand: how it gives every distance it measured. Stable across renders. */
export function usePonerDistancias(): (distancias: ReadonlyMap<string, number>) => void {
  return useContext(Poner);
}

/** How far one kitchen is, in metres, as the list last measured it — `null` when it is not known. */
export function useDistancia(cocinaId: string): number | null {
  return useContext(Distancias).get(cocinaId) ?? null;
}

/** An empty answer — what the list hands back when it leaves. */
export const SIN_DISTANCIAS = NINGUNA;
