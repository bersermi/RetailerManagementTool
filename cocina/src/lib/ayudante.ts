import { enUso, type LoQueUsa } from '@/api/servicios';
import { construidos, type Elegible, type Mosaico } from '@/lib/loQueUsas';
import { ES } from '@/strings';

// ============================================================================
// WHAT A HELPER SEES THAT THE OWNER DOES NOT, AND THE OTHER WAY ROUND — PURE. Plan task
// `10.9b-ii`, the owner's rulings of 2026-11-16 and 17 (G18: a helper hands over, gives stamps
// and rewards; G36: and publishes; everything else is the owner's) and the family-shell page's
// *Ayudante* (round 7). Her role is `@/api/equipo`'s.
//
// A HELPER'S *HOY*: the day's card, *Lo que sigue* with *Entregar*, *Publicar* and *Repetir* —
// and, once the card exists (`10.9e`), the card's tile with *Sellar*. NEVER the other tiles, the
// line about her page or the features, *Cuéntanos* or the reminder's question: each is the
// owner's. HER *MI COCINA*: her account, the kitchen with what she does there, help, *Salir de
// esta cocina*, *Cerrar sesión* and *Eliminar mi cuenta*.
//
// ⚠️ THE SENTENCE SAYS WHAT IS TRUE TODAY. The drawing's *Ayudas aquí: entregas, das sellos y
// premios, publicas ofertas* was drawn with the card on; until her kitchen uses a card this build
// carries, there is no stamp to give, so the line says *entregas y publicas ofertas* — and turns
// into the drawing's on its own the day `10.9e` puts the card in `PANTALLA_DE` and she uses it.
// `test/ayudante.test.ts` pins both.
// ============================================================================

/** The tiles a helper is shown: the card's alone (`10.9e` draws it with *Sellar*). */
export const DEL_AYUDANTE: readonly Elegible[] = ['tarjeta'];

/** *Hoy*'s tiles for this role: every one for the owner; the card's alone for a helper. */
export function mosaicosPara(mosaicos: readonly Mosaico[], duena: boolean): Mosaico[] {
  return duena ? [...mosaicos] : mosaicos.filter((m) => DEL_AYUDANTE.includes(m.servicio));
}

/** Her kitchen uses the card AND this build carries it — unread, no. */
export function conTarjeta(loQueUsa: LoQueUsa | undefined, hechos: readonly Elegible[] = construidos()): boolean {
  return loQueUsa !== undefined && hechos.includes('tarjeta') && enUso(loQueUsa).includes('tarjeta');
}

/** What she does at this kitchen, under its name in her *Mi cocina*: stamps and rewards only with the card. */
export function ayudasAqui(loQueUsa: LoQueUsa | undefined, hechos: readonly Elegible[] = construidos()): string {
  return conTarjeta(loQueUsa, hechos) ? ES.ayudante.ayudasConTarjeta : ES.ayudante.ayudas;
}

/** What *Quitar a …* tells the owner happens: her phone stops seeing the kitchen — and, with the card, her code to stamp. */
export function quitarTexto(loQueUsa: LoQueUsa | undefined, hechos: readonly Elegible[] = construidos()): string {
  return conTarjeta(loQueUsa, hechos) ? ES.equipo.quitarTextoConTarjeta : ES.equipo.quitarTexto;
}

/** What *Invitar a alguien* tells the owner her helper will do (`10.9b-iii`): stamps and rewards only with the card. */
export function podraTexto(loQueUsa: LoQueUsa | undefined, hechos: readonly Elegible[] = construidos()): string {
  return conTarjeta(loQueUsa, hechos) ? ES.invitar.podraConTarjeta : ES.invitar.podra;
}
