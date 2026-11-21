import { Linking } from 'react-native';

import { useAvisos, useCambiarAviso } from '@/api/hooks';
import { pedirPermisoParaAvisos } from '@/lib/avisos';
import { enMiCocina } from '@/lib/avisosPush';
import { useNota } from '@/lib/NotaProvider';
import { usePermisoDeAvisos } from '@/lib/useAvisosDelTelefono';
import { ES } from '@/strings';
import { FilaInterruptor } from '@/ui/FilaInterruptor';

// ============================================================================
// HER KITCHEN'S MESSAGES, IN *MI COCINA* — the owner's and a helper's alike. Plan task `10.5b-v-ii`
// (call 14: every member of the kitchen, each able to turn them off in *Mi cocina*).
//
// A switch per service kind, drawn from the database's rows (`0092`'s `my_notification_kinds`):
// its words are the row's, and it is hers on every phone. ⚠️ DRAWN OFF WHILE HER PHONE REFUSES,
// with the reminder's words (*Apagado en los ajustes de tu teléfono*); turned on then, the phone is
// asked, or its settings opened when only they can. ⚠️ NOTHING IS DRAWN until the kinds are read —
// with no signal, no switch, never one that would not save.
// ============================================================================

export function SusAvisos() {
  const avisos = useAvisos();
  const { cambiar, busy } = useCambiarAviso();
  const { permiso, leerOtraVez } = usePermisoDeAvisos();
  const nota = useNota();
  const telefonoNoDeja = permiso?.concedido === false;

  async function alCambiar(kind: string, on: boolean, estaba: boolean) {
    if (on && telefonoNoDeja && avisos.data !== undefined) {
      if ((await pedirPermisoParaAvisos(avisos.data)) === 'ajustes') Linking.openSettings().catch(() => {});
      leerOtraVez();
    }
    if (on !== estaba && !(await cambiar(kind, on))) nota.avisar(ES.avisos.noSeGuardo);
  }

  return (
    <>
      {enMiCocina(avisos.data).map((aviso) => (
        <FilaInterruptor
          key={aviso.kind}
          icono="bell-ring-outline"
          titulo={aviso.titulo}
          detalle={aviso.encendido && telefonoNoDeja ? ES.avisos.sinPermiso : aviso.detalle}
          encendido={aviso.encendido && !telefonoNoDeja}
          disabled={busy}
          onCambiar={(on) => void alCambiar(aviso.kind, on, aviso.encendido)}
        />
      ))}
    </>
  );
}
