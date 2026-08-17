# Power Platform / Dataverse Catalog System — Context Handoff (Updated)

This document is the consolidated source of truth for continuing development of the Power Platform / Dataverse catalog system.

It expands the prior handoff with the work completed in the latest conversation, whose primary focus was finishing the architectural definition and first assembly guidance for the last major UI component: `cmpCartPanel`.

The purpose of this handoff is to let a new conversation resume work with minimal context loss.

---

# 1. Product scope and intent

The app is a Power Platform solution for small store owners. Its intended scope includes:

- Providers / suppliers management
- Per-provider product catalogs
- Purchases / buying flows
- Selling flows
- Stock / inventory tracking
- Waste flows
- Reporting and operational insights

The backend source of truth is **Dataverse**. Storage constraints are acceptable and workarounds are allowed when needed.

The app is intended to be scalable enough for real business use, while keeping UX practical for phone/tablet scenarios.

---

# 2. Core architectural principles

These principles are foundational and should remain stable unless there is an explicit architectural decision to change them.

## 2.1 Dataverse is the source of truth

- Dataverse is the persistent backend system of record.
- Screen-level collections are working collections for UX and interaction, not the ultimate source of truth.
- Component state must not become the authoritative business state.

## 2.2 Screen owns mutable state

This is one of the most important project rules.

- Screens own the mutable working state.
- Components are **stateless renderers** that receive data and emit actions/events.
- Business mutations happen at the screen level.
- Screen formulas transform, project, validate, and eventually patch or commit to Dataverse.

In short:

- components render and emit intent
- screens orchestrate state and persistence

## 2.3 Collections are screen-level working models

### `colCatalogLines`

- `colCatalogLines` is the **authoritative screen-level working collection** for the active slice currently being displayed.
- It does **not** represent the whole catalog universe.
- It is the editable working model for the screen.
- Qty edits, temporary transaction state, and future transaction-time price overrides live in the screen’s working slice.

### `colCartLines`

- `colCartLines` is a **projection** of selected lines.
- It is not authoritative.
- It should be rebuilt from `colCatalogLines` after relevant changes.
- It exists to drive cart-specific UI and derived calculations.

## 2.4 Inventory impact should be event-driven

The architectural direction preserved from prior work is:

- Quick actions should not directly and invisibly mutate stock as if stock were a casual UI property.
- Inventory changes should be represented through transaction or inventory events.
- This remains important for purchases, sales, waste, adjustments, cancellations, and auditability.

## 2.5 Components should stay simple and composable within Canvas constraints

Power Apps Canvas limitations strongly shaped this project.

Important lessons already discovered:

- Deep component nesting is impractical for this app’s patterns.
- Some functions and context patterns behave differently inside components.
- `UpdateContext` is not supported inside component behavior formulas.
- Some properties or functions you might expect are unavailable or behave differently.
- There can be circular reference and pre-host sizing issues.

As a result, some components need to be designed as **combined shell + content** components instead of many nested child components.

---

# 3. Domain and data modeling context

## 3.1 Product model

Products can have families and subtypes / specifications.

Example conceptually:

- Beans
n  - Black beans
  - Pinto beans

Each subtype shares a unit context appropriate to that product family.

## 3.2 Units

Units matter significantly in the UX and business logic.

Examples include:

- can
- piece
- grams
- kilo
- bag

There is also a concept of defining common / usual units in a setup area.

## 3.3 Provider-specific catalogs

The system supports provider-specific catalog behavior.

A provider may:

- reuse an existing product already known in the system
- import an entire family or only one variant
- create a new product when nothing suitable exists

The desired UX is search-first with normalized naming to avoid duplicates.

## 3.4 Price behavior

Important preserved rule:

- The catalog currently shows only **Unitary Price**.
- Future price override for a transaction is allowed **only while the line is in the cart**.
- If the line is removed from the cart, or the transaction is completed, pricing returns to base behavior.
- The idea of `LastUsedPrice` exists as a future possible helper, but base behavior remains the default after cart removal / completion.

## 3.5 Workspace / lookups / multi-tenant considerations

Earlier work established awareness of:

- IDs and lookups, including `System User` lookups when needed
- workspace columns for partitioned UX or multi-tenant segmentation
- provider location fields for future location-aware features
- waste infrastructure being distributed across domain tables rather than necessarily standing alone as a fully isolated subsystem

---

# 4. UI / UX design philosophy already established

## 4.1 Catalog rows

The catalog row style is already defined and should remain the design reference for related variants.

The established row language includes:

- Primary text
- Secondary text
- Unitary price
- Qty controls
- Unit text
- A compact, practical row geometry suitable for handheld UI

## 4.2 Components already developed or substantially defined

The broader component library already includes or has substantially defined versions of:

- `cmpHeader`
- `cmpFlyoutMenu`
- `cmpModal`
- `cmpToast`
- `cmpQuickActions`
- `cmpQuickActionsSheet`
- `cmpMoneyInput`
- `cmpQtyStepper`
- `cmpDockedCart`
- `cmpCartBottomBar`
- `cmpCartPanel`
- catalog gallery variants

These components emerged iteratively and are shaped by actual Power Apps constraints.

## 4.3 General overlay pattern

The app already converged on an overlay visual model:

- grey scrim / darkened background
- white foreground shell/panel
- rounded surfaces where practical
- explicit close affordances

This overlay language appears in quick actions and carries into cart behavior.

---

# 5. Existing sample row / action contract conventions

A representative item shape that has been used across gallery/catalog variants is:

```powerfx
{
    Key,
    PrimaryText,
    SecondaryText,
    UnitText,
    Qty,
    AllowStepper,
    Step,
    MinQty,
    MaxQtyEnabled,
    MaxQty,
    Disabled,
    Photo
}
```

Sample quick action row shape used previously:

```powerfx
Table(
    { ActionKey: "favorite", Label: "Fav", IconName: "star", IsEnabled: true, IsActive: false }
)
```

For cart-oriented projections, the current preferred pattern is to pass display-ready fields such as:

- `DisplayUnitPrice`
- `DisplayLineTotal`

This keeps business calculations at screen level.

---

# 6. Important Power Apps / Canvas constraints already discovered

These should be preserved because they shaped the current architecture.

## 6.1 Components inside components

This is a major practical limitation.

- Embedding components inside components is not a good foundation for this solution.
- Because of this, some components must inline behavior or layout that might otherwise have been split.

This is why:

- `cmpCartBottomBar` inlined the pay slider logic instead of depending on another nested component.
- `cmpCartPanel` is designed as a combined shell + overlay + gallery rather than a container of multiple smaller custom components.

## 6.2 Unsupported / awkward formulas in components

- `UpdateContext` is recognized but not supported in component formulas.
- Certain scoping patterns cause invalid-name issues.
- Some functions are absent or inconvenient.
- Some geometric properties are unavailable.
- Parent-based sizing can be tricky before a component is hosted.

## 6.3 Visual primitives

A notable practical lesson:

- `Rectangle` was not appropriate in the way initially expected for rounded-corner behavior.
- **Button** often became the better practical object for shaped surfaces and click targets.

This influenced shell and footer design.

## 6.4 Localization / syntax considerations

- Formula locale uses commas rather than semicolons in the user’s environment.
- Several formula issues previously came from scoping or naming assumptions.

## 6.5 Gallery quirks

- Certain scrolling or layout expectations available in other UI systems are not readily available in Canvas galleries.
- Template geometry needs to be explicit and carefully tested.

---

# 7. Cart UX target already established before this conversation

The intended cart experience had already been largely defined before the latest work, and remains in force.

## 7.1 Collapsed cart state

As soon as at least one line is added to the cart:

- a bottom bar appears
- it shows the total amount
- it includes a pay slider with `Pagar` behavior

If the user only taps it without completing the pay gesture:

- the cart unfolds / expands

## 7.2 Expanded cart state

The expanded cart should be very close visually to the current catalog gallery.

Required differences for cart rows:

- the top-right `OtherActions` icon becomes a **trash can**
- trash removes the line by setting quantity to 0
- the row includes a **Total** label/value per line
- qty controls remain conceptually the same
- current catalog behavior showing only unitary price remains valid

## 7.3 Price override behavior

Future transaction-specific price changes are preserved as an important rule:

- they only exist while a product is in the cart for the current transaction
- removing the line fully resets it to base price behavior
- completing the transaction also resets it

---

# 8. State of `cmpCartBottomBar` at the start of this conversation

At the start of this conversation, the following was already true and had to be preserved:

- the first pass of `cmpCartBottomBar` had already been completed
- the bottom part looked and worked great
- it should **not** be redesigned from scratch

This became a critical boundary for the work in this conversation.

The bottom bar remains the dedicated collapsed footer / pay gesture component.

Its role is:

- show total amount when cart has at least one line
- allow pay-complete gesture
- expose an `OnOpenCart` interaction so the expanded cart can be shown

---

# 9. Main objective of the latest conversation

The latest conversation was primarily focused on finishing the design and implementation approach for the last major missing cart-related component:

## `cmpCartPanel`

The goal was to define it in a way that is:

- consistent with the architecture
- consistent with prior component constraints
- visually aligned with the catalog gallery
- compatible with the already-finished `cmpCartBottomBar`

A key correction that emerged during this conversation:

- `cmpCartPanel` should **not** duplicate the already-built footer / pay component
- instead, `cmpCartBottomBar` remains the single footer/pay component
- `cmpCartPanel` is only the **expanded cart review/edit overlay**

This is now an important project decision.

---

# 10. Final role definition of `cmpCartPanel`

`cmpCartPanel` is now defined as the **expanded cart overlay component**.

It is responsible for:

- full-screen scrim
- white panel shell / bottom sheet
- header
- cart rows gallery
- empty state
- cart row interactions

It is **not** responsible for:

- being the authoritative source of cart state
- committing Dataverse transactions directly
- duplicating the pay slider/footer already present in `cmpCartBottomBar`

This component follows the same high-level spirit as `cmpQuickActions`: a combined shell + content component built this way because of Canvas constraints.

---

# 11. Final component contract for `cmpCartPanel`

The component contract was simplified during the conversation.

## 11.1 Inputs

The recommended useful inputs are:

### Visibility / behavior
- `VisiblePanel` — Boolean
- `Busy` — Boolean

### Data
- `Items` — Table

### Layout
- `PanelWidth` — Number
- `PanelMaxHeight` — Number
- `HeaderHeight` — Number
- `RowHeight` — Number
- `HorizontalPadding` — Number
- `VerticalPadding` — Number
- `CornerRadius` — Number

### Text
- `TitleText` — Text
- `EmptyText` — Text
- `VaciarText` — Text
- `LineTotalCaption` — Text
- `UnitPriceCaption` — Text
- `CurrencySymbol` — Text

### Visual
- `ScrimFill` — Color
- `PanelFill` — Color
- `PanelBorderColor` — Color
- `HeaderTextColor` — Color
- `BodyTextColorPrimary` — Color
- `BodyTextColorSecondary` — Color
- `MutedTextColor` — Color
- `SeparatorColor` — Color
- `DangerColor` — Color
- `DisabledFill` — Color

## 11.2 Events

The simplified event surface preferred by the end of the conversation is:

- `OnClosePanel`
- `OnRequestEmptyCart`
- `OnRemoveLine`
- `OnQtyChange`

Conceptually, the parameterized event intent is:

- `OnRemoveLine(Key)`
- `OnQtyChange(Key, NewQty)`

This is preferred over payload outputs if the Power Apps event property setup allows clean parameter passing.

## 11.3 Output properties

Output properties such as:

- `ActionRowKey`
- `ActionRowQty`
- `ActionKind`

were discussed as a fallback pattern for weak component payload handling, but they are **not inherently required** if parameterized event properties work cleanly in the user’s environment.

The current preferred design is to avoid them unless Power Apps forces that fallback.

---

# 12. Internal structure of `cmpCartPanel`

The component is intended as a full-screen overlay with these internal object roles.

## 12.1 Root behavior

- Component width and height should cover the screen
- it behaves as an overlay that is visible only when the screen says so

## 12.2 Scrim

- full-screen dark hit target behind the panel
- clicking it closes the panel

Object type used:

- **Button** (`btnScrim`)

## 12.3 Panel shell

- white bottom-sheet style surface
- bottom aligned
- rounded top corners where possible

Object type used:

- **Button** (`bgPanel`)

## 12.4 Header

Contains:

- title
- `Vaciar`
- close `X`
- separator

Object types:

- **Label** (`lblTitle`)
- **Button** (`btnVaciar`)
- **Button** (`btnClose`)
- **Button** used as separator (`sepHeader`)

## 12.5 Body

Contains either:

- cart gallery, or
- empty state

Object types:

- **Vertical Gallery** (`galCartLines`)
- **Label** (`lblEmptyText`)

There is no embedded footer in the final version.

---

# 13. Internal row structure of `cmpCartPanel`

The cart row is intentionally derived from the current catalog gallery language so the UX remains congruent.

Required object types inside the gallery row:

- **Button** — `bgRow`
- **Image** — `imgPhoto`
- **Label** — `lblPrimaryText`
- **Label** — `lblSecondaryText`
- **Button** — `btnTrash`
- **Label** — `lblUnitPriceCaption`
- **Label** — `lblUnitPriceValue`
- **Button** — `btnMinus`
- **Text input** — `txtQty`
- **Button** — `btnPlus`
- **Label** — `lblUnitText`
- **Label** — `lblLineTotalCaption`
- **Label** — `lblLineTotalValue`
- **Button** — `sepRow`

## 13.1 Row behavior requirements

The row must stay visually close to the existing catalog row, with these adjustments:

- top-right icon is trash instead of `OtherActions`
- row shows unit price
- row shows qty editing controls
- row shows unit text
- row shows line total

## 13.2 Row layout guidance stabilized in this conversation

A practical first-pass geometry was defined around a shorter, denser row than the original catalog prototype.

Preferred initial values:

- `RowHeight` around `104`
- compact two-band layout
- top band: primary/secondary + trash
- bottom band: unit price + qty cluster + unit text + line total

This replaced taller placeholder settings and is the recommended first pass for actual assembly.

---

# 14. `cmpCartPanel` event flow back to `scrProducts`

The event flow is now clearly defined.

## 14.1 Close panel

Triggered by:

- scrim click
- `X` click

Screen behavior:

- set the cart-expanded variable to false

## 14.2 Empty cart request

Triggered by:

- `Vaciar`

Screen behavior:

- for first-pass testing it may clear directly
- in more polished versions it may route to a confirmation modal

## 14.3 Remove line

Triggered by:

- row trash button

Screen behavior:

- mutate authoritative row in `colCatalogLines`
- set `Qty = 0`
- reset transaction-only pricing state if applicable
- rebuild `colCartLines`
- refresh cart totals/counts
- close panel if cart becomes empty

## 14.4 Qty change

Triggered by:

- plus
- minus
- direct input edit

Screen behavior:

- patch the authoritative row in `colCatalogLines`
- clamp/validate qty as needed
- rebuild `colCartLines`
- recompute totals and counts
- if new qty is 0, row disappears from cart projection and transaction-specific pricing resets

---

# 15. Clarification reached during this conversation about output properties and internal variables

A useful clarification was made while building `cmpCartPanel`.

## 15.1 Output properties are not always necessary

They are only needed if:

- the screen cannot cleanly receive row identity/payload directly from event properties

Preferred approach now:

- use parameterized event properties if possible

Fallback approach only if needed:

- set local working values
- expose output properties
- fire no-argument events

## 15.2 “Internal state variables” in a component

A practical clarification was also made:

- there is no special private variable declaration panel for this case
- in Canvas formulas, variables can be set with `Set(...)`
- however, because app-wide variables are not truly private, avoiding that pattern when direct event parameters work is preferable

Final preference after the conversation:

- keep `cmpCartPanel` lean
- use parameterized event properties first
- only fall back to output/property payload patterns if Power Apps blocks or behaves badly

---

# 16. Default property values stabilized for `cmpCartPanel`

A concrete default property baseline was defined so the component can be dropped into a screen and visually rendered quickly.

## 16.1 Component base

Recommended default component size:

- `Width = App.Width`
- `Height = App.Height`

## 16.2 Useful first-pass defaults

### Behavior
- `VisiblePanel = false`
- `Busy = false`

### Layout
- `PanelWidth = App.Width`
- `PanelMaxHeight = App.Height * 0.82`
- `HeaderHeight = 56`
- `RowHeight = 104`
- `HorizontalPadding = 12`
- `VerticalPadding = 12`
- `CornerRadius = 16`

### Text
- `TitleText = "Carrito"`
- `EmptyText = "No hay productos en el carrito"`
- `VaciarText = "Vaciar"`
- `LineTotalCaption = "Total"`
- `UnitPriceCaption = "Precio unitario"`
- `CurrencySymbol = "$"`

### Visual defaults
Neutral visual defaults were proposed, including:

- semi-transparent dark scrim
- white panel fill
- light grey separators/borders
- dark primary text
- muted secondary text
- red-ish danger color for remove actions

## 16.3 Temporary test data

A small inline `Items` table was proposed as a design-time rendering aid, but this is only for isolated visual testing. For real wiring, `Items` should become `colCartLines`.

---

# 17. First integration wiring approach established in this conversation

Before polishing further, a first practical wiring pass between components and screen state was defined.

The goal of that first integration is not full Dataverse transaction persistence yet, but proving the shared UI/state loop works.

## 17.1 Intended first end-to-end loop

The loop to prove is:

1. change qty in the catalog gallery
2. authoritative working collection updates
3. cart projection rebuilds
4. bottom cart bar appears and shows correct total
5. tapping bottom bar opens the expanded cart panel
6. edits in panel affect the same authoritative working collection
7. cart can be cleared or closed

## 17.2 Screen variables suggested for this first pass

The conversation defined useful screen variables such as:

- `varCartOpen`
- `varCartBusy`
- `varCartAmountTotal`
- `varCartLineCount`
- `varShowConfirmEmptyCart`

These are screen-owned orchestration state, not component-owned business state.

## 17.3 Cart projection refresh pattern

A standard refresh pattern was proposed for the first working slice:

- rebuild `colCartLines` from `Filter(colCatalogLines, Qty > 0)`
- add `DisplayUnitPrice`
- add `DisplayLineTotal`
- recompute total amount and line count

This pattern is intentionally screen-level and repetitive for first-pass simplicity.

## 17.4 `cmpGalleryCatalog` integration

The catalog gallery’s quantity change handler should:

- patch `colCatalogLines`
- rebuild `colCartLines`
- refresh cart totals/counts

This is the connection that lets the catalog drive the cart system.

## 17.5 `cmpCartBottomBar` integration

The bottom bar should be driven from screen-owned cart state.

First-pass intended bindings include:

- `VisibleBar` based on whether cart has lines
- `TotalAmount` bound to screen total
- `Busy` bound to screen busy flag
- `PayEnabled` bound to count/busy state
- `OnOpenCart` opening the expanded panel
- `OnPayComplete` temporarily usable as a simple test notification until real commit flow is connected

## 17.6 `cmpCartPanel` integration

The panel should be wired to:

- `VisiblePanel = varCartOpen`
- `Busy = varCartBusy`
- `Items = colCartLines`
- close event sets cart-open false
- empty-cart request clears/rebuilds as a first pass
- row removal and qty change patch `colCatalogLines` and then rebuild `colCartLines`

---

# 18. Key corrections made during this conversation

These corrections are important because they prevent future drift.

## 18.1 Do not rebuild the footer inside `cmpCartPanel`

A temporary path was corrected.

Final decision:

- `cmpCartBottomBar` remains the dedicated collapsed footer/pay component
- `cmpCartPanel` should not duplicate that footer

## 18.2 Do not overcomplicate event payload handling unless needed

The design was simplified away from mandatory output properties where possible.

## 18.3 Do not keep the panel in isolated mock mode once ready to integrate

Specific blockers identified during the wiring review included patterns such as:

- `Busy = true` on the panel instance
- `VisiblePanel = true` always
- hardcoded `Items` table on the instance
- placeholder totals/thresholds on the bottom bar

The conversation explicitly transitioned the plan from isolated mock testing to screen-state wiring.

## 18.4 Use realistic component defaults for actual layout testing

Some test values were identified as too extreme for practical first-pass layout, for example very large padding or row height values. Recommended practical defaults were stabilized instead.

---

# 19. Current state of components after this conversation

At the end of this conversation, the project is effectively in this state:

## 19.1 Core reusable UI baseline is largely done

The major needed components are already created or sufficiently defined to proceed.

This includes the cart system’s two key pieces:

- `cmpCartBottomBar`
- `cmpCartPanel`

## 19.2 `cmpCartBottomBar` is kept as-is conceptually

It is already good enough as the collapsed footer/pay entry surface.

## 19.3 `cmpCartPanel` is now architecturally defined

It has:

- a clear role
- a clear simplified event contract
- an explicit object tree
- explicit row structure
- explicit screen-state wiring direction

## 19.4 Further component tweaks are expected to happen during assembly

This is accepted and normal.

The project should not stall trying to perfect every component in isolation before assembling real modules.

---

# 20. What should not be forgotten when continuing in a new chat

## 20.1 Preserve the core architectural contract

Always keep these intact unless a deliberate architecture decision is made:

- Dataverse is the source of truth
- screen owns mutable state
- components are stateless renderers/events
- `colCatalogLines` is authoritative working slice
- `colCartLines` is projection only

## 20.2 Preserve the cart UX split

Do not collapse these responsibilities together again:

- `cmpCartBottomBar` = collapsed bar / pay gesture / open cart
- `cmpCartPanel` = expanded cart review/edit overlay

## 20.3 Preserve cart row visual congruence

The cart row should remain very close to the catalog row, with only the cart-specific modifications:

- trash instead of `OtherActions`
- line total added
- qty editing retained

## 20.4 Keep business logic screen-side

Do not move authoritative cart/business logic into components just because it is convenient in the short term.

## 20.5 Transition from component work to assembly

The project is at the point where it is reasonable to begin assembling the app modules against backend data.

Component refinements can continue, but they should now happen in service of actual assembled flows.

---

# 21. Practical continuation note for the next conversation

The next conversation should assume:

- the component phase is largely done for the first working pass
- the app can begin assembly using the established component contracts
- backend-connected module work can begin
- additional component changes are allowed, but should be driven by actual assembly needs rather than speculative redesign

In other words:

**we are done with the main components and can start assembling the app.**

