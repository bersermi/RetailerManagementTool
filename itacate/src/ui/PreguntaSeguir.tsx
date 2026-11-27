import { useState } from 'react';
import { Text, View } from 'react-native';

import { useSeguir, type FallaDeSeguir } from '@/api/hooks';
import { ES } from '@/strings';
import { PALETTE, SIZE } from '@/theme/palette';
import { ESQUINA } from '@/theme/density';
import { BotonLleno } from '@/ui/BotonLleno';

// ============================================================================
// *¿SEGUIR A …?* — ONCE, AFTER HER FIRST PICKUP AT A KITCHEN. Plan task `10.9d-ii`, the owner's
// ruling G20 of 2026-11-17 (*"She follows from the page's Seguir, and once after her first
// pickup"*). On *Apartados*, under *Ya lo tienes* the moment she swipes, and under the plate in
// *Anteriores* while it can still be rated — so a plate the kitchen handed over by typing her code
// asks too. WHEN is `@/lib/misCocinas`' `preguntarSeguir`, pure and pinned: nothing is kept on the
// phone, and a second plate there is never her first. *Seguir* follows (the bell stays off,
// `0084`). ⚠️ *Ahora no* is kept IN MEMORY while the app runs (`respondida`), so leaving *Apartados*
// and coming back does not ask again under the same plate (found by the review of `10.9d-ii`);
// nothing goes to the phone's disk, so a fresh open may ask once more while the plate's window lasts.
// NO CHECK CAN SEE THIS (ADR-035 §2.11): the phone is its instrument.
// ============================================================================

/** Plates whose question she answered while the app runs — memory only. */
const RESPONDIDAS = new Set<string>();

export function respondida(id: string): boolean {
  return RESPONDIDAS.has(id);
}

export function marcarRespondida(id: string): void {
  RESPONDIDAS.add(id);
}

export function PreguntaSeguir({ cocinaId, nombre, onListo }: { cocinaId: string; nombre: string; onListo: () => void }) {
  const { cambiar, busy } = useSeguir();
  const [falla, setFalla] = useState<FallaDeSeguir | null>(null);

  async function seguir() {
    setFalla(null);
    const resultado = await cambiar(cocinaId, { siguiendo: true });
    if (resultado.ok) onListo();
    else setFalla(resultado.falla);
  }

  return (
    <View
      style={{
        alignSelf: 'stretch',
        gap: SIZE.rowGap,
        padding: SIZE.space,
        borderRadius: ESQUINA.hoja,
        backgroundColor: PALETTE.accionSuave,
      }}
    >
      <Text style={{ fontSize: SIZE.bodySize, fontWeight: '700', color: PALETTE.tinta }}>{ES.seguir.pregunta(nombre)}</Text>
      <Text style={{ fontSize: SIZE.smallSize, lineHeight: 19, color: PALETTE.tintaApagada }}>{ES.seguir.preguntaDetalle}</Text>
      {falla !== null && (
        <Text style={{ fontSize: SIZE.smallSize, lineHeight: 19, fontWeight: '600', color: PALETTE.error }}>{ES.seguir.fallas[falla]}</Text>
      )}
      <View style={{ flexDirection: 'row', gap: SIZE.rowGap }}>
        <View style={{ flex: 1 }}>
          <BotonLleno label={ES.seguir.si} icon="heart-outline" variante="principal" busy={busy} onPress={() => void seguir()} />
        </View>
        <View style={{ flex: 1 }}>
          <BotonLleno label={ES.seguir.ahoraNo} variante="discreto" onPress={onListo} />
        </View>
      </View>
    </View>
  );
}
