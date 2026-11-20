import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Keyboard, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { esDuena } from '@/api/equipo';
import { newPicturePath, NINGUNA, porSubir } from '@/api/fotos';
import { useCrearPromocion, useDeshacerPromocion, useKitchen, usePlace, usePromociones, useSuRol } from '@/api/hooks';
import { CONDICIONES_MAX, DIAS, LO_QUE_MAX, MAS_MAX, createArgs, type Dia, type Tipo } from '@/api/promociones';
import { elegirFoto, tomarFoto } from '@/lib/foto';
import { newId } from '@/lib/ids';
import { useNota } from '@/lib/NotaProvider';
import {
  HASTAS,
  ICONO_DE_TIPO,
  NUEVO,
  bandaDe,
  borradorDe,
  condicionesDelBorrador,
  conSuDia,
  dentroDelPlazo,
  envioDe,
  hastaDelBorrador,
  hoyDe,
  marcaDe,
  revisar,
  sonTodos,
  temporadaDe,
  tiposDe,
  tocarDia,
  type Borrador,
} from '@/lib/promociones';
import { direccionCorta } from '@/lib/tarjeta';
import { useAhora } from '@/lib/useAhora';
import { ES } from '@/strings';
import { PALETTE, SIZE } from '@/theme/palette';
import { Banda } from '@/ui/Banda';
import { BandaPromocion, MarcaPromocion } from '@/ui/BandaPromocion';
import { BotonLleno } from '@/ui/BotonLleno';
import { Calendario } from '@/ui/Calendario';
import { Campo } from '@/ui/Campo';
import { CampoFoto } from '@/ui/CampoFoto';
import { Formulario } from '@/ui/Formulario';

// ============================================================================
// *NUEVA PROMOCIÓN* — THE FORM, TOP TO BOTTOM (the family-shell page's `promoForm` and its section *Crear promoción*).
// Plan task `10.9g-ii`, the owner's rulings of 2026-11-05 (calls 23–25) and G28 of 2026-11-17, on `0087`'s
// `create_promotion` (`@/api/promociones`):
//   - *¿Qué tipo?* — four tiles, each giving the mark neighbours see; *Para tus clientes* only while her card is open
//     (`card_open`, G28), marked *Con tu tarjeta de lealtad*;
//   - *¿Qué ofreces?* (40) — for *De temporada* the season's dishes as a hint, never a default; *Cuéntales más* (80);
//     a photo, from the same camera as her dishes' (`10.5-ii`);
//   - *¿Qué días?* *Todos* or hers — *Un día especial* names one; *¿Hasta cuándo?* *Esta semana*, *Dos semanas*,
//     *Fin de mes*, *Otra fecha…* (a calendar of the eight weeks, `@/ui/Calendario`), required — the law asks for a
//     duration, and it ends by itself;
//   - *Condiciones · las verán tus vecinos* — written for her from the fields with her kitchen's name and address
//     (`condicionesDe`), and *Cambiar*;
//   - *Así la verán en tu página* — the band filling in as she types, and the mark her offers will wear;
//   - *Publicar promoción*: every rule checked first (`revisar`), its photo up, then ONE call — and back on
//     *Promociones* with *Publicaste …* and *Deshacer* for 8 seconds (`undo_promotion`; the database allows two
//     minutes for a slow signal, then *termínala hoy*). Her first, as a celebration that keeps its *Deshacer*.
// ⚠️ A RETRY IS THE SAME PROMOTION: the id is kept while what it sends is unchanged; a press after an edit is a new one.
// ⚠️ *USARLA OTRA VEZ* (`?de=<id>`): the form filled from an old one (`borradorDe`) — a new promotion, a new id.
// ⚠️ NOT *AVISAR A QUIENES TE SIGUEN*: the alert is `10.9h`'s, his product analyst's (the drawing's switch is left out).
// ⚠️ THE OWNER'S (G18): a helper reads that it is not hers.
// NO CHECK CAN SEE THIS SCREEN (ADR-035 §2.11): the phone is its instrument.
// ============================================================================

export default function NuevaPromocion() {
  const { de } = useLocalSearchParams<{ de?: string }>();
  const insets = useSafeAreaInsets();
  const kitchen = useKitchen();
  const kitchenId = kitchen?.id ?? null;
  const place = usePlace(kitchenId);
  const rol = useSuRol(kitchenId).data;
  const promociones = usePromociones(kitchenId);
  const { crear, busy } = useCrearPromocion(kitchenId);
  const deshacer = useDeshacerPromocion();
  const { avisar } = useNota();
  const ahora = useAhora(60_000);
  const [borrador, setBorrador] = useState<Borrador | null>(null);
  const [problema, setProblema] = useState<string | null>(null);
  const [calendario, setCalendario] = useState(false);
  const [editando, setEditando] = useState(false);
  const [abierta, setAbierta] = useState(false);
  const [notaFoto, setNotaFoto] = useState<string | null>(null);
  const intento = useRef<{ readonly id: string; readonly sent: string } | null>(null);
  const row = promociones.data;

  // Filled once, from her list as it is read: new, or *Usarla otra vez*'s promotion.
  useEffect(() => {
    if (borrador !== null || row === undefined) return;
    const vieja = de === undefined ? undefined : row.promotions.find((p) => p.id === de);
    setBorrador(vieja === undefined ? NUEVO : borradorDe(vieja, row.card_open));
  }, [borrador, row, de]);

  const volver = () => (router.canGoBack() ? router.back() : router.replace('/promociones'));
  const banda = (
    <Banda
      titulo={ES.nuevaPromocion.titulo}
      antetitulo={de === undefined ? (kitchen?.displayName ?? null) : ES.nuevaPromocion.otraVez}
      volver={{ label: ES.nuevaPromocion.volver, onPress: () => !busy && volver() }}
    />
  );

  if (kitchen === null || borrador === null || row === undefined || place.data === undefined || rol === undefined) {
    const fallo = promociones.isError || promociones.fetchStatus === 'paused';
    return (
      <View style={{ flex: 1, backgroundColor: PALETTE.fondo }}>
        {banda}
        <View style={{ padding: SIZE.space * 2, gap: SIZE.space }}>
          {fallo ? (
            <>
              <Text style={{ fontSize: SIZE.bodySize, color: PALETTE.tinta }}>{ES.promociones.sinLeer}</Text>
              <BotonLleno label={ES.promociones.otraVez} busy={promociones.isFetching} onPress={() => void promociones.refetch()} />
            </>
          ) : (
            <ActivityIndicator color={PALETTE.accion} />
          )}
        </View>
      </View>
    );
  }

  if (!esDuena(rol)) {
    return (
      <View style={{ flex: 1, backgroundColor: PALETTE.fondo }}>
        {banda}
        <Text style={{ margin: SIZE.space * 2, fontSize: SIZE.bodySize, color: PALETTE.tinta }}>{ES.promocionErrores.soloLaDuena}</Text>
      </View>
    );
  }

  const b = borrador;
  const hoy = hoyDe(ahora);
  const cocina = kitchen.displayName;
  const direccion = direccionCorta(place.data?.address ?? null);
  const hasta = hastaDelBorrador(b, hoy);
  const temporada = b.tipo === 'temporada' ? temporadaDe(hoy) : null;
  const previa = bandaDe({ tipo: b.tipo, dias: b.dias, hasta, loQue: b.loQue, mas: b.mas });
  const tipos = tiposDe(row.card_open);
  const section = { fontSize: SIZE.smallSize, fontWeight: '600', color: PALETTE.tintaApagada } as const;
  const nota = { fontSize: SIZE.smallSize - 0.6, lineHeight: 18, color: PALETTE.tintaApagada } as const;

  const cambiar = (parte: Partial<Borrador>) => {
    setProblema(null);
    setBorrador({ ...b, ...parte });
  };

  async function foto(tomar: boolean) {
    if (busy || abierta || kitchen === null) return;
    setAbierta(true);
    try {
      const outcome = tomar ? await tomarFoto('platillo') : await elegirFoto('platillo');
      if (outcome.kind === 'tomada') {
        cambiar({ foto: { kind: 'nueva', path: newPicturePath(kitchen.id, newId()), archivos: outcome.archivos } });
        setNotaFoto(null);
      } else if (outcome.kind !== 'cancelada') {
        setNotaFoto(outcome.kind === 'denegada' ? ES.foto.denegada : ES.foto.fallo);
      }
    } finally {
      setAbierta(false);
    }
  }

  async function publicar() {
    if (busy || abierta || kitchen === null || row === undefined) return;
    Keyboard.dismiss();
    const hoyAhora = hoyDe(new Date());
    const falta = revisar(b, hoyAhora, row, cocina, direccion);
    if (falta !== null) return setProblema(falta);
    const envio = envioDe(b, hoyAhora, cocina, direccion);
    const sent = JSON.stringify(envio);
    if (intento.current === null || intento.current.sent !== sent) intento.current = { id: newId(), sent };
    const id = intento.current.id;
    // ⚠️ Her first, read BEFORE it is sent — never celebrated twice on this phone.
    const primera = row.promotions.length === 0;
    const { row: nueva, problema: fallo } = await crear(createArgs(kitchen.id, id, envio), porSubir([b.foto]));
    if (fallo !== null) return setProblema(fallo);
    const kitchenAhora = kitchen.id;
    const seVe = nueva?.promotions.find((p) => p.id === id)?.shown === true;
    const palabras = { hecho: ES.promociones.deshecha, fallo: ES.promociones.noSeDeshizo };
    if (primera && seVe) avisar(ES.promociones.primera, () => deshacer(kitchenAhora, id, envio.foto), palabras, true);
    else avisar(ES.promociones.publicaste(envio.loQue), () => deshacer(kitchenAhora, id, envio.foto), palabras);
    volver();
  }

  return (
    <View style={{ flex: 1, backgroundColor: PALETTE.fondo }}>
      {banda}
      <Formulario
        contentContainerStyle={{ paddingHorizontal: SIZE.space * 2, paddingTop: SIZE.space, paddingBottom: SIZE.space * 2, gap: SIZE.space * 1.5 }}
      >
        <Text style={{ fontSize: SIZE.smallSize + 1, lineHeight: 20, color: PALETTE.tintaApagada }}>{ES.nuevaPromocion.subtitulo}</Text>

        <View style={{ gap: SIZE.rowGap }}>
          <Text style={section}>{ES.nuevaPromocion.tipo}</Text>
          <View accessibilityRole="radiogroup" accessibilityLabel={ES.nuevaPromocion.tipo} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SIZE.rowGap }}>
            {tipos.map((tipo) => (
              <TipoTile key={tipo} tipo={tipo} on={b.tipo === tipo} onPress={() => cambiar({ tipo })} />
            ))}
          </View>
        </View>

        <View style={{ gap: 4 }}>
          <Campo
            label={ES.nuevaPromocion.que}
            placeholder={ES.promociones.ejemplos[b.tipo]}
            value={b.loQue}
            maxLength={LO_QUE_MAX}
            autoCapitalize="sentences"
            autoComplete="off"
            editable={!busy}
            onChangeText={(loQue) => cambiar({ loQue })}
          />
          <Text style={{ alignSelf: 'flex-end', fontSize: SIZE.smallSize - 1, color: PALETTE.tintaApagada }}>
            {ES.nuevaPromocion.cuenta(b.loQue.length, LO_QUE_MAX)}
          </Text>
          {temporada !== null && (
            <View style={{ gap: SIZE.rowGap }}>
              <Text style={nota}>{temporada.pista}</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SIZE.rowGap }}>
                {temporada.ejemplos.map((x) => (
                  <Ficha key={x} texto={x} on={false} onPress={() => cambiar({ loQue: x })} />
                ))}
              </View>
            </View>
          )}
        </View>

        <View style={{ gap: 4 }}>
          <Campo
            label={ES.nuevaPromocion.mas}
            placeholder={ES.nuevaPromocion.masEjemplo}
            value={b.mas}
            maxLength={MAS_MAX}
            autoCapitalize="sentences"
            autoComplete="off"
            editable={!busy}
            onChangeText={(mas) => cambiar({ mas })}
          />
          <Text style={{ alignSelf: 'flex-end', fontSize: SIZE.smallSize - 1, color: PALETTE.tintaApagada }}>
            {ES.nuevaPromocion.cuenta(b.mas.length, MAS_MAX)}
          </Text>
        </View>

        <CampoFoto
          label={ES.nuevaPromocion.foto}
          forma="platillo"
          foto={b.foto}
          defecto={
            <View style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center' }}>
              <MaterialCommunityIcons name={ICONO_DE_TIPO[b.tipo]} size={28} color={PALETTE.marca} />
            </View>
          }
          nota={notaFoto}
          busy={busy || abierta}
          onTomar={() => void foto(true)}
          onElegir={() => void foto(false)}
          onQuitar={() => cambiar({ foto: NINGUNA })}
        />

        <View style={{ gap: SIZE.rowGap }}>
          <Text style={section}>{ES.nuevaPromocion.dias}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SIZE.rowGap }}>
            <Ficha texto={ES.nuevaPromocion.todos} on={sonTodos(b.dias)} onPress={() => cambiar({ dias: tocarDia(b.dias, 'todos') })} />
            {DIAS.map((d: Dia) => (
              <Ficha
                key={d}
                texto={ES.promociones.diasCortos[d - 1]}
                ayuda={ES.promociones.diaDeSemana[d - 1]}
                on={!sonTodos(b.dias) && b.dias.includes(d)}
                onPress={() => cambiar({ dias: tocarDia(b.dias, d) })}
              />
            ))}
          </View>
          {b.tipo === 'dia' && sonTodos(b.dias) && <Text style={nota}>{ES.nuevaPromocion.eligeTuDia}</Text>}
        </View>

        <View style={{ gap: SIZE.rowGap }}>
          <Text style={section}>{ES.nuevaPromocion.hasta}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SIZE.rowGap }}>
            {HASTAS.map((h) => (
              <Ficha
                key={h}
                icono="calendar-blank-outline"
                texto={ES.nuevaPromocion.hastas[h]}
                on={b.hasta?.eleccion === h}
                onPress={() => (h === 'otra' ? setCalendario(true) : cambiar({ hasta: { eleccion: h } }))}
              />
            ))}
          </View>
          <Text style={nota}>{hasta !== null && dentroDelPlazo(hasta, hoy) ? ES.nuevaPromocion.hastaNota(conSuDia(hasta)) : ES.nuevaPromocion.hastaSinElegir}</Text>
        </View>

        {b.tipo === 'clientes' && (
          <View style={{ flexDirection: 'row', gap: SIZE.space, padding: SIZE.space, borderRadius: 14, borderWidth: 1, borderColor: PALETTE.linea, backgroundColor: PALETTE.superficie }}>
            <MaterialCommunityIcons name="gift-outline" size={SIZE.iconSize} color={PALETTE.marca} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ fontSize: SIZE.bodySize - 1, fontWeight: '600', color: PALETTE.tinta }}>{ES.nuevaPromocion.clientes}</Text>
              <Text style={nota}>{ES.nuevaPromocion.clientesDetalle}</Text>
            </View>
          </View>
        )}

        <View style={{ gap: SIZE.rowGap, padding: SIZE.space, borderRadius: 14, borderWidth: 1, borderColor: PALETTE.linea, backgroundColor: PALETTE.superficie }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SIZE.rowGap }}>
            <Text style={{ flex: 1, fontSize: SIZE.smallSize - 1, fontWeight: '700', color: PALETTE.tintaApagada }}>{ES.nuevaPromocion.condiciones}</Text>
            {!editando && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={ES.nuevaPromocion.cambiar}
                hitSlop={SIZE.rowGap}
                onPress={() => {
                  cambiar({ condiciones: condicionesDelBorrador(b, hoy, cocina, direccion) });
                  setEditando(true);
                }}
              >
                <Text style={{ fontSize: SIZE.smallSize, fontWeight: '700', color: PALETTE.accion }}>{ES.nuevaPromocion.cambiar}</Text>
              </Pressable>
            )}
          </View>
          {editando ? (
            <>
              <Campo
                label={ES.nuevaPromocion.condiciones}
                value={b.condiciones ?? ''}
                maxLength={CONDICIONES_MAX}
                multiline
                returnKeyType="default"
                editable={!busy}
                onChangeText={(condiciones) => cambiar({ condiciones })}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={ES.nuevaPromocion.escribirlas}
                hitSlop={SIZE.rowGap}
                onPress={() => {
                  cambiar({ condiciones: null });
                  setEditando(false);
                }}
                style={{ alignSelf: 'flex-start' }}
              >
                <Text style={{ fontSize: SIZE.smallSize, fontWeight: '700', color: PALETTE.accion }}>{ES.nuevaPromocion.escribirlas}</Text>
              </Pressable>
            </>
          ) : (
            <Text style={{ fontSize: SIZE.smallSize, lineHeight: 19, color: PALETTE.tinta }}>{condicionesDelBorrador(b, hoy, cocina, direccion)}</Text>
          )}
        </View>

        <View style={{ gap: SIZE.rowGap, padding: SIZE.rowGap, borderRadius: 18, borderWidth: 1, borderStyle: 'dashed', borderColor: PALETTE.linea, backgroundColor: PALETTE.banda }}>
          <Text style={{ marginHorizontal: 4, marginTop: 2, fontSize: SIZE.smallSize - 2.5, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', color: PALETTE.marca }}>
            {ES.nuevaPromocion.asiLaVeran}
          </Text>
          {/* A preview: nothing on it opens. */}
          <View pointerEvents="none">
            <BandaPromocion
              icono={ICONO_DE_TIPO[previa.tipo]}
              marca={previa.marca}
              hasta={previa.hasta}
              loQue={previa.loQue}
              mas={previa.mas}
              condiciones={ES.promociones.condiciones}
            />
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginHorizontal: 4, marginBottom: 2 }}>
            <Text style={nota}>{ES.nuevaPromocion.marcaNota}</Text>
            <MarcaPromocion icono={ICONO_DE_TIPO[b.tipo]} texto={marcaDe(b.tipo, b.dias)} chica />
          </View>
        </View>

        {problema !== null && <Text style={{ fontSize: SIZE.bodySize, fontWeight: '600', color: PALETTE.error }}>{problema}</Text>}
      </Formulario>
      <View style={{ paddingHorizontal: SIZE.space * 2, paddingTop: SIZE.space, paddingBottom: insets.bottom + SIZE.space, borderTopWidth: 1, borderTopColor: PALETTE.linea }}>
        <BotonLleno
          variante="principal"
          label={busy ? ES.nuevaPromocion.publicando : ES.nuevaPromocion.publicar}
          busy={busy}
          onPress={() => void publicar()}
        />
      </View>
      <Calendario
        visible={calendario}
        hoy={hoy}
        elegido={b.hasta?.eleccion === 'otra' ? b.hasta.dia : null}
        onCerrar={() => setCalendario(false)}
        onElegir={(dia) => {
          setCalendario(false);
          cambiar({ hasta: { eleccion: 'otra', dia } });
        }}
      />
    </View>
  );
}

/** One kind: its picture on terracotta when chosen, its name and what it is for (the drawing's `tile2 pk`). */
function TipoTile({ tipo, on, onPress }: { tipo: Tipo; on: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: on }}
      accessibilityLabel={`${ES.promociones.tipos[tipo]}. ${ES.promociones.tiposDetalle[tipo]}`}
      onPress={onPress}
      style={({ pressed }) => ({
        width: '48%',
        flexGrow: 1,
        alignItems: 'center',
        gap: 3,
        paddingVertical: SIZE.space - 2,
        paddingHorizontal: 6,
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: on ? PALETTE.marca : PALETTE.linea,
        backgroundColor: on ? PALETTE.marcaSuave : pressed ? PALETTE.fondo : PALETTE.superficie,
      })}
    >
      <View style={{ width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? PALETTE.marca : PALETTE.linea }}>
        <MaterialCommunityIcons name={ICONO_DE_TIPO[tipo]} size={26} color={on ? PALETTE.superficie : PALETTE.tintaApagada} />
      </View>
      <Text style={{ fontSize: SIZE.smallSize, fontWeight: '700', textAlign: 'center', color: on ? PALETTE.marca : PALETTE.tinta }}>{ES.promociones.tipos[tipo]}</Text>
      <Text style={{ fontSize: SIZE.smallSize - 2.5, lineHeight: 14, textAlign: 'center', color: PALETTE.tintaApagada }}>{ES.promociones.tiposDetalle[tipo]}</Text>
    </Pressable>
  );
}

/** A chip: a day, an end, a season's dish. */
function Ficha({
  texto,
  on,
  onPress,
  ayuda,
  icono,
}: {
  texto: string;
  on: boolean;
  onPress: () => void;
  ayuda?: string;
  icono?: 'calendar-blank-outline';
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      accessibilityLabel={ayuda ?? texto}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: SIZE.tapTarget - 4,
        minWidth: SIZE.tapTarget - 4,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        paddingHorizontal: SIZE.space - 2,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: on ? PALETTE.accion : PALETTE.linea,
        backgroundColor: on ? PALETTE.accion : pressed ? PALETTE.accionSuave : PALETTE.superficie,
      })}
    >
      {icono !== undefined && <MaterialCommunityIcons name={icono} size={16} color={on ? PALETTE.superficie : PALETTE.tintaApagada} />}
      <Text style={{ fontSize: SIZE.smallSize + 0.4, fontWeight: '700', color: on ? PALETTE.superficie : PALETTE.tinta }}>{texto}</Text>
    </Pressable>
  );
}
