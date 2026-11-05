// ============================================================================
// *¿DÓNDE ESTÁ TU COCINA?* — HER ADDRESS ON A SCREEN OF ITS OWN. Plan task
// `10.4h`, the owner's ruling of 2026-11-03 (*"Split the address set up in a
// different screen … once the user finds the address, the pin seems set in the
// map in small (the user can change it if he clicks on the map) but he doesn't
// have to tap the map at all … The address is the most relevant thing"*), as
// Uber Eats' address screen does it.
//
// Two routes draw it and differ only in what the button does: the sign-up's
// second step (`(onboarding)/donde`, *Registrar mi cocina* makes the kitchen) and
// her kitchen's *Cambiar dirección* (`(cocina)/direccion`, *Guardar* writes what
// changed — `@/api/direccion`'s `escrituras`).
//
// ⚠️⚠️ THE SMALL MAP NEEDS NO TOUCH. It draws her own point while it still belongs
// to the street and number in the boxes (`puntoVigente`), else where Google places
// her address — her pick's point, behind *Cambiar dirección* her kitchen's stored
// copy while the boxes read as stored, or her boxes through Geocoding once they
// rest (`useDondeEsta`). A tap on it opens *Ajusta el punto*, the only way to a point
// of her own. No point, no problem: she registers with her address alone, and the
// box says why there is no pin.
//
// ⚠️⚠️ WHAT IT DRAWS IS WHAT HER SAVE KEEPS AS GOOGLE'S (`10.5-i-b-ii`, the owner's
// ruling of 2026-11-04, night): the button hands the route `google` — the point on
// the small map, with the ID of the place she picked — as Google's 30-day copy, never
// as her pin; `null` with her own point, or while Google has not answered.
//
// ⚠️ THE LINE ABOUT NEIGHBOURS IS SAID BEFORE SHE SAVES, EVERY TIME: her address
// and its point are shown to signed-in neighbours before they reserve (the owner's
// ruling 4 of 2026-10-28), and nobody has asked whether a fonda is run from a
// home. The map screen said it until `10.4h`; she now registers here.
//
// ⚠️ A `Formulario`: the boxes are typed down the screen, and the one being typed
// in stays above the keyboard — *Busca tu dirección* goes to the top, so its list
// opens above the keys (`@/ui/Direccion`).
// ============================================================================

import { useState } from 'react';
import { Keyboard, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { puntoVigente, type SuDireccion } from '@/api/direccion';
import { DIRECTIONS_MAX, type GooglePoint } from '@/api/place';
import type { Lugar } from '@/lib/google';
import { useDondeEsta, type DondeEsta } from '@/lib/useGoogle';
import { ES } from '@/strings';
import { PALETTE, SIZE } from '@/theme/palette';
import { Banda } from '@/ui/Banda';
import { BotonLleno } from '@/ui/BotonLleno';
import { Campo } from '@/ui/Campo';
import { Direccion } from '@/ui/Direccion';
import { Formulario } from '@/ui/Formulario';
import { MapaFijo } from '@/ui/MapaFijo';

/** What the small map's box says when it has no point to draw. */
export function sinPuntoPara(donde: DondeEsta, conToque: boolean): string | null {
  switch (donde.kind) {
    case 'punto':
      return null;
    case 'incompleta':
      return ES.direccion.sinDireccion;
    case 'buscando':
      return ES.direccion.buscando;
    case 'ninguna':
      return conToque ? ES.direccion.ninguna : ES.direccion.ningunaFija;
    case 'sin-senal':
      return ES.direccion.sinSenal;
    case 'falla':
      return ES.direccion.falla;
  }
}

export function PantallaDireccion({
  antetitulo,
  paso,
  valor,
  elegido,
  onCambio,
  accion,
  busy,
  onAjustar,
  onVolver,
  onGuardar,
}: {
  antetitulo: string | null;
  /** *Paso 2 de 2* in the sign-up; nothing behind *Cambiar dirección*. */
  paso: string | null;
  valor: SuDireccion;
  /** The suggestion she picked in *Busca tu dirección*: its point is the small map's while the boxes read as it filled them. */
  elegido: Lugar | null;
  /** Every change; a pick comes with its place. */
  onCambio: (next: SuDireccion, elegido?: Lugar) => void;
  /** The button's words. */
  accion: string;
  busy: boolean;
  /** Opens *Ajusta el punto*. */
  onAjustar: () => void;
  onVolver: () => void;
  /** Checks and saves — with Google's point for her address, as drawn; answers `null`, or the sentence to show. */
  onGuardar: (google: GooglePoint | null) => Promise<string | null>;
}) {
  const insets = useSafeAreaInsets();
  const [problem, setProblem] = useState<string | null>(null);
  const propio = puntoVigente(valor);
  const donde = useDondeEsta(propio !== null ? null : valor.address, elegido);
  const punto = propio ?? (donde.kind === 'punto' ? donde.destino.punto : null);
  const google = propio === null && donde.kind === 'punto' ? donde.google : null;

  async function guardar() {
    if (busy) return;
    Keyboard.dismiss();
    setProblem(await onGuardar(google));
  }

  const quiet = { fontSize: SIZE.bodySize, color: PALETTE.tintaApagada } as const;

  return (
    <View style={{ flex: 1, backgroundColor: PALETTE.fondo }}>
      <Banda titulo={ES.direccion.titulo} antetitulo={antetitulo} volver={{ label: ES.direccion.volver, onPress: onVolver }} />
      <Formulario
        contentContainerStyle={{
          paddingHorizontal: SIZE.space * 2,
          paddingTop: SIZE.space * 2,
          paddingBottom: SIZE.space * 2 + insets.bottom,
          gap: SIZE.space,
        }}
      >
        {paso !== null && <Text style={{ ...quiet, fontSize: SIZE.smallSize, fontWeight: '600' }}>{paso}</Text>}
        <Direccion
          value={valor.address}
          onChange={(address, pick) => onCambio({ ...valor, address }, pick)}
          editable={!busy}
        />
        <MapaFijo punto={punto} sinPunto={sinPuntoPara(donde, true)} onAjustar={busy ? undefined : onAjustar} />
        {punto !== null && <Text style={quiet}>{ES.direccion.tocaElMapa}</Text>}
        <Campo
          label={ES.mapa.indicaciones}
          placeholder={ES.mapa.indicacionesEjemplo}
          value={valor.directions}
          onChangeText={(directions) => onCambio({ ...valor, directions })}
          maxLength={DIRECTIONS_MAX}
          autoCapitalize="sentences"
          submitBehavior="blurAndSubmit"
          editable={!busy}
        />
        <Text style={quiet}>{ES.direccion.vecinos}</Text>
        {problem !== null && (
          <Text style={{ fontSize: SIZE.bodySize, fontWeight: '600', color: PALETTE.error }}>{problem}</Text>
        )}
        <View style={{ marginTop: SIZE.rowGap }}>
          <BotonLleno variante="principal" label={accion} busy={busy} onPress={() => void guardar()} />
        </View>
      </Formulario>
    </View>
  );
}
