import type MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { ComponentProps } from 'react';

import { ES } from '@/strings';

// ============================================================================
// ITACATE'S TAB BAR, AS DATA. Plan task `10.5-v-b`, the owner's ruling of 2026-11-05
// (the family-shell page's calls 1 and 4): *Cerca · Apartados · Mis cocinas · Tú* —
// four tabs at most, each with its word, and THE TWO ENDS NEVER MOVE; a tab appears
// only when its feature ships, and a new feature arrives first as a card on *Cerca*.
//
// ⚠️ DATA AND NOT JSX, as Wera's tabs are (`app/src/navigation/tabs.ts`): the suite
// reads the order, the words and the glyphs (`test/pestanas.test.ts`) — a misspelt
// glyph is a blank square on the bar, which nothing else would see. The two tabs that
// are not here yet name the row that brings them; the bar draws only `EN_USO`, and the
// folder `(vecino)/(tabs)/` holds exactly their screens, so no route appears as a tab
// by accident.
// ============================================================================

/** A glyph of the icon set the bar draws with. */
type Glifo = ComponentProps<typeof MaterialCommunityIcons>['name'];

export interface Pestana {
  /** The screen's file in `(vecino)/(tabs)/`, without `.tsx`. */
  readonly ruta: 'index' | 'apartados' | 'mis-cocinas' | 'tu';
  readonly label: string;
  readonly icono: Glifo;
  /** The plan row that brings it, or `null` once it has shipped. */
  readonly llega: string | null;
}

export const PESTANAS: readonly Pestana[] = [
  // A pin: the kitchens close to her — the map's pin when the map comes (`10.5-iv-b`).
  { ruta: 'index', label: ES.pestanas.cerca, icono: 'map-marker-outline', llega: null },
  // A ticket: what she reserved, with its code — reserving is `10.5b`'s.
  { ruta: 'apartados', label: ES.pestanas.apartados, icono: 'ticket-confirmation-outline', llega: '10.5b' },
  // A heart: the kitchens she follows, with the stamp card (the services, `10.9`).
  { ruta: 'mis-cocinas', label: ES.pestanas.misCocinas, icono: 'heart-outline', llega: '10.9' },
  // A person: her account, where to search, the aviso, help and her way out.
  { ruta: 'tu', label: ES.pestanas.tu, icono: 'account-circle-outline', llega: null },
];

/** The tabs the bar draws today, in their order. */
export const EN_USO: readonly Pestana[] = PESTANAS.filter((pestana) => pestana.llega === null);

/** The tab a route of the bar is, or `null` for a route that is not one. */
export function pestanaDe(ruta: string): Pestana | null {
  return EN_USO.find((pestana) => pestana.ruta === ruta) ?? null;
}
