import { useState } from 'react';
import { Keyboard, Text } from 'react-native';

import { isoDay, type CatalogEntry } from '@/api/catalog';
import { useUnitFactors } from '@/api/hooks';
import { earningsAt } from '@/api/productPage';
import { pricePlan, queuePrice } from '@/api/shelfPrice';
import { formatMXN } from '@/format/mxn';
import { commitPrice } from '@/lib/commitRunner';
import { newWriteId, nowIso } from '@/lib/ids';
import { ES } from '@/strings';
import { useDensity } from '@/theme/DensityProvider';
import { PALETTE } from '@/theme/palette';
import { HojaPrecio } from '@/ui/HojaPrecio';

// ============================================================================
// CAMBIAR PRECIO — ONE SHEET, TWO DOORS: a tap on a price in Vender (the
// owner's ruling of 2026-10-14) and *Cambiar precio* on a product's page in
// Productos (`8g`, 2026-10-17). Moved here from `(tabs)/vender.tsx` when the
// second door arrived, so both write through one path (`R14`).
// ============================================================================

/**
 * THE PRICE SHEET — the owner's ruling of 2026-10-14, opened by a tap on a row's
 * price, for the owner and a manager. Its frame is `src/ui/HojaPrecio` since
 * round 4 of `8g`, shared with Comprar's cost question.
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
