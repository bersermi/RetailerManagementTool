import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState, type ComponentProps } from 'react';
import { ActivityIndicator, Keyboard, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { estrellasDe } from '@/api/calificaciones';
import { newPicturePath } from '@/api/fotos';
import { useAjustes, useCalificaciones, useKitchen, useListings, usePage, usePlace, usePromociones, usePublish, useServicios } from '@/api/hooks';
import type { Kitchen } from '@/api/kitchen';
import {
  MAX_LINES,
  attemptFor,
  ofreceLasDos,
  checkLines,
  emptyLine,
  fotosPorSubir,
  issueSentence,
  publishArgs,
  publishBody,
  repeatDraft,
  type Attempt,
  type LineDraft,
  type Listing,
} from '@/api/listing';
import { EMPTY_PAGE, colorOf, defaultsFor } from '@/api/pagina';
import { activasEl } from '@/api/promociones';
import type { Place } from '@/api/place';
import { promocionVistaDe } from '@/lib/comoLaVen';
import { eleccionDe, recordarEleccion } from '@/lib/eleccion';
import { cambiarMemoria, leerMemoria, ofertaFestejada, ofertaDeEstreno } from '@/lib/empujones';
import { elegirFoto, tomarFoto } from '@/lib/foto';
import { nombreDe } from '@/lib/hoy';
import { newId } from '@/lib/ids';
import { useNota } from '@/lib/NotaProvider';
import { ICONO_DE_TIPO, hoyDe, seLeen } from '@/lib/promociones';
import { deviceStore } from '@/lib/store';
import { checkVentana, firstVentana, type Ventana } from '@/lib/ventana';
import { previaDe, recienTomadas } from '@/lib/vistaPrevia';
import { ES } from '@/strings';
import { PALETTE, SIZE } from '@/theme/palette';
import { ESQUINA } from '@/theme/density';
import { Banda } from '@/ui/Banda';
import { BotonLleno } from '@/ui/BotonLleno';
import { Formulario } from '@/ui/Formulario';
import { Horario } from '@/ui/Horario';
import { Renglon } from '@/ui/Renglon';
import { TecladoListo } from '@/ui/TecladoListo';
import { RecienTomadas } from '@/vecinos/ui/Foto';
import { TarjetaPlatillo } from '@/vecinos/ui/TarjetaPlatillo';

// ============================================================================
// SHE PUBLISHES WHAT IS LEFT OF THE DAY. Plan task `10.4b-iv-a` — slice 1's last
// screen, on `0072`'s `publish_listing`.
//
// ⚠️ PROPOSAL B, HIS CHOICE OF 2026-10-29: one or more lines (*Otro platillo*,
// up to ten), each a dish or a surprise bag (`@/ui/Renglon`), then when
// neighbours may come (`@/ui/Horario`), then one *Publicar* — the window and
// its lines in one call. Opened from her list's *Repetir*, it starts from that
// publication: its lines and its hours on the next day they have not ended.
//
// ⚠️ EVERY RULE IS CHECKED BEFORE ANYTHING IS SENT, in the order she fills the
// form (`checkLines`, then `checkVentana` against the clock at the press): one
// red sentence above the button, naming the line. The database checks the same
// things and would answer `22023`.
//
// ⚠️⚠️ A RETRY IS THE SAME PUBLICATION. The phone makes the id; the last press's
// is kept while nothing changes (`attemptFor`), so *Sin conexión* and a second
// press can never publish twice — and a press after an edit is a new one,
// because the database answers an id it holds with the first version, unread.
// Her list is read again after every press, so one that landed before its
// reply was lost is on it. No signal, no publication: nothing here is queued,
// and the form keeps what she typed.
//
// ⚠️ AT HER KITCHEN'S OWN PLACE — `usePlace(kitchen.id)`, the read filtered on
// the kitchen (`@/api/place`): `publish_listing` refuses a shop's store
// (`TD013`), and a login with a shop could otherwise send it.
//
// ⚠️ `10.5-ii`: A PHOTO PER DISH. *Tomar foto* or *Elegir* on a line makes the
// photo's path at once — so the body, and with it the attempt's id, changes once
// and a retry sends the same photo — and the photos go up when she presses
// *Publicar*, before the call that names them (`usePublish`). A dish with no
// photo wears her kitchen's drawing on her page's colour.
//
// ⚠️ `10.5-v-c-i`: PUBLISHED, SHE IS BACK WHERE SHE CAME FROM — *Hoy* or *Tus ofertas* —
// with *Publicaste …* and *Deshacer* for 8 seconds (the owner's ruling of 2026-11-05,
// call 19). The toast lives at the root (`@/lib/NotaProvider`): this screen is gone by
// the time she reads it, so the call behind *Deshacer* is not this screen's.
//
// ⚠️ `10.5-v-d`: AT ITS FOOT, *ASÍ LA VERÁN EN ITACATE* — Itacate's own list card, one per
// line, filling in as she types (`@/lib/vistaPrevia`, the family-shell page's form). It
// opens nothing and measures no distance: she is in her kitchen. A photo she has just
// taken is drawn from the phone (`RecienTomadas`), since it goes up only on *Publicar*.
// (From `10.5-v-d` to `10.9a-ii` it was also the first run's last step, opened from *¿Qué
// ofreces hoy?*; the owner's ruling of 2026-11-17, G32, took the first offer out of the first run.)
//
// ⚠️ `10.5b-iv-c`: HER KITCHEN'S WAYS AND *DESECHABLE* (`useAjustes`): with both ways on, each dish
// asks how it may be eaten (`@/ui/Renglon`), checked (`'comer'`) and sent (`publishBody`'s
// `cocina`); *Repetir* keeps each dish's ways, narrowed to what her kitchen offers now. The card at
// the foot shows her payment, *desechable* and stars. Her settings unread, nothing is asked and each
// dish is sent as the kitchen's own — the database's `coalesce`.
//
// ⚠️ `10.9g-ii`: *¿ES PARTE DE UNA PROMOCIÓN?* (G30) — asked only while one of her kitchen's runs on the day of
// its window (`@/api/promociones`' `activasEl`: running, shown, and one of its days by the window's day), a
// helper too (G36); *No* chosen at first. Picked, the offer joins it (`publish_listing`'s `p_promotion_id`) and
// wears its mark in Itacate (`10.9g-iii`). A window moved to a day it does not run drops the pick. `TD031` — it
// ended meanwhile — is said in words, and her promotions are read again (`usePublish`).
// ============================================================================

const PAD = 'publicar-numeros';

export default function Publicar() {
  const { repetir } = useLocalSearchParams<{ repetir?: string }>();
  const kitchen = useKitchen();
  const place = usePlace(kitchen?.id ?? null);
  const listings = useListings(kitchen?.id ?? null);
  const ajustes = useAjustes(kitchen?.id ?? null);
  const source = repetir === undefined ? null : (listings.data?.find((l) => l.id === repetir) ?? null);
  // ⚠️ `10.5b-iv-c`: *Repetir* narrows each dish to her kitchen's ways — wait for them, unless the read failed.
  const waiting =
    (repetir !== undefined && listings.data === undefined && !listings.isError) ||
    (repetir !== undefined && ajustes.data === undefined && !ajustes.isError);

  if (kitchen === null || place.data === undefined || waiting) {
    return (
      <View style={{ flex: 1, backgroundColor: PALETTE.fondo }}>
        <Banda titulo={ES.publicar.titulo} volver={{ label: ES.publicar.volver, onPress: salir }} />
        <ActivityIndicator color={PALETTE.accion} style={{ marginTop: SIZE.space * 2 }} />
      </View>
    );
  }
  if (place.data === null) {
    return (
      <View style={{ flex: 1, backgroundColor: PALETTE.fondo }}>
        <Banda titulo={ES.publicar.titulo} volver={{ label: ES.publicar.volver, onPress: salir }} />
        <Text style={{ margin: SIZE.space * 2, fontSize: SIZE.bodySize, color: PALETTE.tinta }}>{ES.publicar.sinLugar}</Text>
      </View>
    );
  }
  return <Form kitchen={kitchen} place={place.data} source={source} />;
}

/** Back to her kitchen — the screen under this one, or the kitchen itself when opened alone. */
function salir() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

function Form({ kitchen, place, source }: { kitchen: Kitchen; place: Place; source: Listing | null }) {
  const placeId = place.id;
  const insets = useSafeAreaInsets();
  const { publish, busy } = usePublish(kitchen.id);
  const { avisarPublicada } = useNota();
  // `10.9a-iii`: what she published before this one — her very first is celebrated.
  const listings = useListings(kitchen.id);
  const page = usePage(kitchen.id);
  const ajustes = useAjustes(kitchen.id).data ?? null;
  const estrellas = estrellasDe(useCalificaciones(kitchen.id).data ?? null);
  const fondo = { dibujo: defaultsFor(kitchen.giroPrincipal).dibujo, color: colorOf(page.data ?? EMPTY_PAGE, kitchen.giroPrincipal) };
  const [notas, setNotas] = useState<Record<string, string | null>>({});
  const [abierta, setAbierta] = useState(false);
  const [start] = useState(() => (source === null ? null : repeatDraft(source, new Date(), newId, ajustes)));
  // ⚠️ `10.5b-iv-c`: a new dish starts with how she last chose it, on this phone (`@/lib/eleccion`).
  const [eleccion] = useState(() => eleccionDe(kitchen.id));
  const [lines, setLines] = useState<LineDraft[]>(() => start?.lines ?? [emptyLine(newId(), eleccion)]);
  const [ventana, setVentana] = useState<Ventana>(() => start?.ventana ?? firstVentana(new Date()));
  const [problem, setProblem] = useState<string | null>(null);
  const attempt = useRef<Attempt | null>(null);
  // `10.9g-ii`: the promotions running on the window's day, asked only while her kitchen uses them.
  const servicios = useServicios(kitchen.id);
  const promociones = usePromociones(kitchen.id, { activa: seLeen(servicios.data) });
  const [promo, setPromo] = useState<string | null>(null);
  const ofrecidas = activasEl(promociones.data ?? null, hoyDe(ventana.start));
  const promoElegida = ofrecidas.some((p) => p.id === promo) ? promo : null;

  function change(key: string, update: (line: LineDraft) => Partial<LineDraft>) {
    setLines((now) => now.map((line) => (line.key === key ? { ...line, ...update(line), key } : line)));
  }

  async function foto(key: string, tomar: boolean) {
    if (busy || abierta) return;
    setAbierta(true);
    try {
      const outcome = tomar ? await tomarFoto('platillo') : await elegirFoto('platillo');
      if (outcome.kind === 'tomada') {
        const path = newPicturePath(kitchen.id, newId());
        change(key, () => ({ foto: { kind: 'nueva', path, archivos: outcome.archivos } }));
        setNotas((now) => ({ ...now, [key]: null }));
      } else if (outcome.kind !== 'cancelada') {
        setNotas((now) => ({ ...now, [key]: outcome.kind === 'denegada' ? ES.foto.denegada : ES.foto.fallo }));
      }
    } finally {
      setAbierta(false);
    }
  }

  async function publicar() {
    if (busy || abierta) return;
    Keyboard.dismiss();
    const issue = checkLines(lines, ajustes);
    if (issue !== null) return setProblem(issueSentence(issue, lines));
    const late = checkVentana(ventana, new Date());
    if (late !== null) return setProblem(ES.publicar.errores.ventana[late]);
    const body = publishBody(placeId, lines, ventana, ajustes, promoElegida);
    attempt.current = attemptFor(attempt.current, body, newId);
    const id = attempt.current.id;
    // ⚠️ `10.9a-iii`: HER FIRST OFFER, READ BEFORE IT IS SENT — never published, never celebrated on this phone.
    const estreno = ofertaDeEstreno(leerMemoria(deviceStore(), kitchen.id), listings.data);
    const answer = await publish(publishArgs(attempt.current, body), fotosPorSubir(lines));
    setProblem(answer);
    if (answer !== null) return;
    // Her choice kept for the next form — only when the form asked (both ways), from her first dish.
    const elegida = lines.find((line) => !line.surprise);
    recordarEleccion(kitchen.id, ofreceLasDos(ajustes) && elegida !== undefined ? { llevar: elegida.llevar, aqui: elegida.aqui } : null);
    // Her first: *¡Ya te ven en Itacate!*, in the green — and never again; *Deshacer* kept either way.
    if (estreno) cambiarMemoria(deviceStore(), kitchen.id, ofertaFestejada);
    avisarPublicada(estreno ? ES.festejo.oferta : ES.nota.publicaste(nombreDe({ lines: body.p_lines })), kitchen.id, id, estreno);
    salir();
  }

  const section = { fontSize: SIZE.bodySize, fontWeight: '700', color: PALETTE.tinta, marginTop: SIZE.space } as const;
  const ahora = new Date();
  // `10.9g-iii`: the promotion she picked, so the card wears its mark as Itacate will draw it.
  const elegida = ofrecidas.find((p) => p.id === promoElegida);
  const previa = previaDe({
    kitchen,
    place,
    page: page.data ?? EMPTY_PAGE,
    lines,
    ventana,
    now: ahora,
    ajustes,
    estrellas,
    promocion: elegida === undefined ? null : promocionVistaDe(elegida),
  });

  return (
    <View style={{ flex: 1, backgroundColor: PALETTE.fondo }}>
      <Banda
        titulo={ES.publicar.titulo}
        antetitulo={source === null ? kitchen.displayName : ES.publicar.repetida}
        volver={{ label: ES.publicar.volver, onPress: () => !busy && salir() }}
      />
      <Formulario
        contentContainerStyle={{
          paddingHorizontal: SIZE.space * 2,
          paddingTop: SIZE.space,
          paddingBottom: SIZE.space * 2 + insets.bottom,
          gap: SIZE.space,
        }}
      >
        <Text style={section}>{ES.publicar.que}</Text>
        {lines.map((line, i) => (
          <Renglon
            key={line.key}
            line={line}
            n={i + 1}
            onChange={(update) => change(line.key, update)}
            onRemove={lines.length > 1 ? () => setLines((now) => now.filter((l) => l.key !== line.key)) : null}
            editable={!busy && !abierta}
            padId={PAD}
            fondo={fondo}
            nota={notas[line.key] ?? null}
            onFoto={(tomar) => void foto(line.key, tomar)}
            cocina={ajustes}
          />
        ))}
        {lines.length < MAX_LINES && (
          <BotonLleno
            icon="plus"
            label={ES.publicar.otro}
            onPress={() => setLines((now) => (now.length >= MAX_LINES ? now : [...now, emptyLine(newId(), eleccion)]))}
          />
        )}

        {ofrecidas.length > 0 && (
          <View style={{ gap: SIZE.rowGap }}>
            <Text style={section}>{ES.promociones.parte}</Text>
            <View accessibilityRole="radiogroup" accessibilityLabel={ES.promociones.parte} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SIZE.rowGap }}>
              {ofrecidas.map((p) => (
                <Opcion key={p.id} icono={ICONO_DE_TIPO[p.kind]} texto={p.what} on={promoElegida === p.id} marca onPress={() => setPromo(p.id)} />
              ))}
              <Opcion texto={ES.promociones.no} on={promoElegida === null} onPress={() => setPromo(null)} />
            </View>
            <Text style={{ fontSize: SIZE.smallSize - 0.6, color: PALETTE.tintaApagada }}>{ES.promociones.parteNota}</Text>
          </View>
        )}

        <Text style={section}>{ES.publicar.cuando}</Text>
        <Horario ventana={ventana} onChange={(move) => setVentana(move)} disabled={busy} />

        <Text style={section}>{ES.publicar.asiLaVeran}</Text>
        <RecienTomadas.Provider value={recienTomadas(lines)}>
          {/* A preview: nothing on it opens. */}
          <View pointerEvents="none" style={{ gap: SIZE.space }}>
            {previa.platillos.map((platillo, i) => (
              <TarjetaPlatillo
                key={lines[i].key}
                cocina={previa.cocina}
                oferta={previa.oferta}
                platillo={platillo}
                distancia={null}
                ahora={ahora}
                onPress={() => {}}
              />
            ))}
          </View>
        </RecienTomadas.Provider>

        {problem !== null && (
          <Text style={{ fontSize: SIZE.bodySize, fontWeight: '600', color: PALETTE.error }}>{problem}</Text>
        )}
        <View style={{ marginTop: SIZE.space }}>
          <BotonLleno variante="principal" label={ES.publicar.publicar} busy={busy} onPress={() => void publicar()} />
        </View>
      </Formulario>
      <TecladoListo padId={PAD} label={ES.publicar.listo} />
    </View>
  );
}

/** One answer to *¿Es parte de una promoción?*: a promotion, in terracotta when picked (never the action's colour), or *No*. */
function Opcion({
  texto,
  on,
  onPress,
  icono,
  marca = false,
}: {
  texto: string;
  on: boolean;
  onPress: () => void;
  icono?: ComponentProps<typeof MaterialCommunityIcons>['name'];
  marca?: boolean;
}) {
  const color = marca ? PALETTE.marca : PALETTE.accion;
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: on }}
      accessibilityLabel={texto}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: SIZE.tapTarget - 4,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: SIZE.space,
        borderRadius: ESQUINA.chip,
        borderWidth: on ? 1.5 : 1,
        borderColor: on ? color : PALETTE.linea,
        backgroundColor: on ? (marca ? PALETTE.marcaSuave : PALETTE.accionSuave) : pressed ? PALETTE.fondo : PALETTE.superficie,
      })}
    >
      {icono !== undefined && <MaterialCommunityIcons name={icono} size={16} color={on ? color : PALETTE.tintaApagada} />}
      <Text style={{ fontSize: SIZE.smallSize + 0.4, fontWeight: '700', color: on ? color : PALETTE.tinta }}>{texto}</Text>
    </Pressable>
  );
}
