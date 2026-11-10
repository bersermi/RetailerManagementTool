import { useState } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';

import { useAuth } from '@/auth/AuthProvider';
import { AVISO_URL, TERMINOS_URL } from '@/auth/aviso';
import { deviceStore } from '@/lib/store';
import { aceptarTerminos, aceptoTerminos } from '@/lib/terminos';
import { ES } from '@/strings';
import { TITULO } from '@/theme/letra';
import { PALETTE, SIZE } from '@/theme/palette';
import { BotonLleno } from '@/ui/BotonLleno';

// ============================================================================
// THE TERMS, ONCE, BEFORE HER FIRST THUMB. Plan task `10.5b-iv-a`, the owner's final design
// of 2026-11-10: a thumb about a person, seen by other kitchens, is user content for Google,
// and the fonda accepts the terms before she gives one. *Antes de tu primera calificación*:
// what a thumb does, that the neighbour never learns which kitchen gave it, *Términos de uso*
// and *Aviso de privacidad*, *Acepto y sigo*.
// ⚠️ KEPT ON THIS PHONE, PER LOGIN (`@/lib/terminos`) — the option with no migration, while the
// owner rules where it is kept (the plan's decisions block). NO CHECK CAN SEE IT.
// ============================================================================

/** Whether she accepted the terms on this phone, and her yes. */
export function useTerminos(): { readonly aceptados: boolean; readonly aceptar: () => void } {
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  const [aceptados, setAceptados] = useState(() => aceptoTerminos(deviceStore(), userId));
  return {
    aceptados: aceptados || aceptoTerminos(deviceStore(), userId),
    aceptar: () => {
      if (userId !== null) aceptarTerminos(deviceStore(), userId, new Date());
      setAceptados(true);
    },
  };
}

export function AntesDeCalificar({ onAcepto, onDespues }: { onAcepto: () => void; onDespues: (() => void) | null }) {
  return (
    <View style={{ gap: SIZE.space, padding: SIZE.space, borderRadius: SIZE.space, backgroundColor: PALETTE.superficie, borderWidth: 1, borderColor: PALETTE.linea }}>
      <Text style={{ ...TITULO, fontSize: 19, color: PALETTE.tinta }}>{ES.terminos.titulo}</Text>
      <Text style={{ fontSize: SIZE.bodySize, lineHeight: 22, color: PALETTE.tinta }}>{ES.terminos.texto}</Text>
      <Text style={{ fontSize: SIZE.bodySize, lineHeight: 22, color: PALETTE.tinta }}>{ES.terminos.nunca}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SIZE.space }}>
        {[
          { texto: ES.terminos.terminos, url: TERMINOS_URL },
          { texto: ES.terminos.aviso, url: AVISO_URL },
        ].map((enlace) => (
          <Pressable
            key={enlace.url}
            accessibilityRole="link"
            accessibilityLabel={enlace.texto}
            onPress={() => void Linking.openURL(enlace.url)}
            style={{ minHeight: SIZE.tapTarget - 8, justifyContent: 'center' }}
          >
            <Text style={{ fontSize: SIZE.bodySize - 1, fontWeight: '700', color: PALETTE.accion, textDecorationLine: 'underline' }}>{enlace.texto}</Text>
          </Pressable>
        ))}
      </View>
      <BotonLleno variante="principal" label={ES.terminos.acepto} onPress={onAcepto} />
      {onDespues !== null && <BotonLleno variante="discreto" label={ES.pulgar.despues} onPress={onDespues} />}
    </View>
  );
}
