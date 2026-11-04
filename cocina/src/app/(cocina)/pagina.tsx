import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Keyboard, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { NINGUNA, newPicturePath, type Forma, type Foto } from '@/api/fotos';
import { useKitchen, useKitchenGiros, usePage, useSavePage } from '@/api/hooks';
import { giroLabel, type Kitchen } from '@/api/kitchen';
import { SENTENCE_MAX, checkPage, defaultsFor, draftOf, pageWith, type Page, type PageDraft } from '@/api/pagina';
import { elegirFoto, tomarFoto } from '@/lib/foto';
import { newId } from '@/lib/ids';
import { ES } from '@/strings';
import { PALETTE, SIZE } from '@/theme/palette';
import { Banda } from '@/ui/Banda';
import { BotonLleno } from '@/ui/BotonLleno';
import { Campo } from '@/ui/Campo';
import { CampoFoto } from '@/ui/CampoFoto';
import { Colores } from '@/ui/Colores';
import { Dibujo } from '@/ui/Dibujo';
import { Formulario } from '@/ui/Formulario';
import { Iniciales } from '@/ui/Iniciales';
import { Portada } from '@/ui/Portada';

// ============================================================================
// *TU PÁGINA EN ITACATE*. Plan task `10.5-ii` — proposal B, the owner's ruling of
// 2026-11-01 (https://claude.ai/artifact/EaiMkYqn2skPXn7MiKeULu), on `0076`.
//
// ⚠️ THE DRAWING'S ONE SCREEN, IN ITS ORDER: *Así te ven tus vecinos* — the page's
// head, live as she changes each part (`@/ui/Portada`) — then *Foto de portada*
// (*Tomar foto*, *Elegir*), *Tu color* (six), *Una frase sobre tu cocina* with its
// count, and the hint about a home's front above *Guardar*. Two parts the drawing
// did not draw sit after the sentence: her logo (proposal B's *"her logo if she
// has one"*) and her Google Maps link (his Google ruling of the same night).
// EVERY PART IS OPTIONAL and every empty one shows its default, so she can leave.
//
// ⚠️ NOTHING IS SENT UNTIL *GUARDAR*, AND THEN ONLY WHAT CHANGED (`useSavePage`):
// the pictures she took go up first, then `set_kitchen_page` gets the changed
// fields. A picture's path is made when it is taken, so a retry after *Sin
// conexión* re-sends the same one. The form is opened once her page has been
// read, so it starts from what is saved.
//
// ⚠️ THE CAMERA AND THE GALLERY ARE `@/lib/foto`'s, which cuts each picture to its
// shape — the cover 16:9, the logo square — and strips where it was taken.
// ============================================================================
export default function TuPagina() {
  const kitchen = useKitchen();
  const page = usePage(kitchen?.id ?? null);
  const giros = useKitchenGiros();

  if (kitchen === null || page.data === undefined) {
    return (
      <View style={{ flex: 1, backgroundColor: PALETTE.fondo }}>
        <Banda titulo={ES.pagina.titulo} volver={{ label: ES.pagina.volver, onPress: () => router.back() }} />
        <View style={{ padding: SIZE.space * 2, gap: SIZE.space }}>
          {page.isError ? (
            <>
              <Text style={{ fontSize: SIZE.bodySize, color: PALETTE.tinta }}>{ES.cocina.sinLeer}</Text>
              <BotonLleno label={ES.cocina.otraVez} busy={page.isFetching} onPress={() => void page.refetch()} />
            </>
          ) : (
            <ActivityIndicator color={PALETTE.accion} />
          )}
        </View>
      </View>
    );
  }
  return <Form kitchen={kitchen} saved={page.data} giroNombre={giroLabel(giros.data, kitchen.giroPrincipal)} />;
}

type Slot = 'cover' | 'logo';

function Form({ kitchen, saved, giroNombre }: { kitchen: Kitchen; saved: Page; giroNombre: string | null }) {
  const insets = useSafeAreaInsets();
  const { save, busy } = useSavePage(kitchen.id);
  const [draft, setDraft] = useState<PageDraft>(() => draftOf(saved));
  const [problem, setProblem] = useState<string | null>(null);
  const [notas, setNotas] = useState<Record<Slot, string | null>>({ cover: null, logo: null });
  const [abierta, setAbierta] = useState(false);
  const still = busy || abierta;

  const defaults = defaultsFor(kitchen.giroPrincipal);
  const color = draft.color ?? defaults.color;
  const preview = pageWith(draft);

  function set(update: Partial<PageDraft>) {
    setDraft((now) => ({ ...now, ...update }));
  }

  async function foto(slot: Slot, forma: Forma, tomar: boolean) {
    if (still) return;
    setAbierta(true);
    try {
      const outcome = tomar ? await tomarFoto(forma) : await elegirFoto(forma);
      if (outcome.kind === 'tomada') {
        const nueva: Foto = { kind: 'nueva', path: newPicturePath(kitchen.id, newId()), archivos: outcome.archivos };
        set(slot === 'cover' ? { cover: nueva } : { logo: nueva });
        setNotas((now) => ({ ...now, [slot]: null }));
      } else if (outcome.kind !== 'cancelada') {
        setNotas((now) => ({ ...now, [slot]: outcome.kind === 'denegada' ? ES.foto.denegada : ES.foto.fallo }));
      }
    } finally {
      setAbierta(false);
    }
  }

  async function guardar() {
    if (still) return;
    Keyboard.dismiss();
    const issue = checkPage(draft);
    if (issue !== null) return setProblem(ES.pagina.errores[issue]);
    const answer = await save({ kitchenId: kitchen.id, saved, draft });
    setProblem(answer);
    if (answer === null) router.back();
  }

  const label = { fontSize: SIZE.smallSize, fontWeight: '600', color: PALETTE.tintaApagada } as const;
  const quiet = { fontSize: SIZE.smallSize, color: PALETTE.tintaApagada } as const;

  return (
    <View style={{ flex: 1, backgroundColor: PALETTE.fondo }}>
      <Banda
        titulo={ES.pagina.titulo}
        antetitulo={kitchen.displayName}
        volver={{ label: ES.pagina.volver, onPress: () => !busy && router.back() }}
      />
      <Formulario
        contentContainerStyle={{
          paddingHorizontal: SIZE.space * 2,
          paddingTop: SIZE.space * 2,
          paddingBottom: SIZE.space * 2 + insets.bottom,
          gap: SIZE.space,
        }}
      >
        <Text style={label}>{ES.pagina.asiTeVen}</Text>
        <Portada
          nombre={kitchen.displayName}
          giro={kitchen.giroPrincipal}
          giroNombre={giroNombre}
          color={color}
          frase={preview.sentence}
          enlace={preview.mapsLink}
          cover={draft.cover}
          logo={draft.logo}
        />

        <CampoFoto
          label={ES.pagina.portada}
          forma="portada"
          foto={draft.cover}
          defecto={<Dibujo dibujo={defaults.dibujo} color={color} modo="portada" />}
          nota={notas.cover}
          busy={still}
          onTomar={() => void foto('cover', 'portada', true)}
          onElegir={() => void foto('cover', 'portada', false)}
          onQuitar={() => set({ cover: NINGUNA })}
        />

        <Text style={label}>{ES.pagina.color}</Text>
        <Colores chosen={color} onChoose={(chosen) => set({ color: chosen })} disabled={busy} />

        {/* ⚠️ It wraps, so the whole sentence is in sight (one line scrolled sideways on
            the emulator); Return only closes the keyboard — the sentence is one line. */}
        <Campo
          label={ES.pagina.frase}
          value={draft.sentence}
          onChangeText={(sentence) => set({ sentence })}
          placeholder={ES.pagina.fraseEjemplo}
          maxLength={SENTENCE_MAX}
          autoCapitalize="sentences"
          multiline
          submitBehavior="blurAndSubmit"
          editable={!busy}
        />
        <Text style={[quiet, { textAlign: 'right', marginTop: -SIZE.rowGap }]}>
          {ES.pagina.cuenta(draft.sentence.length, SENTENCE_MAX)}
        </Text>

        <CampoFoto
          label={ES.pagina.logo}
          forma="logo"
          foto={draft.logo}
          defecto={<Iniciales nombre={kitchen.displayName} color={color} size={64} />}
          nota={notas.logo ?? (draft.logo.kind === 'ninguna' ? ES.pagina.sinLogo : null)}
          busy={still}
          onTomar={() => void foto('logo', 'logo', true)}
          onElegir={() => void foto('logo', 'logo', false)}
          onQuitar={() => set({ logo: NINGUNA })}
        />

        <Campo
          label={ES.pagina.enlace}
          value={draft.mapsLink}
          onChangeText={(mapsLink) => set({ mapsLink })}
          placeholder={ES.pagina.enlaceEjemplo}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          editable={!busy}
        />
        <Text style={[quiet, { marginTop: -SIZE.rowGap / 2 }]}>{ES.pagina.enlaceComo}</Text>

        <Text style={[quiet, { marginTop: SIZE.rowGap }]}>{ES.pagina.aviso}</Text>
        {problem !== null && (
          <Text style={{ fontSize: SIZE.bodySize, fontWeight: '600', color: PALETTE.error }}>{problem}</Text>
        )}
        <BotonLleno variante="principal" label={ES.pagina.guardar} busy={busy} onPress={() => void guardar()} />
      </Formulario>
    </View>
  );
}
