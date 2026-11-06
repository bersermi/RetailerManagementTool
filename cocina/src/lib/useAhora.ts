// ============================================================================
// THE TIME, READ AGAIN WHILE A SCREEN IS UP. Plan task `10.5-v-c-i`: Itacate's hook
// (`itacate/src/lib/useAhora.ts`), copied for *Hoy*'s card — the time left and its bar
// shorten while she looks, and an offer whose window ends moves to *Terminada* on its own.
// ============================================================================

import { useEffect, useState } from 'react';

/** The time, read again every `ms` while the screen is up — a window that ends drops on its own. */
export function useAhora(ms: number): Date {
  const [ahora, setAhora] = useState(() => new Date());
  useEffect(() => {
    const reloj = setInterval(() => setAhora(new Date()), ms);
    return () => clearInterval(reloj);
  }, [ms]);
  return ahora;
}
