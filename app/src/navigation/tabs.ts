import type { ComponentProps } from 'react';

import type MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { ES } from '@/strings';

// ============================================================================
// C12.1 — ICONS PLUS THE SPANISH WORD, ALWAYS, EVERYWHERE. NEVER ICONS ALONE.
// Plan task 5a-ii.
//
// ⚠️ THE TAB BAR IS DATA IN THIS FILE AND A COMPONENT IN `(tabs)/_layout.tsx`,
// AND THE SPLIT EXISTS FOR ONE REASON: ADR-035 §2.11 refuses test suites over
// navigation, so a tab bar written entirely as JSX is a deliverable NO CHECK IN
// THIS REPOSITORY CAN SEE. Deleting a label would be green. As a table, the two
// things C12.1 actually promises — every tab has a word, and every tab has an
// icon that exists — are assertions over plain values, which §2.11 allows.
// `app/test/tabs.test.ts` makes them.
//
// It does not make the bar correct. Nothing here can prove the label is
// rendered; `_layout.tsx` still has to pass it, and only a person holding the
// phone (`5a-iv`) sees that it did. What this removes is the silent half.
//
// ⚠️ FOUR TABS, NOT §2.8's EIGHT — a decision taken on the owner's behalf, in
// docs/PLAN.md under 5a-ii. These four need no role: a cashier and an owner
// both sell, both receive, both throw things away. Catálogo, Proveedores and
// Números are manager+, and there is no session yet that knows who is holding
// the phone (that is `5a-iii`). Ajustes is a sheet, not a tab — §2.8 said so.
// ============================================================================

/**
 * A MaterialCommunityIcons glyph name, as the icon component itself types it.
 *
 * ⚠️ THE IMPORT ABOVE IS `import type`, WHICH IS LOAD-BEARING. It is erased
 * before this module runs, so `app/test/tabs.test.ts` can import this file
 * under plain Node without dragging in a React Native component — which is
 * what makes C12.1 checkable at all under §2.11's ban on rendering suites.
 */
export type GlyphName = ComponentProps<typeof MaterialCommunityIcons>['name'];

export interface TabDefinition {
  /** Must equal the route file's name under `src/app/(tabs)/`. */
  readonly route: string;
  /** The Spanish word. C12.1: it is never absent, and it is never English. */
  readonly label: string;
  readonly icon: GlyphName;
  /** Why this glyph and not another — the reasoning, kept next to the choice. */
  readonly why: string;
}

export const TABS: readonly TabDefinition[] = [
  {
    route: 'index',
    label: ES.tabs.inicio,
    icon: 'home-variant',
    why: 'The door back. §2.8: Home shows state, not a nav panel.',
  },
  {
    route: 'vender',
    label: ES.tabs.vender,
    icon: 'cash-register',
    why: 'The counter till. §2.8 calls Vender the dominant loop, and a till is what that looks like from across the shop.',
  },
  {
    route: 'comprar',
    label: ES.tabs.comprar,
    icon: 'truck-delivery',
    why: 'A delivery arriving, not a shopping cart. Comprar is where goods are RECEIVED, and the person doing it is a manager or the owner — never a cashier.',
  },
  {
    route: 'desperdicio',
    label: ES.tabs.desperdicio,
    icon: 'trash-can-outline',
    why: 'Waste. The reason-first entry screen behind it feeds the analytics asset (§2.9).',
  },
];
