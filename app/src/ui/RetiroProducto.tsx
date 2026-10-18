// ============================================================================
// *¿Ya no vendes este producto?* — the one irreversible tap on a product, now
// reached from two places: *Editar* on the shop's own product, and *Ya no lo
// vendo* on the page of a product from Wera's catalog (`8g`, the owner's
// rulings of 2026-10-17, which left a catalog product nothing else to edit).
// Moved here from `producto/[id].tsx` when the second door arrived (`R14`); the
// same box, the same three sentences, not a general confirmation.
//
// ⚠️⚠️ THREE SENTENCES AND NOT TWO, AND THE MIDDLE ONE IS THE WHOLE REASON THIS IS
// SAFE TO BE IRREVERSIBLE. `retireAsk` is the question, `retireWhy` says what goes
// AND that the sales already taken stay where they are, and `retireOnce` says it
// cannot be undone. Dropping `retireWhy` leaves *this cannot be undone* attached to
// a word a shopkeeper reads as *my sales are gone* ([[users-dont-do-bookkeeping]]).
//
// ⚠️ THE FAILURE REPLACES THE QUESTION RATHER THAN SITTING UNDER IT, so the box is
// never asking and refusing at the same time.
// ============================================================================

import { ActivityIndicator, View } from 'react-native';

import { ES } from '@/strings';
import { useDensity } from '@/theme/DensityProvider';
import { PALETTE } from '@/theme/palette';
import { Boton } from '@/ui/Boton';
import { Frase } from '@/ui/Frase';
import { Velo } from '@/ui/Velo';

export function RetiroProducto({
  asking,
  working,
  failed,
  onConfirm,
  onCancel,
}: {
  asking: boolean;
  working: boolean;
  failed: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { scale } = useDensity();
  if (!asking) return null;

  return (
    <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}>
      <Velo />
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          padding: scale.space * 2,
        }}
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
          {working ? (
            <>
              <ActivityIndicator color={PALETTE.accion} />
              <Frase text={ES.catalog.edit.working} />
            </>
          ) : failed !== null ? (
            <>
              <Frase text={failed} />
              <Boton
                label={ES.catalog.edit.retireNo}
                tone={PALETTE.accion}
                onPress={onCancel}
              />
            </>
          ) : (
            <>
              <Frase text={ES.catalog.edit.retireAsk} />
              <Frase text={ES.catalog.edit.retireWhy} />
              <Frase text={ES.catalog.edit.retireOnce} />
              <View style={{ gap: scale.rowGap }}>
                <Boton
                  label={ES.catalog.edit.retireYes}
                  tone={PALETTE.error}
                  onPress={onConfirm}
                />
                <Boton
                  label={ES.catalog.edit.retireNo}
                  tone={PALETTE.tintaApagada}
                  onPress={onCancel}
                />
              </View>
            </>
          )}
        </View>
      </View>
    </View>
  );
}
