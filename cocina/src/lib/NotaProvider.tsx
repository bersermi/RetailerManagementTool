import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo } from 'react-native';

import { useQuitarPublicada } from '@/api/hooks';
import { ES } from '@/strings';
import { NOTA } from '@/theme/movimiento';
import { Nota } from '@/ui/Nota';

// ============================================================================
// THE TOAST AT THE FOOT, AND ITS *DESHACER*. Plan task `10.5-v-c-i`, the owner's
// ruling of 2026-11-05 (the family-shell page's call 19): *Deshacer* for 8 seconds
// after publishing or *Repetir* — the offer gone from Itacate before anyone could
// reserve it — and, his direction of 2026-11-06, after closing *Tu página* on *Hoy*.
//
// ⚠️ AT THE ROOT, NOT IN A SCREEN: publishing ends on *Volver* — the form is gone by the
// time she reads *Publicaste …* on *Hoy* — so the toast and the call behind its
// *Deshacer* live here, above every route (`useQuitarPublicada`, which carries the
// kitchen with each call). ONE AT A TIME: a new one replaces the last, and its
// *Deshacer* with it.
//
// ⚠️ A TAKEN-BACK OFFER IS `withdraw_listing`, *Ya se terminó*'s call — nothing new in
// the database; `@/lib/hoy`'s `deshecha` is what makes it count as never published. If
// it fails (no signal), the toast says so, and the offer is still on *Tus ofertas*.
// A screen reader hears each toast as it arrives. NO CHECK CAN SEE IT (ADR-035 §2.11):
// the phone is the instrument.
// ============================================================================

/** What *Deshacer* does: a sentence when it failed, `null` (or nothing) when it worked. */
type Deshacer = () => Promise<string | null> | void;

interface NotaViva {
  readonly id: number;
  readonly texto: string;
  readonly deshacer: Deshacer | null;
}

interface Notas {
  /** A toast with nothing to undo, or with a *Deshacer* of her screen's own (her door, closed). */
  readonly avisar: (texto: string, deshacer?: Deshacer) => void;
  /** *Publicaste …*, whose *Deshacer* takes that offer down again. */
  readonly avisarPublicada: (texto: string, kitchenId: string, listingId: string) => void;
}

const NOTAS = createContext<Notas | null>(null);

export function NotaProvider({ children }: { children: ReactNode }) {
  const quitar = useQuitarPublicada();
  const [nota, setNota] = useState<NotaViva | null>(null);
  const [deshaciendo, setDeshaciendo] = useState(false);
  const cuenta = useRef(0);
  const reloj = useRef<ReturnType<typeof setTimeout> | null>(null);

  const mostrar = useCallback((texto: string, deshacer: Deshacer | null) => {
    cuenta.current += 1;
    setDeshaciendo(false);
    setNota({ id: cuenta.current, texto, deshacer });
    AccessibilityInfo.announceForAccessibility(texto);
  }, []);

  // Each toast leaves on its own: 8 seconds with *Deshacer*, sooner without — never while it is undoing.
  useEffect(() => {
    if (nota === null || deshaciendo) return undefined;
    reloj.current = setTimeout(() => setNota(null), nota.deshacer === null ? NOTA.solo : NOTA.conDeshacer);
    return () => {
      if (reloj.current !== null) clearTimeout(reloj.current);
    };
  }, [nota, deshaciendo]);

  const notas = useMemo<Notas>(
    () => ({
      avisar: (texto, deshacer) => mostrar(texto, deshacer ?? null),
      avisarPublicada: (texto, kitchenId, listingId) => mostrar(texto, () => quitar(kitchenId, listingId)),
    }),
    [mostrar, quitar],
  );

  async function deshacer() {
    if (nota === null || nota.deshacer === null || deshaciendo) return;
    setDeshaciendo(true);
    const problema = await nota.deshacer();
    if (typeof problema === 'string') mostrar(ES.nota.noSeQuito(problema), null);
    else if (problema === null) mostrar(ES.nota.deshecha, null);
    else setNota(null);
  }

  return (
    <NOTAS.Provider value={notas}>
      {children}
      {nota !== null && (
        <Nota key={nota.id} texto={nota.texto} conDeshacer={nota.deshacer !== null} deshaciendo={deshaciendo} onDeshacer={() => void deshacer()} />
      )}
    </NOTAS.Provider>
  );
}

/** The toast, from any screen under the root. */
export function useNota(): Notas {
  const notas = useContext(NOTAS);
  if (notas === null) throw new Error('useNota outside NotaProvider');
  return notas;
}
