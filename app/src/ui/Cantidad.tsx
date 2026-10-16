// ============================================================================
// §2.11's `QtyInput` — THE STEPPER **AND** THE KEYPAD, ON EVERY PRODUCT. Plan
// task `5g-ii`, and see `src/ui/Buscador.tsx` for why this directory exists now.
//
// ⚠️⚠️ IT IS NOT A SWITCH, AND THE ADR SAID IT WAS UNTIL 2026-09-24. §2.8 read
// *"stepper for discrete units, decimal keypad for weight and volume… never the
// same control for both"* and §2.11 named this primitive as the SWITCH between
// them. The owner amended both: *"Amend it to say both, this should be easily
// switchable and configurable. The step for the stepper and essentially any
// product qty can be set by keypad. If a user wants to sell 15 manojos of
// cilantro, he shouldn't have to click the stepper 14 times."*
// ⚠️ **A keypad is about MAGNITUDE and not precision**, which is why counts get
// one too: there is no 288th of a `pza`, and there are fifteen manojos.
//
// ⚠️ WHAT SURVIVES OF THE ORIGINAL RULE IS THE REASON IT WAS WRITTEN: the two
// controls are for two different acts — `−`/`+` for *one more of the usual
// amount*, the box for *this exact number* — so they must be distinguishable and
// one tap apart, not one box that behaves differently per product.
//
// ⚠️⚠️ THE STEP IS `price_unit_code`'s FACTOR AND NOT A NUMBER THIS FILE PICKS
// (C3.8), and *configurable* needs no new affordance: the shopkeeper chooses
// that unit in `Agregar` and `Editar`, so pricing *por cuarto* makes the step
// 250 g. **A step set INDEPENDENTLY of the price unit is a different thing and
// is not built** — `5f-ii`'s row records that reading.
//
// ----------------------------------------------------------------------------
// ⚠️⚠️ WHY IT IS A PRIMITIVE NOW: FOUR DRAWINGS, AND `scope` IS THE ONLY
// DIFFERENCE BETWEEN THEM
// ----------------------------------------------------------------------------
// `vender.tsx` drew it twice — on the list row and inside the basket sheet —
// and Comprar needs both again. The copy in Vender hard-coded `'sell'` at three
// call sites into the store; that is the whole delta, so it is a PROP rather
// than a second component. ⚠️ **A second copy would be a second set of rules
// about what a tap of `+` adds**, and C3.8 is exacting about that.
//
// ⚠️⚠️ SIX DRAWINGS AS OF `6a-i`, AND THE PROP WAS **RENAMED** RATHER THAN
// WIDENED. Desperdicio draws it twice more and counts into a third basket, so
// this prop's type is now `Scope` (`@/cart/cart`) and not `@tienda/money`'s
// `Kind`. ⚠️ **The rename is the load-bearing half**: `Scope` is a superset of
// `Kind` as a string union, so leaving the name alone would have type-checked
// on every call site and left a prop called `kind` holding something that is not
// a `Kind` — in a file whose only job is to know which basket it is counting
// into. `R16`'s *the difference between the copies becomes a prop* is satisfied
// either way; naming it correctly is what keeps the sixth caller readable.
//
// ⚠️ WHICH UNIT THE BOX SPEAKS IN IS `@/cart/quantity`'s DECISION, never this
// file's, and `app/test/cart-quantity.test.ts` reads it (`R3`). Nothing here
// converts anything.
// ============================================================================

import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useRef, useState } from 'react';
import { Keyboard, Pressable, Text, TextInput, View } from 'react-native';

import type { CatalogEntry, UnitFactors } from '@/api/catalog';
import { stepOf, type Scope } from '@/cart/cart';
import { baseFromShown, qtyShown, shownUnitOf } from '@/cart/quantity';
import { useCartStore } from '@/cart/store';
import { ES } from '@/strings';
import { useDensity } from '@/theme/DensityProvider';
import { PALETTE } from '@/theme/palette';

export function Cantidad({
  entry,
  base,
  factors,
  scope,
  onEdit,
  padId,
  refusal = null,
  fill = false,
}: {
  entry: CatalogEntry;
  base: number;
  factors: UnitFactors;
  /** Which basket this box is counting into. The only thing the three capture
   *  screens disagree about — see this file's header. */
  scope: Scope;
  // ⚠️ OPTIONAL BECAUSE THE SHEET HAS NO LIST TO SCROLL. On the list this tells
  // the screen which row the keyboard is about to cover; inside the sheet there
  // are only the lines already in the basket, and nothing virtualises them.
  onEdit?: (editing: boolean) => void;
  /**
   * The `InputAccessoryView` carrying *Listo*, when the screen mounts one.
   *
   * ⚠️ OPTIONAL, AND `undefined` IS THE HONEST VALUE ON ANDROID — where
   * `InputAccessoryView` does not exist in React Native and the system draws its
   * own dismiss control. `nuevo.tsx` established both halves of that.
   */
  padId?: string;
  /**
   * ⚠️⚠️ `8g`, THE OWNER'S RULING OF 2026-10-15: ON VENDER A PRODUCT WITH NO
   * PRICE NEVER ENTERS THE BASKET. When set, `+` and the box count nothing: a
   * tap on either calls `onTap` instead — the price sheet for somebody who may
   * price it, a note for somebody who may not — and `dim` draws `+` as
   * unavailable for the second. `@/cart/gate` decides which; this file only
   * obeys. Comprar and Desperdicio never pass it.
   */
  refusal?: { readonly dim: boolean; readonly onTap: () => void } | null;
  /**
   * ⚠️ ROUND 4 OF `8g` (2026-10-16): A COMPRAR CARD'S STEPPER — the two round
   * buttons at the card's edges and the box taking what is between them. The
   * buttons, the box's height, edge and words are every other stepper's: the
   * owner's *"make sure the geometries in common are the same."* Only the box's
   * WIDTH gives, because two cards side by side are narrower than Vender's row.
   */
  fill?: boolean;
}) {
  const { scale } = useDensity();
  const setQty = useCartStore((state) => state.setQty);
  const bump = useCartStore((state) => state.step);
  const input = useRef<TextInput>(null);

  const unit = shownUnitOf(entry);
  const by = stepOf(entry.priceUnit, factors);
  const settled = base === 0 ? '' : (qtyShown(base, unit, factors) ?? '');

  // ⚠️⚠️ THE BOX KEEPS WHAT WAS TYPED WHILE IT IS BEING TYPED, AND THAT IS NOT
  // A CONVENIENCE. `0.` is not a quantity, so committing on every keystroke
  // would delete the line the instant a thumb reached the decimal point and the
  // digit after it would land on an empty row. ⚠️ A parseable keystroke DOES
  // commit, because the sticky `Total` a customer is watching must not lag the
  // number she is reading. ⚠️ And `null` means *the store is the truth*, which
  // is what makes `−` and `+` show up in the box while it is untouched.
  const [draft, setDraft] = useState<string | null>(null);
  const shown = draft ?? settled;

  const typeInto = (text: string) => {
    setDraft(text);
    if (text.trim() === '') {
      setQty(scope, entry.id, 0);
      return;
    }
    const next = baseFromShown(text, unit, factors);
    if (next !== null) setQty(scope, entry.id, next);
  };

  // ⚠️ THE UNIT'S WORD IS `ES.units`' AND NEVER THE CODE (`R4`): `250g` is what
  // the database calls it and *250 gr* is what a shopkeeper reads.
  const word = ES.units[unit as keyof typeof ES.units] ?? unit;
  const counted = base > 0;

  return (
    // ⚠️ THE SAME FOOTPRINT AS BEFORE `8g` — two taps, a box half as wide again
    // and two half-gaps. Comprar draws this beside its cost box, and 13 points
    // wider cut its amber *Primera vez con este proveedor* to an ellipsis on the
    // emulator; a warning with its end missing is a warning half given.
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale.rowGap / 2,
        alignSelf: fill ? 'stretch' : undefined,
      }}
    >
      <Paso
        label={ES.counter.less}
        glyph="minus"
        // ⚠️⚠️ ABSENT AT ZERO, AND IT WAS *DISABLED* UNTIL `8g`. Stepping down
        // through zero removes a line that is not there, and a control that
        // looks live and does nothing is the shape this repository refuses by
        // name; the owner's row B goes one further and draws nothing, so a row
        // at rest carries one green `+` and the rows already in the sale are the
        // ones with two buttons. ⚠️ The slot is KEPT, so the box does not move
        // under a thumb when `−` appears.
        hidden={!counted}
        disabled={by === null || !counted}
        onPress={() => {
          setDraft(null);
          bump(scope, entry.id, by, -1);
        }}
      />

      {/* ⚠️ THE UNIT IS RENDERED INSIDE THE BOX AND ALWAYS — the half of §2.8's
          *Unit-aware input* row that was never in question. It moved inside on
          `8g` (*2 pza*, *750 gr*), which is a sentence and saves the line under
          the box. ⚠️ A tap anywhere on the box reaches the field. */}
      <Pressable
        accessibilityRole={refusal === null ? undefined : 'button'}
        accessibilityLabel={refusal === null ? undefined : `${ES.counter.qty} ${word}`}
        onPress={refusal === null ? () => input.current?.focus() : refusal.onTap}
        style={{
          width: fill ? undefined : scale.tapTarget * 1.5,
          flex: fill ? 1 : undefined,
          minHeight: scale.tapTarget,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: scale.rowGap / 2,
          paddingHorizontal: scale.rowGap / 2,
          borderRadius: scale.space,
          borderWidth: counted ? 2 : 1,
          borderColor: counted ? PALETTE.accion : PALETTE.linea,
          backgroundColor: refusal?.dim === true ? PALETTE.fondo : PALETTE.superficie,
        }}
      >
        {refusal === null ? (
          <TextInput
            ref={input}
            value={shown}
            onChangeText={typeInto}
            // ⚠️ THE ROW TELLS THE SCREEN IT IS THE ONE BEING TYPED INTO, and the
            // screen scrolls it into view once the keyboard is actually up.
            onFocus={() => onEdit?.(true)}
            onBlur={() => {
              onEdit?.(false);
              setDraft(null);
            }}
            editable={by !== null}
            // ⚠️ `decimal-pad` AND NOT `numeric`: `numeric` carries a minus sign
            // and an exponent on some Android keyboards, and neither is a
            // quantity. A comma is read as a decimal point one module over.
            keyboardType="decimal-pad"
            // ⚠️ KEPT FROM VENDER'S OWN COPY AND PROVABLY INERT ON THIS KEYBOARD:
            // `decimal-pad` draws NO return key on either platform, which
            // `nuevo.tsx` measured — so `onSubmitEditing` can never fire and the
            // way off the pad is `padId`'s bar on iOS and the system's control on
            // Android. It stays because the extraction moves markup unchanged, and
            // it is named here so the next reader does not take it for the exit.
            returnKeyType="done"
            onSubmitEditing={() => Keyboard.dismiss()}
            inputAccessoryViewID={padId}
            accessibilityLabel={`${ES.counter.qty} ${word}`}
            textAlign="right"
            style={{
              flexShrink: 1,
              minWidth: scale.space,
              fontSize: scale.bodySize,
              fontWeight: '700',
              color: PALETTE.tinta,
            }}
          />
        ) : null}
        <Text style={{ fontSize: scale.smallSize, color: PALETTE.tintaApagada }}>{word}</Text>
      </Pressable>

      <Paso
        label={ES.counter.more}
        glyph="plus"
        filled
        disabled={by === null || refusal?.dim === true}
        // ⚠️ A DIMMED `+` STILL ANSWERS: the cashier's tap is what brings up the
        // note saying why, so it is drawn unavailable and kept pressable.
        pressable={refusal !== null}
        onPress={
          refusal !== null
            ? refusal.onTap
            : () => {
                setDraft(null);
                bump(scope, entry.id, by, 1);
              }
        }
      />
    </View>
  );
}

/**
 * One half of the stepper. The glyph carries the word as its label (C12.1).
 *
 * ⚠️ ROUND SINCE `8g`, AND THE TWO HALVES ARE NO LONGER TWINS. `+` is filled in
 * `accion` — the act the row exists for — and `−` is its outline, because
 * taking one back is the lesser act and must not read as the main one.
 */
function Paso({
  label,
  glyph,
  disabled,
  onPress,
  filled = false,
  hidden = false,
  pressable = false,
}: {
  label: string;
  glyph: 'minus' | 'plus';
  disabled: boolean;
  onPress: () => void;
  filled?: boolean;
  /** Drawn as nothing, its room kept — see `−` above. */
  hidden?: boolean;
  /** Answers a tap while drawn as `disabled` — see `+` above. */
  pressable?: boolean;
}) {
  const { scale } = useDensity();
  const ground = disabled ? PALETTE.fondo : filled ? PALETTE.accion : PALETTE.superficie;
  const ink = disabled ? PALETTE.tintaApagada : filled ? PALETTE.superficie : PALETTE.accion;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      accessibilityElementsHidden={hidden}
      importantForAccessibility={hidden ? 'no-hide-descendants' : 'auto'}
      disabled={hidden || (disabled && !pressable)}
      onPress={onPress}
      style={{
        width: scale.tapTarget,
        height: scale.tapTarget,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: scale.tapTarget / 2,
        borderWidth: filled && !disabled ? 0 : 1.5,
        borderColor: disabled ? PALETTE.linea : PALETTE.accion,
        backgroundColor: ground,
        opacity: hidden ? 0 : 1,
      }}
    >
      <MaterialCommunityIcons name={glyph} size={scale.iconSize} color={ink} />
    </Pressable>
  );
}
