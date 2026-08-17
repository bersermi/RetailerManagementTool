# Power Platform Catalog System — Context Migration Document

## Purpose of this document

This document summarizes the current state of the Power Platform catalog system design so development can continue in a new chat without losing architectural decisions, UX rationale, component contracts, and implementation direction.

It combines:
- the architectural direction from the original project document shared at the start of this chat,
- the component and screen design decisions reached in this conversation,
- the current cart UX specification that should guide the next implementation steps.

---

# 1. Project goal

We are building a **Power Platform / Dataverse-based catalog and transaction system** for small-store operators.

The app is intended to support workflows such as:
- browsing products by provider and unit,
- assembling a purchase or sale,
- adjusting quantities quickly,
- using quick actions on catalog lines,
- viewing and modifying a cart,
- persisting transaction history,
- and later supporting reporting and more advanced transaction behaviors.

The product must remain usable for smaller customers while staying structurally scalable enough for larger ones.

---

# 2. Architecture principles from the original project document

These are core constraints and should continue to guide every implementation.

## 2.1 Dataverse is the source of truth

Backend data belongs in Dataverse. The frontend should not behave like the authoritative system of record.

This means:
- products, providers, units, and transaction records live in Dataverse,
- local collections are for screen-level interaction and UX state,
- historical transactions must be persisted explicitly,
- master data changes and transactional changes are different concepts.

## 2.2 Screen-owned state, stateless components

The architecture follows a strong separation:
- **screen** owns mutable business/UI state,
- **components** render data and emit events,
- components should not own authoritative state,
- components should not patch Dataverse directly.

This is a very important rule and should not be broken casually.

## 2.3 Normalized screen collections as interaction contracts

A central idea is to normalize backend data into frontend-friendly row contracts such as `colCatalogLines`.

These collections are intended to:
- decouple the UI from raw Dataverse schema,
- allow component reuse across screens,
- standardize gallery behavior,
- support quantity editing and quick actions.

## 2.4 Deferred persistence / explicit commit boundary

User interaction should usually happen in local state first.

Then, at an explicit boundary such as checkout/complete transaction:
- create the transaction header,
- create transaction lines,
- apply stock or inventory effects,
- clear the local working state.

This avoids constant backend writes during browsing and quantity changes.

## 2.5 Backend-first extensibility

The architecture should leave room for future entities and flows such as:
- `Cart`
- `CartLine`
- inventory movement / ledger records
- historical pricing
- transaction-specific price override behavior
- last used price
- richer reporting

---

# 3. Core frontend state model

## 3.1 `colCatalogLines`

This is the main normalized collection for the active catalog working set.

It should represent the **current screen slice**, not the entire universe of all products for the workspace.

Important conclusion from this conversation:
- `colCatalogLines` is a good **interaction contract**,
- but it is **not** meant to be an unbounded replica of the whole backend.

### Main reasons
- collection building has a client-side cost,
- editable galleries become heavy as row count increases,
- repeated recalculation after each patch can become expensive,
- multi-screen duplication of large collections harms app performance,
- row-by-row Dataverse submission is not suitable for very large carts.

### Scaling interpretation

For small and medium customers:
- `colCatalogLines` works well when it represents the active filtered slice.

For larger customers:
- the collection must remain narrow and filtered,
- browse state and selection/cart state may need to become more separate,
- backend-assisted submission becomes more important.

## 3.2 `colCartLines`

`colCartLines` should be treated as a **projection** of the selected items from `colCatalogLines`.

It is not the authoritative source of editable line state.

Authoritative line state should remain in `colCatalogLines`.

The cart exists to:
- show selected lines,
- present totals,
- render the cart UX,
- provide a clean contract for the cart-specific UI.

---

# 4. Current catalog component design

## 4.1 Existing catalog row contract

The current catalog gallery/component has been assembled around a row contract like this:

```powerfx
Table(
    {
        Key: "LINE-001",
        PrimaryText: "Tomate Saladet",
        SecondaryText: "Proveedor La Huerta",
        UnitText: "Kg",
        Qty: 1.5,
        AllowStepper: false,
        Step: 0.5,
        MinQty: 0,
        MaxQtyEnabled: false,
        MaxQty: Blank(),
        Disabled: false,
        Photo: Blank()
    }
)
```

Additional rows follow the same pattern.

### Fields currently in use
- `Key`
- `PrimaryText`
- `SecondaryText`
- `UnitText`
- `Qty`
- `AllowStepper`
- `Step`
- `MinQty`
- `MaxQtyEnabled`
- `MaxQty`
- `Disabled`
- `Photo`

## 4.2 Unitary price was added to the catalog variant

For the current catalog variant, the decision was:
- show **unitary price only**,
- do **not** show line total there,
- keep the implementation simple,
- remain compatible with future transaction-specific price overrides.

### Current extension to the catalog contract
Add:
- `UnitPrice`
- `CurrencySymbol`

### Example

```powerfx
{
    Key: "LINE-001",
    PrimaryText: "Tomate Saladet",
    SecondaryText: "Proveedor La Huerta",
    UnitText: "Kg",
    Qty: 1.5,
    AllowStepper: false,
    Step: 0.5,
    MinQty: 0,
    MaxQtyEnabled: false,
    MaxQty: Blank(),
    Disabled: false,
    Photo: Blank(),
    UnitPrice: 28.5,
    CurrencySymbol: "$"
}
```

### Current unit-price label formula

```powerfx
"Unit: " & Coalesce(ThisItem.CurrencySymbol, "$") & Text(Coalesce(ThisItem.UnitPrice, 0), "[$-en-US]#,##0.00")
```

That is already working and should remain part of the base catalog contract.

---

# 5. Price logic decisions made in this chat

A major part of this conversation was clarifying pricing architecture.

## 5.1 Transaction price override is allowed

The intended behavior is:
- user can modify the price **for the current transaction only**,
- this price change should happen through quick actions,
- historical sales and purchases must store the actual applied price,
- later we may support a `LastUsedPrice` indicator,
- removing the product completely from the cart should revert that line back to base price behavior,
- completing the transaction should also clear transaction-specific price state.

## 5.2 Important distinction: base price vs transaction price

We explicitly decided that changing the price for the current transaction is **not** the same as changing the master catalog price.

Therefore the long-term model should distinguish between:
- **base/catalog price**,
- **effective price used in the current transaction**.

## 5.3 Future-ready recommended line fields

Even though not all of them are fully implemented yet, the intended direction is:
- `BaseUnitPrice`
- `EffectiveUnitPrice`
- `IsPriceOverridden`
- optionally `PriceOverrideReason`
- transaction line snapshots storing the applied price historically

## 5.4 Current UX restriction for price editing

For now:
- transaction-specific price change will only happen **once the product is already in the cart**,
- if the product is removed from the cart entirely, the used price returns to base price,
- the same reset applies when the transaction is completed.

That is an important simplifying rule and should be preserved in the next implementation stage.

---

# 6. Cart experience — final UX decision from this chat

The user has already tested options and defined the desired experience.

This section is the most important immediate implementation target.

## 6.1 Collapsed state: Total + Complete bar

As soon as the user adds at least one thing to the cart, a bottom bar appears.

### This bar should show only 2 things:
1. **Total amount**
2. **Pay slicer**

The slicer should have the word:
- **"Pagar"** in the background

By sliding it, the user completes the transaction.

### Behavior of the bottom bar
- it appears only when the cart is non-empty,
- it stays docked at the bottom,
- it always shows the total amount,
- sliding the slicer performs the complete/pay action,
- clicking/tapping the section without doing the full pay gesture unfolds the cart.

This means the bottom bar has a dual behavior:
- **tap** → open cart
- **complete slide gesture** → complete transaction

## 6.2 Expanded state: cart unfolds over the screen

When the user taps the bar without completing the pay gesture:
- the cart unfolds,
- it appears on top of the screen,
- a dark scrim covers the background.

The cart should feel like an overlay / bottom sheet / modal drawer rather than a normal inline section.

### Scrim behavior
- darkens the background,
- clicking the scrim folds the cart back.

## 6.3 Cart internal design

The expanded cart should be a **very close version of the current catalog gallery**.

This is a key design decision.

The cart row is intentionally similar to the catalog row rather than becoming a completely different visual language.

### Main row differences from catalog
- the `OtherActions` icon at top-right is replaced with a **trash can**,
- clicking the trash can removes that line from the cart,
- removing the line should set the amount for that product to `0`,
- each line includes a **Total** label,
- the other controls remain unchanged,
- pricing dynamics discussed earlier must remain compatible.

### Quantity/controls behavior
- quantity controls remain as already designed,
- current price dynamics remain conceptually in force,
- future transaction-specific price editing should only occur while the line exists in the cart.

## 6.4 Buttons at the top of the expanded cart

There need to be **2 controls at the top**:

### A. `Vaciar`
Purpose:
- empty the cart

Behavior:
- should be wired to the confirm modal,
- confirmation is required to avoid accidental emptying.

### B. `X`
Purpose:
- fold the cart back / close it

Behavior:
- same result as clicking the scrim.

## 6.5 Bottom bar remains visible/functional in expanded mode

The bottom Total + Complete behavior is still conceptually part of the cart experience.

The user wording indicates the cart still revolves around that same bar behavior. In implementation terms, the expanded cart should preserve access to:
- total amount,
- complete/pay slide interaction.

The exact layout can be handled as:
- a pinned bottom area inside the expanded cart,
- using the same visual language as the collapsed bar.

This should stay consistent so the user always has a stable way to finish the transaction.

---

# 7. Recommended component decomposition

Even though the UX feels like one experience, it likely should involve more than one component.

## 7.1 Component proposal

### `cmpCartBottomBar`
Purpose:
- bottom-docked collapsed cart summary + pay gesture

#### Shows
- total amount
- pay slider with `Pagar`

#### Behavior
- visible only when cart has at least one line,
- tap/click on the bar opens the cart,
- successful full slide completes the transaction.

### `cmpCartOverlay`
Purpose:
- expanded cart overlay with scrim and top actions

#### Contains
- scrim,
- top action row,
- cart gallery,
- persistent total/complete area.

### `cmpCartGallery` or cart gallery variant
Purpose:
- render selected lines in cart style

This can be:
- either a separate component,
- or a close variant of the existing catalog component.

Given the user’s preference, the best route is likely:
- **reuse the existing catalog structure as much as possible**,
- produce a cart-specific variant or parameterized version.

### `cmpPaySlider`
Purpose:
- reusable slide-to-complete control

The slider should support:
- label background (`Pagar`),
- drag gesture,
- completion threshold,
- reset when gesture is not completed,
- busy/disabled state later if needed.

## 7.2 Why separate them

This split keeps responsibilities cleaner:
- bottom bar handles summary + gesture,
- overlay handles modal behavior,
- gallery handles line rendering,
- slider remains reusable later for other transaction types.

---

# 8. Current intended backend implications

Even though the immediate next step is mostly frontend assembly, backend assumptions must stay aligned.

## 8.1 Historical transaction lines must preserve applied prices

When transactions are completed, backend records should preserve:
- quantity,
- applied unit price,
- line total,
- enough context to later show sales/purchase history.

## 8.2 Removing a line should clear transaction-specific price behavior

If a product is removed from the cart entirely:
- quantity becomes `0`,
- any transaction-specific price override for that line should be discarded,
- the next time that product is added again in a new cart context, it should start from base price again unless a later feature explicitly changes that behavior.

## 8.3 Completing a transaction clears transient price state

After successful completion:
- cart state resets,
- any per-transaction price state resets,
- local transaction context is cleared.

This matches the current intended scope before introducing more advanced reuse behaviors such as `LastUsedPrice`.

---

# 9. Immediate implementation target for the next chat

The next chat should focus on building the cart experience.

## 9.1 Main implementation target

Implement the **cart bottom bar + overlay cart** experience based on the UX described above.

## 9.2 Specific things to define/build next

### A. Bottom bar component
Need:
- structure,
- geometry,
- click vs slide behavior,
- total amount binding,
- visibility conditions.

### B. Expanded cart overlay
Need:
- scrim,
- open/close mechanics,
- top row with `Vaciar` and `X`,
- click-on-scrim-to-close,
- pinned bottom area.

### C. Cart gallery variant
Need:
- same overall visual language as catalog,
- trash icon instead of other actions,
- line total label,
- quantity controls unchanged,
- ability to remove a line by setting quantity to `0`.

### D. Confirm modal integration
Need:
- wire `Vaciar` to existing confirm modal pattern,
- confirm before emptying.

### E. Future-ready price compatibility
Need to keep the cart compatible with later implementation of:
- transaction-specific price overrides,
- price reset on line removal,
- price reset on transaction completion.

---

# 10. Suggested practical state model for the next implementation

These names can be adjusted, but the intent should remain.

## Variables
- `varCartExpanded`
- `varCartBusy`
- `varCartAmountTotal`
- `varCartLineCount`
- `varShowConfirmEmptyCart`

## Collections
- `colCatalogLines` = authoritative working set for the current screen
- `colCartLines` = projected selected lines for the cart UI

## Key principle
Changes made in the cart should still ultimately patch the authoritative line state, not create a second conflicting source of truth.

---

# 11. Constraints and rules that should not be forgotten

## 11.1 Do not let components own authoritative business state
Components render and emit events.
The screen owns mutable state.

## 11.2 Do not use the full workspace catalog as the hot working collection
`colCatalogLines` should remain a filtered working slice.

## 11.3 Current catalog version shows only unitary price
No line total in the current browsing catalog variant.

## 11.4 Cart version does include line total per row
The cart must show per-line total.

## 11.5 Transaction-specific price changes only matter while the line is in cart
Removing the line should reset that temporary price behavior.

## 11.6 Pay gesture should be low-click and prominent
The bottom bar is not a normal action cluster; it is a transaction-completion affordance.

---

# 12. Recommended next-chat working style

In the next conversation, the best sequence is:
1. define the exact component contracts,
2. define the screen assembly/layout,
3. define cart row geometry,
4. define event flows,
5. wire confirm modal + close behavior,
6. then implement the pay slider.

That sequence should minimize rework.

---

# 13. Next conversation initial prompt

Use the following prompt in the new chat.

```text
We are continuing development of my Power Platform / Dataverse catalog system.

Please use the attached context document as the source of truth for the current state of the project.

I want to continue with the implementation design of the cart experience.

Important context to preserve:
- Dataverse is the source of truth.
- Screen owns mutable state; components are stateless renderers that emit events.
- `colCatalogLines` is the authoritative screen-level working collection for the active slice, not the whole catalog universe.
- `colCartLines` should be a projection of selected lines.
- Current catalog variant already shows only Unitary Price.
- Cart variant must be visually very close to the current catalog gallery.
- In cart rows, the top-right OtherActions icon should be replaced with a trash can that removes the line by setting quantity to 0.
- Cart rows must include a Total label per line.
- Price override for a transaction will later happen only while the product is in the cart; removing the line or completing the transaction should reset the price back to base behavior.

Cart UX to implement:
- As soon as at least one line is added, a bottom Total + Complete bar appears.
- The bar should show only: Total amount and a pay slider.
- The slider should have “Pagar” in the background.
- Sliding it completes the transaction.
- Tapping/clicking the bar without completing the pay gesture should unfold the cart.
- The expanded cart appears as an overlay with a dark scrim.
- Clicking the scrim should close the cart.
- At the top of the expanded cart there must be two controls: `Vaciar` and `X`.
- `Vaciar` must use the confirm modal to avoid accidental emptying.
- `X` closes/folds the cart.
- The bottom Total + Complete behavior must still remain available as part of the cart experience.

What I want from you now:
1. Propose the exact component breakdown.
2. Define the custom properties/contracts for each component.
3. Define the screen assembly in `scrProducts`.
4. Define the cart row structure and geometry.
5. Define the event flow for open, close, empty, remove line, and complete transaction.
6. Keep the answer implementation-oriented and consistent with our architecture.
```

---

End of document.
