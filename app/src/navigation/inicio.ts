import type { Href } from 'expo-router';

import type { Documents } from '@/api/documents';
import type { Role } from '@/api/members';
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
//
// ⚠️⚠️ AND SINCE `5R-n` (THE OWNER'S RULING OF 2026-11-17) IT IS TWO SCREENS, BY
// ROLE: *"Empleado can only use the operational features like recording Ventas,
// Compras and Merma. No Numeros, can only see lo último on things she rang up
// herself."* Her Inicio is `INICIO_EMPLEADO` — no takings, no week, no streak,
// no savings — her doors are the ones marked `empleado`, her *Lo último* is
// `loQueRegistro`'s, and the rooms she no longer reaches from here send her back
// (`cerradaAlEmpleado`, read by the root layout's `Gate`). The owner and the
// Encargado keep everything. ⚠️ A ROLE NOT YET READ IS HERS, as the walkthrough's
// rule is (`@/navigation/recorrido`): a frame of the short screen for an owner is
// nothing, a frame of the takings for an Empleado is the thing he ruled out.
// ⚠️⚠️ ON THE SCREEN ONLY — his ruling of the same evening (*"Go with your
// recommendation"*): the database still answers her login with the store's sales
// (`sale_line`, `0003`), so this hides what the app shows and refuses nothing.
// ============================================================================

/**
 * The bands of the screen, top to bottom — ⚠️ THE OWNER'S INICIO OF 2026-10-16
 * (`8g`), the hooks he left switched on in the playable page: *Hoy* with the
 * total that rolls and *tu mejor viernes*, *la racha*, option B's three
 * coloured doors, *lo último en vivo*, the next pickup, and every other room in
 * *Más*. The savings band (`ahorros`) holds *Ahorro en compras*; *Rescatado*
 * joins it when the owner rules what Wera paid (plan `8n`).
 *
 * ⚠️ `aviso` — the dead-letter banner — IS FIRST, AND IT IS STATE TOO: it draws
 * only when a write was lost, and since the same ruling it PUSHES the screen
 * down instead of floating over a room reserved for it. Then `hoy`, the
 * takings: §2.8's *"state comes first"* still holds, nothing tappable precedes
 * the figure but the banner's own dismissal.
 *
 * ⚠️ `semana` (`8g`, round 4 of Números) sits right under the takings and draws
 * only Monday to Wednesday, until this phone opens last week's story — *"the
 * only part that adds something to Inicio"*, which is why it went last.
 *
 * ⚠️ `recorrido` (`8g`, 2026-10-21, the tutorial) sits between the two: *Conoce
 * Wera · 1 minuto* for a phone that has not opened the story, until it does or
 * its card is closed. Since the owner's ruling of 2026-10-22 the story opens by
 * itself on every phone that has not seen it (`@/navigation/recorrido`), so the
 * card is mostly the moment before it does — or a sale in progress it waits on.
 */
export type InicioBlock =
  | 'aviso'
  | 'hoy'
  | 'recorrido'
  | 'semana'
  | 'racha'
  | 'puertas'
  | 'ultimo'
  | 'ahorros'
  | 'recoleccion'
  | 'mas';

/** The owner's Inicio, in order. */
export const INICIO_BLOCKS: readonly InicioBlock[] = [
  'aviso',
  'hoy',
  'recorrido',
  'semana',
  'racha',
  'puertas',
  'ultimo',
  'ahorros',
  'recoleccion',
  'mas',
];

/**
 * ⚠️ `5R-n` — THE EMPLEADO'S INICIO, in the owner's order: the dead-letter
 * banner, *Conoce Wera*, the three doors to her work, *Lo último* (only what she
 * recorded) and *Más* (only Lo último and Ajustes). Never *Hoy*'s takings,
 * *Tu semana*, *la racha*, *Ahorro en compras* nor the next pickup.
 */
export const INICIO_EMPLEADO: readonly InicioBlock[] = ['aviso', 'recorrido', 'puertas', 'ultimo', 'mas'];

/** Does she see the shop's whole Inicio — its figures and every room? The owner and the Encargado. */
export function veTodoElInicio(role: Role | null): boolean {
  return role === 'owner' || role === 'manager';
}

/** The bands of her Inicio, top to bottom. A role not yet read gets the Empleado's. */
export function bloquesDe(role: Role | null): readonly InicioBlock[] {
  return veTodoElInicio(role) ? INICIO_BLOCKS : INICIO_EMPLEADO;
}

/**
 * Where a door sits and therefore how big it is drawn — §2.8's own two words.
 * *Tarjeta* is a large card for a work module; *fila* is a row for a room.
 */
/** ⚠️ `8g`: the three coloured doors, and the grid of *Más* that holds the rest. */
export type InicioShape = 'tarjeta' | 'mas';

export interface InicioDoor {
  /** Stable key. Never shown; `app/test/inicio.test.ts` addresses rows by it. */
  readonly key: string;
  readonly shape: InicioShape;
  /**
   * The word on the door. ⚠️ READ FROM `ES.tabs`, `ES.catalog`, `ES.providers`
   * AND `ES.documents` RATHER THAN RESPELLED: Inicio is a SECOND door onto rooms
   * that already have names, and a card that says one word above a tab that says
   * another is this repository's stale-duplicate defect in its cheapest form.
   *
   * ⚠️⚠️ `ES.documents` IS THE EXCEPTION THAT PROVES THE RULE, ADDED 2026-09-26:
   * `Lo último` names no tab and no module, because it is a LOOK rather than a
   * room. `app/test/inicio.test.ts`'s `VOCABULARY` was widened for it
   * deliberately rather than loosened — see that file.
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
  /**
   * ⚠️ `8g`: DRAWN FOR THE OWNER ONLY — Solicitudes, whose queue `0037`
   * answers empty for anyone else. Absent for everybody else, not dead.
   */
  readonly ownerOnly?: boolean;
  /**
   * ⚠️ `5R-n`, THE OWNER'S RULING OF 2026-11-17: DRAWN FOR AN EMPLEADO TOO — her
   * work (Vender, Comprar, Merma), what she recorded (*Lo último*) and Ajustes.
   * `false` is a room of the shop's — its figures, its catalog, its suppliers —
   * which only the owner and the Encargado open. Absent for her, not dead.
   */
  readonly empleado: boolean;
}

/**
 * The doors on Inicio, in order — ⚠️⚠️ **SEVEN SINCE 2026-09-28 (`7a`, `numeros`),
 * SIX SINCE 2026-09-26, AND FIVE OF THEM ARE §2.8's HOME ROW'S.**
 *
 * ⚠️ THE THREE CARDS GO WHERE THE TABS GO, AND THAT IS THE REDUNDANCY THE
 * AMENDMENT BOUGHT ON PURPOSE. §2.8's original sentence refused a nav panel
 * here as *"redundant"*; the amendment of 2026-09-17 overrides it in one line —
 * *"the redundancy the original sentence feared is real and is paid for on
 * purpose: it buys a fifth and sixth destination that otherwise have no home."*
 * Those two are Productos and Proveedores, the rows below.
 *
 * ⚠️⚠️ **`documentos` IS THE ONE §2.8 DOES NOT NAME**, added by `5h-ii-a` because
 * `5h-i` found the owner reaching for a screen that did not exist and
 * `5h-ii-b`'s corrections are reached from nothing else. **ADR-035 §2.8's Home
 * row enumerated five doors and now carries a revision entry saying six** — the
 * ADR is authoritative, so it was amended rather than left to disagree with this
 * table. ✅ **Whether Inicio is the right home for it was parked in
 * ⛔ DECISIONS OWED and RULED 2026-09-28 by the owner — *"Leave Lo último on
 * Inicio as recommended."*** It stays here.
 */
export const INICIO_DOORS: readonly InicioDoor[] = [
  {
    key: 'vender',
    empleado: true,
    shape: 'tarjeta',
    label: ES.tabs.vender,
    icon: 'cash-register',
    route: '/vender',
    why: 'The dominant loop (§2.8), and the card is the same room the tab opens. The screen behind it is 5h.',
  },
  {
    key: 'comprar',
    empleado: true,
    shape: 'tarjeta',
    label: ES.tabs.comprar,
    icon: 'truck-delivery',
    route: '/comprar',
    why: 'Goods RECEIVED, and never by a cashier. The screen behind it is 5g.',
  },
  {
    key: 'desperdicio',
    empleado: true,
    shape: 'tarjeta',
    label: ES.tabs.desperdicio,
    icon: 'basket-minus-outline',
    route: '/desperdicio',
    why: 'Waste — the acquisition hook and the analytics asset (§2.9). The screen behind it is 6a.',
  },
  {
    key: 'productos',
    empleado: false,
    shape: 'mas',
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
    empleado: false,
    shape: 'mas',
    label: ES.providers.title,
    icon: 'account-tie-outline',
    route: '/proveedores',
    why:
      "THE SIXTH DESTINATION IN §2.8's OWN COUNT, and LIVE SINCE 6b " +
      '(2026-09-27) — the last door on this screen to get a room, and the only ' +
      'one that was ever drawn dead. ⚠️ IT IS STILL LAST IN THE TABLE, which is ' +
      'now a choice rather than a consequence: it was put here so that no live ' +
      'door sat below a dead one (5h-ii-a, 2026-09-26), and moving it up to ' +
      "§2.8's fifth place would reorder a screen the owner has held. " +
      '⚠️ ES.home.notYet no longer renders under it. ⚠️ A row and not a card: ' +
      '§2.8 lists it beside Productos, which is a room you visit, not a thing ' +
      'you do all day. ⚠️ The glyph is the PERSON and not the truck: ' +
      'truck-delivery is already Comprar, and a proveedor is who you ring, not ' +
      'the delivery arriving. ⚠️ No fence on it, catalogRows\' treatment: ' +
      'provider_select admits any member of the shop (0002), and the create row ' +
      'and the edit controls are what canWriteProviders hides from a cashier.',
  },
  {
    key: 'numeros',
    empleado: false,
    shape: 'mas',
    label: ES.numbers.title,
    icon: 'chart-bar',
    route: '/numeros',
    why:
      "THE SEVENTH DOOR, RULED BY THE OWNER ON 2026-09-28 — §2.8 names the reports " +
      'screen and never gave it a door, because the tab bar is capped at ' +
      'four and full. A row and not a card, and for the reason that put ' +
      'Productos and the recent-documents list here: a thing you look at between ' +
      'customers, not a thing you do all day. ⚠️ LAST, so no door a shopkeeper ' +
      'has already learned moves. ⚠️ No fence on it in the database: ' +
      "sale_line_select has no has_role (0003). ⚠️ BUT SINCE 5R-n (the owner's " +
      'ruling of 2026-11-17, reversing his 7a of 2026-09-28) it is not drawn for ' +
      'an Empleado — "No Numeros" — and the database was left as it is, his ' +
      'second ruling of that evening. ⚠️ The glyph is the BAR ' +
      'CHART because a bar chart is what the screen opens on.',
  },
  {
    key: 'documentos',
    empleado: true,
    shape: 'mas',
    label: ES.documents.title,
    icon: 'clipboard-text-clock-outline',
    route: '/documentos',
    why:
      'THE SIXTH DOOR, AND THE ONLY ONE §2.8 DOES NOT NAME — it is ' +
      "the owner's own from 5h-i: *\"Most likely the user will realize if he " +
      'looks at his purchase history for the last week/couple of days."* ' +
      '5h-ii-a builds it and 5h-ii-b hangs Corregir and Eliminar off its rows, ' +
      'so this row is how a correction is reached at all. ⚠️ A row and not a ' +
      'card: it is a thing you go and look at between customers, which is the ' +
      'same reading that put Productos here. ⚠️ The glyph is the CLIPBOARD WITH ' +
      'A CLOCK and not a receipt or a history arrow: this is what happened ' +
      'lately, and the only other clock in the app is the offline banner. ' +
      '⚠️ It is drawn OPEN from the day it lands, unlike Proveedores — the room ' +
      'exists.',
  },
  {
    key: 'solicitudes',
    empleado: false,
    shape: 'mas',
    label: ES.approvals.bell,
    icon: 'bell-outline',
    route: '/solicitudes',
    ownerOnly: true,
    why:
      "⚠️ `8g`, THE OWNER'S INICIO OF 2026-10-16: the bell moves from the screen's " +
      'last band into the More grid, with the count of people waiting on it. Owner only, ' +
      "useRoster's visible rule: 0037 answers anyone else with an empty list, so a " +
      'manager is shown no door rather than an empty room.',
  },
  {
    key: 'ajustes',
    empleado: true,
    shape: 'mas',
    label: ES.settings.title,
    icon: 'cog-outline',
    route: '/ajustes',
    why:
      "⚠️ `8g`, 2026-10-16: LAST in the More grid, as the owner's page drew it. Not a gear " +
      'in the cream band: C12.1 forbids an icon without its word, and a header ' +
      'corner has no room for one.',
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

/**
 * ⚠️ `5R-n` — THE DOORS OF ONE SHAPE THAT HER ROLE OPENS, in table order. The
 * owner and the Encargado get every door (the bell is still the owner's alone,
 * which `index.tsx` asks of the queue); an Empleado, and a role not yet read,
 * only the doors marked `empleado`.
 */
export function doorsFor(shape: InicioShape, role: Role | null): readonly InicioDoor[] {
  const all = veTodoElInicio(role);
  return doorsOfShape(shape).filter((door) => all || door.empleado);
}

/**
 * ⚠️ `5R-n` — THE ROOMS AN EMPLEADO NO LONGER REACHES FROM INICIO, AND EVERY ROOM
 * THAT OPENS ONLY FROM THEM: Números and *Tu semana*; Productos with the catalog,
 * a product's page, its prices, its costs and the forms that make or edit one;
 * Proveedores with a supplier's page and the form that makes one. Opened another
 * way — a link, a screen left open when her role changed — she is sent to Inicio.
 *
 * ⚠️ A ROUTE AND EVERYTHING UNDER IT: `/ficha` closes `/ficha/<id>`.
 * `app/test/inicio.test.ts` reads every route file under `src/app/` and holds
 * each to one side of this list, so a new room is a decision, not a door left open.
 */
export const CERRADAS_AL_EMPLEADO = [
  '/numeros',
  '/semana',
  '/productos',
  '/catalogo',
  '/ficha',
  '/producto',
  '/precios',
  '/costos',
  '/proveedores',
  '/proveedor',
] as const;

/**
 * Is she somewhere her role does not open? ⚠️ ONLY A ROLE READ AS EMPLEADO IS
 * SENT BACK — never one not yet read: an owner reopening Números must not be
 * moved while the roster answers. Inicio already draws no door for a role not read.
 */
export function cerradaAlEmpleado(role: Role | null, pathname: string): boolean {
  if (role !== 'staff') return false;
  return CERRADAS_AL_EMPLEADO.some((room) => pathname === room || pathname.startsWith(`${room}/`));
}

/**
 * ⚠️ `5R-n` — *LO ÚLTIMO* FOR HER ROLE: the owner and the Encargado see every
 * document of the shop; an Empleado, and a role not yet read, only the ones she
 * recorded (`created_by`, already read for `mayCorrect`). A document with no
 * author is nobody's, so not hers. The notes still on her phone are not passed
 * here: they are on her phone because she recorded them.
 *
 * ⚠️ A LIST THAT HAD DOCUMENTS AND HAS NONE OF HERS IS `nothing`, never `unknown`
 * — the read answered; the sentence under it is *no hay*, not *se ve cuando haya señal*.
 */
export function loQueRegistro<D extends Documents>(docs: D, role: Role | null, userId: string | null): D {
  if (veTodoElInicio(role)) return docs;
  const suyos = docs.documents.filter((doc) => userId !== null && doc.createdBy === userId);
  const state = docs.state === 'some' && suyos.length === 0 ? 'nothing' : docs.state;
  // ⚠️ THE REST OF WHAT THE HOOK ANSWERED (`failed`) RIDES ALONG UNCHANGED.
  return { ...docs, state, documents: suyos } as D;
}
