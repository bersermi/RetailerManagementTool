import type MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { ComponentProps } from 'react';

import { ES } from '@/strings';

// ============================================================================
// WERA COCINA'S TAB BAR, AS DATA. Plan task `10.5-v-c-i`, the owner's ruling of
// 2026-11-05 (the family-shell page's calls 1 and 4): *Hoy · Apartados · Clientes ·
// Mi cocina* — four tabs at most, each with its word, and THE TWO ENDS NEVER MOVE; a
// tab appears only when its feature ships, and a new feature arrives first as a card
// on *Hoy*. Its twin is Itacate's (`itacate/src/navigation/pestanas.ts`, `10.5-v-b`).
//
// ⚠️ DATA AND NOT JSX, as Wera's tabs are (`app/src/navigation/tabs.ts`): the suite
// reads the order, the words and the glyphs (`test/pestanas.test.ts`) — a misspelt
// glyph is a blank square on the bar, which nothing else would see. The two tabs that
// are not here yet name the row that brings them; the bar draws only `EN_USO`, and the
// folder `(cocina)/(tabs)/` holds exactly their screens, so no route appears as a tab
// by accident. ⚠️ *Tus ofertas* is a room, not a tab (the page's rule 3: a card
// before a room, a room before a tab): it is pushed over the tabs from *Hoy*.
// ============================================================================

/** A glyph of the icon set the bar draws with. */
type Glifo = ComponentProps<typeof MaterialCommunityIcons>['name'];

export interface Pestana {
  /** The screen's file in `(cocina)/(tabs)/`, without `.tsx`. */
  readonly ruta: 'index' | 'apartados' | 'clientes' | 'mi-cocina';
  readonly label: string;
  readonly icono: Glifo;
  /** The plan row that brings it, or `null` once it has shipped. */
  readonly llega: string | null;
}

export const PESTANAS: readonly Pestana[] = [
  // A sun: her day — what is on offer now, and the one action, publishing.
  { ruta: 'index', label: ES.pestanas.hoy, icono: 'white-balance-sunny', llega: null },
  // A ticket: what neighbours reserved, to hand over with its code — reserving is `10.5b`'s.
  { ruta: 'apartados', label: ES.pestanas.apartados, icono: 'ticket-confirmation-outline', llega: '10.5b' },
  // People: her stamp card, who follows her, her numbers (the services, `10.9`).
  { ruta: 'clientes', label: ES.pestanas.clientes, icono: 'account-group-outline', llega: '10.9' },
  // A shop front: what she sets once — her page, where she hands food over, her trade, her account.
  { ruta: 'mi-cocina', label: ES.pestanas.miCocina, icono: 'storefront-outline', llega: null },
];

/** The tabs the bar draws today, in their order. */
export const EN_USO: readonly Pestana[] = PESTANAS.filter((pestana) => pestana.llega === null);

/** The tab a route of the bar is, or `null` for a route that is not one. */
export function pestanaDe(ruta: string): Pestana | null {
  return EN_USO.find((pestana) => pestana.ruta === ruta) ?? null;
}
