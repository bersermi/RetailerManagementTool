import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { ComponentProps } from 'react';
import { Pressable, Text, View } from 'react-native';

import type { Apartado } from '@/api/apartados';
import type { Kitchen } from '@/api/cocinas';
import {
  QR_LADO,
  cambioDePlanesTexto,
  cocinaDe,
  comoLlegarDelApartado,
  faltaTexto,
  notaTexto,
  pagoTexto,
  pasaTexto,
  platoTexto,
} from '@/lib/apartados';
import { calleDe } from '@/lib/paginas';
import { ES } from '@/strings';
import { TITULO } from '@/theme/letra';
import { PALETTE, SIZE } from '@/theme/palette';
import { ESQUINA } from '@/theme/density';
import { Circulo } from '@/ui/Circulo';
import { CodigoQR } from '@/ui/CodigoQR';
import { Deslizar } from '@/ui/Deslizar';
import { Enlace } from '@/ui/Enlace';

// ============================================================================
// HER TICKET — EVERYTHING FOR THE COUNTER. Plan task `10.5b-iii-a`, the family-shell
// page's stage 2 (the owner's rulings of 2026-11-05): the kitchen and what she reserved;
// her code, large; *Pasa a las 17:45* and how long until then; how it is handed over and
// until when it is kept; what to pay and how — the method, never an account; where, with
// *Cómo llegar*; *Ya lo tengo* as a swipe; and *¿Cambio de planes?* — *Cancelar* until an
// hour before her hour, then *No voy a poder ir* (call 15). Every word is `@/lib/apartados`'.
//
// ⚠️ STATE FIRST (ADR-035 §2.8): the code and the hour lead; what she can do comes last.
// ⚠️⚠️ `10.9j-ii-a` (the owner's J2 of 2026-11-20): THE QR UNDER HER CODE — the seal the database made
// with her kitchen's secret (`0088`), which the kitchen's phone checks with no signal and hands over
// from (`10.9j-ii-b`); it carries her order, never her name. Always there while the database sealed it:
// scanning is quicker than typing. Black on white at the size a phone reads across a counter
// (`@/lib/apartados`' `QR_LADO`); drawn by `@/ui/CodigoQR`, as *Mi código* is. A ticket her phone kept carries it too
// (`@/lib/boletos`), so it shows with no signal.
// NO CHECK CAN SEE THIS SCREEN (§2.11): the phone is its instrument.
// ============================================================================


export function BoletoApartado({
  apartado,
  puerta,
  ahora,
  onYaLoTengo,
  onCambioDePlanes,
}: {
  apartado: Apartado;
  /** Her kitchen as the door sends it, while it does — for her circle and *Cómo llegar*. */
  puerta: Kitchen | undefined;
  ahora: Date;
  onYaLoTengo: () => void;
  onCambioDePlanes: () => void;
}) {
  const cocina = cocinaDe(apartado, puerta);
  const calle = calleDe(apartado.cocina.direccion);
  const llegar = comoLlegarDelApartado(apartado, puerta);
  const transferencia = apartado.pago === 'transferencia';

  return (
    <View
      style={{
        backgroundColor: PALETTE.superficie,
        borderRadius: ESQUINA.hoja,
        padding: SIZE.space * 1.25,
        gap: SIZE.space,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: SIZE.space }}>
        <Circulo cocina={cocina} size={44} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ fontSize: SIZE.bodySize, fontWeight: '700', color: PALETTE.tinta }}>{apartado.cocina.nombre}</Text>
          <Text style={{ fontSize: SIZE.smallSize, color: PALETTE.tintaApagada }}>{platoTexto(apartado)}</Text>
        </View>
      </View>

      <View style={{ alignItems: 'center', gap: SIZE.rowGap / 2 }}>
        <Text style={{ fontSize: SIZE.smallSize, fontWeight: '700', color: PALETTE.tintaApagada }}>{ES.apartados.tuCodigo}</Text>
        <Text
          accessibilityLabel={`${ES.apartados.tuCodigo}: ${apartado.codigo.split('').join(' ')}`}
          style={{ fontSize: 48, ...TITULO, letterSpacing: 8, color: PALETTE.tinta, fontVariant: ['tabular-nums'] }}
        >
          {apartado.codigo}
        </Text>
        <Text style={{ fontSize: SIZE.smallSize, color: PALETTE.tintaApagada }}>{ES.apartados.dilo[apartado.comer]}</Text>
      </View>

      {apartado.sello !== null && (
        <View style={{ alignItems: 'center', gap: SIZE.rowGap / 2 }}>
          <CodigoQR texto={apartado.sello} lado={QR_LADO} etiqueta={ES.apartados.qr.etiqueta(apartado.codigo)} />
          <Text style={{ fontSize: SIZE.smallSize, lineHeight: 19, color: PALETTE.tintaApagada, textAlign: 'center' }}>{ES.apartados.qr.nota}</Text>
        </View>
      )}

      <View style={{ gap: SIZE.rowGap / 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: SIZE.rowGap }}>
          <Text style={{ flexShrink: 1, fontSize: SIZE.titleSize - 4, ...TITULO, color: PALETTE.tinta }}>{pasaTexto(apartado.hora, ahora)}</Text>
          <Text style={{ fontSize: SIZE.smallSize, color: PALETTE.tintaApagada }}>{faltaTexto(apartado.hora, ahora)}</Text>
        </View>
        <Text style={{ fontSize: SIZE.smallSize, lineHeight: 19, color: PALETTE.tintaApagada }}>{notaTexto(apartado)}</Text>
      </View>

      <View style={{ gap: SIZE.rowGap / 2, padding: SIZE.space, borderRadius: ESQUINA.hoja, backgroundColor: PALETTE.accionSuave }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: SIZE.rowGap }}>
          <MaterialCommunityIcons name={iconoDePago(apartado.pago)} size={SIZE.iconSize - 4} color={PALETTE.accion} />
          <Text style={{ fontSize: SIZE.bodySize - 1, fontWeight: '700', color: PALETTE.accion }}>{ES.platillo.pago[apartado.pago]}</Text>
        </View>
        <Text style={{ fontSize: SIZE.bodySize - 1, lineHeight: 21, color: PALETTE.tinta }}>{pagoTexto(apartado)}</Text>
        {transferencia && (
          <>
            <Text style={{ fontSize: SIZE.bodySize - 1, color: PALETTE.tinta }}>
              {`${ES.apartados.concepto} `}
              <Text style={{ fontWeight: '700' }}>{ES.apartados.conceptoValor(apartado.codigo)}</Text>
            </Text>
            <Text style={{ fontSize: SIZE.smallSize, lineHeight: 19, color: PALETTE.tintaApagada }}>{ES.apartados.transferenciaNota}</Text>
          </>
        )}
      </View>

      {(calle !== null || apartado.cocina.indicaciones !== null) && (
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: SIZE.rowGap }}>
          <MaterialCommunityIcons name="map-marker-outline" size={SIZE.iconSize - 4} color={PALETTE.tintaApagada} style={{ marginTop: 1 }} />
          <View style={{ flex: 1, gap: 2 }}>
            {calle !== null && <Text style={{ fontSize: SIZE.bodySize - 1, color: PALETTE.tinta }}>{calle}</Text>}
            {apartado.cocina.indicaciones !== null && (
              <Text style={{ fontSize: SIZE.smallSize, lineHeight: 19, color: PALETTE.tintaApagada }}>{apartado.cocina.indicaciones}</Text>
            )}
          </View>
        </View>
      )}
      {llegar !== null && <Enlace texto={ES.pagina.comoLlegar} ayuda={ES.pagina.comoLlegarAyuda} url={llegar} />}

      <Deslizar
        texto={ES.apartados.desliza[apartado.comer]}
        ayuda={ES.apartados.deslizaAyuda}
        accion={ES.apartados.yaLoTengo}
        onListo={onYaLoTengo}
      />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={cambioDePlanesTexto(apartado, ahora)}
        onPress={onCambioDePlanes}
        hitSlop={SIZE.rowGap}
        style={({ pressed }) => ({ minHeight: SIZE.tapTarget - SIZE.rowGap, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.6 : 1 })}
      >
        <Text style={{ fontSize: SIZE.bodySize - 1, fontWeight: '600', color: PALETTE.tintaApagada }}>{cambioDePlanesTexto(apartado, ahora)}</Text>
      </Pressable>
    </View>
  );
}

function iconoDePago(pago: Apartado['pago']): ComponentProps<typeof MaterialCommunityIcons>['name'] {
  return pago === 'tarjeta' ? 'credit-card-outline' : pago === 'transferencia' ? 'bank-transfer' : 'cash';
}
