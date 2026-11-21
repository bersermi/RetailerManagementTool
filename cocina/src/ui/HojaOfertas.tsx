import { useEffect, useState } from 'react';
import { Linking, Modal, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAvisos, useResponderOfertas } from '@/api/hooks';
import { useAuth } from '@/auth/AuthProvider';
import { pedirPermisoParaAvisos } from '@/lib/avisos';
import { marcarPreguntado } from '@/lib/ofertas';
import { deviceStore } from '@/lib/store';
import { ES } from '@/strings';
import { TITULO } from '@/theme/letra';
import { PALETTE, SIZE } from '@/theme/palette';
import { BotonLleno } from '@/ui/BotonLleno';

// ============================================================================
// *¿TE MANDAMOS NOVEDADES DE WERA COCINA?* — THE SHEET OF ITS OWN. Plan task `10.5c-iii`, as `10.5c-i` draws
// Itacate's (`itacate/src/ui/HojaOfertas.tsx`): an express yes on a sheet of its own (Apple's 4.5.4; never the
// phone's prompt, never the terms' tap), its words naming both uses — receiving *Novedades* and counting what
// each did — and where to turn it off. `@/ui/HojaConfirmar`'s shape (React Native's `Modal`, no Reanimated).
// Raised after a handover (`@/lib/ofertas`' `hayQuePreguntar`, from *Entregar*) and by *Novedades*' switch in
// *Mi cocina* (`@/ui/SusAvisos`).
//
// ⚠️ ITS WORDS ARE A DRAFT, KEPT DARK: only his test accounts are offered it until the analyst approves them,
// and the database keeps a yes only on approved words (`set_my_consent`, 22023 otherwise) — said under the
// buttons, the sheet left open.
// ⚠️ *SÍ, MÁNDAMELAS* KEPT, THEN THE PHONE ASKED if it does not allow notifications yet and still can.
// ⚠️ *AHORA NO* CLOSES AT ONCE: raised as the one question (`pregunta`), her no is sent and never waited for,
// so no phone of hers asks again; raised by the switch, it only closes. A tap on the veil or Android's back
// closes and keeps nothing. Any of them marks this phone as asked.
// NO CHECK CAN SEE THIS (ADR-035 §2.11): the phone is its instrument.
// ============================================================================

export function HojaOfertas({
  visible,
  pregunta,
  onCerrar,
}: {
  visible: boolean;
  /** Raised as the one question after a handover — *Ahora no* is then kept as her no. */
  pregunta: boolean;
  onCerrar: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  const avisos = useAvisos();
  const { responder, busy } = useResponderOfertas();
  const [falla, setFalla] = useState(false);
  // Each time it opens, nothing from the last refusal is left on it.
  useEffect(() => {
    if (visible) setFalla(false);
  }, [visible]);

  function marcar() {
    if (userId !== null) marcarPreguntado(deviceStore(), userId);
  }

  async function si() {
    if (busy) return;
    setFalla(false);
    marcar();
    if (!(await responder(true))) {
      setFalla(true);
      return;
    }
    onCerrar();
    if ((await pedirPermisoParaAvisos(avisos.data ?? [])) === 'ajustes') Linking.openSettings().catch(() => {});
  }

  function ahoraNo() {
    marcar();
    if (pregunta) void responder(false);
    onCerrar();
  }

  function dejar() {
    marcar();
    onCerrar();
  }

  const { hoja } = ES.novedades;
  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent navigationBarTranslucent onRequestClose={dejar}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(32, 29, 22, 0.45)' }}>
        <Pressable accessibilityRole="button" accessibilityLabel={hoja.no} onPress={dejar} style={{ flex: 1 }} />
        <View
          style={{
            backgroundColor: PALETTE.fondo,
            borderTopLeftRadius: 22,
            borderTopRightRadius: 22,
            padding: SIZE.space * 1.5,
            paddingBottom: insets.bottom + SIZE.space * 1.5,
            gap: SIZE.space,
          }}
        >
          <Text accessibilityRole="header" style={{ fontSize: SIZE.titleSize, ...TITULO, color: PALETTE.tinta }}>
            {hoja.titulo}
          </Text>
          <Text style={{ fontSize: SIZE.bodySize, lineHeight: 22, color: PALETTE.tinta }}>{hoja.texto}</Text>
          <Text style={{ fontSize: SIZE.bodySize, lineHeight: 22, color: PALETTE.tinta }}>{hoja.medir}</Text>
          {falla && <Text style={{ fontSize: SIZE.bodySize, fontWeight: '600', color: PALETTE.error }}>{ES.novedades.noSeGuardo}</Text>}
          <BotonLleno variante="principal" label={hoja.si} busy={busy} onPress={() => void si()} />
          <BotonLleno variante="discreto" label={hoja.no} onPress={ahoraNo} />
        </View>
      </View>
    </Modal>
  );
}
