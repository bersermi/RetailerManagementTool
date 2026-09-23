import type { Href } from 'expo-router';

import type { GlyphName } from '@/navigation/tabs';
import { ES } from '@/strings';

// ============================================================================
// WHAT INICIO IS MADE OF, AND IN WHAT ORDER. Plan task `5d-iv-b`, and it is
// `src/navigation/tabs.ts`'s argument applied to the screen the tab bar opens
// onto.
//
// ⚠️⚠️ THIS FILE EXISTS BECAUSE §2.8's ONE SURVIVING PROHIBITION IS OTHERWISE
// INVISIBLE. The Home row was amended on 2026-09-17 to allow the module cards,
// and the amendment kept one half deliberately: **state comes first** — the
// takings and the count sit ABOVE ANYTHING TAPPABLE, so Inicio informs before
// it navigates. ADR-035 §2.11 refuses suites over rendering, navigation and
// layout, so an order written as a sequence of JSX children is a deliverable NO
// CHECK IN THIS REPOSITORY CAN SEE: moving the cards above the figure would
// ship green. As a TABLE it is a sequence of plain values, and
// `app/test/inicio.test.ts` reads it — the same trade `tabs.ts` made for C12.1,
// and the same one `5a-ii`'s falsification F14 paid for.
//
// ⚠️ IT DOES NOT MAKE THE SCREEN CORRECT, and saying so is `R9`. Nothing here
// can prove `index.tsx` renders `INICIO_BLOCKS` in order rather than four
// children typed out by hand — it renders them with a `.map`, which is a
// property a person checks at review and a phone confirms. What this removes is
// the half that fails silently.
//
// ⚠️ THE ORDER IS §2.8's AND NOT THIS FILE'S: state, then the three work
// modules as large cards, then the rows to the two rooms the tab bar had no
// space for, then the bell and Ajustes last. C12.1 caps the bar at four — five
// icon-plus-word tabs across 390 px gives each 78 px and one of the words is
// *Desperdicio* — and área 13 settled that by drawing it on 2026-09-15.
// ============================================================================

/**
 * The four bands of the screen, top to bottom.
 *
 * ⚠️ `estado` IS FIRST AND THAT IS THE WHOLE ASSERTION. Every other member is
 * tappable; this one is not, and §2.8's *"state comes first"* is exactly the
 * claim that nothing tappable precedes it.
 */
export type InicioBlock = 'estado' | 'tarjetas' | 'filas' | 'cierre';

/** §2.8's Home row, as amended 2026-09-17, in order. */
export const INICIO_BLOCKS: readonly InicioBlock[] = ['estado', 'tarjetas', 'filas', 'cierre'];

/**
 * Where a door sits and therefore how big it is drawn — §2.8's own two words.
 * *Tarjeta* is a large card for a work module; *fila* is a row for a room.
 */
export type InicioShape = 'tarjeta' | 'fila';

export interface InicioDoor {
  /** Stable key. Never shown; `app/test/inicio.test.ts` addresses rows by it. */
  readonly key: string;
  readonly shape: InicioShape;
  /**
   * The word on the door. ⚠️ READ FROM `ES.tabs` AND `ES.catalog` RATHER THAN
   * RESPELLED: Inicio is a SECOND door onto rooms that already have names, and
   * a card that says one word above a tab that says another is this
   * repository's stale-duplicate defect in its cheapest form.
   */
  readonly label: string;
  /** C12.1 — every one of these has a word beside it, and never appears alone. */
  readonly icon: GlyphName;
  /**
   * Where it goes, or `null` when the room is not built.
   *
   * ⚠️⚠️ `null` IS DRAWN AND IS DRAWN DEAD, which is `5d-iii`'s rule applied to
   * a door rather than to a button: *drawn because a shopkeeper should see what
   * is coming, drawn plainly dead because a control that looks live and refuses
   * silently is worse than one that is obviously not built.* §2.8 puts a
   * Proveedores row on this screen and `6b` is what builds the screen behind it.
   *
   * ⚠️⚠️ IT IS EXPO ROUTER'S `Href` AND NOT A `string`, WHICH IS THE ONE THING
   * IN THIS TABLE A MACHINE CAN CHECK BY ITSELF. `typedRoutes` is on
   * (`app.json`), so the union is generated from the files under `src/app/` —
   * a route spelled `/proveedores` before `6b` creates that file is a TYPECHECK
   * FAILURE rather than a dead tap on a phone. ⚠️ The import is `import type`,
   * which is load-bearing for the same reason `tabs.ts` records: it is erased
   * before this module runs, so `app/test/inicio.test.ts` reads this table under
   * plain Node without dragging expo-router in (`R2`).
   */
  readonly route: Href | null;
  /** Why this door, and why this glyph — the reasoning, kept beside the choice. */
  readonly why: string;
}

/**
 * The five doors §2.8 puts on Inicio, in the order it puts them.
 *
 * ⚠️ THE THREE CARDS GO WHERE THE TABS GO, AND THAT IS THE REDUNDANCY THE
 * AMENDMENT BOUGHT ON PURPOSE. §2.8's original sentence refused a nav panel
 * here as *"redundant"*; the amendment overrides it in one line — *"the
 * redundancy the original sentence feared is real and is paid for on purpose:
 * it buys a fifth and sixth destination that otherwise have no home."* Those
 * two are Productos and Proveedores, the rows below.
 */
export const INICIO_DOORS: readonly InicioDoor[] = [
  {
    key: 'vender',
    shape: 'tarjeta',
    label: ES.tabs.vender,
    icon: 'cash-register',
    route: '/vender',
    why: 'The dominant loop (§2.8), and the card is the same room the tab opens. The screen behind it is 5h.',
  },
  {
    key: 'comprar',
    shape: 'tarjeta',
    label: ES.tabs.comprar,
    icon: 'truck-delivery',
    route: '/comprar',
    why: 'Goods RECEIVED, and never by a cashier. The screen behind it is 5g.',
  },
  {
    key: 'desperdicio',
    shape: 'tarjeta',
    label: ES.tabs.desperdicio,
    icon: 'trash-can-outline',
    route: '/desperdicio',
    why: 'Waste — the acquisition hook and the analytics asset (§2.9). The screen behind it is 6a.',
  },
  {
    key: 'productos',
    shape: 'fila',
    label: ES.catalog.title,
    icon: 'package-variant-closed',
    route: '/productos',
    why:
      'THE FIFTH DESTINATION, and the reason this screen carries doors at all. ' +
      'Built as of 5d-ii, and no fence on it: product_variant_select and ' +
      'price_list_select admit any member of the shop (0002), and a cashier ' +
      'already sees every variant and its price on Vender (C3.1).',
  },
  {
    key: 'proveedores',
    shape: 'fila',
    label: ES.providers.title,
    icon: 'account-tie-outline',
    route: null,
    why:
      'THE SIXTH DESTINATION, and the only door on this screen with no room ' +
      'behind it. 6b builds Proveedores; until then it is drawn and drawn dead, ' +
      'with ES.home.notYet under it. ⚠️ A row and not a card: §2.8 lists it ' +
      'beside Productos, which is a room you visit, not a thing you do all day. ' +
      '⚠️ The glyph is the PERSON and not the truck: truck-delivery is already ' +
      'Comprar, and a proveedor is who you ring, not the delivery arriving.',
  },
];

/**
 * The doors of one shape, in table order.
 *
 * ⚠️ THE FILTER IS HERE AND NOT IN THE SCREEN (`R3`). Two `.filter` calls typed
 * into `index.tsx` would be two more places that decide what is a card, and the
 * order within a shape would then be the JSX's rather than the table's.
 */
export function doorsOfShape(shape: InicioShape): readonly InicioDoor[] {
  return INICIO_DOORS.filter((door) => door.shape === shape);
}

/**
 * Is this door's room built?
 *
 * ⚠️ IT IS A FUNCTION SO THAT `index.tsx` NEVER TESTS `route === null` ITSELF.
 * The screen asks whether it may be pressed; the table says which rooms exist.
 */
export function isOpen(door: InicioDoor): boolean {
  return door.route !== null;
}
