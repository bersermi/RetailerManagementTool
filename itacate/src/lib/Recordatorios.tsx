import { router } from 'expo-router';
import { useEffect } from 'react';

import { useApartados } from '@/api/hooks';
import { alTocarUnRecordatorio, mostrarRecordatorios, programarApartados, quitarApartados } from '@/lib/avisos';
import { disparosDe } from '@/lib/recordatorio';

// ============================================================================
// HER REMINDERS, KEPT IN STEP WITH HER RESERVATIONS. Plan task `10.5b-iii-b`. Drawn
// nothing; mounted with the tabs (`(vecino)/(tabs)/_layout`), as Wera Cocina's reminder
// is with hers (`cocina/src/lib/RecordatorioProvider.tsx`):
//   - EACH TIME HER RESERVATIONS ARE READ — on opening, every minute while one is pending,
//     on a pull, on coming back to the front, after any write of hers — her phone is told
//     exactly the reminders they call for (`@/lib/recordatorio`'s `disparosDe`), so a plate
//     she gave back, collected, or the kitchen handed over loses its reminder at that read;
//   - NONE ONCE SHE IS GONE: when the tabs leave — she signed out, or deleted her account —
//     every reminder of hers is cancelled;
//   - A TAP opens *Apartados*; one that comes due while Itacate is open is shown too.
// ⚠️ `dataUpdatedAt`, NOT `data`: an answer equal to the last keeps its reference, and a
// permission turned on in Settings meanwhile must still be acted on at the next read.
// NO CHECK CAN SEE ANY OF IT (ADR-035 §2.11): the phone is the instrument.
// ============================================================================
export function Recordatorios() {
  const apartados = useApartados();
  const leido = apartados.dataUpdatedAt;

  useEffect(() => {
    if (apartados.data === undefined) return;
    void programarApartados(disparosDe(apartados.data, new Date()));
    // Read again, told again — `leido` moves with every answer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leido]);

  useEffect(
    () => () => {
      void quitarApartados();
    },
    [],
  );

  useEffect(() => alTocarUnRecordatorio((ruta) => router.navigate(ruta as '/apartados')), []);

  useEffect(() => mostrarRecordatorios(), []);

  return null;
}
