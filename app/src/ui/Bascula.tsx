// ============================================================================
// LA BÁSCULA — THE COUNTER'S OWN NUMBER PAD. Plan tasks `14.1` (drawn on Vender)
// and `14.3` (moved here as Comprar draws it a second time, `R14`). The owner's
// ruling of 2026-11-27, Step 14: it replaced the phone's `decimal-pad` on the
// counters — that keyboard covered the row being typed into, had no way off it
// but `TecladoListo`'s bar, and made *0.730 kg* five keys with a point in the
// middle.
//
// ⚠️ THIS IS THE PAD'S FRAME, AND WHAT IT READS IS EACH COUNTER'S (`R16`). The
// sheet, the product at its head, the chips, the twelve keys, the one act and
// *Quitar* are here. What the keys MEAN is not: Vender's reads like the scale
// (`@/cart/bascula`'s `teclear`, digits from the right), Comprar's keeps a point
// and has two boxes — what arrived and what it cost (`escribir`, call 5 and 9).
// The figure, what it comes to and the warnings are the screen's `children`.
//
// ⚠️ IT IS A `Modal` OF ITS OWN, OR — `bare` — A SHEET DRAWN INSIDE THE CARRITO'S:
// two `Modal`s up at once is the nested presentation `VaciarCarrito`'s
// arrangement exists to avoid.
// ============================================================================

import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { ReactNode } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { CatalogEntry } from '@/api/catalog';
import type { Tecla } from '@/cart/bascula';
import { ES } from '@/strings';
import { useDensity } from '@/theme/DensityProvider';
import { ESQUINA } from '@/theme/density';
import { PALETTE } from '@/theme/palette';
import { BotonLleno } from '@/ui/BotonLleno';
import { Retrato } from '@/ui/Retrato';
import { Velo } from '@/ui/Velo';

export function Bascula({
  entry,
  retrato,
  detalle,
  children,
  fichas,
  teclas,
  onTecla,
  apagada = () => false,
  accion,
  onQuitar,
  onClose,
  bare = false,
}: {
  entry: CatalogEntry;
  /** The initials' colours — `Retrato`'s own `ground`/`ink` — in the counter's colour. */
  retrato?: { readonly ground: string; readonly ink: string };
  /** Under the name: its price, or who is delivering it, and the counter's doors. */
  detalle: ReactNode;
  /** What is being keyed and what it comes to — the counter's own. */
  children: ReactNode;
  /** The best guesses: each puts its figure on the pad and adds nothing. */
  fichas: readonly { readonly etiqueta: string; readonly onPress: () => void }[];
  /** Three across, four down — `TECLAS` or `TECLAS_PUNTO`. */
  teclas: readonly Tecla[];
  onTecla: (tecla: Tecla) => void;
  /** A key that would change nothing here — Comprar's point on a count. */
  apagada?: (tecla: Tecla) => boolean;
  /** *Agregar* or *Listo*, and whether it is ready. */
  accion: { readonly label: string; readonly onPress: () => void; readonly off: boolean };
  /** Takes the line out — `null` when the product is not in the basket. */
  onQuitar: (() => void) | null;
  onClose: () => void;
  /** Drawn inside the Carrito's `Modal` rather than as a `Modal` of its own. */
  bare?: boolean;
}) {
  const { scale, mode } = useDensity();
  const insets = useSafeAreaInsets();

  const sheet = (
    <View style={{ flex: 1 }}>
      <Velo label={ES.counter.cart.close} onPress={onClose} />
      <View style={{ flex: 1, justifyContent: 'flex-end' }} pointerEvents="box-none">
        <ScrollView
          bounces={false}
          style={{ flexGrow: 0 }}
          contentContainerStyle={{
            borderTopLeftRadius: ESQUINA.hoja,
            borderTopRightRadius: ESQUINA.hoja,
            backgroundColor: PALETTE.superficie,
            padding: scale.space,
            paddingBottom: scale.space + insets.bottom,
            gap: scale.rowGap,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale.space }}>
            <Retrato name={entry.name} picture={entry.picture} small ground={retrato?.ground} ink={retrato?.ink} />
            <View style={{ flex: 1, gap: scale.rowGap / 4 }}>
              <Text numberOfLines={2} style={{ fontSize: scale.bodySize, fontWeight: '700', color: PALETTE.tinta }}>
                {entry.name}
              </Text>
              {detalle}
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={onClose}
              hitSlop={scale.rowGap}
              style={{ alignSelf: 'flex-start', minHeight: scale.tapTarget, justifyContent: 'center' }}
            >
              <Text style={{ fontSize: scale.smallSize, fontWeight: '600', color: PALETTE.accion }}>
                {ES.counter.cart.close}
              </Text>
            </Pressable>
          </View>

          {children}

          {fichas.length === 0 ? null : (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: scale.rowGap / 2 }}>
              {fichas.map((ficha) => (
                <Pressable
                  key={ficha.etiqueta}
                  accessibilityRole="button"
                  onPress={ficha.onPress}
                  style={{
                    // ⚠️ ONE ROW AT `Normal`; AT `Letra grande` THREE AND THREE (or
                    // two and two for four): let to wrap, the larger letters broke
                    // six chips five and one, the last stretched across a whole row
                    // (seen on the emulator, `14.1`).
                    width: mode === 'elder' ? (fichas.length === 4 ? '48%' : '31%') : undefined,
                    flexGrow: 1,
                    minWidth: scale.tapTarget,
                    minHeight: scale.tapTarget * 0.85,
                    paddingHorizontal: scale.rowGap,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: ESQUINA.chip,
                    borderWidth: 1,
                    borderColor: PALETTE.linea,
                    backgroundColor: PALETTE.superficie,
                  }}
                >
                  <Text style={{ fontSize: scale.smallSize, fontWeight: '700', color: PALETTE.tinta }}>{ficha.etiqueta}</Text>
                </Pressable>
              ))}
            </View>
          )}

          {/* Three across, four down — the order every phone's dialler uses. */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: scale.rowGap / 2 }}>
            {teclas.map((tecla) => {
              const off = apagada(tecla);
              return (
                <Pressable
                  key={tecla}
                  accessibilityRole="button"
                  accessibilityLabel={
                    tecla === 'borrar'
                      ? ES.counter.pad.erase
                      : tecla === 'limpiar'
                        ? ES.counter.pad.clear
                        : tecla === 'punto'
                          ? ES.counter.pad.point
                          : tecla
                  }
                  accessibilityState={{ disabled: off }}
                  disabled={off}
                  onPress={() => onTecla(tecla)}
                  style={({ pressed }) => ({
                    width: '31%',
                    flexGrow: 1,
                    height: scale.tapTarget * 1.1,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: ESQUINA.boton,
                    backgroundColor: pressed ? PALETTE.linea : PALETTE.retrato,
                    // ⚠️ FADED, NEVER GONE: the twelve keys keep their places,
                    // and the thumb that learned them is not moved.
                    opacity: off ? 0.35 : 1,
                  })}
                >
                  {tecla === 'borrar' ? (
                    <MaterialCommunityIcons name="backspace-outline" size={scale.iconSize} color={PALETTE.tinta} />
                  ) : tecla === 'limpiar' ? (
                    <Text style={{ fontSize: scale.smallSize, fontWeight: '700', color: PALETTE.tinta }}>
                      {ES.counter.pad.clear}
                    </Text>
                  ) : (
                    <Text style={{ fontSize: scale.titleSize, fontWeight: '600', color: PALETTE.tinta }}>
                      {tecla === 'punto' ? '.' : tecla}
                    </Text>
                  )}
                </Pressable>
              );
            })}
          </View>

          <BotonLleno label={accion.label} onPress={accion.onPress} variante="principal" off={accion.off} />
          {onQuitar === null ? null : (
            <BotonLleno label={ES.counter.cart.remove} onPress={onQuitar} variante="discreto" />
          )}
        </ScrollView>
      </View>
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
