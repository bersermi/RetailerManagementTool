// ============================================================================
// THE ONE-QUESTION MONEY SHEET — a product, the one figure it is missing, and
// the one act that saves it. Vender asks *¿A cuánto lo vendes?* (the owner's
// ruling of 2026-10-14); Comprar asks *¿Cuánto te costó?* (round 4 of `8g`,
// 2026-10-16: *"to add something to the carrito, a price must be entered
// first"*, the same rule Vender got the day before).
//
// ⚠️⚠️ `R14`: COMPRAR IS THE SECOND FILE, AND THE FRAME MOVED SO THE TWO SHEETS
// ARE ONE SHAPE — the owner's *"make sure the geometries in common are the
// same."* What each one SAVES stays in its screen: Vender writes a price through
// the edit screen's own path, Comprar writes the delivery's cost into the cart.
//
// ⚠️ `tone` IS A DECIDED DIFFERENCE (`R16`): the box's edge is `accion` on Vender
// and `compra` on Comprar, where every cost a person types is blue.
//
// ⚠️⚠️ `padding` ON BOTH PLATFORMS — a `Modal` is a window Expo's `resize` does
// not shorten, so Android's `undefined` let the number pad cover the box and the
// button (`8g`, found on the emulator 2026-10-15).
//
// ⚠️ THE BOX IS EMPTY AND THE FIGURE NOW IS SAID ABOVE IT — a proposal must not
// look decided: a mirror, never a pre-fill.
//
// ⚠️ R9, MEASURED ON THE EMULATOR IN ROUND 4 AND LEFT AS IT WAS: on Android the
// cursor lands in the box but the number pad waits for a tap on it — `autoFocus`,
// a focus after the slide and a focus from `onShow` all gave the same answer,
// because Android keeps the activity's window focused under a `Modal`. It was
// Vender's behaviour before this file existed. Whether it is so on a real phone
// is the pilot Android's question, not this emulator's.
// ============================================================================

import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useDensity } from '@/theme/DensityProvider';
import { TITULO } from '@/theme/letra';
import { PALETTE } from '@/theme/palette';
import { BotonLleno } from '@/ui/BotonLleno';
import { Retrato } from '@/ui/Retrato';
import { Velo } from '@/ui/Velo';

export function HojaPrecio({
  name,
  detail,
  question,
  value,
  onChange,
  per,
  inputLabel,
  note = null,
  line = null,
  act,
  onAct,
  busy = false,
  cancel,
  onClose,
  tone = PALETTE.accion,
  tile,
  bare = false,
}: {
  /** The product — the sheet says which before it asks anything. */
  name: string;
  /** The line under the name: what the figure is now, or that there is none. */
  detail: string;
  /** The sheet's one question, in the titles' face. */
  question: string;
  value: string;
  onChange: (text: string) => void;
  /** What the figure is per — *por kg*. */
  per: string;
  /** The box, to a screen reader. */
  inputLabel: string;
  /** Under the box: Comprar's margin while she types. */
  note?: ReactNode;
  /** A refusal or a failure, in `error`. */
  line?: string | null;
  /** The one act's word, and the act. */
  act: string;
  onAct: () => void;
  busy?: boolean;
  cancel: string;
  onClose: () => void;
  tone?: string;
  /** The product's tile colours — `Retrato`'s own `ground`/`ink`. */
  tile?: { ground: string; ink: string };
  /** Drawn inside a `Modal` that is already up (the Carrito's). */
  bare?: boolean;
}) {
  const { scale } = useDensity();
  const insets = useSafeAreaInsets();

  const sheet = (
    <View style={{ flex: 1 }}>
      <Velo label={cancel} onPress={onClose} />
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1, justifyContent: 'flex-end' }}>
        <View
          style={{
            borderTopLeftRadius: scale.space * 2,
            borderTopRightRadius: scale.space * 2,
            backgroundColor: PALETTE.fondo,
            padding: scale.space * 1.5,
            paddingBottom: scale.space * 1.5 + insets.bottom,
            gap: scale.space,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale.space }}>
            <Retrato name={name} small ground={tile?.ground} ink={tile?.ink} />
            <View style={{ flex: 1, gap: scale.rowGap / 4 }}>
              <Text style={{ fontSize: scale.bodySize, fontWeight: '700', color: PALETTE.tinta }}>{name}</Text>
              <Text style={{ fontSize: scale.smallSize, color: PALETTE.tintaApagada }}>{detail}</Text>
            </View>
          </View>

          <Text style={{ fontSize: scale.titleSize, ...TITULO, color: PALETTE.tinta }}>{question}</Text>

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: scale.rowGap,
              minHeight: scale.tapTarget * 1.4,
              paddingHorizontal: scale.space,
              borderRadius: scale.space,
              borderWidth: 2,
              borderColor: tone,
              backgroundColor: PALETTE.superficie,
            }}
          >
            <Text style={{ fontSize: scale.titleSize, fontWeight: '700', color: PALETTE.tinta }}>$</Text>
            <TextInput
              value={value}
              onChangeText={onChange}
              keyboardType="decimal-pad"
              autoFocus
              editable={!busy}
              accessibilityLabel={inputLabel}
              style={{ flex: 1, fontSize: scale.titleSize, fontWeight: '700', color: PALETTE.tinta }}
            />
            <Text style={{ fontSize: scale.bodySize, color: PALETTE.tintaApagada }}>{per}</Text>
          </View>

          {note}

          {line !== null ? <Text style={{ fontSize: scale.bodySize, color: PALETTE.error }}>{line}</Text> : null}

          {/* ⚠️ `8g`, *option 2*: THE sheet's one act, solid; the way out quiet. */}
          <BotonLleno label={act} onPress={onAct} busy={busy} variante="principal" />
          <BotonLleno
            label={cancel}
            onPress={() => {
              if (!busy) onClose();
            }}
            variante="discreto"
          />
        </View>
      </KeyboardAvoidingView>
    </View>
  );

  if (bare) {
    return <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}>{sheet}</View>;
  }
  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      {sheet}
    </Modal>
  );
}
