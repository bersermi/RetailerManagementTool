import { useState, type ReactNode } from 'react';
import { Keyboard, KeyboardAvoidingView, Modal, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { isoDay, type CatalogEntry } from '@/api/catalog';
import { useUnitFactors } from '@/api/hooks';
import { earningsAt } from '@/api/productPage';
import { pricePlan, queuePrice } from '@/api/shelfPrice';
import { formatMXN } from '@/format/mxn';
import { commitPrice } from '@/lib/commitRunner';
import { newWriteId, nowIso } from '@/lib/ids';
import { ES } from '@/strings';
import type { Picture } from '@/api/photos';
import { useDensity } from '@/theme/DensityProvider';
import { ESQUINA } from '@/theme/density';
import { letraTitulo } from '@/theme/letra';
import { PALETTE } from '@/theme/palette';
import { BotonLleno } from '@/ui/BotonLleno';
import { Retrato } from '@/ui/Retrato';
import { Velo } from '@/ui/Velo';

// ============================================================================
// CAMBIAR PRECIO — ONE SHEET, TWO DOORS: a tap on a price in Vender (the
// owner's ruling of 2026-10-14) and *Cambiar precio* on a product's page in
// Productos (`8g`, 2026-10-17). Moved here from `(tabs)/vender.tsx` when the
// second door arrived, so both write through one path (`R14`).
// ============================================================================

/**
 * THE PRICE SHEET — the owner's ruling of 2026-10-14, opened by a tap on a row's
 * price, for the owner and a manager. Its frame is `HojaPrecio`, below — in
 * `src/ui/` of its own from round 4 of `8g` to `14.3`, while Comprar's cost
 * question drew it too.
 *
 * ⚠️⚠️ `8i`, THE OWNER'S RULING OF 2026-11-01: IT SAVES WITH OR WITHOUT SIGNAL.
 * *Guardar* puts the price on the phone (`commitPrice`) and closes at once; the
 * product wears it from that frame on and the price goes to the shop when it can
 * (`@/api/shelfPrice`). If somebody changed it in the meantime, theirs stays and
 * hers is dropped, and nobody is told. So there is nothing to wait for and no
 * failure to show: the one line it can say is that what she typed is not a price.
 *
 * ⚠️ IT READS NOTHING BEFORE IT CAN SAVE. What it sends — the scope and the price
 * she saw — is the catalog row's (`pricePlan`), which the phone already holds.
 *
 * ⚠️ R9: whether a tap on the price reads as an invitation at the counter, and
 * whether the keyboard covers the box on a small phone, are the owner's phone's.
 */
export function PrecioRapido({
  entry,
  adding,
  workspaceId,
  onSaved,
  onClose,
  bare = false,
  cost = null,
}: {
  entry: CatalogEntry;
  /** `8g`: opened by `+` on a product with no price — saving also adds one. */
  adding: boolean;
  workspaceId: string;
  /** Called once the price is set, before the sheet closes. */
  onSaved: () => void;
  onClose: () => void;
  /** Drawn inside the Carrito's `Modal` rather than as a `Modal` of its own. */
  bare?: boolean;
  /**
   * ⚠️ `8g`, THE OWNER'S ONE HOOK IN PRODUCTOS (*"Earnings while typing"*): what
   * one price unit last cost, in centavos. Given, the sheet says what the typed
   * price would earn on it as it is typed; `null` or absent, it says nothing.
   */
  cost?: { readonly centavos: number | null; readonly label: string } | null;
}) {
  const { scale } = useDensity();
  const factors = useUnitFactors();

  const [typed, setTyped] = useState('');
  const [unreadable, setUnreadable] = useState(false);

  function guardar() {
    const plan = pricePlan({ workspaceId, entry, typed, factors, today: isoDay(new Date()) });
    setUnreadable(false);
    if (plan.kind === 'unreadable') {
      setUnreadable(true);
      return;
    }
    if (plan.kind === 'set') {
      const price = queuePrice(plan.draft, { id: newWriteId(), now: nowIso() });
      if (price === null) {
        setUnreadable(true);
        return;
      }
      commitPrice(price);
      Keyboard.dismiss();
      // ⚠️ AFTER `commitPrice`, WHICH HAS ALREADY PUT THE PRICE ON SCREEN
      // (`@/offline/waitingPrices`), so the line `onSaved` adds is priced the
      // moment it lands — never an amber line for a frame.
      onSaved();
      onClose();
      return;
    }
    // Nothing typed, or the price it already has: nothing to save.
    Keyboard.dismiss();
    onClose();
  }

  const line = unreadable ? ES.catalog.editIssues.priceUnreadable : null;
  const unit = ES.units[entry.priceUnit as keyof typeof ES.units] ?? entry.priceUnit;
  const earned = cost === null ? null : earningsAt(typed, cost.centavos);
  const note =
    cost === null || earned === null ? null : (
      <Text style={{ fontSize: scale.bodySize, fontWeight: '700', color: earned < 0 ? PALETTE.error : PALETTE.accion }}>
        {earned < 0
          ? ES.products.loses(cost.label, formatMXN(-earned), unit)
          : ES.products.earns(cost.label, formatMXN(earned), unit)}
      </Text>
    );

  return (
    <HojaPrecio
      bare={bare}
      name={entry.name}
      picture={entry.picture}
      detail={entry.centavos === null ? ES.sell.priceSheet.first : ES.sell.priceSheet.now(entry.price)}
      question={entry.centavos === null ? ES.sell.priceSheet.ask : ES.sell.priceSheet.askAgain}
      value={typed}
      onChange={setTyped}
      per={ES.sell.per(unit)}
      inputLabel={ES.sell.priceSheet.title(entry.name)}
      line={line}
      note={note}
      act={adding ? ES.sell.priceSheet.saveAndAdd : ES.sell.priceSheet.save}
      onAct={guardar}
      cancel={ES.sell.priceSheet.cancel}
      onClose={onClose}
    />
  );
}

// ============================================================================
// THE SHEET'S FRAME — `HojaPrecio`, IN THIS FILE SINCE `14.3`. It entered
// `src/ui/` at round 4 of `8g` as Comprar's cost question drew it a second time;
// `14.3` moved that question into the counter's pad (call 9), so it had one
// caller again and lives here, unchanged — `Deslizador`'s precedent inside
// `CierreCarrito` (`R14`). Its header, as it was:
//
// THE ONE-QUESTION MONEY SHEET — a product, the one figure it is missing, and
// the one act that saves it. Vender asks *¿A cuánto lo vendes?* (the owner's
// ruling of 2026-10-14); Comprar asks *¿Cuánto te costó?* (round 4 of `8g`,
// 2026-10-16: *"to add something to the carrito, a price must be entered
// first"*, the same rule Vender got the day before).
//
// ⚠️⚠️ `R14`: COMPRAR IS THE SECOND FILE, AND THE FRAME MOVED SO THE TWO SHEETS
// ARE ONE SHAPE — the owner's *"make sure the geometries in common are the
// same."* What each one SAVES stays in its screen: Vender writes a price through
// the edit screen's own path, Comprar writes the delivery's cost into the cart.
//
// ⚠️ `tone` IS A DECIDED DIFFERENCE (`R16`): the box's edge is `accion` on Vender
// and `compra` on Comprar, where every cost a person types is blue.
//
// ⚠️⚠️ `padding` ON BOTH PLATFORMS — a `Modal` is a window Expo's `resize` does
// not shorten, so Android's `undefined` let the number pad cover the box and the
// button (`8g`, found on the emulator 2026-10-15).
//
// ⚠️ THE BOX IS EMPTY AND THE FIGURE NOW IS SAID ABOVE IT — a proposal must not
// look decided: a mirror, never a pre-fill.
//
// ⚠️ R9, MEASURED ON THE EMULATOR IN ROUND 4 AND LEFT AS IT WAS: on Android the
// cursor lands in the box but the number pad waits for a tap on it — `autoFocus`,
// a focus after the slide and a focus from `onShow` all gave the same answer,
// because Android keeps the activity's window focused under a `Modal`. It was
// Vender's behaviour before this file existed. Whether it is so on a real phone
// is the pilot Android's question, not this emulator's.
// ============================================================================

function HojaPrecio({
  name,
  detail,
  question,
  value,
  onChange,
  per,
  inputLabel,
  note = null,
  line = null,
  act,
  onAct,
  busy = false,
  cancel,
  onClose,
  tone = PALETTE.accion,
  tile,
  picture = null,
  bare = false,
}: {
  /** The product — the sheet says which before it asks anything. */
  name: string;
  /** `8o`: its photo beside the name, or its initials. */
  picture?: Picture | null;
  /** The line under the name: what the figure is now, or that there is none. */
  detail: string;
  /** The sheet's one question, in the titles' face. */
  question: string;
  value: string;
  onChange: (text: string) => void;
  /** What the figure is per — *por kg*. */
  per: string;
  /** The box, to a screen reader. */
  inputLabel: string;
  /** Under the box: Comprar's margin while she types. */
  note?: ReactNode;
  /** A refusal or a failure, in `error`. */
  line?: string | null;
  /** The one act's word, and the act. */
  act: string;
  onAct: () => void;
  busy?: boolean;
  cancel: string;
  onClose: () => void;
  tone?: string;
  /** The product's tile colours — `Retrato`'s own `ground`/`ink`. */
  tile?: { ground: string; ink: string };
  /** Drawn inside a `Modal` that is already up (the Carrito's). */
  bare?: boolean;
}) {
  const { scale } = useDensity();
  const insets = useSafeAreaInsets();

  const sheet = (
    <View style={{ flex: 1 }}>
      <Velo label={cancel} onPress={onClose} />
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1, justifyContent: 'flex-end' }}>
        <View
          style={{
            borderTopLeftRadius: ESQUINA.hoja,
            borderTopRightRadius: ESQUINA.hoja,
            backgroundColor: PALETTE.fondo,
            padding: scale.space * 1.5,
            paddingBottom: scale.space * 1.5 + insets.bottom,
            gap: scale.space,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale.space }}>
            <Retrato name={name} picture={picture} small ground={tile?.ground} ink={tile?.ink} />
            <View style={{ flex: 1, gap: scale.rowGap / 4 }}>
              <Text style={{ fontSize: scale.bodySize, fontWeight: '700', color: PALETTE.tinta }}>{name}</Text>
              <Text style={{ fontSize: scale.smallSize, color: PALETTE.tintaApagada }}>{detail}</Text>
            </View>
          </View>

          <Text style={{ ...letraTitulo(scale), color: PALETTE.tinta }}>{question}</Text>

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: scale.rowGap,
              minHeight: scale.tapTarget * 1.4,
              paddingHorizontal: scale.space,
              borderRadius: ESQUINA.campo,
              borderWidth: 2,
              borderColor: tone,
              backgroundColor: PALETTE.superficie,
            }}
          >
            <Text style={{ fontSize: scale.titleSize, fontWeight: '700', color: PALETTE.tinta }}>$</Text>
            <TextInput
              value={value}
              onChangeText={onChange}
              returnKeyType="done"
              keyboardType="decimal-pad"
              autoFocus
              editable={!busy}
              accessibilityLabel={inputLabel}
              style={{ flex: 1, fontSize: scale.titleSize, fontWeight: '700', color: PALETTE.tinta }}
            />
            <Text style={{ fontSize: scale.bodySize, color: PALETTE.tintaApagada }}>{per}</Text>
          </View>

          {note}

          {line !== null ? <Text style={{ fontSize: scale.bodySize, color: PALETTE.error }}>{line}</Text> : null}

          {/* ⚠️ `8g`, *option 2*: THE sheet's one act, solid; the way out quiet. */}
          <BotonLleno label={act} onPress={onAct} busy={busy} variante="principal" />
          <BotonLleno
            label={cancel}
            onPress={() => {
              if (!busy) onClose();
            }}
            variante="discreto"
          />
        </View>
      </KeyboardAvoidingView>
    </View>
  );

  if (bare) {
    return <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}>{sheet}</View>;
  }
  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      {sheet}
    </Modal>
  );
}
