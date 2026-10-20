import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  CORRECTABLE,
  CART_KIND,
  CORRECTION_ROUTE,
  mayCorrect,
  unsentPrefillOf,
  type Correction,
} from '@/api/corrections';
import { isoDay } from '@/api/catalog';
import {
  DOCUMENT_KINDS,
  byDay,
  clockOf,
  dayHeading,
  documentsLine,
  rowTitle,
  type DocumentKind,
  type DocumentsLineInput,
  type ShopDocument,
} from '@/api/documents';
import { useCorrectDocument, useDocuments, useMyRole } from '@/api/hooks';
import { useAuth } from '@/auth/AuthProvider';
import type { Cart, Scope } from '@/cart/cart';
import { useCart, useCartStore } from '@/cart/store';
import { formatMXN } from '@/format/mxn';
import { correctionAsk } from '@/offline/unsent';
import { useUnsent } from '@/offline/useUnsent';
import { ES } from '@/strings';
import { useDensity } from '@/theme/DensityProvider';
import { PALETTE } from '@/theme/palette';
import { TITULO } from '@/theme/letra';
import { Boton } from '@/ui/Boton';
import { BotonLleno } from '@/ui/BotonLleno';
import { Frase } from '@/ui/Frase';
import { Interruptor } from '@/ui/Interruptor';
import { Rotulo } from '@/ui/Rotulo';
import { Separador } from '@/ui/Separador';
import { Vacio } from '@/ui/Vacio';
import { Velo } from '@/ui/Velo';

// ============================================================================
// LO ÚLTIMO — WHAT THE SHOP BOUGHT AND SOLD LATELY. Plan task `5h-ii-a`, and
// the seventeenth screen in `app/src/app/`.
//
// ⚠️⚠️ IT EXISTS BECAUSE THE OWNER TOLD `5h-i` HOW HE FINDS A MISTAKE, AND IT
// WAS NOT A BUTTON: *"Most likely the user will realize if he looks at his
// purchase history for the last week/couple of days."* `Costos` is per PRODUCT,
// Inicio is a figure and a count, `Números` is not built — **nothing in this app
// listed DOCUMENTS**, which is the thing a person actually recognises.
//
// ⚠️⚠️ AND IT IS THE SURFACE `5h-ii-b` HANGS `Corregir` AND `Eliminar` OFF, which
// is why it ships alone and writes nothing. A list that only reads can be looked
// at on a phone and corrected before anything in this app has ever cancelled a
// document — the seam that split is: read / ledger-write / queue.
//
// ----------------------------------------------------------------------------
// ⚠️⚠️ AND `5h-ii-c` ADDED THE THIRD OF THOSE: THE NOTE THAT HAS NOT BEEN SENT
// ----------------------------------------------------------------------------
// This screen used to show NOTHING at all with no signal — `useDocuments` asks
// the server, the read fails, and `documentsLine` answers the failure sentence —
// so the delivery she had just keyed was absent from the one screen built for
// finding it, and keying it a second time was the obvious thing to do. **The
// invisibility manufactured a duplicate.** The unsent group above the list is
// that fixed, and the owner ruled on 2026-09-26 that she may correct one where it
// sits rather than waiting for it to land.
//
// ⚠️ THE TWO HALVES FAIL SEPARATELY AND THAT IS WHY `Cuerpo` DID NOT CHANGE. The
// unsent group is this device's own SQLite and works with no signal; the list
// below it is the server's seven days and says so when it could not be asked. A
// shopkeeper offline now sees her own note AND an honest sentence where the
// history would be, which is two facts rather than one failure.
//
// ⚠️ NOTHING ABOUT THE UNSENT PATH IS A WRITE TO POSTGRES, so there is no cache
// to invalidate and no `staleAfterVoid` on it — see `@/offline/unsent`.
//
// ----------------------------------------------------------------------------
// ⚠️⚠️ ONE KIND AT A TIME, AND THAT IS A DECISION THIS SCREEN TAKES RATHER THAN
// A LAYOUT
// ----------------------------------------------------------------------------
// The alternative is one time-ordered list with both kinds interleaved, and it
// is worse for a measurable reason rather than an aesthetic one: **a shop rings
// far more sales than it takes deliveries.** Sixty documents of a busy week are
// sixty sales, and Tuesday's mis-keyed delivery — the one situation 2 of `5h-i`
// was about — sits below all of them where a thumb never reaches. A switch keeps
// `DOCUMENTS_LIMIT` meaning *sixty of the kind you are looking at*.
//
// ⚠️ IT COSTS TWO QUERIES AND THAT IS THE WIRE'S DOING, NOT THIS SCREEN'S:
// PostgREST reads one table per request and there is no union over `purchase` and
// `sale`. `useDocuments` is called once per kind and the inactive one's answer
// stays cached, so the switch is instant after the first look.
//
// ⚠️ THE ORDER IS `DOCUMENT_KINDS`' AND NOT THE JSX'S (`R3`). Purchases were
// first for the owner's reason of September — *"Compras is completely
// addressable due to the volume and criticality of it"* — and since `8g`
// (2026-10-19) the order is Inicio's, *Ventas, Compras, Desperdicio*, his
// option A: the list is by day, one line per document, opened by a tap (`Fila`).
//
// ----------------------------------------------------------------------------
// ⚠️⚠️ WHAT NO CHECK IN THIS REPOSITORY CAN SEE — `R9`, §2.11
// ----------------------------------------------------------------------------
// Whether a delivery reads at a glance as *that one*; whether the lines under a
// document are worth their room or should be collapsed; whether the switch is
// discoverable at *Letra grande*; whether seven days is the window a shopkeeper
// expects when she scrolls to the bottom and stops. ⚠️ **The owner bounded all of
// it himself** — *"if we can add these functionalities easily reachable and
// usable let's do so. We'll polish the interface later"* — and `5h.5` is where
// the polish lands. **The instrument is his phone.**
//
// ⚠️ THE HALF THAT IS CHECKABLE IS NOT HERE ON PURPOSE. Which documents stand,
// what each one is worth, what each line says, what day it happened on and which
// sentence replaces the list are all in `@/api/documents`, where
// `app/test/api-documents.test.ts` reads them and
// `docs/checks/5h-ii-a-documents-contract.sh` puts the read in front of a real
// database.
// ============================================================================

export default function Documentos() {
  const { scale } = useDensity();
  const insets = useSafeAreaInsets();

  // ⚠️ THE SWITCH IS THE ONLY STATE ON THIS SCREEN, and it holds a
  // `DocumentKind` rather than an index — an index would let a re-ordering of
  // `DOCUMENT_KINDS` silently swap which list a tap opens.
  const [kind, setKind] = useState<DocumentKind>(DOCUMENT_KINDS[0] as DocumentKind);

  // ⚠️⚠️ BOTH KINDS ARE SUBSCRIBED, NOT ONLY THE VISIBLE ONE, AND THAT IS
  // DELIBERATE. Hooks cannot be called conditionally, and the version that could
  // — one `useDocuments(kind)` — would re-fetch on every switch in the pilot
  // store, where half the day has no signal. Two keys, both warm.
  const purchases = useDocuments('purchase');
  const sales = useDocuments('sale');
  // ⚠️ THE THIRD, `6a-ii-a`. The paragraph above is why all of them are
  // subscribed rather than only the visible one, and it holds harder with three:
  // a switch that re-fetched would do it twice as often in a shop with no signal.
  const waste = useDocuments('waste');
  const shown = kind === 'purchase' ? purchases : kind === 'sale' ? sales : waste;

  // ⚠️ WHAT THE CONFIRMATION BOX IS ASKING ABOUT, or `null`. `5h-ii-b`.
  const [asking, setAsking] = useState<Asking | null>(null);

  // ⚠️ `8g` (2026-10-19): THE ONE LINE THAT IS OPEN, or `null`. One at a time,
  // so the screen is never a wall of open documents again; a second tap closes it.
  const [openId, setOpenId] = useState<string | null>(null);
  const toggle = (id: string) => setOpenId((now) => (now === id ? null : id));
  const tone = KIND_TONE[kind];

  // ⚠️⚠️ THE ONE REFUSAL THE UNSENT PATH CAN PRODUCE, AND IT IS LOCAL STATE
  // RATHER THAN A MUTATION'S `error` BECAUSE THERE IS NO MUTATION. Dropping a
  // queued row is a synchronous SQLite delete with no network in it, so there is
  // nothing to be pending and nothing to reject — the only thing that can happen
  // is that the drain claimed the row first, which `remove` reports as `false`.
  // ⚠️ It is cleared by `ask` for exactly the reason the mutation's `error` is:
  // a refusal about one note must never still be on screen over the question
  // about the next one. `5h-ii-b` shipped that bug and found it before CI did.
  const [gone, setGone] = useState<string | null>(null);

  // ⚠️ THE HALF OF `0021`'s FENCE THIS PHONE CAN KNOW — and this screen decides
  // none of it: `mayCorrect` (`@/api/corrections`) does, and the database
  // decides the half that involves a clock.
  const role = useMyRole();
  const { session } = useAuth();
  const userId = session?.user.id ?? null;

  const { correct, working, failed, forget } = useCorrectDocument();

  // ⚠️ THE QUEUE ON THIS PHONE, FOR THE KIND ON SCREEN — and `shown.documents` is
  // the dedupe rather than a second opinion: a row that has landed leaves the
  // unsent group the moment the server list carries it, because the client uuid
  // IS the server row's id. See `@/offline/useUnsent`.
  const unsent = useUnsent(kind, shown.documents);

  // ⚠️⚠️ OPENING OR CLOSING THE QUESTION FORGETS THE LAST REFUSAL, and it is one
  // function rather than two `setAsking` calls so neither path can be the one that
  // forgets. TanStack keeps a mutation's `error` until the next `mutate`, so
  // without this a `TD003` on one document would still be on screen when she asks
  // about the NEXT one — she would read *pídele a un gerente* where the question
  // belongs, about a document nobody had refused her.
  function ask(next: Asking | null): void {
    forget();
    setGone(null);
    setAsking(next);
  }

  // ⚠️ THE CART `Corregir` IS ABOUT TO REPLACE, read so the question can say so
  // BEFORE it happens. `load` replaces and does not merge.
  // ⚠️⚠️ ALL THREE SINCE `6a-ii-b`, AND THE TWO-WAY VERSION WAS A REAL DEFECT
  // RATHER THAN AN OMISSION. The warning used to pick its basket with
  // `CART_KIND[kind] === 'buy' ? buy : sell`, which TYPECHECKS over a
  // three-member union and reads the SELL cart for a write-off — so a shopkeeper
  // correcting a write-off with a half-rung sale open was told she would lose
  // work she was not about to lose, and one with a half-keyed bin round was told
  // nothing at all. A ternary over a union is how a third member arrives
  // unnoticed; `Record<Scope, Cart>` makes a fourth a build error.
  const buyCart = useCart('buy');
  const sellCart = useCart('sell');
  const wasteCart = useCart('waste');
  const carts: Readonly<Record<Scope, Cart>> = {
    buy: buyCart,
    sell: sellCart,
    waste: wasteCart,
  };
  const load = useCartStore((state) => state.load);

  async function run(target: Asking): Promise<void> {
    // ⚠️⚠️ THE UNSENT PATH IS A DIFFERENT ACT AND NOT A DIFFERENT ENDPOINT. There
    // is no void, no reversal document and no window — the note never reached the
    // ledger, so removing it is a delete on this phone and nothing else.
    // ⚠️⚠️ AND THE ORDER IS `5h-ii-b`'s, KEPT FOR ITS REASON: the row leaves the
    // queue BEFORE the cart is loaded. The other way round, a correction keyed
    // with no signal would queue a fresh delivery while the wrong one was still
    // waiting to be sent — **two deliveries rather than one corrected**, which is
    // precisely the duplicate this whole row exists to prevent.
    if (target.unsent) {
      if (!unsent.remove(target.document.id)) {
        // ⚠️ THE BOX STAYS OPEN ON A REFUSAL, `5h-ii-b`'s rule: closing here would
        // take the sentence off the screen before she read it. Nothing was removed
        // and nothing was loaded, so the note is exactly where it was — on its way.
        setGone(ES.documents.unsentGone);
        return;
      }
      ask(null);
      if (target.how === 'eliminar') return;
      // ⚠️ `8p`: an unsent note was never in the ledger, so it corrects nothing
      // there — `unsentPrefillOf`.
      load(unsentPrefillOf(target.document));
      router.push(CORRECTION_ROUTE[target.document.kind]);
      return;
    }

    const done = await correct(target.document, target.how);
    // ⚠️⚠️ A `null` IS A REFUSAL AND THE BOX STAYS OPEN. `failed` is the
    // sentence, and closing here would take it off the screen before she read
    // it. **Nothing was voided on this path**, so the row is still in the list
    // and the cart is untouched.
    if (done === null) return;
    ask(null);
    if (done.prefill === null) return;
    // ⚠️ THE CART IS LOADED ONLY AFTER THE VOID SUCCEEDED — `useCorrectDocument`'s
    // ordering, and the reason a correction cannot become a duplicate.
    load(done.prefill);
    router.push(CORRECTION_ROUTE[target.document.kind]);
  }

  return (
    <View style={{ flex: 1, backgroundColor: PALETTE.fondo }}>
      <Banda />
      <ScrollView
        contentContainerStyle={{
          padding: scale.space,
          gap: scale.space,
          paddingBottom: scale.space * 2 + insets.bottom,
        }}
      >
        {/* ⚠️ `8g`: THE PICKED TAB IN ITS COUNTER'S COLOUR — Inicio's doors:
            Vender green, Comprar blue, Desperdicio berenjena. */}
        <Interruptor
          options={DOCUMENT_KINDS}
          labels={ES.documents.tab}
          picked={kind}
          onPick={(next) => {
            setOpenId(null);
            setKind(next);
          }}
          ink={tone.ink}
          soft={tone.soft}
        />
        {/* ⚠️⚠️ THE UNSENT GROUP IS ABOVE THE WINDOW'S SUBTITLE AND NOT INSIDE IT,
            because `ES.documents.subtitle` names the SEVEN-DAY WINDOW, which
            describes the server's list — and these notes are not in it yet.
            ⚠️ Quoting that sentence here rather than naming it is what turns the
            conventions gate red: a JSX comment is code to `R4`, which reads the
            file and not the AST. */}
        {/* ⚠️ It is absent rather than empty when the
            queue is clear, which is the ordinary state in a shop with signal: a
            permanent heading over nothing would teach her to stop reading it.
            ⚠️ **Whether the heading alone is enough to tell the two groups apart
            once she scrolls is a look-question and it is `R9`'s** — the owner's
            phone decides, and `5h.5` is where a per-row mark would land. */}
        {unsent.documents.length > 0 ? (
          // ⚠️ `8g`: ONE AMBER CARD — amber is Inicio's colour for something
          // that waits, never an error's. The lines in it open like any other.
          <View
            style={{
              gap: scale.rowGap,
              padding: scale.space,
              borderRadius: scale.space,
              backgroundColor: PALETTE.atencionSuave,
            }}
          >
            <Rotulo text={`${ES.documents.unsent} · ${unsent.documents.length}`} ink={PALETTE.atencion} />
            <View style={{ borderRadius: scale.rowGap, backgroundColor: PALETTE.superficie, overflow: 'hidden' }}>
              {unsent.documents.map((one, i) => (
                <Fila
                  key={one.id}
                  document={one}
                  first={i === 0}
                  open={openId === one.id}
                  onToggle={() => toggle(one.id)}
                  canCorrect={mayCorrect(one, role, userId)}
                  onAsk={(document, how) => ask({ document, how, unsent: true })}
                />
              ))}
            </View>
            <Text style={{ fontSize: scale.smallSize, color: PALETTE.atencion }}>
              {ES.documents.unsentNote}
            </Text>
          </View>
        ) : null}
        <Cuerpo
          kind={kind}
          documents={shown}
          openId={openId}
          onToggle={toggle}
          canCorrect={(document) => mayCorrect(document, role, userId)}
          onAsk={(document, how) => ask({ document, how, unsent: false })}
        />
      </ScrollView>
      <Confirmacion
        asking={asking}
        working={working}
        /* ⚠️ ONE SENTENCE SLOT AND TWO SOURCES: the mutation's refusal on a note
           that landed, and this screen's own on one the drain took first. They can
           never both be set — `ask` clears both, and only one of the two paths
           runs. */
        failed={asking !== null && asking.unsent ? gone : failed}
        busy={asking !== null && carts[CART_KIND[asking.document.kind]].length > 0}
        onConfirm={() => {
          if (asking !== null) void run(asking);
        }}
        onCancel={() => ask(null)}
      />
    </View>
  );
}

/** What the confirmation box is asking about. */
interface Asking {
  readonly document: ShopDocument;
  readonly how: Correction;
  /**
   * ⚠️⚠️ IS THIS NOTE STILL ON THE PHONE? It picks the question, the act and the
   * refusal, and it is carried on what the box is ASKING about rather than looked
   * up again when she confirms — the two lists are drawn from different sources
   * and a row can move between them while the box is open.
   */
  readonly unsent: boolean;
}

/** The module's word, and the way back to wherever you came from. */
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
      <Text
        numberOfLines={1}
        style={{ flex: 1, fontSize: scale.titleSize, ...TITULO, color: PALETTE.tinta }}
      >
        {ES.documents.title}
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
          {ES.documents.back}
        </Text>
      </Pressable>
    </View>
  );
}

/**
 * Which of the three things this screen is looking at, drawn.
 *
 * ⚠️⚠️ `unknown` IS A SPINNER AND NOT AN EMPTY STATE — the distinction
 * `takingsFrom`, `costsFrom` and `memoryState` each make in their own words.
 * Getting it wrong here tells a shopkeeper she has no deliveries this week, on a
 * phone that simply has no signal, on the one screen she opened to find one.
 *
 * ⚠️ THE SENTENCE IS CHOSEN IN `@/api/documents` AND NOT HERE (`R12`, `R4`):
 * `documentsLine` knows which of *Buscando…*, *no hay compras*, *no hay ventas*
 * and an `ES.api` failure applies, and answers `''` when the list itself is the
 * answer.
 */
function Cuerpo({
  kind,
  documents,
  openId,
  onToggle,
  canCorrect,
  onAsk,
}: {
  kind: DocumentKind;
  documents: DocumentsLineInput;
  openId: string | null;
  onToggle: (id: string) => void;
  canCorrect: (document: ShopDocument) => boolean;
  onAsk: (document: ShopDocument, how: Correction) => void;
}) {
  const { scale } = useDensity();
  const line = documentsLine(kind, documents);
  const today = isoDay(new Date());

  if (documents.state === 'unknown') {
    return (
      <View style={{ padding: scale.space * 2, alignItems: 'center', gap: scale.rowGap }}>
        <ActivityIndicator color={PALETTE.accion} />
        <Text
          style={{ fontSize: scale.bodySize, color: PALETTE.tintaApagada, textAlign: 'center' }}
        >
          {line}
        </Text>
      </View>
    );
  }

  // ⚠️ `8g`: AN EMPTY WEEK SAID PLAINLY, with what will appear here — never a
  // grey line that reads like something failed. A FAILED read keeps `Vacio`
  // and its own sentence: *nothing* and *could not ask* are two facts.
  if (documents.state === 'nothing') {
    if (documents.failed === null) return <SemanaVacia kind={kind} />;
    return <Vacio line={line} />;
  }

  const tone = KIND_TONE[kind];
  return (
    <View style={{ gap: scale.space }}>
      {byDay(documents.documents).map((group) => (
        <View key={group.day} style={{ gap: scale.rowGap }}>
          {/* ⚠️ `8g`: THE DAY IN INICIO'S SMALL CAPITALS, how many, and what the
              day's documents that still stand add up to. */}
          <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: scale.space, paddingHorizontal: scale.rowGap / 2 }}>
            <Rotulo text={`${dayHeading(group.day, today)} · ${ES.documents.count[kind](group.documents.length)}`} />
            {group.grossCentavos === null ? null : (
              <Text style={{ fontSize: scale.bodySize, fontWeight: '700', color: tone.ink }}>
                {formatMXN(group.grossCentavos)}
              </Text>
            )}
          </View>
          <View
            style={{
              borderRadius: scale.space,
              borderWidth: 1,
              borderColor: PALETTE.linea,
              backgroundColor: PALETTE.superficie,
              overflow: 'hidden',
            }}
          >
            {group.documents.map((one, i) => (
              <Fila
                key={one.id}
                document={one}
                first={i === 0}
                open={openId === one.id}
                onToggle={() => onToggle(one.id)}
                canCorrect={canCorrect(one)}
                onAsk={onAsk}
              />
            ))}
          </View>
        </View>
      ))}
      <Text style={{ fontSize: scale.smallSize, color: PALETTE.tintaApagada, textAlign: 'center' }}>
        {ES.documents.subtitle}
      </Text>
    </View>
  );
}

/**
 * One document as one line — the time, what it was, what it came to — opened
 * by a tap to its lines and, where she may, *Corregir* and *Eliminar*. `8g`,
 * the owner's option A of 2026-10-19.
 *
 * ⚠️⚠️ THE LINE IS PRESSABLE AND IT MEANS ONE THING: OPEN. `5h-ii-b` kept the
 * card unpressable because a whole-card tap would have had to mean *Corregir*
 * or *Eliminar*; here it means neither — it shows the document, and the two
 * labelled controls inside are still the only things that write.
 *
 * ⚠️ AND THE CONTROLS ARE STILL ABSENT RATHER THAN DISABLED where `mayCorrect`
 * says no (`5h-ii-b`'s ruling): a cashier opening somebody else's sale reads it.
 */
function Fila({
  document,
  first,
  open,
  onToggle,
  canCorrect,
  onAsk,
}: {
  document: ShopDocument;
  first: boolean;
  open: boolean;
  onToggle: () => void;
  canCorrect: boolean;
  onAsk: (document: ShopDocument, how: Correction) => void;
}) {
  const { scale } = useDensity();
  const { title, subtitle } = rowTitle(document);
  const tone = KIND_TONE[document.kind];
  return (
    <View style={{ borderTopWidth: first ? 0 : 1, borderTopColor: PALETTE.linea }}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={[clockOf(document.at), title, subtitle ?? '', document.amount ?? '']
          .filter((part) => part !== '')
          .join('. ')}
        onPress={onToggle}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: scale.rowGap,
          minHeight: scale.rowHeight,
          paddingVertical: scale.rowGap,
          paddingHorizontal: scale.space,
        }}
      >
        <Text style={{ width: scale.tapTarget, fontSize: scale.smallSize, color: PALETTE.tintaApagada }}>
          {clockOf(document.at)}
        </Text>
        <View style={{ flex: 1, gap: scale.rowGap / 4 }}>
          <Text numberOfLines={1} style={{ fontSize: scale.bodySize, fontWeight: '600', color: PALETTE.tinta }}>
            {title}
          </Text>
          {subtitle === null ? null : (
            <Text numberOfLines={1} style={{ fontSize: scale.smallSize, color: PALETTE.tintaApagada }}>
              {subtitle}
            </Text>
          )}
        </View>
        {/* ⚠️ A WRITE-OFF CARRIES NO PESO FIGURE (the area-9 ruling of
            2026-09-14): the slot is absent, not empty. */}
        {document.amount === null ? null : (
          <Text style={{ fontSize: scale.bodySize, fontWeight: '700', color: PALETTE.tinta }}>
            {document.amount}
          </Text>
        )}
        <MaterialCommunityIcons
          name={open ? 'chevron-up' : 'chevron-down'}
          size={scale.iconSize}
          color={PALETTE.tintaApagada}
        />
      </Pressable>

      {open ? (
        <View
          style={{
            gap: scale.rowGap,
            paddingBottom: scale.space,
            paddingLeft: scale.space + scale.tapTarget + scale.rowGap,
            paddingRight: scale.space,
          }}
        >
          <Separador />
          {document.lines.map((line) => (
            <View
              key={line.id}
              style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: scale.rowGap }}
            >
              <Text numberOfLines={1} style={{ flex: 1, fontSize: scale.bodySize, color: PALETTE.tinta }}>
                {line.name}
              </Text>
              <Text style={{ fontSize: scale.bodySize, color: PALETTE.tintaApagada }}>{line.quantity}</Text>
              {/* ⚠️ THE CAUSE ON A LINE ONLY WHEN THE DOCUMENT'S LINES DISAGREE
                  (`@/api/documents` answers `null` for the document's own cause). */}
              {document.cause === null && line.reason !== null ? (
                <Text style={{ fontSize: scale.bodySize, color: PALETTE.tintaApagada }}>{line.reason}</Text>
              ) : null}
              {line.amount === null ? null : (
                <Text style={{ fontSize: scale.bodySize, fontWeight: '600', color: PALETTE.tinta }}>{line.amount}</Text>
              )}
            </View>
          ))}
          {/* ⚠️⚠️ `CORRECTABLE` IS *IS IT BUILT* AND `canCorrect` IS *MAY SHE* —
              two reasons a control is absent, kept as two conditions. */}
          {CORRECTABLE[document.kind] && canCorrect ? (
            <View style={{ flexDirection: 'row', gap: scale.rowGap, marginTop: scale.rowGap / 2 }}>
              <Boton inRow label={ES.documents.correct} tone={tone.ink} onPress={() => onAsk(document, 'corregir')} />
              <Boton inRow label={ES.documents.remove} tone={PALETTE.error} onPress={() => onAsk(document, 'eliminar')} />
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

/** ⚠️ `8g`: the week with nothing on this tab, in its counter's colour. */
function SemanaVacia({ kind }: { kind: DocumentKind }) {
  const { scale } = useDensity();
  const tone = KIND_TONE[kind];
  const side = scale.tapTarget * 1.7;
  const copy = ES.documents.emptyWeek[kind];
  return (
    <View style={{ alignItems: 'center', gap: scale.space, paddingTop: scale.space * 2, paddingHorizontal: scale.space }}>
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={{ width: side, height: side, borderRadius: side / 2, backgroundColor: tone.soft, alignItems: 'center', justifyContent: 'center' }}
      >
        <MaterialCommunityIcons name={KIND_ICON[kind]} size={scale.iconSize * 1.6} color={tone.ink} />
      </View>
      <Text style={{ fontSize: scale.titleSize, ...TITULO, color: PALETTE.tinta, textAlign: 'center' }}>{copy.title}</Text>
      <Text style={{ fontSize: scale.bodySize, color: PALETTE.tintaApagada, textAlign: 'center' }}>{copy.hint}</Text>
    </View>
  );
}


/** ⚠️ `8g`: each kind in its counter's colour, as Inicio's three doors are. */
const KIND_TONE: Readonly<Record<DocumentKind, { readonly ink: string; readonly soft: string }>> = {
  sale: { ink: PALETTE.accion, soft: PALETTE.accionSuave },
  purchase: { ink: PALETTE.compra, soft: PALETTE.compraSuave },
  waste: { ink: PALETTE.desperdicio, soft: PALETTE.desperdicioSuave },
};

const KIND_ICON: Readonly<Record<DocumentKind, 'cash-register' | 'truck-delivery-outline' | 'delete-outline'>> = {
  sale: 'cash-register',
  purchase: 'truck-delivery-outline',
  waste: 'delete-outline',
};

/**
 * The question, the wait and the refusal — one box, three states.
 *
 * ⚠️⚠️ IT IS A CENTRED CARD WITH ITS OWN SCRIM, WHICH IS THE OWNER'S OWN RULING
 * AND NOT A CHOICE MADE HERE. 2026-09-24, about the cart-emptying confirmation:
 * *"it should be a separate box in the center of the screen with it's scrim with
 * a confirmation message."* **Vender already draws exactly this**, so a second
 * shape for the same act — *are you sure* — would be this app teaching two
 * gestures for one idea.
 *
 * ⚠️⚠️ AND THE REFUSAL IS SHOWN **HERE** RATHER THAN AS A BANNER, because this
 * is where her thumb already is and because the box is what she must dismiss.
 * A sentence at the top of a scrolled list is a sentence she never sees.
 *
 * ⚠️ THE WAIT HAS NO BUTTONS AT ALL. A second tap on `Sí, corregir` would be a
 * second void — answered idempotently by `0021` rather than duplicated, so it is
 * safe — but a control that does nothing visible is what makes a person tap
 * harder. ⚠️ **`Cancelar` GOES TOO, and that is the honest half**: the write is
 * in flight and there is nothing left to cancel.
 */
function Confirmacion({
  asking,
  working,
  failed,
  busy,
  onConfirm,
  onCancel,
}: {
  asking: Asking | null;
  working: boolean;
  failed: string | null;
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { scale } = useDensity();
  if (asking === null) return null;

  const correcting = asking.how === 'corregir';

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
              <Frase text={ES.documents.working} />
            </>
          ) : failed !== null ? (
            <>
              <Frase text={failed} />
              <Boton
                label={ES.documents.gotIt}
                tone={PALETTE.accion}
                onPress={onCancel}
              />
            </>
          ) : (
            <>
              <Frase text={correctionAsk(asking.how, asking.unsent)} />
              {/* ⚠️ THE SECOND LINE ONLY WHEN THERE IS SOMETHING TO LOSE — see
                  `ES.documents.correctBusy`. An `Eliminar` touches no cart. */}
              {correcting && busy ? <Frase text={ES.documents.correctBusy} /> : null}
              <View style={{ gap: scale.rowGap }}>
                {/* ⚠️ `8g`: THE OWNER'S BUTTONS RULING OF 2026-10-16 (option 2),
                    as the emptying box draws it: the answer solid — red when it
                    destroys — and the way back a quiet white button. */}
                <Boton
                  label={correcting ? ES.documents.correctConfirm : ES.documents.removeConfirm}
                  tone={correcting ? PALETTE.accion : PALETTE.error}
                  onPress={onConfirm}
                  lleno
                />
                <BotonLleno label={ES.documents.cancel} onPress={onCancel} variante="discreto" />
              </View>
            </>
          )}
        </View>
      </View>
    </View>
  );
}
