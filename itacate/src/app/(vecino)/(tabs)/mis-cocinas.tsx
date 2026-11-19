import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { apiErrorMessage } from '@/api/errors';
import type { Kitchen } from '@/api/cocinas';
import { useApartados, useCocinas, useSiguiendo, useTarjetas } from '@/api/hooks';
import type { MyCardRow } from '@/api/tarjeta';
import { useAuth } from '@/auth/AuthProvider';
import { leerLlave } from '@/lib/llave';
import { cocinaDeSeguida, detalleDe, fijadoDe, misCocinasDe, type FilaSeguida } from '@/lib/misCocinas';
import { deviceStore } from '@/lib/store';
import { ayudaDeTarjeta, bitsDeTarjeta, cocinaDeTarjeta, colorDeTarjeta, conPremios, hayTarjetas, porCocina } from '@/lib/tarjeta';
import { useAhora } from '@/lib/useAhora';
import { ES } from '@/strings';
import { HUES } from '@/theme/colores';
import { PALETTE, SIZE } from '@/theme/palette';
import { ApartadoFijado } from '@/ui/ApartadoFijado';
import { BotonLleno } from '@/ui/BotonLleno';
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
// `test/misCocinas.test.ts`. ⚠️ SINCE `10.9e-iii` THE LOYALTY CARD (G39, the page's `iMis`): *Escanear* and *Mi
// código* at its top — while some kitchen has a card she could start, or she holds one (`hayTarjetas`: with Wera's
// switch off, never) —, a row per kitchen where she has rewards (*2 premios por cobrar*, opening *Tus premios en …*),
// and in *Tus cocinas* the kitchens whose card she holds beside those she follows, with *5/8 · 2 premios*. Her
// cards are `my_cards`' (`useTarjetas`); the rules `@/lib/tarjeta`'s, pinned by `test/tarjetaVecina.test.ts`.
// NO CHECK CAN SEE THIS SCREEN (ADR-035 §2.11): the phone is its instrument.
// ============================================================================

/** The clock this screen reads — *Publicó hoy* at midnight, and the pinned reservation's hour. */
const CADA_MINUTO = 60_000;

export default function MisCocinas() {
  const siguiendo = useSiguiendo();
  const apartados = useApartados();
  const cocinas = useCocinas();
  const tarjetas = useTarjetas();
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  const ahora = useAhora(CADA_MINUTO);
  const [jalando, setJalando] = useState(false);

  async function refrescar() {
    setJalando(true);
    try {
      await Promise.all([siguiendo.refetch(), apartados.refetch(), tarjetas.refetch()]);
    } finally {
      setJalando(false);
    }
  }

  const fijado = fijadoDe(apartados.data, ahora);
  const { filas, seFueron } = misCocinasDe(siguiendo.data, ahora);
  const puertaDe = (id: string) => cocinas.data?.find((cocina) => cocina.id === id);
  const abrir = (id: string) => router.push({ pathname: '/cocina/[id]', params: { id } });
  const misTarjetas = porCocina(tarjetas.data);
  const seguidas = new Set(filas.map((fila) => fila.seguida.id));
  // The kitchens whose card she holds and does not follow — after those she follows, most recent first.
  const soloTarjeta = (tarjetas.data ?? []).filter((card) => !seguidas.has(card.id));
  const premios = conPremios(tarjetas.data);
  const conTarjeta = hayTarjetas(cocinas.data, tarjetas.data, userId !== null && leerLlave(deviceStore(), userId) !== null);
  // The head — *Escanear* and *Mi código*, her pinned reservation — arrives first, then each section after.
  const arriba = conTarjeta || fijado !== null;
  const desde = arriba ? 1 : 0;

  return (
    <View style={styles.pantalla}>
      <Cabeza titulo={ES.misCocinas.titulo}>
        <Text style={styles.detalle}>{conTarjeta ? ES.misCocinas.detalleConTarjeta : ES.misCocinas.detalle}</Text>
      </Cabeza>
      <ScrollView
        contentContainerStyle={styles.cuerpo}
        refreshControl={<RefreshControl refreshing={jalando} onRefresh={() => void refrescar()} tintColor={PALETTE.accion} />}
      >
        {arriba && (
          <Llega i={0} style={styles.seccion}>
            {conTarjeta && (
              <View style={styles.botones}>
                <View style={{ flex: 1 }}>
                  <BotonLleno icon="camera-outline" label={ES.tarjeta.escanear} onPress={() => router.push('/escanear')} />
                </View>
                <View style={{ flex: 1 }}>
                  <BotonLleno icon="qrcode" label={ES.tarjeta.miCodigo} onPress={() => router.push('/mi-codigo')} />
                </View>
              </View>
            )}
            {fijado !== null && (
              <ApartadoFijado
                fijado={fijado}
                puerta={puertaDe(fijado.apartado.cocina.id)}
                ahora={ahora}
                onPress={() => router.push('/apartados')}
              />
            )}
          </Llega>
        )}

        {premios.length > 0 && (
          <Llega i={desde} style={styles.seccion}>
            {premios.map((card) => (
              <RenglonPremios key={card.id} card={card} puerta={puertaDe(card.id) ?? null} />
            ))}
          </Llega>
        )}

        <Llega i={desde + 1} style={styles.seccion}>
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
          ) : filas.length === 0 && seFueron.length === 0 && soloTarjeta.length === 0 ? (
            <View style={styles.vacio}>
              <MaterialCommunityIcons name="heart-outline" size={44} color={PALETTE.linea} />
              <Text style={styles.vacioTitulo}>{ES.misCocinas.vacio}</Text>
              <Text style={styles.nota}>{conTarjeta ? ES.misCocinas.vacioDetalleConTarjeta : ES.misCocinas.vacioDetalle}</Text>
            </View>
          ) : (
            <Grupo>
              {filas.map((fila) => (
                <RenglonSeguida
                  key={fila.seguida.id}
                  fila={fila}
                  puerta={puertaDe(fila.seguida.id)}
                  tarjeta={bitsDeTarjeta(misTarjetas.get(fila.seguida.id))}
                  tarjetaAyuda={ayudaDeTarjeta(misTarjetas.get(fila.seguida.id))}
                  onPress={() => abrir(fila.seguida.id)}
                />
              ))}
              {soloTarjeta.map((card) => (
                <RenglonTarjeta key={card.id} card={card} puerta={puertaDe(card.id) ?? null} onPress={() => abrir(card.id)} />
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

        <Llega i={desde + 2}>
          <Grupo>
            <Fila icono="ticket-confirmation-outline" titulo={ES.misCocinas.anteriores} onPress={() => router.push('/apartados')} />
          </Grupo>
        </Llega>
      </ScrollView>
    </View>
  );
}

/** One kitchen she follows: her circle, her name, *Publicó hoy* or when she last did, her card's *5/8*, the bell. */
function RenglonSeguida({
  fila,
  puerta,
  tarjeta,
  tarjetaAyuda,
  onPress,
}: {
  fila: FilaSeguida;
  puerta: Parameters<typeof cocinaDeSeguida>[1] | undefined;
  tarjeta: string | null;
  /** The same in words a screen reader says. */
  tarjetaAyuda: string | null;
  onPress: () => void;
}) {
  const { seguida, publicoHoy } = fila;
  const detalle = detalleDe(fila);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[seguida.nombre, detalle, tarjetaAyuda, seguida.campana ? ES.misCocinas.conCampana : null].filter(Boolean).join(', ')}
      onPress={onPress}
      style={({ pressed }) => [styles.fila, { backgroundColor: pressed ? PALETTE.fondo : PALETTE.superficie }]}
    >
      <Circulo cocina={cocinaDeSeguida(seguida, puerta ?? null)} size={36} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.nombre}>{seguida.nombre}</Text>
        <Text style={styles.linea}>
          <Text style={publicoHoy ? styles.publicoHoy : undefined}>{detalle}</Text>
          {tarjeta !== null && ` · ${tarjeta}`}
        </Text>
      </View>
      {seguida.campana && <MaterialCommunityIcons name="bell" size={16} color={PALETTE.tintaApagada} />}
      <MaterialCommunityIcons name="chevron-right" size={20} color={PALETTE.tintaApagada} />
    </Pressable>
  );
}

/** A kitchen whose card she holds and does not follow: its circle, its name, *5/8 · 2 premios*. */
function RenglonTarjeta({ card, puerta, onPress }: { card: MyCardRow; puerta: Kitchen | null; onPress: () => void }) {
  const linea = bitsDeTarjeta(card) ?? card.colonia ?? '';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[card.name, ayudaDeTarjeta(card) ?? card.colonia].filter(Boolean).join(', ')}
      onPress={onPress}
      style={({ pressed }) => [styles.fila, { backgroundColor: pressed ? PALETTE.fondo : PALETTE.superficie }]}
    >
      <Circulo cocina={cocinaDeTarjeta(card, puerta)} size={36} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.nombre}>{card.name}</Text>
        {linea !== '' && <Text style={styles.linea}>{linea}</Text>}
      </View>
      <MaterialCommunityIcons name="chevron-right" size={20} color={PALETTE.tintaApagada} />
    </Pressable>
  );
}

/** *2 premios por cobrar* at a kitchen (the page's `rwrow`): a gift on its colour, opening *Tus premios en …*. */
function RenglonPremios({ card, puerta }: { card: MyCardRow; puerta: Kitchen | null }) {
  const hue = HUES[colorDeTarjeta(card, puerta)];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${ES.tarjeta.premios(card.rewards.length)}, ${card.name}`}
      onPress={() => router.push({ pathname: '/premios/[cocina]', params: { cocina: card.id } })}
      style={({ pressed }) => [styles.premios, { backgroundColor: pressed ? PALETTE.fondo : PALETTE.superficie }]}
    >
      <View style={[styles.regalo, { backgroundColor: hue }]}>
        <MaterialCommunityIcons name="gift-outline" size={20} color={PALETTE.superficie} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.nombre}>{ES.tarjeta.premios(card.rewards.length)}</Text>
        <Text style={styles.linea}>{card.name}</Text>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={20} color={PALETTE.tintaApagada} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: PALETTE.fondo },
  detalle: { fontSize: SIZE.smallSize, color: PALETTE.tintaApagada },
  // ⚠️ `flexGrow: 1`: on Android a pull is heard only when the content fills the screen (found on the emulator).
  cuerpo: { flexGrow: 1, padding: SIZE.space * 1.5, paddingBottom: SIZE.space * 3, gap: SIZE.space * 1.5 },
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
  botones: { flexDirection: 'row', gap: SIZE.rowGap },
  premios: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZE.space,
    padding: SIZE.space,
    borderRadius: SIZE.space,
    borderWidth: 1,
    borderColor: PALETTE.linea,
  },
  regalo: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
});
