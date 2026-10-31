// ============================================================================
// THE SIGN-UP IN PROGRESS, HELD BETWEEN ITS TWO SCREENS. Plan task `10.4b-iii-b`.
//
// The form (`(onboarding)/registro`) and the map (`(onboarding)/punto`) are two
// routes, so the phone's own back gesture steps between them; what she has given
// lives here, in the group's layout, for as long as she is signing up. Nothing
// is written to the database until the map's *Registrar mi cocina*
// (`@/api/registro`: the kitchen is made whole, in one go, at the end).
//
// ⚠️ NOT KEPT ON THE PHONE: an app closed half-way starts the sign-up again.
// What is checked, and when it is complete, is `@/api/registro`'s, pure.
// ============================================================================

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import { BORRADOR_VACIO, type Borrador } from '@/api/registro';

interface BorradorContext {
  readonly borrador: Borrador;
  readonly cambiar: (parte: Partial<Borrador>) => void;
}

const Contexto = createContext<BorradorContext | null>(null);

export function BorradorProvider({ children }: { children: ReactNode }) {
  const [borrador, setBorrador] = useState<Borrador>(BORRADOR_VACIO);
  const cambiar = useCallback((parte: Partial<Borrador>) => setBorrador((ahora) => ({ ...ahora, ...parte })), []);
  const value = useMemo(() => ({ borrador, cambiar }), [borrador, cambiar]);
  return <Contexto.Provider value={value}>{children}</Contexto.Provider>;
}

export function useBorrador(): BorradorContext {
  const context = useContext(Contexto);
  if (context === null) throw new Error('useBorrador needs BorradorProvider — the (onboarding) layout');
  return context;
}
