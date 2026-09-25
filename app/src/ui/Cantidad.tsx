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
// ⚠️⚠️ WHY IT IS A PRIMITIVE NOW: FOUR DRAWINGS, AND `kind` IS THE ONLY
// DIFFERENCE BETWEEN THEM
// ----------------------------------------------------------------------------
// `vender.tsx` drew it twice — on the list row and inside the basket sheet —
// and Comprar needs both again. The copy in Vender hard-coded `'sell'` at three
// call sites into the store; that is the whole delta, so it is a PROP rather
// than a second component. ⚠️ **A second copy would be a second set of rules
// about what a tap of `+` adds**, and C3.8 is exacting about that.
//
// ⚠️ WHICH UNIT THE BOX SPEAKS IN IS `@/cart/quantity`'s DECISION, never this
// file's, and `app/test/cart-quantity.test.ts` reads it (`R3`). Nothing here
// converts anything.
// ============================================================================

import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useState } from 'react';
import { Keyboard, Pressable, Text, TextInput, View } from 'react-native';

import type { Kind } from '@tienda/money';

import type { CatalogEntry, UnitFactors } from '@/api/catalog';
import { stepOf } from '@/cart/cart';
import { baseFromShown, qtyShown, shownUnitOf } from '@/cart/quantity';
import { useCartStore } from '@/cart/store';
import { ES } from '@/strings';
import { useDensity } from '@/theme/DensityProvider';
import { PALETTE } from '@/theme/palette';

export function Cantidad({
  entry,
  base,
  factors,
  kind,
  onEdit,
  padId,
}: {
  entry: CatalogEntry;
  base: number;
  factors: UnitFactors;
  /** Which basket this box is counting into. The only thing Vender and Comprar
   *  disagree about — see this file's header. */
  kind: Kind;
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
}) {
  const { scale } = useDensity();
  const setQty = useCartStore((state) => state.setQty);
  const bump = useCartStore((state) => state.step);

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
      setQty(kind, entry.id, 0);
      return;
    }
    const next = baseFromShown(text, unit, factors);
    if (next !== null) setQty(kind, entry.id, next);
  };

  // ⚠️ THE UNIT'S WORD IS `ES.units`' AND NEVER THE CODE (`R4`): `250g` is what
  // the database calls it and *250 gr* is what a shopkeeper reads.
  const word = ES.units[unit as keyof typeof ES.units] ?? unit;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale.rowGap / 2 }}>
      <Paso
        label={ES.counter.less}
        glyph="minus"
        // ⚠️ DISABLED RATHER THAN DEAD AT ZERO. Stepping down through zero
        // removes a line that is not there; a control that looks live and does
        // nothing is the shape this repository refuses by name.
        disabled={by === null || base === 0}
        onPress={() => {
          setDraft(null);
          bump(kind, entry.id, by, -1);
        }}
      />

      <View style={{ alignItems: 'center', minWidth: scale.tapTarget * 1.5 }}>
        <TextInput
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
          textAlign="center"
          style={{
            minWidth: scale.tapTarget * 1.5,
            minHeight: scale.tapTarget,
            paddingHorizontal: scale.rowGap / 2,
            borderRadius: scale.space / 2,
            borderWidth: 1,
            borderColor: base === 0 ? PALETTE.linea : PALETTE.accion,
            backgroundColor: PALETTE.superficie,
            fontSize: scale.bodySize,
            fontWeight: '600',
            color: PALETTE.tinta,
          }}
        />
        {/* ⚠️ THE UNIT IS RENDERED BESIDE THE FIELD AND ALWAYS — the half of
            §2.8's *Unit-aware input* row that was never in question. */}
        <Text style={{ fontSize: scale.bodySize * 0.85, color: PALETTE.tintaApagada }}>{word}</Text>
      </View>

      <Paso
        label={ES.counter.more}
        glyph="plus"
        disabled={by === null}
        onPress={() => {
          setDraft(null);
          bump(kind, entry.id, by, 1);
        }}
      />
    </View>
  );
}

/** One half of the stepper. The glyph carries the word as its label (C12.1). */
function Paso({
  label,
  glyph,
  disabled,
  onPress,
}: {
  label: string;
  glyph: 'minus' | 'plus';
  disabled: boolean;
  onPress: () => void;
}) {
  const { scale } = useDensity();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={{
        minWidth: scale.tapTarget,
        minHeight: scale.tapTarget,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: scale.space / 2,
        backgroundColor: disabled ? PALETTE.fondo : PALETTE.accionSuave,
      }}
    >
      <MaterialCommunityIcons
        name={glyph}
        size={scale.iconSize}
        color={disabled ? PALETTE.tintaApagada : PALETTE.accion}
      />
    </Pressable>
  );
}
