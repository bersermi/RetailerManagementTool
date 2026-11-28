// ============================================================================
// HOW EACH PRODUCT LAST ARRIVED, ON THIS PHONE. Plan task `14.5` — the store
// Comprar's pad, its tiles and its Carrito read *how she keyed it* through. Every
// rule is `@/cart/paquete`'s, with its suite; what is here is only WHERE it lives.
//
// ⚠️ KEPT IN THE DEVICE STORE, beside the day's order (`useOrdenDelDia`): it is
// this phone's memory of what she typed — *the last she typed shows next time*
// (call 10) — not the shop's setting, which is the product's pack on its page.
// One key for every shop on the phone: a product's id is never another shop's.
//
// ⚠️ ONE STORE AND NOT A `useState` PER SCREEN: the pad writes it, and the tile
// behind the pad and the Carrito's line read it in the same moment — a tab
// screen's mount state would never see the write (`app/CLAUDE.md`'s trap).
// ============================================================================

import { create } from 'zustand';

import {
  LLEGADAS_KEY,
  guardarLlegadas,
  leerLlegadas,
  recordar,
  type LineaEnPaquetes,
  type Llegadas,
  type Modo,
} from '@/cart/paquete';
import { deviceStore, readKey, writeKey } from '@/lib/store';

interface LlegadasState {
  readonly llegadas: Llegadas;
  readonly recordar: (variantId: string, modo: Modo, trae: string, linea: LineaEnPaquetes | null) => void;
}

export const useLlegadas = create<LlegadasState>()((set, get) => ({
  llegadas: leerLlegadas(readKey(deviceStore(), LLEGADAS_KEY)),
  recordar: (variantId, modo, trae, linea) => {
    const next = recordar(get().llegadas, variantId, modo, trae, linea);
    writeKey(deviceStore(), LLEGADAS_KEY, guardarLlegadas(next));
    set({ llegadas: next });
  },
}));
