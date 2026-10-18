import { useState } from 'react';
import { Keyboard, Text } from 'react-native';

import { isoDay, type CatalogEntry } from '@/api/catalog';
import { checkEdit, editLine, editPlan, editTouches, type EditIssue } from '@/api/catalogEdit';
import { useEditProduct } from '@/api/hooks';
import { earningsAt } from '@/api/productPage';
import { formatMXN } from '@/format/mxn';
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
 * ⚠️⚠️ IT WRITES THROUGH THE EDIT SCREEN'S OWN PATH, NEVER A SECOND ONE.
 * `checkEdit`, `editPlan` and `save` are `producto/[id].tsx`'s, with the name
 * unchanged and the two figures left blank, so *close today's price and open a
 * new one* is decided in one place (`@/api/catalogEdit`) for both screens.
 *
 * ⚠️ IT OFFERS NO GUARDAR UNTIL THE PRICE ROWS HAVE LANDED, and none at all when
 * they could not be read. A plan built without them would open a second price on
 * a priced product, which the database refuses (`23P01`). A price is not one of
 * the writes Wera queues offline, so without signal the sheet says so and does
 * nothing.
 *
 * ⚠️ R9: whether a tap on the price reads as an invitation at the counter, and
 * whether the keyboard covers the box on a small phone, are the owner's phone's.
 */
export function PrecioRapido({
  entry,
  adding,
  entries,
  workspaceId,
  locationId,
  onSaved,
  onClose,
  bare = false,
  cost = null,
}: {
  entry: CatalogEntry;
  /** `8g`: opened by `+` on a product with no price — saving also adds one. */
  adding: boolean;
  entries: readonly CatalogEntry[];
  workspaceId: string;
  locationId: string | null;
  /** Called once the price has landed, before the sheet closes. */
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
  const { prices, factors, save, loading, pricesFailed, busy } = useEditProduct(entry.id);

  const [typed, setTyped] = useState('');
  const [issue, setIssue] = useState<EditIssue | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const working = saving || busy;
  const ready = !loading && !pricesFailed;

  async function guardar() {
    if (!ready || working) return;
    const form = { name: entry.name, taxPercent: '', packSize: '' };
    const problem = checkEdit(entry.id, form, typed, entries, factors, entry.priceUnit);
    setIssue(problem);
    setFailure(null);
    if (problem !== null) return;
    const plan = editPlan(
      {
        workspaceId,
        variantId: entry.id,
        name: entry.name,
        priceUnit: entry.priceUnit,
        locationId,
        factors,
        today: isoDay(new Date()),
      },
      form,
      typed,
      prices,
    );
    if (!editTouches(plan)) {
      Keyboard.dismiss();
      onClose();
      return;
    }
    setSaving(true);
    const outcome = await save(plan);
    setSaving(false);
    if (!outcome.ok) {
      setFailure(editLine(outcome));
      return;
    }
    Keyboard.dismiss();
    // ⚠️ AFTER THE SAVE, AND THE SAVE HAS ALREADY RE-READ THE CATALOG
    // (`useEditProduct` awaits the invalidation), so the line `onSaved` adds is
    // priced the moment it lands — never an amber line for a frame.
    onSaved();
    onClose();
  }

  const line =
    issue !== null
      ? ES.catalog.editIssues[issue]
      : failure ?? (pricesFailed ? ES.sell.priceSheet.needsSignal : null);
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
      act={
        working
          ? ES.sell.priceSheet.saving
          : ready
            ? adding
              ? ES.sell.priceSheet.saveAndAdd
              : ES.sell.priceSheet.save
            : ES.sell.priceSheet.loading
      }
      onAct={() => void guardar()}
      busy={working}
      cancel={ES.sell.priceSheet.cancel}
      onClose={onClose}
    />
  );
}
