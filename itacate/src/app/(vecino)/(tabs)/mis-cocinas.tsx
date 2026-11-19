import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { apiErrorMessage } from '@/api/errors';
import { useApartados, useCocinas, useSiguiendo } from '@/api/hooks';
import { cocinaDeSeguida, detalleDe, fijadoDe, misCocinasDe, type FilaSeguida } from '@/lib/misCocinas';
import { useAhora } from '@/lib/useAhora';
import { ES } from '@/strings';
import { PALETTE, SIZE } from '@/theme/palette';
import { ApartadoFijado } from '@/ui/ApartadoFijado';
import { Cabeza } from '@/ui/Cabeza';
import { Circulo } from '@/ui/Circulo';
import { Fila } from '@/ui/Fila';
import { Grupo } from '@/ui/Grupo';
import { Llega } from '@/ui/Llega';

// ============================================================================
// *MIS COCINAS*, THE SECOND TAB. Plan task `10.9d-ii`, the owner's rulings G21–G23 and G39 of
// 2026-11-17, as the family-shell page draws stage 3 (`iMis`): her reservation pinned at the head
// while one lasts (`@/ui/ApartadoFijado` — the tab's dot says so from anywhere); *Tus cocinas*, the
// kitchens she follows, each with her circle, her name, *Publicó hoy* in the drawing's red for what is
// live (`--pe`, our `PALETTE.error`'s value) or when she last did, and the bell when she rings it; a kitchen that left as *dejó Itacate* for 30 days;
// and *Tus apartados anteriores* at the foot, opening *Apartados*. With none followed: *Sigue una
// cocina desde su página*.
//
// ⚠️ WHAT IT LISTS IS `my_follows`' (`useSiguiendo`), never the door's: a kitchen quiet for two
// weeks is still hers. A row opens the kitchen's page — her full page while the door sends her,
// else a page of its own (`(vecino)/cocina/[id]`). The rules are `@/lib/misCocinas`', pinned by
// `test/misCocinas.test.ts`. ⚠️ `10.9e` adds the loyalty card here (*Escanear*, *Mi código*, her
// stamps and rewards, the kitchens whose card she holds); until then the head says *Las que sigues*.
// NO CHECK CAN SEE THIS SCREEN (ADR-035 §2.11): the phone is its instrument.
// ============================================================================

/** The clock this screen reads — *Publicó hoy* at midnight, and the pinned reservation's hour. */
const CADA_MINUTO = 60_000;

export default function MisCocinas() {
  const siguiendo = useSiguiendo();
  const apartados = useApartados();
  const cocinas = useCocinas();
  const ahora = useAhora(CADA_MINUTO);
  const [jalando, setJalando] = useState(false);

  async function refrescar() {
    setJalando(true);
    try {
      await Promise.all([siguiendo.refetch(), apartados.refetch()]);
    } finally {
      setJalando(false);
    }
  }

  const fijado = fijadoDe(apartados.data, ahora);
  const { filas, seFueron } = misCocinasDe(siguiendo.data, ahora);
  const puertaDe = (id: string) => cocinas.data?.find((cocina) => cocina.id === id);
  const abrir = (id: string) => router.push({ pathname: '/cocina/[id]', params: { id } });

  return (
    <View style={styles.pantalla}>
      <Cabeza titulo={ES.misCocinas.titulo}>
        <Text style={styles.detalle}>{ES.misCocinas.detalle}</Text>
      </Cabeza>
      <ScrollView
        contentContainerStyle={styles.cuerpo}
        refreshControl={<RefreshControl refreshing={jalando} onRefresh={() => void refrescar()} tintColor={PALETTE.accion} />}
      >
        {fijado !== null && (
          <Llega i={0}>
            <ApartadoFijado
              fijado={fijado}
              puerta={puertaDe(fijado.apartado.cocina.id)}
              ahora={ahora}
              onPress={() => router.push('/apartados')}
            />
          </Llega>
        )}

        <Llega i={fijado === null ? 0 : 1} style={styles.seccion}>
          <Text style={styles.titulo}>{ES.misCocinas.tusCocinas}</Text>
          {siguiendo.data === undefined ? (
            <View style={styles.centro}>
              {siguiendo.isError ? (
                <Text style={styles.nota}>{apiErrorMessage(siguiendo.error)}</Text>
              ) : (
                <>
                  <ActivityIndicator color={PALETTE.accion} />
                  <Text style={styles.nota}>{ES.misCocinas.cargando}</Text>
                </>
              )}
            </View>
          ) : filas.length === 0 && seFueron.length === 0 ? (
            <View style={styles.vacio}>
              <MaterialCommunityIcons name="heart-outline" size={44} color={PALETTE.linea} />
              <Text style={styles.vacioTitulo}>{ES.misCocinas.vacio}</Text>
              <Text style={styles.nota}>{ES.misCocinas.vacioDetalle}</Text>
            </View>
          ) : (
            <Grupo>
              {filas.map((fila) => (
                <RenglonSeguida key={fila.seguida.id} fila={fila} puerta={puertaDe(fila.seguida.id)} onPress={() => abrir(fila.seguida.id)} />
              ))}
              {seFueron.map((seFue) => (
                <View key={seFue.id} style={styles.fila} accessible accessibilityLabel={`${seFue.nombre}, ${ES.misCocinas.dejoItacate}`}>
                  <View style={styles.circuloIdo}>
                    <MaterialCommunityIcons name="store-off-outline" size={18} color={PALETTE.tintaApagada} />
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={[styles.nombre, { color: PALETTE.tintaApagada }]}>{seFue.nombre}</Text>
                    <Text style={styles.linea}>{ES.misCocinas.dejoItacate}</Text>
                  </View>
                </View>
              ))}
            </Grupo>
          )}
        </Llega>

        <Llega i={fijado === null ? 1 : 2}>
          <Grupo>
            <Fila icono="ticket-confirmation-outline" titulo={ES.misCocinas.anteriores} onPress={() => router.push('/apartados')} />
          </Grupo>
        </Llega>
      </ScrollView>
    </View>
  );
}

/** One kitchen she follows: her circle, her name, *Publicó hoy* or when she last did, the bell. */
function RenglonSeguida({ fila, puerta, onPress }: { fila: FilaSeguida; puerta: Parameters<typeof cocinaDeSeguida>[1] | undefined; onPress: () => void }) {
  const { seguida, publicoHoy } = fila;
  const detalle = detalleDe(fila);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[seguida.nombre, detalle, seguida.campana ? ES.misCocinas.conCampana : null].filter(Boolean).join(', ')}
      onPress={onPress}
      style={({ pressed }) => [styles.fila, { backgroundColor: pressed ? PALETTE.fondo : PALETTE.superficie }]}
    >
      <Circulo cocina={cocinaDeSeguida(seguida, puerta ?? null)} size={36} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.nombre}>{seguida.nombre}</Text>
        <Text style={[styles.linea, publicoHoy && styles.publicoHoy]}>{detalle}</Text>
      </View>
      {seguida.campana && <MaterialCommunityIcons name="bell" size={16} color={PALETTE.tintaApagada} />}
      <MaterialCommunityIcons name="chevron-right" size={20} color={PALETTE.tintaApagada} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: PALETTE.fondo },
  detalle: { fontSize: SIZE.smallSize, color: PALETTE.tintaApagada },
  cuerpo: { padding: SIZE.space * 1.5, paddingBottom: SIZE.space * 3, gap: SIZE.space * 1.5 },
  seccion: { gap: SIZE.rowGap },
  titulo: { fontSize: SIZE.smallSize, fontWeight: '700', color: PALETTE.tintaApagada },
  centro: { alignItems: 'center', gap: SIZE.space, paddingVertical: SIZE.space * 2 },
  nota: { fontSize: SIZE.smallSize, lineHeight: 19, color: PALETTE.tintaApagada, textAlign: 'center' },
  vacio: {
    alignItems: 'center',
    gap: SIZE.rowGap,
    paddingVertical: SIZE.space * 2,
    paddingHorizontal: SIZE.space,
    borderRadius: SIZE.space,
    borderWidth: 1,
    borderColor: PALETTE.linea,
    backgroundColor: PALETTE.superficie,
  },
  vacioTitulo: { fontSize: SIZE.bodySize, fontWeight: '700', color: PALETTE.tinta, textAlign: 'center' },
  fila: { flexDirection: 'row', alignItems: 'center', gap: SIZE.space, minHeight: SIZE.tapTarget + SIZE.rowGap, paddingHorizontal: SIZE.space, paddingVertical: SIZE.rowGap },
  circuloIdo: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: PALETTE.linea,
    backgroundColor: PALETTE.fondo,
  },
  nombre: { fontSize: SIZE.bodySize - 1, fontWeight: '600', color: PALETTE.tinta },
  linea: { fontSize: SIZE.smallSize, color: PALETTE.tintaApagada },
  publicoHoy: { fontWeight: '700', color: PALETTE.error },
});
