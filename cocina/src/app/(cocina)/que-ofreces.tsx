import { router } from 'expo-router';
import { useEffect } from 'react';
import { BackHandler, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useKitchen, usePage } from '@/api/hooks';
import { EMPTY_PAGE, colorOf, defaultsFor } from '@/api/pagina';
import { ES } from '@/strings';
import { TITULO } from '@/theme/letra';
import { PALETTE, SIZE } from '@/theme/palette';
import { BotonLleno } from '@/ui/BotonLleno';
import { Dibujo } from '@/ui/Dibujo';
import { Llega } from '@/ui/Llega';

// ============================================================================
// *¿QUÉ OFRECES HOY?* — THE FIRST RUN'S LAST STEP. Plan task `10.5-v-d`, the family-shell
// page's first run (ruled 2026-11-05): *Paso 3 de 3*, right after *Registrar mi cocina*,
// where the guard sends a kitchen just made (`@/auth/guard`) — her first offer, or
// *Después*. Teach by doing: one sentence, one drawing — her own trade's, on her colour —
// and the button that fills it.
//
// ⚠️ *PUBLICAR MI PRIMERA OFERTA* OPENS THE ONE FORM (`/publicar`, `primera`), which goes on
// to her page when it is published; *Después* goes there at once. Either way the first run
// ends on her page as her neighbours see it (`/ya-estas`), then *Hoy*. ⚠️ ANDROID'S BACK
// LEAVES THE FIRST RUN FOR *HOY*: the sign-up behind this screen is finished, and this is
// her kitchen's room. Nothing here is written anywhere: a restart opens *Hoy*, where
// *Publicar una oferta* is the big button.
// ============================================================================
export default function QueOfreces() {
  const insets = useSafeAreaInsets();
  const kitchen = useKitchen();
  const page = usePage(kitchen?.id ?? null);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      router.replace('/');
      return true;
    });
    return () => sub.remove();
  }, []);

  const giro = kitchen?.giroPrincipal ?? null;
  const dibujo = defaultsFor(giro).dibujo;
  const color = colorOf(page.data ?? EMPTY_PAGE, giro);
  const lado = SIZE.tapTarget * 2;

  return (
    <View style={{ flex: 1, backgroundColor: PALETTE.fondo, paddingTop: insets.top + SIZE.space * 2, paddingBottom: insets.bottom + SIZE.space * 2 }}>
      <Text style={{ paddingHorizontal: SIZE.space * 2, fontSize: SIZE.smallSize, fontWeight: '600', color: PALETTE.tintaApagada }}>
        {ES.registro.paso(3)}
      </Text>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: SIZE.space * 2, gap: SIZE.space }}>
        <Llega i={0}>
          <View style={{ width: lado, height: lado, borderRadius: lado * 0.2237, overflow: 'hidden' }}>
            <Dibujo dibujo={dibujo} color={color} modo="cuadro" />
          </View>
        </Llega>
        <Llega i={1}>
          <Text accessibilityRole="header" style={{ fontSize: SIZE.titleSize + 4, ...TITULO, color: PALETTE.tinta, textAlign: 'center' }}>
            {ES.primera.titulo}
          </Text>
        </Llega>
        <Llega i={2}>
          <Text style={{ fontSize: SIZE.bodySize, lineHeight: 22, color: PALETTE.tinta, textAlign: 'center' }}>{ES.primera.texto}</Text>
        </Llega>
      </View>
      <Llega i={3} style={{ paddingHorizontal: SIZE.space * 2, gap: SIZE.rowGap }}>
        <BotonLleno
          variante="principal"
          label={ES.primera.publicar}
          onPress={() => router.push({ pathname: '/publicar', params: { primera: '1' } })}
        />
        <BotonLleno variante="discreto" label={ES.primera.despues} onPress={() => router.replace('/ya-estas')} />
      </Llega>
    </View>
  );
}
