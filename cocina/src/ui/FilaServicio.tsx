import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { ComponentProps } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import type { Servicio } from '@/api/servicios';
import { ICONO_DE } from '@/lib/loQueUsas';
import { ES } from '@/strings';
import { PALETTE, SIZE } from '@/theme/palette';
import { ESQUINA } from '@/theme/density';

// ============================================================================
// ONE ROW OF *LO QUE USAS*. Plan task `10.9a-ii`, the family-shell page's `usasRows`: the
// feature's icon, its name, its state under it, and on the right a green *Activar* while she
// does not use it — a chevron once she does and it has a screen. *Tu menú* is a row of its
// own: *Próximamente*, and *Me interesa* until she taps it, then *Anotado* (G44). `@/ui/Fila`'s
// measures, so the section reads as the rows under it.
// ============================================================================

type Glifo = ComponentProps<typeof MaterialCommunityIcons>['name'];

const fila = {
  minHeight: SIZE.tapTarget + SIZE.rowGap,
  flexDirection: 'row',
  alignItems: 'center',
  gap: SIZE.space,
  paddingHorizontal: SIZE.space,
  paddingVertical: SIZE.space,
} as const;

function Textos({ titulo, detalle }: { titulo: string; detalle: string }) {
  return (
    <View style={{ flex: 1, gap: 2 }}>
      <Text style={{ fontSize: SIZE.bodySize - 1, fontWeight: '600', color: PALETTE.tinta }}>{titulo}</Text>
      <Text style={{ fontSize: SIZE.smallSize - 0.6, lineHeight: 18, color: PALETTE.tintaApagada }}>{detalle}</Text>
    </View>
  );
}

function Pastilla({ texto, icono = null, llena = false }: { texto: string; icono?: Glifo | null; llena?: boolean }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: SIZE.rowGap + 2,
        paddingVertical: 4,
        borderRadius: ESQUINA.chip,
        borderWidth: 1,
        borderColor: PALETTE.accion,
        backgroundColor: llena ? PALETTE.accionSuave : PALETTE.superficie,
      }}
    >
      {icono !== null && <MaterialCommunityIcons name={icono} size={14} color={PALETTE.accion} />}
      <Text style={{ fontSize: SIZE.smallSize, fontWeight: '700', color: PALETTE.accion }}>{texto}</Text>
    </View>
  );
}

/** A feature offered: *Activar* while she does not use it; a chevron once she does and its screen exists. */
export function FilaServicio({
  servicio,
  detalle,
  usa,
  onPress,
}: {
  servicio: Exclude<Servicio, 'menu'>;
  detalle: string;
  usa: boolean;
  /** `undefined` when there is nothing to open. */
  onPress?: () => void;
}) {
  const contenido = (
    <>
      <MaterialCommunityIcons name={ICONO_DE[servicio]} size={SIZE.iconSize} color={PALETTE.tintaApagada} />
      <Textos titulo={ES.loQueUsas.nombre[servicio]} detalle={detalle} />
      {!usa ? (
        <Pastilla texto={ES.loQueUsas.activar} />
      ) : (
        onPress !== undefined && <MaterialCommunityIcons name="chevron-right" size={20} color={PALETTE.tintaApagada} />
      )}
    </>
  );
  if (onPress === undefined) return <View style={fila}>{contenido}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${ES.loQueUsas.nombre[servicio]}. ${detalle}`}
      onPress={onPress}
      style={({ pressed }) => [fila, { backgroundColor: pressed ? PALETTE.fondo : PALETTE.superficie }]}
    >
      {contenido}
    </Pressable>
  );
}

/** *Tu menú · Próximamente*: *Me interesa*, then *Anotado* — the row itself opens nothing. */
export function FilaMenu({ anotado, busy, onInteresa }: { anotado: boolean; busy: boolean; onInteresa: () => void }) {
  return (
    <View style={fila}>
      <MaterialCommunityIcons name={ICONO_DE.menu} size={SIZE.iconSize} color={PALETTE.tintaApagada} />
      <Textos titulo={ES.loQueUsas.nombre.menu} detalle={ES.loQueUsas.proximamente} />
      {anotado ? (
        <Pastilla texto={ES.loQueUsas.anotado} icono="check" llena />
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${ES.loQueUsas.meInteresa}: ${ES.loQueUsas.nombre.menu}`}
          accessibilityState={{ disabled: busy }}
          disabled={busy}
          onPress={onInteresa}
          hitSlop={SIZE.rowGap}
        >
          {busy ? <ActivityIndicator color={PALETTE.accion} /> : <Pastilla texto={ES.loQueUsas.meInteresa} />}
        </Pressable>
      )}
    </View>
  );
}
