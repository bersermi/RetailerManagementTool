import { useState } from 'react';
import { Linking, Text } from 'react-native';

import { useAvisos, useResponderOfertas } from '@/api/hooks';
import { useAuth } from '@/auth/AuthProvider';
import { pedirPermisoParaAvisos } from '@/lib/avisos';
import { marcarPreguntado } from '@/lib/ofertas';
import { deviceStore } from '@/lib/store';
import { ES } from '@/strings';
import { PALETTE, SIZE } from '@/theme/palette';
import { BotonLleno } from '@/ui/BotonLleno';
import { Hoja } from '@/ui/Hoja';

// ============================================================================
// *¿TE AVISAMOS DE OFERTAS?* — THE SHEET OF ITS OWN. Plan task `10.5c-iii`, as `10.5c-i` draws it: an express
// yes on a sheet of its own (Apple's 4.5.4; never the phone's prompt, never the terms' tap), its words naming
// both uses — receiving offers and counting what each did — and where to turn it off. Raised after a *Ya lo
// tengo* (`@/lib/ofertas`' `hayQuePreguntar`) and by the offers' switch in *Notificaciones*.
//
// ⚠️ ITS WORDS ARE `10.5c-i`'S DRAFT, KEPT DARK: only his test accounts are offered it until the analyst
// approves them, and the database keeps a yes only on approved words (`set_my_consent`, 22023 otherwise) —
// said under the buttons, the sheet left open.
// ⚠️ *SÍ, AVÍSAME* KEPT, THEN THE PHONE ASKED if it does not allow notifications yet and still can — her
// yes is the moment it is for. ⚠️ *AHORA NO* CLOSES AT ONCE: raised as the one question (`pregunta`), her no is
// sent and never waited for (a no that does not land leaves her unasked on the database — never a yes), so no
// phone of hers asks again; raised by the switch, it only closes — her answer is already no. A tap on the veil
// or Android's back closes and keeps nothing. Any of them marks this phone as asked.
// NO CHECK CAN SEE THIS (ADR-035 §2.11): the phone is its instrument.
// ============================================================================

export function HojaOfertas({
  visible,
  pregunta,
  onCerrar,
}: {
  visible: boolean;
  /** Raised as the one question after a *Ya lo tengo* — *Ahora no* is then kept as her no. */
  pregunta: boolean;
  onCerrar: () => void;
}) {
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  const avisos = useAvisos();
  const { responder, busy } = useResponderOfertas();
  const [falla, setFalla] = useState(false);

  function marcar() {
    if (userId !== null) marcarPreguntado(deviceStore(), userId);
  }

  function cerrar() {
    setFalla(false);
    onCerrar();
  }

  async function si() {
    setFalla(false);
    marcar();
    if (!(await responder(true))) {
      setFalla(true);
      return;
    }
    cerrar();
    if ((await pedirPermisoParaAvisos(avisos.data ?? [])) === 'ajustes') Linking.openSettings().catch(() => {});
  }

  function ahoraNo() {
    marcar();
    if (pregunta) void responder(false);
    cerrar();
  }

  function dejar() {
    marcar();
    cerrar();
  }

  const { hoja } = ES.ofertas;
  return (
    <Hoja visible={visible} titulo={hoja.titulo} onCerrar={dejar}>
      <Text style={{ fontSize: SIZE.bodySize - 1, lineHeight: 22, color: PALETTE.tinta }}>{hoja.texto}</Text>
      <Text style={{ fontSize: SIZE.bodySize - 1, lineHeight: 22, color: PALETTE.tinta }}>{hoja.medir}</Text>
      {falla && <Text style={{ fontSize: SIZE.smallSize, lineHeight: 19, fontWeight: '600', color: PALETTE.error }}>{ES.ofertas.noSeGuardo}</Text>}
      <BotonLleno label={hoja.si} variante="principal" busy={busy} onPress={() => void si()} />
      <BotonLleno label={hoja.no} variante="discreto" onPress={ahoraNo} />
    </Hoja>
  );
}
