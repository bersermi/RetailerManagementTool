import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import { useAuth } from '@/auth/AuthProvider';
import type { Codigo } from '@/lib/ubicacion';

// ============================================================================
// *DÓNDE BUSCAR* — HER PICK: HER LOCATION, OR A POSTAL CODE. Plan task `10.5-v-b`,
// the owner's answer 5 of 2026-11-05 (`10.5-iv-a-iii`'s page): *"We can let the user
// pick the codigo postal or use her location"* — a postal code she types even with her
// location on. Chosen on *Tú* (`(vecino)/donde`), or from the box *Cerca* shows when
// her location cannot be used; read by *Cerca*, which measures the list from it.
//
// ⚠️ REACT STATE AT THE ROOT, AS `DistanciasProvider` IS, AND KEPT NOWHERE: the code's
// centre is Google's answer to her phone (`@/lib/useGoogle`), held in memory only —
// never on the phone's disk, never sent to the database (`test/donde.test.ts`).
// ⚠️ IT BELONGS TO THE LOGIN THAT CHOSE IT: another login on this phone starts from
// her location again, with no effect to forget to run. ⚠️ THE PAGES NEVER READ IT —
// a kitchen's page and a dish's show the list's distance and never learn where she
// searches (the same census).
// ============================================================================

interface DondeBuscar {
  /** The postal code she picked, or `null` — her location. */
  readonly codigo: Codigo | null;
  readonly elegirCodigo: (codigo: Codigo) => void;
  readonly elegirUbicacion: () => void;
}

const Contexto = createContext<DondeBuscar>({
  codigo: null,
  elegirCodigo: () => {},
  elegirUbicacion: () => {},
});

export function DondeBuscarProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const quien = session?.user.id ?? null;
  const [eleccion, setEleccion] = useState<{ readonly quien: string | null; readonly codigo: Codigo | null }>({
    quien: null,
    codigo: null,
  });
  const codigo = eleccion.quien === quien ? eleccion.codigo : null;
  const elegirCodigo = useCallback((nuevo: Codigo) => setEleccion({ quien, codigo: nuevo }), [quien]);
  const elegirUbicacion = useCallback(() => setEleccion({ quien, codigo: null }), [quien]);
  const valor = useMemo(() => ({ codigo, elegirCodigo, elegirUbicacion }), [codigo, elegirCodigo, elegirUbicacion]);
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

/** Her pick, and the two ways to change it. */
export function useDondeBuscar(): DondeBuscar {
  return useContext(Contexto);
}
