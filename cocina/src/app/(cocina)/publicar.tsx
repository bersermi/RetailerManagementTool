import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, Keyboard, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useKitchen, useListings, usePlace, usePublish } from '@/api/hooks';
import type { Kitchen } from '@/api/kitchen';
import {
  MAX_LINES,
  attemptFor,
  checkLines,
  emptyLine,
  issueSentence,
  publishArgs,
  publishBody,
  repeatDraft,
  type Attempt,
  type LineDraft,
  type Listing,
} from '@/api/listing';
import { newId } from '@/lib/ids';
import { checkVentana, firstVentana, type Ventana } from '@/lib/ventana';
import { ES } from '@/strings';
import { PALETTE, SIZE } from '@/theme/palette';
import { Banda } from '@/ui/Banda';
import { BotonLleno } from '@/ui/BotonLleno';
import { Formulario } from '@/ui/Formulario';
import { Horario } from '@/ui/Horario';
import { Renglon } from '@/ui/Renglon';
import { TecladoListo } from '@/ui/TecladoListo';

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
// ============================================================================

const PAD = 'publicar-numeros';

export default function Publicar() {
  const { repetir } = useLocalSearchParams<{ repetir?: string }>();
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
  return <Form kitchen={kitchen} placeId={place.data.id} source={source} />;
}

/** Back to her kitchen — the screen under this one, or the kitchen itself when opened alone. */
function salir() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

function Form({ kitchen, placeId, source }: { kitchen: Kitchen; placeId: string; source: Listing | null }) {
  const insets = useSafeAreaInsets();
  const { publish, busy } = usePublish(kitchen.id);
  const [start] = useState(() => (source === null ? null : repeatDraft(source, new Date(), newId)));
  const [lines, setLines] = useState<LineDraft[]>(() => start?.lines ?? [emptyLine(newId())]);
  const [ventana, setVentana] = useState<Ventana>(() => start?.ventana ?? firstVentana(new Date()));
  const [problem, setProblem] = useState<string | null>(null);
  const attempt = useRef<Attempt | null>(null);

  function change(key: string, update: (line: LineDraft) => Partial<LineDraft>) {
    setLines((now) => now.map((line) => (line.key === key ? { ...line, ...update(line), key } : line)));
  }

  async function publicar() {
    if (busy) return;
    Keyboard.dismiss();
    const issue = checkLines(lines);
    if (issue !== null) return setProblem(issueSentence(issue, lines));
    const late = checkVentana(ventana, new Date());
    if (late !== null) return setProblem(ES.publicar.errores.ventana[late]);
    const body = publishBody(placeId, lines, ventana);
    attempt.current = attemptFor(attempt.current, body, newId);
    const answer = await publish(publishArgs(attempt.current, body));
    setProblem(answer);
    if (answer === null) salir();
  }

  const section = { fontSize: SIZE.bodySize, fontWeight: '700', color: PALETTE.tinta, marginTop: SIZE.space } as const;

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
            editable={!busy}
            padId={PAD}
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
