import MaterialCommunityIcons from '@/marca/Icono';
import { Redirect, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import { esDuena } from '@/api/equipo';
import { useElegirServicios, useKitchen, usePromociones, useServicios, useSuRol, useTerminarPromocion } from '@/api/hooks';
import type { PromotionRow } from '@/api/promociones';
import { useNota } from '@/lib/NotaProvider';
import { ICONO_DE_TIPO, activas, filaDe, seLeen } from '@/lib/promociones';
import { ES } from '@/strings';
import { PALETTE, SIZE } from '@/theme/palette';
import { AsiFunciona, useAsiFunciona } from '@/ui/AsiFunciona';
import { Banda } from '@/ui/Banda';
import { BotonLleno } from '@/ui/BotonLleno';
import { HojaConfirmar } from '@/ui/HojaConfirmar';
import { HojaPromocion } from '@/ui/HojaPromocion';
import { Llega } from '@/ui/Llega';

// ============================================================================
// *PROMOCIONES* — PROMOTIONS' ONE SCREEN. Plan task `10.9g-ii`, the owner's rulings of 2026-11-05 (calls 23–25) and
// G28–G30 of 2026-11-17, as the family-shell page draws stage 4 (`cPromos`). Its tile on *Hoy* opens it, as does
// *Lo que usas* while she uses them (the shell's rule: a service never lives in two places).
//   - *Así funciona* the first time (`PASOS_DE`), gone once she has made one — marked HERE, where it is drawn: the form's
//     copy of the phone's record is not this screen's — or when she closes it;
//   - *2 activas · hasta tres a la vez*; every promotion, the running first and newest first, then the last ten
//     that ended (the database's order) — each opening *Tu promoción* (`@/ui/HojaPromocion`);
//   - *Crear promoción* — or, with three running, *Tienes tres activas. Termina una para crear otra.* (G29);
//   - what a promotion is, against an offer; and *Dejar de usar promociones*.
// ⚠️ THE OWNER'S (G18): a helper never has its tile, and one who reaches it is sent to *Hoy*. Until her role is read,
// nothing of hers is drawn.
// ⚠️ *DEJAR DE USAR PROMOCIONES* ENDS THE RUNNING ONES (`0087`'s trigger on her choice turned off): with any running
// it asks first and offers no *Deshacer* — turning them back on would not bring an ended one back; with none, it is
// her numbers' way, *Deshacer* for 8 seconds.
// NO CHECK CAN SEE THIS SCREEN (ADR-035 §2.11): the phone is its instrument.
// ============================================================================

export default function Promociones() {
  const kitchen = useKitchen();
  const kitchenId = kitchen?.id ?? null;
  const rol = useSuRol(kitchenId).data;
  const duena = esDuena(rol);
  const servicios = useServicios(kitchenId);
  const promociones = usePromociones(kitchenId, { activa: duena && seLeen(servicios.data) });
  const { terminar, busy: terminando } = useTerminarPromocion(kitchenId);
  const { elegir, busy: quitando } = useElegirServicios(kitchenId);
  const { avisar } = useNota();
  const asi = useAsiFunciona(kitchenId ?? '', 'promociones');
  const [abierta, setAbierta] = useState<string | null>(null);
  const [preguntar, setPreguntar] = useState(false);
  const [problema, setProblema] = useState<string | null>(null);

  const volver = () => (router.canGoBack() ? router.back() : router.replace('/'));
  const banda = <Banda titulo={ES.promociones.titulo} antetitulo={kitchen?.displayName ?? null} volver={{ label: ES.promociones.volver, onPress: volver }} />;
  const quiet = { fontSize: SIZE.bodySize, color: PALETTE.tintaApagada } as const;

  const row = promociones.data;
  const corren = row === undefined ? [] : activas(row);
  // Her first made — here, on another phone, or undone since — *Así funciona* has done its work.
  const hecha = row !== undefined && row.promotions.length > 0;
  const { usado } = asi;
  useEffect(() => {
    if (hecha) usado();
  }, [hecha, usado]);
  // A helper's: never hers to make or end (G18). After every hook.
  if (rol !== undefined && !duena) return <Redirect href="/" />;

  const sinLeer = promociones.isError || promociones.fetchStatus === 'paused';
  const promocion = row?.promotions.find((p) => p.id === abierta) ?? null;

  async function dejar() {
    setProblema(null);
    const fallo = await elegir({ promociones: 'off' });
    if (fallo !== null) return fallo;
    setPreguntar(false);
    router.dismissTo('/');
    if (corren.length > 0) avisar(ES.promociones.dejadas);
    else avisar(ES.promociones.dejadas, () => elegir({ promociones: 'on' }), { hecho: ES.promociones.deshechoDejar, fallo: ES.promociones.noSeDeshizoDejar });
    return null;
  }

  function usarla(p: PromotionRow) {
    setAbierta(null);
    router.push({ pathname: '/nueva-promocion', params: { de: p.id } });
  }

  return (
    <View style={{ flex: 1, backgroundColor: PALETTE.fondo }}>
      {banda}
      <ScrollView contentContainerStyle={{ padding: SIZE.space * 1.5, paddingBottom: SIZE.space * 6, gap: SIZE.space * 1.5 }}>
        {asi.visible && kitchenId !== null && duena && (
          <Llega i={0}>
            <AsiFunciona servicio="promociones" onCerrar={asi.cerrar} />
          </Llega>
        )}

        {row !== undefined ? (
          <>
            {corren.length > 0 && <Text style={{ fontSize: SIZE.smallSize, color: PALETTE.tintaApagada }}>{ES.promociones.activas(corren.length)}</Text>}
            {row.promotions.length > 0 && (
              <Llega
                i={1}
                style={{ backgroundColor: PALETTE.superficie, borderWidth: 1, borderColor: PALETTE.linea, borderRadius: 16, overflow: 'hidden' }}
              >
                {row.promotions.map((p, i) => (
                  <Renglon key={p.id} promocion={p} primero={i === 0} onPress={() => setAbierta(p.id)} />
                ))}
              </Llega>
            )}
            <Llega i={2}>
              {row.running >= row.max ? (
                <View style={{ padding: SIZE.space, borderRadius: 14, borderWidth: 1, borderColor: PALETTE.linea, backgroundColor: PALETTE.superficie }}>
                  <Text style={{ fontSize: SIZE.bodySize - 1, lineHeight: 21, color: PALETTE.tinta }}>{ES.promociones.tresActivas}</Text>
                </View>
              ) : (
                <BotonLleno variante="principal" icon="plus" label={ES.promociones.crear} onPress={() => router.push('/nueva-promocion')} />
              )}
            </Llega>
            <Text style={{ fontSize: SIZE.smallSize, lineHeight: 19, color: PALETTE.tintaApagada }}>{ES.promociones.queEs}</Text>
          </>
        ) : sinLeer ? (
          <View style={{ gap: SIZE.space }}>
            <Text style={{ fontSize: SIZE.bodySize, color: PALETTE.tinta }}>{ES.promociones.sinLeer}</Text>
            <BotonLleno label={ES.promociones.otraVez} busy={promociones.isFetching} onPress={() => void promociones.refetch()} />
          </View>
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: SIZE.rowGap }}>
            <ActivityIndicator color={PALETTE.accion} />
            <Text style={quiet}>{ES.promociones.leyendo}</Text>
          </View>
        )}

        {problema !== null && <Text style={{ fontSize: SIZE.bodySize, fontWeight: '600', color: PALETTE.error }}>{problema}</Text>}
        {duena && row !== undefined && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={ES.promociones.dejar}
            accessibilityState={{ disabled: quitando }}
            disabled={quitando}
            onPress={() => {
              if (corren.length > 0) return setPreguntar(true);
              void dejar().then((fallo) => setProblema(fallo));
            }}
            style={({ pressed }) => ({ alignSelf: 'flex-start', minHeight: SIZE.tapTarget, justifyContent: 'center', opacity: pressed || quitando ? 0.6 : 1 })}
          >
            <Text style={{ fontSize: SIZE.bodySize - 1, fontWeight: '600', color: PALETTE.tintaApagada, textDecorationLine: 'underline' }}>
              {quitando && !preguntar ? ES.promociones.dejando : ES.promociones.dejar}
            </Text>
          </Pressable>
        )}
      </ScrollView>

      <HojaPromocion
        promocion={promocion}
        ocupado={terminando}
        onCerrar={() => setAbierta(null)}
        onUsarla={usarla}
        onTerminar={async (id) => {
          const que = promocion?.what ?? '';
          const fallo = await terminar(id);
          if (fallo !== null) return fallo;
          setAbierta(null);
          avisar(ES.promociones.terminaste(que));
          return null;
        }}
      />
      <HojaConfirmar
        visible={preguntar}
        titulo={ES.promociones.dejarTitulo}
        texto={ES.promociones.dejarTexto(corren.length)}
        confirmar={ES.promociones.dejarSi}
        confirmando={ES.promociones.dejando}
        cancelar={ES.promociones.dejarNo}
        ocupado={quitando}
        onCerrar={() => setPreguntar(false)}
        onConfirmar={dejar}
      />
    </View>
  );
}

/** One promotion: its kind's picture in terracotta, what, its days and end — or when it ended — and *Activa* or *Terminó*. */
function Renglon({ promocion, primero, onPress }: { promocion: PromotionRow; primero: boolean; onPress: () => void }) {
  const corre = promocion.state === 'activa';
  const detalle = filaDe(promocion);
  const estado = corre ? ES.promociones.activa : ES.promociones.termino;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${promocion.what}. ${detalle}. ${estado}`}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: SIZE.tapTarget + SIZE.rowGap,
        flexDirection: 'row',
        alignItems: 'center',
        gap: SIZE.space,
        padding: SIZE.space,
        borderTopWidth: primero ? 0 : 1,
        borderTopColor: PALETTE.linea,
        backgroundColor: pressed ? PALETTE.fondo : PALETTE.superficie,
      })}
    >
      <MaterialCommunityIcons name={ICONO_DE_TIPO[promocion.kind]} size={SIZE.iconSize} color={corre ? PALETTE.marca : PALETTE.tintaApagada} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ fontSize: SIZE.bodySize - 1, fontWeight: '600', color: PALETTE.tinta }}>{promocion.what}</Text>
        <Text style={{ fontSize: SIZE.smallSize - 0.6, lineHeight: 18, color: PALETTE.tintaApagada }}>{detalle}</Text>
      </View>
      <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, backgroundColor: corre ? PALETTE.accionSuave : PALETTE.banda }}>
        <Text style={{ fontSize: SIZE.smallSize - 1.6, fontWeight: '700', color: corre ? PALETTE.accion : PALETTE.tintaApagada }}>{estado}</Text>
      </View>
    </Pressable>
  );
}
