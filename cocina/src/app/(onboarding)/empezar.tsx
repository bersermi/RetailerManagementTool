import type { NombreIcono } from '@/marca/glifos';
import { Icono } from '@/ui/Icono';
import { router, type Href } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/auth/AuthProvider';
import { quienEntro } from '@/auth/quien';
import { ES } from '@/strings';
import { TITULO } from '@/theme/letra';
import { PALETTE, SIZE } from '@/theme/palette';
import { ESQUINA } from '@/theme/density';
import { Banda } from '@/ui/Banda';
import { Salidas } from '@/ui/Salidas';

// ============================================================================
// WHERE A LOGIN WITH NO KITCHEN LANDS: *¿QUÉ QUIERES HACER?* Plan task `10.9b-iii` — the first
// run's fork after her account (G32's first run, ruled 2026-11-17; the family-shell page's
// `ob-reg` and `ob-join`): *Registrar mi cocina* (her kitchen, her page and her offers — the three
// steps, `/registro`) or *Unirme a una cocina* (the code the kitchen gave her, `/unirme`). Nothing
// is chosen for her, and nothing is written here.
//
// ⚠️ THE GUARD SENDS EVERY LOGIN WITH NO KITCHEN HERE (`@/auth/guard`): a new fonda, a helper on
// her first day, a helper whose owner removed her, and a shop's owner with her Wera login — her
// shop stays Wera's. ⚠️ THE WAY OUT STAYS AT THE FOOT (`@/ui/Salidas`), as it stays on the form
// behind it: whoever signed in with the wrong account is never held here. NO CHECK CAN SEE THIS
// SCREEN (ADR-035 §2.11): the phone is its instrument.
// ============================================================================

export default function Empezar() {
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const quien = quienEntro(session?.user);

  return (
    <View style={{ flex: 1, backgroundColor: PALETTE.fondo }}>
      <Banda titulo={ES.empezar.titulo} antetitulo={ES.empezar.antetitulo} />
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: SIZE.space * 2,
          paddingTop: SIZE.space * 2,
          paddingBottom: SIZE.space * 2 + insets.bottom,
          gap: SIZE.space,
        }}
      >
        {quien !== null && <Text style={{ fontSize: SIZE.bodySize, color: PALETTE.tintaApagada }}>{ES.registro.quien(quien)}</Text>}
        <Opcion icono="storefront-outline" titulo={ES.empezar.registrar} detalle={ES.empezar.registrarDetalle} a="/registro" />
        <Opcion icono="account-group-outline" titulo={ES.empezar.unirme} detalle={ES.empezar.unirmeDetalle} a="/unirme" />
        <Salidas openKitchenId={null} />
      </ScrollView>
    </View>
  );
}

/** One of the two ways on: a card, its picture, what it is, a line under it, and the chevron. */
function Opcion({
  icono,
  titulo,
  detalle,
  a,
}: {
  icono: NombreIcono;
  titulo: string;
  detalle: string;
  a: Href;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${titulo}. ${detalle}`}
      onPress={() => router.push(a)}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: SIZE.space,
        minHeight: SIZE.tapTarget * 2,
        paddingHorizontal: SIZE.space * 1.5,
        paddingVertical: SIZE.space * 1.5,
        borderRadius: ESQUINA.boton,
        borderWidth: 1,
        borderColor: PALETTE.linea,
        backgroundColor: pressed ? PALETTE.accionSuave : PALETTE.superficie,
      })}
    >
      <View
        style={{
          width: 52,
          height: 52,
          borderRadius: 26,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: PALETTE.accionSuave,
        }}
      >
        <Icono name={icono} size={28} color={PALETTE.accion} />
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={{ fontSize: SIZE.bodySize + 2, ...TITULO, color: PALETTE.tinta }}>{titulo}</Text>
        <Text style={{ fontSize: SIZE.smallSize, color: PALETTE.tintaApagada }}>{detalle}</Text>
      </View>
      <Icono name="chevron-right" size={22} color={PALETTE.tintaApagada} />
    </Pressable>
  );
}
