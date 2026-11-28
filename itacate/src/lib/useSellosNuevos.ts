import { useIsFocused } from 'expo-router';
import { useEffect, useState, type RefObject } from 'react';
import { useWindowDimensions, type View } from 'react-native';

import { useAuth } from '@/auth/AuthProvider';
import { marcarSellosVistos, primerSelloNuevo, sellosVistos } from '@/lib/sellosVistos';
import { deviceStore } from '@/lib/store';

// ============================================================================
// WHICH STAMPS ON HER CARD ARE NEW TO HER, AND WHEN THEY LAND — plan task `11.8-ii` (*El sello cae*). Bound to the
// screen in front: a card behind another screen lands nothing and keeps nothing.
// ⚠️ WHAT SHE HAD SEEN IS READ BEFORE THE CARD'S FIRST FRAME (the phone's store is synchronous).
// ⚠️⚠️ A NEW STAMP WAITS UNTIL ITS ROW IS ON SCREEN (found on the emulator): on a kitchen's page her card sits under
// the day's dishes, so a stamp landing as the page opened landed where she could not see it, and was kept as seen.
// While one waits, the row is measured every `MIRAR_CADA` ms (`measureInWindow`, nothing else runs) — at once on
// *Mi código* and after her scan, where the card is at the top; when she scrolls to it on the page. Until then its
// place is drawn empty; once it is on screen it lands, and what the card shows is kept. Nothing new: kept at once.
// The rules are `@/lib/sellosVistos`', pure and tested there.
// ============================================================================

/** How often a waiting stamp's row is looked for on screen, in milliseconds. */
export const MIRAR_CADA = 200;

/** The first place whose stamp is new (`desde`, `null` for none), and whether they land now (`cae`) — else they wait. */
export function useSellosNuevos(cocinaId: string, sellos: number, fila: RefObject<View | null>): { desde: number | null; cae: boolean } {
  const { session } = useAuth();
  const usuario = session?.user.id ?? null;
  const enFrente = useIsFocused();
  const { height: alto } = useWindowDimensions();
  const [visto, setVisto] = useState<number | null>(() => (usuario === null ? null : sellosVistos(deviceStore(), usuario, cocinaId)));
  const [enVista, setEnVista] = useState(false);
  const desde = enFrente ? primerSelloNuevo(visto, sellos) : null;

  // A new stamp waits for its row on screen — looked for only while one waits.
  useEffect(() => {
    if (desde === null || enVista) return;
    const mirar = () =>
      fila.current?.measureInWindow((_x, y, _ancho, h) => {
        if (h > 0 && y >= 0 && y + h <= alto) setEnVista(true);
      });
    mirar();
    const cada = setInterval(mirar, MIRAR_CADA);
    return () => clearInterval(cada);
  }, [desde, enVista, alto, fila]);

  // Seen — nothing new, or the new ones landing on screen now: a stamp that is landing keeps landing (`@/ui/Movimientos`'
  // `Cae` starts on its turn, and runs out).
  useEffect(() => {
    if (usuario === null || !enFrente) return;
    if (desde !== null && !enVista) return;
    marcarSellosVistos(deviceStore(), usuario, cocinaId, sellos);
    setVisto(sellos);
    setEnVista(false);
  }, [usuario, enFrente, cocinaId, sellos, desde, enVista]);

  return { desde, cae: desde !== null && enVista };
}

/** ⚠️ The kitchen's invitation in front (no card of hers yet): she has seen none there, so her first stamp lands. */
export function useInvitacionVista(cocinaId: string, activa: boolean): void {
  const { session } = useAuth();
  const usuario = session?.user.id ?? null;
  const enFrente = useIsFocused();
  useEffect(() => {
    if (usuario === null || !enFrente || !activa) return;
    marcarSellosVistos(deviceStore(), usuario, cocinaId, 0);
  }, [usuario, enFrente, cocinaId, activa]);
}
