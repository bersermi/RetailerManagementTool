import { useEffect } from 'react';
import { ActivityIndicator, Modal, Pressable, Share, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useInvitar } from '@/api/hooks';
import { codigoAgrupado, compartirTexto } from '@/api/invitar';
import { clockOf } from '@/lib/ventana';
import { ES } from '@/strings';
import { TITULO } from '@/theme/letra';
import { PALETTE, SIZE } from '@/theme/palette';
import { BotonLleno } from '@/ui/BotonLleno';
import { CodigoQR } from '@/ui/CodigoQR';

// ============================================================================
// *INVITAR A ALGUIEN* — THE OWNER'S SHEET. Plan task `10.9b-iii`, the owner's ruling of 2026-11-18 (a
// code for one person, good for 24 hours, sixteen characters, no address asked) and the family-shell
// page's `invitarSheet`: *Que abra Wera Cocina en su teléfono, toque Unirme a una cocina y escanee este
// código*, a QR of the code (since `10.9c`, drawn with no native module — `@/ui/CodigoQR`) and the code in
// four groups under it for typing, until when it works, what she will do there, and *Compartir el código* — React
// Native's own `Share`, as Wera's invitation is shared (`app/src/app/ajustes.tsx`): an owner retyping
// sixteen characters is a step this app need not ask.
//
// ⚠️ A NEW CODE EACH TIME IT OPENS (`useInvitar`): a code is for ONE person, so Lupita's and Rosa's are
// two; an earlier one keeps its 24 hours, and the code is shown once — only its hash is kept. With no
// signal it says so, with *Intentar de nuevo*. The sheet's parts are `@/ui/HojaConfirmar`'s (React
// Native's `Modal`, no Reanimated). NO CHECK CAN SEE THIS SHEET (ADR-035 §2.11): the phone is its
// instrument.
// ============================================================================

export function HojaInvitar({
  visible,
  kitchenId,
  cocina,
  podra,
  onCerrar,
}: {
  visible: boolean;
  kitchenId: string;
  /** The kitchen's name, for the message *Compartir* sends. */
  cocina: string;
  /** What she will do there, true today (`@/lib/ayudante`' `podraTexto`). */
  podra: string;
  onCerrar: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { pedir, olvidar, invitacion, problema, busy } = useInvitar(kitchenId);

  // Each time it opens, a new code; each time it closes, the code is forgotten here.
  useEffect(() => {
    if (visible) pedir();
    else olvidar();
  }, [visible, pedir, olvidar]);

  const hora = invitacion === null ? '' : clockOf(invitacion.vence);
  const texto = { fontSize: SIZE.bodySize, lineHeight: 22, color: PALETTE.tinta } as const;

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent navigationBarTranslucent onRequestClose={onCerrar}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(32, 29, 22, 0.45)' }}>
        <Pressable accessibilityRole="button" accessibilityLabel={ES.invitar.listo} onPress={onCerrar} style={{ flex: 1 }} />
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
            {ES.invitar.titulo}
          </Text>
          <Text style={texto}>{ES.invitar.texto}</Text>

          {invitacion !== null ? (
            <>
              <View
                style={{
                  alignItems: 'center',
                  paddingVertical: SIZE.space * 1.5,
                  gap: SIZE.rowGap,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: PALETTE.linea,
                  backgroundColor: PALETTE.superficie,
                }}
              >
                <CodigoQR texto={invitacion.codigo} lado={176} etiqueta={ES.invitar.qr} />
                <Text
                  selectable
                  accessibilityLabel={invitacion.codigo.split('').join(' ')}
                  style={{ fontSize: SIZE.titleSize + 2, ...TITULO, letterSpacing: 2, color: PALETTE.tinta }}
                >
                  {codigoAgrupado(invitacion.codigo)}
                </Text>
              </View>
              <Text style={{ fontSize: SIZE.smallSize, color: PALETTE.tintaApagada }}>{ES.invitar.vale(hora)}</Text>
              <Text style={texto}>{podra}</Text>
              <BotonLleno
                variante="principal"
                label={ES.invitar.compartir}
                onPress={() => void Share.share({ message: compartirTexto(cocina, invitacion, hora) }).catch(() => {})}
              />
            </>
          ) : problema !== null && !busy ? (
            <>
              <Text style={{ fontSize: SIZE.bodySize, fontWeight: '600', color: PALETTE.error }}>{problema}</Text>
              <BotonLleno label={ES.invitar.otraVez} onPress={pedir} />
            </>
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: SIZE.rowGap, paddingVertical: SIZE.space }}>
              <ActivityIndicator color={PALETTE.accion} />
              <Text style={{ fontSize: SIZE.bodySize, color: PALETTE.tintaApagada }}>{ES.invitar.haciendo}</Text>
            </View>
          )}
          <BotonLleno variante="discreto" label={ES.invitar.listo} onPress={onCerrar} />
        </View>
      </View>
    </Modal>
  );
}
