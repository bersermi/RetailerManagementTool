import { router } from 'expo-router';
import { ActivityIndicator, Text, View } from 'react-native';

import { useElegirServicios, useServicios } from '@/api/hooks';
import { construidos, detalleDe, filasDe, hayLoQueUsas, menuDe } from '@/lib/loQueUsas';
import { useNota } from '@/lib/NotaProvider';
import { ES } from '@/strings';
import { letraEncabezado } from '@/theme/letra';
import { PALETTE, SIZE } from '@/theme/palette';
import { BotonLleno } from '@/ui/BotonLleno';
import { FilaMenu, FilaServicio } from '@/ui/FilaServicio';
import { Grupo } from '@/ui/Grupo';
import { Llega } from '@/ui/Llega';

// ============================================================================
// *MI COCINA › LO QUE USAS* — AT ITS TOP. Plan task `10.9a-ii`, the owner's rulings of
// 2026-11-16 and 17 (arrangement A; G33 named the section; G44): each feature Wera offers and
// this build carries, with its state (`@/lib/loQueUsas`' `filasDe`); off, a tap opens *Activar*
// (`/activar/[servicio]`); on, its own screen once its row builds one. *Tu menú · Próximamente*
// with *Me interesa*, which writes `interesada` — and a Discord line naming nobody, the
// database's — then *Anotado*, while every *Próximamente* may show.
//
// ⚠️ NOTHING TO DRAW, NOTHING DRAWN: with every switch off and no feature built (today) the
// section is absent. ⚠️ `unknown` IS NOT `none`: unread or failed, it says so only when this build
// carries a feature — else the menu's row alone could follow, and an empty section would flash.
// ⚠️ IT DRAWS ITS OWN ENTRANCE (`i`), so an absent section leaves no gap at the top of *Mi cocina*.
// ============================================================================

export function LoQueUsas({ kitchenId, i }: { kitchenId: string; i: number }) {
  const servicios = useServicios(kitchenId);
  const { elegir, busy } = useElegirServicios(kitchenId);
  const { avisar } = useNota();

  const seccion = { ...letraEncabezado(SIZE), color: PALETTE.tinta } as const;
  const titulo = <Text style={seccion}>{ES.loQueUsas.titulo}</Text>;

  if (servicios.data === undefined) {
    if (construidos().length === 0) return null;
    return (
      <Llega i={i} style={{ gap: SIZE.rowGap }}>
        {titulo}
        {servicios.isError ? (
          <>
            <Text style={{ fontSize: SIZE.bodySize, color: PALETTE.tinta }}>{ES.queMas.sinLeer}</Text>
            <BotonLleno label={ES.queMas.otraVez} busy={servicios.isFetching} onPress={() => void servicios.refetch()} />
          </>
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: SIZE.rowGap }}>
            <ActivityIndicator color={PALETTE.accion} />
            <Text style={{ fontSize: SIZE.bodySize, color: PALETTE.tintaApagada }}>{ES.queMas.leyendo}</Text>
          </View>
        )}
      </Llega>
    );
  }
  if (!hayLoQueUsas(servicios.data)) return null;

  const menu = menuDe(servicios.data);
  async function meInteresa() {
    const problema = await elegir({ menu: 'interesada' });
    avisar(problema ?? ES.loQueUsas.gracias);
  }

  return (
    <Llega i={i} style={{ gap: SIZE.rowGap }}>
      {titulo}
      <Grupo>
        {filasDe(servicios.data).map((fila) => {
          const abre = fila.abre;
          return (
            <FilaServicio
              key={fila.servicio}
              servicio={fila.servicio}
              detalle={detalleDe(fila)}
              usa={fila.usa}
              onPress={
                !fila.usa
                  ? () => router.push({ pathname: '/activar/[servicio]', params: { servicio: fila.servicio } })
                  : abre !== null
                    ? () => router.push(abre)
                    : undefined
              }
            />
          );
        })}
        {menu !== null && <FilaMenu anotado={menu.anotado} busy={busy} onInteresa={() => void meInteresa()} />}
      </Grupo>
    </Llega>
  );
}
