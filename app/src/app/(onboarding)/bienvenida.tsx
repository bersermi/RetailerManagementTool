import { useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { deleteArgs } from '@/api/account';
import { EMPTY_ADDRESS, checkAddress, type AddressForm } from '@/api/collection';
import {
  useDeleteMyAccount,
  useMyAccessRequests,
  useOnboardWorkspace,
  useRedeemInvite,
  useRequestAccess,
  useStarterCatalog,
  useWaitForApproval,
} from '@/api/hooks';
import { checkCredential, classifyCredential } from '@/api/redeem';
import { principalDe, toggledInOrder } from '@/api/emblema';
import { choiceFrom } from '@/api/starterCatalog';
import { SelectorCatalogo } from '@/ui/SelectorCatalogo';
import { checkShopName } from '@/api/workspace';
import { useAuth } from '@/auth/AuthProvider';
import { whatsappChooseUrl } from '@/auth/support';
import { ES } from '@/strings';
import { BotonLleno } from '@/ui/BotonLleno';
import { Direccion } from '@/ui/Direccion';
import { useDensity } from '@/theme/DensityProvider';
import { PALETTE } from '@/theme/palette';
import { TITULO } from '@/theme/letra';

const NOTHING_EXCLUDED: ReadonlySet<string> = new Set();

// ============================================================================
// THE NO-WORKSPACE LANDING. Plan task 5b-i.
//
// Where a signed-in person who belongs to no shop is sent, by `@/auth/guard`.
// Two questions and a button, and the second question is C1.7.
//
// ⚠️ THE IVA QUESTION IS THE REASON THIS SCREEN IS NOT A TEXT FIELD AND A
// SUBMIT. ADR-035 §2.8: shelf prices in Mexican retail include IVA and supplier
// invoices break it out; capturing both raw overstates margin by up to the tax
// rate, "consistently, plausibly, invisibly". `prices_include_tax` decides how
// every recorder splits net from tax for the life of the shop, and NOTHING
// LATER ASKS AGAIN — so this one tap is the only chance the ledger gets.
//
// ⚠️ IT DEFAULTS TO YES, WHICH IS WHAT THE COLUMN DEFAULTS TO AND WHAT ALMOST
// EVERY SHOP IS. `workspace.prices_include_tax` is `default true` (`0001`), and
// the revenue ruling of 2026-09-14 rests on it. A default that matches the
// common case is also the one a person who does not read the question gets
// right by not answering it.
//
// ⚠️ AND IT ASKS FOR ONE NAME, NOT TWO. `onboard_workspace` names the first
// location after the shop when it is passed no location name — measured against
// the applied schema, not assumed — so a one-store shop is never asked what the
// building is called as well. A second store is `location`'s own flow.
//
// ⚠️⚠️ 5b-ii-b-2 GAVE IT A SECOND HALF, AND THE TWO HALVES ARE FOR DIFFERENT
// PEOPLE. Everything above is for the person who is STARTING a shop. Below the
// rule is the person who was INVITED to one — she has a code in a WhatsApp
// message and no interest whatever in the IVA question. Both land here, because
// `guard.ts` has exactly one answer for "signed in, belongs to no shop", and
// neither of them can be asked which kind of person she is before she has told
// us.
//
// ⚠️ THE ORDER IS CREATE-THEN-JOIN AND IT IS A JUDGEMENT, NOT AN ACCIDENT. The
// first launch of this app in a shop is always the owner creating it; a joiner
// arrives afterwards, knows she was invited, and is looking for somewhere to put
// a code — which a section headed *"¿Te invitaron a una tienda?"* is. Reversing
// it would put a box she cannot fill in front of every founding owner. ⚠️ NO
// CHECK CAN SEE THIS EITHER (`R9`) — it is the owner's phone, and it is one
// `<View>` move if he reads it the other way.
//
// ⚠️ ONE BOX AND NOT TWO, which is the `P2` decision of the `5b-ii-b` sizing and
// is the only thing on this screen that would be expensive to change later: an
// invite token and the shop's join code are the same alphabet and differ only in
// LENGTH, and the person holding one was not told which she has. `@/api/redeem`
// decides, and `5b-iii` adds the second destination without adding a second box.
//
// ⚠️⚠️ 5b-iii-b ADDED THAT SECOND DESTINATION, AND THE BOX DID NOT CHANGE — WHICH
// IS THE WHOLE RETURN ON THE `P2` DECISION. Eight characters used to be a
// sentence saying this app could not spend a shop's code; it is now a call to
// `request_access`. One box, two doors, and `classifyCredential` is the only
// thing that decides — the same function, answering the same question, now with
// somewhere to send both answers.
//
// ⚠️⚠️ AND THE TWO DOORS END IN DIFFERENT PLACES, WHICH IS THE ONE THING A
// JOINER MUST NOT BE CONFUSED ABOUT. A token is a membership: the guard moves
// her off this screen within a frame and she never reads anything here. A shop
// code is an ASK — nobody has agreed to anything, and she stays exactly where
// she is, looking at the pending block below. ⚠️ EXCEPT WHEN IT IS NOT: `0029`'s
// `D7` lets a person who was already invited by email straight in when she types
// the shop code, and then the code path ends like the token path. Nothing on
// this screen branches on that — the guard does, off the membership read — which
// is why `useRequestAccess` invalidates it on every success.
//
// ⚠️ THE PENDING BLOCK IS A HALF LOOP AND THE PLAN SAYS SO: she asks, she sees
// that she asked, and nothing in this app can admit her until the approval
// screen ships. The sentence is written so it stays true afterwards — the wait
// is real either way, because a person has to tap approve.
//
// ⚠️ NO CHECK IN THIS REPOSITORY CAN SEE THIS FILE. §2.11 refuses suites over
// rendering, so what is asserted lives behind it: `checkShopName` and
// `onboardArgs` in `@/api/workspace`, `checkCredential` and `redeemArgs` in
// `@/api/redeem`, the redirect in `@/auth/guard`, and the two round trips
// themselves in `docs/checks/5b-i-api-contract.sh` and
// `docs/checks/5b-ii-b-2-redeem-contract.sh`. That this screen wires them
// together is the owner's own phone.
// ============================================================================
export default function Bienvenida() {
  const { scale } = useDensity();
  const insets = useSafeAreaInsets();
  const { create, busy } = useOnboardWorkspace();

  const { redeem, busy: redeeming } = useRedeemInvite();
  const { ask, busy: asking } = useRequestAccess();
  const { pending } = useMyAccessRequests();
  useWaitForApproval(pending !== null);

  // ⚠️ ONE BUSY FLAG FOR ONE BOX. Two mutations sit behind it and a person can
  // only be running one of them, because the credential she typed picks which.
  const joining = redeeming || asking;

  const [name, setName] = useState('');
  const [pricesIncludeTax, setPricesIncludeTax] = useState(true);
  // ⚠️ `8k` (`0058`): THE STORE'S ADDRESS, REQUIRED — the owner, 2026-10-16:
  // *"at least Street, number, ciudad and Código Postal."* It is where Te lo
  // compro goes, and its código postal decides whether it is offered at all.
  const [address, setAddress] = useState<AddressForm>(EMPTY_ADDRESS);
  const [problem, setProblem] = useState<string | null>(null);

  // ⚠️⚠️ THE THIRD QUESTION, `9d`: WHAT THE SHOP SELLS. The owner's ruling of
  // 2026-10-01 — choose giros, untick what you don't sell, and the rest arrives
  // with the shop. Nothing chosen is *Omitir*: the shop is created empty and
  // Productos' *Agregar del catálogo* is the same import later. ⚠️ Without
  // signal the catalog cannot be read, and the shop can still be created — the
  // section says so instead of spinning (`useStarterCatalog`).
  const starter = useStarterCatalog();
  // ⚠️ `8g` (`0056`): THE ORDER THE GIROS WERE PICKED IN, AND NOT JUST WHICH —
  // the owner's ruling of 2026-10-16: *"the first giro a user picks is the 'Main'
  // giro, marked with a star."* The first is stored on the shop; it picks the
  // drawing in the tabs' band. `@/api/emblema` keeps the order.
  const [orden, setOrden] = useState<readonly string[]>([]);
  const giros: ReadonlySet<string> = new Set(orden);
  // ⚠️ NOTHING IS UNTICKED HERE SINCE 2026-10-14 (the owner: *"just let the user
  // pick one giro or more"*): the list is `Agregar del catálogo`'s alone, and a
  // product a shop does not sell is retired from Productos afterwards (`0054`).
  const excluded = NOTHING_EXCLUDED;

  const [credential, setCredential] = useState('');
  const [joinProblem, setJoinProblem] = useState<string | null>(null);

  // ⚠️⚠️ THE WAY OUT, `5R-k`, the owner's ruling of 2026-10-13. Until it, this
  // screen had none: *Cerrar sesión* and *Eliminar mi cuenta* live in Ajustes,
  // and Ajustes needs a shop. Somebody who came in by the wrong door — a second
  // Google account, or Apple with the address hidden, which makes a NEW login —
  // was held here until they created a shop they did not want. And an account
  // this app made could not be deleted inside it, which Apple's rule 5.1.1(v)
  // requires of every one.
  //
  // ⚠️ NO NAME TO TYPE AND NO ROSTER TO WAIT FOR, unlike Ajustes' sheet. A
  // login on this screen belongs to no shop, so `deleteArgs` sends `null` and
  // `0053` has nothing to refuse it over. Apple's sheet still comes first for
  // a login with an Apple link: that is `useDeleteMyAccount`'s, not this file's.
  const { signOut } = useAuth();
  const { remove, busy: removing } = useDeleteMyAccount();
  const [leaving, setLeaving] = useState(false);
  const [leaveProblem, setLeaveProblem] = useState<string | null>(null);

  async function confirmLeave() {
    if (removing) return;
    setLeaveProblem(null);
    setLeaveProblem(await remove(deleteArgs({ kind: 'leaves' }, '')));
  }

  // The same discipline as the way in: the message is cleared when the next
  // attempt starts, not when a field changes. A message that disappears on the
  // first keystroke is one a slow reader never finishes.
  async function submit() {
    if (busy) return;
    setProblem(null);
    const checked = checkShopName(name);
    if (!checked.ok) {
      setProblem(checked.message);
      return;
    }
    const addressIssue = checkAddress(address);
    if (addressIssue !== null) {
      setProblem(ES.address.issues[addressIssue]);
      return;
    }
    // ⚠️ IT NAVIGATES NOWHERE ON SUCCESS. The guard sends them to Inicio the
    // moment the membership read comes back — see `@/api/hooks`.
    const choice = choiceFrom(starter.template, giros, excluded, starter.holding);
    setProblem(
      await create(
        { displayName: checked.displayName, pricesIncludeTax },
        choice,
        principalDe(orden),
        address,
      ),
    );
  }

  // The joining half. ⚠️ IT NAVIGATES NOWHERE EITHER, and here that is the whole
  // mechanism: `useRedeemInvite` invalidates the membership read, it comes back
  // `member`, and `guard.ts` moves her to Inicio. A second opinion on this screen
  // would race the first.
  //
  // ⚠️ AND A SECOND TAP IS NOT GUARDED AGAINST BEYOND `busy`, deliberately:
  // `0028` answers the same caller's second redemption `already_redeemed` rather
  // than an error, which is the ordinary case on a connection the pilot store
  // loses routinely. The success path is identical.
  // ⚠️⚠️ THE FORK IS HERE AND IT IS THE ONLY ONE ON THIS SCREEN. `checkCredential`
  // says whether either door can be called at all; `classifyCredential` says
  // which. Both come from `@/api/redeem`, which is where the lengths are
  // measured against a live database by the contract checks.
  //
  // ⚠️ THE ASK'S SUCCESS IS NOT RENDERED AS A MESSAGE — it becomes the pending
  // block below, off a read that has just been invalidated. A sentence here
  // would be a second copy of the same fact, and the one this screen holds would
  // be the one that could disagree with the database.
  async function join() {
    if (joining) return;
    setJoinProblem(null);
    const issue = checkCredential(credential);
    if (issue !== null) {
      setJoinProblem(ES.join.issues[issue]);
      return;
    }
    if (classifyCredential(credential).kind === 'code') {
      setJoinProblem((await ask(credential)).error);
      return;
    }
    setJoinProblem(await redeem(credential));
  }

  const choice = (selected: boolean) =>
    ({
      minHeight: scale.tapTarget,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: scale.space,
      borderRadius: scale.space / 2,
      borderWidth: selected ? 2 : 1,
      opacity: busy ? 0.6 : 1,
      flex: 1,
    }) as const;

  return (
    <ScrollView
      contentContainerStyle={{
        flexGrow: 1,
        justifyContent: 'center',
        paddingHorizontal: scale.space * 2,
        // ⚠️ `8g`: THE DEVICE'S OWN INSETS. With nothing setting them the title
        // ran under the clock — invisible while the status bar's icons were white
        // on white, plain once round 1 made them dark (emulator, 2026-10-16).
        paddingTop: scale.space * 2 + insets.top,
        paddingBottom: scale.space * 2 + insets.bottom,
        gap: scale.rowGap,
      }}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={{ fontSize: scale.titleSize, ...TITULO, marginBottom: scale.space }}>
        {ES.onboarding.title}
      </Text>

      <Text style={{ fontSize: scale.bodySize }}>{ES.onboarding.nameLabel}</Text>
      <TextInput
        value={name}
        onChangeText={setName}
        autoCapitalize="words"
        autoCorrect={false}
        editable={!busy}
        style={{
          fontSize: scale.bodySize,
          minHeight: scale.tapTarget,
          borderWidth: 1,
          borderRadius: scale.space / 2,
          paddingHorizontal: scale.space,
        }}
      />

      <Text style={{ fontSize: scale.bodySize, fontWeight: '600', marginTop: scale.space }}>
        {ES.onboarding.ivaQuestion}
      </Text>
      <Text style={{ fontSize: scale.bodySize }}>{ES.onboarding.ivaHint}</Text>

      <View style={{ flexDirection: 'row', gap: scale.rowGap }}>
        <Pressable
          accessibilityRole="radio"
          accessibilityState={{ selected: pricesIncludeTax }}
          disabled={busy}
          onPress={() => setPricesIncludeTax(true)}
          style={choice(pricesIncludeTax)}
        >
          <Text style={{ fontSize: scale.bodySize, fontWeight: pricesIncludeTax ? '700' : '400' }}>
            {ES.onboarding.ivaYes}
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="radio"
          accessibilityState={{ selected: !pricesIncludeTax }}
          disabled={busy}
          onPress={() => setPricesIncludeTax(false)}
          style={choice(!pricesIncludeTax)}
        >
          <Text style={{ fontSize: scale.bodySize, fontWeight: !pricesIncludeTax ? '700' : '400' }}>
            {ES.onboarding.ivaNo}
          </Text>
        </Pressable>
      </View>

      <Text style={{ fontSize: scale.bodySize, fontWeight: '600', marginTop: scale.space }}>
        {ES.onboarding.addressTitle}
      </Text>
      <Text style={{ fontSize: scale.bodySize }}>{ES.onboarding.addressHint}</Text>
      <Direccion value={address} onChange={setAddress} editable={!busy} />

      <View style={{ marginTop: scale.space }}>
        {starter.template !== null ? (
          <SelectorCatalogo
            template={starter.template}
            holding={starter.holding}
            chosen={giros}
            excluded={excluded}
            onToggleGiro={(code) => setOrden((now) => toggledInOrder(now, code))}
            principal={principalDe(orden)}
            onToggleProduct={() => {}}
            products={false}
          />
        ) : (
          <Text style={{ fontSize: scale.smallSize }}>
            {starter.failed !== null ? ES.starter.needsSignal : ES.starter.loading}
          </Text>
        )}
      </View>

      {problem !== null && (
        <Text style={{ fontSize: scale.bodySize, fontWeight: '600' }}>{problem}</Text>
      )}

      <Pressable
        accessibilityRole="button"
        disabled={busy}
        onPress={() => void submit()}
        style={{
          minHeight: scale.tapTarget,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: scale.space / 2,
          borderWidth: 2,
          marginTop: scale.space,
          opacity: busy ? 0.6 : 1,
        }}
      >
        {busy ? (
          <ActivityIndicator />
        ) : (
          <Text style={{ fontSize: scale.bodySize, fontWeight: '700' }}>
            {ES.onboarding.create}
          </Text>
        )}
      </Pressable>

      {/* ⚠️ THE RULE IS THE ONLY THING SAYING THESE ARE TWO DIFFERENT ERRANDS.
          Without it the code box reads as a third question about the shop being
          created, which is the one reading that would make a joiner fill in the
          name field first. */}
      <View
        style={{
          // ⚠️ A BORDER AND NOT A `height: 1` BOX. `R6` refuses a literal size on
          // anything a person LOOKS at — elder mode has to be able to change it —
          // and a hairline is structure: the same shape the Ajustes header draws
          // its rule with, and the one the gate reads as structure rather than as
          // a size somebody hard-coded.
          borderBottomWidth: 1,
          borderBottomColor: PALETTE.linea,
          marginTop: scale.space * 2,
        }}
      />

      <Text style={{ fontSize: scale.bodySize, fontWeight: '700', marginTop: scale.space }}>
        {ES.join.section}
      </Text>
      <Text style={{ fontSize: scale.bodySize }}>{ES.join.hint}</Text>

      <Text style={{ fontSize: scale.bodySize }}>{ES.join.label}</Text>
      <TextInput
        value={credential}
        onChangeText={setCredential}
        // ⚠️ `characters` AND `autoCorrect` OFF, because the alphabet is
        // Crockford base32 and a keyboard that helpfully capitalises the first
        // letter and lower-cases the rest is a keyboard fighting the normaliser.
        // The normaliser would win — `normalizeCredential` upper-cases anyway —
        // but she would be watching her own code change as she typed it.
        autoCapitalize="characters"
        autoCorrect={false}
        autoComplete="off"
        editable={!joining}
        style={{
          fontSize: scale.bodySize,
          minHeight: scale.tapTarget,
          borderWidth: 1,
          borderRadius: scale.space / 2,
          paddingHorizontal: scale.space,
        }}
      />

      {joinProblem !== null && (
        <Text style={{ fontSize: scale.bodySize, fontWeight: '600' }}>{joinProblem}</Text>
      )}

      <Pressable
        accessibilityRole="button"
        disabled={joining}
        onPress={() => void join()}
        style={{
          minHeight: scale.tapTarget,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: scale.space / 2,
          borderWidth: 2,
          opacity: joining ? 0.6 : 1,
        }}
      >
        {joining ? (
          <ActivityIndicator />
        ) : (
          <Text style={{ fontSize: scale.bodySize, fontWeight: '700' }}>{ES.join.submit}</Text>
        )}
      </Pressable>

      {/* ⚠️⚠️ THE HALF LOOP, AND IT IS THE ONLY THING SHE GETS FOR ASKING.
          `my_access_requests` is the ONLY way she can ever see this row — `S3`:
          `workspace_invite_select` is manager-and-above and she has no role at
          all — so without this block an ask is a button that appears to do
          nothing, on the one screen she has no way around.

          ⚠️ IT RENDERS NOTHING WHILE THE READ IS OUT AND NOTHING WHEN THERE IS
          NO PENDING ROW, which is the same branch: `pending` is `null` for both.
          A founding owner never sees it, and never sees a spinner where it
          would be. */}
      {pending !== null && (
        <View
          style={{
            borderWidth: 1,
            borderColor: PALETTE.linea,
            borderRadius: scale.space / 2,
            padding: scale.space,
            gap: scale.rowGap,
            marginTop: scale.space,
          }}
        >
          <Text style={{ fontSize: scale.bodySize, fontWeight: '700' }}>
            {ES.join.pending.title(pending.workspaceName)}
          </Text>
          <Text style={{ fontSize: scale.bodySize }}>{ES.join.pending.body}</Text>
          {/* `8g`, 2026-10-21: nothing reaches the owner outside Wera, so she
              can say it herself; WhatsApp asks to whom. */}
          <BotonLleno
            label={ES.join.pending.tell}
            icon="whatsapp"
            onPress={() =>
              void Linking.openURL(whatsappChooseUrl(ES.join.pending.tellMessage(pending.workspaceName))).catch(
                () => {},
              )
            }
          />
        </View>
      )}

      {/* 5R-k. Last on the screen and quiet: neither is what anybody came here
          for, and this is the first screen a new shopkeeper reads. So both are
          the muted ink, where Ajustes draws the same two acts in the error
          colour; only the confirmation is. That difference is reported to the
          owner (R16) and is his to settle at his review. */}
      <View style={{ marginTop: scale.space * 2, gap: scale.rowGap }}>
        <Pressable
          accessibilityRole="button"
          disabled={removing}
          onPress={() => void signOut()}
          style={{ minHeight: scale.tapTarget, justifyContent: 'center', alignItems: 'center' }}
        >
          <Text style={{ fontSize: scale.bodySize, color: PALETTE.tintaApagada }}>
            {ES.auth.signOut}
          </Text>
        </Pressable>

        {!leaving ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => setLeaving(true)}
            style={{ minHeight: scale.tapTarget, justifyContent: 'center', alignItems: 'center' }}
          >
            <Text style={{ fontSize: scale.bodySize, color: PALETTE.tintaApagada }}>
              {ES.account.open}
            </Text>
          </Pressable>
        ) : (
          <View style={{ gap: scale.rowGap }}>
            <Text style={{ fontSize: scale.bodySize, color: PALETTE.tinta }}>
              {ES.account.aloneWarning}
            </Text>

            {leaveProblem !== null && (
              <Text style={{ fontSize: scale.bodySize, color: PALETTE.error }}>{leaveProblem}</Text>
            )}

            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: removing }}
              disabled={removing}
              onPress={() => void confirmLeave()}
              style={{
                minHeight: scale.tapTarget,
                justifyContent: 'center',
                alignItems: 'center',
                borderWidth: 1,
                borderColor: PALETTE.error,
                borderRadius: scale.space / 2,
              }}
            >
              <Text style={{ fontSize: scale.bodySize, fontWeight: '600', color: PALETTE.error }}>
                {removing ? ES.account.working : ES.account.confirm}
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              disabled={removing}
              onPress={() => {
                setLeaving(false);
                setLeaveProblem(null);
              }}
              style={{ minHeight: scale.tapTarget, justifyContent: 'center', alignItems: 'center' }}
            >
              <Text style={{ fontSize: scale.bodySize, color: PALETTE.tintaApagada }}>
                {ES.account.cancel}
              </Text>
            </Pressable>
          </View>
        )}
      </View>
    </ScrollView>
  );
}
