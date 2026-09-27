// ============================================================================
// PUTTING A DOCUMENT RIGHT — `app/src/api/corrections.ts`. Plan task `5h-ii-b`.
//
// ⚠️ `R2`: `.ts`, and it reaches no component. Everything asserted here is a
// decision the module makes on its own — which caches a void spoils, who is
// shown a button, what a cancelled delivery looks like as a cart.
//
// ⚠️⚠️ WHAT THIS FILE CANNOT SEE, SAID HERE RATHER THAN LEFT TO BE DISCOVERED.
// It cannot see that `void_transaction` exists, that its three arguments are
// spelled the way `voidArgs` spells them, that `TD003` arrives on a 400, or that
// a replay answers a shorter body. Those are HTTP facts and
// `docs/checks/5h-ii-b-corrections-contract.sh` is the instrument — a real round
// trip against a real PostgREST with a real cashier in a real shop.
// ============================================================================

import { describe, expect, it } from 'vitest';

import { SCALE, parseDecimal } from '@tienda/money';

import {
  CART_KIND,
  CORRECTABLE,
  CORRECTIONS,
  CORRECTION_REASON,
  CORRECTION_ROUTE,
  VOID_TRANSACTION,
  mayCorrect,
  prefillOf,
  staleAfterVoid,
  voidArgs,
  voidedFrom,
} from '@/api/corrections';
import { costsKey } from '@/api/costs';
import {
  DOCUMENT_KINDS,
  documentsKey,
  type DocumentKind,
  type DocumentLine,
  type ShopDocument,
} from '@/api/documents';
import { MAGNITUDE_KEY } from '@/api/magnitude';
import { ROLES } from '@/api/members';
import { memoryKey } from '@/api/providers';
import { TODAY_KEY } from '@/api/today';
import { WRITE_KIND } from '@/cart/cart';
import { ES } from '@/strings';

/**
 * The three kinds `void_transaction` takes (`0021`), spelled here because this
 * file is where the RPC's argument is asserted and `@/api/documents`' union is
 * about a LIST rather than about a void. ⚠️ They are equal today and they are
 * not the same claim: `0021` would still take a `transfer` nobody lists.
 */
const VOIDABLE: readonly string[] = ['purchase', 'sale', 'waste'];

let serial = 0;

function line(overrides: Partial<DocumentLine> = {}): DocumentLine {
  serial += 1;
  return {
    id: `line-${serial}`,
    variantId: `variant-${serial}`,
    name: `Producto ${serial}`,
    quantity: '2 kg',
    amount: '$60.00',
    base: 2000000,
    reason: null,
    perBase: '0.030000',
    ...overrides,
  };
}

function document(overrides: Partial<ShopDocument> = {}): ShopDocument {
  return {
    id: 'doc-1',
    kind: 'purchase',
    at: '2026-09-26T18:00:00.000Z',
    day: '2026-09-26',
    counterparty: 'Bodega Hernández',
    providerId: 'prov-1',
    createdBy: 'rosa',
    cause: null,
    amount: '$60.00',
    grossCentavos: 6000,
    lines: [line()],
    ...overrides,
  };
}

describe('the RPC, written once', () => {
  it('names the function the way 0021 declares it', () => {
    expect(VOID_TRANSACTION).toBe('void_transaction');
  });

  // ⚠️⚠️ PostgREST MATCHES BY PARAMETER NAME, so a wrong spelling here is a 404
  // and not a bad call — `R13`'s whole reason. The contract check is what proves
  // these three reach a real function; this pins that they are written once.
  it('spells all three p_ arguments and nothing else', () => {
    const args = voidArgs('purchase', 'doc-9', 'corregir');
    expect(Object.keys(args).sort()).toEqual(['p_id', 'p_kind', 'p_reason']);
    expect(args.p_kind).toBe('purchase');
    expect(args.p_id).toBe('doc-9');
  });

  // ⚠️ `p_kind` IS THE DOCUMENT'S AND NEVER THE CART'S. `0021` refuses anything
  // outside purchase/sale/waste with `22023`, and `'buy'` is exactly the
  // plausible wrong value — the cart speaks it one module over.
  it('sends the document kind, which is one of the three 0021 takes', () => {
    for (const kind of DOCUMENT_KINDS) {
      expect(voidArgs(kind, 'doc-1', 'eliminar').p_kind).toBe(kind);
      expect(VOIDABLE).toContain(voidArgs(kind, 'doc-1', 'eliminar').p_kind);
    }
  });

  // ⚠️⚠️ THE *never the cart kind* HALF NARROWED IN `6a-ii-a`, AND THE REASON IS
  // A REAL FINDING RATHER THAN A CONCESSION: **the two vocabularies genuinely
  // coincide on exactly one member.** `CART_KIND` answers `'buy'` for a purchase
  // and `'sell'` for a sale — both different from the document kind, which is
  // what made the old blanket assertion discriminate — but a write-off's cart
  // scope IS `'waste'`, the same word as its document kind (`WRITE_KIND.waste`,
  // `@/cart/cart`). Asserting `p_kind !== CART_KIND[kind]` of all three is
  // therefore asserting something FALSE of the third.
  //
  // ⚠️ So the discriminating pairs are named, and the waste case is stated as
  // the coincidence it is rather than dropped silently — a guard that quietly
  // stops covering a member is how the next one stops covering two.
  it('is the document word and not the cart word, wherever the two differ', () => {
    expect(CART_KIND.purchase).not.toBe('purchase');
    expect(CART_KIND.sale).not.toBe('sale');
    expect(voidArgs('purchase', 'doc-1', 'eliminar').p_kind).not.toBe(CART_KIND.purchase);
    expect(voidArgs('sale', 'doc-1', 'eliminar').p_kind).not.toBe(CART_KIND.sale);
    // ⚠️ AND THE ONE PLACE THEY AGREE, pinned so the agreement is deliberate.
    expect(CART_KIND.waste).toBe('waste');
  });
});

describe('the audit trail', () => {
  // ⚠️ THE REASON IS THE ONLY RECORD OF **WHY** A DOCUMENT WAS CANCELLED — *"Of
  // course we will have a history of any of these changes for audit reasons."*
  it('writes a different reason for each of the two acts', () => {
    expect(CORRECTION_REASON.corregir).not.toBe(CORRECTION_REASON.eliminar);
    for (const how of CORRECTIONS) {
      expect(CORRECTION_REASON[how].length).toBeGreaterThan(0);
    }
  });

  it('takes the reason from src/strings.ts and never spells one here', () => {
    expect(CORRECTION_REASON.corregir).toBe(ES.documents.reasonCorrected);
    expect(CORRECTION_REASON.eliminar).toBe(ES.documents.reasonDeleted);
  });

  // ⚠️⚠️ NOT ONE WORD OF BOOKKEEPING REACHES THE SCREEN, and the reason strings
  // are checked alongside the labels because they sit in the same block and are
  // the likeliest place for *cancelación* to creep back in
  // ([[users-dont-do-bookkeeping]]).
  it('never says cancel, reverse or void — in the buttons or the trail', () => {
    const words = /cancel|revers|anul|nota de cr|abono/i;
    for (const text of [
      ES.documents.correct,
      ES.documents.remove,
      ES.documents.correctAsk,
      ES.documents.removeAsk,
      ES.documents.correctConfirm,
      ES.documents.removeConfirm,
      ES.documents.reasonCorrected,
      ES.documents.reasonDeleted,
    ]) {
      expect(text).not.toMatch(words);
    }
    // ⚠️ `Cancelar` ON THE DISMISS BUTTON IS THE EXCEPTION AND IS CORRECT: it
    // cancels the QUESTION, not a document.
    expect(ES.documents.cancel).toMatch(words);
  });
});

describe('what the RPC answered', () => {
  it('reads a first void', () => {
    expect(
      voidedFrom({
        kind: 'purchase',
        voided: 'doc-1',
        void_id: 'void-1',
        lines: 3,
        movements: 3,
        already_recorded: false,
      }),
    ).toEqual({ voided: 'doc-1', voidId: 'void-1', alreadyRecorded: false });
  });

  // ⚠️⚠️ THE ONE THAT MATTERS, AND IT IS MEASURED (2026-09-26): A REPLAY'S BODY
  // IS **SHORTER**. `0021:268` returns four keys rather than six when the void
  // has already happened, so a parser that required `lines` and `movements`
  // would turn the idempotent success into a failure — on exactly the tap
  // somebody makes when the first response was lost.
  it('reads a replay, which carries neither lines nor movements', () => {
    expect(
      voidedFrom({
        kind: 'purchase',
        voided: 'doc-1',
        void_id: 'void-1',
        already_recorded: true,
      }),
    ).toEqual({ voided: 'doc-1', voidId: 'void-1', alreadyRecorded: true });
  });

  // ⚠️ A SHAPE IT DOES NOT RECOGNISE IS `null` AND NEVER A THROW — the caller
  // has already checked `error`, so this is the app and the database disagreeing
  // about the RPC, which is not a sentence for a shopkeeper.
  it('refuses a shape it does not recognise', () => {
    expect(voidedFrom(null)).toBeNull();
    expect(voidedFrom(undefined)).toBeNull();
    expect(voidedFrom('ok')).toBeNull();
    expect(voidedFrom({})).toBeNull();
    expect(voidedFrom({ voided: 'doc-1' })).toBeNull();
    expect(voidedFrom({ void_id: 'void-1' })).toBeNull();
    expect(voidedFrom({ voided: '', void_id: 'void-1' })).toBeNull();
  });

  // ⚠️ `already_recorded` IS READ STRICTLY. A missing key, a string `"true"` or
  // a `1` are all *not a replay*, which is the safe reading: the only thing it
  // changes is a message nobody is shown yet.
  it('reads already_recorded strictly', () => {
    const base = { voided: 'd', void_id: 'v' };
    expect(voidedFrom(base)?.alreadyRecorded).toBe(false);
    expect(voidedFrom({ ...base, already_recorded: 'true' })?.alreadyRecorded).toBe(false);
    expect(voidedFrom({ ...base, already_recorded: 1 })?.alreadyRecorded).toBe(false);
    expect(voidedFrom({ ...base, already_recorded: true })?.alreadyRecorded).toBe(true);
  });
});

describe('the half of the fence this phone can know', () => {
  // ⚠️ `0021` §5: a manager or an owner voids anything at any time, no clock
  // involved and no comparison to make.
  it('shows both buttons to a manager and an owner, on anybody’s document', () => {
    const somebodyElses = document({ createdBy: 'bernardo' });
    expect(mayCorrect(somebodyElses, 'manager', 'rosa')).toBe(true);
    expect(mayCorrect(somebodyElses, 'owner', 'rosa')).toBe(true);
  });

  it('shows them to a cashier on her own document', () => {
    expect(mayCorrect(document({ createdBy: 'rosa' }), 'staff', 'rosa')).toBe(true);
  });

  // ⚠️⚠️ THE ONE CASE IT HIDES, AND IT IS THE ONLY REFUSAL THAT NEEDS NO CLOCK.
  it('hides them from a cashier on somebody else’s document', () => {
    expect(mayCorrect(document({ createdBy: 'bernardo' }), 'staff', 'rosa')).toBe(false);
  });

  // ⚠️⚠️ IT FAILS **OPEN**, AND THAT IS THE DECISION THIS BLOCK EXISTS FOR. A
  // membership read still in flight, a failed one, or a `created_by` this read
  // did not carry all answer YES — and the database answers `TD003` if it was
  // wrong. A screen that hid its buttons whenever a second query was slow would
  // be 2026-09-22's `Cargando productos…` wearing a permission badge, and the
  // fence it would be guarding is `security definer` and cannot be talked past.
  it('shows them when it does not know, and lets the database refuse', () => {
    const somebodyElses = document({ createdBy: 'bernardo' });
    expect(mayCorrect(somebodyElses, null, 'rosa')).toBe(true);
    expect(mayCorrect(somebodyElses, 'staff', null)).toBe(true);
    expect(mayCorrect(somebodyElses, 'staff', '')).toBe(true);
    expect(mayCorrect(document({ createdBy: null }), 'staff', 'rosa')).toBe(true);
  });

  // ⚠️ EVERY ROLE IN `0001`'s ENUM IS WALKED, so a fourth role added to `ROLES`
  // lands here rather than defaulting to hidden.
  it('hides them for exactly one of the three roles', () => {
    const somebodyElses = document({ createdBy: 'bernardo' });
    const hidden = ROLES.filter((role) => !mayCorrect(somebodyElses, role, 'rosa'));
    expect(hidden).toEqual(['staff']);
  });

  // ⚠️⚠️ THE WINDOW IS NOT HERE AND MUST NOT ARRIVE. `0021` measures it from
  // `recorded_at` on an offline write and `occurred_at` otherwise, and a
  // TypeScript copy of that rule would be a second answer to *may she void
  // this* — wrong in the direction of hiding a button she is allowed to press.
  // A document a year old is still shown both buttons, and refused in words.
  it('does not look at the clock', () => {
    const ancient = document({ at: '2020-01-01T00:00:00.000Z', day: '2020-01-01' });
    expect(mayCorrect(ancient, 'staff', 'rosa')).toBe(true);
  });
});

describe('the document, as a cart', () => {
  it('sends a purchase to the buy cart and a sale to the sell cart', () => {
    expect(prefillOf(document({ kind: 'purchase' })).kind).toBe('buy');
    expect(prefillOf(document({ kind: 'sale', providerId: null })).kind).toBe('sell');
  });

  // ⚠️⚠️ `CART_KIND` IS THE INVERSE OF `WRITE_KIND` AND THIS IS WHAT SAYS SO.
  // Two hand-written maps of one correspondence is the stale-duplicate defect;
  // this is the same correspondence with something watching it.
  it('is exactly the inverse of WRITE_KIND', () => {
    for (const kind of DOCUMENT_KINDS) {
      expect(WRITE_KIND[CART_KIND[kind]]).toBe(kind);
    }
  });

  it('routes each kind to its own capture screen', () => {
    expect(CORRECTION_ROUTE.purchase).toBe('/comprar');
    expect(CORRECTION_ROUTE.sale).toBe('/vender');
  });

  // ⚠️ THE CART'S INTEGER IS `qty_base` AT SCALE 3 — the same arithmetic
  // `qtySent` undoes when it sends the line back.
  it('carries each line’s quantity as the cart’s own integer', () => {
    const one = prefillOf(document({ lines: [line({ variantId: 'v1', base: 2000000 })] }));
    expect(one.lines).toEqual([{ variantId: 'v1', base: 2000000 }]);
    expect(one.lines[0]?.base).toBe(parseDecimal('2000.000', SCALE.quantity));
  });

  it('carries the supplier so the delivery is re-filed against the same one', () => {
    expect(prefillOf(document({ providerId: 'prov-7' })).providerId).toBe('prov-7');
  });

  // ⚠️⚠️ THE BUY SIDE PREFILLS THE PRICE AND THE SELL SIDE DOES NOT, AND THE
  // ASYMMETRY IS THE DECISION. `sale_line` stores the NET while `record_sale`
  // takes the GROSS (`0016:59`), and `quoted` reads a typed sell quote as gross
  // whenever `prices_include_tax` — true by `0001`'s default — so handing the
  // stored figure over would undercharge by the IVA. `quoteFor` falls back to
  // the catalog's own price for a sale, which is what Vender does every time.
  it('prefills the price on a delivery and leaves a sale to the shelf', () => {
    const bought = prefillOf(
      document({ kind: 'purchase', lines: [line({ variantId: 'v1', perBase: '0.030000' })] }),
    );
    expect(bought.quotes).toEqual({ v1: '0.030000' });

    const sold = prefillOf(
      document({
        kind: 'sale',
        providerId: null,
        lines: [line({ variantId: 'v1', perBase: '0.030000' })],
      }),
    );
    expect(sold.quotes).toEqual({});
  });

  // ⚠️ THE FIGURE GOES BACK VERBATIM AND IS NOT PARSED HERE. `quoted` parses it
  // at scale 6; a round trip through a number would be a second rounding of a
  // price that was exact.
  it('hands the stored price back unchanged, to the digit', () => {
    const one = prefillOf(document({ lines: [line({ variantId: 'v1', perBase: '0.123456' })] }));
    expect(one.quotes.v1).toBe('0.123456');
  });

  // ⚠️⚠️ A LINE WITH NO READABLE QUANTITY IS DROPPED AND **COUNTED**. A delivery
  // re-recorded with a quantity nobody keyed is a wrong number in the ledger; one
  // re-recorded with a line missing is something she can see on the screen she is
  // standing on.
  it('drops a line it cannot read a quantity for, and says how many', () => {
    const one = prefillOf(
      document({
        lines: [line({ variantId: 'v1', base: 2000000 }), line({ variantId: 'v2', base: null })],
      }),
    );
    expect(one.lines).toEqual([{ variantId: 'v1', base: 2000000 }]);
    expect(one.dropped).toBe(1);
  });

  it('drops a line with no variant at all', () => {
    const one = prefillOf(document({ lines: [line({ variantId: '', base: 1000 })] }));
    expect(one.lines).toEqual([]);
    expect(one.dropped).toBe(1);
  });

  it('counts nothing dropped when every line reads', () => {
    expect(prefillOf(document()).dropped).toBe(0);
  });

  // ⚠️⚠️ ONE DOCUMENT MAY CARRY TWO LINES OF THE SAME VARIANT — `record_purchase`
  // accepts it, measured 2026-09-26 — and a `CartLine` is keyed by variant. The
  // quantities ADD, which is what the delivery actually was; the last price wins,
  // because a cart holds one quote per variant and cannot represent two.
  it('adds two lines of the same product into one cart line', () => {
    const one = prefillOf(
      document({
        lines: [
          line({ variantId: 'v1', base: 2000000, perBase: '0.030000' }),
          line({ variantId: 'v1', base: 500000, perBase: '0.040000' }),
        ],
      }),
    );
    expect(one.lines).toEqual([{ variantId: 'v1', base: 2500000 }]);
    expect(one.quotes.v1).toBe('0.040000');
  });

  // ⚠️ AN EMPTY DOCUMENT CANNOT EXIST — `0015` and the four `record_*` RPCs all
  // refuse one — so this is the branch that keeps an empty cart from being a
  // crash if a column list is ever edited wrongly.
  it('answers an empty cart for a document with no lines', () => {
    const one = prefillOf(document({ lines: [] }));
    expect(one.lines).toEqual([]);
    expect(one.quotes).toEqual({});
    expect(one.dropped).toBe(0);
  });
});

describe('what a void makes stale', () => {
  const keys = (document: ShopDocument) => staleAfterVoid(document).map((one) => JSON.stringify(one));

  // ⚠️⚠️ BOTH LISTS, ALWAYS. The screen holds them at once and a switch between
  // them must not serve a list taken before the void — which on this screen is a
  // correction button over a document that no longer stands.
  it('spoils both kinds’ lists whichever kind was voided', () => {
    for (const kind of DOCUMENT_KINDS) {
      const spoiled = keys(document({ kind, providerId: kind === 'purchase' ? 'prov-1' : null }));
      expect(spoiled).toContain(JSON.stringify(documentsKey('purchase')));
      expect(spoiled).toContain(JSON.stringify(documentsKey('sale')));
    }
  });

  // ⚠️ THE DAY'S TAKINGS MOVE ON A SALE AND NOT ON A DELIVERY — `takingsFrom`
  // counts sales and nothing else, so invalidating Inicio after a voided
  // delivery would be a re-fetch of a figure that did not change.
  it('spoils the day’s takings on a sale and not on a delivery', () => {
    const sold = keys(document({ kind: 'sale', providerId: null }));
    expect(sold).toContain(JSON.stringify(TODAY_KEY));
    expect(keys(document({ kind: 'purchase' }))).not.toContain(JSON.stringify(TODAY_KEY));
  });

  // ⚠️ BOTH OF THESE READ `purchase_line` AND BOTH EXCLUDE A REVERSED DOCUMENT,
  // so both answer differently the instant a delivery is cancelled.
  it('spoils the cost series of every product in a voided delivery', () => {
    const spoiled = keys(
      document({ lines: [line({ variantId: 'v1' }), line({ variantId: 'v2' })] }),
    );
    expect(spoiled).toContain(JSON.stringify(costsKey('v1')));
    expect(spoiled).toContain(JSON.stringify(costsKey('v2')));
    expect(spoiled).toContain(JSON.stringify(MAGNITUDE_KEY));
  });

  // ⚠️ SO THE NEXT DELIVERY IS NOT SEEDED WITH THE PRICE THIS ONE WAS CORRECTED
  // FOR. `provider_price_memory` is what fills Comprar's price boxes.
  it('spoils this supplier’s price memory, and only when there is one', () => {
    expect(keys(document({ providerId: 'prov-7' }))).toContain(
      JSON.stringify(memoryKey('prov-7')),
    );
    expect(keys(document({ providerId: null })).some((one) => one.includes('memory'))).toBe(false);
  });

  // ⚠️⚠️ A SALE SPOILS NEITHER THE COST SERIES NOR THE PRICE MEMORY, because
  // neither reads `sale_line`. This is the assertion that keeps the list from
  // quietly becoming *invalidate everything*, which is correct and costs a shop
  // on a slow connection every read it has.
  it('does not re-fetch what a voided sale cannot have moved', () => {
    const spoiled = keys(
      document({ kind: 'sale', providerId: null, lines: [line({ variantId: 'v1' })] }),
    );
    expect(spoiled).not.toContain(JSON.stringify(costsKey('v1')));
    expect(spoiled).not.toContain(JSON.stringify(MAGNITUDE_KEY));
  });

  it('names no key twice', () => {
    const spoiled = keys(document({ lines: [line({ variantId: 'v1' })] }));
    expect(new Set(spoiled).size).toBe(spoiled.length);
  });
});

describe('the two kinds are the two the screen has', () => {
  // ⚠️ `waste` IS ABSENT FROM BOTH MAPS BECAUSE `DocumentKind` HAS NO `waste` —
  // `void_transaction` takes it, and Desperdicio is `6a`. This walks the union
  // so the day a third kind arrives, both maps are a build error rather than a
  // silent hole.
  it('maps every document kind to a cart and a route', () => {
    for (const kind of DOCUMENT_KINDS) {
      expect(CART_KIND[kind as DocumentKind]).toBeDefined();
      expect(CORRECTION_ROUTE[kind as DocumentKind]).toBeDefined();
    }
    expect(Object.keys(CART_KIND).sort()).toEqual([...DOCUMENT_KINDS].sort());
    expect(Object.keys(CORRECTION_ROUTE).sort()).toEqual([...DOCUMENT_KINDS].sort());
  });
});

// ----------------------------------------------------------------------------
describe('what this app yet knows how to put right', () => {
  // ⚠️⚠️ THREE DIFFERENT REASONS A CONTROL IS ABSENT, AND THIS IS THE THIRD.
  // `mayCorrect` is *may she*, `void_transaction` is the fence, and `CORRECTABLE`
  // is *is it built*. The screen asks two of them separately so a reader can tell
  // which one they are looking at.
  it('names every kind, so a fourth cannot arrive unanswered', () => {
    expect(Object.keys(CORRECTABLE).sort()).toEqual([...DOCUMENT_KINDS].sort());
  });

  it('is built for a delivery and a sale, which 5h-ii-b shipped', () => {
    expect(CORRECTABLE.purchase).toBe(true);
    expect(CORRECTABLE.sale).toBe(true);
  });

  // ⚠️⚠️ AND NOT YET FOR A WRITE-OFF — WHICH THE DATABASE WOULD ALLOW TODAY.
  // Measured 2026-09-27: a cashier voided her own one-hour-old write-off and got
  // a 200, because `void_transaction` has taken all three kinds since `0021` and
  // a void needs only the header. So this `false` is `5d-iii`'s ruling and not a
  // capability: `Corregir` cannot work until a cart can carry a cause, and a
  // control that looks live and refuses silently is worse than one that is
  // obviously not built. **`6a-ii-b` flips it.**
  it('is NOT yet built for a write-off, and that is a decision rather than a fence', () => {
    expect(CORRECTABLE.waste).toBe(false);
  });

  // ⚠️ THE ROUTE EXISTS ANYWAY, because the map is total over the union and a
  // missing entry would be a TypeScript error rather than a considered absence.
  it('still knows where a corrected write-off would go', () => {
    expect(CORRECTION_ROUTE.waste).toBe('/desperdicio');
    expect(new Set(Object.values(CORRECTION_ROUTE)).size).toBe(DOCUMENT_KINDS.length);
  });
});

// ----------------------------------------------------------------------------
describe('what a void of a write-off makes stale', () => {
  const writeOff = document({ kind: 'waste', cause: 'Caducado', amount: null, grossCentavos: null });

  it('invalidates all three lists and nothing else', () => {
    const keys = staleAfterVoid(writeOff);
    expect(keys).toHaveLength(3);
    for (const kind of DOCUMENT_KINDS) {
      expect(keys).toContainEqual(documentsKey(kind));
    }
  });

  // ⚠️⚠️ MEASURED RATHER THAN ASSUMED, AND IT IS WHY THE BRANCH IS A `switch` AND
  // NO LONGER AN `if/else` WHOSE `else` MEANT *purchase*. `takingsFrom` counts
  // SALES, so Inicio is untouched; `costsFrom` and `magnitude` both read
  // `purchase_line`; `provider_price_memory` reads deliveries. A void of a
  // write-off moves STOCK, and this app caches no stock read at all — **so the
  // day `Números` ships, this is the function its key goes into.**
  it('touches neither the day’s takings nor the cost series nor the price memory', () => {
    const keys = staleAfterVoid(writeOff).map((one) => JSON.stringify(one));
    expect(keys).not.toContain(JSON.stringify(TODAY_KEY));
    expect(keys).not.toContain(JSON.stringify(MAGNITUDE_KEY));
    for (const line_ of writeOff.lines) {
      expect(keys).not.toContain(JSON.stringify(costsKey(line_.variantId)));
    }
  });

  // ⚠️ THE CONTROL: a delivery must still drag its cost series with it, or the
  // assertion above is about a function that stopped invalidating anything.
  it('still drags a delivery’s cost series and price memory along', () => {
    const keys = staleAfterVoid(document({ kind: 'purchase' })).map((one) => JSON.stringify(one));
    expect(keys).toContain(JSON.stringify(MAGNITUDE_KEY));
    expect(keys.length).toBeGreaterThan(3);
  });
});
