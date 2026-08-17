# Power Platform / Dataverse Catalog System — Extended Context Handoff
**Date:** 2026-03-23

## Purpose of this document
This document externalizes the current state of the project so development can continue in a new chat without losing:
- backend architecture decisions,
- frontend state-model rules,
- normalized collection contracts,
- pricing logic decisions,
- component constraints discovered during implementation,
- cart UX decisions,
- the implementation outcome of `cmpCartBottomBar`,
- and the practical lessons learned while building it.

It combines:
- the original project/context file provided at the start of the cart discussion,
- the explicit cart UX requirements given at the beginning of this chat,
- the architectural and implementation decisions reached in this chat,
- and the concrete outcomes from the first pass of `cmpCartBottomBar`.

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

# 2. Core architecture principles

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

This rule is very important and should not be broken casually.

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

Important conclusion:
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

## 3.3 Screen-level variables expected in this architecture
Suggested screen variables include:
- `varCartExpanded`
- `varCartBusy`
- `varCartAmountTotal`
- `varCartLineCount`
- `varShowConfirmEmptyCart`
- `varCartResetNonce`

The exact names can change, but the intent should remain.

## 3.4 Key principle for screen state
Changes made in the cart should still ultimately patch the authoritative line state, not create a second conflicting source of truth.

---

# 4. Product/catalog context preserved from the original project direction

## 4.1 General business scope
The app is for small store owners to manage:
- providers,
- purchases,
- inventory/stock,
- sales,
- waste,
- reporting,
- and later richer insights.

Dataverse backend is central.
The design is meant to be scalable while staying practical and cost-conscious.

## 4.2 Unit-sensitive behavior
Catalog and transaction flows are unit-sensitive.

Units influence UX and behavior, especially quantity editing.

This is why fields like:
- `UnitText`
- `AllowStepper`
- `Step`
- `MinQty`
- `MaxQtyEnabled`
- `MaxQty`

matter as part of the normalized line contract.

## 4.3 Existing component architecture already established
The app follows a reusable component approach.

Previously discussed/implemented component patterns include:
- `cmpHeader`
- `cmpFlyoutMenu`
- `cmpModal`
- `cmpToast`
- `cmpQuickActions`
- `cmpQuickActionsSheet`
- `cmpMoneyInput`
- `cmpQtyStepper`
- `cmpDockedCart`
- gallery/catalog components

Existing project direction already favors:
- reusable components,
- screen-owned logic,
- event-style interaction boundaries,
- practical workarounds for Canvas limitations.

---

# 5. Existing catalog component contract

## 5.1 Base normalized row contract
The current catalog gallery/component has been assembled around a row contract like this:

powerfx
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

# 6. Price logic decisions preserved

A major part of the cart/planning work was clarifying pricing architecture.

## 6.1 Transaction price override is allowed
The intended behavior is:
- user can modify the price **for the current transaction only**,
- this price change should happen through quick actions later,
- historical sales and purchases must store the actual applied price,
- later we may support a `LastUsedPrice` indicator,
- removing the product completely from the cart should revert that line back to base price behavior,
- completing the transaction should also clear transaction-specific price state.

## 6.2 Base price vs transaction price
Changing the price for the current transaction is **not** the same as changing the master catalog price.

Therefore the long-term model should distinguish between:
- **base/catalog price**,
- **effective price used in the current transaction**.

## 6.3 Future-ready recommended line fields
Even if not all are fully implemented yet, the intended direction is:
- `BaseUnitPrice`
- `EffectiveUnitPrice`
- `IsPriceOverridden`
- optionally `PriceOverrideReason`
- transaction line snapshots storing the applied price historically

## 6.4 Current UX restriction for price editing
For now:
- transaction-specific price change will only happen **once the product is already in the cart**,
- if the product is removed from the cart entirely, the used price returns to base price,
- the same reset applies when the transaction is completed.

That is an important simplifying rule and should be preserved.

---

# 7. Cart UX requirements given at the beginning of this chat

These were the explicit requirements to preserve.

## 7.1 Mandatory collapsed-cart behavior
As soon as at least one line is added, a bottom bar appears.

The bar should show only:
1. **Total amount**
2. **Pay slider / pay slicer**

The slicer should have:
- **"Pagar"** in the background

By sliding it, the user completes the transaction.

### Bottom bar interaction
- it appears only when the cart is non-empty,
- it stays docked at the bottom,
- it always shows the total amount,
- sliding the slicer performs the complete/pay action,
- clicking/tapping the section without doing the full pay gesture unfolds the cart.

This means the bottom bar has a dual behavior:
- **tap** → open cart
- **complete slide gesture** → complete transaction

## 7.2 Mandatory expanded-cart behavior
When the user taps the bar without completing the pay gesture:
- the cart unfolds,
- it appears on top of the screen,
- a dark scrim covers the background.

The cart should feel like an overlay / bottom sheet / modal drawer rather than a normal inline section.

### Scrim behavior
- darkens the background,
- clicking the scrim folds the cart back.

## 7.3 Mandatory expanded-cart controls
At the top of the expanded cart there must be:
- `Vaciar`
- `X`

### `Vaciar`
Purpose:
- empty the cart

Behavior:
- should be wired to the confirm modal,
- confirmation is required to avoid accidental emptying.

### `X`
Purpose:
- fold the cart back / close it

Behavior:
- same result as clicking the scrim.

## 7.4 Mandatory cart row requirements
The expanded cart should be a **very close version of the current catalog gallery**.

This is a key design decision.

The cart row is intentionally similar to the catalog row rather than becoming a totally different visual language.

### Main row differences from catalog
- the `OtherActions` icon at top-right is replaced with a **trash can**,
- clicking the trash can removes that line from the cart,
- removing the line sets the amount/quantity for that product to `0`,
- each line includes a **Total** label,
- the other controls remain unchanged,
- pricing dynamics discussed earlier must remain compatible.

### Quantity behavior
- quantity controls remain as already designed,
- current price dynamics remain conceptually in force,
- future transaction-specific price editing should only occur while the line exists in the cart.

## 7.5 Bottom total + complete behavior remains conceptually present in expanded mode
The bottom Total + Complete behavior is still conceptually part of the cart experience.

In implementation terms, the expanded cart should preserve access to:
- total amount,
- complete/pay slide interaction.

The exact layout can be handled as:
- a pinned bottom area inside the expanded cart,
- using the same visual language as the collapsed bar.

---

# 8. Revised cart component strategy decided in this chat

Because of the actual Canvas/component constraints, the cart was restructured into:

## 8.1 Main cart components
1. `cmpCartBottomBar`
2. `cmpCartPanel`
3. Existing confirm modal reused for `Vaciar`

## 8.2 Responsibilities of each

### `cmpCartBottomBar`
Collapsed docked cart affordance:
- shows total amount,
- includes the integrated pay slider,
- emits open-cart intent,
- emits pay-complete intent.

### `cmpCartPanel`
Expanded combined cart shell:
- scrim,
- panel,
- header,
- cart gallery/content,
- bottom total + pay area,
- emits row and panel actions back to the screen.

### Confirm modal
- used for confirming `Vaciar`,
- actual mutation remains at screen level.

---

# 9. Important Power Apps / Canvas limitations discovered and incorporated

## 9.1 Nested component approach is not practical here
The cart design had to respect limitations previously faced in Canvas apps.

Important conclusions:
- you cannot practically rely on nesting components inside components for this cart design,
- `cmpPaySlider` should **not** be a separate embedded component,
- the pay slider should be integrated directly into `cmpCartBottomBar`,
- it is also not practical here to split overlay shell and cart gallery into separate nested components.

## 9.2 Resulting design implication
The expanded cart should later be implemented as a combined component (`cmpCartPanel`) similar in spirit to how `cmpQuickActions` already combines shell + content.

That is the design direction to preserve.

---

# 10. `cmpCartBottomBar` — why it was built first

It defines the collapsed cart contract and the first real interaction boundary:
- tap to open cart,
- slide to complete transaction.

It was the correct first component to build before the expanded panel.

## 10.1 Final behavioral simplification agreed
The slider behavior should be simple:

- if the user does **not** get to threshold, the slider resets,
- if the user **does** get to threshold, the purchase/sale is completed through the parent event flow,
- the screen handles the implications of that event,
- the component does not own transaction logic.

## 10.2 Important interaction compromise chosen for implementation cleanliness
For this first version, the practical rule is:
- left/body zone tap -> open cart,
- right slider zone -> attempt completion,
- slider released below threshold -> reset,
- slider released at or above threshold -> fire pay-complete event.

This avoids ambiguous gesture interpretation inside Canvas apps.

# 11. `cmpCartBottomBar` — implementation outcome from this chat

## 11.1 Current status
- The bottom part looks and works great.
- The first pass of `cmpCartBottomBar` is considered successful enough to move forward.
- The next step after this handoff should be building `cmpCartPanel`, not redesigning the bottom bar from scratch.

## 11.2 Final practical design used
The component uses:
- input properties,
- component events for actions,
- minimal internal helper controls,
- a native Slider control as the gesture engine.

## 11.3 Why a native Slider was chosen
Because in Power Apps Canvas it is the simplest reliable way to implement:
- threshold-based completion,
- automatic reset below threshold,
- consistent interaction behavior.

---

# 12. `cmpCartBottomBar` property direction

## 12.1 Input properties used / intended
Core behavior:
- `VisibleBar : Boolean`
- `TotalAmount : Number`
- `CurrencySymbol : Text`
- `Busy : Boolean`
- `PayEnabled : Boolean`
- `PayLabel : Text`
- `ResetNonce : Number`
- `SliderThreshold : Number`

Layout:
- `BarHeight : Number`
- `HorizontalPadding : Number`
- `CornerRadius : Number`
- `TotalPaneWidth : Number`

Visuals:
- `FillBar`
- `FillTrack`
- `FillThumb`
- `TextColorPrimary`
- `TextColorSecondary`
- `BorderColorBar`

## 12.2 Events used / intended
- `OnOpenCart`
- `OnPayComplete`

An important design correction was made here:
- events are better than output-property dispatch for one-time actions like open-cart and pay-complete,
- output-property event dispatch was considered but intentionally not preferred for this component.

---

# 13. `cmpCartBottomBar` corrected object structure

A useful lesson from implementation:
- Rectangle was initially suggested for some rounded blocks, but that was wrong for Canvas in this scenario.

## 13.1 Important correction discovered
- Rectangle does **not** provide the needed rounded-corner behavior here.
- Use **Button** instead of Rectangle for rounded visual blocks like bar shell and slider track.

## 13.2 Final practical object structure

cmpCartBottomBar                    // Component
 ├─ bgBar                           // Button
 ├─ lblTotalCaption                 // Label
 ├─ lblTotalAmount                  // Label
 ├─ bgTrack                         // Button
 ├─ lblPayBackground                // Label
 ├─ sldPay                          // Slider
 ├─ hitOpenCart                     // Button
 ├─ btnResetInternal                // Button
 
# 14. Backend implications that must stay aligned

Even while the immediate next step is mostly frontend assembly, backend assumptions must remain aligned.

## 14.1 Historical transaction lines must preserve applied prices
When transactions are completed, backend records should preserve:
- quantity,
- applied unit price,
- line total,
- enough context to later show sales/purchase history.

## 14.2 Removing a line should clear transaction-specific price behavior
If a product is removed from the cart entirely:
- quantity becomes `0`,
- any transaction-specific price override for that line should be discarded,
- the next time that product is added again in a new cart context, it should start from base price again unless a later feature explicitly changes that behavior.

## 14.3 Completing a transaction clears transient price state
After successful completion:
- cart state resets,
- any per-transaction price state resets,
- local transaction context is cleared.

This matches the current intended scope before introducing more advanced reuse behaviors such as `LastUsedPrice`.

---

# 15. Cart panel / row direction preserved for the next step

Although not yet built in this chat, the intended design for the expanded cart remains as follows.

## 15.1 `cmpCartPanel` should combine
- scrim,
- overlay panel,
- header,
- cart content/gallery,
- bottom total + pay area.

This is important because nesting separate overlay and gallery components is not practical for this design.

## 15.2 Header controls
The panel header must have:
- `Vaciar`
- `X`

## 15.3 Meanings of header controls
- `Vaciar` -> request confirm modal via screen,
- `X` -> close/fold cart.

## 15.4 Scrim behavior
- tapping the scrim closes the panel.

## 15.5 Cart rows
Rows must stay visually very close to the current catalog gallery.

Required row differences:
- top-right icon becomes a trash can,
- trash removes line by setting quantity to `0`,
- row includes `Total` label,
- quantity controls remain aligned with current gallery behavior language.

## 15.6 Price behavior in rows
Even before full price override editing is implemented, row rendering should conceptually prioritize:
- transaction-effective unit price if available,
- otherwise base unit price.

And:
- removing a line or completing transaction resets override state to base behavior.

---

# 16. Intended event flow preserved for the next chat

These flows were already settled conceptually and should be reused.

## 16.1 Open cart
Trigger:
- bottom bar tap.

Flow:
- `cmpCartBottomBar.OnOpenCart`
- screen sets `varCartExpanded = true`

## 16.2 Close cart
Trigger:
- scrim tap,
- `X`.

Flow:
- panel event -> screen closes panel.

## 16.3 Empty cart
Trigger:
- `Vaciar`.

Flow:
- panel event -> screen shows confirm modal,
- confirm modal confirm -> screen sets `Qty = 0` on selected authoritative rows,
- price override reset also happens there,
- cart projection refreshed.

## 16.4 Remove line
Trigger:
- trash icon.

Flow:
- panel row event -> screen sets the authoritative line `Qty = 0`,
- if override exists, reset it,
- refresh cart projection.

## 16.5 Quantity change
Trigger:
- plus/minus/direct qty edit in cart row.

Flow:
- row event -> screen updates `Qty` in `colCatalogLines`,
- refresh `colCartLines`.

## 16.6 Complete transaction
Trigger:
- bottom bar slider,
- later also panel bottom slider.

Flow:
- component event -> screen centralized transaction action,
- screen writes Dataverse transaction entities at commit boundary,
- screen resets authoritative local quantities,
- screen refreshes cart projection,
- screen resets any temporary price override state,
- screen resets slider state if needed.