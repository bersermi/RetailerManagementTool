import MaterialCommunityIcons from '@/marca/Icono';
import type { ComponentProps } from 'react';
import { Pressable, Text, View } from 'react-native';

import { TITULO } from '@/theme/letra';
import { PALETTE, SIZE } from '@/theme/palette';
import { esq } from '@/theme/piel';

// ============================================================================
// A PROMOTION'S BAND AND ITS MARK — WERA COCINA'S, COPIED (`cocina/src/ui/BandaPromocion.tsx`, `10.9g-ii`). Plan
// task `10.9g-iii`: what a fonda was shown in *Así la verán en tu página* is what her neighbour sees — the band on
// her page and on a dish that joined it, the mark on that dish in *Cerca*, on her page and in *Mis cocinas*.
// ⚠️ TERRACOTTA, NEVER THE ACTION'S COLOUR (the drawing: *"Promotions use the brand's terracotta, never the action
// colour"*) — the mark on the terracotta, the band on its tint (`PALETTE.marcaSuave`, Wera Cocina's value).
// ⚠️ A COPY, CODE FOR CODE: `test/gemelos.test.ts` holds it to its twin — a change there is made here in the same
// PR. It takes every word and its picture from its caller (`@/lib/paginas`). NO CHECK CAN SEE IT (ADR-035 §2.11):
// the phone is its instrument.
// ============================================================================

type Icono = ComponentProps<typeof MaterialCommunityIcons>['name'];

/** The mark an offer wears, and the band's head: the kind's picture and its word, white on terracotta. */
export function MarcaPromocion({ icono, texto, chica = false }: { icono: Icono; texto: string; chica?: boolean }) {
  return (
    <View
      style={{
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: chica ? 6 : 7,
        paddingVertical: chica ? 3 : 4,
        borderRadius: esq(6),
        backgroundColor: PALETTE.marca,
      }}
    >
      <MaterialCommunityIcons name={icono} size={chica ? 12 : 14} color={PALETTE.superficie} />
      <Text numberOfLines={1} style={{ fontSize: chica ? 11 : 12, fontWeight: '700', color: PALETTE.superficie }}>
        {texto}
      </Text>
    </View>
  );
}

/**
 * The band: the mark and *hasta el …*, what she offers, more, and *Condiciones* — a link when `onCondiciones`
 * is given, its words when the band is a preview and nothing on it opens.
 */
export function BandaPromocion({
  icono,
  marca,
  hasta,
  loQue,
  mas,
  condiciones,
  onCondiciones = null,
}: {
  icono: Icono;
  marca: string;
  hasta: string | null;
  loQue: string;
  mas: string | null;
  condiciones: string;
  onCondiciones?: (() => void) | null;
}) {
  return (
    <View
      style={{
        gap: 4,
        paddingHorizontal: SIZE.space,
        paddingVertical: SIZE.space - 1,
        borderRadius: esq(14),
        backgroundColor: PALETTE.marcaSuave,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SIZE.rowGap }}>
        <View style={{ flexShrink: 1 }}>
          <MarcaPromocion icono={icono} texto={marca} />
        </View>
        {hasta !== null && <Text style={{ fontSize: SIZE.smallSize - 1, fontWeight: '600', color: PALETTE.marca }}>{hasta}</Text>}
      </View>
      <Text style={{ fontSize: SIZE.bodySize, ...TITULO, color: PALETTE.tinta }}>{loQue}</Text>
      {mas !== null && <Text style={{ fontSize: SIZE.smallSize - 0.5, lineHeight: 18, color: PALETTE.tinta }}>{mas}</Text>}
      {onCondiciones !== null ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={condiciones}
          onPress={onCondiciones}
          hitSlop={SIZE.rowGap}
          style={{ alignSelf: 'flex-start', paddingTop: 2 }}
        >
          <Text style={{ fontSize: SIZE.smallSize - 1, fontWeight: '700', color: PALETTE.marca, textDecorationLine: 'underline' }}>{condiciones}</Text>
        </Pressable>
      ) : (
        <Text style={{ paddingTop: 2, fontSize: SIZE.smallSize - 1, fontWeight: '700', color: PALETTE.marca, textDecorationLine: 'underline' }}>
          {condiciones}
        </Text>
      )}
    </View>
  );
}
