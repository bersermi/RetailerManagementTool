import { Text, View } from 'react-native';

import type { RewardRow } from '@/api/tarjeta';
import { premiosDe } from '@/lib/tarjeta';
import { ES } from '@/strings';
import { PALETTE, SIZE } from '@/theme/palette';
import { BotonLleno } from '@/ui/BotonLleno';
import { Hoja } from '@/ui/Hoja';
import { Opcion } from '@/ui/Opcion';

// ============================================================================
// *¿COBRAR TU PREMIO AHORA?* — after a stamp at a kitchen where she has a reward to claim. Plan task
// `10.9e-iii`, the family-shell page's `cobrarSheet` (round 3: *"giving the option of which reward to claim
// … kills two birds with one rock"* — she always chooses which; no oldest-first rule): *En Fonda Doña Mari
// tienes 2. Elige cuál:*, a row per reward with *Ganado el 5 de noviembre*, and *Ahora no, solo mi sello*.
// A tap on a reward is her choice; what it does is the screen's (`onElegir`). NO CHECK CAN SEE THIS SHEET
// (ADR-035 §2.11): the phone is its instrument.
// ============================================================================

export function HojaCobrar({
  visible,
  cocina,
  premios,
  busy,
  onElegir,
  onCerrar,
}: {
  visible: boolean;
  cocina: string;
  premios: readonly RewardRow[];
  busy: boolean;
  onElegir: (rewardId: string) => void;
  onCerrar: () => void;
}) {
  return (
    <Hoja visible={visible} titulo={ES.cobrar.titulo} onCerrar={onCerrar}>
      <View style={{ gap: SIZE.rowGap }}>
        <Text style={{ fontSize: SIZE.bodySize, color: PALETTE.tinta }}>{ES.cobrar.texto(cocina, premios.length)}</Text>
        <View accessibilityRole="radiogroup" style={{ gap: SIZE.rowGap }}>
          {premiosDe(premios).map((p) => (
            <Opcion key={p.id} titulo={p.que} detalle={p.cuando} elegida={false} onPress={() => (busy ? undefined : onElegir(p.id))} />
          ))}
        </View>
        {busy && <Text style={{ fontSize: SIZE.smallSize, color: PALETTE.tintaApagada }}>{ES.cobrar.cobrando}</Text>}
        <BotonLleno variante="discreto" label={ES.cobrar.ahoraNo} onPress={onCerrar} />
      </View>
    </Hoja>
  );
}
