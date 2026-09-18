import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, Share, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useRoster, useWorkspace } from '@/api/hooks';
import { groupedCode, shareText, type RosterEntry } from '@/api/members';
import { useAuth } from '@/auth/AuthProvider';
import { ES } from '@/strings';
import { DENSITIES, DENSITY_MODES } from '@/theme/density';
import { useDensity } from '@/theme/DensityProvider';
import { PALETTE } from '@/theme/palette';

// ============================================================================
// AJUSTES — THE APP'S FIRST NON-TAB SURFACE, AND ITS FIRST COLOURED SCREEN.
// Plan task 5b-ii-a. ADR-035 §2.8: "Ajustes | Workspace settings | Sheet, not a
// screen."
//
// ⚠️ IT IS A SHEET BECAUSE §2.8 SAID SO AND BECAUSE OF WHAT A SHEET MEANS HERE:
// you come back to where you were. Every other route in this app is a tab or a
// door — `(tabs)` is where the work happens, `(auth)` and `(onboarding)` are
// one-way. This is the first thing a shopkeeper opens ON TOP of what she was
// doing, and `presentation: 'modal'` in `_layout.tsx` is the whole of that
// claim. ⚠️ THE ROUTE IS AT THE ROOT AND IN NO GROUP, so `groupOf()` calls it
// `null` and `redirectFor` leaves a member exactly where they are — measured
// against `guard.ts`, not assumed.
//
// ⚠️⚠️ FOUR SECTIONS, AND ONE OF THEM IS NOT ALWAYS THERE. The shop, the join
// code, who is in the shop, and how big this phone's text is. The roster is
// manager-and-above — RULED BY THE OWNER 2026-09-18, *"manager-and-above is
// right"* — because `workspace_invite` is readable at `manager` (`0002:563`)
// while `workspace_member` is readable by any member (`0001:524`): a staff
// caller would be handed a list of colleagues it can identify none of. The
// decision is `canSeeRoster` in `@/api/members`, where the suite can read it.
//
// ⚠️⚠️ AND IT SHIPS NO MEMBERSHIP WRITE. Not "mostly reads" — none. That is the
// seam `5b-ii` was split on: `create_invite`, the location a staff invite must
// name, and `redeem_invite` are `5b-ii-b`'s, and they arrive at this sheet
// rather than inventing a surface of their own.
//
// ⚠️ THE FIRST CONSUMER OF `5b.6`'s PALETTE, WHICH MEANS EVERY COLOUR DECISION
// ON IT IS BEING MADE FOR THE FIRST TIME. `R11` proves no hex is typed here and
// CANNOT prove the result is legible — that eye is the owner's, which is área
// 13's own recorded limit. What this file does obey, and no check can see
// (`R9`): NO STATE IS ANNOUNCED BY COLOUR ALONE. The chosen density mode
// carries `accionSuave` AND a border AND the word; the roster's own row carries
// `Tú` AND nothing else, because being yourself is not a state, it is a name.
// ============================================================================

export default function Ajustes() {
  const { scale } = useDensity();
  const insets = useSafeAreaInsets();
  const workspace = useWorkspace();
  const roster = useRoster();

  return (
    <View style={{ flex: 1, backgroundColor: PALETTE.fondo }}>
      <Banda />

      <ScrollView
        contentContainerStyle={{
          padding: scale.space,
          gap: scale.space * 1.5,
          // The device's own bottom inset, so the last section is not under the
          // home indicator on the iPhones the pilot uses (C1.1).
          paddingBottom: scale.space * 2 + insets.bottom,
        }}
      >
        {workspace !== null && (
          <Section title={ES.settings.shopSection}>
            <Text style={{ fontSize: scale.titleSize, fontWeight: '600', color: PALETTE.tinta }}>
              {workspace.displayName}
            </Text>
            {/* C1.7, read back in the words it was asked in. It is the one answer
                at onboarding that is wrong for ever, so the sheet says which way
                it was answered rather than leaving it to be remembered. */}
            <Text style={{ fontSize: scale.bodySize, color: PALETTE.tintaApagada }}>
              {workspace.pricesIncludeTax ? ES.settings.ivaIncluded : ES.settings.ivaExcluded}
            </Text>
          </Section>
        )}

        {workspace !== null && (
          <Section title={ES.settings.codeSection}>
            {/* ⚠️ AT `moneySize`, WHICH IS THE TOKEN FOR "THE NUMBER THIS MODE
                EXISTS FOR". A join code is read aloud over WhatsApp by someone
                holding a phone at arm's length — the same job a total does, and
                the only token in the scale sized for it. */}
            <Text
              style={{
                fontSize: scale.moneySize,
                fontWeight: '700',
                color: PALETTE.tinta,
                letterSpacing: scale.space / 4,
              }}
            >
              {groupedCode(workspace.code)}
            </Text>
            <Text style={{ fontSize: scale.bodySize, color: PALETTE.tintaApagada }}>
              {ES.settings.codeHint}
            </Text>
            <Compartir shopName={workspace.displayName} code={workspace.code} />
          </Section>
        )}

        {roster.visible && (
          <Section title={ES.members.section}>
            {roster.loading ? (
              <Text style={{ fontSize: scale.bodySize, color: PALETTE.tintaApagada }}>
                {ES.members.loading}
              </Text>
            ) : roster.entries.length <= 1 ? (
              <>
                {roster.entries.map((entry) => (
                  <Miembro key={entry.userId} entry={entry} />
                ))}
                <Text style={{ fontSize: scale.bodySize, color: PALETTE.tintaApagada }}>
                  {ES.members.alone}
                </Text>
              </>
            ) : (
              roster.entries.map((entry) => <Miembro key={entry.userId} entry={entry} />)
            )}
          </Section>
        )}

        <Section title={ES.settings.densitySection}>
          <Text style={{ fontSize: scale.bodySize, color: PALETTE.tintaApagada }}>
            {ES.settings.densityHint}
          </Text>
          <Letra />
        </Section>

        <Salir />
      </ScrollView>
    </View>
  );
}

/**
 * The header. ⚠️ THE ONE USE OF `banda` IN THIS APP, and the palette's own note
 * says why that matters: `banda` and `atencionSuave` are two channel steps
 * apart, so nothing needing attention may ever be placed inside this strip.
 * Nothing here does — it is a word and a way out.
 */
function Banda() {
  const { scale } = useDensity();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        backgroundColor: PALETTE.banda,
        paddingTop: insets.top + scale.space,
        paddingBottom: scale.space,
        paddingHorizontal: scale.space,
        borderBottomWidth: 1,
        borderBottomColor: PALETTE.linea,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: scale.space,
      }}
    >
      <Text style={{ fontSize: scale.titleSize, fontWeight: '700', color: PALETTE.tinta }}>
        {ES.settings.title}
      </Text>
      <Pressable
        accessibilityRole="button"
        onPress={() => router.back()}
        style={{
          minHeight: scale.tapTarget,
          minWidth: scale.tapTarget,
          justifyContent: 'center',
          alignItems: 'flex-end',
        }}
      >
        <Text style={{ fontSize: scale.bodySize, fontWeight: '600', color: PALETTE.accion }}>
          {ES.settings.close}
        </Text>
      </Pressable>
    </View>
  );
}

/** A titled card on `superficie`. The one shape this sheet repeats. */
function Section({ title, children }: { title: string; children: ReactNode }) {
  const { scale } = useDensity();
  return (
    <View style={{ gap: scale.rowGap }}>
      <Text style={{ fontSize: scale.bodySize, fontWeight: '600', color: PALETTE.tintaApagada }}>
        {title}
      </Text>
      <View
        style={{
          backgroundColor: PALETTE.superficie,
          borderRadius: scale.space,
          borderWidth: 1,
          borderColor: PALETTE.linea,
          padding: scale.space,
          gap: scale.rowGap,
        }}
      >
        {children}
      </View>
    </View>
  );
}

/**
 * One person in the shop.
 *
 * ⚠️ THE ROLE IS THE SUBTITLE UNLESS IT IS ALREADY THE TITLE. A member whose
 * email this app cannot recover is named by what they are (`identity.kind` is
 * `role`), and repeating `Dueño` underneath `Dueño` is the app filling space.
 * See `@/api/members` for why that case exists at all — it is `T2`, the founding
 * owner, whose membership no invite precedes.
 */
function Miembro({ entry }: { entry: RosterEntry }) {
  const { scale } = useDensity();
  return (
    <View style={{ minHeight: scale.rowHeight, justifyContent: 'center' }}>
      <Text style={{ fontSize: scale.bodySize, fontWeight: '600', color: PALETTE.tinta }}>
        {entry.identity.text}
      </Text>
      {entry.identity.kind !== 'role' && (
        <Text style={{ fontSize: scale.bodySize, color: PALETTE.tintaApagada }}>
          {ES.members.roles[entry.role]}
        </Text>
      )}
    </View>
  );
}

/**
 * C11.7 — the share button, *"not a protagonist at all in our UI."*
 *
 * ⚠️ THE APP'S FIRST HAND-OFF TO ANOTHER APPLICATION, and it is the OS sheet
 * rather than a WhatsApp deep link. `whatsapp://send?text=` needs WhatsApp
 * installed to do anything at all and fails silently when it is not; the share
 * sheet offers WhatsApp first on both of the pilot's platforms and offers
 * something else when it is absent.
 *
 * ⚠️ A DISMISSAL SAYS NOTHING, the rule `AuthProvider` already follows for a
 * cancelled Google sign-in: the person closing the share sheet knows what they
 * did, and a Spanish sentence about it would be the app talking about itself.
 *
 * ⚠️ NO CHECK IN THIS REPOSITORY CAN SEE THAT WHATSAPP RECEIVES IT (`R9`).
 * §2.11 refuses suites over rendering, and the share sheet is the operating
 * system's. `shareText` — the sentence and the shop's name in it — is pinned in
 * `app/test/api-members.test.ts`; that it leaves the phone is the owner's.
 */
function Compartir({ shopName, code }: { shopName: string; code: string }) {
  const { scale } = useDensity();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        void Share.share({ message: shareText(shopName, code) }).catch(() => {});
      }}
      style={{
        minHeight: scale.tapTarget,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: scale.rowGap,
        paddingHorizontal: scale.space,
        borderRadius: scale.space / 2,
        backgroundColor: PALETTE.accionSuave,
        borderWidth: 1,
        borderColor: PALETTE.accion,
      }}
    >
      {/* C12.1 — the icon NEVER appears without its word. */}
      <MaterialCommunityIcons name="share-variant" size={scale.iconSize} color={PALETTE.accion} />
      <Text style={{ fontSize: scale.bodySize, fontWeight: '600', color: PALETTE.accion }}>
        {ES.settings.share}
      </Text>
    </Pressable>
  );
}

/**
 * C3.18's control, on the surface it was always meant for.
 *
 * ⚠️ THE CHOICE IS ANNOUNCED THREE WAYS AND NOT ONE — ground, border and a tick
 * beside the word. The palette's rule is that no state is ever carried by colour
 * alone, and this is the screen where it bites hardest: the person choosing
 * `Letra grande` is by definition the person who cannot read a subtle
 * difference. The tick is the half a monochrome screen still shows.
 */
function Letra() {
  const { mode, scale, setMode } = useDensity();
  return (
    <View style={{ gap: scale.rowGap }}>
      {DENSITY_MODES.map((candidate) => {
        const chosen = candidate === mode;
        return (
          <Pressable
            key={candidate}
            accessibilityRole="button"
            onPress={() => setMode(candidate)}
            style={{
              minHeight: scale.tapTarget,
              flexDirection: 'row',
              alignItems: 'center',
              gap: scale.rowGap,
              paddingHorizontal: scale.space,
              borderRadius: scale.space / 2,
              borderWidth: chosen ? 2 : 1,
              borderColor: chosen ? PALETTE.accion : PALETTE.linea,
              backgroundColor: chosen ? PALETTE.accionSuave : PALETTE.superficie,
            }}
          >
            <MaterialCommunityIcons
              name={chosen ? 'check-circle' : 'circle-outline'}
              size={scale.iconSize}
              color={chosen ? PALETTE.accion : PALETTE.tintaApagada}
            />
            {/* ⚠️ EACH OPTION IS RENDERED AT ITS OWN MODE'S BODY SIZE, not at the
                one in force. Choosing a text size from a list that is all one
                size is choosing blind — the control shows what it is offering. */}
            <Text
              style={{
                fontSize: DENSITIES[candidate].bodySize,
                fontWeight: chosen ? '700' : '400',
                color: PALETTE.tinta,
              }}
            >
              {ES.density[candidate]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/**
 * C1.4's explicit log-out, moved here from the placeholder Home that `5a-ii`
 * put it on. That block's own comment named this task: *"whoever builds Ajustes
 * deletes both blocks."*
 *
 * ⚠️ IT IS `error` AND IT IS NOT A BUTTON-SHAPED SLAB. The role's one job is
 * what DESTROYS, and ending a session is the only destructive act on this
 * sheet — but it is also the one thing on it nobody came here to do, so it sits
 * last, alone, outside every card, with the word carrying the meaning and the
 * colour agreeing with it.
 */
function Salir() {
  const { scale } = useDensity();
  const { signOut } = useAuth();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => void signOut()}
      style={{
        minHeight: scale.tapTarget,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: scale.space,
      }}
    >
      <Text style={{ fontSize: scale.bodySize, fontWeight: '600', color: PALETTE.error }}>
        {ES.auth.signOut}
      </Text>
    </Pressable>
  );
}
