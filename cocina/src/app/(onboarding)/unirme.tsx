import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCocinaDelCodigo, useUnirme } from '@/api/hooks';
import { codigoAlEscribir, codigoCompleto, codigoErrorMessage, esRechazoDelCodigo } from '@/api/invitar';
import { useNota } from '@/lib/NotaProvider';
import { ES } from '@/strings';
import { PALETTE, SIZE } from '@/theme/palette';
import { Banda } from '@/ui/Banda';
import { BotonLleno } from '@/ui/BotonLleno';
import { Campo } from '@/ui/Campo';
import { Formulario } from '@/ui/Formulario';

// ============================================================================
// *UNIRME A UNA COCINA* — A HELPER JOINS WITH THE CODE SHE WAS GIVEN. Plan task `10.9b-iii`, the
// owner's ruling of 2026-11-18: a code for one person, good for 24 hours, sixteen characters in four
// groups, no address asked, and she joins as a helper AT ONCE — no one confirms her by name; the
// owner removes her from *Quién trabaja aquí* if she must. Typed until a camera can scan it (`10.9c`).
//
// She types it, or pastes the whole message *Compartir el código* sent her: the box finds the code in
// it, groups it as she goes and reads `I`/`L` as `1` and `O` as `0`, as the database does
// (`@/api/invitar`, Wera's normaliser). No `maxLength`: it would cut a pasted message before the code.
// Once it is whole the database is asked the kitchen's name (`kitchen_of_code`) and the button says
// it — *Unirme a Fonda Doña Mari*; a code that will never work, or expired, says so and to ask for
// another. ⚠️ THE TAP JOINS (`redeem_invite`) AND THE KITCHEN GOES INTO HER LIST AT ONCE, so the
// guard takes her to *Hoy* — this screen is not the one where a kitchen is made, so she skips the
// set-up (`@/auth/guard`) — and *Hoy* says *Listo: ya ayudas en …*. NO CHECK CAN SEE THIS SCREEN
// (ADR-035 §2.11): the phone is its instrument.
// ============================================================================

export default function Unirme() {
  const insets = useSafeAreaInsets();
  const [escrito, setEscrito] = useState('');
  const [problema, setProblema] = useState<string | null>(null);
  const codigo = codigoCompleto(escrito);
  const cocina = useCocinaDelCodigo(codigo);
  const { unirme, busy } = useUnirme();
  const { avisar } = useNota();

  const volver = () => (router.canGoBack() ? router.back() : router.replace('/empezar'));
  const nombre = codigo !== null ? (cocina.data ?? null) : null;
  const rechazo = codigo !== null && cocina.isError ? codigoErrorMessage(cocina.error) : null;

  async function unirmeYa() {
    if (codigo === null || nombre === null) return;
    setProblema(null);
    const fallo = await unirme(codigo);
    if (fallo !== null) setProblema(fallo);
    else avisar(ES.unirme.listo(nombre));
  }

  return (
    <View style={{ flex: 1, backgroundColor: PALETTE.fondo }}>
      <Banda titulo={ES.unirme.titulo} antetitulo={ES.unirme.antetitulo} volver={{ label: ES.unirme.volver, onPress: volver }} />
      <Formulario
        contentContainerStyle={{
          paddingHorizontal: SIZE.space * 2,
          paddingTop: SIZE.space * 2,
          paddingBottom: SIZE.space * 2 + insets.bottom,
          gap: SIZE.space,
        }}
      >
        <Text style={{ fontSize: SIZE.bodySize, lineHeight: 22, color: PALETTE.tinta }}>{ES.unirme.texto}</Text>
        <Campo
          label={ES.unirme.codigo}
          placeholder={ES.unirme.codigoEjemplo}
          value={escrito}
          onChangeText={(texto) => {
            setProblema(null);
            setEscrito(codigoAlEscribir(texto));
          }}
          autoCapitalize="characters"
          autoCorrect={false}
          autoComplete="off"
          spellCheck={false}
          submitBehavior="blurAndSubmit"
        />

        {codigo !== null && cocina.isFetching && nombre === null && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: SIZE.rowGap }}>
            <ActivityIndicator color={PALETTE.accion} />
            <Text style={{ fontSize: SIZE.bodySize, color: PALETTE.tintaApagada }}>{ES.unirme.buscando}</Text>
          </View>
        )}
        {rechazo !== null && !cocina.isFetching && (
          <>
            <Text style={{ fontSize: SIZE.bodySize, fontWeight: '600', color: PALETTE.error }}>{rechazo}</Text>
            {!esRechazoDelCodigo(cocina.error) && (
              <BotonLleno label={ES.unirme.otraVez} onPress={() => void cocina.refetch()} />
            )}
          </>
        )}
        {problema !== null && <Text style={{ fontSize: SIZE.bodySize, fontWeight: '600', color: PALETTE.error }}>{problema}</Text>}
        {nombre !== null && (
          <View style={{ marginTop: SIZE.space }}>
            <BotonLleno
              variante="principal"
              label={busy ? ES.unirme.uniendo : ES.unirme.unirme(nombre)}
              busy={busy}
              onPress={() => void unirmeYa()}
            />
          </View>
        )}
      </Formulario>
    </View>
  );
}
