import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

// ============================================================================
// EACH LAUNCH AND EACH RETURN TO THE FRONT, AS A NUMBER THAT MOVES. Plan task `10.5c-iii`: Wera
// Cocina's `useAlAbrir` (`cocina/src/lib/useGoogle.ts`), copied — what her phone's messages tell the
// database on each open (`@/lib/AvisosDelTelefono`), and what the phone allows read again for
// *Notificaciones* when she comes back from its settings.
// ============================================================================

export function useAlAbrir(): number {
  const [ahora, setAhora] = useState(() => Date.now());
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') setAhora(Date.now());
    });
    return () => sub.remove();
  }, []);
  return ahora;
}
