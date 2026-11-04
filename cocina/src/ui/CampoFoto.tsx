import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { ComponentProps, ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

import { ratioOf, type Forma, type Foto as Slot } from '@/api/fotos';
import { ES } from '@/strings';
import { PALETTE, SIZE } from '@/theme/palette';
import { Foto } from '@/ui/Foto';

// ============================================================================
// ONE PICTURE'S SLOT: what it shows now, *Tomar foto*, *Elegir* and *Quitar*.
// Plan task `10.5-ii` — her cover and her logo on *Tu página en Itacate*, and a
// dish's photo when she publishes (`@/ui/Renglon`), so `R14`: two modules draw it.
//
// ⚠️ THE FRAME SHOWS WHAT WILL BE SAVED: the picture just taken, else the one
// saved, else the slot's default (`defecto`, drawn underneath) — the proposals
// page's *Foto de portada* row: a small picture, then the two buttons. *Quitar*
// appears only while there is a picture to take off.
//
// ⚠️ IT DECIDES NOTHING: the screen opens the camera or the gallery (`@/lib/foto`),
// makes the new picture's path, and says in `nota` what a refusal meant.
// ============================================================================

function Boton({
  icon,
  label,
  onPress,
  disabled,
}: {
  icon: ComponentProps<typeof MaterialCommunityIcons>['name'];
  label: string;
  onPress: () => void;
  disabled: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={{
        minHeight: SIZE.tapTarget,
        flexDirection: 'row',
        alignItems: 'center',
        gap: SIZE.rowGap / 2,
        paddingHorizontal: SIZE.space,
        borderRadius: SIZE.space * 0.75,
        borderWidth: 1,
        borderColor: PALETTE.accion,
        backgroundColor: PALETTE.accionSuave,
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <MaterialCommunityIcons name={icon} size={SIZE.iconSize - 2} color={PALETTE.accion} />
      <Text style={{ fontSize: SIZE.bodySize - 1, fontWeight: '700', color: PALETTE.accion }}>{label}</Text>
    </Pressable>
  );
}

export function CampoFoto({
  label,
  forma,
  foto,
  defecto,
  nota,
  busy,
  onTomar,
  onElegir,
  onQuitar,
}: {
  label: string;
  forma: Forma;
  foto: Slot;
  /** What the frame shows with no picture: her trade's drawing, or her initials. */
  defecto: ReactNode;
  /** A refusal said in words, or a quiet line under the slot; `null` for none. */
  nota: string | null;
  busy: boolean;
  onTomar: () => void;
  onElegir: () => void;
  onQuitar: () => void;
}) {
  const width = forma === 'portada' ? 112 : 64;
  const round = forma === 'logo';
  return (
    <View style={{ gap: SIZE.rowGap / 2 }}>
      <Text style={{ fontSize: SIZE.smallSize, fontWeight: '600', color: PALETTE.tintaApagada }}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: SIZE.space }}>
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={{
            width,
            aspectRatio: ratioOf(forma),
            borderRadius: round ? width / 2 : SIZE.space * 0.75,
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: PALETTE.linea,
            backgroundColor: PALETTE.banda,
          }}
        >
          {defecto}
          <Foto foto={foto} />
        </View>
        <View style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: SIZE.rowGap }}>
          <Boton icon="camera-outline" label={ES.pagina.tomar} onPress={onTomar} disabled={busy} />
          <Boton icon="image-outline" label={ES.pagina.elegir} onPress={onElegir} disabled={busy} />
          {foto.kind !== 'ninguna' && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${ES.pagina.quitar}: ${label}`}
              disabled={busy}
              onPress={onQuitar}
              hitSlop={SIZE.rowGap}
              style={{ minHeight: SIZE.tapTarget, justifyContent: 'center', paddingHorizontal: SIZE.rowGap }}
            >
              <Text style={{ fontSize: SIZE.bodySize, fontWeight: '600', color: PALETTE.error }}>{ES.pagina.quitar}</Text>
            </Pressable>
          )}
        </View>
      </View>
      {nota !== null && <Text style={{ fontSize: SIZE.smallSize, color: PALETTE.tintaApagada }}>{nota}</Text>}
    </View>
  );
}
