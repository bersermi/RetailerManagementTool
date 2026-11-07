import { router } from 'expo-router';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Linking } from 'react-native';

import { useListings } from '@/api/hooks';
import { alTocarUnRecordatorio, hayPermiso, pedirPermiso, programarRecordatorios, quitarRecordatorios } from '@/lib/avisos';
import { useNota } from '@/lib/NotaProvider';
import {
  diasTexto,
  disparosDe,
  guardarRecordatorio,
  horaTexto,
  leerRecordatorio,
  propuestaDe,
  RUTA,
  type Dia,
  type Propuesta,
  type Recordatorio,
} from '@/lib/recordatorio';
import { deviceStore } from '@/lib/store';
import { useAlAbrir } from '@/lib/useGoogle';
import { ES } from '@/strings';
import { HojaRecordatorio } from '@/ui/HojaRecordatorio';

// ============================================================================
// HER REMINDER, FOR THE TWO TABS AT ONCE. Plan task `10.5-v-c-ii`. *Hoy* asks the question
// once (`@/ui/PreguntaRecordatorio`) and *Mi cocina* keeps the row; both tabs stay
// mounted (Wera's measured trap), so her answer lives HERE, in the tabs' layout, and the
// one sheet both open (*Otra hora*, the row) is drawn here too.
//
// ⚠️ WHAT HER PHONE SCHEDULES FOLLOWS HER ANSWER, ON EVERY OPEN: at each launch and each
// return to the front (`useAlAbrir`) the phone is made to hold exactly her reminders —
// scheduled again while it is on and the phone allows it, cancelled while it is off —
// so an update, a reinstall or a permission turned back on in Settings never leaves her
// with the wrong ones. ⚠️ AND NONE ONCE SHE IS GONE: when the tabs leave — she signed
// out, or her kitchen was deleted — every reminder is cancelled; her answer stays on the
// phone under her kitchen's key, as *Hoy*'s closed door does, and comes back with her.
// ⚠️ A TAP OPENS *PUBLICAR UNA OFERTA* (`@/lib/avisos`' `alTocarUnRecordatorio`) — the one
// it launched the app with, and any tapped while the app runs.
// NO CHECK CAN SEE ANY OF IT (ADR-035 §2.11): the phone over days is the instrument.
// ============================================================================

interface Contexto {
  /** Her answer on this phone, or `null` — never asked, or asked and not yet answered. */
  readonly guardado: Recordatorio | null;
  /** What the rule proposes from her publishing now, or `null`. */
  readonly propuesta: Propuesta | null;
  /** Whether her phone lets Wera Cocina show it; `null` until asked. */
  readonly permiso: boolean | null;
  /** While her phone is being asked. */
  readonly ocupado: boolean;
  /** *Sí, recuérdame*: her hour and her days, as proposed. */
  readonly si: () => void;
  /** The ✕ — *No, gracias*. */
  readonly noGracias: () => void;
  /** *Otra hora*, or the row in *Mi cocina*. */
  readonly abrirHoja: () => void;
}

const CONTEXTO = createContext<Contexto | null>(null);

export function useRecordatorio(): Contexto {
  const contexto = useContext(CONTEXTO);
  if (contexto === null) throw new Error('useRecordatorio needs RecordatorioProvider above it');
  return contexto;
}

/** Her answer on this phone for a kitchen — none while no kitchen is open. */
function leer(kitchenId: string | null): Recordatorio | null {
  return kitchenId === null ? null : leerRecordatorio(deviceStore(), kitchenId);
}

/**
 * ⚠️ HANDED THE OPEN KITCHEN'S ID, NOT KEYED ON IT: a key would remount the tabs under it.
 * When the kitchen changes — hers deleted, her next-made one opened — its own answer is
 * read in the same render, so no kitchen ever shows another's.
 */
export function RecordatorioProvider({ kitchenId, children }: { kitchenId: string | null; children: ReactNode }) {
  const listings = useListings(kitchenId);
  const abierta = useAlAbrir();
  const { avisar } = useNota();
  const [deCocina, setDeCocina] = useState(kitchenId);
  const [guardado, setGuardado] = useState(() => leer(kitchenId));
  if (deCocina !== kitchenId) {
    setDeCocina(kitchenId);
    setGuardado(leer(kitchenId));
  }
  const [permiso, setPermiso] = useState<boolean | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [hoja, setHoja] = useState(false);

  const propuesta = useMemo(
    () => (listings.data === undefined ? null : propuestaDe(listings.data, new Date())),
    // `abierta`: read again at each return to the front, as the clock moved.
    [listings.data, abierta],
  );

  // On every open, the phone holds exactly her answer.
  useEffect(() => {
    let vivo = true;
    void (async () => {
      const hay = await hayPermiso();
      if (!vivo) return;
      setPermiso(hay);
      if (guardado !== null && guardado.encendido && hay) await programarRecordatorios(disparosDe(guardado));
      else if (guardado === null || !guardado.encendido) await quitarRecordatorios();
    })();
    return () => {
      vivo = false;
    };
  }, [guardado, abierta]);

  // None once she is gone: signed out, or her kitchen deleted.
  useEffect(
    () => () => {
      void quitarRecordatorios();
    },
    [],
  );

  // A tap on one of them opens *Publicar una oferta*.
  useEffect(() => alTocarUnRecordatorio(() => router.push(RUTA)), []);

  function guardar(nuevo: Recordatorio) {
    if (kitchenId === null) return;
    guardarRecordatorio(deviceStore(), kitchenId, nuevo);
    setGuardado(nuevo);
  }

  async function encender(hora: number, dias: readonly Dia[]): Promise<void> {
    setOcupado(true);
    const respuesta = await pedirPermiso();
    setOcupado(false);
    guardar({ encendido: respuesta === 'si', hora, dias });
    setPermiso(respuesta === 'si');
    if (respuesta === 'si') {
      avisar(ES.recordatorio.teRecordaremos(horaTexto(hora), diasTexto(dias)));
      return;
    }
    avisar(ES.recordatorio.permiso);
    if (respuesta === 'ajustes') Linking.openSettings().catch(() => {});
  }

  // What the sheet starts from: her answer, else what the rule proposes.
  const base = guardado ?? (propuesta === null ? null : { encendido: false, hora: propuesta.hora, dias: propuesta.dias });

  const contexto: Contexto = {
    guardado,
    propuesta,
    permiso,
    ocupado,
    si: () => {
      if (propuesta !== null) void encender(propuesta.hora, propuesta.dias);
    },
    noGracias: () => {
      if (propuesta === null) return;
      guardar({ encendido: false, hora: propuesta.hora, dias: propuesta.dias });
      avisar(ES.recordatorio.puedesEncenderlo);
    },
    abrirHoja: () => {
      if (base !== null) setHoja(true);
    },
  };

  return (
    <CONTEXTO.Provider value={contexto}>
      {children}
      {base !== null && (
        <HojaRecordatorio
          visible={hoja}
          hora={base.hora}
          dias={base.dias}
          costumbre={propuesta?.costumbre ?? null}
          encendido={base.encendido && permiso !== false}
          ocupado={ocupado}
          onCerrar={() => setHoja(false)}
          onGuardar={(hora) => {
            setHoja(false);
            void encender(hora, base.dias);
          }}
          onApagar={() => {
            setHoja(false);
            guardar({ ...base, encendido: false });
            avisar(ES.recordatorio.apagadoNota);
          }}
        />
      )}
    </CONTEXTO.Provider>
  );
}
