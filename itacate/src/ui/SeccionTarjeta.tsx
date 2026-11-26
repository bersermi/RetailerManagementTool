import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import type { Kitchen } from '@/api/cocinas';
import { useTarjetas } from '@/api/hooks';
import { colorOf } from '@/api/pagina';
import { condicionesDeCocina, enFrase, vistaDe } from '@/lib/tarjeta';
import { ES } from '@/strings';
import { HUES } from '@/theme/colores';
import { letraEncabezado } from '@/theme/letra';
import { PALETTE, SIZE } from '@/theme/palette';
import { BotonLleno } from '@/ui/BotonLleno';
import { Circulo } from '@/ui/Circulo';
import { TarjetaDeLealtad } from '@/ui/TarjetaDeLealtad';

// ============================================================================
// *TARJETA DE LEALTAD* ON A KITCHEN'S PAGE. Plan task `10.9e-iii`, the family-shell page's `kcardSec` (G12,
// G41): HER CARD there, in the kitchen's colour and logo, with *Escanear* and *Mi código*; else, while the
// kitchen has a card a first stamp could start (the door's `card`), ITS INVITATION — *Junta 8 sellos y te dan
// una comida corrida*, *Tu primer sello, en la cocina: escanea su código* — with its *Condiciones*, the kitchen
// named as the one who promises, opened under it. Else nothing.
// ⚠️ THE ROUTE HANDS IT TO `@/ui/PaginaDeCocina` (its `tarjeta` slot), so the page still reads nothing and Wera
// Cocina's copy of the page carries the slot empty. ⚠️ A KITCHEN QUIET FOR TWO WEEKS IS NOT IN THE DOOR, so its
// page shows no invitation — her first stamp at its counter still works (the row's note). ⚠️ The invitation
// carries *Escanear* and *Mi código* too — the drawing puts them on her card only; at the counter the poster's
// QR opens this page, and her first stamp needs one of the two (decided on his behalf, `10.9e-iii`).
// NO CHECK CAN SEE THIS SECTION (ADR-035 §2.11): the phone is its instrument.
// ============================================================================

export function SeccionTarjeta({ cocina }: { cocina: Kitchen }) {
  const tarjetas = useTarjetas();
  const [condiciones, setCondiciones] = useState(false);
  const mia = tarjetas.data?.find((card) => card.id === cocina.id);
  const vista = mia === undefined ? null : vistaDe(mia, cocina);
  const terminos = condicionesDeCocina(cocina);
  if (vista === null && (terminos === null || cocina.tarjeta === null)) return null;

  const hue = HUES[colorOf(cocina.page, cocina.giro)];
  const escanear = () => router.push({ pathname: '/escanear', params: { cocina: cocina.id } });
  const miCodigo = () => router.push('/mi-codigo');
  const titulo = { ...letraEncabezado(SIZE), color: PALETTE.tinta } as const;

  return (
    <View style={{ gap: SIZE.rowGap }}>
      <Text accessibilityRole="header" style={titulo}>
        {ES.tarjeta.nombre}
      </Text>
      {vista !== null ? (
        <TarjetaDeLealtad
          vista={vista}
          onPremios={() => router.push({ pathname: '/premios/[cocina]', params: { cocina: cocina.id } })}
          onEscanear={escanear}
          onMiCodigo={miCodigo}
        />
      ) : (
        cocina.tarjeta !== null && (
          <View
            style={{
              gap: SIZE.rowGap,
              padding: SIZE.space,
              borderRadius: SIZE.space,
              borderWidth: 1.5,
              borderColor: hue,
              backgroundColor: PALETTE.superficie,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: SIZE.space }}>
              <Circulo cocina={cocina} size={44} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ fontSize: SIZE.bodySize, fontWeight: '700', color: PALETTE.tinta }}>
                  {ES.tarjeta.invitacion(cocina.tarjeta.sellos, enFrase(cocina.tarjeta.premio))}
                </Text>
                <Text style={{ fontSize: SIZE.smallSize, color: PALETTE.tintaApagada }}>{ES.tarjeta.invitacionDetalle}</Text>
              </View>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: condiciones }}
              onPress={() => setCondiciones((antes) => !antes)}
              hitSlop={SIZE.rowGap}
              style={{ alignSelf: 'flex-start', minHeight: SIZE.tapTarget - 8, justifyContent: 'center' }}
            >
              <Text style={{ fontSize: SIZE.smallSize, fontWeight: '700', color: hue }}>
                {condiciones ? ES.tarjeta.ocultar : ES.tarjeta.condiciones}
              </Text>
            </Pressable>
            {condiciones && terminos !== null && (
              <Text style={{ fontSize: SIZE.smallSize, lineHeight: 19, color: PALETTE.tinta }}>{terminos}</Text>
            )}
            <View style={{ flexDirection: 'row', gap: SIZE.rowGap }}>
              <View style={{ flex: 1 }}>
                <BotonLleno icon="camera-outline" label={ES.tarjeta.escanear} onPress={escanear} />
              </View>
              <View style={{ flex: 1 }}>
                <BotonLleno icon="qrcode" label={ES.tarjeta.miCodigo} onPress={miCodigo} />
              </View>
            </View>
          </View>
        )
      )}
    </View>
  );
}
