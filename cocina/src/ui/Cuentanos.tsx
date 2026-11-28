import { Icono } from '@/ui/Icono';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Pressable, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MENU_MAXIMO } from '@/api/servicios';
import { ICONO_DE, revisarMenu } from '@/lib/loQueUsas';
import { ES } from '@/strings';
import { letraTitulo } from '@/theme/letra';
import { PALETTE, SIZE } from '@/theme/palette';
import { ESQUINA } from '@/theme/density';
import { BotonLleno } from '@/ui/BotonLleno';

// ============================================================================
// *CUÉNTANOS CÓMO NECESITAS TU MENÚ* — THE LINE AT THE FOOT OF *HOY*, AND ITS SHEET. Plan task
// `10.9a-ii`, the owner's ruling of 2026-11-17 (G45) and the family-shell page's `menuFoot` and
// `cuentanosSheet`: a quiet line with its ✕; a tap opens a text box where she says how she
// pictures her menu — up to 500 characters (`MENU_MAXIMO`, `0081`'s), *Enviar* or *Ahora no*.
// What she writes stays in the database; Discord only hears that one arrived (`send_menu_request`).
// When the line shows is `@/lib/loQueUsas`' `cuentanosEnHoy`, *Hoy*'s to ask.
//
// ⚠️ THE SHEET IS REACT NATIVE'S `Modal`, AS *RECORDATORIO*'S IS (`@/ui/HojaRecordatorio`), AND ON
// ANDROID NOTHING RESIZES A MODAL'S WINDOW FOR THE KEYBOARD — so `KeyboardAvoidingView` pads on
// BOTH phones (Wera's price sheet, `8g`, met the keys over its box with `undefined` on Android).
// What she typed is kept while *Hoy* stays up, so *Ahora no* loses nothing. NO CHECK CAN SEE IT
// (ADR-035 §2.11): the emulator, with the keyboard up, is its instrument.
// ============================================================================

/** The line at the foot of *Hoy*. */
export function LineaCuentanos({ onAbrir, onCerrar }: { onAbrir: () => void; onCerrar: () => void }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: SIZE.rowGap,
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: PALETTE.linea,
        borderRadius: ESQUINA.hoja,
        paddingLeft: SIZE.space,
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${ES.cuentanos.titulo}. ${ES.cuentanos.detalle}`}
        onPress={onAbrir}
        style={{ flex: 1, minHeight: SIZE.tapTarget + SIZE.rowGap, flexDirection: 'row', alignItems: 'center', gap: SIZE.rowGap, paddingVertical: SIZE.rowGap }}
      >
        <Icono name={ICONO_DE.menu} size={SIZE.iconSize - 4} color={PALETTE.accion} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ fontSize: SIZE.bodySize - 1, fontWeight: '700', color: PALETTE.tinta }}>{ES.cuentanos.titulo}</Text>
          <Text style={{ fontSize: SIZE.smallSize - 0.6, color: PALETTE.tintaApagada }}>{ES.cuentanos.detalle}</Text>
        </View>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={ES.cuentanos.quitar}
        onPress={onCerrar}
        style={{ minWidth: SIZE.tapTarget, minHeight: SIZE.tapTarget, alignItems: 'center', justifyContent: 'center' }}
      >
        <Icono name="close" size={16} color={PALETTE.tintaApagada} />
      </Pressable>
    </View>
  );
}

/** The sheet: what she writes, *Enviar* or *Ahora no*. `onEnviar` answers a sentence when it did not go. */
export function HojaCuentanos({
  visible,
  ocupado,
  onCerrar,
  onEnviar,
}: {
  visible: boolean;
  ocupado: boolean;
  onCerrar: () => void;
  onEnviar: (texto: string) => Promise<string | null>;
}) {
  const insets = useSafeAreaInsets();
  const [texto, setTexto] = useState('');
  const [problema, setProblema] = useState<string | null>(null);
  // Each time it opens, nothing from the last refusal is left on it.
  useEffect(() => {
    if (visible) setProblema(null);
  }, [visible]);

  async function enviar() {
    const vacio = revisarMenu(texto);
    if (vacio !== null) return setProblema(vacio);
    const fallo = await onEnviar(texto);
    if (fallo !== null) return setProblema(fallo);
    setTexto('');
  }

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent navigationBarTranslucent onRequestClose={onCerrar}>
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(32, 29, 22, 0.45)' }}>
        <Pressable accessibilityRole="button" accessibilityLabel={ES.cuentanos.ahoraNo} onPress={onCerrar} style={{ flex: 1 }} />
        <View
          style={{
            backgroundColor: PALETTE.fondo,
            borderTopLeftRadius: ESQUINA.hoja,
            borderTopRightRadius: ESQUINA.hoja,
            padding: SIZE.space * 1.5,
            paddingBottom: insets.bottom + SIZE.space * 1.5,
            gap: SIZE.space,
          }}
        >
          <Text accessibilityRole="header" style={{ ...letraTitulo(SIZE), color: PALETTE.tinta }}>
            {ES.cuentanos.titulo}
          </Text>
          <Text style={{ fontSize: SIZE.bodySize - 1, lineHeight: 20, color: PALETTE.tinta }}>{ES.cuentanos.texto}</Text>
          <View style={{ gap: 4 }}>
            <TextInput
              accessibilityLabel={ES.cuentanos.titulo}
              value={texto}
              onChangeText={(nuevo) => {
                setTexto(nuevo);
                setProblema(null);
              }}
              placeholder={ES.cuentanos.ejemplo}
              placeholderTextColor={PALETTE.tintaApagada}
              multiline
              maxLength={MENU_MAXIMO}
              textAlignVertical="top"
              style={{
                fontSize: SIZE.bodySize,
                minHeight: SIZE.tapTarget * 2.4,
                maxHeight: SIZE.tapTarget * 4,
                borderWidth: 1,
                borderColor: PALETTE.linea,
                borderRadius: ESQUINA.campo,
                paddingHorizontal: SIZE.space,
                paddingTop: SIZE.rowGap,
                paddingBottom: SIZE.rowGap,
                backgroundColor: PALETTE.superficie,
                color: PALETTE.tinta,
              }}
            />
            <Text style={{ alignSelf: 'flex-end', fontSize: SIZE.smallSize - 1, color: PALETTE.tintaApagada }}>
              {ES.cuentanos.cuenta(texto.length, MENU_MAXIMO)}
            </Text>
          </View>
          {problema !== null && <Text style={{ fontSize: SIZE.bodySize, fontWeight: '600', color: PALETTE.error }}>{problema}</Text>}
          <BotonLleno variante="principal" label={ocupado ? ES.cuentanos.enviando : ES.cuentanos.enviar} busy={ocupado} onPress={() => void enviar()} />
          <BotonLleno variante="discreto" label={ES.cuentanos.ahoraNo} onPress={onCerrar} />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
