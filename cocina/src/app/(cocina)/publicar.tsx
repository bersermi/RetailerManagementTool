import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, Keyboard, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { newPicturePath } from '@/api/fotos';
import { useKitchen, useListings, usePage, usePlace, usePublish } from '@/api/hooks';
import type { Kitchen } from '@/api/kitchen';
import {
  MAX_LINES,
  attemptFor,
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
import type { Place } from '@/api/place';
import { elegirFoto, tomarFoto } from '@/lib/foto';
import { nombreDe } from '@/lib/hoy';
import { newId } from '@/lib/ids';
import { useNota } from '@/lib/NotaProvider';
import { checkVentana, firstVentana, type Ventana } from '@/lib/ventana';
import { previaDe, recienTomadas } from '@/lib/vistaPrevia';
import { ES } from '@/strings';
import { PALETTE, SIZE } from '@/theme/palette';
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
// ⚠️ AND IT IS THE FIRST RUN'S LAST STEP when opened from *¿Qué ofreces hoy?* (`primera`):
// published, she goes on to her page as neighbours see it (`/ya-estas`), the first run's
// screens dismissed under it, never back to *Hoy* or to the question.
// ============================================================================

const PAD = 'publicar-numeros';

export default function Publicar() {
  const { repetir, primera } = useLocalSearchParams<{ repetir?: string; primera?: string }>();
  const kitchen = useKitchen();
  const place = usePlace(kitchen?.id ?? null);
  const listings = useListings(kitchen?.id ?? null);
  const source = repetir === undefined ? null : (listings.data?.find((l) => l.id === repetir) ?? null);
  const waiting = repetir !== undefined && listings.data === undefined && !listings.isError;

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
  return <Form kitchen={kitchen} place={place.data} source={source} primera={primera !== undefined} />;
}

/** Back to her kitchen — the screen under this one, or the kitchen itself when opened alone. */
function salir() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

function Form({ kitchen, place, source, primera }: { kitchen: Kitchen; place: Place; source: Listing | null; primera: boolean }) {
  const placeId = place.id;
  const insets = useSafeAreaInsets();
  const { publish, busy } = usePublish(kitchen.id);
  const { avisarPublicada } = useNota();
  const page = usePage(kitchen.id);
  const fondo = { dibujo: defaultsFor(kitchen.giroPrincipal).dibujo, color: colorOf(page.data ?? EMPTY_PAGE, kitchen.giroPrincipal) };
  const [notas, setNotas] = useState<Record<string, string | null>>({});
  const [abierta, setAbierta] = useState(false);
  const [start] = useState(() => (source === null ? null : repeatDraft(source, new Date(), newId)));
  const [lines, setLines] = useState<LineDraft[]>(() => start?.lines ?? [emptyLine(newId())]);
  const [ventana, setVentana] = useState<Ventana>(() => start?.ventana ?? firstVentana(new Date()));
  const [problem, setProblem] = useState<string | null>(null);
  const attempt = useRef<Attempt | null>(null);

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
    const issue = checkLines(lines);
    if (issue !== null) return setProblem(issueSentence(issue, lines));
    const late = checkVentana(ventana, new Date());
    if (late !== null) return setProblem(ES.publicar.errores.ventana[late]);
    const body = publishBody(placeId, lines, ventana);
    attempt.current = attemptFor(attempt.current, body, newId);
    const id = attempt.current.id;
    const answer = await publish(publishArgs(attempt.current, body), fotosPorSubir(lines));
    setProblem(answer);
    if (answer !== null) return;
    avisarPublicada(ES.nota.publicaste(nombreDe({ lines: body.p_lines })), kitchen.id, id);
    if (!primera) return salir();
    router.dismissAll();
    router.replace('/ya-estas');
  }

  const section = { fontSize: SIZE.bodySize, fontWeight: '700', color: PALETTE.tinta, marginTop: SIZE.space } as const;
  const ahora = new Date();
  const previa = previaDe({ kitchen, place, page: page.data ?? EMPTY_PAGE, lines, ventana, now: ahora });

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
          />
        ))}
        {lines.length < MAX_LINES && (
          <BotonLleno
            icon="plus"
            label={ES.publicar.otro}
            onPress={() => setLines((now) => (now.length >= MAX_LINES ? now : [...now, emptyLine(newId())]))}
          />
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
