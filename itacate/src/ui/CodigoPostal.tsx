import { useState } from 'react';
import { Text, View } from 'react-native';

import { codigoPostalDe } from '@/lib/google';
import { mensajeDelCodigo, type Codigo } from '@/lib/ubicacion';
import { useCodigoPostal } from '@/lib/useGoogle';
import { ES } from '@/strings';
import { PALETTE, SIZE } from '@/theme/palette';
import { BotonLleno } from '@/ui/BotonLleno';
import { Campo } from '@/ui/Campo';

// ============================================================================
// HER POSTAL CODE, WHEN HER LOCATION CANNOT BE USED. Plan task `10.5-iv-a-i`, the
// owner's ruling of 2026-11-03: declined, or approximate on her phone — her postal
// code, typed, standing for where she is (the map joins it in `10.5-iv-b`).
//
// ⚠️ ASKED OF GOOGLE BY HER OWN PHONE, FOR HER ALONE, AND NEVER KEPT: the five
// digits go to Geocoding when she presses *Buscar* (`@/lib/useGoogle`), and the
// point that comes back lives in the list's memory until she changes it or the app
// closes — never on the phone's disk, never sent to the database.
// ============================================================================
export function CodigoPostal({
  motivo,
  onLugar,
  onFocus,
}: {
  motivo: string | null;
  onLugar: (codigo: Codigo) => void;
  /** Since `10.5-iv-b-i`: on *Cerca* the box sits in the sheet over the map, which rises full as she types. */
  onFocus?: () => void;
}) {
  const [escrito, setEscrito] = useState('');
  const [problema, setProblema] = useState<string | null>(null);
  const { buscar, buscando } = useCodigoPostal();

  async function enviar() {
    if (buscando) return;
    const cp = codigoPostalDe(escrito);
    if (cp === null) {
      setProblema(ES.cerca.codigo.corto);
      return;
    }
    setProblema(null);
    const respuesta = await buscar(cp).catch(() => ({ kind: 'falla' }) as const);
    if (respuesta.kind === 'punto') onLugar({ cp, punto: respuesta.punto });
    else setProblema(mensajeDelCodigo(respuesta));
  }

  return (
    <View style={{ gap: SIZE.space }}>
      {motivo !== null && <Text style={{ fontSize: SIZE.bodySize, lineHeight: 22, color: PALETTE.tinta }}>{motivo}</Text>}
      <Campo
        label={ES.cerca.codigoPostal}
        value={escrito}
        onChangeText={setEscrito}
        keyboardType="number-pad"
        maxLength={5}
        returnKeyType="search"
        onSubmitEditing={() => void enviar()}
        onFocus={onFocus}
      />
      {problema !== null && <Text style={{ fontSize: SIZE.smallSize, color: PALETTE.error }}>{problema}</Text>}
      <BotonLleno label={ES.cerca.buscar} icon="magnify" variante="principal" busy={buscando} onPress={() => void enviar()} />
    </View>
  );
}
