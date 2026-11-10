import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import {
  calificacionTexto,
  coloresDe,
  estadoTexto,
  horaTexto,
  marcaDe,
  marcaTexto,
  nombreTexto,
  prontoTexto,
  queTexto,
  siNoLoCalificasTexto,
  ESPERAN_PULGAR,
  type Orden,
} from '@/lib/apartados';
import { ES } from '@/strings';
import { TITULO } from '@/theme/letra';
import { PALETTE, SIZE } from '@/theme/palette';

// ============================================================================
// ONE ORDER'S CARD — *Apartados*' *Hoy*, and what waits for her thumb in *Historial*. Plan
// task `10.5b-iv-a`, the owner's final design of 2026-11-10 (`orderCard`, and the table of
// states): THE ORDER NUMBER AND WHAT TO PREPARE LEAD — the number in Nunito ExtraBold, its
// digits of even width so codes line up — then how to prepare it and what to charge; the
// neighbour's name and score second, small and muted; then the one action of its state:
//   green *Entregar*                     to hand over — its hour rust 15 minutes before
//   rust *Calificar*                     handed over, not yet rated
//   rust *No se presentó*, green *Sí pasó*  a plate that *se liberó*, not yet rated
// The whole card opens the order (`/apartado/[id]`). What it says is `@/lib/apartados`',
// pinned by `test/apartados.test.ts`. NO CHECK CAN SEE THIS CARD (ADR-035 §2.11).
// ============================================================================

export function TarjetaOrden({
  orden,
  ahora,
  ocupado = false,
  problema = null,
  onAbrir,
  onEntregar,
  onCalificar,
  onNoSePresento,
  onSiPaso,
}: {
  orden: Orden;
  ahora: Date;
  /** A write about this order is on its way: its buttons wait. */
  ocupado?: boolean;
  /** Why the last write about it did not go through, or `null`. */
  problema?: string | null;
  onAbrir: () => void;
  onEntregar: () => void;
  onCalificar: () => void;
  onNoSePresento: () => void;
  onSiPaso: () => void;
}) {
  const marca = marcaDe(orden, ahora);
  const colores = coloresDe(marca);
  const pronto = prontoTexto(orden, ahora);
  const esperando = ESPERAN_PULGAR.includes(marca);
  const aviso = siNoLoCalificasTexto(orden, ahora);
  const porEntregar = marca === 'porEntregar' || marca === 'pronto';

  return (
    <View style={{ gap: 6, padding: SIZE.space, borderRadius: SIZE.space - 2, borderWidth: 1, borderColor: PALETTE.linea, backgroundColor: PALETTE.superficie }}>
      <Pressable accessibilityRole="button" accessibilityLabel={ES.apartados.abrirAyuda(orden.codigo)} onPress={onAbrir} style={{ gap: 6 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: SIZE.rowGap }}>
          <Text style={{ ...TITULO, fontSize: 30, letterSpacing: 1, fontVariant: ['tabular-nums'], color: PALETTE.tinta }}>{orden.codigo}</Text>
          {porEntregar ? (
            <View style={{ alignItems: 'flex-end', gap: 3 }}>
              <Text style={{ fontSize: SIZE.bodySize, fontWeight: '700', fontVariant: ['tabular-nums'], color: pronto === null ? PALETTE.tinta : PALETTE.marca }}>
                {horaTexto(orden.hora, ahora)}
              </Text>
              {pronto !== null && <Text style={{ fontSize: 12, fontWeight: '700', color: PALETTE.marca }}>{pronto}</Text>}
            </View>
          ) : (
            <Marca texto={marcaTexto(orden, ahora)} fondo={colores.fondo} tinta={colores.tinta} punto={esperando} />
          )}
        </View>
        <Text style={{ fontSize: 18, fontWeight: '600', color: PALETTE.tinta }}>{queTexto(orden)}</Text>
        <Text style={{ fontSize: SIZE.bodySize, color: PALETTE.tinta }}>{estadoTexto(orden, ahora)}</Text>
        {orden.vecino !== null && (
          <>
            <View style={{ height: 1, backgroundColor: PALETTE.linea, marginTop: 2 }} />
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SIZE.rowGap }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 }}>
                <Text numberOfLines={1} style={{ fontSize: SIZE.smallSize, fontWeight: '500', color: PALETTE.tintaApagada, flexShrink: 1 }}>
                  {nombreTexto(orden.vecino)}
                </Text>
                <Calificacion texto={calificacionTexto(orden.vecino)} nueva={orden.vecino.calificacion === null} />
              </View>
              <MaterialCommunityIcons name="chevron-right" size={20} color={PALETTE.tintaApagada} />
            </View>
          </>
        )}
      </Pressable>

      {porEntregar && <Accion label={ES.apartados.entregar} tipo="ir" ocupado={ocupado} onPress={onEntregar} />}
      {marca === 'porCalificar' && <Accion label={ES.apartados.calificar} tipo="calificar" ocupado={ocupado} onPress={onCalificar} />}
      {marca === 'seLibero' && (
        <View style={{ flexDirection: 'row', gap: SIZE.rowGap }}>
          <View style={{ flex: 1 }}>
            <Accion label={ES.apartados.noSePresento} tipo="calificar" ocupado={ocupado} onPress={onNoSePresento} />
          </View>
          <View style={{ flex: 1 }}>
            <Accion label={ES.apartados.siPaso} tipo="bien" ocupado={ocupado} onPress={onSiPaso} />
          </View>
        </View>
      )}
      {aviso !== null && <Text style={{ fontSize: SIZE.smallSize, lineHeight: 18, color: PALETTE.tintaApagada }}>{aviso}</Text>}
      {problema !== null && <Text style={{ fontSize: SIZE.smallSize, lineHeight: 18, color: PALETTE.error }}>{problema}</Text>}
    </View>
  );
}

/** A state's mark: its word on its tint, a dot when it waits for her thumb. */
export function Marca({ texto, fondo, tinta, punto = false }: { texto: string; fondo: string; tinta: string; punto?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, backgroundColor: fondo }}>
      {punto && <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: PALETTE.marca }} />}
      <Text style={{ fontSize: 12, fontWeight: '700', color: tinta }}>{texto}</Text>
    </View>
  );
}

/** Her score's chip: *👍 92%* on the band's cream, *Nueva en Itacate* on grey. */
export function Calificacion({ texto, nueva }: { texto: string; nueva: boolean }) {
  return (
    <View style={{ paddingHorizontal: 7, paddingVertical: 3, borderRadius: 999, backgroundColor: nueva ? PALETTE.linea : PALETTE.banda }}>
      <Text style={{ fontSize: 11.5, fontWeight: '700', color: nueva ? PALETTE.tintaApagada : PALETTE.tinta }}>{texto}</Text>
    </View>
  );
}

/** An order's action: filled green to do now, outlined rust for her thumb, outlined green for *Sí pasó*. */
export function Accion({
  label,
  tipo,
  ocupado = false,
  onPress,
}: {
  label: string;
  tipo: 'ir' | 'calificar' | 'bien';
  ocupado?: boolean;
  onPress: () => void;
}) {
  const color = tipo === 'calificar' ? PALETTE.marca : PALETTE.accion;
  const lleno = tipo === 'ir';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: ocupado }}
      disabled={ocupado}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: SIZE.tapTarget,
        borderRadius: 6,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: SIZE.space,
        borderWidth: 1.5,
        borderColor: color,
        backgroundColor: lleno ? color : pressed ? PALETTE.fondo : PALETTE.superficie,
        opacity: ocupado ? 0.6 : 1,
      })}
    >
      {ocupado ? (
        <ActivityIndicator color={lleno ? PALETTE.superficie : color} />
      ) : (
        <Text style={{ fontSize: SIZE.bodySize, fontWeight: '700', color: lleno ? PALETTE.superficie : color }}>{label}</Text>
      )}
    </Pressable>
  );
}
