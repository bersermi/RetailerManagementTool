import { router } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { releaseSplash } from '@/lib/splash';
import { deviceStore, firstTime } from '@/lib/store';
import { ES } from '@/strings';
import { OPENING_KEY } from '@/theme/apertura';
import { TITULO } from '@/theme/letra';
import { PALETTE, SIZE } from '@/theme/palette';
import { Apertura } from '@/ui/Apertura';
import { BotonLleno } from '@/ui/BotonLleno';

// ============================================================================
// THE FIRST SCREEN — *VENDE HASTA EL ÚLTIMO PLATO*. Plan task `10.5-v-d`, the first run
// as the family-shell page drew it (the owner's ruling of 2026-11-05: the app's line on
// its opening screen, call 10): the cow's opening on Cocina's green (`@/ui/Apertura`),
// *Wera Cocina* and its line, then *Crear cuenta* and *Ya tengo cuenta* — each opening
// the way in on its own half (`/entrar`, `cuenta`).
//
// Where `@/auth/guard` sends anyone signed out, as Wera's welcome is (`8g`). ⚠️ THE
// OPENING PLAYS ONCE PER PHONE (`OPENING_KEY`): every later time — signed out, or back
// from the way in — the screen opens settled. ⚠️ THE SPLASH IS LET GO HERE, once the
// cow's pictures are in (`@/lib/splash`); every other screen's is let go by the guard.
// ⚠️ NO CHECK CAN SEE THE MOTION (ADR-035 §2.11): the emulator and his phones are the
// instruments; what is pinned is its geometry (`test/apertura.test.ts`).
// ============================================================================
export default function Hola() {
  // ⚠️ ASKED ONCE PER MOUNT: `firstTime` writes as it answers.
  const [plays] = useState(() => firstTime(deviceStore(), OPENING_KEY));

  return (
    <Apertura
      plays={plays}
      onCargada={releaseSplash}
      palabras={
        <View style={{ alignItems: 'center', gap: SIZE.rowGap }}>
          <Text accessibilityRole="header" style={{ fontSize: SIZE.titleSize + SIZE.space * 0.75, ...TITULO, color: PALETTE.tinta, textAlign: 'center' }}>
            {ES.nombre}
          </Text>
          <Text style={{ fontSize: SIZE.bodySize + 1, color: PALETTE.tintaApagada, textAlign: 'center' }}>{ES.lema}</Text>
        </View>
      }
      botones={
        <View style={{ gap: SIZE.rowGap }}>
          <BotonLleno variante="principal" label={ES.hola.crear} onPress={() => router.push('/entrar')} />
          <BotonLleno
            variante="discreto"
            label={ES.hola.tengo}
            onPress={() => router.push({ pathname: '/entrar', params: { cuenta: 'tengo' } })}
          />
        </View>
      }
    />
  );
}
