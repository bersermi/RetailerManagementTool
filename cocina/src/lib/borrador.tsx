// ============================================================================
// WHAT SHE IS GIVING, HELD BETWEEN THE SCREENS THAT ASK IT. Plan tasks
// `10.4b-iii-b` (the sign-up) and `10.4h` (address first: her address screen and
// *Ajusta el punto* share one draft, in the sign-up and behind *Cambiar
// dirección*).
//
// Each lives in its group's layout, for as long as she is in it: the sign-up's
// (`(onboarding)/_layout`) — her kitchen's name and trade (`/registro`), her address
// (`/donde`) and her own point (`/punto`) — and *Cambiar dirección*'s
// (`(cocina)/direccion/_layout`) — her address and her own point, opened on what is
// stored. They are routes, so the phone's own back gesture steps between them;
// nothing is written until the address screen's button (`@/api/registro`,
// `@/api/direccion`).
//
// ⚠️ THE PICK RIDES BESIDE THE DRAFT, NEVER IN IT: the suggestion she picked in
// *Busca tu dirección* places her address on the small map and opens *Ajusta el
// punto* there, while her boxes still read as it filled them. It is Google's point,
// never hers: ⚠️ since `10.5-i-b-ii` the address screen hands it to her save as
// GOOGLE'S POINT — a 30-day copy, with the place's ID (`set_google_point`, `0078`)
// — and never as her own point, which only her hand on *Ajusta el punto* sets.
// Behind *Cambiar dirección* the place known for her boxes as stored is her
// kitchen's stored copy (`@/lib/google`'s `lugarGuardado`), so its small map draws
// what her kitchen's screen draws and asks Google nothing until she changes them.
//
// ⚠️ NOT KEPT ON THE PHONE: an app closed half-way starts again. What is checked,
// and what is written, is `@/api/registro`'s and `@/api/direccion`'s, pure.
// ============================================================================

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import type { SuDireccion } from '@/api/direccion';
import { BORRADOR_VACIO, type Borrador } from '@/api/registro';
import type { Lugar } from '@/lib/google';

interface Contexto<T> {
  readonly valor: T;
  readonly cambiar: (parte: Partial<T>) => void;
  /** The place Google gave for her boxes — the suggestion she picked, or her stored copy — the small map's, and Google's point for her save. */
  readonly elegido: Lugar | null;
  readonly elegir: (lugar: Lugar | null) => void;
}

function useDraft<T>(inicial: T, conocido: Lugar | null = null): Contexto<T> {
  const [valor, setValor] = useState<T>(inicial);
  const [elegido, elegir] = useState<Lugar | null>(conocido);
  const cambiar = useCallback((parte: Partial<T>) => setValor((ahora) => ({ ...ahora, ...parte })), []);
  return useMemo(() => ({ valor, cambiar, elegido, elegir }), [valor, cambiar, elegido]);
}

// ---- the sign-up ----------------------------------------------------------------

const DelRegistro = createContext<Contexto<Borrador> | null>(null);

export function BorradorProvider({ children }: { children: ReactNode }) {
  return <DelRegistro.Provider value={useDraft(BORRADOR_VACIO)}>{children}</DelRegistro.Provider>;
}

export function useBorrador(): Contexto<Borrador> {
  const context = useContext(DelRegistro);
  if (context === null) throw new Error('useBorrador needs BorradorProvider — the (onboarding) layout');
  return context;
}

// ---- *Cambiar dirección* ---------------------------------------------------------

const DeSuDireccion = createContext<Contexto<SuDireccion> | null>(null);

/**
 * ⚠️ Opened on what is stored, once — her address, and the place Google gave for it
 * (`conocido`, her kitchen's stored copy): give it a `key` of her place, so another
 * place starts afresh.
 */
export function SuDireccionProvider({
  inicial,
  conocido,
  children,
}: {
  inicial: SuDireccion;
  conocido: Lugar | null;
  children: ReactNode;
}) {
  return <DeSuDireccion.Provider value={useDraft(inicial, conocido)}>{children}</DeSuDireccion.Provider>;
}

export function useSuDireccion(): Contexto<SuDireccion> {
  const context = useContext(DeSuDireccion);
  if (context === null) throw new Error('useSuDireccion needs SuDireccionProvider — the (cocina)/direccion layout');
  return context;
}
