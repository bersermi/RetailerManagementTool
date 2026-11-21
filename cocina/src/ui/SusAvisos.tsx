import { useState } from 'react';
import { Linking } from 'react-native';

import { useAvisos, useCambiarAviso, useConsentimiento, useResponderOfertas } from '@/api/hooks';
import { pedirPermisoParaAvisos } from '@/lib/avisos';
import { enMiCocina, novedadesDe } from '@/lib/avisosPush';
import { diaDelSi, siDesde } from '@/lib/ofertas';
import { useNota } from '@/lib/NotaProvider';
import { usePermisoDeAvisos } from '@/lib/useAvisosDelTelefono';
import { ES } from '@/strings';
import { FilaInterruptor } from '@/ui/FilaInterruptor';
import { HojaOfertas } from '@/ui/HojaOfertas';

// ============================================================================
// HER KITCHEN'S MESSAGES, IN *MI COCINA* — the owner's and a helper's alike. Plan task `10.5b-v-ii`
// (call 14: every member of the kitchen, each able to turn them off in *Mi cocina*).
//
// A switch per service kind, drawn from the database's rows (`0092`'s `my_notification_kinds`):
// its words are the row's, and it is hers on every phone. ⚠️ DRAWN OFF WHILE HER PHONE REFUSES,
// with the reminder's words (*Apagado en los ajustes de tu teléfono*); turned on then, the phone is
// asked, or its settings opened when only they can. ⚠️ NOTHING IS DRAWN until the kinds are read —
// with no signal, no switch, never one that would not save.
// ⚠️ SINCE `10.5c-iii` *NOVEDADES DE WERA COCINA*, ONLY WHILE OFFERED (`@/lib/avisosPush`' `novedadesDe` — today his
// test accounts alone): its switch is her answer (`0093`), never a switch row — on opens the sheet
// (`@/ui/HojaOfertas`: her yes is given on its words), off is her no at once; *Dijiste que sí el …* under it.
// ============================================================================

export function SusAvisos() {
  const avisos = useAvisos();
  const { cambiar, busy } = useCambiarAviso();
  const { permiso, leerOtraVez } = usePermisoDeAvisos();
  const nota = useNota();
  const telefonoNoDeja = permiso?.concedido === false;
  const consentimiento = useConsentimiento();
  const { responder, busy: respondiendo } = useResponderOfertas();
  const [hoja, setHoja] = useState(false);
  const novedades = novedadesDe(avisos.data);
  const desde = siDesde(consentimiento.data);

  async function alCambiar(kind: string, on: boolean, estaba: boolean) {
    if (on && telefonoNoDeja && avisos.data !== undefined) {
      if ((await pedirPermisoParaAvisos(avisos.data)) === 'ajustes') Linking.openSettings().catch(() => {});
      leerOtraVez();
    }
    if (on !== estaba && !(await cambiar(kind, on))) nota.avisar(ES.avisos.noSeGuardo);
  }

  async function alCambiarNovedades(on: boolean) {
    if (on) {
      setHoja(true);
      return;
    }
    if (!(await responder(false))) nota.avisar(ES.avisos.noSeGuardo);
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
      {novedades !== null && (
        <FilaInterruptor
          icono="bullhorn-outline"
          titulo={novedades.titulo}
          detalle={
            novedades.encendido && telefonoNoDeja
              ? ES.avisos.sinPermiso
              : desde !== null
                ? ES.novedades.dijisteQueSi(diaDelSi(desde))
                : novedades.detalle
          }
          encendido={novedades.encendido && !telefonoNoDeja}
          disabled={respondiendo || consentimiento.data === undefined}
          onCambiar={(on) => void alCambiarNovedades(on)}
        />
      )}
      <HojaOfertas visible={hoja} pregunta={false} onCerrar={() => setHoja(false)} />
    </>
  );
}
