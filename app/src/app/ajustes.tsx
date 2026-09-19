import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Share, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  useCreateInvite,
  useLocations,
  useMyDisplayName,
  useMyRole,
  useRoster,
  useSetMyDisplayName,
  useWorkspace,
} from '@/api/hooks';
import { checkDisplayName, type NameIssueKey } from '@/api/displayName';
import {
  INVITABLE_ROLES,
  canInvite,
  groupedToken,
  inviteShareText,
  checkInvite,
  locationsRequired,
  resolveLocations,
  type InviteIssueKey,
  type InviteIssued,
  type LocationOption,
} from '@/api/invites';
import { groupedCode, shareText, type Role, type RosterEntry } from '@/api/members';
import { useAuth } from '@/auth/AuthProvider';
import { formatExpiry } from '@/format/date';
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
// ⚠️⚠️ FIVE SECTIONS, AND TWO OF THEM ARE NOT ALWAYS THERE. ⚠️ IT SAID FOUR
// UNTIL `5b.8-iii-b` ADDED `Tu nombre`, and the count is restated rather than
// left standing for the reason `0035` restates `0034`'s column comment: a
// sentence that went from true to wrong one task later is this repository's
// most-recorded defect, and nothing here can hold it but a person reading. The shop, the join
// code, who is in the shop, and how big this phone's text is. The roster is
// manager-and-above — RULED BY THE OWNER 2026-09-18, *"manager-and-above is
// right"*. ⚠️ **The reason that was given for it stopped being true later the
// same day, and the fence did not move.** It was ruled because `workspace_member`
// is readable by any member (`0001:524`) while `workspace_invite` is
// manager-and-above (`0002:563`), so a staff caller would be handed a list of
// colleagues it could identify none of. `0034` put a name on the membership and
// `5b.8-ii` reads it, so that list is now perfectly legible — and the OTHER half
// of the asymmetry is what holds the fence up: this sheet also carries the
// invite button, and a roster a cashier can open is a roster with a control she
// may not use on it. The argument lives beside `canSeeRoster` in
// `@/api/members`, where the suite can read it.
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

        <MiNombre />

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

        <Invitar />

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
 * ⚠️ THE ROLE IS THE SUBTITLE UNLESS IT IS ALREADY THE TITLE. A member with
 * neither a name nor a recoverable email is named by what they are
 * (`identity.kind` is `role`), and repeating `Dueño` underneath `Dueño` is the
 * app filling space. See `@/api/members` for why that case still exists after
 * `0034`: the column is nullable, so an account whose metadata carried no name
 * is admitted and falls to the bottom rung.
 *
 * ⚠️ AND THE CONDITION IS `kind !== 'role'` RATHER THAN A LIST OF THE KINDS THAT
 * DO GET A SUBTITLE. `name` — the rung `5b.8-ii` added — needs the role
 * underneath it exactly as `email` and `self` do, and it got that by this line
 * NOT being rewritten. A fifth kind would be right by default here too, which is
 * the point of stating the exception rather than the rule.
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

// ============================================================================
// FIXING YOUR OWN NAME. Plan task 5b.8-iii-b, and it is the SECOND membership
// write on this sheet — and the first one every member may make.
//
// ⚠️⚠️ IT IS NOT A PENCIL ON A ROSTER ROW, AND THAT IS THE WHOLE DESIGN. A
// control attached to a row in a list is a control that implies a SUBJECT, and
// the subject of the row above yours is somebody else. Fixing your own name and
// administering another person's are different acts with different fences, and
// `0035` made that structural — there is no argument in the RPC that could name
// anybody else. This section says whose name it is in its title and takes no
// subject at all.
//
// ⚠️⚠️ AND IT IS FENCED BY NOTHING, WHICH IS THE OPPOSITE OF THE TWO SECTIONS
// BELOW IT. The roster and the invite form are manager-and-above; this is for
// everybody, because the person whose Google account arrived as ONE WORD is most
// often the cashier — and she is the one member of the shop who can see neither
// of those two sections. A role fence here would leave the gap open for exactly
// the people it was opened on.
//
// ⚠️ THE STORED NAME IS RENDERED AND NEVER THE TEXT BOX'S CONTENTS. `0035`
// returns what it wrote, trimmed, and `saved` below holds THAT. The alternative
// — showing what was typed — diverges from the database by a space nobody can
// see and disagrees with the roster one section down.
//
// ⚠️ WHY BOTH `saved` AND THE QUERY. `useSetMyDisplayName` invalidates
// `MEMBERS_KEY`, so `useMyDisplayName` catches up on its own; `saved` is what
// fills the frames between the write landing and the refetch returning, so the
// section never shows the old name back to somebody who has just corrected it.
// The two cannot disagree for long, and when they do it is the DATABASE's answer
// on screen either way.
// ============================================================================

function MiNombre() {
  const { scale } = useDensity();
  const workspace = useWorkspace();
  const stored = useMyDisplayName();
  const { rename, busy } = useSetMyDisplayName();

  const [editing, setEditing] = useState(false);
  const [typed, setTyped] = useState('');
  const [issue, setIssue] = useState<NameIssueKey | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  // ⚠️ THE SECTION IS ABSENT UNTIL THE SHOP IS KNOWN, not disabled. `0035` takes
  // a workspace id and there is nothing to send without one — and a box that
  // accepts typing and then refuses to save is worse than a section that
  // appears a moment later, which is `useRoster`'s own argument about `visible`.
  if (workspace === null) return null;

  const shown = saved ?? stored;

  async function submit() {
    if (workspace === null) return;
    const problem = checkDisplayName(typed);
    setIssue(problem);
    setFailure(null);
    if (problem !== null) return;

    const result = await rename(workspace.id, typed);
    if (result.stored === null) {
      setFailure(result.error);
      return;
    }
    setSaved(result.stored);
    setEditing(false);
    setTyped('');
  }

  return (
    <Section title={ES.myName.section}>
      {!editing && (
        <>
          {/* ⚠️ THE NAME AT `titleSize`, THE SHOP'S OWN TOKEN ONE SECTION UP.
              What this section is FOR is the name, and the hint underneath it is
              the explanation — the same weighting `Tu tienda` already makes. */}
          <Text
            style={{
              fontSize: shown === null ? scale.bodySize : scale.titleSize,
              fontWeight: '600',
              color: shown === null ? PALETTE.tintaApagada : PALETTE.tinta,
            }}
          >
            {shown ?? ES.myName.empty}
          </Text>
          <Text style={{ fontSize: scale.bodySize, color: PALETTE.tintaApagada }}>
            {ES.myName.hint}
          </Text>
          <Boton
            icon="pencil"
            label={ES.myName.edit}
            onPress={() => {
              // Prefilled with what is stored, because the common case is a
              // name that is nearly right — one word out of two — and retyping
              // a correct surname to fix a missing one is work we made for her.
              setTyped(shown ?? '');
              setIssue(null);
              setFailure(null);
              setEditing(true);
            }}
          />
        </>
      )}

      {editing && (
        <View style={{ gap: scale.rowGap }}>
          <Campo label={ES.myName.label}>
            <TextInput
              value={typed}
              onChangeText={setTyped}
              placeholder={ES.myName.placeholder}
              placeholderTextColor={PALETTE.tintaApagada}
              // ⚠️ `words` AND NOT `none`. This is a person's name, and the two
              // fields it comes from at sign-up are capitalised the same way —
              // `5b.7`'s Nombre and Apellido. The address field one section down
              // is `none` for the opposite reason.
              autoCapitalize="words"
              autoCorrect={false}
              editable={!busy}
              style={{
                fontSize: scale.bodySize,
                minHeight: scale.tapTarget,
                color: PALETTE.tinta,
                backgroundColor: PALETTE.fondo,
                borderWidth: 1,
                borderColor: PALETTE.linea,
                borderRadius: scale.space / 2,
                paddingHorizontal: scale.space,
              }}
            />
          </Campo>

          {/* ⚠️ ONE PLACE FOR BOTH KINDS OF REFUSAL — the box's own and the
              database's, which is `Invitar`'s rule on this sheet and for its
              reason: two slots is a screen that can show two contradictory
              reasons at once, and the stale one is always the one that stays. */}
          {(issue !== null || failure !== null) && (
            <Text style={{ fontSize: scale.bodySize, color: PALETTE.error }}>
              {issue !== null ? ES.myName.issues[issue] : failure}
            </Text>
          )}

          <Boton
            icon="check"
            label={busy ? ES.myName.working : ES.myName.save}
            busy={busy}
            onPress={() => void submit()}
          />
          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={() => {
              setTyped('');
              setIssue(null);
              setFailure(null);
              setEditing(false);
            }}
            style={{ minHeight: scale.tapTarget, justifyContent: 'center', alignItems: 'center' }}
          >
            <Text style={{ fontSize: scale.bodySize, color: PALETTE.tintaApagada }}>
              {ES.myName.cancel}
            </Text>
          </Pressable>
        </View>
      )}
    </Section>
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

// ============================================================================
// INVITING SOMEBODY. Plan task 5b-ii-b-1, and the first membership WRITE on this
// sheet — `5b-ii-a` shipped none, which was the seam the split was made on.
//
// ⚠️⚠️ THE SECTION IS MANAGER-AND-ABOVE, AND IT IS NOT THE ROSTER'S FENCE WEARING
// A SECOND HAT. `canInvite` is `0028`'s own body predicate — what the RPC will
// accept — and `canSeeRoster` is about whether the rows above would be
// identifiable at all. They agree today and are argued separately in
// `@/api/invites`, because a migration that loosened either would move one.
//
// ⚠️ THREE STATES AND THEY ARE ONE VARIABLE. Closed is a button; `form` is the
// questions; `issued` is the code. A boolean pair would admit a fourth state
// that means nothing, and the one that means nothing here is "showing a code
// and a form at once" — two codes on screen, one of them dead.
// ============================================================================

function Invitar() {
  const { scale } = useDensity();
  const workspace = useWorkspace();
  const role = useMyRole();
  const locations = useLocations();
  const { issue, busy } = useCreateInvite();

  const [step, setStep] = useState<'closed' | 'form' | 'issued'>('closed');
  const [email, setEmail] = useState('');
  const [chosenRole, setChosenRole] = useState<Role>('staff');
  const [locationIds, setLocationIds] = useState<readonly string[]>([]);
  const [issue_, setIssue] = useState<InviteIssueKey | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [issued, setIssued] = useState<InviteIssued | null>(null);

  if (!canInvite(role) || workspace === null) return null;

  function reset() {
    setEmail('');
    setChosenRole('staff');
    setLocationIds([]);
    setIssue(null);
    setFailure(null);
  }

  async function submit() {
    if (workspace === null) return;
    const draft = {
      email,
      role: chosenRole,
      locationIds: resolveLocations(
        { email, role: chosenRole, locationIds },
        locations.options,
      ),
    };
    const problem = checkInvite(draft, { locationCount: locations.options.length });
    setIssue(problem);
    setFailure(null);
    if (problem !== null) return;

    const result = await issue(workspace.id, draft);
    if (result.issued === null) {
      setFailure(result.error);
      return;
    }
    setIssued(result.issued);
    setStep('issued');
    reset();
  }

  return (
    <Section title={ES.invite.section}>
      {step === 'closed' && (
        <Boton
          icon="account-plus"
          label={ES.invite.open}
          onPress={() => {
            setIssued(null);
            setStep('form');
          }}
        />
      )}

      {step === 'form' && (
        <View style={{ gap: scale.rowGap }}>
          <Campo label={ES.invite.emailLabel}>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder={ES.invite.emailPlaceholder}
              placeholderTextColor={PALETTE.tintaApagada}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              editable={!busy}
              style={{
                fontSize: scale.bodySize,
                minHeight: scale.tapTarget,
                color: PALETTE.tinta,
                backgroundColor: PALETTE.fondo,
                borderWidth: 1,
                borderColor: PALETTE.linea,
                borderRadius: scale.space / 2,
                paddingHorizontal: scale.space,
              }}
            />
          </Campo>

          <Campo label={ES.invite.roleLabel}>
            {INVITABLE_ROLES.map((candidate) => (
              <Opcion
                key={candidate}
                chosen={candidate === chosenRole}
                title={ES.members.roles[candidate]}
                subtitle={ES.invite.roleHelp[candidate as 'manager' | 'staff']}
                onPress={() => setChosenRole(candidate)}
              />
            ))}
          </Campo>

          {/* ⚠️ THE PICKER APPEARS ONLY ABOVE ONE STORE, which is the decision of
              the 5b-ii sizing and C1.5's consequence: both pilot shops have
              exactly one location, so nothing is asked and `resolveLocations`
              fills it in. Asking a one-store shopkeeper which store is the
              question with no right answer `5b-i` already refused about its
              NAME. ⚠️ And it is only asked for `staff` at all — `0028` stores
              '{}' for a manager whatever was passed. */}
          {locationsRequired(chosenRole) && locations.options.length > 1 && (
            <Campo label={ES.invite.locationLabel}>
              {locations.options.map((option) => (
                <Sucursal
                  key={option.id}
                  option={option}
                  chosen={locationIds.includes(option.id)}
                  onPress={() =>
                    setLocationIds((current) =>
                      current.includes(option.id)
                        ? current.filter((id) => id !== option.id)
                        : [...current, option.id],
                    )
                  }
                />
              ))}
            </Campo>
          )}

          {/* ⚠️ ONE PLACE FOR BOTH KINDS OF REFUSAL — the form's own and the
              database's. Two slots would mean a screen that can show two
              contradictory reasons at once, and the second one is always the
              one that is out of date. */}
          {(issue_ !== null || failure !== null) && (
            <Text style={{ fontSize: scale.bodySize, color: PALETTE.error }}>
              {issue_ !== null ? ES.invite.issues[issue_] : failure}
            </Text>
          )}

          <Boton
            icon="check"
            label={busy ? ES.invite.working : ES.invite.submit}
            busy={busy}
            onPress={() => void submit()}
          />
          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={() => {
              reset();
              setStep('closed');
            }}
            style={{ minHeight: scale.tapTarget, justifyContent: 'center', alignItems: 'center' }}
          >
            <Text style={{ fontSize: scale.bodySize, color: PALETTE.tintaApagada }}>
              {ES.invite.cancel}
            </Text>
          </Pressable>
        </View>
      )}

      {step === 'issued' && issued !== null && (
        <Emitido
          issued={issued}
          shopName={workspace.displayName}
          onDone={() => {
            setIssued(null);
            setStep('closed');
          }}
        />
      )}
    </Section>
  );
}

/** A label above its control. The one shape the form repeats. */
function Campo({ label, children }: { label: string; children: ReactNode }) {
  const { scale } = useDensity();
  return (
    <View style={{ gap: scale.rowGap / 2 }}>
      <Text style={{ fontSize: scale.bodySize, fontWeight: '600', color: PALETTE.tinta }}>
        {label}
      </Text>
      {children}
    </View>
  );
}

/**
 * One choice in a list of them.
 *
 * ⚠️ THE CHOSEN ONE IS ANNOUNCED THREE WAYS — ground, border and a filled tick —
 * which is `Letra`'s rule on this sheet and the palette's: no state is ever
 * carried by colour alone. `R9` cannot see it, so it is written down here.
 */
function Opcion({
  chosen,
  title,
  subtitle,
  onPress,
}: {
  chosen: boolean;
  title: string;
  subtitle?: string;
  onPress: () => void;
}) {
  const { scale } = useDensity();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={{
        minHeight: scale.tapTarget,
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale.rowGap,
        paddingHorizontal: scale.space,
        paddingVertical: scale.rowGap / 2,
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
      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontSize: scale.bodySize,
            fontWeight: chosen ? '700' : '400',
            color: PALETTE.tinta,
          }}
        >
          {title}
        </Text>
        {subtitle !== undefined && (
          <Text style={{ fontSize: scale.bodySize, color: PALETTE.tintaApagada }}>{subtitle}</Text>
        )}
      </View>
    </Pressable>
  );
}

/** One store, ticked or not. Many may be chosen — `0028` takes an array. */
function Sucursal({
  option,
  chosen,
  onPress,
}: {
  option: LocationOption;
  chosen: boolean;
  onPress: () => void;
}) {
  return <Opcion chosen={chosen} title={option.name} onPress={onPress} />;
}

/** A filled control with its word beside its icon (C12.1). */
function Boton({
  icon,
  label,
  onPress,
  busy = false,
}: {
  icon: 'account-plus' | 'check' | 'pencil' | 'share-variant';
  label: string;
  onPress: () => void;
  busy?: boolean;
}) {
  const { scale } = useDensity();
  return (
    <Pressable
      accessibilityRole="button"
      disabled={busy}
      onPress={onPress}
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
        opacity: busy ? 0.6 : 1,
      }}
    >
      {busy ? (
        <ActivityIndicator color={PALETTE.accion} />
      ) : (
        <MaterialCommunityIcons name={icon} size={scale.iconSize} color={PALETTE.accion} />
      )}
      <Text style={{ fontSize: scale.bodySize, fontWeight: '600', color: PALETTE.accion }}>
        {label}
      </Text>
    </Pressable>
  );
}

/**
 * The code, which exists here and nowhere else, ever.
 *
 * ⚠️⚠️ `0028` STORES ONLY `sha256(normalize_workspace_code(token))`, so there is
 * no second look — no read recovers it and no column holds it. That is why the
 * sentence saying so is not fine print but the second line on the card, and why
 * `Enviar código` sits above `Listo`: the only safe way off this screen is
 * through the share sheet.
 *
 * ⚠️ AT `moneySize`, the token for "the number this mode exists for" — the same
 * decision the join code's render made one section up, for the same reason. It
 * is read aloud over WhatsApp by somebody holding a phone at arm's length.
 *
 * ⚠️ THE REPLACED LINE IS `atencion` AND NOT `error`, because nothing failed:
 * `0028` decision 6 replaces a live pending invite deliberately — *"send it
 * again is what a shop does"* — and the only person harmed is one holding a code
 * that has just stopped working. It is the one thing on this card a shopkeeper
 * would otherwise call a bug, and it is `P3`.
 */
function Emitido({
  issued,
  shopName,
  onDone,
}: {
  issued: InviteIssued;
  shopName: string;
  onDone: () => void;
}) {
  const { scale } = useDensity();
  const day = formatExpiry(issued.expiresAt);
  return (
    <View style={{ gap: scale.rowGap }}>
      <Text style={{ fontSize: scale.bodySize, fontWeight: '600', color: PALETTE.tinta }}>
        {ES.invite.issued.title}
      </Text>

      <Text
        style={{
          fontSize: scale.moneySize,
          fontWeight: '700',
          color: PALETTE.tinta,
          letterSpacing: scale.space / 4,
        }}
      >
        {groupedToken(issued.token)}
      </Text>

      <Text style={{ fontSize: scale.bodySize, color: PALETTE.tintaApagada }}>
        {ES.invite.issued.once}
      </Text>

      {/* ⚠️ OMITTED ENTIRELY WHEN THE DATE CANNOT BE READ, never rendered half.
          `formatExpiry` returns null rather than a string with NaN in it. */}
      {day !== null && (
        <Text style={{ fontSize: scale.bodySize, color: PALETTE.tintaApagada }}>
          {ES.invite.issued.expires(day)}
        </Text>
      )}

      {issued.replacedPending && (
        <Text style={{ fontSize: scale.bodySize, color: PALETTE.atencion }}>
          {ES.invite.issued.replaced}
        </Text>
      )}

      <Boton
        icon="share-variant"
        label={ES.invite.issued.share}
        onPress={() => {
          void Share.share({ message: inviteShareText(shopName, issued.token) }).catch(() => {});
        }}
      />
      <Pressable
        accessibilityRole="button"
        onPress={onDone}
        style={{ minHeight: scale.tapTarget, justifyContent: 'center', alignItems: 'center' }}
      >
        <Text style={{ fontSize: scale.bodySize, color: PALETTE.tintaApagada }}>
          {ES.invite.issued.done}
        </Text>
      </Pressable>
    </View>
  );
}
