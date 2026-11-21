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
//
// ⚠️ `10.5-iv-b-iii`: AND *BUSCAR EN ESTA ZONA* — the map's centre she searched, which the
// list measures from until *Volver a donde estás* (`soltarZona`). Held here, beside her pick,
// so that a pick on *Dónde buscar* — a postal code, or *Mi ubicación* — lets go of it too:
// *Cerca* stays mounted under that screen, and its own state would outlive her pick. A point
// of the map's, in memory only, as the code's centre is.
// ============================================================================

/** A point on the map — the postal code's own type, so nothing here reads the data layer (`test/donde.test.ts`). */
type Punto = Codigo['punto'];

interface DondeBuscar {
  /** The postal code she picked, or `null` — her location. */
  readonly codigo: Codigo | null;
  /** `10.5-iv-b-iii`: the map's centre she searched with *Buscar en esta zona*, or `null`. */
  readonly zona: Punto | null;
  /** A postal code — and the zone let go. */
  readonly elegirCodigo: (codigo: Codigo) => void;
  /** Her location — and the zone let go. */
  readonly elegirUbicacion: () => void;
  /** *Buscar en esta zona*: the list measures from this point, her pick kept underneath. */
  readonly buscarEnZona: (centro: Punto) => void;
  /** *Volver a donde estás*: back to her pick. */
  readonly soltarZona: () => void;
}

const Contexto = createContext<DondeBuscar>({
  codigo: null,
  zona: null,
  elegirCodigo: () => {},
  elegirUbicacion: () => {},
  buscarEnZona: () => {},
  soltarZona: () => {},
});

interface Eleccion {
  readonly quien: string | null;
  readonly codigo: Codigo | null;
  readonly zona: Punto | null;
}

export function DondeBuscarProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const quien = session?.user.id ?? null;
  const [eleccion, setEleccion] = useState<Eleccion>({ quien: null, codigo: null, zona: null });
  const codigo = eleccion.quien === quien ? eleccion.codigo : null;
  const zona = eleccion.quien === quien ? eleccion.zona : null;
  const elegirCodigo = useCallback((nuevo: Codigo) => setEleccion({ quien, codigo: nuevo, zona: null }), [quien]);
  const elegirUbicacion = useCallback(() => setEleccion({ quien, codigo: null, zona: null }), [quien]);
  const buscarEnZona = useCallback(
    (centro: Punto) =>
      setEleccion((antes) => ({
        quien,
        codigo: antes.quien === quien ? antes.codigo : null,
        zona: { latitude: centro.latitude, longitude: centro.longitude },
      })),
    [quien],
  );
  const soltarZona = useCallback(
    () => setEleccion((antes) => ({ quien, codigo: antes.quien === quien ? antes.codigo : null, zona: null })),
    [quien],
  );
  const valor = useMemo(
    () => ({ codigo, zona, elegirCodigo, elegirUbicacion, buscarEnZona, soltarZona }),
    [codigo, zona, elegirCodigo, elegirUbicacion, buscarEnZona, soltarZona],
  );
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

/** Her pick, the zone she searched, and the ways to change them. */
export function useDondeBuscar(): DondeBuscar {
  return useContext(Contexto);
}
