import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useRef } from 'react';
import { Pressable, Text, View } from 'react-native';

import { enFrase, premiosTexto, type VistaDeTarjeta } from '@/lib/tarjeta';
import { useSellosNuevos } from '@/lib/useSellosNuevos';
import { ES } from '@/strings';
import { HUES } from '@/theme/colores';
import { TITULO } from '@/theme/letra';
import { PALETTE, SIZE } from '@/theme/palette';
import { SelloVaca } from '@/ui/Mostrador';
import { Cae } from '@/ui/Movimientos';
import { ESQUINA } from '@/theme/density';
import { BotonLleno } from '@/ui/BotonLleno';
import { Foto } from '@/ui/Foto';
import { Iniciales } from '@/ui/Iniciales';

// ============================================================================
// HER CARD AT A KITCHEN — IN THE KITCHEN'S COLOUR AND LOGO (G41: Itacate is the wallet, the kitchen is the
// brand). Plan task `10.9e-iii`, the family-shell page's `kcardHtml`: the kitchen's circle and *Tarjeta de
// lealtad* over its name, *3 de 8*, a row of stamps, *8 sellos = una comida corrida*; then, when she has
// them, *2 premios por cobrar* (a tap opens *Tus premios en …*), *Vence el … si no vienes*, and on her page
// *Escanear* and *Mi código*. Wera Cocina draws the same card for the fonda (`cocina/src/ui/TarjetaDeLealtad.tsx`,
// its setup's preview and its screen): the same colour, the same stamps, the same words.
// ⚠️ IT DECIDES NOTHING: every word is `@/lib/tarjeta`'s (`vistaDe`, `premiosTexto`). Nothing here is read
// from the network but the logo (`@/ui/Foto`, from memory).
// ⚠️ `11.8-ii`: A NEW STAMP LANDS (*El sello cae*) — the stamps beyond the count she last saw on this card
// (`@/lib/useSellosNuevos`, kept on her phone per card), on whichever screen shows it next, in front, once its row
// is on screen: her scan of the kitchen's code, *Mi código* while the kitchen scans it, the kitchen's page when she
// scrolls to it — its place empty until then. NO CHECK CAN SEE THIS CARD (ADR-035 §2.11): the phone is its instrument.
// ============================================================================

export function TarjetaDeLealtad({
  vista,
  onPremios,
  onEscanear,
  onMiCodigo,
}: {
  vista: VistaDeTarjeta;
  /** *2 premios por cobrar* opens her rewards there — none, the row is not a button. */
  onPremios?: () => void;
  /** On her page: *Escanear* and *Mi código* under the card (the page's `kca`). */
  onEscanear?: () => void;
  onMiCodigo?: () => void;
}) {
  const hue = HUES[vista.color];
  const claro = 'rgba(255, 255, 255, 0.82)';
  const premios = premiosTexto(vista.premios);
  const fila = useRef<View>(null);
  const nuevos = useSellosNuevos(vista.cocinaId, vista.sellos, fila);
  return (
    <View style={{ backgroundColor: hue, borderRadius: ESQUINA.hoja, padding: SIZE.space + 2, gap: SIZE.space }}>
      <View
        accessible
        accessibilityLabel={ES.tarjeta.ayuda(vista.nombre, vista.sellos, vista.de, enFrase(vista.premio))}
        style={{ gap: SIZE.space }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: SIZE.rowGap + 2 }}>
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              overflow: 'hidden',
              borderWidth: 2,
              borderColor: 'rgba(255, 255, 255, 0.55)',
              backgroundColor: hue,
            }}
          >
            <Iniciales nombre={vista.nombre} color={vista.color} size={44} />
            <Foto path={vista.logo} cocinaId={vista.cocinaId} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: SIZE.bodySize, ...TITULO, color: PALETTE.superficie }}>{ES.tarjeta.nombre}</Text>
            <Text numberOfLines={1} style={{ fontSize: SIZE.smallSize, color: claro }}>
              {vista.nombre}
            </Text>
          </View>
          <Text style={{ fontSize: SIZE.bodySize, fontWeight: '800', color: PALETTE.superficie }}>{ES.tarjeta.cuenta(vista.sellos, vista.de)}</Text>
        </View>
        <View ref={fila} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {Array.from({ length: vista.de }, (_, i) => {
            // ⚠️ `11.8-ii`: a new stamp not yet on screen keeps its place empty, and lands there once it is.
            const lleno = i < vista.sellos && !(nuevos.desde !== null && !nuevos.cae && i >= nuevos.desde);
            return (
              <View
                key={i}
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 15,
                  alignItems: 'center',
                  justifyContent: 'center',
                  // ⚠️ `11.8-i`: a stamp is the Wera cow in its inked ring, pressed in white and turned by its place
                  // (`@/ui/Mostrador`'s `SelloVaca`, call 9); an empty place stays a thin ring.
                  borderWidth: lleno ? 0 : 1.5,
                  borderColor: 'rgba(255, 255, 255, 0.6)',
                }}
              >
                {lleno && (
                  <Cae cae={nuevos.cae && i >= (nuevos.desde ?? 0)}>
                    <SelloVaca i={i} tinta={PALETTE.superficie} />
                  </Cae>
                )}
              </View>
            );
          })}
        </View>
        <Text style={{ fontSize: SIZE.smallSize + 1, color: PALETTE.superficie }}>
          {ES.tarjeta.igual(vista.de, '')}
          <Text style={{ fontWeight: '800' }}>{enFrase(vista.premio)}</Text>
        </Text>
      </View>

      {premios !== null && (
        <Pressable
          accessibilityRole={onPremios === undefined ? undefined : 'button'}
          accessibilityLabel={`${premios.titulo}: ${premios.detalle}`}
          disabled={onPremios === undefined}
          onPress={onPremios}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            gap: SIZE.rowGap,
            padding: SIZE.rowGap + 2,
            borderRadius: ESQUINA.boton,
            backgroundColor: pressed ? 'rgba(255, 255, 255, 0.32)' : 'rgba(255, 255, 255, 0.2)',
          })}
        >
          <View style={{ width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: PALETTE.superficie }}>
            <MaterialCommunityIcons name="gift-outline" size={19} color={hue} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: SIZE.bodySize - 1, fontWeight: '800', color: PALETTE.superficie }}>{premios.titulo}</Text>
            <Text numberOfLines={1} style={{ fontSize: SIZE.smallSize, color: claro }}>
              {premios.detalle}
            </Text>
          </View>
          {onPremios !== undefined && <MaterialCommunityIcons name="chevron-right" size={20} color={PALETTE.superficie} />}
        </Pressable>
      )}

      {vista.condicion === null ? (
        vista.vence !== null && <Text style={{ fontSize: SIZE.smallSize - 1, color: claro }}>{vista.vence}</Text>
      ) : (
        // `10.9m`: her card's condition and its date as one quiet pair — without one, the card is exactly as before.
        <View style={{ gap: 2 }}>
          <Text style={{ fontSize: SIZE.smallSize - 1, color: claro }}>{vista.condicion}</Text>
          {vista.vence !== null && <Text style={{ fontSize: SIZE.smallSize - 1, color: claro }}>{vista.vence}</Text>}
        </View>
      )}
      {vista.cerradaHasta !== null && (
        <Text style={{ fontSize: SIZE.smallSize - 1, lineHeight: 17, color: claro }}>{ES.tarjeta.cerrada(vista.cerradaHasta)}</Text>
      )}

      {onEscanear !== undefined && onMiCodigo !== undefined && (
        <View style={{ flexDirection: 'row', gap: SIZE.rowGap }}>
          <View style={{ flex: 1 }}>
            <BotonLleno variante="discreto" icon="camera-outline" label={ES.tarjeta.escanear} onPress={onEscanear} />
          </View>
          <View style={{ flex: 1 }}>
            <BotonLleno variante="discreto" icon="qrcode" label={ES.tarjeta.miCodigo} onPress={onMiCodigo} />
          </View>
        </View>
      )}
    </View>
  );
}
