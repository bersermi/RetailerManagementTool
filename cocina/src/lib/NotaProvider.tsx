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
// ⚠️ `10.9a-iii`: ONE SMALL CELEBRATION PER FIRST (the owner's nudges, ruled 2026-11-17) is a toast
// too — `festejar`, and *Publicaste …*'s `festejo` for her first offer: the kitchen's green and the
// cow instead of the dark strip and the check (the family-shell page's `.toast.first`). Her first
// offer keeps its *Deshacer*: a celebration never takes the way back.
// ============================================================================

/** What *Deshacer* does: a sentence when it failed, `null` (or nothing) when it worked. */
type Deshacer = () => Promise<string | null> | void;

/**
 * What the toast says after *Deshacer* — an offer's words unless a caller brings its own
 * (`10.9b-ii`: *Quitar a …*, whose *Deshacer* brings a person back, not an offer).
 */
export interface PalabrasDeDeshacer {
  readonly hecho: string;
  readonly fallo: (porque: string) => string;
}

const DE_UNA_OFERTA: PalabrasDeDeshacer = { hecho: ES.nota.deshecha, fallo: ES.nota.noSeQuito };

interface NotaViva {
  readonly id: number;
  readonly texto: string;
  readonly deshacer: Deshacer | null;
  readonly festejo: boolean;
  readonly palabras: PalabrasDeDeshacer;
}

interface Notas {
  /** A toast with nothing to undo, or with a *Deshacer* of her screen's own (her door, closed) — and its own words after it. */
  readonly avisar: (texto: string, deshacer?: Deshacer, palabras?: PalabrasDeDeshacer) => void;
  /** *Publicaste …*, whose *Deshacer* takes that offer down again — her first, as a celebration (`festejo`). */
  readonly avisarPublicada: (texto: string, kitchenId: string, listingId: string, festejo?: boolean) => void;
  /** `10.9a-iii`: a first — *¡Tu primer apartado!* — in the green, with nothing to undo. */
  readonly festejar: (texto: string) => void;
}

const NOTAS = createContext<Notas | null>(null);

export function NotaProvider({ children }: { children: ReactNode }) {
  const quitar = useQuitarPublicada();
  const [nota, setNota] = useState<NotaViva | null>(null);
  const [deshaciendo, setDeshaciendo] = useState(false);
  const cuenta = useRef(0);
  const reloj = useRef<ReturnType<typeof setTimeout> | null>(null);

  const mostrar = useCallback((texto: string, deshacer: Deshacer | null, festejo = false, palabras = DE_UNA_OFERTA) => {
    cuenta.current += 1;
    setDeshaciendo(false);
    setNota({ id: cuenta.current, texto, deshacer, festejo, palabras });
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
      avisar: (texto, deshacer, palabras) => mostrar(texto, deshacer ?? null, false, palabras),
      avisarPublicada: (texto, kitchenId, listingId, festejo = false) => mostrar(texto, () => quitar(kitchenId, listingId), festejo),
      festejar: (texto) => mostrar(texto, null, true),
    }),
    [mostrar, quitar],
  );

  async function deshacer() {
    if (nota === null || nota.deshacer === null || deshaciendo) return;
    setDeshaciendo(true);
    const problema = await nota.deshacer();
    if (typeof problema === 'string') mostrar(nota.palabras.fallo(problema), null);
    else if (problema === null) mostrar(nota.palabras.hecho, null);
    else setNota(null);
  }

  return (
    <NOTAS.Provider value={notas}>
      {children}
      {nota !== null && (
        <Nota
          key={nota.id}
          texto={nota.texto}
          conDeshacer={nota.deshacer !== null}
          deshaciendo={deshaciendo}
          onDeshacer={() => void deshacer()}
          festejo={nota.festejo}
        />
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
