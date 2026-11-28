import { Icono } from '@/ui/Icono';
import { router } from 'expo-router';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';

import { useApartados, useCocinas, useTarjetas } from '@/api/hooks';
import { useAuth } from '@/auth/AuthProvider';
import { leerLlave } from '@/lib/llave';
import { deviceStore } from '@/lib/store';
import { cocinaDeTarjeta, hayTarjetas, loQueVenDe } from '@/lib/tarjeta';
import { ES } from '@/strings';
import { PALETTE, SIZE } from '@/theme/palette';
import { ESQUINA } from '@/theme/density';
import { Banda } from '@/ui/Banda';
import { Circulo } from '@/ui/Circulo';
import { Llega } from '@/ui/Llega';

// ============================================================================
// *LO QUE CADA COCINA VE DE TI*, FROM *TÚ*. Plan task `10.9e-iii` (G42, the family-shell page's `iVe`): each
// kitchen where she reserved in her last 30 days or holds a card, and what reaches it of her TODAY — her name
// when she reserves, gets a stamp or claims; her score when she reserves; her stamps and rewards there when she
// shows her code or scans its; following, only a count; where she is, nothing (`@/lib/tarjeta`'s `loQueVenDe`).
// ⚠️ `10.9f`: and her visits in its *Tus números*, counts with no name — said of every kitchen: its owner's
// database read answers whether or not she chose them.
// ⚠️ WORDED AS WHAT IS TRUE TODAY, WITH NO *NUNCA* ABOUT FOLLOWING — his words: *"don't make strict the 'never
// that she follows it' in case we wan't to enable it in the future"*. NO CHECK CAN SEE THIS SCREEN (ADR-035 §2.11).
// ============================================================================

export default function LoQueVen() {
  const apartados = useApartados();
  const tarjetas = useTarjetas();
  const cocinas = useCocinas();
  const listas = apartados.data !== undefined && tarjetas.data !== undefined;
  const kitchens = loQueVenDe(apartados.data, tarjetas.data);
  // With Wera's switch off nothing of the card is named — not even *juntas sellos* (the review of `10.9e-iii`).
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  const conTarjeta = hayTarjetas(cocinas.data, tarjetas.data, userId !== null && leerLlave(deviceStore(), userId) !== null);
  const volver = () => (router.canGoBack() ? router.back() : router.replace('/tu'));

  return (
    <View style={{ flex: 1, backgroundColor: PALETTE.fondo }}>
      <Banda titulo={ES.loQueVen.titulo} volver={{ label: ES.loQueVen.volver, onPress: volver }} />
      <ScrollView contentContainerStyle={{ padding: SIZE.space * 1.5, paddingBottom: SIZE.space * 6, gap: SIZE.space }}>
        <Text style={{ fontSize: SIZE.bodySize, lineHeight: 22, color: PALETTE.tintaApagada }}>{conTarjeta ? ES.loQueVen.detalleConTarjeta : ES.loQueVen.detalle}</Text>
        {!listas ? (
          <View style={{ alignItems: 'center', paddingVertical: SIZE.space * 2 }}>
            <ActivityIndicator color={PALETTE.accion} />
          </View>
        ) : kitchens.length === 0 ? (
          <View style={{ gap: SIZE.rowGap, padding: SIZE.space * 1.5, borderRadius: ESQUINA.hoja, backgroundColor: PALETTE.superficie }}>
            <Text style={{ fontSize: SIZE.bodySize, fontWeight: '700', color: PALETTE.tinta }}>{conTarjeta ? ES.loQueVen.ningunaConTarjeta : ES.loQueVen.ninguna}</Text>
            <Text style={{ fontSize: SIZE.smallSize, lineHeight: 19, color: PALETTE.tintaApagada }}>{ES.loQueVen.ningunaDetalle}</Text>
          </View>
        ) : (
          kitchens.map((k, n) => {
            const card = tarjetas.data?.find((c) => c.id === k.id);
            const puerta = cocinas.data?.find((c) => c.id === k.id) ?? null;
            const circulo = puerta ?? (card === undefined ? null : cocinaDeTarjeta(card, null));
            return (
              <Llega
                key={k.id}
                i={n}
                style={{ gap: SIZE.rowGap, padding: SIZE.space, borderRadius: ESQUINA.hoja, backgroundColor: PALETTE.superficie }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: SIZE.rowGap + 2 }}>
                  {circulo !== null && <Circulo cocina={circulo} size={32} />}
                  <Text style={{ flex: 1, fontSize: SIZE.bodySize, fontWeight: '700', color: PALETTE.tinta }}>{k.nombre}</Text>
                </View>
                {k.lineas.map((linea) => (
                  <View key={linea} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: SIZE.rowGap }}>
                    <Icono name={iconoDe(linea)} size={17} color={PALETTE.tintaApagada} style={{ marginTop: 1 }} />
                    <Text style={{ flex: 1, fontSize: SIZE.smallSize + 0.5, lineHeight: 19, color: PALETTE.tinta }}>{linea}</Text>
                  </View>
                ))}
              </Llega>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

/** Each line's glyph, as the drawing puts one beside each (`vl`). */
function iconoDe(linea: string): 'account-outline' | 'thumb-up-outline' | 'stamper' | 'chart-bar' | 'heart-outline' | 'map-marker-off-outline' {
  const L = ES.loQueVen;
  if (linea === L.calificacion) return 'thumb-up-outline';
  if (linea === L.sellos) return 'stamper';
  if (linea === L.cuentas) return 'chart-bar';
  if (linea === L.sigues) return 'heart-outline';
  if (linea === L.ubicacion) return 'map-marker-off-outline';
  return 'account-outline';
}
