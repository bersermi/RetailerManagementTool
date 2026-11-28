import { Icono } from '@/ui/Icono';
import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { ICONO_DE, type Mosaico } from '@/lib/loQueUsas';
import { ES } from '@/strings';
import { PALETTE, SIZE } from '@/theme/palette';
import { ESQUINA } from '@/theme/density';

// ============================================================================
// *HOY*'S TILES — ONE PER FEATURE SHE USES, TWO PER ROW (the family-shell page's zone 4, `htile`).
// Plan task `10.9a-iii`, his arrangement A (ruled 2026-11-16): in the fixed order — card, promotions,
// numbers — each opening the feature's one screen (`@/lib/loQueUsas`' `mosaicosDe`); an odd one out
// takes its row's width. It took the place of *Tu página · 3 de 5* (`10.5-v-c-i`'s door, gone with
// every count of what she has not done).
//   - A FEATURE SHE PICKED AND HAS NOT SET UP stands in its first-time state where it will live:
//     dashed in the green, *Prepara tu tarjeta* and what it asks (`ES.mosaicos.primera`);
//   - SET UP, its own row's words — *6 sellos hoy* — and, when something waits for her, a DOT:
//     urgency is a dot, never a tile moving.
// Each feature's row hands its live words and may draw a button of its own on its tile (`accion`):
// ⚠️ `10.9e-ii`, the card's *Sellar* (the page's `tsell`) — a second tap target under the words, so the
// counter's most used door is one tap from *Hoy*.
// ============================================================================

export function Mosaicos({ mosaicos }: { mosaicos: readonly Mosaico[] }) {
  const filas: Mosaico[][] = [];
  for (let i = 0; i < mosaicos.length; i += 2) filas.push(mosaicos.slice(i, i + 2));
  return (
    <View style={{ gap: SIZE.rowGap + 2 }}>
      {filas.map((fila) => (
        <View key={fila.map((m) => m.servicio).join('+')} style={{ flexDirection: 'row', gap: SIZE.rowGap + 2 }}>
          {fila.map((mosaico) => (
            <Tesela key={mosaico.servicio} mosaico={mosaico} />
          ))}
        </View>
      ))}
    </View>
  );
}

function Tesela({ mosaico }: { mosaico: Mosaico }) {
  const accion = mosaico.vivo?.accion ?? null;
  if (accion === null) return <Cara mosaico={mosaico} />;
  return (
    <View style={{ flex: 1, gap: 6 }}>
      <Cara mosaico={mosaico} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accion.etiqueta}
        onPress={() => router.push(accion.abre)}
        style={({ pressed }) => ({
          minHeight: SIZE.tapTarget - 4,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          borderRadius: ESQUINA.boton,
          backgroundColor: pressed ? PALETTE.tinta : PALETTE.accion,
        })}
      >
        <Icono name="qrcode" size={16} color={PALETTE.superficie} />
        <Text style={{ fontSize: SIZE.smallSize, fontWeight: '800', color: PALETTE.superficie }}>{accion.etiqueta}</Text>
      </Pressable>
    </View>
  );
}

function Cara({ mosaico }: { mosaico: Mosaico }) {
  const nombre = ES.loQueUsas.nombre[mosaico.servicio];
  const primera = mosaico.vivo === null;
  const [valor, detalle] = mosaico.vivo === null ? ES.mosaicos.primera[mosaico.servicio] : [mosaico.vivo.valor, mosaico.vivo.detalle];
  const porHacer = mosaico.vivo?.porHacer === true;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${nombre}. ${valor}. ${detalle}${porHacer ? `. ${ES.mosaicos.porHacer}` : ''}`}
      onPress={() => router.push(mosaico.abre)}
      style={({ pressed }) => ({
        flex: 1,
        gap: 4,
        minHeight: SIZE.tapTarget * 2 + SIZE.space,
        padding: SIZE.space,
        borderRadius: ESQUINA.boton,
        borderWidth: primera ? 1.5 : 1,
        borderStyle: primera ? 'dashed' : 'solid',
        borderColor: primera ? PALETTE.accion : PALETTE.linea,
        backgroundColor: pressed ? PALETTE.accionSuave : primera ? 'transparent' : PALETTE.superficie,
      })}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <View
          style={{
            width: 24,
            height: 24,
            borderRadius: ESQUINA.chip,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: PALETTE.accionSuave,
          }}
        >
          <Icono name={ICONO_DE[mosaico.servicio]} size={15} color={PALETTE.accion} />
        </View>
        <Text numberOfLines={2} style={{ flex: 1, fontSize: SIZE.smallSize - 1, fontWeight: '700', color: PALETTE.tintaApagada }}>
          {nombre}
        </Text>
      </View>
      <Text style={{ marginTop: 4, fontSize: primera ? SIZE.bodySize + 1 : SIZE.titleSize - 3, fontWeight: '800', color: PALETTE.tinta }}>
        {valor}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Text style={{ flexShrink: 1, fontSize: SIZE.smallSize - 1, lineHeight: 17, color: PALETTE.tintaApagada }}>{detalle}</Text>
        {porHacer && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: PALETTE.marca }} />}
      </View>
    </Pressable>
  );
}
