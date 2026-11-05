// ============================================================================
// THE TIME, READ AGAIN WHILE A SCREEN IS UP. Plan tasks `10.5-iv-a-i` (the list)
// and `10.5-iv-a-ii` (a kitchen's page and a dish's).
//
// ⚠️ A MODULE OF ITS OWN SINCE `10.5-iv-a-ii`: it lived in `@/lib/useUbicacion`,
// which the list alone may import (`test/donde.test.ts`: her location is handed to
// the list and to nothing else), and the two pages need the clock — a window that
// ends while she reads turns its dish *ya no está en oferta* — but never where she is.
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
