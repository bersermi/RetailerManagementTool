import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { ComponentProps, ReactNode } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Dish, Kitchen, Offer } from '@/api/cocinas';
import { colorOf, defaultsFor } from '@/api/pagina';
import { ventanaTexto } from '@/lib/lista';
import { alergiaDe, calleDe, comerTexto, comoLlegarUrl, etiquetasDe, pagosTexto } from '@/lib/paginas';
import { ES } from '@/strings';
import { HUES } from '@/theme/colores';
import { TITULO } from '@/theme/letra';
import { PALETTE, SIZE } from '@/theme/palette';
import { Atras } from '@/ui/Atras';
import { Dibujo } from '@/ui/Dibujo';
import { Enlace } from '@/ui/Enlace';
import { FilaCocina } from '@/ui/FilaCocina';
import { Foto } from '@/ui/Foto';
import { Precio, Quedan, Sorpresa } from '@/ui/Precio';

// ============================================================================
// A DISH'S PAGE, AS IT IS DRAWN — *"everything she needs to reserve it"*. Plan task
// `10.5-iv-a-ii`, proposal B as the proposals page drew it (the owner's ruling of
// 2026-11-01): its photo, else her trade's drawing on her colour; the kitchen's row,
// which opens her page; its name, what it has, the tags, the allergy line for a surprise
// bag; the price with the *vale* and the saving; the window and *Quedan N*; where, and
// *Cómo llegar*. ⚠️ SINCE `10.5b-iii-a` (SHE RESERVES): under the window, that she picks
// her hour; how it is eaten; how she pays at the kitchen — the family-shell page's stage
// 2. ⚠️ ITS BUTTON IS NOT THE PAGE'S: Itacate's route hands it a foot (`pie`), drawn below
// the page as it scrolls; Wera Cocina's preview hands none, since a fonda does not reserve.
//
// ⚠️ TAKEN OUT OF ITS ROUTE BY `10.5-v-c-ii`, UNCHANGED: the same screen is Wera Cocina's
// *Así la ven* (`cocina/src/vecinos/ui/PaginaDePlatillo.tsx`, fed from her own rows), held
// to this file code for code by `cocina/test/vecinos.test.ts`. It reads nothing: the
// dish, its kitchen, the distance and the clock are its route's to hand it. ⚠️ NO CHECK
// CAN SEE THIS SCREEN (ADR-035 §2.11): the phone is its instrument.
// ============================================================================

/** The photo's shape here: taller than the list's strip, most of the square she took. */
const FOTO = 4 / 3;

const MARGEN = SIZE.space * 1.5;

export function PaginaDePlatillo({
  cocina,
  oferta,
  platillo,
  distancia,
  ahora,
  onCocina,
  atras = true,
  pie = null,
}: {
  cocina: Kitchen;
  oferta: Offer;
  platillo: Dish;
  /** How far her kitchen is, in words, or `null` when it is not known. */
  distancia: string | null;
  ahora: Date;
  onCocina: () => void;
  /** The way back over the photo — none where a bar above the page closes it. */
  atras?: boolean;
  /** What stands under the page, fixed at the screen's foot — Itacate's *Apartar*. */
  pie?: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const color = colorOf(cocina.page, cocina.giro);
  const etiquetas = etiquetasDe(platillo);
  const alergia = alergiaDe(platillo);
  const calle = calleDe(cocina.address);
  const llegar = comoLlegarUrl(cocina);
  const comer = comerTexto(platillo);

  return (
    <View style={{ flex: 1, backgroundColor: PALETTE.fondo }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: insets.top, paddingBottom: (pie === null ? insets.bottom : 0) + SIZE.space * 3 }}
      >
        <View style={{ width: '100%', aspectRatio: FOTO, overflow: 'hidden', backgroundColor: HUES[color] }}>
          <Dibujo dibujo={defaultsFor(cocina.giro).dibujo} color={color} modo="portada" />
          <Foto path={platillo.photo} cocinaId={cocina.id} size="grande" />
          {atras && <Atras />}
        </View>

        <View style={{ paddingHorizontal: MARGEN, paddingTop: SIZE.rowGap, gap: SIZE.space }}>
          <FilaCocina cocina={cocina} distancia={distancia} onPress={onCocina} />

          <View style={{ gap: SIZE.rowGap / 2 }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: SIZE.rowGap }}>
              <Text accessibilityRole="header" style={{ flexShrink: 1, fontSize: SIZE.titleSize, ...TITULO, color: PALETTE.tinta }}>
                {platillo.name}
              </Text>
              {platillo.surprise && <Sorpresa />}
            </View>
            {platillo.description !== null && (
              <Text style={{ fontSize: SIZE.bodySize, lineHeight: 22, color: PALETTE.tinta }}>{platillo.description}</Text>
            )}
          </View>

          {etiquetas.length > 0 && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SIZE.rowGap / 2 }}>
              {etiquetas.map((etiqueta) => (
                <Text
                  key={etiqueta}
                  style={{
                    fontSize: SIZE.smallSize,
                    color: PALETTE.tinta,
                    borderWidth: 1,
                    borderColor: PALETTE.linea,
                    backgroundColor: PALETTE.superficie,
                    borderRadius: 999,
                    paddingHorizontal: 10,
                    paddingVertical: 3,
                    overflow: 'hidden',
                  }}
                >
                  {etiqueta}
                </Text>
              ))}
            </View>
          )}

          {alergia !== null && (
            <Text
              style={{
                fontSize: SIZE.smallSize,
                lineHeight: 19,
                color: PALETTE.tinta,
                backgroundColor: PALETTE.banda,
                borderRadius: SIZE.rowGap,
                paddingHorizontal: SIZE.space - 2,
                paddingVertical: SIZE.rowGap,
                overflow: 'hidden',
              }}
            >
              {alergia}
            </Text>
          )}

          <Precio platillo={platillo} color={color} grande />

          <View style={{ borderTopWidth: 1, borderTopColor: PALETTE.linea, paddingTop: SIZE.space, gap: SIZE.rowGap }}>
            <Renglon icono="clock-outline">
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: SIZE.rowGap }}>
                <Text style={{ fontSize: SIZE.bodySize, color: PALETTE.tinta }}>{ventanaTexto(oferta, ahora)}</Text>
                <Quedan platillo={platillo} />
              </View>
              <Text style={{ fontSize: SIZE.smallSize, lineHeight: 20, color: PALETTE.tintaApagada }}>{ES.platillo.apartaYPasa}</Text>
            </Renglon>
            <Renglon icono={comer.plato ? 'silverware-fork-knife' : 'shopping-outline'}>
              <Text style={{ fontSize: SIZE.bodySize, color: PALETTE.tinta }}>{comer.titulo}</Text>
              <Text style={{ fontSize: SIZE.smallSize, lineHeight: 20, color: PALETTE.tintaApagada }}>{comer.detalle}</Text>
            </Renglon>
            <Renglon icono="cash">
              <Text style={{ fontSize: SIZE.bodySize, color: PALETTE.tinta }}>{ES.platillo.pagasEnLaCocina}</Text>
              <Text style={{ fontSize: SIZE.smallSize, lineHeight: 20, color: PALETTE.tintaApagada }}>{pagosTexto(cocina)}</Text>
            </Renglon>
            {(calle !== null || cocina.directions !== null) && (
              <Renglon icono="map-marker-outline">
                {calle !== null && <Text style={{ fontSize: SIZE.bodySize, color: PALETTE.tinta }}>{calle}</Text>}
                {cocina.directions !== null && (
                  <Text style={{ fontSize: SIZE.smallSize, lineHeight: 20, color: PALETTE.tintaApagada }}>{cocina.directions}</Text>
                )}
              </Renglon>
            )}
            {llegar !== null && <Enlace texto={ES.pagina.comoLlegar} ayuda={ES.pagina.comoLlegarAyuda} url={llegar} />}
          </View>
        </View>
      </ScrollView>
      {pie}
    </View>
  );
}

/** One line of the dish's facts: a small icon, and what it says beside it. */
function Renglon({
  icono,
  children,
}: {
  icono: ComponentProps<typeof MaterialCommunityIcons>['name'];
  children: ReactNode;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: SIZE.rowGap }}>
      <MaterialCommunityIcons name={icono} size={SIZE.iconSize - 4} color={PALETTE.tintaApagada} style={{ marginTop: 1 }} />
      <View style={{ flex: 1, gap: SIZE.rowGap / 2 }}>{children}</View>
    </View>
  );
}
