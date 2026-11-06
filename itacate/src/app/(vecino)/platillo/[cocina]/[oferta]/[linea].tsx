import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router, useLocalSearchParams } from 'expo-router';
import type { ComponentProps, ReactNode } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { apiErrorMessage } from '@/api/errors';
import { useCocinas } from '@/api/hooks';
import { colorOf, defaultsFor } from '@/api/pagina';
import { useDistancia } from '@/lib/DistanciasProvider';
import { ventanaTexto } from '@/lib/lista';
import { alergiaDe, calleDe, comoLlegarUrl, etiquetasDe, lineaDe, parametro, platilloDe } from '@/lib/paginas';
import { useAhora } from '@/lib/useAhora';
import { ES } from '@/strings';
import { HUES } from '@/theme/colores';
import { TITULO } from '@/theme/letra';
import { PALETTE, SIZE } from '@/theme/palette';
import { Atras } from '@/ui/Atras';
import { Dibujo } from '@/ui/Dibujo';
import { Enlace } from '@/ui/Enlace';
import { FilaCocina } from '@/ui/FilaCocina';
import { Foto } from '@/ui/Foto';
import { PaginaVacia } from '@/ui/PaginaVacia';
import { Precio, Quedan, Sorpresa } from '@/ui/Precio';

// ============================================================================
// A DISH'S PAGE — *"everything she needs to reserve it"*. Plan task `10.5-iv-a-ii`,
// proposal B as the proposals page drew it (the owner's ruling of 2026-11-01): its
// photo, else her trade's drawing on her colour; the kitchen's row, which opens her
// page; its name, what it has, the tags, the allergy line for a surprise bag; the
// price with the *vale* and the saving; the window and *Quedan N*; where, and *Cómo
// llegar*. ⚠️ THE RESERVING IS `10.5b`'S: no button, and no line about paying, until
// questions 7–10 are ruled.
//
// ⚠️ THE DISH IS THE LIST'S, found by her kitchen, its publication and its line in the
// door's answer (in memory). A window that ends while she reads turns the page into
// *Este platillo ya no está en oferta*, with her kitchen's row still there while the
// door sends her (`@/lib/paginas`' `platilloDe`). ⚠️ NO CHECK CAN SEE THIS SCREEN
// (ADR-035 §2.11): the phone is its instrument.
// ============================================================================

/** How often the page is made again while she reads, so an ended window is over on screen. */
const CADA_MINUTO = 60_000;

/** The photo's shape here: taller than the list's strip, most of the square she took. */
const FOTO = 4 / 3;

const MARGEN = SIZE.space * 1.5;

export default function PaginaDelPlatillo() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ cocina: string; oferta: string; linea: string }>();
  const cocinaId = parametro(params.cocina);
  const cocinas = useCocinas();
  const ahora = useAhora(CADA_MINUTO);
  const metros = useDistancia(cocinaId);

  const estado = platilloDe(cocinas.data, cocinaId, parametro(params.oferta), lineaDe(parametro(params.linea)), ahora);
  const abrirCocina = (id: string) => router.push({ pathname: '/cocina/[id]', params: { id } });

  if (estado.kind === 'terminado') {
    if (cocinas.data === undefined && cocinas.isPending) return <PaginaVacia texto={ES.platillo.cargando} esperando />;
    if (cocinas.data === undefined && cocinas.isError) return <PaginaVacia texto={apiErrorMessage(cocinas.error)} />;
    const { cocina } = estado;
    return (
      <PaginaVacia texto={ES.platillo.terminado}>
        {cocina !== null && <FilaCocina cocina={cocina} metros={metros} onPress={() => abrirCocina(cocina.id)} />}
      </PaginaVacia>
    );
  }

  const { cocina, oferta, platillo } = estado;
  const color = colorOf(cocina.page, cocina.giro);
  const etiquetas = etiquetasDe(platillo);
  const alergia = alergiaDe(platillo);
  const calle = calleDe(cocina.address);
  const llegar = comoLlegarUrl(cocina);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: PALETTE.fondo }}
      contentContainerStyle={{ paddingTop: insets.top, paddingBottom: insets.bottom + SIZE.space * 3 }}
    >
      <View style={{ width: '100%', aspectRatio: FOTO, overflow: 'hidden', backgroundColor: HUES[color] }}>
        <Dibujo dibujo={defaultsFor(cocina.giro).dibujo} color={color} modo="portada" />
        <Foto path={platillo.photo} cocinaId={cocina.id} size="grande" />
        <Atras />
      </View>

      <View style={{ paddingHorizontal: MARGEN, paddingTop: SIZE.rowGap, gap: SIZE.space }}>
        <FilaCocina cocina={cocina} metros={metros} onPress={() => abrirCocina(cocina.id)} />

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
