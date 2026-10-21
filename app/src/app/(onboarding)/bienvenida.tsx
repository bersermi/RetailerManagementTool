import { useState, type ReactNode } from 'react';
import { Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { deleteArgs } from '@/api/account';
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
import { checkShopName } from '@/api/workspace';
import { useAuth } from '@/auth/AuthProvider';
import { readPuerta, writePuerta, type Puerta } from '@/auth/puerta';
import { whatsappChooseUrl } from '@/auth/support';
import { deviceStore } from '@/lib/store';
import { ES } from '@/strings';
import { useDensity } from '@/theme/DensityProvider';
import { PALETTE } from '@/theme/palette';
import { Banda } from '@/ui/Banda';
import { BotonLleno } from '@/ui/BotonLleno';
import { Campo } from '@/ui/Campo';
import { Puertas } from '@/ui/Puertas';
import { SelectorCatalogo } from '@/ui/SelectorCatalogo';

const NOTHING_EXCLUDED: ReadonlySet<string> = new Set();

// ============================================================================
// ⚠️⚠️ `8g`, THE OWNER'S RULINGS OF 2026-10-21 — READ THIS BEFORE THE HISTORY
// BELOW, WHICH IT SUPERSEDES WHERE THEY DISAGREE. The welcome (`(auth)/hola`)
// now asks which person she is BEFORE her account, so this screen draws only
// her half: the door she chose is on the phone (`@/auth/puerta`). *Tu tienda*
// asks the shop's name and its giros, nothing else — **no IVA question** (every
// shop starts at *Sí, ya lo incluyen*, changed in Ajustes; ADR-035 §2.5 says
// his ruling now) and **no address** (asked when Merma opens, the one place it
// is used; the columns were always nullable). *Entrar a la tienda* is the one
// box for either code. An account that came by neither door (a second phone)
// is shown the two doors again; one waiting on a request is shown her half
// whatever the door. *Volver* goes back to the doors.
//
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

  // ⚠️ `8g`: HER DOOR, read once from the phone; the doors drawn here set it.
  const [door, setDoor] = useState<Puerta | null>(() => readPuerta(deviceStore()));
  const half: Puerta | null = pending !== null ? 'invitada' : door;
  function choose(next: Puerta | null) {
    writePuerta(deviceStore(), next);
    setDoor(next);
  }

  const [name, setName] = useState('');
  const [problem, setProblem] = useState<string | null>(null);

  // ⚠️⚠️ WHAT THE SHOP SELLS, `9d`: the giros, and since 2026-10-14 no list to
  // untick (the owner: *"just let the user pick one giro or more"*) — a product
  // a shop does not sell is retired from Productos afterwards (`0054`). ⚠️
  // Without signal the catalog cannot be read, and the section says so instead
  // of spinning (`useStarterCatalog`).
  const starter = useStarterCatalog();
  // ⚠️ `8g` (`0056`): THE ORDER THE GIROS WERE PICKED IN — *"the first giro a
  // user picks is the 'Main' giro, marked with a star."* `@/api/emblema`.
  const [orden, setOrden] = useState<readonly string[]>([]);
  const giros: ReadonlySet<string> = new Set(orden);
  const excluded = NOTHING_EXCLUDED;

  const [credential, setCredential] = useState('');
  const [joinProblem, setJoinProblem] = useState<string | null>(null);

  // ⚠️⚠️ THE WAY OUT, `5R-k`, the owner's ruling of 2026-10-13, kept quiet at
  // the bottom (his ruling of 2026-10-21). *Cerrar sesión* and *Eliminar mi
  // cuenta* otherwise live in Ajustes, which needs a shop; somebody who came in
  // by the wrong door must not be held here, and Apple's rule 5.1.1(v) asks
  // that an account this app made can be deleted inside it.
  // ⚠️ NO NAME TO TYPE AND NO ROSTER TO WAIT FOR: a login here belongs to no
  // shop, so `deleteArgs` sends `null` and `0053` has nothing to refuse.
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
  // attempt starts, not when a field changes.
  async function submit() {
    if (busy) return;
    setProblem(null);
    const checked = checkShopName(name);
    if (!checked.ok) {
      setProblem(checked.message);
      return;
    }
    // ⚠️ IT NAVIGATES NOWHERE ON SUCCESS. The guard sends her to Vender the
    // moment the membership read comes back — see `@/auth/guard`. ⚠️ `8g`: the
    // shop is born at *Sí, ya lo incluyen* and with no address (his rulings).
    const choice = choiceFrom(starter.template, giros, excluded, starter.holding);
    setProblem(
      await create({ displayName: checked.displayName, pricesIncludeTax: true }, choice, principalDe(orden), null),
    );
  }

  // The joining half. ⚠️ IT NAVIGATES NOWHERE EITHER, and here that is the whole
  // mechanism: a success invalidates the membership read, it comes back
  // `member`, and `@/auth/guard` moves her. ⚠️ THE FORK IS HERE AND IT IS THE
  // ONLY ONE: `checkCredential` says whether either door can be called at all;
  // `classifyCredential` says which — 8 characters is the shop's code (an ask
  // the owner approves), 16 an invitation (`P2`, one box for both).
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

  const exits = (
    // `5R-k`, kept quiet: neither is what anybody came here for.
    <View style={{ marginTop: scale.space * 2, gap: scale.rowGap }}>
      <Pressable
        accessibilityRole="button"
        disabled={removing}
        onPress={() => void signOut()}
        style={{ minHeight: scale.tapTarget, justifyContent: 'center', alignItems: 'center' }}
      >
        <Text style={{ fontSize: scale.bodySize, color: PALETTE.tintaApagada }}>{ES.auth.signOut}</Text>
      </Pressable>

      {!leaving ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => setLeaving(true)}
          style={{ minHeight: scale.tapTarget, justifyContent: 'center', alignItems: 'center' }}
        >
          <Text style={{ fontSize: scale.bodySize, color: PALETTE.tintaApagada }}>{ES.account.open}</Text>
        </Pressable>
      ) : (
        <View style={{ gap: scale.rowGap }}>
          <Text style={{ fontSize: scale.bodySize, color: PALETTE.tinta }}>{ES.account.aloneWarning}</Text>

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
            <Text style={{ fontSize: scale.bodySize, color: PALETTE.tintaApagada }}>{ES.account.cancel}</Text>
          </Pressable>
        </View>
      )}
    </View>
  );

  const page = (children: ReactNode) => (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{
        paddingHorizontal: scale.space * 2,
        paddingTop: scale.space * 2,
        paddingBottom: scale.space * 2 + insets.bottom,
        gap: scale.space,
      }}
    >
      {children}
      {exits}
    </ScrollView>
  );

  const back = pending === null ? { label: ES.cuenta.back, onPress: () => choose(null) } : null;

  // An account that came by neither door: the doors again, signed in.
  if (half === null) {
    return (
      <View style={{ flex: 1, backgroundColor: PALETTE.fondo }}>
        <Banda titulo={ES.hola.choose} />
        {page(<Puertas onAbrir={() => choose('abrir')} onInvitada={() => choose('invitada')} />)}
      </View>
    );
  }

  if (half === 'abrir') {
    return (
      <View style={{ flex: 1, backgroundColor: PALETTE.fondo }}>
        <Banda titulo={ES.onboarding.title} antetitulo={ES.cuenta.door.abrir} volver={back} />
        {page(
          <>
            <Campo
              label={ES.onboarding.nameLabel}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="done"
              editable={!busy}
            />

            <View style={{ marginTop: scale.rowGap }}>
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
                <Text style={{ fontSize: scale.smallSize, color: PALETTE.tintaApagada }}>
                  {starter.failed !== null ? ES.starter.needsSignal : ES.starter.loading}
                </Text>
              )}
            </View>

            {problem !== null && (
              <Text style={{ fontSize: scale.bodySize, fontWeight: '600', color: PALETTE.error }}>{problem}</Text>
            )}

            <BotonLleno variante="principal" label={ES.onboarding.create} busy={busy} onPress={() => void submit()} />
          </>,
        )}
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: PALETTE.fondo }}>
      <Banda titulo={ES.join.title} antetitulo={ES.cuenta.door.invitada} volver={back} />
      {page(
        <>
          {/* ⚠️ `characters` AND `autoCorrect` OFF, because the alphabet is
              Crockford base32 and a keyboard that helpfully capitalises the
              first letter and lower-cases the rest is a keyboard fighting the
              normaliser. A pasted message's spaces are forgiven by it too. */}
          <Campo
            label={ES.join.label}
            value={credential}
            onChangeText={setCredential}
            autoCapitalize="characters"
            autoCorrect={false}
            autoComplete="off"
            returnKeyType="go"
            onSubmitEditing={() => void join()}
            editable={!joining}
          />

          {joinProblem !== null && (
            <Text style={{ fontSize: scale.bodySize, fontWeight: '600', color: PALETTE.error }}>{joinProblem}</Text>
          )}

          <BotonLleno variante="principal" label={ES.join.submit} busy={joining} onPress={() => void join()} />

          {/* ⚠️⚠️ THE HALF LOOP, AND IT IS THE ONLY THING SHE GETS FOR ASKING.
              `my_access_requests` is the ONLY way she can ever see this row
              (`S3`), so without this block an ask is a button that appears to
              do nothing. It renders nothing while the read is out and nothing
              with no pending row — the same branch, `pending` is `null`. ⚠️
              `8g`: and it now opens by itself (`useWaitForApproval`). */}
          {pending !== null && (
            <View
              style={{
                borderWidth: 1,
                borderColor: PALETTE.linea,
                borderRadius: scale.space,
                backgroundColor: PALETTE.superficie,
                padding: scale.space + scale.rowGap,
                gap: scale.rowGap,
                marginTop: scale.space,
              }}
            >
              <Text style={{ fontSize: scale.bodySize, fontWeight: '700', color: PALETTE.tinta }}>
                {ES.join.pending.title(pending.workspaceName)}
              </Text>
              <Text style={{ fontSize: scale.bodySize, color: PALETTE.tintaApagada }}>{ES.join.pending.body}</Text>
              {/* Nothing reaches the owner outside Wera, so she can say it
                  herself; WhatsApp asks to whom. */}
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
        </>,
      )}
    </View>
  );
}
