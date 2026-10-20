// ============================================================================
// THE QUESTION ASKED BEFORE WORK IS THROWN AWAY — a centred box over a veil,
// *Seguir aquí* above *Salir y borrar*. Plan task `8g`, the owner's rulings of
// 2026-10-20 (*"wording is fine, go ahead with the fixes"*).
//
// ⚠️ `R14`: drawn by Desperdicio (*Te lo compro*), the product and supplier
// forms and Ajustes, so it lives here from its first day. Its look is
// `VaciarCarrito`'s — the box the owner asked for on 2026-09-24, *"a separate
// box in the center of the screen with its scrim"* — so the app asks every
// question of this kind the same way.
//
// ⚠️ THE SAFE ANSWER IS ON TOP AND IS WHAT THE VEIL MEANS: a tap outside keeps
// her where she is. Only the red button throws anything away.
// ============================================================================

import { Text, View } from 'react-native';

import { useDensity } from '@/theme/DensityProvider';
import { PALETTE } from '@/theme/palette';
import { Boton } from '@/ui/Boton';
import { BotonLleno } from '@/ui/BotonLleno';
import { Frase } from '@/ui/Frase';
import { Velo } from '@/ui/Velo';

export function Pregunta({
  shown,
  title,
  body,
  keep,
  go,
  onKeep,
  onGo,
}: {
  shown: boolean;
  title: string;
  body: string;
  keep: string;
  go: string;
  onKeep: () => void;
  onGo: () => void;
}) {
  const { scale } = useDensity();
  if (!shown) return null;
  return (
    <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}>
      <Velo onPress={onKeep} label={keep} />
      <View
        pointerEvents="box-none"
        style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: scale.space * 2 }}
      >
        <View
          style={{
            width: '100%',
            borderRadius: scale.space,
            backgroundColor: PALETTE.fondo,
            padding: scale.space * 1.5,
            gap: scale.space,
          }}
        >
          <Frase text={title} />
          <Text style={{ fontSize: scale.smallSize, color: PALETTE.tintaApagada, textAlign: 'center' }}>{body}</Text>
          <View style={{ gap: scale.rowGap }}>
            <BotonLleno label={keep} onPress={onKeep} variante="discreto" />
            <Boton label={go} tone={PALETTE.error} onPress={onGo} lleno />
          </View>
        </View>
      </View>
    </View>
  );
}
