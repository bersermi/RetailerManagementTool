// ============================================================================
// HER WAY OUT: *CERRAR SESIÓN* AND *ELIMINAR MI CUENTA*. Plan task `10.4b-iii-c`.
// And, on her kitchen, *ELIMINAR ESTA COCINA* (`10.5-iii-c`, `0077`).
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
//
// ⚠️ *ELIMINAR ESTA COCINA* (the owner's ruling of 2026-11-04) is offered only on
// her kitchen, and only once the same read says it is hers alone
// (`kitchenAlone`) — where a kitchen is made there is none to delete. It names
// what goes and what stays, asks the kitchen's name, and keeps her signed in: the
// guard moves her once her kitchen leaves her list. One of the two opens at a
// time, so a box is never typed under the wrong warning.
//
// ⚠️ `10.5b-iv-c`: A PLATE STILL TO HAND OVER (`TD014`) is said on both — *Eliminar mi cuenta* asks
// the database about the businesses that go before Apple's sheet opens (`pendingIds`).
// ============================================================================

import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import {
  confirmWords,
  deleteArgs,
  deleteKitchenArgs,
  deletionFrom,
  kitchenAlone,
  nameMatches,
  namesReady,
  pendingIds,
  takesAShop,
  typedLabel,
  type Typed,
} from '@/api/account';
import { useBusinessesThatGo, useDeleteKitchen, useDeleteMyAccount } from '@/api/hooks';
import { useAuth } from '@/auth/AuthProvider';
import { ES } from '@/strings';
import { PALETTE, SIZE } from '@/theme/palette';
import { BotonLleno } from '@/ui/BotonLleno';
import { Campo } from '@/ui/Campo';

export function Salidas({ openKitchenId }: { openKitchenId: string | null }) {
  const { signOut } = useAuth();
  const goes = useBusinessesThatGo();
  const { remove, busy: removing } = useDeleteMyAccount();
  const { remove: removeKitchen, busy: removingKitchen } = useDeleteKitchen();
  const [signingOut, setSigningOut] = useState(false);
  const [open, setOpen] = useState<'cuenta' | 'cocina' | null>(null);
  const [typed, setTyped] = useState<Typed>({});
  const [kitchenTyped, setKitchenTyped] = useState('');
  const [problem, setProblem] = useState<string | null>(null);
  const deletion = deletionFrom(goes, openKitchenId);
  const ready = namesReady(deletion, typed);
  const alone = kitchenAlone(goes, openKitchenId);
  const kitchenReady = alone !== null && nameMatches(kitchenTyped, alone.name);
  // A kitchen no longer hers alone closes its panel rather than leave it empty.
  const panel = open === 'cocina' && alone === null ? null : open;

  async function leave() {
    if (signingOut || removing || removingKitchen) return;
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
    setProblem(await remove(deleteArgs(deletion, typed), pendingIds(deletion)));
  }

  // ⚠️ On success she stays signed in, so the block closes itself: with a second
  // kitchen of hers, this screen stays and opens on it.
  async function confirmKitchen() {
    if (removingKitchen || alone === null || !kitchenReady) return;
    setProblem(null);
    const answer = await removeKitchen(deleteKitchenArgs(alone, kitchenTyped));
    if (answer === null) cancel();
    else setProblem(answer);
  }

  function cancel() {
    setOpen(null);
    setProblem(null);
    setTyped({});
    setKitchenTyped('');
  }

  const failure = problem !== null && (
    <Text style={{ fontSize: SIZE.bodySize, fontWeight: '600', color: PALETTE.error }}>{problem}</Text>
  );

  const words = { fontSize: SIZE.bodySize, lineHeight: 22, color: PALETTE.tinta } as const;
  const quiet = { fontSize: SIZE.bodySize, color: PALETTE.tintaApagada } as const;
  const row = { minHeight: SIZE.tapTarget, justifyContent: 'center', alignItems: 'center' } as const;

  return (
    <View style={{ gap: SIZE.space }}>
      <BotonLleno variante="discreto" label={ES.auth.signOut} busy={signingOut} onPress={() => void leave()} />

      {panel === null ? (
        <>
          {alone !== null && (
            <Pressable accessibilityRole="button" onPress={() => setOpen('cocina')} style={row}>
              <Text style={quiet}>{ES.kitchenDeletion.open}</Text>
            </Pressable>
          )}
          {deletion.kind !== 'unknown' && (
            <Pressable accessibilityRole="button" onPress={() => setOpen('cuenta')} style={row}>
              <Text style={quiet}>{ES.account.open}</Text>
            </Pressable>
          )}
        </>
      ) : panel === 'cocina' && alone !== null ? (
        <View style={{ gap: SIZE.rowGap }}>
          <Text style={words}>{ES.kitchenDeletion.warning}</Text>
          <Text style={quiet}>{ES.kitchenDeletion.keeps}</Text>
          <Campo
            label={typedLabel(alone)}
            value={kitchenTyped}
            onChangeText={setKitchenTyped}
            autoCapitalize="none"
            autoCorrect={false}
            editable={!removingKitchen}
          />

          {failure}

          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: removingKitchen || !kitchenReady }}
            disabled={removingKitchen || !kitchenReady}
            onPress={() => void confirmKitchen()}
            style={{
              ...row,
              borderWidth: 1,
              borderColor: kitchenReady ? PALETTE.error : PALETTE.linea,
              borderRadius: SIZE.space / 2,
            }}
          >
            <Text style={{ fontSize: SIZE.bodySize, fontWeight: '600', color: kitchenReady ? PALETTE.error : PALETTE.tintaApagada }}>
              {removingKitchen ? ES.account.working : ES.kitchenDeletion.confirm}
            </Text>
          </Pressable>

          <Pressable accessibilityRole="button" disabled={removingKitchen} onPress={cancel} style={row}>
            <Text style={quiet}>{ES.account.cancel}</Text>
          </Pressable>
        </View>
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

          {failure}

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
