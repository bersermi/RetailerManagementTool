import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/auth/AuthProvider';
import { quienEntro } from '@/auth/quien';
import { ES } from '@/strings';
import { PALETTE, SIZE } from '@/theme/palette';
import { Banda } from '@/ui/Banda';
import { BotonLleno } from '@/ui/BotonLleno';

// ============================================================================
// WHERE A LOGIN WITH NO KITCHEN LANDS. Plan task `10.4b-iii-a`.
//
// Every first sign-in comes here, and so does a shop's owner who opens this app
// with her Wera login: Cocina reads kitchens only (`@/api/kitchen`), so her shop
// is not here and is not touched — it stays Wera's. `@/auth/guard` sends both.
//
// ⚠️ A PLACEHOLDER UNTIL `10.4b-iii-b`, WHICH MAKES THE KITCHEN HERE: her name,
// her trade, her address and her pin. Until then it says the account is made,
// which account it is (*Entraste como …*), that the kitchen comes next — and
// offers *Cerrar sesión*, so nobody is held on a screen with nothing to do.
// ⚠️ *Eliminar mi cuenta* joins it in `10.4b-iii-c`; until then an account made
// here is deleted from Wera, whose welcome screen offers it to a login with no
// shop (`10.4b-i`).
// ============================================================================
export default function Registro() {
  const insets = useSafeAreaInsets();
  const { session, signOut } = useAuth();
  const [leaving, setLeaving] = useState(false);
  const quien = quienEntro(session?.user);

  async function leave() {
    if (leaving) return;
    setLeaving(true);
    try {
      await signOut();
    } finally {
      setLeaving(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: PALETTE.fondo }}>
      <Banda titulo={ES.nueva.titulo} antetitulo={ES.nueva.antetitulo} />
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: SIZE.space * 2,
          paddingTop: SIZE.space * 2,
          paddingBottom: SIZE.space * 2 + insets.bottom,
          gap: SIZE.space,
        }}
      >
        <Text style={{ fontSize: SIZE.bodySize, fontWeight: '700', color: PALETTE.tinta }}>{ES.nueva.lista}</Text>
        {quien !== null && (
          <Text style={{ fontSize: SIZE.bodySize, color: PALETTE.tintaApagada }}>{ES.nueva.quien(quien)}</Text>
        )}
        <Text style={{ fontSize: SIZE.bodySize, lineHeight: 22, color: PALETTE.tinta }}>{ES.nueva.pronto}</Text>
        <View style={{ marginTop: SIZE.space }}>
          <BotonLleno variante="discreto" label={ES.auth.signOut} busy={leaving} onPress={() => void leave()} />
        </View>
      </ScrollView>
    </View>
  );
}
