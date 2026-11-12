import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Ajustes, AjustesPatch } from '@/api/ajustes';
import { useAjustes, useGuardarAjuste, useKitchen } from '@/api/hooks';
import type { Kitchen } from '@/api/kitchen';
import { ES } from '@/strings';
import { PALETTE, SIZE } from '@/theme/palette';
import { Banda } from '@/ui/Banda';
import { BotonLleno } from '@/ui/BotonLleno';
import { Formulario } from '@/ui/Formulario';
import { Llega } from '@/ui/Llega';

// ============================================================================
// ONE OF HER SETTINGS' SCREENS, PUSHED FROM *MI COCINA* (`10.5b-iv-c`): the band with
// *‹ Mi cocina*, then — once her settings are read — the screen's own rows, and under them
// the sentence of a save that did not land and *Listo*. ⚠️ `unknown` IS NOT `default`: while
// the read is out it says so, and a read that failed says so with *Intentar de nuevo* — never
// her settings drawn as the defaults, which a tap would then send as if they were hers.
// A `Formulario`, so *El desechable*'s box stays above the keyboard.
// ============================================================================

export interface Ajuste {
  readonly kitchen: Kitchen;
  readonly ajustes: Ajustes;
  /** Saves one setting; the sentence of a refusal is drawn under the rows. */
  readonly guardar: (patch: AjustesPatch) => void;
  readonly busy: boolean;
}

/** Back to *Mi cocina* — the screen under this one, or her kitchen when opened alone. */
export function volverAMiCocina() {
  if (router.canGoBack()) router.back();
  else router.replace('/mi-cocina');
}

export function PantallaDeAjustes({
  titulo,
  problema = null,
  setProblema,
  children,
  pie = null,
}: {
  titulo: string;
  /** The sentence of the last save that did not land, kept by the screen. */
  problema?: string | null;
  setProblema: (problema: string | null) => void;
  children: (ajuste: Ajuste) => ReactNode;
  /** What sits under *Listo*, when the screen has more to say. */
  pie?: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const kitchen = useKitchen();
  const ajustes = useAjustes(kitchen?.id ?? null);
  const { guardar, busy } = useGuardarAjuste(kitchen?.id ?? null);
  const quiet = { fontSize: SIZE.bodySize, color: PALETTE.tintaApagada } as const;

  const banda = <Banda titulo={titulo} antetitulo={kitchen?.displayName ?? null} volver={{ label: ES.ajustes.volver, onPress: volverAMiCocina }} />;

  if (kitchen === null || ajustes.data === undefined) {
    return (
      <View style={{ flex: 1, backgroundColor: PALETTE.fondo }}>
        {banda}
        <View style={{ padding: SIZE.space * 2, gap: SIZE.space }}>
          {ajustes.isError ? (
            <>
              <Text style={{ fontSize: SIZE.bodySize, color: PALETTE.tinta }}>{ES.ajustes.sinLeer}</Text>
              <BotonLleno label={ES.ajustes.otraVez} busy={ajustes.isFetching} onPress={() => void ajustes.refetch()} />
            </>
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: SIZE.rowGap }}>
              <ActivityIndicator color={PALETTE.accion} />
              <Text style={quiet}>{ES.ajustes.leyendo}</Text>
            </View>
          )}
        </View>
      </View>
    );
  }

  const ajuste: Ajuste = {
    kitchen,
    ajustes: ajustes.data,
    busy,
    guardar: (patch) => {
      setProblema(null);
      void guardar(patch).then(setProblema);
    },
  };

  return (
    <View style={{ flex: 1, backgroundColor: PALETTE.fondo }}>
      {banda}
      <Formulario
        contentContainerStyle={{ padding: SIZE.space * 1.5, paddingBottom: SIZE.space * 3 + insets.bottom, gap: SIZE.space * 1.5 }}
      >
        <Llega i={0} style={{ gap: SIZE.space * 1.5 }}>
          {children(ajuste)}
        </Llega>
        {problema !== null && <Text style={{ fontSize: SIZE.bodySize, fontWeight: '600', color: PALETTE.error }}>{problema}</Text>}
        <Llega i={1} style={{ gap: SIZE.space }}>
          <BotonLleno variante="principal" label={ES.ajustes.listo} onPress={volverAMiCocina} />
          {pie}
        </Llega>
      </Formulario>
    </View>
  );
}

/** A quiet line under the rows. */
export function Aclaracion({ children, color = PALETTE.tintaApagada }: { children: string; color?: string }) {
  return <Text style={{ fontSize: SIZE.smallSize, lineHeight: 19, color }}>{children}</Text>;
}
