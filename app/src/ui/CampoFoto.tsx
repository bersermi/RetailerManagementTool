// ============================================================================
// THE PHOTO ON CREAR AND EDITAR — the owner's canvas (*Productos · la final*),
// approved *"As proposed"* on 2026-10-17: the square first, *📷 Tomar foto*
// beside it, and under it *Opcional. Sin foto, lleva sus iniciales.* Editar
// adds *Quitar foto* once there is one. Plan task `8o`.
//
// ⚠️ `R14`: TWO FILES DRAW IT — `producto/nuevo` and `producto/[id]`. What a tap
// does is the screen's (it owns the photo it took and when it goes up); this
// draws the square and the three controls and decides nothing.
//
// ⚠️ THE SQUARE SHOWS WHAT WILL BE SAVED: the photo just taken, else the one the
// product has (unless *Quitar foto* was tapped), else its initials. On Crear the
// empty square is drawn DASHED — the canvas's own drawing, and the one place a
// dashed line is right, because it is a form asking for something, never a
// product looking unfinished (C8.14).
// ============================================================================

import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { initials } from '@/api/catalog';
import type { Picture } from '@/api/photos';
import { ES } from '@/strings';
import { useDensity } from '@/theme/DensityProvider';
import { PALETTE } from '@/theme/palette';
import { Foto } from '@/ui/Foto';

export function CampoFoto({
  name,
  takenUri,
  current,
  dashed = false,
  busy,
  note,
  onTake,
  onRemove,
}: {
  /** The product's name as typed — the initials the square wears without a photo. */
  name: string;
  /** The 160 px file just taken on this phone, not yet saved. */
  takenUri: string | null;
  /** The photo the product has now, or `null` (and `null` once *Quitar foto* is tapped). */
  current: Picture | null;
  /** Crear's empty square. */
  dashed?: boolean;
  busy: boolean;
  /** A refusal of the camera, in words, or `null`. */
  note: string | null;
  onTake: () => void;
  /** Editar only: shown while there is a photo to take off. */
  onRemove?: () => void;
}) {
  const { scale } = useDensity();
  const side = scale.tapTarget * 1.6;
  const has = takenUri !== null || current !== null;
  return (
    <View style={{ gap: scale.rowGap / 2 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale.space }}>
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={{
            width: side,
            height: side,
            borderRadius: scale.space,
            borderWidth: dashed && !has ? 2 : 1,
            borderStyle: dashed && !has ? 'dashed' : 'solid',
            borderColor: dashed && !has ? PALETTE.accion : PALETTE.linea,
            backgroundColor: PALETTE.accionSuave,
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          <Text style={{ fontSize: scale.titleSize, fontWeight: '700', color: PALETTE.tinta }}>{initials(name)}</Text>
          {takenUri !== null ? (
            <Image source={{ uri: takenUri }} resizeMode="cover" style={StyleSheet.absoluteFill} />
          ) : (
            <Foto picture={current} />
          )}
        </View>
        <View style={{ flex: 1, gap: scale.rowGap / 2, alignItems: 'flex-start' }}>
          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={onTake}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: scale.rowGap / 2,
              minHeight: scale.tapTarget,
              paddingHorizontal: scale.space,
              borderRadius: scale.space * 0.75,
              borderWidth: 1,
              borderColor: PALETTE.accion,
              backgroundColor: PALETTE.accionSuave,
            }}
          >
            <MaterialCommunityIcons name="camera-outline" size={scale.iconSize} color={PALETTE.accion} />
            <Text style={{ fontSize: scale.bodySize, fontWeight: '700', color: PALETTE.accion }}>
              {has ? ES.products.photo.retake : ES.products.photo.take}
            </Text>
          </Pressable>
          {has && onRemove !== undefined ? (
            <Pressable accessibilityRole="button" disabled={busy} onPress={onRemove} style={{ minHeight: scale.tapTarget * 0.7, justifyContent: 'center' }}>
              <Text style={{ fontSize: scale.smallSize, fontWeight: '600', color: PALETTE.error }}>{ES.products.photo.remove}</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
      <Text style={{ fontSize: scale.smallSize, color: PALETTE.tintaApagada }}>{note ?? ES.products.photo.optional}</Text>
    </View>
  );
}
