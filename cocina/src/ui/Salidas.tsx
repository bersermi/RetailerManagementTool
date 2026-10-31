// ============================================================================
// HER WAY OUT: *CERRAR SESIÓN* AND *ELIMINAR MI CUENTA*. Plan task `10.4b-iii-c`.
//
// Drawn at the foot of the two screens a signed-in person stands on: where a
// kitchen is made (`(onboarding)/registro` — a new login, a shop's owner who
// opened this app, anyone who signed in with the wrong account) and her kitchen
// (`(cocina)/index`). Apple's rule 5.1.1(v) asks that an account an app made can
// be deleted inside it. Wera's welcome screen is the model
// (`app/src/app/(onboarding)/bienvenida.tsx`, plans `5R-k` and `10.4b-i`): the
// way out kept quiet at the bottom, every business that goes named, each one's
// name typed.
//
// ⚠️ IT DECIDES NOTHING. What goes, in what order, each box's label, whether the
// names match and the body sent are `@/api/account`'s; what Apple's sheet means
// is `@/auth/apple`'s; the round trips are `@/api/hooks`'.
//
// ⚠️ *ELIMINAR MI CUENTA* IS OFFERED ONCE WHAT GOES IS KNOWN, as Wera's is: the
// wrong warning is the one that matters, so with no answer yet — or no signal —
// there is nothing to tap. *Cerrar sesión* is always there.
// ============================================================================

import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { confirmWords, deleteArgs, deletionFrom, namesReady, takesAShop, typedLabel, type Typed } from '@/api/account';
import { useBusinessesThatGo, useDeleteMyAccount } from '@/api/hooks';
import { useAuth } from '@/auth/AuthProvider';
import { ES } from '@/strings';
import { PALETTE, SIZE } from '@/theme/palette';
import { BotonLleno } from '@/ui/BotonLleno';
import { Campo } from '@/ui/Campo';

export function Salidas({ openKitchenId }: { openKitchenId: string | null }) {
  const { signOut } = useAuth();
  const goes = useBusinessesThatGo();
  const { remove, busy: removing } = useDeleteMyAccount();
  const [signingOut, setSigningOut] = useState(false);
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState<Typed>({});
  const [problem, setProblem] = useState<string | null>(null);
  const deletion = deletionFrom(goes, openKitchenId);
  const ready = namesReady(deletion, typed);

  async function leave() {
    if (signingOut || removing) return;
    setSigningOut(true);
    try {
      await signOut();
    } finally {
      setSigningOut(false);
    }
  }

  // The message is cleared when the next attempt starts, not when a box changes.
  async function confirm() {
    if (removing || !ready) return;
    setProblem(null);
    setProblem(await remove(deleteArgs(deletion, typed)));
  }

  function cancel() {
    setOpen(false);
    setProblem(null);
    setTyped({});
  }

  const words = { fontSize: SIZE.bodySize, lineHeight: 22, color: PALETTE.tinta } as const;
  const quiet = { fontSize: SIZE.bodySize, color: PALETTE.tintaApagada } as const;
  const row = { minHeight: SIZE.tapTarget, justifyContent: 'center', alignItems: 'center' } as const;

  return (
    <View style={{ gap: SIZE.space }}>
      <BotonLleno variante="discreto" label={ES.auth.signOut} busy={signingOut} onPress={() => void leave()} />

      {!open ? (
        deletion.kind !== 'unknown' && (
          <Pressable accessibilityRole="button" onPress={() => setOpen(true)} style={row}>
            <Text style={quiet}>{ES.account.open}</Text>
          </Pressable>
        )
      ) : (
        <View style={{ gap: SIZE.rowGap }}>
          {deletion.kind === 'deletes' ? (
            <>
              <Text style={words}>{ES.account.businessesWarning(deletion.businesses.length)}</Text>
              <View>
                {deletion.businesses.map((business) => (
                  <Text key={business.id} style={{ ...words, fontWeight: '600' }}>
                    {`• ${ES.account.businessLine(business.name, business.kind)}`}
                  </Text>
                ))}
              </View>
              {takesAShop(deletion) && <Text style={quiet}>{ES.account.shopRecords}</Text>}
              {deletion.businesses.map((business) => (
                <Campo
                  key={business.id}
                  label={typedLabel(business)}
                  value={typed[business.id] ?? ''}
                  onChangeText={(text) => setTyped((before) => ({ ...before, [business.id]: text }))}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!removing}
                />
              ))}
            </>
          ) : (
            <Text style={words}>{ES.account.aloneWarning}</Text>
          )}

          {problem !== null && (
            <Text style={{ fontSize: SIZE.bodySize, fontWeight: '600', color: PALETTE.error }}>{problem}</Text>
          )}

          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: removing || !ready }}
            disabled={removing || !ready}
            onPress={() => void confirm()}
            style={{
              ...row,
              borderWidth: 1,
              borderColor: ready ? PALETTE.error : PALETTE.linea,
              borderRadius: SIZE.space / 2,
            }}
          >
            <Text style={{ fontSize: SIZE.bodySize, fontWeight: '600', color: ready ? PALETTE.error : PALETTE.tintaApagada }}>
              {removing ? ES.account.working : confirmWords(deletion)}
            </Text>
          </Pressable>

          <Pressable accessibilityRole="button" disabled={removing} onPress={cancel} style={row}>
            <Text style={quiet}>{ES.account.cancel}</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}
