import { useEffect, useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TITULO } from '@/theme/letra';
import { PALETTE, SIZE } from '@/theme/palette';
import { BotonLleno } from '@/ui/BotonLleno';

// ============================================================================
// A SHEET THAT ASKS ONCE BEFORE SOMETHING SHE CANNOT TAKE BACK BY HERSELF. Plan task `10.9b-ii`:
// *¿Quitar a Lupita de tu cocina?* (the family-shell page's `quitarSheet`) and *¿Salir de Fonda Doña
// Mari?* — the owner's sheet's shape, *Cuéntanos*' parts (React Native's `Modal`, no Reanimated).
// `onConfirmar` answers a sentence when it did not happen, drawn on the sheet, which stays open;
// `null` and the caller closes it. The words are the caller's, from `src/strings.ts`.
// ============================================================================

export function HojaConfirmar({
  visible,
  titulo,
  texto,
  confirmar,
  confirmando,
  cancelar,
  ocupado,
  onConfirmar,
  onCerrar,
}: {
  visible: boolean;
  titulo: string;
  texto: string;
  confirmar: string;
  confirmando: string;
  cancelar: string;
  ocupado: boolean;
  onConfirmar: () => Promise<string | null>;
  onCerrar: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [problema, setProblema] = useState<string | null>(null);
  // Each time it opens, nothing from the last refusal is left on it.
  useEffect(() => {
    if (visible) setProblema(null);
  }, [visible]);

  async function confirmarlo() {
    if (ocupado) return;
    setProblema(null);
    const fallo = await onConfirmar();
    if (fallo !== null) setProblema(fallo);
  }

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent navigationBarTranslucent onRequestClose={onCerrar}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(32, 29, 22, 0.45)' }}>
        <Pressable accessibilityRole="button" accessibilityLabel={cancelar} onPress={onCerrar} style={{ flex: 1 }} />
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
            {titulo}
          </Text>
          <Text style={{ fontSize: SIZE.bodySize, lineHeight: 22, color: PALETTE.tinta }}>{texto}</Text>
          {problema !== null && <Text style={{ fontSize: SIZE.bodySize, fontWeight: '600', color: PALETTE.error }}>{problema}</Text>}
          <BotonLleno variante="principal" label={ocupado ? confirmando : confirmar} busy={ocupado} onPress={() => void confirmarlo()} />
          <BotonLleno variante="discreto" label={cancelar} onPress={onCerrar} />
        </View>
      </View>
    </Modal>
  );
}
