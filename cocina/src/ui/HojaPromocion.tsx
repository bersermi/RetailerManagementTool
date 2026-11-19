import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { PromotionRow } from '@/api/promociones';
import { ICONO_DE_TIPO, bandaDeFila, estadoDe } from '@/lib/promociones';
import { ES } from '@/strings';
import { TITULO } from '@/theme/letra';
import { PALETTE, SIZE } from '@/theme/palette';
import { BandaPromocion } from '@/ui/BandaPromocion';
import { BotonLleno } from '@/ui/BotonLleno';

// ============================================================================
// *TU PROMOCIÓN* — THE SHEET A ROW OF *PROMOCIONES* OPENS (the family-shell page's `promoSheet`). Plan task
// `10.9g-ii`: its band as her page shows it, *Condiciones* opening its words under it; whether it is seen, and how
// many of today's offers wear its mark (`offers_today`, the database's — only while it is shown). Running:
// *Terminarla hoy* — at once, `end_promotion` — or *Seguir con ella*. Ended: *Usarla otra vez* (a new form filled
// from it) or *Cerrar*. ⚠️ A PROMOTION IS NEVER EDITED. ⚠️ No *Deshacer* after *Terminarla hoy*: `0087` keeps no way
// back, so the button itself is the confirmation, on a sheet she opened on purpose. A refusal is said on the sheet.
// ============================================================================

export function HojaPromocion({
  promocion,
  ocupado,
  onTerminar,
  onUsarla,
  onCerrar,
}: {
  promocion: PromotionRow | null;
  ocupado: boolean;
  onTerminar: (id: string) => Promise<string | null>;
  onUsarla: (p: PromotionRow) => void;
  onCerrar: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [problema, setProblema] = useState<string | null>(null);
  const [verCondiciones, setVerCondiciones] = useState(false);
  const id = promocion?.id ?? null;
  // Each time it opens on a promotion, nothing from the last one is left on it.
  useEffect(() => {
    setProblema(null);
    setVerCondiciones(false);
  }, [id]);

  async function terminar() {
    if (promocion === null || ocupado) return;
    setProblema(null);
    const fallo = await onTerminar(promocion.id);
    if (fallo !== null) setProblema(fallo);
  }

  const banda = promocion === null ? null : bandaDeFila(promocion);
  return (
    <Modal visible={promocion !== null} transparent animationType="fade" statusBarTranslucent navigationBarTranslucent onRequestClose={onCerrar}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(32, 29, 22, 0.45)' }}>
        <Pressable accessibilityRole="button" accessibilityLabel={ES.promociones.cerrar} onPress={onCerrar} style={{ flex: 1 }} />
        {promocion !== null && banda !== null && (
          <View
            style={{
              maxHeight: '85%',
              backgroundColor: PALETTE.fondo,
              borderTopLeftRadius: 22,
              borderTopRightRadius: 22,
              padding: SIZE.space * 1.5,
              paddingBottom: insets.bottom + SIZE.space * 1.5,
              gap: SIZE.space,
            }}
          >
            <Text accessibilityRole="header" style={{ fontSize: SIZE.titleSize - 2, ...TITULO, color: PALETTE.tinta }}>
              {ES.promociones.tuPromocion}
            </Text>
            <ScrollView contentContainerStyle={{ gap: SIZE.space }}>
              <BandaPromocion
                icono={ICONO_DE_TIPO[banda.tipo]}
                marca={banda.marca}
                hasta={banda.hasta}
                loQue={banda.loQue}
                mas={banda.mas}
                condiciones={ES.promociones.condiciones}
                onCondiciones={() => setVerCondiciones((v) => !v)}
              />
              {verCondiciones && <Text style={{ fontSize: SIZE.smallSize, lineHeight: 19, color: PALETTE.tintaApagada }}>{promocion.conditions}</Text>}
              <Text style={{ fontSize: SIZE.bodySize, lineHeight: 22, color: PALETTE.tinta }}>{estadoDe(promocion)}</Text>
            </ScrollView>
            {problema !== null && <Text style={{ fontSize: SIZE.bodySize, fontWeight: '600', color: PALETTE.error }}>{problema}</Text>}
            {promocion.state === 'activa' ? (
              <>
                <BotonLleno
                  variante="principal"
                  label={ocupado ? ES.promociones.terminando : ES.promociones.terminar}
                  busy={ocupado}
                  onPress={() => void terminar()}
                />
                <BotonLleno variante="discreto" label={ES.promociones.seguir} onPress={onCerrar} />
              </>
            ) : (
              <>
                <BotonLleno variante="principal" icon="repeat" label={ES.promociones.usarla} onPress={() => onUsarla(promocion)} />
                <BotonLleno variante="discreto" label={ES.promociones.cerrar} onPress={onCerrar} />
              </>
            )}
          </View>
        )}
      </View>
    </Modal>
  );
}
